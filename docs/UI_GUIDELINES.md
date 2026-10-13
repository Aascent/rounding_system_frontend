# UI Guidelines

## Experience principles

- Optimize for fast clinical scanning, clear urgency, and explainable decisions.
- Never imply that an automated flag is a diagnosis or a substitute for clinical judgment.
- Show data freshness and relevant observation/visit times so users can judge stale information.
- Use consistent labels and ordering across dashboard, list, detail, and export surfaces.
- Meet WCAG 2.1 AA and do not communicate priority or compliance using color alone.

## Navigation and layout

V1 has these primary destinations:

- Login and MFA entry.
- Provider dashboard.
- Rounding list.
- Patient detail.
- Admin: thresholds, users, audit log, and sync status.

The responsive web experience should support clinical desktop and tablet-width workflows. A native mobile application is out of scope. Preserve list context—filters, sort, search, and position—when returning from patient detail.

## Login and session experience

- Provide labeled email/identifier, password, MFA code, validation, recovery/help, and safe error states once the identity flow is approved.
- Do not reveal whether an account exists through error wording.
- "Remember me" appears in the sample UI but must not be implemented until session, device trust, and HIPAA security policy are approved.
- Warn users before idle timeout when policy allows, and handle expired/revoked sessions without losing more non-sensitive UI state than necessary.

## Provider dashboard

- Show total scoped patients, high-priority count, and compliance summary.
- Show list generation time, last successful sync, and a prominent stale/failed-sync warning.
- Make every summary value navigable to the equivalent filtered list where appropriate.
- Avoid decorative analytics that suggest the deferred advanced BI scope.

## Rounding list

Required fields are patient name, facility, room, payer, patient/status context, High/Medium/Low priority, compliance badge, last visit dates, days since admission, concise selection reason, and carry-forward state.

- Default ordering must reflect the approved clinical-urgency then compliance algorithm; user sorting is a view preference only.
- Provide search by patient name/room and filters for priority, compliance urgency, facility, and last visit, as stated in the proposal.
- Keep column headings visible and semantic; provide a compact alternative at narrow widths rather than horizontal truncation.
- Pair color with text/icon/shape labels for priority and compliance.
- Distinguish missing, unavailable, stale, and normal values; never render missing clinical data as zero or "normal."
- Do not visually cap or silently omit carry-forward overflow. Use pagination/virtualization without hiding total scope.

## Patient detail and explanations

- Group demographics/context, diagnoses, vitals, labs, keyword hits, visit history, and compliance explanation with clear headings.
- Each reason should state the rule, relevant observed value/status, timestamp/lookback, and resulting priority/compliance effect in plain language.
- Clearly label exact keyword matches as rule matches, not NLP interpretations.
- Show source freshness and unavailable-data warnings near the affected section.
- Avoid exposing full note content unless approved as minimum necessary; show only the evidence the authorized workflow requires.
- The proposal does not define clinical actions such as seen/completed/skipped. Do not invent controls until that workflow is approved.

## Admin experiences

### Threshold editor

- List only editable numeric thresholds with label, description, current value, unit, allowed range, and last-change metadata.
- Validate before save and show a before/after confirmation dialog.
- Never expose new rule-type creation or arbitrary executable expressions in V1.

### User management

- Show users, role, status, and appropriate provider association.
- Require explicit confirmation for role changes and deactivation; reflect identity-provider errors safely.

### Audit log

- Use a paginated viewer with date, user, and event-type filters plus authorized CSV export.
- Avoid displaying unnecessary PHI in list rows and exports. Retention and export limits require policy decisions.

### Sync status

- Show last run, source window/freshness, records processed, validation rejects, errors, and outcome.
- A manual trigger must show in-progress/duplicate-trigger behavior and must not imply success until processing completes.

## Accessibility and content

- Full keyboard operation, logical focus order, visible focus, skip/navigation landmarks, semantic headings/tables, and programmatic labels are mandatory.
- Announce dynamic filter counts, save outcomes, sync state, and validation errors appropriately without stealing focus.
- Meet contrast requirements and support zoom/reflow. Use readable touch targets and do not rely on hover.
- Use direct language: "Selected because…", "Physician visit due…", "Data last synced…" Avoid unexplained acronyms and alarmist phrasing.
- Dates/times must include enough timezone context for compliance interpretation.

## Required design validation

- Phase 1 must produce stakeholder-reviewed wireframes for all V1 screens before production UI implementation.
- Test primary flows for Physician, NP, and Admin with Playwright.
- Test Chrome, Firefox, Safari, and Edge and include keyboard and screen-reader-oriented accessibility checks.
- Validate approximately 90 concurrent login/list-refresh behavior against approved latency/error targets.
