import type { Classification } from "../../schemas.js";
import type { RuleConfig } from "../config.js";
import type { PatientEvaluationInput } from "../types.js";

export type ClassificationResult = Readonly<{
  classification: Classification;
  basis: string;
}>;

/**
 * Long-term vs short-term/rehab (proposal §2.1, "two validated heuristics").
 *
 * 1. PT frequency — an active-rehab cadence is the strongest short-term signal
 *    and wins over length of stay.
 * 2. Length of stay — used only when PT frequency is unknown.
 * 3. Otherwise the configured default applies.
 */
export function classify(
  input: PatientEvaluationInput,
  cfg: RuleConfig,
): ClassificationResult {
  const { shortTermMaxLengthOfStayDays, shortTermMinPtSessionsPerWeek } =
    cfg.classification;
  const los = input.lengthOfStayDays;
  const pt = input.ptSessionsPerWeek;

  if (pt !== null && pt >= shortTermMinPtSessionsPerWeek)
    return {
      classification: "SHORT_TERM",
      basis: `Active rehab: ${pt} PT sessions/week meets the ≥${shortTermMinPtSessionsPerWeek}/week short-term heuristic (LOS ${los}d).`,
    };
  if (pt !== null && pt < shortTermMinPtSessionsPerWeek)
    return {
      classification: "LONG_TERM",
      basis: `PT frequency ${pt}/week is below the ${shortTermMinPtSessionsPerWeek}/week rehab threshold.`,
    };

  if (los > shortTermMaxLengthOfStayDays)
    return {
      classification: "LONG_TERM",
      basis: `No PT frequency on record; length of stay ${los}d exceeds the ${shortTermMaxLengthOfStayDays}d short-term ceiling.`,
    };

  const fallback = cfg.classification.defaultWhenAmbiguous;
  return {
    classification: fallback,
    basis: `Ambiguous inputs (LOS ${los}d, PT frequency unknown); defaulted to ${fallback
      .replace("_", "-")
      .toLowerCase()}.`,
  };
}
