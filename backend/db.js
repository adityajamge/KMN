const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  const examplePath = path.join(__dirname, ".env.example");
  const example = fs.existsSync(examplePath) ? fs.readFileSync(examplePath, "utf8") : "";
  const pasted = example.match(/^DATABASE_URL=(.*)$/m);
  if (pasted && pasted[1].trim()) {
    console.error("The Neon URL is in KMN/backend/.env.example.");
    console.error("Move that DATABASE_URL line into KMN/backend/.env so the real URL is not committed, then start again.");
  } else {
    console.error("DATABASE_URL is empty.");
    console.error("Paste the Neon connection string into KMN/backend/.env and start again.");
  }
  process.exit(1);
}

const local = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: local ? false : { rejectUnauthorized: false },
});

async function ensureSchema() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(sql);
}

module.exports = { pool, ensureSchema };
