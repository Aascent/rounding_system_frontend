import type { SignalEvaluator } from "../types.js";

/**
 * Clinical-note keyword detection. A phrase that is contained in a longer
 * matched phrase (e.g. "fall" inside "unwitnessed fall") is dropped so a single
 * mention is not counted twice.
 */
export const keywordsEvaluator: SignalEvaluator = ({ input, cfg }) => {
  const text = input.noteText.toLowerCase();
  const matched = cfg.keywords.filter((k) => text.includes(k.phrase));
  const kept = matched.filter(
    (k) =>
      !matched.some((other) => other !== k && other.phrase.includes(k.phrase)),
  );
  return kept.map((k) => ({
    code: `KEYWORD_${k.phrase.replace(/[^a-z0-9]+/gi, "_").toUpperCase()}`,
    category: "KEYWORD" as const,
    severity: k.severity,
    label: `Note keyword: “${k.phrase}”`,
    evidence: `Nursing note mentions “${k.phrase}” (${k.category}).`,
  }));
};
