import type { SignalEvaluator } from "../types.js";
import { dataQualityEvaluator } from "./data-quality.js";
import { keywordsEvaluator } from "./keywords.js";
import { labsEvaluator } from "./labs.js";
import { vitalsEvaluator } from "./vitals.js";
import { weightEvaluator } from "./weight.js";

/**
 * The evaluator pipeline, run in order after the compliance step. Signal order
 * in the output follows this list, so keep it stable. To add a rule category:
 * create an evaluator in this folder and append it here.
 */
export const signalEvaluators: readonly SignalEvaluator[] = [
  vitalsEvaluator,
  labsEvaluator,
  keywordsEvaluator,
  weightEvaluator,
  dataQualityEvaluator,
];
