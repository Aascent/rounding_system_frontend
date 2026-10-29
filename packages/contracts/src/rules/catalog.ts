import { z } from "zod";
import {
  prioritySchema,
  type KeywordEntry,
  type Threshold,
} from "../schemas.js";
import { illustrativeRuleConfig, type RuleConfig } from "./config.js";

/**
 * The V1 rule catalogue behind the Admin "Rule management" screen. V1 lets an
 * admin switch existing clinical rules on or off and edit numeric thresholds;
 * it never creates new rule types. Regulatory compliance rules are listed but
 * cannot be switched off.
 */
export const ruleDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  condition: z.string().min(1),
  /** The priority a match contributes (critical findings rank High). */
  priority: prioritySchema,
  /** Signal codes this rule emits (exact, or a prefix ending in `_`). */
  codes: z.array(z.string().min(1)).min(1),
  /** Regulatory rules stay on. */
  locked: z.boolean(),
});
export type RuleDefinition = z.infer<typeof ruleDefinitionSchema>;

export const ruleStateSchema = ruleDefinitionSchema.extend({
  active: z.boolean(),
  updatedAt: z.iso.datetime().nullable(),
});
export type RuleState = z.infer<typeof ruleStateSchema>;

export const ruleToggleSchema = z.object({ active: z.boolean() });

export const RULE_CATALOG: readonly RuleDefinition[] = [
  {
    id: "new-admission",
    name: "New admission physician visit",
    category: "Compliance",
    condition:
      "Admitted with no physician visit yet (due within the admission window)",
    priority: "HIGH",
    codes: ["NEW_ADMISSION_"],
    locked: true,
  },
  {
    id: "long-term-interval",
    name: "Long-term physician interval",
    category: "Compliance",
    condition:
      "Long-term patient due or overdue for the periodic physician visit",
    priority: "MEDIUM",
    codes: ["LONG_TERM_"],
    locked: true,
  },
  {
    id: "short-term-cadence",
    name: "Short-term / rehab visit cadence",
    category: "Compliance",
    condition: "Short-term patient due or overdue for the rehab visit cadence",
    priority: "MEDIUM",
    codes: ["SHORT_TERM_"],
    locked: true,
  },
  {
    id: "fever",
    name: "Fever",
    category: "Vital signs",
    condition: "Temperature at or above the review threshold",
    priority: "MEDIUM",
    codes: ["VITALS_FEVER"],
    locked: false,
  },
  {
    id: "low-oxygen",
    name: "Low oxygen",
    category: "Vital signs",
    condition: "SpO₂ at or below the review threshold",
    priority: "HIGH",
    codes: ["VITALS_HYPOXIA"],
    locked: false,
  },
  {
    id: "high-blood-pressure",
    name: "High blood pressure",
    category: "Vital signs",
    condition:
      "Systolic or diastolic pressure at or above the review threshold",
    priority: "HIGH",
    codes: ["VITALS_HYPERTENSION"],
    locked: false,
  },
  {
    id: "low-blood-pressure",
    name: "Low blood pressure",
    category: "Vital signs",
    condition: "Systolic pressure at or below the review threshold",
    priority: "HIGH",
    codes: ["VITALS_HYPOTENSION"],
    locked: false,
  },
  {
    id: "fast-heart-rate",
    name: "Fast heart rate",
    category: "Vital signs",
    condition: "Heart rate at or above the review threshold",
    priority: "MEDIUM",
    codes: ["VITALS_TACHYCARDIA"],
    locked: false,
  },
  {
    id: "slow-heart-rate",
    name: "Slow heart rate",
    category: "Vital signs",
    condition: "Heart rate at or below the review threshold",
    priority: "MEDIUM",
    codes: ["VITALS_BRADYCARDIA"],
    locked: false,
  },
  {
    id: "lab-flags",
    name: "Abnormal lab result",
    category: "Labs",
    condition: "PCC lab flag H/L (warning) or HH/LL (critical)",
    priority: "HIGH",
    codes: ["LAB_"],
    locked: false,
  },
  {
    id: "note-keywords",
    name: "Concerning nursing note",
    category: "Clinical notes",
    condition:
      "Nursing note contains an active keyword from the keyword library",
    priority: "HIGH",
    codes: ["KEYWORD_"],
    locked: false,
  },
  {
    id: "weight-acute",
    name: "Rapid weight change",
    category: "Weight",
    condition:
      "Weight change within the acute window at or above the threshold",
    priority: "MEDIUM",
    codes: ["WEIGHT_ACUTE"],
    locked: false,
  },
  {
    id: "weight-chronic",
    name: "Gradual weight change",
    category: "Weight",
    condition:
      "Weight change within the chronic window at or above the threshold",
    priority: "LOW",
    codes: ["WEIGHT_CHRONIC"],
    locked: false,
  },
  {
    id: "data-quality",
    name: "Missing or outdated data",
    category: "Data quality",
    condition: "No recent vital signs, or the chart has not refreshed recently",
    priority: "LOW",
    codes: ["DATA_"],
    locked: false,
  },
];

/** Signal codes switched off by the inactive rules (locked rules never are). */
export function disabledSignalCodes(
  inactiveRuleIds: Iterable<string>,
): string[] {
  const off = new Set(inactiveRuleIds);
  return RULE_CATALOG.filter((r) => !r.locked && off.has(r.id)).flatMap(
    (r) => r.codes,
  );
}

export function isSignalDisabled(
  code: string,
  disabled: readonly string[],
): boolean {
  return disabled.some((d) =>
    d.endsWith("_") ? code.startsWith(d) : code === d,
  );
}

type ThresholdTarget = (cfg: MutableConfig, value: number) => void;
type MutableConfig = {
  -readonly [K in keyof RuleConfig]: RuleConfig[K] extends readonly unknown[]
    ? RuleConfig[K]
    : { -readonly [P in keyof RuleConfig[K]]: RuleConfig[K][P] };
};

/** Where each editable threshold lands in the rule configuration. */
const THRESHOLD_TARGETS: Readonly<Record<string, ThresholdTarget>> = {
  "temperature-high": (c, v) => (c.vitals.temperatureHighC = v),
  "oxygen-low": (c, v) => (c.vitals.spo2LowPct = v),
  "systolic-high": (c, v) => (c.vitals.systolicHigh = v),
  "heart-rate-high": (c, v) => (c.vitals.heartRateHigh = v),
  "weight-change-acute": (c, v) => (c.weight.acutePctChange = v),
  "long-term-interval": (c, v) => (c.compliance.longTermIntervalDays = v),
};

/**
 * Build the rule configuration the engine runs with from the stored
 * thresholds, active keywords and inactive rules. Anything not stored keeps
 * its illustrative default.
 */
export function buildRuleConfig(input: {
  thresholds: readonly Pick<Threshold, "id" | "value">[];
  keywords: readonly Pick<
    KeywordEntry,
    "keyword" | "category" | "severity" | "active"
  >[];
  inactiveRuleIds: readonly string[];
}): RuleConfig {
  const base = illustrativeRuleConfig;
  const cfg: MutableConfig = {
    compliance: { ...base.compliance },
    classification: { ...base.classification },
    vitals: { ...base.vitals },
    weight: { ...base.weight },
    dataQuality: { ...base.dataQuality },
    keywords: base.keywords,
    scoring: { ...base.scoring },
    disabledSignalCodes: [],
  };
  for (const t of input.thresholds) THRESHOLD_TARGETS[t.id]?.(cfg, t.value);
  cfg.keywords = input.keywords
    .filter((k) => k.active)
    .map((k) => ({
      phrase: k.keyword,
      category: k.category,
      severity: k.severity,
    }));
  cfg.disabledSignalCodes = disabledSignalCodes(input.inactiveRuleIds);
  return cfg as RuleConfig;
}
