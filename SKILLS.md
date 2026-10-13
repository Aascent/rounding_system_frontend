# Engineering Guidelines

## Confirmed platform

- Frontend: React with Next.js routing. The proposal also calls the client a React SPA; the exact Next.js rendering/deployment mode remains to be selected.
- Backend: Node.js and NestJS.
- Primary database: PostgreSQL on Google Cloud SQL.
- Runtime: containerized services on Google Cloud Run.
- Cache/coordination: Google Cloud Memorystore for Redis where a demonstrated need exists.
- Identity: Keycloak with OAuth 2.0; SAML 2.0 support is stated but its identity-provider role and required flows are unresolved.
- Cloud services: GCP IAM, VPC, Secret Manager, Cloud KMS, Cloud Build, Cloud Monitoring, and Cloud Logging in the client's existing GCP organization.
- Testing: unit and integration suites, Playwright end-to-end tests, cross-browser checks, performance testing, OWASP scanning, RBAC penetration testing, and client UAT.

Do not replace or expand this stack without an approved architectural decision. Do not add AI/ML, NLP, native mobile, billing, scheduling, messaging, or analytics-dashboard dependencies to V1.

## TypeScript and module design

- Use strict TypeScript for frontend and backend. Avoid `any`; validate data at trust boundaries.
- Organize backend modules around bounded capabilities: identity/access, PCC integration, normalization, patient data, rules/compliance, rounding lists, administration, and audit/operations.
- Keep PCC-specific schemas and transport behavior inside an adapter. The rules engine consumes normalized, versioned domain inputs rather than raw PCC responses.
- Keep rule evaluators deterministic and side-effect free where possible. Separate evaluation, prioritization, persistence, and delivery.
- Prefer small, explicit interfaces and dependency injection. Avoid shared mutable state and hidden network/database work.
- Capture timestamps in UTC and carry source timezone/context where clinical-day calculations require it. Do not define day-boundary behavior until the business decision is recorded.

## Frontend

- Build accessible components following `docs/UI_GUIDELINES.md`; meet WCAG 2.1 AA for V1.
- Treat server responses as authoritative for permissions, priority, compliance state, and explanations.
- Keep authentication tokens out of local storage unless a reviewed security design explicitly permits it.
- Model loading, empty, stale, partial, and error states for every PCC-dependent screen.
- Use reusable display components for priority, compliance, carry-forward status, reason codes, and timestamps so semantics remain consistent.
- Keep search, sort, and filter state predictable and testable. Do not let presentation sorting alter the stored canonical list order.

## Backend and API

- Follow `docs/API.md`. Publish and maintain an OpenAPI contract for implemented endpoints.
- Authenticate and authorize every protected request in NestJS guards/policies. Verify resource scope, not only role membership.
- Validate request payloads, query parameters, imported PCC data, and environment configuration. Return stable error codes with safe messages and correlation IDs.
- Make sync and list-generation jobs idempotent. Use bounded exponential backoff and a dead-letter/recovery path for non-transient failures.
- Paginate potentially large results, including audit logs. CSV exports must apply the same authorization and filtering as the on-screen data.
- Avoid logging request/response bodies that may contain PHI or credentials.

## Data and migrations

- Follow `docs/DATA_MODEL.md`; finalize physical schemas only after Phase 1 PCC field validation.
- Use version-controlled, forward migrations with a tested rollback or corrective migration strategy. The proposal permits Flyway or Liquibase but does not select one.
- Preserve source identifiers, provenance, observed/effective timestamps, sync-run lineage, and raw-to-normalized validation outcomes as required for auditability.
- Use database constraints and transactions to enforce identity, uniqueness, referential integrity, and same-day deduplication invariants.
- Encrypt data in transit and at rest. Store credentials only in Secret Manager; use least-privilege service accounts and KMS-backed controls.
- Do not use real PHI in local development, CI, demos, snapshots, or automated tests.

## Authentication, authorization, and audit

- Support Physician, Nurse Practitioner, and Admin roles. The precise permission matrix must be approved before implementation.
- Implement MFA, JWT validation/refresh/revocation, idle-session timeout, and account activation/deactivation once policy values and flows are confirmed.
- Log security-relevant user actions with actor, action/event type, timestamp, source IP, outcome, and correlation context.
- Log PHI access with actor, patient identifier, data category, action, timestamp, and IP; do not duplicate clinical values in the audit record.
- Threshold changes require old/new values, actor, time, validation outcome, and configuration version.
- Make audit data tamper-resistant and access-controlled; retention and export policies remain unresolved.

## Testing and validation

- Unit-test every rule evaluator with positive, negative, boundary, missing-data, and malformed-data cases.
- Add contract/integration tests for all seven stated PCC data areas and token lifecycle behavior, first against sandbox data.
- Trace the comprehensive test plan to requirement IDs and cover Physician, NP, and Admin primary workflows in Playwright.
- Verify same-day deduplication, physician-priority tie-breaking, carry-forward behavior, multi-facility scope, and deterministic reruns.
- Test authorization negatively across every role/resource combination. Run OWASP scans and remediate all High and Medium findings before production sign-off.
- Cross-browser test Chrome, Firefox, Safari, and Edge. Test approximately 90 concurrent provider logins/list refreshes; final performance thresholds require stakeholder approval.
- Tests must use synthetic/de-identified fixtures and must not emit PHI into snapshots, reports, videos, or traces.

## Accessibility, performance, and reliability

- Meet WCAG 2.1 AA: keyboard access, visible focus, semantic headings/tables, labels, screen-reader names, sufficient contrast, and non-color status cues.
- Keep provider lists responsive under the agreed peak load; instrument latency, job duration, records processed, failures, and list-generation outcomes.
- Use health checks, autoscaling, backups, recovery procedures, alerting, and runbooks. Exact RTO, RPO, retention, SLOs, and sync window are open decisions.

## Dependencies and change quality

- Add a dependency only when maintained, license-compatible, security-reviewed, and materially simpler than an in-house implementation.
- Pin versions using the repository's lockfile; review advisories and remove unused packages.
- Keep commits focused and avoid unrelated formatting or generated-file churn.
- Never commit secrets or PHI. Document configuration keys without secret values.
- Update documentation and `development/DEVELOPMENT_TRACKER.md` whenever behavior, architecture, requirements status, or validation changes.
