const { pool, ensureSchema } = require("../db");

const TABLES = [
  "whatsapp_sends",
  "upgrade_participants",
  "payment_orders",
  "upgrades",
  "participants",
  "bookings",
];

async function clear() {
  await ensureSchema();
  await pool.query(`TRUNCATE TABLE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`);
  await pool.query("UPDATE invoice_seq SET next_no = 1050 WHERE id = 1");
  const left = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM bookings) AS bookings,
      (SELECT COUNT(*)::int FROM participants) AS participants,
      (SELECT COUNT(*)::int FROM upgrades) AS upgrades
  `);
  console.log("Cleared bookings, participants, upgrades, payment orders, and WhatsApp sends.");
  console.log("Group links in event_settings were left as they are.");
  console.log(`Bookings ${left.rows[0].bookings}, participants ${left.rows[0].participants}, upgrades ${left.rows[0].upgrades}. Invoice numbers start again at INV-1050.`);
}

clear()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error.message);
    await pool.end();
    process.exit(1);
  });
