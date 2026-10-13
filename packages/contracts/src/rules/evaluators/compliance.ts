import type {
  Classification,
  ComplianceStatus,
  RuleSignal,
} from "../../schemas.js";
import { daysBetween } from "../time.js";
import type { EvaluationContext } from "../types.js";

export type ComplianceResult = Readonly<{
  status: ComplianceStatus;
  detail: string;
  signal: RuleSignal | null;
}>;

/** Values every compliance rule needs, derived once by the orchestrator. */
type ComplianceFacts = Readonly<{
  classification: Classification;
  daysSinceAdmission: number;
  daysSincePhysicianVisit: number | null;
}>;

/**
 * Compliance timing (proposal §1.5, §2.1):
 *  1. No physician encounter yet ⇒ the initial-visit rule (3-day window) gates
 *     every patient, and keeps escalating until the first visit happens.
 *  2. Otherwise the interval band for the classification applies —
 *     short-term: 3×/week cadence (any provider); long-term: 30-day physician.
 */
export function evaluateCompliance(
  ctx: EvaluationContext,
  facts: ComplianceFacts,
): ComplianceResult {
  if (facts.daysSincePhysicianVisit === null)
    return initialEncounter(ctx, facts);
  return facts.classification === "SHORT_TERM"
    ? shortTermCadence(ctx, facts.daysSincePhysicianVisit)
    : longTermInterval(ctx, facts.daysSincePhysicianVisit);
}

/** Note appended when an NP visit exists but cannot satisfy a physician rule. */
function npSubstitutionNote(
  ctx: EvaluationContext,
  daysSincePhysicianVisit: number | null,
): string {
  const npDays = daysBetween(ctx.input.lastNpVisit, ctx.now);
  return npDays !== null &&
    (daysSincePhysicianVisit === null || npDays < daysSincePhysicianVisit)
    ? ` NP interim visit ${npDays}d ago does not satisfy the physician requirement.`
    : "";
}

function initialEncounter(
  ctx: EvaluationContext,
  { daysSinceAdmission }: ComplianceFacts,
): ComplianceResult {
  const w = ctx.cfg.compliance.newAdmissionPhysicianWindowDays;
  const npNote = npSubstitutionNote(ctx, null);

  if (daysSinceAdmission <= w)
    return {
      status: "DUE_SOON",
      detail: `New admission day ${daysSinceAdmission} of the ${w}-day physician window.${npNote}`,
      signal: {
        code: "NEW_ADMISSION_DUE",
        category: "NEW_ADMISSION",
        severity: "WARNING",
        label: "Initial physician visit due",
        evidence: `Admitted ${daysSinceAdmission}d ago; physician must see within ${w}d. No physician visit on record.${npNote}`,
      },
    };

  const daysLate = daysSinceAdmission - w;
  return {
    status: "OVERDUE",
    detail: `No physician encounter on record; admitted ${daysSinceAdmission}d ago, ${daysLate}d past the ${w}-day window.${npNote}`,
    signal: {
      code: "NEW_ADMISSION_OVERDUE",
      category: "NEW_ADMISSION",
      severity: "CRITICAL",
      label: "Initial physician visit overdue",
      evidence: `No physician visit on record; ${daysLate}d past the ${w}-day new-admission window.${npNote}`,
    },
  };
}

function shortTermCadence(
  ctx: EvaluationContext,
  daysSincePhysicianVisit: number,
): ComplianceResult {
  const { input, now, cfg } = ctx;
  const c = cfg.compliance;
  // Any qualifying provider visit (physician or NP) resets the cadence.
  const lastAny = [input.lastPhysicianVisit, input.lastNpVisit]
    .filter((v): v is string => v !== null)
    .sort()
    .at(-1);
  const days = daysBetween(lastAny ?? null, now) ?? daysSincePhysicianVisit;
  const interval = c.shortTermIntervalDays;

  if (days > interval)
    return {
      status: "OVERDUE",
      detail: `Last provider visit ${days}d ago; short-term cadence expects a visit every ${interval}d (3×/week).`,
      signal: {
        code: "SHORT_TERM_CADENCE_MISSED",
        category: "COMPLIANCE",
        severity: days > interval * 2 ? "CRITICAL" : "WARNING",
        label: "Short-term visit cadence missed",
        evidence: `${days}d since last visit vs a ${interval}d (3×/week) cadence.`,
      },
    };
  if (days > interval - c.shortTermDueSoonWindowDays)
    return {
      status: "DUE_SOON",
      detail: `Last provider visit ${days}d ago; short-term cadence visit due within ${interval - days}d.`,
      signal: {
        code: "SHORT_TERM_CADENCE_DUE",
        category: "COMPLIANCE",
        severity: "INFO",
        label: "Short-term cadence visit due soon",
        evidence: `${days}d since last visit; cadence is ${interval}d.`,
      },
    };
  return {
    status: "ON_TRACK",
    detail: `Last provider visit ${days}d ago; within the ${interval}d short-term cadence.`,
    signal: null,
  };
}

function longTermInterval(
  ctx: EvaluationContext,
  days: number,
): ComplianceResult {
  const c = ctx.cfg.compliance;
  const interval = c.longTermIntervalDays;
  const npNote = npSubstitutionNote(ctx, days);

  if (days > interval)
    return {
      status: "OVERDUE",
      detail: `Last physician visit ${days}d ago; the ${interval}-day long-term interval is exceeded.${npNote}`,
      signal: {
        code: "LONG_TERM_INTERVAL_EXCEEDED",
        category: "COMPLIANCE",
        severity: days > interval * 1.5 ? "CRITICAL" : "WARNING",
        label: "30-day physician interval exceeded",
        evidence: `${days}d since last physician visit vs a ${interval}d interval.${npNote}`,
      },
    };
  if (days > interval - c.longTermDueSoonWindowDays)
    return {
      status: "DUE_SOON",
      detail: `Last physician visit ${days}d ago; ${interval}-day interval due within ${interval - days}d.`,
      signal: {
        code: "LONG_TERM_INTERVAL_DUE",
        category: "COMPLIANCE",
        severity: "INFO",
        label: "30-day physician interval due soon",
        evidence: `${days}d since last physician visit; interval is ${interval}d.`,
      },
    };
  return {
    status: "ON_TRACK",
    detail: `Last physician visit ${days}d ago; within the ${interval}-day long-term interval.`,
    signal: null,
  };
}
