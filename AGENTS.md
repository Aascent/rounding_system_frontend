# Codex Project Instructions

## Mission and scope

Build and maintain the Smart Rounding & Compliance Platform described in `docs/`. Treat those files and `development/DEVELOPMENT_TRACKER.md` as the project source of truth. The proposal is the upstream business source, but unresolved or conflicting proposal statements must remain unresolved until a qualified stakeholder decides them.

Do not represent the product as providing medical advice. It generates explainable, auditable rounding candidates from practice-defined clinical and compliance rules; clinicians retain responsibility for care decisions.

## Start every development session

1. Read `development/DEVELOPMENT_TRACKER.md`.
2. Read the documentation relevant to the next task.
3. Inspect the repository and recent implementation before changing anything.
4. Confirm that the task is not blocked by an item under "Decisions required before implementation."
5. Determine the smallest logical unit of work that advances the tracker.

## Autonomous delivery loop

For each task:

1. Trace the work to documented requirements.
2. Plan the implementation internally and preserve established architecture and conventions.
3. Implement the change, including tests and operational behavior where applicable.
4. Run the relevant formatter, lint, type checks, unit tests, integration tests, build, security checks, and end-to-end tests supported by the repository.
5. Fix failures caused or exposed by the change. Do not claim validation that was not run.
6. Review security, privacy, accessibility, performance, error handling, observability, and backward compatibility in proportion to the change.
7. Update `development/DEVELOPMENT_TRACKER.md` after meaningful work, decisions, validation, or blockers.
8. Continue to the next logical tracker item when requirements are sufficiently clear.

Do not ask for confirmation for routine engineering choices such as naming, component boundaries, file organization, local refactoring, test structure, minor error-handling details, or choices already constrained by `SKILLS.md` and `docs/ARCHITECTURE.md`.

## Safety and healthcare data

- Treat all patient and clinical data as PHI, including logs, exports, caches, test fixtures, screenshots, and support artifacts.
- Use only synthetic or de-identified data until the required BAA is countersigned and production PHI access is explicitly enabled.
- Never commit secrets, PCC credentials, tokens, real PHI, production exports, or private keys.
- Enforce authentication and authorization server-side on every protected operation; UI hiding is not access control.
- Log access and administrative actions without copying clinical payloads or secrets into application logs.
- Preserve explainability: every selected patient must retain the rules, inputs, configuration version, and run context that produced the result.
- Numeric threshold changes must be validated, audited, and versioned. V1 must not allow users to create new rule types.
- Do not perform destructive, production-impacting, or irreversible operations without explicit approval and a recovery plan.

## Requirements and change control

- Use requirement IDs from `docs/REQUIREMENTS.md` in tests, pull-request descriptions, and tracker notes where useful.
- Do not invent clinical thresholds, PCC field mappings, role permissions, retention periods, session policy, or compliance interpretations.
- Record newly discovered uncertainty in the tracker and the appropriate requirements document.
- A material scope, cost, or schedule change requires the project's formal written change-request process; code should not quietly broaden V1.
- Keep architecture, API, data model, UI guidelines, and tracker mutually consistent when a decision changes.

## Stop only when genuinely blocked

Stop and report when requirements conflict, a critical business or clinical decision is missing, required credentials/access are unavailable, a destructive or production action needs approval, a major architecture decision cannot be supported by current requirements, or an external dependency prevents progress.

When blocked, record in the tracker:

- the intended task;
- attempts made and evidence observed;
- why a safe, reasonable implementation cannot proceed;
- the exact decision, access, or information required;
- work that can continue independently, if any.

Resume from that recorded state after the blocker is cleared. Difficulty alone is not a reason to stop.
