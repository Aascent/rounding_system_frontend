import type { RuleSignal } from "../schemas.js";
import { illustrativeRuleConfig, type RuleConfig } from "./config.js";
import { isSignalDisabled } from "./catalog.js";
import { classify } from "./evaluators/classification.js";
import { evaluateCompliance } from "./evaluators/compliance.js";
import { signalEvaluators } from "./evaluators/index.js";
import {
  derivePriority,
  pickReason,
  requiresPhysician,
  scoreSignals,
} from "./scoring.js";
import { DAY_MS, daysBetween } from "./time.js";
import type {
  EvaluationContext,
  Evaluation,
  PatientEvaluationInput,
} from "./types.js";

export type {
  EngineLabFlag,
  EngineVitals,
  EngineWeight,
  Evaluation,
  EvaluationContext,
  PatientEvaluationInput,
  SignalEvaluator,
} from "./types.js";

/**
 * Deterministic rules engine.
 *
 *   input ─▶ classify ─▶ compliance ─▶ [evaluator pipeline] ─▶ score ─▶ output
 *
 * Pure and side-effect free: the same input, clock and config always produce
 * the same evaluation. Thresholds live in {@link RuleConfig}; rule categories
 * live in `./evaluators`; this file only orchestrates.
 */
export function evaluatePatient(
  input: PatientEvaluationInput,
  now: Date = new Date(),
  cfg: RuleConfig = illustrativeRuleConfig,
): Evaluation {
  const ctx: EvaluationContext = { input, now, cfg };

  const daysSinceAdmission = Math.max(
    0,
    Math.floor(
      (now.getTime() - new Date(input.admissionDate).getTime()) / DAY_MS,
    ),
  );
  const daysSincePhysicianVisit = daysBetween(input.lastPhysicianVisit, now);

  const { classification, basis } = classify(input, cfg);
  const compliance = evaluateCompliance(ctx, {
    classification,
    daysSinceAdmission,
    daysSincePhysicianVisit,
  });

  const disabled = cfg.disabledSignalCodes ?? [];
  const signals: RuleSignal[] = [
    ...(compliance.signal ? [compliance.signal] : []),
    ...signalEvaluators.flatMap((evaluate) => evaluate(ctx)),
  ].filter((signal) => !isSignalDisabled(signal.code, disabled));

  const urgencyScore = scoreSignals(
    signals,
    input.carriedForwardFrom !== null,
    cfg,
  );

  return {
    classification,
    classificationBasis: basis,
    signals,
    complianceStatus: compliance.status,
    complianceDetail: compliance.detail,
    urgencyScore,
    priority: derivePriority(signals, urgencyScore, cfg),
    reason: pickReason(signals),
    physicianActionRequired: requiresPhysician(signals),
    daysSinceAdmission,
    daysSincePhysicianVisit,
  };
}
