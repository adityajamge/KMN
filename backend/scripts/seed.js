const { pool, ensureSchema } = require("../db");

const GST = 0.18;

function money(subtotal) {
  const gst = Math.round(subtotal * GST * 100) / 100;
  return { subtotal, gst, total: Math.round((subtotal + gst) * 100) / 100 };
}

const coreOne = money(499);
const coreTwo = money(998);
const coreThree = money(1497);
const fullOne = money(12499);
const upgradeOne = money(12000);

const bookings = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    plan: "core",
    status: "paid",
    createdAt: "2026-11-08T09:15:00+05:30",
    holdUntil: null,
    invoiceNo: "INV-1042",
    paymentRef: "pay_demo_meera",
    ...coreThree,
    people: [
      ["20000000-0000-4000-8000-000000000001", "Meera Kulkarni", "9823011122", "meera.kulkarni@example.com", "Nagpur", "Manish Nagar", "Working adult", 34, ["Calmness", "Emotional regulation"], "", "", "", "", "SK-NGP01-B01-MK5G", true, "core", false, true, ["20 Nov"]],
      ["20000000-0000-4000-8000-000000000002", "Rohan Kulkarni", "9823011133", "rohan.kulkarni@example.com", "Nagpur", "Manish Nagar", "Student", 16, ["Concentration", "Decisiveness"], "", "Child", "Meera Kulkarni", "9823011122", "SK-NGP01-B01-R7QT", false, "core", false, true, ["20 Nov"]],
      ["20000000-0000-4000-8000-000000000003", "Anil Kulkarni", "9823011144", "anil.kulkarni@example.com", "Nagpur", "Manish Nagar", "Working adult", 36, ["Awareness", "Calmness"], "Mild asthma", "Spouse / partner", "", "", "SK-NGP01-B01-D2WX", false, "core", false, false, []],
    ],
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    plan: "comprehensive",
    status: "paid",
    createdAt: "2026-11-09T18:40:00+05:30",
    holdUntil: null,
    invoiceNo: "INV-1044",
    paymentRef: "pay_demo_arjun",
    ...fullOne,
    people: [
      ["20000000-0000-4000-8000-000000000004", "Arjun Deshmukh", "9890123456", "arjun.deshmukh@example.com", "Nagpur", "Dharampeth", "Working adult", 29, ["Concentration", "Clarity about my way of life"], "", "", "", "", "SK-NGP01-B01-H9LP", true, "comprehensive", false, true, ["20 Nov", "21 Nov"]],
    ],
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    plan: "core",
    status: "unpaid",
    createdAt: new Date().toISOString(),
    holdUntil: new Date(Date.now() + 8 * 60 * 1000).toISOString(),
    invoiceNo: "",
    paymentRef: "",
    ...coreOne,
    people: [
      ["20000000-0000-4000-8000-000000000005", "Priya Nair", "9765432109", "priya.nair@example.com", "Nagpur", "Civil Lines", "Student", 22, ["Confidence", "Concentration"], "", "", "", "", "", true, "core", false, false, []],
    ],
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    plan: "core",
    status: "paid",
    createdAt: "2026-11-07T11:05:00+05:30",
    holdUntil: null,
    invoiceNo: "INV-1038",
    paymentRef: "pay_demo_sameer",
    ...coreOne,
    people: [
      ["20000000-0000-4000-8000-000000000006", "Sameer Joshi", "9811112233", "sameer.joshi@example.com", "Nagpur", "Sadar", "Parent", 41, ["Emotional regulation", "Calmness"], "", "", "", "", "SK-NGP01-B01-C4ZN", true, "comprehensive", true, true, ["20 Nov", "21 Nov", "22 Nov", "23 Nov"]],
    ],
  },
  {
    id: "10000000-0000-4000-8000-000000000005",
    plan: "core",
    status: "paid",
    createdAt: "2026-11-10T16:20:00+05:30",
    holdUntil: null,
    invoiceNo: "INV-1046",
    paymentRef: "pay_demo_ananya",
    ...coreTwo,
    people: [
      ["20000000-0000-4000-8000-000000000007", "Ananya Rao", "9900887766", "ananya.rao@example.com", "Nagpur", "Pratap Nagar", "Working adult", 27, ["Awareness", "Decisiveness"], "", "", "", "", "SK-NGP01-B01-V8JE", true, "core", false, false, []],
      ["20000000-0000-4000-8000-000000000008", "Kavya Rao", "9900887755", "kavya.rao@example.com", "Nagpur", "Pratap Nagar", "Working adult", 24, ["Calmness", "Confidence"], "", "Sibling", "", "", "SK-NGP01-B01-B3NK", false, "core", false, false, []],
    ],
  },
];

async function seed() {
  await ensureSchema();
  const existing = await pool.query("SELECT COUNT(*)::int AS count FROM bookings");
  if (existing.rows[0].count > 0) {
    console.log("The database already has bookings, so the sample rows were left out.");
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
      for (let index = 0; index < booking.people.length; index += 1) {
        const person = booking.people[index];
        await client.query(
          `INSERT INTO participants (
             id, booking_id, position, name, whatsapp, email, city, area, role, age, goals,
             health_note, relation, guardian_name, guardian_phone, code, is_payer, programme,
             upgraded, checked_in, attendance
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb,
             $12, $13, $14, $15, $16, $17, $18, $19, $20, $21::jsonb
           )`,
          [person[0], booking.id, index, person[1], person[2], person[3], person[4], person[5], person[6], person[7], JSON.stringify(person[8]), person[9], person[10], person[11], person[12], person[13], person[14], person[15], person[16], person[17], JSON.stringify(person[18])],
        );
      }
    }
    await client.query(
      `INSERT INTO upgrades (id, status, created_at, gross, credit, gst, total, invoice_no, payment_ref)
       VALUES ($1, 'paid', $2, $3, $4, $5, $6, 'INV-1048', 'pay_demo_upgrade_sameer')`,
      ["30000000-0000-4000-8000-000000000001", "2026-11-23T18:05:00+05:30", 12499, 499, upgradeOne.gst, upgradeOne.total],
    );
    await client.query(
      "INSERT INTO upgrade_participants (upgrade_id, participant_id) VALUES ($1, $2)",
      ["30000000-0000-4000-8000-000000000001", "20000000-0000-4000-8000-000000000006"],
    );
    await client.query("COMMIT");
    console.log("Sample Nagpur bookings are in the database.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

seed()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error.message);
    await pool.end();
    process.exit(1);
  });
