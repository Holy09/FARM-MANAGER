require('dotenv').config();
const fs = require('node:fs/promises');
const path = require('node:path');
const { Pool } = require('pg');

function explain(error) {
  const causes = error.errors?.length ? error.errors : [error];
  return causes.map(e => [e.code, e.message || String(e)].filter(Boolean).join(': ')).join(' | ');
}
(async () => {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('YOUR_PASSWORD')) {
    console.error('Database setup failed: Configure DATABASE_URL in .env with your PostgreSQL password.');
    process.exitCode = 1;
    return;
  }
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : false
  });
  try {
    const sql = await fs.readFile(path.join(__dirname, '../sql/schema.sql'), 'utf8');
    await pool.query(sql);
    console.log('Database tables created successfully.');
  } catch (error) {
    console.error('Database setup failed:', explain(error));
    console.error('Check that PostgreSQL is installed, running on localhost:5432, and the farm_manager database exists.');
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
