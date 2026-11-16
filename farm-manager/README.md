# Farm Manager — Phase 1

A working starter for managing multiple farms and nine livestock species, built with Node.js, Express and PostgreSQL.

## Requirements
- Node.js 20+ and npm
- PostgreSQL 14+

## Windows setup
1. Download or clone the repository and open a terminal in the `farm-manager` folder.
2. Run `npm install`.
3. Create a PostgreSQL database named `farm_manager` (for example, using pgAdmin).
4. Copy `.env.example` to `.env` and replace `YOUR_PASSWORD` with your local PostgreSQL password.
5. Run `npm run db:init`.
6. Run `npm start`.
7. Open http://localhost:3000 in your browser.

Do not commit your real `.env` file or passwords. This starter has **no login or authorization** and should run **only locally**, not exposed publicly.

## Features
- Create and switch between farms
- Register farm housing with capacity
- Register individual animals or batches across pigs, cattle, goats, sheep, chickens, fish, horses, donkeys and rabbits
- Enforce per-farm tag uniqueness, farm-scoped housing and capacity checks
- View animals and live species counts

## API
- `GET /api/health`
- `GET, POST /api/farms`
- `GET, POST /api/farms/:farmId/housing`
- `GET, POST /api/farms/:farmId/animals`
- `GET /api/farms/:farmId/summary`
- `GET /api/species`

## Next phases
Authentication, farm ownership and roles; veterinary records; feed and inventory; movements and mortality; production and sales; licensing; reporting.

**Security note:** The farm IDs in these routes are not access controls. Multi-user access must not be enabled until authentication and per-farm authorization are implemented.
