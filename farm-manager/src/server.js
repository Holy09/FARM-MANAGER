require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('node:path');
const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : false });
const species = ['pig','cattle','goat','sheep','chicken','fish','horse','donkey','rabbit'];
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, '../public')));
const asyncRoute = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);
const positiveId = v => /^\d+$/.test(String(v)) && Number(v) > 0;
const bad = (res,message) => res.status(400).json({error:message});
app.get('/api/health', asyncRoute(async (req,res) => { await pool.query('SELECT 1'); res.json({status:'ok', database:'connected'}); }));
app.get('/api/species', (req,res) => res.json(species));
app.get('/api/farms', asyncRoute(async (req,res) => { const r=await pool.query('SELECT * FROM farms ORDER BY id DESC'); res.json(r.rows); }));
app.post('/api/farms', asyncRoute(async (req,res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const location = typeof req.body.location === 'string' ? req.body.location.trim() : null;
  if (!name || name.length > 120) return bad(res,'Farm name must be 1–120 characters');
  const r=await pool.query('INSERT INTO farms(name,location) VALUES($1,$2) RETURNING *',[name,location]);
  res.status(201).json(r.rows[0]);
}));
app.get('/api/farms/:farmId/housing', asyncRoute(async (req,res) => {
  if (!positiveId(req.params.farmId)) return bad(res,'Invalid farm ID');
  const r=await pool.query('SELECT * FROM housing WHERE farm_id=$1 ORDER BY id DESC',[req.params.farmId]);res.json(r.rows);
}));
app.post('/api/farms/:farmId/housing', asyncRoute(async (req,res) => {
  if (!positiveId(req.params.farmId)) return bad(res,'Invalid farm ID');
  const name=typeof req.body.name==='string'?req.body.name.trim():'';
  const capacity=req.body.capacity;
  if(!name || name.length>120 || !Number.isSafeInteger(capacity) || capacity<0) return bad(res,'Valid housing name and nonnegative integer capacity required');
  const r=await pool.query('INSERT INTO housing(farm_id,name,capacity) VALUES($1,$2,$3) RETURNING *',[req.params.farmId,name,capacity]);
  res.status(201).json(r.rows[0]);
}));
app.get('/api/farms/:farmId/animals', asyncRoute(async (req,res) => {
  if (!positiveId(req.params.farmId)) return bad(res,'Invalid farm ID');
  const r=await pool.query('SELECT a.*,h.name AS housing_name FROM animals a LEFT JOIN housing h ON h.id=a.housing_id WHERE a.farm_id=$1 ORDER BY a.id DESC',[req.params.farmId]);
  res.json(r.rows);
}));
app.post('/api/farms/:farmId/animals', asyncRoute(async (req,res) => {
  if (!positiveId(req.params.farmId)) return bad(res,'Invalid farm ID');
  const {species:kind,tag,quantity=1,sex='unknown',housing_id=null,birth_date=null}=req.body;
  if(!species.includes(kind) || typeof tag!=='string' || !tag.trim() || tag.length>100 || !Number.isSafeInteger(quantity) || quantity<1 || !['male','female','mixed','unknown'].includes(sex)) return bad(res,'Invalid animal details');
  if(housing_id!==null && !positiveId(housing_id)) return bad(res,'Invalid housing ID');
  if(birth_date!==null && (typeof birth_date!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(birth_date) || Number.isNaN(Date.parse(birth_date)))) return bad(res,'Birth date must be YYYY-MM-DD');
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    if(housing_id!==null) {
      const h=await client.query('SELECT capacity FROM housing WHERE id=$1 AND farm_id=$2 FOR UPDATE',[housing_id,req.params.farmId]);
      if(!h.rowCount) {await client.query('ROLLBACK');return bad(res,'Housing not found on this farm');}
      const occupied=await client.query("SELECT COALESCE(SUM(quantity),0)::int AS total FROM animals WHERE housing_id=$1 AND status='active'",[housing_id]);
      if(occupied.rows[0].total+quantity>h.rows[0].capacity) {await client.query('ROLLBACK');return res.status(409).json({error:'Housing capacity exceeded'});}
    }
    const r=await client.query('INSERT INTO animals(farm_id,housing_id,species,tag,quantity,sex,birth_date) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[req.params.farmId,housing_id,kind,tag.trim(),quantity,sex,birth_date]);
    await client.query('COMMIT');res.status(201).json(r.rows[0]);
  } catch(e) {await client.query('ROLLBACK');throw e;} finally {client.release();}
}));
app.get('/api/farms/:farmId/summary', asyncRoute(async (req,res) => {
  if(!positiveId(req.params.farmId)) return bad(res,'Invalid farm ID');
  const r=await pool.query("SELECT species, SUM(quantity)::int AS count FROM animals WHERE farm_id=$1 AND status='active' GROUP BY species ORDER BY species",[req.params.farmId]);
  res.json(r.rows);
}));
app.use((err,req,res,next)=>{
  if(err.code==='23505') return res.status(409).json({error:'A record with that name or tag already exists on this farm'});
  if(err.code==='23503') return res.status(404).json({error:'Farm or housing not found'});
  if(err.code==='23514'||err.code==='22P02'||err.code==='22008') return res.status(400).json({error:'Invalid data'});
  console.error(err);res.status(500).json({error:'Unexpected server error'});
});
const port=Number(process.env.PORT)||3000;
app.listen(port,()=>console.log('Farm Manager running at http://localhost:'+port));
