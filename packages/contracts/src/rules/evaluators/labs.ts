import type { SignalEvaluator } from "../types.js";

/** PCC lab abnormal flags: HH/LL are critical, H/L are warnings, NORMAL is ignored. */
export const labsEvaluator: SignalEvaluator = ({ input }) =>
  input.labFlags
    .filter((f) => f.flag !== "NORMAL")
    .map((f) => {
      const critical = f.flag === "HH" || f.flag === "LL";
      return {
        code: `LAB_${f.flag}`,
        category: "LABS" as const,
        severity: critical ? ("CRITICAL" as const) : ("WARNING" as const),
        label: critical ? "Critical lab flag" : "Abnormal lab flag",
        evidence: `${f.analyte} ${f.value} is ${critical ? "critically " : ""}${f.flag.startsWith("H") ? "high" : "low"} (lab flag ${f.flag}).`,
      };
    });
