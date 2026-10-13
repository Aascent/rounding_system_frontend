import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluatePatient,
  syntheticQueueInsights,
  syntheticRoundingList,
  TOP_QUEUE_SIZE,
  type PatientEvaluationInput,
} from "@smart-rounding/contracts";

const NOW = new Date("2026-09-07T07:00:00.000Z");

function base(
  overrides: Partial<PatientEvaluationInput> = {},
): PatientEvaluationInput {
  return {
    admissionDate: "2026-01-01T12:00:00.000Z",
    lengthOfStayDays: 200,
    ptSessionsPerWeek: null,
    lastPhysicianVisit: "2026-08-30",
    lastNpVisit: null,
    vitals: {
      temperatureC: 36.7,
      spo2: 97,
      systolic: 122,
      diastolic: 74,
      heartRate: 72,
    },
    labFlags: [],
    noteText: "Stable, no concerns.",
    weights: [],
    carriedForwardFrom: null,
    dataFreshnessHours: 2,
    ...overrides,
  };
}

void test("classifies a long stay as long-term and a rehab profile as short-term", () => {
  assert.equal(evaluatePatient(base(), NOW).classification, "LONG_TERM");
  assert.equal(
    evaluatePatient(base({ lengthOfStayDays: 20, ptSessionsPerWeek: 5 }), NOW)
      .classification,
    "SHORT_TERM",
  );
  assert.equal(
    evaluatePatient(base({ lengthOfStayDays: 20, ptSessionsPerWeek: 1 }), NOW)
      .classification,
    "LONG_TERM",
  );
});

void test("applies long-term 30-day physician compliance bands", () => {
  assert.equal(
    evaluatePatient(base({ lastPhysicianVisit: "2026-09-01" }), NOW)
      .complianceStatus,
    "ON_TRACK",
  );
  assert.equal(
    evaluatePatient(base({ lastPhysicianVisit: "2026-08-08" }), NOW)
      .complianceStatus,
    "DUE_SOON",
  );
  const overdue = evaluatePatient(
    base({ lastPhysicianVisit: "2026-07-25" }),
    NOW,
  );
  assert.equal(overdue.complianceStatus, "OVERDUE");
  assert.ok(overdue.physicianActionRequired);
  assert.equal(
    evaluatePatient(base({ lastPhysicianVisit: null }), NOW).complianceStatus,
    "OVERDUE",
  );
});

void test("an NP interim visit does not satisfy the long-term physician requirement", () => {
  const result = evaluatePatient(
    base({ lastPhysicianVisit: "2026-07-25", lastNpVisit: "2026-09-06" }),
    NOW,
  );
  assert.equal(result.complianceStatus, "OVERDUE");
  assert.match(result.complianceDetail, /NP interim visit/);
});

void test("flags a new admission past the 3-day physician window as critical", () => {
  const result = evaluatePatient(
    base({
      admissionDate: "2026-09-02T09:00:00.000Z", // ~5 days ago → past the window
      lengthOfStayDays: 5,
      lastPhysicianVisit: null,
      lastNpVisit: null,
    }),
    NOW,
  );
  assert.equal(result.complianceStatus, "OVERDUE");
  assert.equal(result.priority, "HIGH");
  assert.ok(result.signals.some((s) => s.code === "NEW_ADMISSION_OVERDUE"));
});

void test("vital thresholds are inclusive and severities escalate", () => {
  assert.ok(
    evaluatePatient(
      base({ vitals: { ...base().vitals!, temperatureC: 38.0 } }),
      NOW,
    ).signals.some(
      (s) => s.code === "VITALS_FEVER" && s.severity === "WARNING",
    ),
  );
  assert.ok(
    evaluatePatient(
      base({ vitals: { ...base().vitals!, spo2: 89 } }),
      NOW,
    ).signals.some(
      (s) => s.code === "VITALS_HYPOXIA" && s.severity === "CRITICAL",
    ),
  );
  assert.ok(
    evaluatePatient(
      base({ vitals: { ...base().vitals!, systolic: 205, diastolic: 121 } }),
      NOW,
    ).signals.some(
      (s) => s.code === "VITALS_HYPERTENSION" && s.severity === "CRITICAL",
    ),
  );
});

void test("critical lab flags force high priority even when compliance is on track", () => {
  const result = evaluatePatient(
    base({
      lastPhysicianVisit: "2026-09-02",
      labFlags: [{ analyte: "Potassium", value: "6.4", flag: "HH" }],
    }),
    NOW,
  );
  assert.equal(result.complianceStatus, "ON_TRACK");
  assert.equal(result.priority, "HIGH");
  assert.ok(result.physicianActionRequired);
});

void test("keyword detection matches phrases and drops sub-phrase duplicates", () => {
  const result = evaluatePatient(
    base({ noteText: "resident had an unwitnessed fall overnight" }),
    NOW,
  );
  const keywordSignals = result.signals.filter((s) => s.category === "KEYWORD");
  assert.equal(keywordSignals.length, 1);
  assert.match(keywordSignals[0]!.label, /unwitnessed fall/);
  assert.equal(keywordSignals[0]!.severity, "CRITICAL");
});

void test("detects acute and chronic weight change", () => {
  const acute = evaluatePatient(
    base({
      weights: [
        { observedAt: "2026-09-01T08:00:00.000Z", valueKg: 78 },
        { observedAt: "2026-09-06T08:00:00.000Z", valueKg: 81.6 },
      ],
    }),
    NOW,
  );
  assert.ok(acute.signals.some((s) => s.code === "WEIGHT_ACUTE"));

  const chronic = evaluatePatient(
    base({
      weights: [
        { observedAt: "2026-08-09T08:00:00.000Z", valueKg: 62 },
        { observedAt: "2026-09-06T08:00:00.000Z", valueKg: 58.1 },
      ],
    }),
    NOW,
  );
  assert.ok(chronic.signals.some((s) => s.code === "WEIGHT_CHRONIC"));
});

void test("a clean record produces no signals and low priority", () => {
  const result = evaluatePatient(
    base({ lastPhysicianVisit: "2026-09-02" }),
    NOW,
  );
  assert.equal(result.signals.length, 0);
  assert.equal(result.priority, "LOW");
  assert.match(result.reason, /Routine review/);
});

void test("the synthetic queue is ordered by urgency and exposes insights", () => {
  const items = syntheticRoundingList.items;
  assert.equal(items.length, 1000);
  for (let i = 1; i < items.length; i += 1)
    assert.ok(
      items[i - 1]!.urgencyScore >= items[i]!.urgencyScore ||
        items[i - 1]!.physicianActionRequired,
      `row ${i} out of urgency order`,
    );
  const p = syntheticQueueInsights.priorityBreakdown;
  assert.equal(p.HIGH + p.MEDIUM + p.LOW, 1000);
  const c = syntheticQueueInsights.complianceBreakdown;
  assert.equal(c.OVERDUE + c.DUE_SOON + c.ON_TRACK, 1000);
  assert.equal(syntheticQueueInsights.topQueue.length, TOP_QUEUE_SIZE);
  assert.equal(
    syntheticQueueInsights.facilityLoad.reduce((s, f) => s + f.patients, 0),
    1000,
  );
});
