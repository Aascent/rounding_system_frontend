import type { SignalSeverity } from "../schemas.js";

/**
 * ILLUSTRATIVE rules configuration.
 *
 * Every value here is a placeholder for the synthetic preview. The approved
 * clinical thresholds, keyword catalogue, classification heuristics and timing
 * semantics are External Blockers (see DEVELOPMENT_TRACKER.md). This object is
 * shaped so a signed Master Specification can replace the numbers without
 * touching the engine.
 */
export type KeywordRule = Readonly<{
  phrase: string;
  category: string;
  severity: SignalSeverity;
}>;

export type RuleConfig = Readonly<{
  compliance: Readonly<{
    longTermIntervalDays: number;
    longTermDueSoonWindowDays: number;
    shortTermIntervalDays: number;
    shortTermDueSoonWindowDays: number;
    newAdmissionPhysicianWindowDays: number;
  }>;
  classification: Readonly<{
    shortTermMaxLengthOfStayDays: number;
    shortTermMinPtSessionsPerWeek: number;
    defaultWhenAmbiguous: "LONG_TERM" | "SHORT_TERM";
  }>;
  vitals: Readonly<{
    temperatureHighC: number;
    spo2LowPct: number;
    systolicHigh: number;
    systolicLow: number;
    diastolicHigh: number;
    heartRateHigh: number;
    heartRateLow: number;
  }>;
  weight: Readonly<{
    acuteWindowDays: number;
    acutePctChange: number;
    chronicWindowDays: number;
    chronicPctChange: number;
  }>;
  dataQuality: Readonly<{ staleAfterHours: number }>;
  keywords: readonly KeywordRule[];
  scoring: Readonly<{
    critical: number;
    warning: number;
    info: number;
    carryForwardBonus: number;
    highAt: number;
    mediumAt: number;
  }>;
  /** Signal codes of rules an admin switched off (see `catalog.ts`). */
  disabledSignalCodes?: readonly string[];
}>;

export const illustrativeRuleConfig: RuleConfig = {
  compliance: {
    longTermIntervalDays: 30,
    longTermDueSoonWindowDays: 6,
    shortTermIntervalDays: 3,
    shortTermDueSoonWindowDays: 1,
    newAdmissionPhysicianWindowDays: 3,
  },
  classification: {
    shortTermMaxLengthOfStayDays: 100,
    shortTermMinPtSessionsPerWeek: 3,
    defaultWhenAmbiguous: "LONG_TERM",
  },
  vitals: {
    temperatureHighC: 38.0,
    spo2LowPct: 92,
    systolicHigh: 180,
    systolicLow: 90,
    diastolicHigh: 110,
    heartRateHigh: 110,
    heartRateLow: 50,
  },
  weight: {
    acuteWindowDays: 7,
    acutePctChange: 3,
    chronicWindowDays: 30,
    chronicPctChange: 5,
  },
  dataQuality: { staleAfterHours: 30 },
  keywords: [
    {
      phrase: "unwitnessed fall",
      category: "Injury / safety",
      severity: "CRITICAL",
    },
    { phrase: "fall", category: "Injury / safety", severity: "WARNING" },
    { phrase: "sepsis", category: "Infection", severity: "CRITICAL" },
    { phrase: "hospital return", category: "Transfer", severity: "CRITICAL" },
    {
      phrase: "altered mental status",
      category: "Neurological",
      severity: "CRITICAL",
    },
    { phrase: "ams", category: "Neurological", severity: "CRITICAL" },
    {
      phrase: "new oxygen requirement",
      category: "Respiratory",
      severity: "CRITICAL",
    },
    { phrase: "new o2", category: "Respiratory", severity: "CRITICAL" },
    { phrase: "pressure ulcer", category: "Wound / skin", severity: "WARNING" },
    { phrase: "wound", category: "Wound / skin", severity: "WARNING" },
    { phrase: "refusing meds", category: "Adherence", severity: "WARNING" },
  ],
  scoring: {
    critical: 100,
    warning: 40,
    info: 10,
    carryForwardBonus: 25,
    highAt: 100,
    mediumAt: 40,
  },
};

export const SIGNAL_CATEGORY_LABELS: Record<string, string> = {
  COMPLIANCE: "Visit due or overdue",
  NEW_ADMISSION: "New admission",
  VITALS: "Abnormal vital signs",
  LABS: "Abnormal lab results",
  KEYWORD: "Concerning nursing notes",
  WEIGHT: "Weight change",
  DATA_QUALITY: "Missing or outdated data",
};
