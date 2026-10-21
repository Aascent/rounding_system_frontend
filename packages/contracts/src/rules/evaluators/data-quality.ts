import type { RuleSignal } from "../../schemas.js";
import type { SignalEvaluator } from "../types.js";

/** Data-quality flags: stale source record, missing vitals. Informational only. */
export const dataQualityEvaluator: SignalEvaluator = ({ input, cfg }) => {
  const out: RuleSignal[] = [];
  if (input.dataFreshnessHours > cfg.dataQuality.staleAfterHours)
    out.push({
      code: "DATA_STALE",
      category: "DATA_QUALITY",
      severity: "INFO",
      label: "Stale source record",
      evidence: `Chart last updated ${Math.round(input.dataFreshnessHours)} hours ago (expected within ${cfg.dataQuality.staleAfterHours} hours).`,
    });
  if (input.vitals === null)
    out.push({
      code: "DATA_NO_VITALS",
      category: "DATA_QUALITY",
      severity: "INFO",
      label: "No vitals on record",
      evidence: "No vital signs recorded in the last day.",
    });
  return out;
};
