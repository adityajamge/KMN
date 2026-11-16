const { randomUUID } = require("crypto");
const { pool } = require("../db");
const { configured, sendTemplate } = require("./whatsapp");

const TEMPLATES = {
  invitation: "kmn_invitation",
  payer: "kmn_payer_summary",
  upgrade: "kmn_upgrade_invite",
  note: "kmn_note",
};

function firstName(name) {
  return String(name || "there").trim().split(/\s+/)[0] || "there";
}

function planLabel(plan) {
  return plan === "core" ? "Core, 20–23 Nov" : "Comprehensive, 20 Nov–19 Dec";
}

function whenLabel(plan) {
  const dates = plan === "core" ? "20–23 Nov" : "20 Nov–19 Dec";
  return `${dates}, 7:00–9:00 AM, Chandan Nagar near Krida Square`;
}

function site() {
  return String(process.env.PUBLIC_SITE_URL || "http://localhost:5174").replace(/\/$/, "");
}

function video() {
  return process.env.WHATSAPP_WELCOME_VIDEO_URL || site();
}

function kolkataNow(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
  };
}

async function deliver(dedupeKey, participantId, phone, templateName, parameters) {
  if (!configured()) return;
  const existing = await pool.query(
    "SELECT id, status, attempts FROM whatsapp_sends WHERE dedupe_key = $1",
    [dedupeKey],
  );
  const row = existing.rows[0];
  if (row && (row.status === "sent" || row.attempts >= 3)) return;
  try {
    await sendTemplate(phone, templateName, parameters);
    if (row) {
      await pool.query(
        "UPDATE whatsapp_sends SET status = 'sent', attempts = attempts + 1, detail = '', params = $2::jsonb WHERE id = $1",
        [row.id, JSON.stringify(parameters)],
      );
    } else {
      await pool.query(
        `INSERT INTO whatsapp_sends (id, participant_id, phone, template_name, params, dedupe_key, status, attempts)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, 'sent', 1)
         ON CONFLICT (dedupe_key) DO NOTHING`,
        [randomUUID(), participantId, phone, templateName, JSON.stringify(parameters), dedupeKey],
      );
    }
  } catch (error) {
    const detail = String(error.message || "Send failed.").slice(0, 500);
    if (row) {
      await pool.query(
        "UPDATE whatsapp_sends SET status = 'failed', attempts = attempts + 1, detail = $2, params = $3::jsonb WHERE id = $1",
        [row.id, detail, JSON.stringify(parameters)],
      );
    } else {
      await pool.query(
        `INSERT INTO whatsapp_sends (id, participant_id, phone, template_name, params, dedupe_key, status, detail, attempts)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, 'failed', $7, 1)
         ON CONFLICT (dedupe_key) DO NOTHING`,
        [randomUUID(), participantId, phone, templateName, JSON.stringify(parameters), dedupeKey, detail],
      );
    }
    console.error(`WhatsApp ${templateName} was not delivered.`);
  }
}

async function registration(booking) {
  if (!configured() || !booking) return;
  const codes = booking.participants.map((person) => `${person.name} ${person.code}`).join(", ");
  const payer = booking.participants[0];
  for (const person of booking.participants) {
    await deliver(`invitation:${person.id}`, person.id, person.whatsapp, TEMPLATES.invitation, [
      firstName(person.name),
      planLabel(booking.plan),
      person.code,
      whenLabel(booking.plan),
      video(),
    ]);
  }
  if (payer) {
    await deliver(`payer:${booking.id}`, payer.id, payer.whatsapp, TEMPLATES.payer, [
      firstName(payer.name),
      booking.invoiceNo,
      String(booking.total),
      codes,
    ]);
  }
}

async function upgrade(result) {
  if (!configured() || !result) return;
  const people = result.bookings.flatMap((booking) => booking.participants)
    .filter((person) => result.upgrade.participantIds.includes(person.id));
  for (const person of people) {
    await deliver(`upgrade:${person.id}`, person.id, person.whatsapp, TEMPLATES.upgrade, [
      firstName(person.name),
      person.code,
      "24 Nov–19 Dec, then 90 days, 7:00–9:00 AM, same hall",
    ]);
  }
}

async function paidPeople() {
  const found = await pool.query(
    `SELECT p.id, p.name, p.whatsapp, p.code, p.is_payer, p.upgraded, p.programme, b.id AS booking_id, b.plan
     FROM participants p
     JOIN bookings b ON b.id = p.booking_id
     WHERE b.status = 'paid' AND p.code <> ''`,
  );
  return found.rows;
}

async function retryFailed() {
  const failed = await pool.query(
    "SELECT id, phone, template_name, params, attempts FROM whatsapp_sends WHERE status = 'failed' AND attempts < 3",
  );
  for (const row of failed.rows) {
    const parameters = Array.isArray(row.params) ? row.params : [];
    try {
      await sendTemplate(row.phone, row.template_name, parameters);
      await pool.query(
        "UPDATE whatsapp_sends SET status = 'sent', attempts = attempts + 1, detail = '' WHERE id = $1",
        [row.id],
      );
    } catch (error) {
      await pool.query(
        "UPDATE whatsapp_sends SET attempts = attempts + 1, detail = $2 WHERE id = $1",
        [row.id, String(error.message || "Send failed.").slice(0, 500)],
      );
    }
  }
}

async function runSchedule(now = kolkataNow()) {
  if (!configured()) return;
  await retryFailed();
  const people = await paidPeople();
  const dayBefore = now.date === "2026-11-19" && now.hour >= 8;
  const morning = now.date === "2026-11-20" && now.hour >= 5 && now.hour < 9;
  const upgradeLink = (now.date === "2026-11-22" && now.hour >= 18) || (now.date === "2026-11-23" && now.hour < 12);
  const nudge = now.date === "2026-11-23" && now.hour >= 18 && now.hour < 21;
  const thanks = now.date > "2026-11-23" || (now.date === "2026-11-23" && now.hour >= 21);

  for (const person of people) {
    if (dayBefore) {
      await deliver(`reminder-19:${person.id}`, person.id, person.whatsapp, TEMPLATES.note, [
        firstName(person.name),
        "Tomorrow is Day 1, 7:00–9:00 AM at Chandan Nagar near Krida Square. Arrive between 6:30 and 7:00. Bring headphones.",
        person.code,
      ]);
    }
    if (morning) {
      await deliver(`reminder-20:${person.id}`, person.id, person.whatsapp, TEMPLATES.note, [
        firstName(person.name),
        "See you between 6:30 and 7:00 AM. We begin at 7:00 sharp.",
        person.code,
      ]);
    }
    if (upgradeLink && person.is_payer && person.plan === "core") {
      const stillCore = people.some((other) => other.booking_id === person.booking_id && !other.upgraded);
      if (stillCore) {
        await deliver(`upgrade-link:${person.booking_id}`, person.id, person.whatsapp, TEMPLATES.note, [
          firstName(person.name),
          `Continue into Comprehensive. Your seat is kept until 23 Nov, 9 PM. ${site()}/upgrade?c=${encodeURIComponent(person.code)}`,
          person.code,
        ]);
      }
    }
    if (nudge && person.plan === "core" && !person.upgraded) {
      await deliver(`upgrade-nudge:${person.id}`, person.id, person.whatsapp, TEMPLATES.note, [
        firstName(person.name),
        "One reminder: your Comprehensive seat is kept until 9 PM tonight.",
        person.code,
      ]);
    }
    if (thanks && person.plan === "core" && !person.upgraded && person.programme === "core") {
      await deliver(`thankyou:${person.id}`, person.id, person.whatsapp, TEMPLATES.note, [
        firstName(person.name),
        "You keep the routine you learned. The door stays open.",
        person.code,
      ]);
    }
  }
}

module.exports = { registration, upgrade, runSchedule };
