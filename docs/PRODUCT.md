# Smart Rounding & Compliance Platform

## Product purpose

The platform helps a post-acute/long-term-care medical practice decide which patients each provider should round on. Today, staff manually review charts for clinical changes, admission timing, payer context, and regulatory visit windows. The intended product automates that review with explainable rules, reduces missed visits and manual effort, and gives clinicians a prioritized daily worklist without replacing clinical judgment.

## Users and goals

### Physicians

- Receive a provider- and facility-scoped rounding list.
- Identify high-priority and compliance-due patients.
- Understand why each patient was selected.
- Review a patient's supporting clinical and visit information.

### Nurse practitioners

- Receive their own role-filtered list across assigned facilities.
- Act on clinical urgency and interim-visit needs.
- See when a physician encounter remains required.

### Administrators / facility staff

- Manage users and roles.
- Adjust permitted numeric thresholds, with audit history.
- Monitor PCC synchronization and manually trigger a sync.
- Review and export filtered audit records.

Healthcare administrators, clinical supervisors, and IT teams are operational stakeholders. The proposal does not define a separate application permission set for clinical supervisors or IT users.

## V1 scope

V1 is a secure, responsive web application that:

- authenticates users with MFA and role-based access;
- ingests and normalizes PCC demographics, ADT, vitals, labs, clinical notes, visit history, facility, payer, diagnosis/condition, and provider-assignment data, subject to sandbox confirmation;
- classifies patients as long-term or short-term/rehab using two to-be-validated heuristics;
- evaluates practice-defined clinical and compliance rules;
- generates per-provider lists for approximately 90 providers;
- assigns High/Medium/Low priority and retains human-readable reasons;
- applies same-day deduplication, physician-priority tie-breaking, multi-facility scope, and carry-forward of unseen patients;
- shows dashboard, rounding-list, patient-detail, and basic administration screens;
- records user activity, rule execution, synchronization, configuration changes, and PHI access;
- runs in the client's GCP organization with HIPAA-oriented technical safeguards and a BAA in place before PHI ingestion.

## Explicitly outside V1

- Writing changes back to PointClickCare.
- Native mobile applications.
- Phone or messaging-system integration.
- Billing, claims, or scheduling integration.
- Legacy-data migration and multilingual support.
- Custom rule creation or new rule types through the UI.
- Advanced BI/analytics dashboards.
- AI risk scoring, predictive prioritization, and NLP-based note interpretation.
- Higher-frequency or near-real-time synchronization.

Simple exact keyword matching is stated as a V1 rule; NLP is not.

## Delivery shape

- Phase 0: contribute technical material to the PCC Workflow Review; ends when sandbox access is granted.
- Phase 1: validate PCC endpoints and fields, confirm classification mappings and defaults, prototype all V1 rules on sandbox data, design wireframes, confirm GCP fit, refine the specification, and lock the Phase 2 estimate.
- Phase 2: build, test, deploy, harden, document, train, and obtain sign-off for production V1.
- Phase 3+: potential AI/NLP, predictive prioritization, higher-frequency sync, advanced analytics, and richer rule configuration.

## Success outcomes stated by the proposal

- Less manual chart-review effort and greater provider efficiency.
- Systematic detection of clinically significant changes and compliance deadlines.
- Explainable and auditable patient selection.
- Secure operation at the planned scale of roughly 90 providers.
- A scalable foundation for later AI capabilities without including AI in V1.

The proposal does not provide measurable adoption, accuracy, time-saved, false-positive, availability, or list-latency targets. These must be defined before product acceptance criteria are finalized.

## Source and authority

This product summary is derived from `Smart Round System_proposal -V5 (1) 2.docx`. That proposal says its scope was derived from `Smart_Rounding_Compliance_Platform_V1_MasterSpec_v1.7.docx` and PCC API documentation, neither of which is present in the repository. Where the proposal conflicts internally, `docs/REQUIREMENTS.md` records the conflict rather than creating a new requirement.
