# Architecture

## Architectural intent

V1 is a modular web platform deployed in the client's GCP organization. A React client calls a NestJS API. Background ingestion and rules workloads obtain read-only PCC data through an adapter, normalize it into PostgreSQL, generate provider-specific lists, and retain the evidence needed to explain and audit each result.

```text
Provider/Admin browser
        |
        | TLS 1.2+ / authenticated API
        v
React + Next.js routing ---- Keycloak / enterprise identity provider
        |
        v
NestJS API on Cloud Run
  |     |          |            |
  |     |          |            +--> audit/operations services
  |     |          +--> admin and configuration services
  |     +--> patient/list query services
  +--> job control
          |
          v
PCC adapter -> normalization -> PostgreSQL (Cloud SQL)
          |                          |
          +-> sync status/DLQ        +-> deterministic rules worker
                                             |
                                             +-> list items + explanations

GCP: IAM, VPC/private connectivity, Secret Manager, KMS,
Cloud Logging/Monitoring, Cloud Build; Redis only where justified.
```

## Major modules

### Web client

Provides login/MFA entry, provider dashboard, rounding list, patient detail, and Admin experiences. It renders server-authorized data and never independently calculates authoritative compliance or priority results. With `API_BASE_URL` set, Server Components call the API with the user's session cookie and the browser calls same-origin `/api/v1/*` proxied by Next.js; without it the client runs on a built-in demo dataset (static previews only).

### Identity and access

Keycloak mediates OAuth 2.0-based authentication and MFA; SAML 2.0 is listed as supported but its role is not specified. NestJS validates tokens and applies role plus resource/facility scope at every boundary. Identity lifecycle, federation, session values, and exact permissions require decisions.

Until Keycloak is available the API runs local database accounts (`AUTH_MODE=local`): scrypt-hashed passwords, a stand-in MFA code, and opaque HttpOnly session cookies stored as hashes with idle and absolute expiry. Guards resolve the session on every request; services enforce resource scope (an NP only opens patients in their caseload; admins never open clinical records).

### PCC integration adapter

Owns PCC authentication, endpoint clients, pagination, timeouts, retry, rate-limit handling, incremental checkpoints, and translation from source payloads. No other module should depend on raw PCC transport schemas. V1 is read-only with respect to PCC.

### Ingestion and normalization

Validates source records, maps identifiers and fields, coerces types, handles nulls/duplicates, retains provenance, and records sync status. A successful checkpoint advances only after an idempotent persistence boundary. Non-transient failures enter a recoverable dead-letter path and raise an operational alert.

### Patient and visit domain

Stores normalized patients, facilities, assignments, encounters, observations, notes/keyword hits, and classification evidence. Physical tables and field mappings remain provisional until Phase 1 sandbox validation.

### Rules and compliance engine

Consumes a versioned, immutable evaluation input. Individual deterministic evaluators return structured results rather than presentation strings. A pipeline combines clinical urgency, compliance state, deduplication, physician tie-breaking, and carry-forward into list items. Each run stores the rule/configuration versions and inputs/provenance necessary to reproduce the explanation.

### List query and administration

Query services expose only provider/facility-scoped records. Administration handles numeric thresholds, users/roles, sync control/status, and audit queries/exports. New rule-type creation is prohibited in V1.

### Audit and observability

Separate operational telemetry from security/PHI audit evidence. Application logs use correlation IDs and exclude clinical payloads/secrets. Audit records capture the minimum fields required by the proposal and should be tamper-resistant; storage/retention design awaits policy decisions.

## Principal data flow

1. Scheduler or authorized manual action creates a unique sync run.
2. PCC adapter obtains/refreshes credentials from Secret Manager and reads changes from approved endpoints.
3. Normalization validates and upserts source records transactionally with provenance.
4. A rules run snapshots the eligible population, provider assignments, current thresholds, and relevant history.
5. Evaluators emit structured clinical/compliance findings.
6. Prioritization, same-day deduplication, physician tie-breaking, and carry-forward create provider list snapshots.
7. NestJS APIs apply identity and resource scope before returning lists, detail, admin data, or exports.
8. Security, PHI access, rule execution, configuration, and operational outcomes are recorded in their appropriate audit/telemetry stores.

## Deployment boundaries

- Separate Cloud Run services/processes for the API and rules/sync worker are explicitly proposed.
- Cloud SQL for PostgreSQL is the system of record.
- Memorystore/Redis is proposed but no mandatory use case is specified; introduce it only for a validated coordination/cache need and never as the sole record of truth.
- Services use least-privilege identities, private connectivity where supported, Secret Manager, TLS 1.2+, encryption at rest, structured logging, health checks, autoscaling, monitoring, and alerts.
- Production PHI remains disabled until the BAA gate is evidenced. Sandbox work uses synthetic or de-identified data.

## Architectural constraints and decisions pending

- React SPA versus Next.js rendering/deployment mode is not defined.
- The proposal first names AWS/Azure in generic hosting scope, then explicitly confirms and supersedes it with GCP; GCP is therefore the controlling V1 deployment target.
- Keycloak topology, enterprise IdP integration, SAML requirement, and MFA provider are undefined.
- PCC contracts and rate limits are absent; adapter and schema design cannot be finalized before sandbox validation and receipt of API documentation.
- Job orchestration technology, message/dead-letter implementation, and Redis use are not selected.
- Flyway versus Liquibase is not selected.
- Multi-tenancy is not stated. Do not introduce cross-client tenancy without a requirement.
- RTO, RPO, SLOs, retention, regions, disaster recovery, data residency, and list-generation timing targets are missing.
