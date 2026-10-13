import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluatePatient,
  type PatientEvaluationInput,
} from "@smart-rounding/contracts";

const NOW = new Date("2026-09-07T07:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const daysAgoDate = (d: number) =>
  new Date(NOW.getTime() - d * DAY).toISOString().slice(0, 10);
const daysAgoIso = (d: number) =>
  new Date(NOW.getTime() - d * DAY).toISOString();

function make(
  overrides: Partial<PatientEvaluationInput>,
): PatientEvaluationInput {
  return {
    admissionDate: daysAgoIso(200),
    lengthOfStayDays: 200,
    ptSessionsPerWeek: null,
    lastPhysicianVisit: daysAgoDate(10),
    lastNpVisit: null,
    // Present + normal so no DATA_QUALITY noise; individual tests override.
    vitals: {
      temperatureC: 36.7,
      spo2: 97,
      systolic: 122,
      diastolic: 76,
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

const evalWith = (o: Partial<PatientEvaluationInput>) =>
  evaluatePatient(make(o), NOW);

/* ------------------------------- classification ------------------------------ */

void test("classification — PT frequency is the primary heuristic", () => {
  assert.equal(
    evalWith({ lengthOfStayDays: 25, ptSessionsPerWeek: 5 }).classification,
    "SHORT_TERM",
  );
  // Active rehab wins even with a long length of stay.
  assert.equal(
    evalWith({ lengthOfStayDays: 220, ptSessionsPerWeek: 4 }).classification,
    "SHORT_TERM",
  );
  // Below the rehab threshold → long-term.
  assert.equal(
    evalWith({ lengthOfStayDays: 40, ptSessionsPerWeek: 1 }).classification,
    "LONG_TERM",
  );
});

void test("classification — length of stay is the fallback when PT is unknown", () => {
  assert.equal(
    evalWith({ lengthOfStayDays: 200, ptSessionsPerWeek: null }).classification,
    "LONG_TERM",
  );
  const ambiguous = evalWith({
    lengthOfStayDays: 40,
    ptSessionsPerWeek: null,
  });
  assert.equal(ambiguous.classification, "LONG_TERM"); // documented default
  assert.match(ambiguous.classificationBasis, /defaulted to long-term/);
});

/* --------------------------- long-term compliance --------------------------- */

void test("long-term 30-day physician interval — every band", () => {
  assert.equal(
    evalWith({ lastPhysicianVisit: daysAgoDate(10) }).complianceStatus,
    "ON_TRACK",
  );
  assert.equal(
    evalWith({ lastPhysicianVisit: daysAgoDate(27) }).complianceStatus,
    "DUE_SOON",
  );
  // exactly 30 days → still due-soon, not overdue
  assert.equal(
    evalWith({ lastPhysicianVisit: daysAgoDate(30) }).complianceStatus,
    "DUE_SOON",
  );
  const warn = evalWith({ lastPhysicianVisit: daysAgoDate(40) });
  assert.equal(warn.complianceStatus, "OVERDUE");
  assert.equal(warn.signals[0]?.severity, "WARNING");
  assert.ok(warn.physicianActionRequired);
  const crit = evalWith({ lastPhysicianVisit: daysAgoDate(50) });
  assert.equal(crit.complianceStatus, "OVERDUE");
  assert.equal(crit.signals[0]?.severity, "CRITICAL"); // > 1.5× interval
  assert.equal(crit.priority, "HIGH");
});

void test("long-term — a recent NP visit does not clear an overdue physician interval", () => {
  const r = evalWith({
    lastPhysicianVisit: daysAgoDate(40),
    lastNpVisit: daysAgoDate(2),
  });
  assert.equal(r.complianceStatus, "OVERDUE");
  assert.match(r.complianceDetail, /NP interim visit .* does not satisfy/);
});

/* --------------------------- short-term compliance ------------------------- */

const rehab = (o: Partial<PatientEvaluationInput> = {}) =>
  evalWith({ lengthOfStayDays: 20, ptSessionsPerWeek: 5, ...o });

void test("short-term 3×/week cadence — every band", () => {
  assert.equal(
    rehab({ lastPhysicianVisit: daysAgoDate(1) }).complianceStatus,
    "ON_TRACK",
  );
  // an NP visit counts toward the cadence
  assert.equal(
    rehab({
      lastPhysicianVisit: daysAgoDate(10),
      lastNpVisit: daysAgoDate(2),
    }).complianceStatus,
    "ON_TRACK",
  );
  assert.equal(
    rehab({ lastPhysicianVisit: daysAgoDate(3) }).complianceStatus,
    "DUE_SOON",
  );
  const warn = rehab({ lastPhysicianVisit: daysAgoDate(5) });
  assert.equal(warn.complianceStatus, "OVERDUE");
  assert.equal(warn.signals[0]?.severity, "WARNING");
  const crit = rehab({ lastPhysicianVisit: daysAgoDate(8) });
  assert.equal(crit.complianceStatus, "OVERDUE");
  assert.equal(crit.signals[0]?.severity, "CRITICAL"); // > 2× cadence
});

/* --------------------------- no physician visit yet ------------------------ */

void test("no physician visit on record — new-admission window, then overdue", () => {
  const day1 = evalWith({
    admissionDate: daysAgoIso(1),
    lengthOfStayDays: 1,
    lastPhysicianVisit: null,
    lastNpVisit: null,
  });
  assert.equal(day1.complianceStatus, "DUE_SOON");
  assert.equal(day1.signals[0]?.code, "NEW_ADMISSION_DUE");

  const day3 = evalWith({
    admissionDate: daysAgoIso(3),
    lengthOfStayDays: 3,
    lastPhysicianVisit: null,
  });
  assert.equal(day3.complianceStatus, "DUE_SOON"); // boundary: still within window

  const day4 = evalWith({
    admissionDate: daysAgoIso(4),
    lengthOfStayDays: 4,
    lastPhysicianVisit: null,
  });
  assert.equal(day4.complianceStatus, "OVERDUE");
  assert.equal(day4.signals[0]?.code, "NEW_ADMISSION_OVERDUE");
  assert.equal(day4.signals[0]?.severity, "CRITICAL");
  assert.ok(day4.physicianActionRequired);
});

void test("no physician visit on record — still flagged well past the window", () => {
  // A patient unseen on day 10, or a long-stay resident with no visit ever,
  // must not fall through the cracks.
  const day10 = evalWith({
    admissionDate: daysAgoIso(10),
    lengthOfStayDays: 10,
    lastPhysicianVisit: null,
    lastNpVisit: daysAgoDate(2),
  });
  assert.equal(day10.complianceStatus, "OVERDUE");
  assert.equal(day10.signals[0]?.code, "NEW_ADMISSION_OVERDUE");
  assert.match(day10.complianceDetail, /NP interim visit/);

  const longStay = evalWith({
    lengthOfStayDays: 200,
    lastPhysicianVisit: null,
    lastNpVisit: null,
  });
  assert.equal(longStay.complianceStatus, "OVERDUE");
  assert.equal(longStay.signals[0]?.severity, "CRITICAL");
});

void test("no physician visit — the rule is classification-agnostic", () => {
  const rehabUnseen = evalWith({
    admissionDate: daysAgoIso(2),
    lengthOfStayDays: 2,
    ptSessionsPerWeek: 5,
    lastPhysicianVisit: null,
  });
  assert.equal(rehabUnseen.classification, "SHORT_TERM");
  assert.equal(rehabUnseen.complianceStatus, "DUE_SOON");
  assert.equal(rehabUnseen.signals[0]?.code, "NEW_ADMISSION_DUE");
});

void test("a new admission already seen by the physician is on track", () => {
  const r = evalWith({
    admissionDate: daysAgoIso(2),
    lengthOfStayDays: 2,
    lastPhysicianVisit: daysAgoDate(1),
  });
  assert.equal(r.complianceStatus, "ON_TRACK");
  assert.equal(r.signals.filter((s) => s.category === "COMPLIANCE").length, 0);
});

/* -------------------- compliant-but-clinically-urgent --------------------- */

void test("an on-track patient is still HIGH priority with a critical clinical signal", () => {
  const r = evalWith({
    lastPhysicianVisit: daysAgoDate(12), // ON_TRACK
    vitals: {
      temperatureC: 36.9,
      spo2: 95,
      systolic: 210,
      diastolic: 120,
      heartRate: 96,
    },
  });
  assert.equal(r.complianceStatus, "ON_TRACK");
  assert.equal(r.priority, "HIGH");
  assert.ok(r.physicianActionRequired);
});
