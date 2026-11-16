require('dotenv').config();
const express = require('express');
const path = require('node:path');
const fs = require('node:fs/promises');
const { Pool } = require('pg');

const SPECIES = Object.freeze(['pig','cattle','goat','sheep','chicken','fish','horse','donkey','rabbit']);
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined
});

const bad = (message, status = 400) => Object.assign(new Error(message), { status });
const positiveId = value => {
  if (!/^[1-9]\d*$/.test(String(value))) throw bad('A positive numeric ID is required');
  return value;
};
const requiredText = (value, label, max = 120) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw bad(label + ' is required (max ' + max + ' characters)');
  return value.trim();
};
const optionalText = (value, max = 1000) => {
  if (value == null) return '';
  if (typeof value !== 'string' || value.length > max) throw bad('Invalid text value');
  return value.trim();
};
const numberValue = (value, label, { min = 0, integer = false } = {}) => {
  const n = Number(value);
  if (value === '' || value == null || !Number.isFinite(n) || n < min || (integer && !Number.isSafeInteger(n))) throw bad('Invalid ' + label);
  return n;
};
const speciesValue = value => {
  if (!SPECIES.includes(value)) throw bad('Species must be one of: ' + SPECIES.join(', '));
  return value;
};
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

app.get('/api/health', asyncRoute(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true, database: 'connected' });
}));
app.get('/api/species', (_req, res) => res.json(SPECIES));

app.get('/api/farms', asyncRoute(async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM farms ORDER BY id DESC');
  res.json(rows);
}));
app.post('/api/farms', asyncRoute(async (req, res) => {
  const name = requiredText(req.body.name, 'Farm name');
  const location = optionalText(req.body.location, 200);
  const { rows } = await pool.query('INSERT INTO farms(name, location) VALUES ($1,$2) RETURNING *', [name, location]);
  res.status(201).json(rows[0]);
}));

app.get('/api/farms/:farmId/housing', asyncRoute(async (req, res) => {
  const farmId = positiveId(req.params.farmId);
  const { rows } = await pool.query('SELECT * FROM housing WHERE farm_id=$1 ORDER BY id DESC', [farmId]);
  res.json(rows);
}));
app.post('/api/farms/:farmId/housing', asyncRoute(async (req, res) => {
  const farmId = positiveId(req.params.farmId);
  const name = requiredText(req.body.name, 'Housing name');
  const species = speciesValue(req.body.species);
  const capacity = numberValue(req.body.capacity, 'capacity', { min: 1, integer: true });
  const { rows } = await pool.query('INSERT INTO housing(farm_id,name,species,capacity) VALUES ($1,$2,$3,$4) RETURNING *', [farmId,name,species,capacity]);
  res.status(201).json(rows[0]);
}));

app.get('/api/farms/:farmId/animals', asyncRoute(async (req, res) => {
  const farmId = positiveId(req.params.farmId);
  const params = [farmId];
  let query = 'SELECT a.*, h.name AS housing_name FROM animals a LEFT JOIN housing h ON h.id=a.housing_id WHERE a.farm_id=$1';
  if (req.query.species) {
    params.push(speciesValue(req.query.species));
    query += ' AND a.species=$2';
  }
  const { rows } = await pool.query(query + ' ORDER BY a.id DESC', params);
  res.json(rows);
}));
app.post('/api/farms/:farmId/animals', asyncRoute(async (req, res) => {
  const farmId = positiveId(req.params.farmId);
  const tag = requiredText(req.body.tag, 'Animal tag');
  const species = speciesValue(req.body.species);
  const sex = req.body.sex || 'unknown';
  if (!['male','female','unknown','mixed'].includes(sex)) throw bad('Invalid sex');
  const quantity = numberValue(req.body.quantity ?? 1, 'quantity', { min: 1, integer: true });
  const weight = req.body.weight_kg === '' || req.body.weight_kg == null ? null : numberValue(req.body.weight_kg, 'weight');
  const birthDate = req.body.birth_date || null;
  if (birthDate && (typeof birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(Date.parse(birthDate)))) throw bad('Invalid birth date');
  const housingId = req.body.housing_id ? positiveId(req.body.housing_id) : null;
  const notes = optionalText(req.body.notes);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (housingId) {
      const house = await client.query('SELECT species, capacity FROM housing WHERE id=$1 AND farm_id=$2 FOR UPDATE', [housingId,farmId]);
      if (!house.rowCount) throw bad('Housing not found in this farm');
      if (house.rows[0].species !== species) throw bad('Housing species does not match animal species');
      const used = await client.query("SELECT COALESCE(SUM(quantity),0)::int AS used FROM animals WHERE housing_id=$1 AND status='active'", [housingId]);
      if (Number(used.rows[0].used) + quantity > house.rows[0].capacity) throw bad('Housing capacity exceeded');
    }
    const { rows } = await client.query(
      'INSERT INTO animals(farm_id,tag,species,sex,quantity,birth_date,weight_kg,housing_id,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [farmId,tag,species,sex,quantity,birthDate,weight,housingId,notes]
    );
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
}));

app.get('/api/farms/:farmId/summary', asyncRoute(async (req, res) => {
  const farmId = positiveId(req.params.farmId);
  const { rows } = await pool.query(
    "SELECT species, COALESCE(SUM(quantity) FILTER (WHERE status='active'),0)::int AS active_count FROM animals WHERE farm_id=$1 GROUP BY species ORDER BY species", [farmId]
  );
  res.json({ farm_id: farmId, species: rows, total_active: rows.reduce((n, row) => n + row.active_count, 0) });
}));

app.use((err, _req, res, _next) => {
  const pgErrors = { '23505': [409,'A record with this name or tag already exists'], '23503': [404,'Referenced farm or housing not found'], '23514': [400,'Database validation failed'], '22P02': [400,'Invalid input'], '22007': [400,'Invalid date'] };
  const mapped = pgErrors[err.code];
  const status = mapped?.[0] || err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: mapped?.[1] || (status >= 500 ? 'Internal server error' : err.message) });
});

async function start() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required. Copy .env.example to .env and configure PostgreSQL.');
  if (process.env.AUTO_MIGRATE === 'true') {
    const schema = await fs.readFile(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
    await pool.query(schema);
  }
  await pool.query('SELECT 1');
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => console.log('Farm Manager running at http://localhost:' + port));
}
if (require.main === module) start().catch(err => { console.error(err); process.exitCode = 1; pool.end(); });
module.exports = { app, pool, SPECIES };
