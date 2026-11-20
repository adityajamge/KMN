const { randomUUID } = require("crypto");
const { pool } = require("../db");

const CAPACITY = 150;
const CORE_FEE = 499;
const FULL_FEE = 12499;
const GST_RATE = 0.18;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function digits(phone) {
  return String(phone || "").replace(/\D/g, "").slice(-10);
}

function money(subtotal) {
  const gst = Math.round(subtotal * GST_RATE * 100) / 100;
  const total = Math.round((subtotal + gst) * 100) / 100;
  return { subtotal, gst, total };
}

function registrationPrice(plan, count) {
  const unit = plan === "core" ? CORE_FEE : FULL_FEE;
  const subtotal = unit * count;
  if (plan === "core") return { subtotal, gst: 0, total: subtotal };
  return money(subtotal);
}

function upgradePrice(count) {
  const gross = FULL_FEE * count;
  const credit = CORE_FEE * count;
  const net = money(gross - credit);
  return { gross, credit, gst: net.gst, total: net.total };
}

function iso(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function participantFrom(row, includeHealth) {
  return {
    id: row.id,
    name: row.name,
    whatsapp: row.whatsapp,
    email: row.email,
    city: row.city,
    area: row.area,
    role: row.role,
    age: Number(row.age),
    goals: Array.isArray(row.goals) ? row.goals : [],
    healthNote: includeHealth ? row.health_note : "",
    relation: row.relation,
    guardianName: row.guardian_name,
    guardianPhone: row.guardian_phone,
    code: row.code,
    isPayer: row.is_payer,
    programme: row.programme,
    upgraded: row.upgraded,
    checkedIn: row.checked_in,
    attendance: Array.isArray(row.attendance) ? row.attendance : [],
  };
}

function bookingFrom(row, participants) {
  return {
    id: row.id,
    plan: row.plan,
    status: row.status,
    createdAt: iso(row.created_at),
    holdUntil: iso(row.hold_until),
    invoiceNo: row.invoice_no,
    paymentRef: row.payment_ref,
    subtotal: Number(row.subtotal),
    gst: Number(row.gst),
    total: Number(row.total),
    participants,
  };
}

function upgradeFrom(row, participantIds) {
  return {
    id: row.id,
    status: row.status,
    createdAt: iso(row.created_at),
    participantIds,
    gross: Number(row.gross),
    credit: Number(row.credit),
    gst: Number(row.gst),
    total: Number(row.total),
    invoiceNo: row.invoice_no,
    paymentRef: row.payment_ref,
  };
}

function assertUuid(id, label) {
  if (!UUID.test(String(id || ""))) throw new HttpError(404, `${label} not found.`);
}

async function withTx(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function loadBookings(client, ids, includeHealth) {
  if (!ids.length) return [];
  const bookings = await client.query("SELECT * FROM bookings WHERE id = ANY($1::uuid[])", [ids]);
  const people = await client.query(
    "SELECT * FROM participants WHERE booking_id = ANY($1::uuid[]) ORDER BY position",
    [ids],
  );
  const grouped = new Map();
  for (const row of people.rows) {
    const list = grouped.get(row.booking_id) || [];
    list.push(participantFrom(row, includeHealth));
    grouped.set(row.booking_id, list);
  }
  const byId = new Map(bookings.rows.map((row) => [row.id, bookingFrom(row, grouped.get(row.id) || [])]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

async function seatsLeft(client = pool) {
  const core = await client.query(`
    SELECT COUNT(*)::int AS used
    FROM participants p
    JOIN bookings b ON b.id = p.booking_id
    WHERE b.plan = 'core'
      AND (b.status = 'paid' OR (b.status = 'unpaid' AND b.hold_until > NOW()))
  `);
  const full = await client.query(`
    SELECT COUNT(*)::int AS used
    FROM participants p
    JOIN bookings b ON b.id = p.booking_id
    WHERE p.programme = 'comprehensive'
      AND (b.status = 'paid' OR (b.status = 'unpaid' AND b.hold_until > NOW()))
  `);
  return {
    core: Math.max(0, CAPACITY - core.rows[0].used),
    comprehensive: Math.max(0, CAPACITY - full.rows[0].used),
  };
}

function text(value, label, max) {
  const cleaned = String(value || "").trim();
  if (!cleaned) throw new HttpError(400, `${label} is required.`);
  if (cleaned.length > max) throw new HttpError(400, `${label} is too long.`);
  return cleaned;
}

function cleanPerson(raw) {
  if (!raw || typeof raw !== "object") throw new HttpError(400, "Each person needs a name and contact details.");
  const age = Number(raw.age);
  if (!Number.isInteger(age) || age < 12 || age > 110) throw new HttpError(400, "Enter an age from 12 to 110.");
  const whatsapp = digits(raw.whatsapp);
  const email = text(raw.email, "Email", 200);
  if (whatsapp.length !== 10) throw new HttpError(400, "Enter a 10-digit WhatsApp number.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Enter a valid email.");
  const goals = Array.isArray(raw.goals) ? raw.goals.filter((goal) => typeof goal === "string").slice(0, 8).map((goal) => goal.slice(0, 80)) : [];
  return {
    name: text(raw.name, "Name", 120),
    whatsapp,
    email,
    city: text(raw.city, "City", 80),
    area: text(raw.area, "Area", 80),
    role: text(raw.role || "Other", "Role", 80),
    age,
    goals,
    healthNote: String(raw.healthNote || "").trim().slice(0, 1000),
    relation: String(raw.relation || "").trim().slice(0, 80),
    guardianName: String(raw.guardianName || "").trim().slice(0, 120),
    guardianPhone: digits(raw.guardianPhone),
  };
}

function cleanPeople(plan, raw) {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 6) {
    throw new HttpError(400, "A booking can include 1 to 6 people.");
  }
  const people = raw.map(cleanPerson);
  const guardianInGroup = people.some((person) => person.relation === "Parent" || person.relation === "Guardian");
  const first = people[0];
  if (first.age < 18 && !guardianInGroup && (first.guardianName.length < 2 || first.guardianPhone.length !== 10)) {
    throw new HttpError(400, "A parent or guardian is required for anyone under 18.");
  }
  return people;
}

async function createHold(plan, rawPeople) {
  if (plan !== "core" && plan !== "comprehensive") throw new HttpError(400, "Choose Core or Comprehensive.");
  const people = cleanPeople(plan, rawPeople);
  return withTx(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(7042001)");
    const open = await seatsLeft(client);
    if (open[plan] < people.length) {
      throw new HttpError(409, open[plan] === 0
        ? `The ${plan === "core" ? "Core" : "Comprehensive"} batch is full.`
        : `Only ${open[plan]} seats are left in this batch.`);
    }
    const price = registrationPrice(plan, people.length);
    const bookingId = randomUUID();
    const holdUntil = new Date(Date.now() + 10 * 60 * 1000);
    await client.query(
      `INSERT INTO bookings (id, plan, status, hold_until, subtotal, gst, total)
       VALUES ($1, $2, 'unpaid', $3, $4, $5, $6)`,
      [bookingId, plan, holdUntil, price.subtotal, price.gst, price.total],
    );
    for (let index = 0; index < people.length; index += 1) {
      const person = people[index];
      await client.query(
        `INSERT INTO participants (
           id, booking_id, position, name, whatsapp, email, city, area, role, age, goals,
           health_note, relation, guardian_name, guardian_phone, is_payer, programme
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb,
           $12, $13, $14, $15, $16, $17
         )`,
        [
          randomUUID(), bookingId, index, person.name, person.whatsapp, person.email, person.city, person.area,
          person.role, person.age, JSON.stringify(person.goals), person.healthNote, person.relation,
          person.guardianName, person.guardianPhone, index === 0, plan,
        ],
      );
    }
    const [booking] = await loadBookings(client, [bookingId], false);
    return { booking, seatsLeft: await seatsLeft(client) };
  });
}

function makeCode() {
  let suffix = "";
  for (let index = 0; index < 4; index += 1) {
    suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `SK-NGP01-B01-${suffix}`;
}

async function assignCode(client, participantId) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = makeCode();
    try {
      await client.query("SAVEPOINT code_try");
      await client.query("UPDATE participants SET code = $1 WHERE id = $2", [code, participantId]);
      await client.query("RELEASE SAVEPOINT code_try");
      return code;
    } catch (error) {
      await client.query("ROLLBACK TO SAVEPOINT code_try");
      if (error.code !== "23505") throw error;
    }
  }
  throw new HttpError(500, "Could not issue an invitation code. Please try again.");
}

async function nextInvoice(client) {
  const result = await client.query(
    "UPDATE invoice_seq SET next_no = next_no + 1 WHERE id = 1 RETURNING next_no - 1 AS issued",
  );
  return `INV-${result.rows[0].issued}`;
}

function assertPaymentRef(paymentRef) {
  if (!/^pay_[A-Za-z0-9]+$/.test(String(paymentRef || ""))) {
    throw new HttpError(400, "The payment reference is not valid.");
  }
}

async function markPaid(id, paymentRef) {
  assertUuid(id, "Booking");
  assertPaymentRef(paymentRef);
  return withTx(async (client) => {
    const used = await client.query("SELECT id FROM bookings WHERE payment_ref = $1", [paymentRef]);
    if (used.rows[0] && used.rows[0].id !== id) {
      throw new HttpError(409, "This payment is already recorded on another booking.");
    }
    const locked = await client.query("SELECT * FROM bookings WHERE id = $1 FOR UPDATE", [id]);
    const row = locked.rows[0];
    if (!row) throw new HttpError(404, "Booking not found.");
    if (row.status === "paid") {
      const [booking] = await loadBookings(client, [id], false);
      return { booking, seatsLeft: await seatsLeft(client) };
    }
    if (!row.hold_until || new Date(row.hold_until).getTime() <= Date.now()) {
      throw new HttpError(409, "The seat hold has ended. Please register again.");
    }
    const people = await client.query(
      "SELECT id FROM participants WHERE booking_id = $1 ORDER BY position",
      [id],
    );
    for (const person of people.rows) await assignCode(client, person.id);
    const invoiceNo = await nextInvoice(client);
    await client.query(
      `UPDATE bookings
       SET status = 'paid', hold_until = NULL, invoice_no = $2, payment_ref = $3
       WHERE id = $1`,
      [id, invoiceNo, paymentRef],
    );
    const [booking] = await loadBookings(client, [id], false);
    return { booking, seatsLeft: await seatsLeft(client) };
  });
}

async function extendHold(id) {
  await pool.query(
    `UPDATE bookings
     SET hold_until = NOW() + INTERVAL '20 minutes'
     WHERE id = $1 AND status = 'unpaid' AND hold_until > NOW()`,
    [id],
  );
}

async function getBooking(id) {
  assertUuid(id, "Booking");
  const [booking] = await loadBookings(pool, [id], false);
  if (!booking) throw new HttpError(404, "Booking not found.");
  return booking;
}

async function getParticipantBooking(id) {
  assertUuid(id, "Participant");
  const found = await pool.query("SELECT booking_id FROM participants WHERE id = $1", [id]);
  if (!found.rows[0]) throw new HttpError(404, "Participant not found.");
  return getBooking(found.rows[0].booking_id);
}

async function lookup(code, phone) {
  const wanted = String(code || "").trim().toUpperCase();
  if (!/^SK-NGP\d{2}-B\d{2}-[A-Z0-9]{4}$/.test(wanted)) {
    throw new HttpError(404, "We could not match that invitation code.");
  }
  const found = await pool.query(
    "SELECT id, booking_id, whatsapp FROM participants WHERE upper(code) = $1",
    [wanted],
  );
  const row = found.rows[0];
  if (!row) throw new HttpError(404, "We could not match that invitation code.");
  if (phone && digits(phone) !== digits(row.whatsapp)) {
    throw new HttpError(404, "The code and WhatsApp number do not match.");
  }
  const [booking] = await loadBookings(pool, [row.booking_id], false);
  return { booking, participantId: row.id };
}

function upgradeIds(rawIds) {
  const ids = [...new Set((Array.isArray(rawIds) ? rawIds : []).map(String))].sort();
  if (!ids.length || ids.length > 12) throw new HttpError(400, "Choose who is continuing.");
  ids.forEach((id) => assertUuid(id, "Participant"));
  return ids;
}

async function upgradeQuote(rawIds) {
  const ids = upgradeIds(rawIds);
  const found = await pool.query(
    `SELECT p.id, p.name, p.email, p.whatsapp, p.upgraded, b.plan, b.status
     FROM participants p
     JOIN bookings b ON b.id = p.booking_id
     WHERE p.id = ANY($1::uuid[])`,
    [ids],
  );
  if (found.rows.length !== ids.length) throw new HttpError(404, "One of these people could not be found.");
  for (const row of found.rows) {
    if (row.status !== "paid" || row.plan !== "core") {
      throw new HttpError(409, "Only a paid Core booking can be upgraded.");
    }
    if (row.upgraded) throw new HttpError(409, "One of these people is already upgraded.");
  }
  const payer = found.rows[0];
  return {
    ids,
    price: upgradePrice(ids.length),
    prefill: { name: payer.name, email: payer.email, contact: digits(payer.whatsapp) },
  };
}

async function payUpgrade(rawIds, paymentRef) {
  const ids = upgradeIds(rawIds);
  assertPaymentRef(paymentRef);
  const existing = await pool.query("SELECT id FROM upgrades WHERE payment_ref = $1", [paymentRef]);
  if (existing.rows[0]) {
    const saved = await getUpgrade(existing.rows[0].id);
    return { ...saved, seatsLeft: await seatsLeft() };
  }
  return withTx(async (client) => {
    const locked = await client.query(
      `SELECT p.id, p.upgraded, p.booking_id, b.plan, b.status
       FROM participants p
       JOIN bookings b ON b.id = p.booking_id
       WHERE p.id = ANY($1::uuid[])
       FOR UPDATE OF p`,
      [ids],
    );
    if (locked.rows.length !== ids.length) throw new HttpError(404, "One of these people could not be found.");
    for (const row of locked.rows) {
      if (row.status !== "paid" || row.plan !== "core") {
        throw new HttpError(409, "Only a paid Core booking can be upgraded.");
      }
      if (row.upgraded) throw new HttpError(409, "One of these people is already upgraded.");
    }
    const price = upgradePrice(ids.length);
    const upgradeId = randomUUID();
    const invoiceNo = await nextInvoice(client);
    await client.query(
      `INSERT INTO upgrades (id, status, gross, credit, gst, total, invoice_no, payment_ref)
       VALUES ($1, 'paid', $2, $3, $4, $5, $6, $7)`,
      [upgradeId, price.gross, price.credit, price.gst, price.total, invoiceNo, paymentRef],
    );
    for (const participantId of ids) {
      await client.query(
        "INSERT INTO upgrade_participants (upgrade_id, participant_id) VALUES ($1, $2)",
        [upgradeId, participantId],
      );
    }
    await client.query(
      "UPDATE participants SET programme = 'comprehensive', upgraded = TRUE WHERE id = ANY($1::uuid[])",
      [ids],
    );
    const upgrade = upgradeFrom(
      (await client.query("SELECT * FROM upgrades WHERE id = $1", [upgradeId])).rows[0],
      ids,
    );
    const bookingIds = [...new Set(locked.rows.map((row) => row.booking_id))];
    return { upgrade, bookings: await loadBookings(client, bookingIds, false), seatsLeft: await seatsLeft(client) };
  });
}

async function getUpgrade(id) {
  assertUuid(id, "Upgrade");
  const found = await pool.query("SELECT * FROM upgrades WHERE id = $1", [id]);
  if (!found.rows[0]) throw new HttpError(404, "Upgrade not found.");
  const links = await pool.query(
    "SELECT participant_id FROM upgrade_participants WHERE upgrade_id = $1",
    [id],
  );
  const participantIds = links.rows.map((row) => row.participant_id);
  const people = participantIds.length
    ? await pool.query("SELECT DISTINCT booking_id FROM participants WHERE id = ANY($1::uuid[])", [participantIds])
    : { rows: [] };
  return {
    upgrade: upgradeFrom(found.rows[0], participantIds),
    bookings: await loadBookings(pool, people.rows.map((row) => row.booking_id), false),
  };
}

async function adminState() {
  const bookings = await pool.query("SELECT id FROM bookings ORDER BY created_at DESC");
  const upgrades = await pool.query("SELECT * FROM upgrades ORDER BY created_at DESC");
  const links = await pool.query("SELECT upgrade_id, participant_id FROM upgrade_participants");
  const byUpgrade = new Map();
  for (const row of links.rows) {
    const list = byUpgrade.get(row.upgrade_id) || [];
    list.push(row.participant_id);
    byUpgrade.set(row.upgrade_id, list);
  }
  return {
    bookings: await loadBookings(pool, bookings.rows.map((row) => row.id), true),
    upgrades: upgrades.rows.map((row) => upgradeFrom(row, byUpgrade.get(row.id) || [])),
  };
}

async function setCheckIn(id, checkedIn) {
  assertUuid(id, "Participant");
  if (typeof checkedIn !== "boolean") throw new HttpError(400, "Check-in needs a yes or no.");
  const updated = await pool.query(
    "UPDATE participants SET checked_in = $2 WHERE id = $1 RETURNING booking_id",
    [id, checkedIn],
  );
  if (!updated.rows[0]) throw new HttpError(404, "Participant not found.");
  const [booking] = await loadBookings(pool, [updated.rows[0].booking_id], true);
  return booking;
}

async function toggleAttendance(id, day) {
  assertUuid(id, "Participant");
  if (!/^[\d A-Za-z-]{1,40}$/.test(String(day || ""))) throw new HttpError(400, "Choose a programme day.");
  return withTx(async (client) => {
    const found = await client.query("SELECT booking_id, attendance FROM participants WHERE id = $1 FOR UPDATE", [id]);
    if (!found.rows[0]) throw new HttpError(404, "Participant not found.");
    const current = Array.isArray(found.rows[0].attendance) ? found.rows[0].attendance : [];
    const next = current.includes(day) ? current.filter((item) => item !== day) : [...current, day];
    await client.query("UPDATE participants SET attendance = $2::jsonb WHERE id = $1", [id, JSON.stringify(next)]);
    const [booking] = await loadBookings(client, [found.rows[0].booking_id], true);
    return booking;
  });
}

module.exports = {
  HttpError,
  seatsLeft,
  createHold,
  markPaid,
  getBooking,
  getParticipantBooking,
  lookup,
  extendHold,
  upgradeQuote,
  payUpgrade,
  getUpgrade,
  adminState,
  setCheckIn,
  toggleAttendance,
};
