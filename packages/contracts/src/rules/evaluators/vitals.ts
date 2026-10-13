import type { RuleSignal } from "../../schemas.js";
import type { SignalEvaluator } from "../types.js";

/** Abnormal-vitals evaluator: fever, hypoxia, hyper/hypotension, HR extremes. */
export const vitalsEvaluator: SignalEvaluator = ({ input, cfg }) => {
  const v = input.vitals;
  if (!v) return [];
  const t = cfg.vitals;
  const out: RuleSignal[] = [];

  if (v.temperatureC !== null && v.temperatureC >= t.temperatureHighC)
    out.push({
      code: "VITALS_FEVER",
      category: "VITALS",
      severity: v.temperatureC >= 39.5 ? "CRITICAL" : "WARNING",
      label: "Elevated temperature",
      evidence: `Temperature ${v.temperatureC.toFixed(1)}°C ≥ ${t.temperatureHighC.toFixed(1)}°C review threshold.`,
    });

  if (v.spo2 !== null && v.spo2 <= t.spo2LowPct)
    out.push({
      code: "VITALS_HYPOXIA",
      category: "VITALS",
      severity: v.spo2 <= 90 ? "CRITICAL" : "WARNING",
      label: "Low oxygen saturation",
      evidence: `SpO₂ ${v.spo2}% ≤ ${t.spo2LowPct}% threshold.`,
    });

  if (
    (v.systolic !== null && v.systolic >= t.systolicHigh) ||
    (v.diastolic !== null && v.diastolic >= t.diastolicHigh)
  )
    out.push({
      code: "VITALS_HYPERTENSION",
      category: "VITALS",
      severity:
        (v.systolic ?? 0) >= 200 || (v.diastolic ?? 0) >= 120
          ? "CRITICAL"
          : "WARNING",
      label: "Hypertensive reading",
      evidence: `BP ${v.systolic ?? "?"}/${v.diastolic ?? "?"} at or above ${t.systolicHigh}/${t.diastolicHigh}.`,
    });

  if (v.systolic !== null && v.systolic <= t.systolicLow)
    out.push({
      code: "VITALS_HYPOTENSION",
      category: "VITALS",
      severity: v.systolic <= 80 ? "CRITICAL" : "WARNING",
      label: "Hypotensive reading",
      evidence: `Systolic ${v.systolic} ≤ ${t.systolicLow} threshold.`,
    });

  if (v.heartRate !== null && v.heartRate >= t.heartRateHigh)
    out.push({
      code: "VITALS_TACHYCARDIA",
      category: "VITALS",
      severity: v.heartRate >= 130 ? "CRITICAL" : "WARNING",
      label: "Tachycardia",
      evidence: `Heart rate ${v.heartRate} ≥ ${t.heartRateHigh} bpm.`,
    });

  if (v.heartRate !== null && v.heartRate <= t.heartRateLow)
    out.push({
      code: "VITALS_BRADYCARDIA",
      category: "VITALS",
      severity: "WARNING",
      label: "Bradycardia",
      evidence: `Heart rate ${v.heartRate} ≤ ${t.heartRateLow} bpm.`,
    });

  return out;
};
