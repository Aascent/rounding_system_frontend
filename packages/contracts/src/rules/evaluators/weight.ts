import type { RuleSignal } from "../../schemas.js";
import { DAY_MS } from "../time.js";
import type { SignalEvaluator } from "../types.js";

type Change = Readonly<{ pct: number; days: number }>;

const describe = (c: Change): string =>
  `${c.pct >= 0 ? "+" : ""}${c.pct.toFixed(1)}% over ${c.days}d (${c.pct >= 0 ? "gain" : "loss"})`;

/**
 * Weight change. Acute (short window) takes precedence over chronic (long
 * window) so one drift is reported once, at its most urgent framing.
 */
export const weightEvaluator: SignalEvaluator = ({ input, cfg }) => {
  if (input.weights.length < 2) return [];
  const sorted = [...input.weights].sort((a, b) =>
    a.observedAt.localeCompare(b.observedAt),
  );
  const latest = sorted.at(-1);
  if (!latest) return [];
  const latestMs = new Date(latest.observedAt).getTime();

  /** % change from the earliest reading inside the window to the latest. */
  const changeOver = (windowDays: number): Change | null => {
    const cutoff = latestMs - windowDays * DAY_MS;
    const ref = sorted.find((w) => new Date(w.observedAt).getTime() >= cutoff);
    if (!ref || ref === latest) return null;
    return {
      pct: ((latest.valueKg - ref.valueKg) / ref.valueKg) * 100,
      days: Math.round(
        (latestMs - new Date(ref.observedAt).getTime()) / DAY_MS,
      ),
    };
  };

  const w = cfg.weight;
  const acute = changeOver(w.acuteWindowDays);
  if (acute && Math.abs(acute.pct) >= w.acutePctChange)
    return [
      {
        code: "WEIGHT_ACUTE",
        category: "WEIGHT",
        severity:
          Math.abs(acute.pct) >= w.acutePctChange * 1.5
            ? "CRITICAL"
            : "WARNING",
        label: "Acute weight change",
        evidence: `Acute weight ${describe(acute)}.`,
      } satisfies RuleSignal,
    ];

  const chronic = changeOver(w.chronicWindowDays);
  if (chronic && Math.abs(chronic.pct) >= w.chronicPctChange)
    return [
      {
        code: "WEIGHT_CHRONIC",
        category: "WEIGHT",
        severity: "WARNING",
        label: "Chronic weight change",
        evidence: `Chronic weight ${describe(chronic)}.`,
      } satisfies RuleSignal,
    ];

  return [];
};
