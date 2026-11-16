# Farm Manager — Backend MVP

A first working foundation for managing **multiple farms** in Uganda, built with **Node.js 20+, Express, and PostgreSQL**. The existing Android project files at repository root are left untouched.

## Features implemented
- Farm registration and farm selector
- Nine species: pigs, cattle, goats, sheep, chickens, fish, horses, donkeys, rabbits
- Housing/stable/pond creation, per species and farm, with capacity limits
- Individual animals or batches with tag, sex, quantity, optional weight and birth date
- Species summary and animal list scoped to the selected farm
- Parameterized SQL, input validation, and transaction-protected housing capacity checks

## Run on Windows, macOS, or Linux
1. Install Node.js **20 or newer** and PostgreSQL.
2. Create a PostgreSQL database named `farm_manager`. For example, from `psql`:
   ```sql
   CREATE DATABASE farm_manager;
   ```
3. Open a terminal in the `backend` directory.
4. Run `npm install`.
5. Copy `.env.example` to `.env`, and replace `your_password` in `DATABASE_URL` with your local PostgreSQL password.
6. Initialize tables from the backend directory:
   ```bash
   psql -U postgres -d farm_manager -f db/schema.sql
   ```
   If `psql` is not on your PATH, run `db/schema.sql` in pgAdmin's Query Tool instead.
7. Start the application:
   ```bash
   npm start
   ```
8. Open **http://localhost:3000** in your browser.

For development, `npm run dev` uses Node's watch mode. Alternatively set `AUTO_MIGRATE=true` in `.env` to apply the idempotent schema automatically on startup; for production use managed migrations instead.

## API
| Method | Path | Purpose |
|---|---|---|
| GET | /api/health | Database health |
| GET | /api/species | Supported species |
| GET / POST | /api/farms | List / create farms |
| GET / POST | /api/farms/:farmId/housing | List / create housing |
| GET / POST | /api/farms/:farmId/animals | List / register animals or batches |
| GET | /api/farms/:farmId/summary | Active counts by species |

Example create farm:
```bash
curl -X POST http://localhost:3000/api/farms -H "Content-Type: application/json" -d '{"name":"Demo Farm","location":"Mbarara, Uganda"}'
```

## Important limitations and next milestones
**This is a local development MVP, not a production-ready licensed platform.** It has **no authentication, role-based authorization, tenant isolation beyond farm IDs, backups, audit log, or rate limiting**. Do **not** expose it on the public internet or enter real confidential farm records until those controls are implemented.

Next: login and farm membership, secure roles, movements, veterinary and medicine logs, feed inventory, breeding, mortality, product collection, sales, expenses, UGX reports, licensing, automated tests, and deployment.

The schema uses CHECK constraints and foreign keys; capacity validation is done within a transaction. Housing records and animal records are scoped by farm.
