require('dotenv').config();
const fs = require('node:fs/promises');
const path = require('node:path');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : false });
(async () => {
  try {
    const sql = await fs.readFile(path.join(__dirname, '../sql/schema.sql'), 'utf8');
    await pool.query(sql);
    console.log('Database tables created successfully.');
  } catch (err) {
    console.error('Database setup failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
