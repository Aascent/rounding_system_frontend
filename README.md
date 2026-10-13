# Smart Rounding & Compliance Platform

Production application workspace for the documented Smart Rounding V1. The current implementation establishes safe web/API foundations only; clinical rules and PointClickCare mappings remain blocked by the authoritative specifications listed in the development tracker.

## Requirements

- Node.js 24.15 or newer
- npm 10 or newer

## Commands

```bash
npm install
npm run dev
npm run dev:api
npm run validate
```

Copy each `.env.example` to `.env.local` or provide equivalent environment variables. Never use real PHI in local development.

## Services

- `apps/web`: accessible Next.js application shell. It intentionally contains no fabricated clinical records while PCC mappings and rules are unresolved.
- `apps/api`: NestJS API with validated configuration, secure HTTP headers, CORS allow-listing, correlation IDs, safe error responses, and liveness/readiness endpoints under `/api/v1`.
- `packages/contracts`: shared runtime-validated transport primitives.

Each service includes a multi-stage, non-root container build. Deployment configuration and PHI ingestion remain gated by the decisions in `development/DEVELOPMENT_TRACKER.md`.

## Synthetic development mode

Set `DATA_MODE=synthetic` for the API to enable non-PHI interface fixtures. When unset, provider data endpoints fail closed with `503 Service Unavailable`.

- `GET /api/v1/provider/dashboard`
- `GET /api/v1/provider/rounding-list`
- `GET /api/v1/provider/patients/:id`
- `GET/PATCH /api/v1/admin/thresholds[/:id]`
- `GET/POST/PATCH /api/v1/admin/users[/:id]`
- `GET /api/v1/admin/audit`
- `GET /api/v1/admin/audit/export`
- `GET/POST /api/v1/admin/sync`

The web workspace currently renders the same schema-validated synthetic fixture set. Every screen labels this mode explicitly; fixture reasons and values are not approved clinical rules.

The root route (`/`) is the synthetic login. Successful sign-in redirects provider and NP accounts to `/provider` and Admin accounts to `/admin`; patient details use `/patients/:id`. `/login` remains as a compatibility redirect to `/`.

Provider routes: `/provider`, `/provider/physician-list`, `/provider/np-list`, and `/provider/reports`.

Admin routes: `/admin`, `/admin/users`, `/admin/thresholds`, `/admin/keywords`, `/admin/facilities`, `/admin/audit`, and `/admin/system`.

Synthetic credentials:

- Provider: `provider@smart-rounding.test`
- NP: `np@smart-rounding.test`
- Admin: `admin@smart-rounding.test`
- Password: `Demo123!`
- MFA code: `123456`

The browser-only synthetic session exists solely for UI development. Protected API routes continue to enforce their separate server-side authentication/RBAC guard.
