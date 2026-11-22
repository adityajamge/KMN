const { pool, ensureSchema } = require("../db");

const GST = 0.18;
const COUNT = 100;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const FIRST = ["Aarav", "Aditi", "Ananya", "Arjun", "Dev", "Diya", "Ishaan", "Kavya", "Meera", "Neha", "Priya", "Rohan", "Sameer", "Sneha", "Tanvi", "Vivaan", "Anil", "Pooja", "Rahul", "Sana", "Kiran", "Nikhil", "Riya", "Amit", "Nisha", "Harsh", "Pallavi", "Om", "Ira", "Yash"];
const LAST = ["Kulkarni", "Deshmukh", "Joshi", "Rao", "Nair", "Patil", "Sharma", "Gupta", "More", "Bhosale", "Kale", "Ingle", "Wankhede", "Thakur", "Meshram"];
const AREAS = ["Manish Nagar", "Dharampeth", "Sadar", "Pratap Nagar", "Civil Lines", "Hanuman Nagar", "Sitabuldi", "Ramdaspeth", "Trimurti Nagar", "Wardha Road"];
const ROLES = ["Student", "Working adult", "Parent", "Homemaker", "Senior citizen (60+)", "Other"];
const GOALS = ["Concentration", "Awareness", "Calmness", "Confidence", "Emotional regulation", "Decisiveness", "Clarity about my way of life"];
const RELATIONS = ["Spouse / partner", "Child", "Sibling", "Friend"];
const SIZES = [1, 1, 2, 1, 1, 3];

function withGst(subtotal) {
  const gst = Math.round(subtotal * GST * 100) / 100;
  return { subtotal, gst, total: Math.round((subtotal + gst) * 100) / 100 };
}

function corePrice(count) {
  const subtotal = 499 * count;
  return { subtotal, gst: 0, total: subtotal };
}

function uuid(prefix, number) {
  return `${prefix}-0000-4000-8000-${number.toString(16).padStart(12, "0")}`;
}

function codeFor(number) {
  let value = number + 1;
  let suffix = "";
  for (let index = 0; index < 4; index += 1) {
    suffix = ALPHABET[value % ALPHABET.length] + suffix;
    value = Math.floor(value / ALPHABET.length);
  }
  return `SK-NGP01-B01-${suffix}`;
}

function programmeDays() {
  const days = [];
  const cursor = new Date(Date.UTC(2026, 10, 24));
  const last = new Date(Date.UTC(2026, 11, 23));
  while (cursor <= last) {
    days.push(cursor.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  if (days.length !== 30 || days[0] !== "24 Nov" || days[29] !== "23 Dec") {
    throw new Error("Programme day labels do not match 24 Nov to 23 Dec.");
  }
  return days;
}

function attendanceFor(personIndex, continues, days) {
  if (personIndex % 8 === 0) return [];
  const limit = continues ? 10 : 4;
  const marks = [];
  for (let day = 0; day < limit; day += 1) {
    const roll = (personIndex + day) % 5;
    if (roll === 0) continue;
    marks.push(roll === 1 ? `${days[day]} late` : days[day]);
  }
  return marks;
}

function build() {
  const days = programmeDays();
  const groups = [];
  let remaining = COUNT;
  let sizeIndex = 0;
  while (remaining > 0) {
    const size = Math.min(SIZES[sizeIndex % SIZES.length], remaining);
    groups.push(size);
    remaining -= size;
    sizeIndex += 1;
  }

  const bookings = [];
  const upgrades = [];
  let personIndex = 0;
  let invoiceNo = 1050;

  groups.forEach((size, bookingIndex) => {
    const paid = bookingIndex % 8 !== 7;
    const plan = paid && bookingIndex % 5 === 0 ? "comprehensive" : "core";
    const upgradeThis = paid && plan === "core" && bookingIndex % 6 === 0;
    const surname = LAST[bookingIndex % LAST.length];
    const area = AREAS[bookingIndex % AREAS.length];
    const created = new Date(Date.UTC(2026, 10, 10, 4, 0));
    created.setUTCHours(created.getUTCHours() + bookingIndex * 5);
    const people = [];

    for (let position = 0; position < size; position += 1) {
      const child = position > 0 && position % 2 === 1;
      const first = FIRST[(personIndex + position) % FIRST.length];
      const upgraded = upgradeThis && position === 0;
      const programme = plan === "comprehensive" || upgraded ? "comprehensive" : "core";
      const attendance = paid ? attendanceFor(personIndex, programme === "comprehensive", days) : [];
      const payer = people[0];
      people.push({
        id: uuid("20000000", personIndex + 1),
        position,
        name: `${first} ${surname}`,
        whatsapp: String(9000000100 + personIndex),
        email: `${first}.${surname}.${personIndex + 1}@example.com`.toLowerCase(),
        city: "Nagpur",
        area,
        role: child ? "Student" : ROLES[personIndex % ROLES.length],
        age: child ? 14 + (personIndex % 4) : 22 + (personIndex % 40),
        goals: [GOALS[personIndex % GOALS.length], GOALS[(personIndex + 3) % GOALS.length]],
        healthNote: personIndex % 17 === 0 ? "Mild asthma" : "",
        relation: position === 0 ? "" : (child ? "Child" : RELATIONS[position % RELATIONS.length]),
        guardianName: child && payer ? payer.name : "",
        guardianPhone: child && payer ? payer.whatsapp : "",
        code: paid ? codeFor(personIndex) : "",
        isPayer: position === 0,
        programme,
        upgraded,
        checkedIn: attendance.length > 0,
        attendance,
      });
      personIndex += 1;
    }

    const price = plan === "core" ? corePrice(size) : withGst(12499 * size);
    const bookingId = uuid("10000000", bookingIndex + 1);
    bookings.push({
      id: bookingId,
      plan,
      status: paid ? "paid" : "unpaid",
      createdAt: created.toISOString(),
      holdUntil: paid ? null : new Date(Date.now() + (bookingIndex % 2 === 0 ? 20 : -20) * 60 * 1000).toISOString(),
      invoiceNo: paid ? `INV-${invoiceNo}` : "",
      paymentRef: paid ? `pay_demo${String(invoiceNo).padStart(4, "0")}` : "",
      ...price,
      people,
    });
    if (paid) invoiceNo += 1;

    const upgradedPeople = people.filter((person) => person.upgraded);
    if (upgradedPeople.length > 0) {
      const priceUpgrade = withGst((12499 - 499) * upgradedPeople.length);
      upgrades.push({
        id: uuid("30000000", upgrades.length + 1),
        createdAt: new Date(created.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        invoiceNo: `INV-${invoiceNo}`,
        paymentRef: `pay_upg${String(invoiceNo).padStart(4, "0")}`,
        gross: 12499 * upgradedPeople.length,
        credit: 499 * upgradedPeople.length,
        ...priceUpgrade,
        participantIds: upgradedPeople.map((person) => person.id),
      });
      invoiceNo += 1;
    }
  });

  if (personIndex !== COUNT) throw new Error(`Expected ${COUNT} participants, built ${personIndex}.`);
  return { bookings, upgrades, nextInvoice: invoiceNo };
}

async function demo() {
  const { bookings, upgrades, nextInvoice } = build();
  const people = bookings.reduce((sum, booking) => sum + booking.people.length, 0);
  await ensureSchema();
  const existing = await pool.query("SELECT COUNT(*)::int AS count FROM bookings");
  if (existing.rows[0].count > 0) {
    console.log("The database already has bookings. Run npm run db:clear first.");
    return;
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const booking of bookings) {
      await client.query(
        `INSERT INTO bookings (id, plan, status, created_at, hold_until, invoice_no, payment_ref, subtotal, gst, total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [booking.id, booking.plan, booking.status, booking.createdAt, booking.holdUntil, booking.invoiceNo, booking.paymentRef, booking.subtotal, booking.gst, booking.total],
      );
      for (const row of booking.people) {
        await client.query(
          `INSERT INTO participants (
             id, booking_id, position, name, whatsapp, email, city, area, role, age, goals,
             health_note, relation, guardian_name, guardian_phone, code, is_payer, programme,
             upgraded, checked_in, attendance
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb,
             $12, $13, $14, $15, $16, $17, $18, $19, $20, $21::jsonb
           )`,
          [row.id, booking.id, row.position, row.name, row.whatsapp, row.email, row.city, row.area, row.role, row.age, JSON.stringify(row.goals), row.healthNote, row.relation, row.guardianName, row.guardianPhone, row.code, row.isPayer, row.programme, row.upgraded, row.checkedIn, JSON.stringify(row.attendance)],
        );
      }
    }
    for (const upgrade of upgrades) {
      await client.query(
        `INSERT INTO upgrades (id, status, created_at, gross, credit, gst, total, invoice_no, payment_ref)
         VALUES ($1, 'paid', $2, $3, $4, $5, $6, $7, $8)`,
        [upgrade.id, upgrade.createdAt, upgrade.gross, upgrade.credit, upgrade.gst, upgrade.total, upgrade.invoiceNo, upgrade.paymentRef],
      );
      for (const participantId of upgrade.participantIds) {
        await client.query(
          "INSERT INTO upgrade_participants (upgrade_id, participant_id) VALUES ($1, $2)",
          [upgrade.id, participantId],
        );
      }
    }
    await client.query("UPDATE invoice_seq SET next_no = $1 WHERE id = 1", [nextInvoice]);
    await client.query("COMMIT");
    console.log(`Demo data is in the database: ${people} participants, ${bookings.length} bookings, ${upgrades.length} upgrades.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

demo()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error.message);
    await pool.end();
    process.exit(1);
  });
