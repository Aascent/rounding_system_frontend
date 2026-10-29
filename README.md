# Smart Rounding & Compliance Platform

Production application workspace for the documented Smart Rounding V1. The web app runs on a NestJS API backed by PostgreSQL, using synthetic (demo) data only. PointClickCare integration, Keycloak and the approved clinical thresholds remain blocked by the items listed in the development tracker.

## Requirements

- Node.js 24.15 or newer
- npm 10 or newer

## Run locally

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm run dev:api
npm run dev
```

Open http://localhost:3000. The API listens on http://localhost:3001 and the web app proxies `/api/v1/*` to it.

- **Database.** Without `DATABASE_URL` the API uses an embedded PostgreSQL (PGlite) stored in `apps/api/.data/pglite`, so no setup is needed. To use a real PostgreSQL (your local install, or Cloud SQL), create an empty database and set `DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DBNAME` in `apps/api/.env`. Migrations run and demo data is seeded automatically on first start. With pgAdmin: in a Query Tool on the `postgres` database run, one statement at a time (pgAdmin wraps scripts in a transaction, which `CREATE DATABASE` refuses), `CREATE ROLE smart_rounding_app LOGIN PASSWORD '…';` then `CREATE DATABASE smart_rounding OWNER smart_rounding_app;`, and put the matching `DATABASE_URL` in `apps/api/.env`.
- **Reset the demo data.** Stop the API and delete `apps/api/.data/` (or drop the PostgreSQL database).
- **Demo without a backend.** Leave `API_BASE_URL` unset and the web app runs on its built-in demo dataset (this is how the static Vercel preview works).

```bash
npm run validate
```

`validate` runs format check, lint, typecheck, the API test suite (against an in-memory database) and the production build.

## Services

- `apps/web`: Next.js application. With `API_BASE_URL` set it reads everything from the API using the signed-in user's session.
- `apps/api`: NestJS API under `/api/v1` with PostgreSQL persistence (migrations in `src/database/migrations.ts`), session authentication, server-side RBAC and resource scoping, an append-only audit log, and an OpenAPI document at `/api/v1/openapi.json`.
- `packages/contracts`: shared Zod contracts and the deterministic rules engine used by both.

Each service includes a multi-stage, non-root container build. Deployment and PHI ingestion remain gated by the decisions in `development/DEVELOPMENT_TRACKER.md`.

## Accounts (synthetic data only)

Every staff member has their own account (see Admin → Users). The demo seeds one password for all of them.

- Physician: `provider@smart-rounding.test`
- Nurse practitioner: `np@smart-rounding.test`
- Admin: `admin@smart-rounding.test`
- Any other user: their email from Admin → Users
- Password: `Demo123!` · MFA code: `123456`

MFA is a fixed stand-in code until Keycloak is integrated, and is accepted only when `AUTH_MODE=local`. New users and password resets get a one-time temporary password shown once to the admin.

Sessions use an HttpOnly cookie. They end after `SESSION_IDLE_MINUTES` of inactivity (the browser warns a minute before) or after `SESSION_MAX_HOURS`; "Remember me" keeps the session across browser restarts for up to `SESSION_REMEMBER_DAYS`. These values are placeholders until the practice decides its session policy.

## Routes

- Sign-in: `/` (`/login` redirects there).
- Provider: `/provider` (today's visits), `/provider/patient-list` (caseload), `/provider/np-list` (physicians only), `/provider/reports`, `/patients/:id`.
- Admin: `/admin`, `/admin/users`, `/admin/thresholds`, `/admin/rules`, `/admin/keywords`, `/admin/facilities`, `/admin/audit`, `/admin/system`.
