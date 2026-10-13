import type { Priority, RuleSignal, SignalSeverity } from "../schemas.js";
import type { RuleConfig } from "./config.js";

/** Ordering only — deliberately independent of the (tunable) scoring weights. */
const SEVERITY_RANK: Record<SignalSeverity, number> = {
  CRITICAL: 2,
  WARNING: 1,
  INFO: 0,
};

/** Tie-break order when two signals share a severity (most actionable first). */
const CATEGORY_ORDER: readonly RuleSignal["category"][] = [
  "NEW_ADMISSION",
  "LABS",
  "VITALS",
  "KEYWORD",
  "WEIGHT",
  "COMPLIANCE",
  "DATA_QUALITY",
];

const pointsFor = (s: RuleSignal, cfg: RuleConfig): number =>
  s.severity === "CRITICAL"
    ? cfg.scoring.critical
    : s.severity === "WARNING"
      ? cfg.scoring.warning
      : cfg.scoring.info;

/** Severity-weighted urgency score, plus the carry-forward bonus. */
export function scoreSignals(
  signals: readonly RuleSignal[],
  carriedForward: boolean,
  cfg: RuleConfig,
): number {
  const base = signals.reduce((sum, s) => sum + pointsFor(s, cfg), 0);
  return carriedForward ? base + cfg.scoring.carryForwardBonus : base;
}

/** Any critical signal forces HIGH regardless of the numeric score. */
export function derivePriority(
  signals: readonly RuleSignal[],
  score: number,
  cfg: RuleConfig,
): Priority {
  if (signals.some((s) => s.severity === "CRITICAL")) return "HIGH";
  if (score >= cfg.scoring.highAt) return "HIGH";
  if (score >= cfg.scoring.mediumAt) return "MEDIUM";
  return "LOW";
}

/** Physician-required: a critical signal, a new-admission gate, or a 30-day rule. */
export function requiresPhysician(signals: readonly RuleSignal[]): boolean {
  return signals.some(
    (s) =>
      s.severity === "CRITICAL" ||
      s.category === "NEW_ADMISSION" ||
      s.code.startsWith("LONG_TERM"),
  );
}

/** Human-readable headline: the evidence of the most severe, most actionable signal. */
export function pickReason(signals: readonly RuleSignal[]): string {
  const [top] = [...signals].sort(
    (a, b) =>
      SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
  );
  return top?.evidence ?? "Routine review — no active rule signals.";
}
