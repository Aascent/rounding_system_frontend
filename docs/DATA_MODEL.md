# Conceptual Data Model

## Status

This is a conceptual V1 model inferred directly from the proposal's features and audit requirements. It is not a final physical schema. PCC field availability, identifiers, cardinalities, and null behavior must be validated in Phase 1 before the production migrations are designed.

A provisional physical schema for the synthetic-data build lives in `apps/api/src/database/migrations.ts` (facilities, users, sessions, facility_coverage, patients with the normalised source record as JSONB, thresholds + threshold_history, keywords, rules, audit_events, sync_runs, rule_executions, visit_notes). It is shaped around today's synthetic source record and will be revised once PCC mappings are confirmed; it is not a PHI-approved schema.

## Core entities

| Entity                     | Purpose and essential information                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| User                       | Application identity link, status, provider link when applicable, and timestamps; credentials remain in Keycloak rather than the application database. |
| Role / UserRole            | Physician, Nurse Practitioner, or Admin assignment. A detailed permission model is pending.                                                            |
| Provider                   | PCC/provider identity, provider type, display information, and active status.                                                                          |
| Facility                   | PCC identity, name, operational status, and timezone once confirmed.                                                                                   |
| ProviderFacilityAssignment | Time-bounded relationship authorizing a provider at one or more facilities.                                                                            |
| Patient                    | PCC identity, demographics, room/current status, and source/provenance timestamps. Store only approved minimum-necessary fields.                       |
| PatientFacilityStay        | Admission/transfer/discharge history, facility/room, ADT identifiers, and effective times.                                                             |
| ProviderPatientAssignment  | Time-bounded Physician/NP assignment evidence from PCC.                                                                                                |
| PayerCoverage              | Patient payer context with effective dates when PCC supports it.                                                                                       |
| DiagnosisCondition         | Normalized diagnosis/condition and source/effective metadata.                                                                                          |
| EncounterVisit             | Visit date/time, provider/type, facility, source identity, and status needed for compliance calculations.                                              |
| VitalObservation           | Observation type, value, unit, observed time, source identity, and validation state.                                                                   |
| LabObservation             | Test identity/name, value/unit if approved, PCC abnormal flag, observed/result time, and source identity.                                              |
| ClinicalNote               | Minimum source metadata and approved searchable content/reference. PHI minimization and retention require a decision.                                  |
| KeywordHit                 | Exact configured keyword, note reference, match metadata, and evaluation time.                                                                         |
| PatientClassification      | Derived LT or ST/Rehab classification, heuristic/version, evidence, confidence/status, effective time, and ambiguity/default marker.                   |
| RuleDefinition             | Versioned built-in V1 rule identity/type and explanation template. Users cannot create new types in V1.                                                |
| ThresholdConfiguration     | Versioned numeric value, unit, validity range, effective time, actor, and status.                                                                      |
| SyncRun                    | Trigger/schedule, source window/checkpoint, start/end, counts, status, and safe error metadata.                                                        |
| RuleEvaluationRun          | Input snapshot/cutoff, rule/config versions, start/end, and outcome.                                                                                   |
| RuleResult                 | Patient, run, rule, outcome/severity, structured reason/evidence references, and compliance/urgency contribution.                                      |
| RoundingList               | Provider, facility/date scope, generation time, source freshness, status, and evaluation run.                                                          |
| RoundingListItem           | Patient, priority, canonical order, compliance state, carry-forward state, explanation snapshot, and deduplication lineage.                            |
| AuditEvent                 | Actor, action/event, patient when applicable, PHI data category, timestamp, source IP, outcome, correlation ID, and safe change metadata.              |

## Key relationships

```text
User --< UserRole >-- Role
User --0..1 Provider
Provider --< ProviderFacilityAssignment >-- Facility
Provider --< ProviderPatientAssignment >-- Patient
Patient --< PatientFacilityStay >-- Facility
Patient --< EncounterVisit >-- Provider
Patient --< VitalObservation
Patient --< LabObservation
Patient --< ClinicalNote --< KeywordHit
Patient --< PatientClassification

SyncRun --< normalized source records (provenance)
RuleEvaluationRun --< RuleResult >-- RuleDefinition
RuleEvaluationRun --> ThresholdConfiguration version
Provider --< RoundingList --< RoundingListItem >-- Patient
RuleResult --< RoundingListItem explanation/evidence links
User --< AuditEvent >-- Patient (optional)
```

## Required invariants

- PCC/source identifiers are unique within the correct source/facility/client scope once that scope is validated.
- Reprocessing the same source item or sync window does not create duplicate observations, encounters, or list items.
- A list item is unique for the approved provider/patient/facility/clinical-day key; the exact same-day scope is unresolved.
- Every list item refers to an evaluation run and preserves an explanation snapshot even after thresholds change.
- Threshold history is append-only/versioned; edits record before/after values and actor.
- Audit records must not contain secret material or unnecessary clinical values.
- Source-observed, source-updated, ingested, evaluated, and displayed timestamps remain distinct.
- Soft deletion/end dating should preserve clinical and audit history where policy requires it; retention rules are unresolved.

## Data lifecycle and protection

- Phase 1 uses synthetic or de-identified records until a BAA is countersigned.
- Production data is encrypted in transit and at rest and accessed using least-privilege service identities.
- Backups, exports, replicas, caches, logs, and test artifacts receive the same PHI classification as their source.
- Redis, if used, is not the sole record of truth and must have explicit PHI, TTL, encryption, and eviction decisions.
- Data retention, deletion, archival, legal-hold, de-identification, residency, backup RTO/RPO, and audit immutability requirements must be approved before production schema completion.

## Phase 1 validation checklist

- Confirm PCC identifiers and whether patients/providers are globally or facility scoped.
- Map all required source fields, types, code systems, units, null rates, and correction/deletion behavior.
- Confirm provider-patient and provider-facility assignment history/cardinality.
- Confirm encounter types and which visits satisfy Physician and NP rules.
- Confirm ADT event semantics and facility timezone/day boundaries.
- Confirm vital/lab units, abnormal flags, note types/content access, payer and diagnosis availability, and weight history.
- Approve LT/ST heuristic evidence and ambiguous classification behavior.
- Establish minimum-necessary storage, raw payload policy, retention, indexing, partitioning, and volume estimates.
