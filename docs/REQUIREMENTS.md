# Requirements

## Status vocabulary and traceability

- **Confirmed**: stated as V1 scope or a locked/confirmed Phase 2 deliverable in the proposal.
- **Pending validation**: intended V1 behavior whose PCC fields, defaults, or feasibility must be confirmed in Phase 1.
- **Unresolved**: ambiguous, conflicting, or missing information that cannot safely be inferred.
- **Deferred**: explicitly outside V1.

Source references below point to sections of `Smart Round System_proposal -V5 (1) 2.docx`.

## Functional requirements

| ID     | Requirement                                                                                                                                                                                                      | Status                                                | Proposal source         |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------- |
| FR-001 | Authenticate users through Keycloak with MFA and support login, token validation, refresh, revocation, idle timeout, and account activation/deactivation.                                                        | Confirmed; policy details unresolved                  | 2.2.1, 5.3.3D, 6.1      |
| FR-002 | Enforce server-side RBAC for Physician, NP, and Admin across every protected API and resource.                                                                                                                   | Confirmed; matrix unresolved                          | 2.1, 2.2.1, 5.3.3D/E    |
| FR-003 | Ingest PCC data in seven stated areas: demographics, ADT, vitals, labs, clinical notes, visit history, and facilities; also obtain payer, diagnoses/conditions, and provider assignment needed by screens/rules. | Pending sandbox validation                            | 2.2.2, 5.1.2B, 5.2.2    |
| FR-004 | Normalize and validate ingested data, including mapping, type coercion, null handling, and duplicate detection, while preserving history needed for rules.                                                       | Confirmed                                             | 2.2.3, 5.1.2B           |
| FR-005 | Run a scheduled daily, idempotent incremental sync with token lifecycle handling, bounded retry/backoff, dead-letter handling, failure notification, and per-run status.                                         | Confirmed; schedule/window unresolved                 | 5.1.2B, 5.3.3A, 6.6     |
| FR-006 | Allow authorized admins to see last sync, processed count and errors, and manually trigger a sync.                                                                                                               | Confirmed                                             | 5.3.3E/K                |
| FR-007 | Generate an individual role-, facility-, and assignment-filtered list for each of approximately 90 providers each morning.                                                                                       | Confirmed                                             | 2.1, 5.3.3B             |
| FR-008 | Classify each patient as long-term or short-term/rehab using two client-validated heuristics and a confirmed default for ambiguous cases.                                                                        | Pending sandbox validation                            | 2.1, 5.2.2, 5.3.3B      |
| FR-009 | Apply compliance timing rules for long-term and short-term/rehab patients, including the physician-specific encounter obligation.                                                                                | Confirmed in principle; exact semantics unresolved    | 1.5, 2.1, 5.3.3B        |
| FR-010 | Detect clinical urgency from abnormal vitals, PCC lab flags, exact clinical-note keywords, and chronic/acute weight change.                                                                                      | Confirmed in principle; fields and thresholds pending | 2.1, 5.2.2, 5.3.3B      |
| FR-011 | Assign High/Medium/Low priority, use clinical urgency and compliance timing in ordering, and retain all fired rule reasons.                                                                                      | Confirmed; scoring/order details unresolved           | 2.2.4, 5.3.3B           |
| FR-012 | Deduplicate a patient within a day and use a physician-priority tie-breaker when Physician and NP selection overlap.                                                                                             | Confirmed; edge semantics unresolved                  | 2.1, 5.3.3B             |
| FR-013 | Carry unseen patients forward to the next day at elevated priority, with no hard cap on list size.                                                                                                               | Confirmed; "unseen" transition unresolved             | 2.1, 5.3.3B             |
| FR-014 | Display a provider dashboard with total patients, high-priority count, and compliance status.                                                                                                                    | Confirmed                                             | 5.3.3E/J                |
| FR-015 | Display a rounding list with patient name, facility, room, payer, status, priority, compliance badge, last visit dates, days since admission, reason, carry-forward state, search, sort, and filters.            | Confirmed                                             | 2.1, 2.2.7, 5.3.3J, 6.2 |
| FR-016 | Display patient demographics, diagnoses, vitals, lab flags, note keyword hits, visit history, active-rule explanations, and compliance breakdown.                                                                | Confirmed                                             | 5.3.3E/J                |
| FR-017 | Let Admin users edit only existing numeric thresholds, with validation, persistence, before/after confirmation, and audit history. V1 cannot create rule types.                                                  | Confirmed                                             | 2.1, 2.3, 5.3.3E/K      |
| FR-018 | Let Admin users list/create/update users, assign/change roles, and activate/deactivate accounts.                                                                                                                 | Confirmed                                             | 5.3.3E/K                |
| FR-019 | Let authorized admins view paginated audit logs, filter by date/user/event type, and export CSV.                                                                                                                 | Confirmed                                             | 5.3.3E/K                |
| FR-020 | Record rule-execution logs identifying which rules fired for each patient and run.                                                                                                                               | Confirmed                                             | 2.2.8, 5.3.3B           |
| FR-021 | Record user activity and every PHI access with user, action, patient ID, data category, timestamp, and IP.                                                                                                       | Confirmed                                             | 2.2.8, 5.3.3D/F         |
| FR-022 | Do not modify PCC records; PCC integration is read-only in V1.                                                                                                                                                   | Confirmed                                             | 2.3                     |

## Business rules requiring exact specification

| ID     | Rule statement                                                                                                                                         | Current interpretation boundary                                                                                                                        |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BR-001 | New skilled-nursing admissions require a physician visit within 3 days.                                                                                | Proposal §1.5; define admission event, calendar/business days, timezone, grace period, and qualifying encounter.                                       |
| BR-002 | A physician must maintain at least a 30-day visit frequency.                                                                                           | Proposal §1.5; distinguish this physician obligation from §2.1's general "long-term 1 visit/month."                                                    |
| BR-003 | Short-term/rehab patients require 3 visits per week.                                                                                                   | Proposal §§2.1 and 5.3.3B; define week boundary, qualifying provider types, partial weeks, admissions/discharges, and whether this supplements BR-001. |
| BR-004 | NP interim visits do not replace a required physician encounter.                                                                                       | Proposal §1.5.                                                                                                                                         |
| BR-005 | Clinical signals include fever, hypotension, hypertension, tachycardia, hypoxia, weight change, PCC H/L/HH/LL lab flags, and a validated keyword list. | Numeric thresholds, units, lookback windows, note types, negation behavior, and final keyword list require approval.                                   |
| BR-006 | Ambiguous LT/ST classification uses a stakeholder-approved default after Phase 1 validation.                                                           | No default is stated in the proposal.                                                                                                                  |
| BR-007 | Same-day overlap is deduplicated with physician priority.                                                                                              | Define whether the patient can still appear on an NP list, how provider assignment affects ownership, and whether acknowledgment transfers.            |
| BR-008 | An unseen patient is promoted the next day and lists have no hard cap.                                                                                 | Define seen/completed/skipped states, cutoff, escalation levels, discharge handling, and stale-data behavior.                                          |
| BR-009 | Compliance timing is a secondary sort after clinical urgency.                                                                                          | Exact scoring and deterministic tie order are not supplied.                                                                                            |

## Primary workflows

### Daily synchronization and list generation

1. A scheduled job authenticates to PCC and requests records changed since the last successful checkpoint.
2. The adapter validates and normalizes source records and records the sync outcome.
3. The engine derives patient classification and provider/facility scope.
4. Clinical and compliance evaluators run against an immutable input snapshot and versioned threshold set.
5. Results are deduplicated, prioritized, annotated with explanations, and merged with eligible carry-forward items.
6. Provider lists and rule-execution audit records are persisted and served to authorized users.
7. Failed syncs or evaluations remain observable and recoverable without duplicating results.

### Provider review

1. The provider signs in and completes MFA.
2. The dashboard shows scoped counts and compliance status.
3. The provider searches, filters, sorts, and opens a rounding-list item.
4. Patient detail shows the supporting information and why rules fired.
5. The proposal does not define the action that marks a patient "seen"; implementation must wait for that workflow decision.

### Administration

1. An Admin manages users/roles, reviews sync health, or initiates an authorized manual sync.
2. For threshold edits, the system validates input and presents old/new values before confirmation.
3. The system versions the configuration and logs the actor, change, time, and result.
4. Admins can query and export permitted audit events without bypassing access policy.

## Non-functional requirements

| ID      | Requirement                                                                                                                                                 | Status                                                                 |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| NFR-001 | Deploy production V1 in the client's existing GCP organization using Cloud Run and Cloud SQL; remain cloud-agnostic where feasible.                         | Confirmed                                                              |
| NFR-002 | A countersigned HIPAA BAA is a hard gate before real PHI access/ingestion; Phase 1 uses synthetic or de-identified data.                                    | Confirmed                                                              |
| NFR-003 | Enforce TLS 1.2+ in transit and encryption at rest using GCP-supported controls/KMS.                                                                        | Confirmed                                                              |
| NFR-004 | Use least-privilege IAM/service accounts, Secret Manager, private connectivity, RBAC, MFA, and auditable access.                                            | Confirmed                                                              |
| NFR-005 | Meet WCAG 2.1 AA and work in current Chrome, Firefox, Safari, and Edge.                                                                                     | Confirmed                                                              |
| NFR-006 | Support a peak test of approximately 90 concurrent provider logins and list refreshes.                                                                      | Confirmed test scenario; response-time/error targets unresolved        |
| NFR-007 | Provide autoscaling, health checks, monitoring, alerts, backups, and recovery procedures.                                                                   | Confirmed; SLO/RTO/RPO/retention unresolved                            |
| NFR-008 | Use CI/CD with automated test gates from GitHub Actions through GCP build/deployment services.                                                              | Confirmed in proposal; exact pipeline responsibility/design unresolved |
| NFR-009 | Remediate all High and Medium findings from the stated production OWASP ZAP scan and validate cross-role isolation.                                         | Confirmed                                                              |
| NFR-010 | Produce OpenAPI reference, architecture/database documentation, Provider Quick-Start Guide, Admin Guide, and IT Deployment Runbook for production delivery. | Confirmed                                                              |

## Acceptance criteria baseline

V1 is not ready for sign-off until:

- all PCC fields and mappings used by rules are validated against sandbox and documented;
- every approved rule has traceable positive, negative, boundary, null, and edge-case tests;
- generated provider lists match stakeholder-reviewed sandbox scenarios;
- authentication, MFA, session, RBAC, PHI-access logging, and threshold audit behavior pass positive and negative tests;
- primary Physician, NP, and Admin workflows pass Playwright and supported-browser checks;
- the approximately 90-user performance scenario passes stakeholder-approved targets;
- OWASP ZAP High/Medium findings are remediated and RBAC penetration tests pass;
- backups/recovery, production monitoring, sync failure recovery, and smoke tests are evidenced;
- the BAA gate is satisfied before production PHI ingestion;
- client UAT defects are resolved, retested, and signed off;
- required user and technical documentation is delivered.

## Deferred requirements

AI risk scoring, predictive prioritization, NLP, a custom rule editor, advanced analytics, higher-frequency/near-real-time sync, native mobile, messaging, billing/claims/scheduling integrations, legacy migration, multilingual support, and PCC write-back are deferred from V1.

## Decisions required before implementation

1. Obtain the referenced Master Specification and PCC API documentation; the proposal alternately calls the master specification v1.7 and v1.3.
2. Approve the complete clinical/compliance rule catalog: thresholds, units, lookbacks, 11-keyword list, note types, rule precedence, scoring, and tie order.
3. Define LT/ST heuristics, ambiguous-case default, and missing/stale-data behavior.
4. Reconcile the new-admission 3-day physician rule, long-term "1/month" wording, 30-day physician frequency, and short-term 3-visits/week rule.
5. Define the action/state model for seen, completed, skipped, carry-forward, discharge, and same-day Physician/NP overlap.
6. Confirm PCC endpoints, OAuth requirements, scopes, identifiers, pagination, rate limits, incremental-change mechanism, and permitted data fields.
7. Approve the role/resource/facility permission matrix, including whether clinical supervisors and IT need distinct roles.
8. Decide Keycloak deployment/ownership, OAuth/OIDC versus SAML flows, MFA channel(s), recovery/enrollment, idle/absolute timeout, token storage, and "Remember me" policy.
9. Define audit/security/data retention, deletion, export, legal hold, log integrity, breach response, consent/minimum-necessary rules, and any formal HIPAA risk-analysis evidence.
10. Define daily schedule, facility timezone/day boundaries, list freshness indicators, manual-sync concurrency, failure behavior, and notification recipients/channels.
11. Set availability, API/UI latency, sync-duration, recovery, backup, capacity, and data-quality acceptance targets.
12. Reconcile Phase 2's stated four 2-week sprints with its stated 15-week timeline and clarify the incorrect Phase 0 effort totals/caps.
