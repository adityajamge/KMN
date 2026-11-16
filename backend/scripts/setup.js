const { pool, ensureSchema } = require("../db");

ensureSchema()
  .then(async () => {
    console.log("Event tables are ready.");
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error.message);
    await pool.end();
    process.exit(1);
  });
