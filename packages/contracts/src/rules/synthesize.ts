import {
  dashboardResponseSchema,
  patientDetailResponseSchema,
  queueInsightsResponseSchema,
  roundingListResponseSchema,
  roundingPatientSchema,
  type DashboardResponse,
  type PatientDetail,
  type PatientDetailResponse,
  type QueueInsightsResponse,
  type RoundingListResponse,
  type RoundingPatient,
  type SignalCategory,
  type Vitals,
} from "../schemas.js";
import { SIGNAL_CATEGORY_LABELS } from "./config.js";
import { evaluatePatient, type Evaluation } from "./engine.js";
import { generateSyntheticPatients } from "./generated-data.js";
import {
  SYNTHETIC_NOW,
  syntheticPatientSources,
  type SyntheticPatientSource,
} from "./source-data.js";

const NOW = new Date(SYNTHETIC_NOW);

/** 25 hand-authored scenario records + a procedurally generated long tail. */
const GENERATED_COUNT = 975;
const allSources: SyntheticPatientSource[] = [
  ...syntheticPatientSources,
  ...generateSyntheticPatients(
    GENERATED_COUNT,
    syntheticPatientSources.length + 1,
  ),
];

const CATEGORY_DISPLAY_ORDER: SignalCategory[] = [
  "NEW_ADMISSION",
  "COMPLIANCE",
  "VITALS",
  "LABS",
  "KEYWORD",
  "WEIGHT",
  "DATA_QUALITY",
];

function effectFor(severity: "CRITICAL" | "WARNING" | "INFO"): string {
  if (severity === "CRITICAL") return "Critical — see first";
  if (severity === "WARNING") return "Elevated priority";
  return "For awareness";
}

function toVitals(source: SyntheticPatientSource): Vitals {
  if (!source.vitals)
    return {
      temperatureC: null,
      spo2: null,
      systolic: null,
      diastolic: null,
      heartRate: null,
      recordedAt: null,
    };
  return {
    temperatureC: source.vitals.temperatureC,
    spo2: source.vitals.spo2,
    systolic: source.vitals.systolic,
    diastolic: source.vitals.diastolic,
    heartRate: source.vitals.heartRate,
    recordedAt: source.vitals.recordedAt,
  };
}

function toObservations(
  source: SyntheticPatientSource,
): PatientDetail["observations"] {
  const rows: PatientDetail["observations"] = [];
  const v = source.vitals;
  if (v?.recordedAt) {
    if (v.temperatureC !== null)
      rows.push({
        label: "Temperature",
        value: `${v.temperatureC.toFixed(1)} °C`,
        observedAt: v.recordedAt,
        status: "Vital sign",
      });
    if (v.spo2 !== null)
      rows.push({
        label: "Oxygen saturation",
        value: `${v.spo2}%`,
        observedAt: v.recordedAt,
        status: "Vital sign",
      });
    if (v.systolic !== null && v.diastolic !== null)
      rows.push({
        label: "Blood pressure",
        value: `${v.systolic}/${v.diastolic}`,
        observedAt: v.recordedAt,
        status: "Vital sign",
      });
    if (v.heartRate !== null)
      rows.push({
        label: "Heart rate",
        value: `${v.heartRate} bpm`,
        observedAt: v.recordedAt,
        status: "Vital sign",
      });
  }
  for (const lab of source.labFlags)
    if (lab.flag !== "NORMAL")
      rows.push({
        label: lab.analyte,
        value: `${lab.value} (${lab.flag})`,
        observedAt: lab.observedAt,
        status: "PCC lab flag",
      });
  return rows;
}

function buildRoundingPatient(
  source: SyntheticPatientSource,
  evaluation: Evaluation,
): RoundingPatient {
  return roundingPatientSchema.parse({
    id: source.id,
    name: source.name,
    facility: source.facility,
    room: source.room,
    payer: source.payer,
    status: source.statusLabel,
    classification: evaluation.classification,
    priority: evaluation.priority,
    complianceStatus: evaluation.complianceStatus,
    lastPhysicianVisit: source.lastPhysicianVisit,
    lastNpVisit: source.lastNpVisit,
    daysSinceAdmission: evaluation.daysSinceAdmission,
    urgencyScore: evaluation.urgencyScore,
    physicianActionRequired: evaluation.physicianActionRequired,
    // With no rule signal the engine's reason is a generic "routine review";
    // say what that means for the resident instead.
    reason:
      evaluation.signals.length > 0
        ? evaluation.reason
        : source.carriedForwardFrom !== null
          ? "Not seen yesterday — carried over to today."
          : "No visit needed today — visits are on schedule.",
    signals: evaluation.signals,
    carryForward: source.carriedForwardFrom !== null,
    scenario: source.scenario,
  });
}

function buildDetail(
  source: SyntheticPatientSource,
  evaluation: Evaluation,
  base: RoundingPatient,
): PatientDetail {
  return patientDetailResponseSchema.shape.patient.parse({
    ...base,
    dateOfBirth: source.dateOfBirth,
    diagnoses: source.diagnoses,
    classificationBasis: evaluation.classificationBasis,
    complianceDetail: evaluation.complianceDetail,
    vitals: toVitals(source),
    labFlags: source.labFlags.map((lab) => ({
      analyte: lab.analyte,
      value: lab.value,
      flag: lab.flag,
      observedAt: lab.observedAt,
    })),
    weights: [...source.weights].sort((a, b) =>
      a.observedAt.localeCompare(b.observedAt),
    ),
    observations: toObservations(source),
    noteText: source.noteText,
    noteRecordedAt: source.noteRecordedAt,
    noteKeywordHits: evaluation.signals
      .filter((s) => s.category === "KEYWORD")
      .map((s) => ({
        keyword: s.label.replace(/^Note keyword:\s*[“"]?|[”"]?$/g, ""),
        observedAt: source.noteRecordedAt,
      })),
    visitHistory: [...source.visitHistory].sort((a, b) =>
      b.occurredAt.localeCompare(a.occurredAt),
    ),
    ruleEvidence: evaluation.signals.map((s) => ({
      rule: s.label,
      evidence: s.evidence,
      effect: effectFor(s.severity),
    })),
  });
}

type Synthesized = {
  source: SyntheticPatientSource;
  evaluation: Evaluation;
  rounding: RoundingPatient;
  detail: PatientDetail;
};

const synthesized: Synthesized[] = allSources
  .map((source) => {
    const evaluation = evaluatePatient(
      {
        admissionDate: source.admissionDate,
        lengthOfStayDays: source.lengthOfStayDays,
        ptSessionsPerWeek: source.ptSessionsPerWeek,
        lastPhysicianVisit: source.lastPhysicianVisit,
        lastNpVisit: source.lastNpVisit,
        vitals: source.vitals
          ? {
              temperatureC: source.vitals.temperatureC,
              spo2: source.vitals.spo2,
              systolic: source.vitals.systolic,
              diastolic: source.vitals.diastolic,
              heartRate: source.vitals.heartRate,
            }
          : null,
        labFlags: source.labFlags.map((l) => ({
          analyte: l.analyte,
          value: l.value,
          flag: l.flag,
        })),
        noteText: source.noteText,
        weights: source.weights,
        carriedForwardFrom: source.carriedForwardFrom,
        dataFreshnessHours: source.dataFreshnessHours,
      },
      NOW,
    );
    const rounding = buildRoundingPatient(source, evaluation);
    const detail = buildDetail(source, evaluation, rounding);
    return { source, evaluation, rounding, detail };
  })
  .sort((a, b) => {
    // Primary: clinical urgency score. Tiebreaker: physician-required visits
    // first. Secondary sort: compliance timing. Then name for stability.
    if (b.rounding.urgencyScore !== a.rounding.urgencyScore)
      return b.rounding.urgencyScore - a.rounding.urgencyScore;
    if (
      a.rounding.physicianActionRequired !== b.rounding.physicianActionRequired
    )
      return a.rounding.physicianActionRequired ? -1 : 1;
    const complianceRank = { OVERDUE: 0, DUE_SOON: 1, ON_TRACK: 2 };
    if (
      complianceRank[a.rounding.complianceStatus] !==
      complianceRank[b.rounding.complianceStatus]
    )
      return (
        complianceRank[a.rounding.complianceStatus] -
        complianceRank[b.rounding.complianceStatus]
      );
    return a.rounding.name.localeCompare(b.rounding.name);
  });

/**
 * Today's worklist: only residents for whom at least one rule fired (a
 * clinical signal, a visit due or overdue, stale data) or who were carried
 * forward unseen. Everyone else in the census needs no visit today.
 */
const worklist: Synthesized[] = synthesized.filter((s) =>
  isOnTodaysList(s.rounding),
);

/** The full synced census: every resident, whether or not they are on a list today. */
export const syntheticCensus: Readonly<{
  total: number;
  byFacility: Readonly<Record<string, number>>;
}> = {
  total: synthesized.length,
  byFacility: synthesized.reduce<Record<string, number>>((acc, s) => {
    acc[s.rounding.facility] = (acc[s.rounding.facility] ?? 0) + 1;
    return acc;
  }, {}),
};

export const syntheticRoundingList: RoundingListResponse =
  roundingListResponseSchema.parse({
    mode: "synthetic",
    generatedAt: SYNTHETIC_NOW,
    items: worklist.map((s) => s.rounding),
  });

/** Dashboard totals for an arbitrary (possibly scoped) set of patients. */
export function buildDashboardTotals(
  patients: readonly RoundingPatient[],
): DashboardResponse["totals"] {
  return {
    patients: patients.length,
    highPriority: patients.filter((p) => p.priority === "HIGH").length,
    overdue: patients.filter((p) => p.complianceStatus === "OVERDUE").length,
    facilities: new Set(patients.map((p) => p.facility)).size,
    carryForward: patients.filter((p) => p.carryForward).length,
  };
}

export const syntheticDashboard: DashboardResponse =
  dashboardResponseSchema.parse({
    mode: "synthetic",
    provider: {
      id: "provider-001",
      name: "Dr. Taylor Bennett",
      role: "PHYSICIAN",
    },
    generatedAt: SYNTHETIC_NOW,
    lastSuccessfulSync: "2026-09-07T06:45:00.000Z",
    totals: buildDashboardTotals(worklist.map((s) => s.rounding)),
  });

export function getSyntheticPatient(
  id: string,
): PatientDetailResponse | undefined {
  const match = synthesized.find((s) => s.detail.id === id);
  return match
    ? patientDetailResponseSchema.parse({
        mode: "synthetic",
        patient: match.detail,
      })
    : undefined;
}

export const syntheticPatientIds: string[] = synthesized.map(
  (s) => s.detail.id,
);

/** Only the hand-authored scenarios are pre-rendered; the rest render on demand. */
export const featuredPatientIds: string[] = syntheticPatientSources.map(
  (s) => s.id,
);

export const roundingFacilities: string[] = [
  ...new Set(synthesized.map((s) => s.rounding.facility)),
].sort();

/** Whether a resident needs a visit today: a rule fired, or they were carried forward unseen. */
export function isOnTodaysList(patient: RoundingPatient): boolean {
  return patient.signals.length > 0 || patient.carryForward;
}

/** Every resident in the census (each provider's caseload), ordered by clinical urgency. */
export const syntheticResidents: readonly RoundingPatient[] = synthesized.map(
  (s) => s.rounding,
);

/** Today's rounding candidates (the worklist), ordered by clinical urgency. */
export const syntheticRoundingCandidates: readonly RoundingPatient[] =
  worklist.map((s) => s.rounding);

/** How many top-urgency patients the dashboard "who to see first" chart carries. */
export const TOP_QUEUE_SIZE = 15;

/** Single pass over the synthesized list to build every dashboard aggregate. */
/**
 * Builds every dashboard/report aggregate from an urgency-ordered set of
 * patients in one pass. `patients` may be the full synthetic population or a
 * scoped subset (e.g. one provider's own list) - the shape is identical
 * either way, so the same charts work for both.
 */
export function buildQueueInsights(
  patients: readonly RoundingPatient[],
): QueueInsightsResponse {
  const priority = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  const compliance = { OVERDUE: 0, DUE_SOON: 0, ON_TRACK: 0 };
  const classification = { LONG_TERM: 0, SHORT_TERM: 0 };
  const category = new Map<
    SignalCategory,
    { patients: number; critical: number }
  >();
  const facility = new Map<
    string,
    { patients: number; highPriority: number }
  >();

  for (const p of patients) {
    priority[p.priority] += 1;
    compliance[p.complianceStatus] += 1;
    classification[p.classification] += 1;

    const fac = facility.get(p.facility) ?? { patients: 0, highPriority: 0 };
    fac.patients += 1;
    if (p.priority === "HIGH") fac.highPriority += 1;
    facility.set(p.facility, fac);

    // Per category: count patients with >=1 signal, and patients with >=1 critical.
    const catsSeen = new Set<SignalCategory>();
    const catsCritical = new Set<SignalCategory>();
    for (const sig of p.signals) {
      catsSeen.add(sig.category);
      if (sig.severity === "CRITICAL") catsCritical.add(sig.category);
    }
    for (const cat of catsSeen) {
      const tally = category.get(cat) ?? { patients: 0, critical: 0 };
      tally.patients += 1;
      if (catsCritical.has(cat)) tally.critical += 1;
      category.set(cat, tally);
    }
  }

  return queueInsightsResponseSchema.parse({
    mode: "synthetic",
    generatedAt: SYNTHETIC_NOW,
    priorityBreakdown: priority,
    complianceBreakdown: compliance,
    classificationBreakdown: classification,
    signalCategories: CATEGORY_DISPLAY_ORDER.map((cat) => ({
      category: cat,
      label: SIGNAL_CATEGORY_LABELS[cat] ?? cat,
      patients: category.get(cat)?.patients ?? 0,
      critical: category.get(cat)?.critical ?? 0,
    })).filter((row) => row.patients > 0),
    facilityLoad: [...facility.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, load]) => ({ facility: name, ...load })),
    topQueue: patients.slice(0, TOP_QUEUE_SIZE).map((p) => ({
      id: p.id,
      name: p.name,
      facility: p.facility,
      room: p.room,
      priority: p.priority,
      classification: p.classification,
      complianceStatus: p.complianceStatus,
      urgencyScore: p.urgencyScore,
      physicianActionRequired: p.physicianActionRequired,
      reason: p.reason,
    })),
  });
}

export const syntheticQueueInsights: QueueInsightsResponse = buildQueueInsights(
  worklist.map((s) => s.rounding),
);
