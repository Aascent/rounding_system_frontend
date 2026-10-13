import type {
  Classification,
  ComplianceStatus,
  Priority,
  RuleSignal,
} from "../schemas.js";
import type { RuleConfig } from "./config.js";

/* ----------------------------- engine input model ---------------------------- */

export type EngineVitals = Readonly<{
  temperatureC: number | null;
  spo2: number | null;
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
}>;

export type EngineLabFlag = Readonly<{
  analyte: string;
  value: string;
  flag: "HH" | "H" | "NORMAL" | "L" | "LL";
}>;

export type EngineWeight = Readonly<{ observedAt: string; valueKg: number }>;

export type PatientEvaluationInput = Readonly<{
  admissionDate: string;
  lengthOfStayDays: number;
  ptSessionsPerWeek: number | null;
  lastPhysicianVisit: string | null;
  lastNpVisit: string | null;
  vitals: EngineVitals | null;
  labFlags: readonly EngineLabFlag[];
  noteText: string;
  weights: readonly EngineWeight[];
  carriedForwardFrom: string | null;
  dataFreshnessHours: number;
}>;

/* ----------------------------- engine output model --------------------------- */

export type Evaluation = Readonly<{
  classification: Classification;
  classificationBasis: string;
  signals: RuleSignal[];
  complianceStatus: ComplianceStatus;
  complianceDetail: string;
  urgencyScore: number;
  priority: Priority;
  reason: string;
  physicianActionRequired: boolean;
  daysSinceAdmission: number;
  daysSincePhysicianVisit: number | null;
}>;

/* ------------------------------ evaluator pipeline --------------------------- */

/** Everything an evaluator may read. Evaluators are pure functions of it. */
export type EvaluationContext = Readonly<{
  input: PatientEvaluationInput;
  now: Date;
  cfg: RuleConfig;
}>;

/**
 * A rule category. Given the context, returns zero or more signals. To add a
 * new rule category, write one of these and register it in
 * `evaluators/index.ts` — the orchestrator, scoring and UI need no changes.
 */
export type SignalEvaluator = (ctx: EvaluationContext) => RuleSignal[];
