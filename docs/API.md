# API and Integration Requirements

## Scope

The system needs two API boundaries:

1. A read-only PointClickCare integration used by scheduled/manual synchronization.
2. An authenticated application API used by the React client and operational jobs.

Exact URI paths, payload schemas, PCC scopes, and status codes are not defined by the proposal. The production API must be documented with OpenAPI after Phase 1 validates the external data model.

During pre-sandbox UI development, the implementation may expose schema-validated synthetic responses only when `DATA_MODE=synthetic`. The mode is disabled by default, contains no real patient information, is visibly labeled, and must never be interpreted as an approved PCC or clinical contract.

## PointClickCare integration

### Required data areas

- Patient demographics.
- ADT/admission/discharge/transfer events.
- Vitals, including weight observations.
- Labs and PCC abnormal flags (H/L/HH/LL).
- Clinical notes needed for exact keyword detection.
- Visit/encounter history, including provider type and date.
- Facilities.
- Payer, diagnosis/condition, and provider-patient assignment fields needed by V1, even though the proposal's "seven endpoints" wording does not explain where these fields reside.

### Required behavior

- Obtain and refresh PCC OAuth credentials, with secrets stored in GCP Secret Manager.
- Use configured timeouts, pagination, bounded exponential backoff, and rate-limit-aware behavior.
- Perform a daily incremental pull based on PCC's validated change mechanism.
- Make retries and reruns idempotent and advance checkpoints only after successful persistence.
- Record run start/end, endpoint/category, checkpoint/window, records processed, validation rejects, errors, and outcome.
- Route non-transient failures to a recoverable dead-letter/error workflow and notify approved operators.
- Never write to PCC in V1.

Sandbox validation must confirm endpoints, field names/types, identifiers, null rates, deletion/correction semantics, timestamps/timezones, note types, paging, scopes, rate limits, and incremental-sync support.

## Application API capability groups

Names below are capability contracts, not final URLs.

| Capability               | Minimum behavior                                                                                                                                                                 | Access boundary                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Provider dashboard       | Return scoped totals, high-priority count, compliance summary, data freshness, and generated-at time.                                                                            | Physician/NP see only authorized assignments/facilities; Admin access is unresolved. |
| Rounding list            | Return a paginated/filterable provider list with patient display fields, priority, urgency/compliance state, reasons, last visits, days since admission, and carry-forward flag. | Provider/resource scope enforced server-side.                                        |
| Patient detail           | Return authorized clinical summary, visit history, keyword/lab/vital findings, active rule triggers, and compliance explanation.                                                 | Minimum-necessary patient scope; log PHI access.                                     |
| Threshold administration | List editable numeric thresholds; validate and persist an approved change with confirmation metadata and version/audit record.                                                   | Admin only; no rule creation in V1.                                                  |
| User administration      | Create/read/update users, assign/change roles, and activate/deactivate accounts.                                                                                                 | Admin only; Keycloak ownership boundary unresolved.                                  |
| Sync status/control      | Show recent run status and permit an authorized manual trigger with concurrency/idempotency protection.                                                                          | Admin only.                                                                          |
| Audit query/export       | Return paginated, date/user/event-filtered records and an authorized CSV export.                                                                                                 | Admin only; field-level restrictions/retention unresolved.                           |

## Cross-cutting contract

- Use HTTPS with TLS 1.2+.
- Validate bearer tokens and enforce role, provider, facility, and patient/resource scope on every request.
- Validate all bodies, path/query inputs, filters, sort keys, and export parameters.
- Use stable machine-readable error codes, safe human messages, an HTTP status appropriate to the failure, and a correlation ID.
- Do not expose stack traces, secrets, raw upstream payloads, or unnecessary PHI.
- Paginate lists and audit records; define maximum page/export sizes after performance and policy decisions.
- Return timestamps in ISO 8601 with timezone; surface data freshness and source/evaluation times where clinical interpretation depends on them.
- Use optimistic concurrency or version checks for threshold edits and other conflicting admin mutations.
- Audit protected actions and PHI reads without logging response bodies.
- Publish OpenAPI and test authorization, validation, error, pagination, idempotency, and upstream-failure behavior.

## Unresolved integration decisions

- PCC API documentation and the referenced master specification are missing.
- Final PCC endpoints, OAuth grant/token lifecycle, scopes, facility/client identifiers, webhook availability, and rate limits are unknown.
- Whether diagnoses, payer, assignments, and all clinical signals are available through the stated seven endpoints is unverified.
- Sync cadence/window, manual-trigger behavior during an active run, partial-success policy, and notification channel/recipients are undefined.
- App API base path/versioning, page limits, export limits, retention, and detailed error taxonomy are unspecified.
- Keycloak Admin API versus application-owned user records/responsibilities needs a clear boundary.

## Machine-readable contract (OpenAPI)

While `DATA_MODE=synthetic`, the running API serves an OpenAPI 3.1 document at `GET /api/v1/openapi.json` (public, no PHI). Component schemas are generated from the shared Zod contracts in `packages/contracts`, and `apps/api/src/docs/openapi.test.ts` fails the build if any controller route is missing from the document (or documented but not implemented). Paths remain provisional until Phase 1 sandbox validation.

### Rounding list query

`GET /api/v1/provider/rounding-list` accepts `q`, `priority`, `compliance`, `classification`, `facility`, `physicianOnly`, `sort` (`URGENCY|PRIORITY|NAME|ADMISSION|LAST_VISIT`), `page` and `pageSize` (1-100). Parsing is lenient and shared with the web app (`parseRoundingListQuery`): unknown values fall back to defaults, pages beyond the end clamp to the last page, and the response carries `filtered` (matches before paging) alongside the page metadata.
