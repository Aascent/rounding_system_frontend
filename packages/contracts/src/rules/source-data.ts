import type { UserRole } from "../schemas.js";

/**
 * Raw synthetic patient records — the illustrative "ingested" data the rules
 * engine runs against. All names/values are fictional. Reference "today" for
 * every relative date below is 2026-09-07.
 */
export const SYNTHETIC_NOW = "2026-09-07T07:00:00.000Z";

export type SourceVitals = {
  temperatureC: number | null;
  spo2: number | null;
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
  recordedAt: string | null;
};

export type SyntheticPatientSource = {
  id: string;
  name: string;
  facility: string;
  room: string;
  payer: string;
  statusLabel: string;
  dateOfBirth: string | null;
  diagnoses: string[];
  admissionDate: string;
  lengthOfStayDays: number;
  ptSessionsPerWeek: number | null;
  lastPhysicianVisit: string | null;
  lastNpVisit: string | null;
  vitals: SourceVitals | null;
  labFlags: {
    analyte: string;
    value: string;
    flag: "HH" | "H" | "NORMAL" | "L" | "LL";
    observedAt: string;
  }[];
  noteText: string;
  noteRecordedAt: string;
  weights: { observedAt: string; valueKg: number }[];
  visitHistory: { providerRole: UserRole; occurredAt: string }[];
  carriedForwardFrom: string | null;
  dataFreshnessHours: number;
  scenario: string;
};

const NW = "Northwind Care Center";
const LS = "Lakeside Skilled Nursing";
const OM = "Oak Manor";

function normalVitals(recordedAt: string): SourceVitals {
  return {
    temperatureC: 36.7,
    spo2: 97,
    systolic: 124,
    diastolic: 76,
    heartRate: 74,
    recordedAt,
  };
}

export const syntheticPatientSources: SyntheticPatientSource[] = [
  {
    id: "synthetic-patient-001",
    name: "Avery Sample",
    facility: NW,
    room: "204A",
    payer: "Synthetic Medicare",
    statusLabel: "Long-term care",
    dateOfBirth: "1942-05-14",
    diagnoses: [
      "Synthetic mobility limitation",
      "Synthetic hypertension history",
    ],
    admissionDate: "2026-02-08T12:00:00.000Z",
    lengthOfStayDays: 211,
    ptSessionsPerWeek: null,
    lastPhysicianVisit: "2026-07-25",
    lastNpVisit: "2026-08-20",
    vitals: normalVitals("2026-09-07T05:40:00.000Z"),
    labFlags: [],
    noteText: "Resident stable overnight. Continues scheduled therapies.",
    noteRecordedAt: "2026-09-07T05:10:00.000Z",
    weights: [
      { observedAt: "2026-08-10T08:00:00.000Z", valueKg: 71.2 },
      { observedAt: "2026-09-05T08:00:00.000Z", valueKg: 71.0 },
    ],
    visitHistory: [
      { providerRole: "PHYSICIAN", occurredAt: "2026-07-25T15:00:00.000Z" },
      {
        providerRole: "NURSE_PRACTITIONER",
        occurredAt: "2026-08-20T14:00:00.000Z",
      },
    ],
    carriedForwardFrom: null,
    dataFreshnessHours: 3,
    scenario:
      "Long-term resident 44 days past the 30-day physician interval (warning band).",
  },
  {
    id: "synthetic-patient-002",
    name: "Jordan Rivera",
    facility: NW,
    room: "118B",
    payer: "Synthetic Managed Care",
    statusLabel: "Long-term care",
    dateOfBirth: "1938-11-02",
    diagnoses: ["Synthetic chronic kidney disease", "Synthetic diabetes"],
    admissionDate: "2026-01-05T12:00:00.000Z",
    lengthOfStayDays: 245,
    ptSessionsPerWeek: null,
    lastPhysicianVisit: "2026-07-10",
    lastNpVisit: "2026-08-15",
    vitals: normalVitals("2026-09-07T05:41:00.000Z"),
    labFlags: [],
    noteText: "No acute concerns reported by nursing.",
    noteRecordedAt: "2026-09-07T05:20:00.000Z",
    weights: [
      { observedAt: "2026-08-09T08:00:00.000Z", valueKg: 80.1 },
      { observedAt: "2026-09-06T08:00:00.000Z", valueKg: 79.6 },
    ],
    visitHistory: [
      { providerRole: "PHYSICIAN", occurredAt: "2026-07-10T15:00:00.000Z" },
      {
        providerRole: "NURSE_PRACTITIONER",
        occurredAt: "2026-08-15T14:00:00.000Z",
      },
    ],
    carriedForwardFrom: null,
    dataFreshnessHours: 4,
    scenario:
      "Long-term interval exceeded by ~4 weeks — escalated to critical.",
  },
  {
    id: "synthetic-patient-003",
    name: "Priya Anand",
    facility: NW,
    room: "210",
    payer: "Synthetic Medicare",
    statusLabel: "Long-term care",
    dateOfBirth: "1949-09-30",
    diagnoses: ["Synthetic hypertension", "Synthetic heart failure"],
    admissionDate: "2026-03-11T12:00:00.000Z",
    lengthOfStayDays: 180,
    ptSessionsPerWeek: null,
    lastPhysicianVisit: "2026-08-20",
    lastNpVisit: "2026-08-31",
    vitals: {
      temperatureC: 36.9,
      spo2: 95,
      systolic: 208,
      diastolic: 118,
      heartRate: 96,
      recordedAt: "2026-09-07T05:30:00.000Z",
    },
    labFlags: [],
    noteText:
      "BP elevated on recheck, resident reports headache. MD aware. Weight up since last week.",
    noteRecordedAt: "2026-09-07T05:35:00.000Z",
    weights: [
      { observedAt: "2026-08-30T08:00:00.000Z", valueKg: 78.0 },
      { observedAt: "2026-09-06T08:00:00.000Z", valueKg: 81.6 },
    ],
    visitHistory: [
      { providerRole: "PHYSICIAN", occurredAt: "2026-08-20T15:00:00.000Z" },
      {
        providerRole: "NURSE_PRACTITIONER",
        occurredAt: "2026-08-31T14:00:00.000Z",
      },
    ],
    carriedForwardFrom: null,
    dataFreshnessHours: 2,
    scenario:
      "On schedule for the 30-day visit, but hypertensive urgency (208/118) plus a 4.6% acute weight gain force a same-day physician review.",
  },
  {
    id: "synthetic-patient-004",
    name: "Walter Boone",
    facility: NW,
    room: "202",
    payer: "Synthetic Commercial",
    statusLabel: "Long-term care",
    dateOfBirth: "1935-04-22",
    diagnoses: ["Synthetic COPD", "Synthetic atrial fibrillation"],
    admissionDate: "2026-04-01T12:00:00.000Z",
    lengthOfStayDays: 159,
    ptSessionsPerWeek: null,
    lastPhysicianVisit: "2026-08-25",
    lastNpVisit: null,
    vitals: normalVitals("2026-09-07T05:22:00.000Z"),
    labFlags: [
      {
        analyte: "Potassium",
        value: "6.4 mmol/L",
        flag: "HH",
        observedAt: "2026-09-07T04:10:00.000Z",
      },
      {
        analyte: "Creatinine",
        value: "1.9 mg/dL",
        flag: "H",
        observedAt: "2026-09-07T04:10:00.000Z",
      },
    ],
    noteText:
      "Routine labs drawn this morning, results pending review at time of note.",
    noteRecordedAt: "2026-09-07T04:30:00.000Z",
    weights: [
      { observedAt: "2026-08-11T08:00:00.000Z", valueKg: 68.4 },
      { observedAt: "2026-09-04T08:00:00.000Z", valueKg: 68.1 },
    ],
    visitHistory: [
      { providerRole: "PHYSICIAN", occurredAt: "2026-08-25T15:00:00.000Z" },
    ],
    carriedForwardFrom: null,
    dataFreshnessHours: 3,
    scenario:
      "On schedule for the 30-day visit, but a critical potassium (6.4 mmol/L, HH) requires urgent review.",
  },
  {
    id: "synthetic-patient-005",
    name: "Della Nguyen",
    facility: NW,
    room: "221C",
    payer: "Synthetic Medicare",
    statusLabel: "Long-term care",
    dateOfBirth: "1944-12-19",
    diagnoses: [
      "Synthetic osteoporosis",
      "Synthetic mild cognitive impairment",
    ],
    admissionDate: "2026-05-02T12:00:00.000Z",
    lengthOfStayDays: 128,
    ptSessionsPerWeek: null,
    lastPhysicianVisit: "2026-08-28",
    lastNpVisit: "2026-08-28",
    vitals: normalVitals("2026-09-07T05:12:00.000Z"),
    labFlags: [],
    noteText:
      "Resident found on floor next to bed at 03:20, unwitnessed fall. No apparent injury, neuro checks initiated, MD and family notified.",
    noteRecordedAt: "2026-09-07T03:40:00.000Z",
    weights: [
      { observedAt: "2026-08-12T08:00:00.000Z", valueKg: 59.0 },
      { observedAt: "2026-09-05T08:00:00.000Z", valueKg: 58.7 },
    ],
    visitHistory: [
      { providerRole: "PHYSICIAN", occurredAt: "2026-08-28T15:00:00.000Z" },
    ],
    carriedForwardFrom: null,
    dataFreshnessHours: 5,
    scenario:
      "Seen 10 days ago and compliant, but an unwitnessed overnight fall escalates priority.",
  },
  {
    id: "synthetic-patient-006",
    name: "Harold Pratt",
    facility: NW,
    room: "115",
    payer: "Synthetic Commercial",
    statusLabel: "Long-term care",
    dateOfBirth: "1946-06-08",
    diagnoses: ["Synthetic stable hypertension"],
    admissionDate: "2025-12-01T12:00:00.000Z",
    lengthOfStayDays: 280,
    ptSessionsPerWeek: null,
    lastPhysicianVisit: "2026-08-30",
    lastNpVisit: null,
    vitals: normalVitals("2026-09-07T05:05:00.000Z"),
    labFlags: [
      {
        analyte: "CBC panel",
        value: "within range",
        flag: "NORMAL",
        observedAt: "2026-09-06T09:00:00.000Z",
      },
    ],
    noteText: "Comfortable, participating in activities, no complaints.",
    noteRecordedAt: "2026-09-07T05:00:00.000Z",
    weights: [
      { observedAt: "2026-08-08T08:00:00.000Z", valueKg: 82.0 },
      { observedAt: "2026-09-05T08:00:00.000Z", valueKg: 82.3 },
    ],
    visitHistory: [
      { providerRole: "PHYSICIAN", occurredAt: "2026-08-30T15:00:00.000Z" },
    ],
    carriedForwardFrom: null,
    dataFreshnessHours: 3,
    scenario:
      "Negative control — long-term resident seen 8 days ago with no active signals.",
  },
  {
    id: "synthetic-patient-007",
    name: "Ruth Cardenas",
    facility: LS,
    room: "12",
    payer: "Synthetic Managed Care",
    statusLabel: "Long-term care",
    dateOfBirth: "1940-02-27",
    diagnoses: ["Synthetic dementia", "Synthetic anemia"],
    admissionDate: "2026-05-10T12:00:00.000Z",
    lengthOfStayDays: 120,
    ptSessionsPerWeek: null,
    lastPhysicianVisit: null,
    lastNpVisit: "2026-09-05",
    vitals: normalVitals("2026-09-07T05:02:00.000Z"),
    labFlags: [],
    noteText:
      "NP interim visit completed this week. Awaiting initial physician encounter.",
    noteRecordedAt: "2026-09-07T05:00:00.000Z",
    weights: [
      { observedAt: "2026-08-10T08:00:00.000Z", valueKg: 54.0 },
      { observedAt: "2026-09-05T08:00:00.000Z", valueKg: 53.6 },
    ],
    visitHistory: [
      {
        providerRole: "NURSE_PRACTITIONER",
        occurredAt: "2026-09-05T14:00:00.000Z",
      },
    ],
    carriedForwardFrom: null,
    dataFreshnessHours: 6,
    scenario:
      "Long-term resident with no physician visit on record; the NP interim visit does not satisfy the requirement.",
  },
  {
    id: "synthetic-patient-008",
    name: "Marcus Field",
    facility: LS,
    room: "32",
    payer: "Synthetic Medicare",
    statusLabel: "Short-term rehabilitation",
    dateOfBirth: "1957-08-15",
    diagnoses: ["Synthetic post-op hip replacement"],
    admissionDate: "2026-08-18T12:00:00.000Z",
    lengthOfStayDays: 20,
    ptSessionsPerWeek: 5,
    lastPhysicianVisit: "2026-09-01",
    lastNpVisit: "2026-09-02",
    vitals: normalVitals("2026-09-07T05:00:00.000Z"),
    labFlags: [],
    noteText: "Progressing with therapy, pain controlled.",
    noteRecordedAt: "2026-09-07T04:55:00.000Z",
    weights: [
      { observedAt: "2026-08-20T08:00:00.000Z", valueKg: 88.0 },
      { observedAt: "2026-09-05T08:00:00.000Z", valueKg: 87.4 },
    ],
    visitHistory: [
      { providerRole: "PHYSICIAN", occurredAt: "2026-09-01T15:00:00.000Z" },
      {
        providerRole: "NURSE_PRACTITIONER",
        occurredAt: "2026-09-02T14:00:00.000Z",
      },
    ],
    carriedForwardFrom: null,
    dataFreshnessHours: 4,
    scenario:
      "Short-term rehab patient 5 days since last visit against a 3-day (3×/week) cadence.",
  },
  {
    id: "synthetic-patient-009",
    name: "Elena Sorrentino",
    facility: LS,
    room: "47C",
    payer: "Synthetic Commercial",
    statusLabel: "Short-term rehabilitation",
    dateOfBirth: "1962-03-04",
    diagnoses: ["Synthetic knee replacement rehab"],
    admissionDate: "2026-08-23T12:00:00.000Z",
    lengthOfStayDays: 15,
    ptSessionsPerWeek: 4,
    lastPhysicianVisit: "2026-09-03",
    lastNpVisit: "2026-09-06",
    vitals: normalVitals("2026-09-07T04:50:00.000Z"),
    labFlags: [],
    noteText: "Independent with walker, discharge planning underway.",
    noteRecordedAt: "2026-09-07T04:45:00.000Z",
    weights: [
      { observedAt: "2026-08-25T08:00:00.000Z", valueKg: 70.0 },
      { observedAt: "2026-09-05T08:00:00.000Z", valueKg: 69.8 },
    ],
    visitHistory: [
      { providerRole: "PHYSICIAN", occurredAt: "2026-09-03T15:00:00.000Z" },
      {
        providerRole: "NURSE_PRACTITIONER",
        occurredAt: "2026-09-06T14:00:00.000Z",
      },
    ],
    carriedForwardFrom: null,
    dataFreshnessHours: 3,
    scenario:
      "Negative control — rehab patient within the 3-day cadence, stable.",
  },
  {
    id: "synthetic-patient-010",
    name: "Theo Barnes",
    facility: LS,
    room: "8",
    payer: "Synthetic Medicare",
    statusLabel: "New admission",
    dateOfBirth: "1953-10-11",
    diagnoses: ["Synthetic pneumonia", "Synthetic dehydration"],
    admissionDate: "2026-09-06T09:00:00.000Z",
    lengthOfStayDays: 1,
    ptSessionsPerWeek: null,
    lastPhysicianVisit: null,
    lastNpVisit: null,
    vitals: {
      temperatureC: 39.6,
      spo2: 93,
      systolic: 118,
      diastolic: 70,
      heartRate: 104,
      recordedAt: "2026-09-07T05:15:00.000Z",
    },
    labFlags: [],
    noteText: "Admitted overnight from ED. Febrile, IV fluids started.",
    noteRecordedAt: "2026-09-07T05:20:00.000Z",
    weights: [{ observedAt: "2026-09-06T20:00:00.000Z", valueKg: 74.0 }],
    visitHistory: [],
    carriedForwardFrom: null,
    dataFreshnessHours: 2,
    scenario:
      "New admission on day 1 within the physician window, now febrile at 39.6°C.",
  },
  {
    id: "synthetic-patient-011",
    name: "Gloria Mensah",
    facility: LS,
    room: "19",
    payer: "Synthetic Managed Care",
    statusLabel: "New admission",
    dateOfBirth: "1948-07-07",
    diagnoses: ["Synthetic cellulitis"],
    admissionDate: "2026-09-01T10:00:00.000Z",
    lengthOfStayDays: 6,
    ptSessionsPerWeek: null,
    lastPhysicianVisit: null,
    lastNpVisit: "2026-09-05",
    vitals: normalVitals("2026-09-07T04:40:00.000Z"),
    labFlags: [],
    noteText: "Antibiotics continued, erythema improving.",
    noteRecordedAt: "2026-09-07T04:35:00.000Z",
    weights: [{ observedAt: "2026-09-04T08:00:00.000Z", valueKg: 66.0 }],
    visitHistory: [
      {
        providerRole: "NURSE_PRACTITIONER",
        occurredAt: "2026-09-05T14:00:00.000Z",
      },
    ],
    carriedForwardFrom: null,
    dataFreshnessHours: 5,
    scenario:
      "New admission on day 6 with no physician encounter — 3 days past the 3-day window; an NP interim visit does not satisfy it.",
  },
  {
    id: "synthetic-patient-012",
    name: "Sam Okonkwo",
    facility: OM,
    room: "5",
    payer: "Synthetic Commercial",
    statusLabel: "New admission",
    dateOfBirth: "1959-01-25",
    diagnoses: ["Synthetic UTI"],
    admissionDate: "2026-09-05T09:00:00.000Z",
    lengthOfStayDays: 2,
    ptSessionsPerWeek: null,
    lastPhysicianVisit: "2026-09-06",
    lastNpVisit: null,
    vitals: normalVitals("2026-09-07T04:30:00.000Z"),
    labFlags: [],
    noteText:
      "Seen by physician on admission day. Stable, tolerating oral intake.",
    noteRecordedAt: "2026-09-07T04:25:00.000Z",
    weights: [{ observedAt: "2026-09-05T20:00:00.000Z", valueKg: 71.5 }],
    visitHistory: [
      { providerRole: "PHYSICIAN", occurredAt: "2026-09-06T11:00:00.000Z" },
    ],
    carriedForwardFrom: null,
    dataFreshnessHours: 3,
    scenario:
      "Negative control — new admission already seen by the physician on day 1.",
  },
  {
    id: "synthetic-patient-013",
    name: "Bernice Colton",
    facility: OM,
    room: "14A",
    payer: "Synthetic Medicare",
    statusLabel: "Long-term care",
    dateOfBirth: "1937-05-16",
    diagnoses: ["Synthetic Parkinson disease"],
    admissionDate: "2026-01-20T12:00:00.000Z",
    lengthOfStayDays: 230,
    ptSessionsPerWeek: null,
    lastPhysicianVisit: "2026-07-30",
    lastNpVisit: "2026-09-06",
    vitals: normalVitals("2026-09-07T04:20:00.000Z"),
    labFlags: [],
    noteText: "NP interim visit yesterday, medications reconciled.",
    noteRecordedAt: "2026-09-07T04:15:00.000Z",
    weights: [
      { observedAt: "2026-08-09T08:00:00.000Z", valueKg: 63.0 },
      { observedAt: "2026-09-05T08:00:00.000Z", valueKg: 62.7 },
    ],
    visitHistory: [
      { providerRole: "PHYSICIAN", occurredAt: "2026-07-30T15:00:00.000Z" },
      {
        providerRole: "NURSE_PRACTITIONER",
        occurredAt: "2026-09-06T14:00:00.000Z",
      },
    ],
    carriedForwardFrom: null,
    dataFreshnessHours: 4,
    scenario:
      "NP interim visit yesterday, but the physician is 39 days out — still overdue.",
  },
  {
    id: "synthetic-patient-014",
    name: "Otis Grant",
    facility: OM,
    room: "22",
    payer: "Synthetic Managed Care",
    statusLabel: "Long-term care",
    dateOfBirth: "1941-11-11",
    diagnoses: ["Synthetic COPD"],
    admissionDate: "2026-03-15T12:00:00.000Z",
    lengthOfStayDays: 176,
    ptSessionsPerWeek: null,
    lastPhysicianVisit: "2026-08-29",
    lastNpVisit: "2026-08-29",
    vitals: {
      temperatureC: 37.1,
      spo2: 87,
      systolic: 130,
      diastolic: 78,
      heartRate: 92,
      recordedAt: "2026-09-07T05:25:00.000Z",
    },
    labFlags: [],
    noteText:
      "New oxygen requirement started overnight, 2 L nasal cannula, sats improved to 92 on O2. Respiratory notified.",
    noteRecordedAt: "2026-09-07T05:00:00.000Z",
    weights: [
      { observedAt: "2026-08-11T08:00:00.000Z", valueKg: 76.0 },
      { observedAt: "2026-09-05T08:00:00.000Z", valueKg: 75.6 },
    ],
    visitHistory: [
      { providerRole: "PHYSICIAN", occurredAt: "2026-08-29T15:00:00.000Z" },
    ],
    carriedForwardFrom: null,
    dataFreshnessHours: 2,
    scenario:
      "New oxygen requirement with SpO₂ 87% — respiratory escalation despite recent visit.",
  },
  {
    id: "synthetic-patient-015",
    name: "Lucia Ferraro",
    facility: OM,
    room: "9",
    payer: "Synthetic Medicare",
    statusLabel: "Short-term rehabilitation",
    dateOfBirth: "1955-06-21",
    diagnoses: ["Synthetic spinal compression fracture rehab"],
    admissionDate: "2026-08-13T12:00:00.000Z",
    lengthOfStayDays: 25,
    ptSessionsPerWeek: 3,
    lastPhysicianVisit: "2026-09-02",
    lastNpVisit: "2026-09-05",
    vitals: {
      temperatureC: 38.9,
      spo2: 95,
      systolic: 108,
      diastolic: 64,
      heartRate: 118,
      recordedAt: "2026-09-07T05:10:00.000Z",
    },
    labFlags: [
      {
        analyte: "Lactate",
        value: "2.6 mmol/L",
        flag: "H",
        observedAt: "2026-09-07T04:50:00.000Z",
      },
    ],
    noteText:
      "Febrile and tachycardic this AM, provider notified, query sepsis, blood cultures drawn, fluids started.",
    noteRecordedAt: "2026-09-07T05:05:00.000Z",
    weights: [
      { observedAt: "2026-08-15T08:00:00.000Z", valueKg: 64.0 },
      { observedAt: "2026-09-06T08:00:00.000Z", valueKg: 63.4 },
    ],
    visitHistory: [
      { providerRole: "PHYSICIAN", occurredAt: "2026-09-02T15:00:00.000Z" },
      {
        providerRole: "NURSE_PRACTITIONER",
        occurredAt: "2026-09-05T14:00:00.000Z",
      },
    ],
    carriedForwardFrom: null,
    dataFreshnessHours: 2,
    scenario:
      "Rehab patient within cadence, but febrile and tachycardic with a documented sepsis query.",
  },
  {
    id: "synthetic-patient-016",
    name: "Frank Delgado",
    facility: NW,
    room: "119",
    payer: "Synthetic Commercial",
    statusLabel: "Long-term care",
    dateOfBirth: "1943-08-03",
    diagnoses: ["Synthetic coronary artery disease"],
    admissionDate: "2026-04-10T12:00:00.000Z",
    lengthOfStayDays: 150,
    ptSessionsPerWeek: null,
    lastPhysicianVisit: "2026-08-26",
    lastNpVisit: "2026-08-26",
    vitals: {
      temperatureC: 36.5,
      spo2: 96,
      systolic: 122,
      diastolic: 70,
      heartRate: 46,
      recordedAt: "2026-09-07T05:00:00.000Z",
    },
    labFlags: [],
    noteText:
      "Refusing meds this AM including metoprolol, cardiology follow-up pending.",
    noteRecordedAt: "2026-09-07T04:55:00.000Z",
    weights: [
      { observedAt: "2026-08-10T08:00:00.000Z", valueKg: 85.0 },
      { observedAt: "2026-09-05T08:00:00.000Z", valueKg: 84.6 },
    ],
    visitHistory: [
      { providerRole: "PHYSICIAN", occurredAt: "2026-08-26T15:00:00.000Z" },
    ],
    carriedForwardFrom: null,
    dataFreshnessHours: 3,
    scenario: "Bradycardic at 46 bpm and refusing cardiac medications.",
  },
  {
    id: "synthetic-patient-017",
    name: "Ada Whitfield",
    facility: NW,
    room: "207",
    payer: "Synthetic Medicare",
    statusLabel: "Long-term care",
    dateOfBirth: "1936-02-14",
    diagnoses: ["Synthetic failure to thrive", "Synthetic depression"],
    admissionDate: "2026-02-25T12:00:00.000Z",
    lengthOfStayDays: 194,
    ptSessionsPerWeek: null,
    lastPhysicianVisit: "2026-08-24",
    lastNpVisit: "2026-08-24",
    vitals: normalVitals("2026-09-07T05:00:00.000Z"),
    labFlags: [],
    noteText: "Poor appetite continues, supplements offered with meals.",
    noteRecordedAt: "2026-09-07T04:50:00.000Z",
    weights: [
      { observedAt: "2026-08-08T08:00:00.000Z", valueKg: 62.0 },
      { observedAt: "2026-09-01T08:00:00.000Z", valueKg: 58.6 },
      { observedAt: "2026-09-06T08:00:00.000Z", valueKg: 58.2 },
    ],
    visitHistory: [
      { providerRole: "PHYSICIAN", occurredAt: "2026-08-24T15:00:00.000Z" },
    ],
    carriedForwardFrom: null,
    dataFreshnessHours: 4,
    scenario:
      "Gradual 6.1% weight loss over four weeks — chronic weight-change signal.",
  },
  {
    id: "synthetic-patient-018",
    name: "Nathan Brooks",
    facility: LS,
    room: "41",
    payer: "Synthetic Managed Care",
    statusLabel: "Long-term care",
    dateOfBirth: "1950-09-09",
    diagnoses: ["Synthetic hypertension", "Synthetic chronic pain"],
    admissionDate: "2026-03-30T12:00:00.000Z",
    lengthOfStayDays: 161,
    ptSessionsPerWeek: null,
    lastPhysicianVisit: "2026-07-28",
    lastNpVisit: "2026-08-18",
    vitals: {
      temperatureC: 36.8,
      spo2: 96,
      systolic: 186,
      diastolic: 96,
      heartRate: 82,
      recordedAt: "2026-09-07T05:00:00.000Z",
    },
    labFlags: [],
    noteText:
      "Carried over from yesterday's list, not yet seen. BP elevated on AM check.",
    noteRecordedAt: "2026-09-07T05:00:00.000Z",
    weights: [
      { observedAt: "2026-08-10T08:00:00.000Z", valueKg: 90.0 },
      { observedAt: "2026-09-05T08:00:00.000Z", valueKg: 90.4 },
    ],
    visitHistory: [
      { providerRole: "PHYSICIAN", occurredAt: "2026-07-28T15:00:00.000Z" },
      {
        providerRole: "NURSE_PRACTITIONER",
        occurredAt: "2026-08-18T14:00:00.000Z",
      },
    ],
    carriedForwardFrom: "2026-09-06",
    dataFreshnessHours: 3,
    scenario:
      "Carried forward from yesterday's list unseen; compliance gap plus an elevated BP push it to high priority.",
  },
  {
    id: "synthetic-patient-019",
    name: "Iris Bloom",
    facility: LS,
    room: "27",
    payer: "Synthetic Commercial",
    statusLabel: "Long-term care",
    dateOfBirth: "1947-12-01",
    diagnoses: ["Synthetic stable diabetes"],
    admissionDate: "2026-04-20T12:00:00.000Z",
    lengthOfStayDays: 140,
    ptSessionsPerWeek: null,
    lastPhysicianVisit: "2026-08-27",
    lastNpVisit: null,
    vitals: normalVitals("2026-09-05T12:00:00.000Z"),
    labFlags: [],
    noteText: "No new issues. Blood sugars within target range.",
    noteRecordedAt: "2026-09-05T12:00:00.000Z",
    weights: [
      { observedAt: "2026-08-09T08:00:00.000Z", valueKg: 73.0 },
      { observedAt: "2026-09-03T08:00:00.000Z", valueKg: 72.8 },
    ],
    visitHistory: [
      { providerRole: "PHYSICIAN", occurredAt: "2026-08-27T15:00:00.000Z" },
    ],
    carriedForwardFrom: null,
    dataFreshnessHours: 43,
    scenario:
      "Source record 43 hours stale — flagged for data quality, no clinical signal.",
  },
  {
    id: "synthetic-patient-020",
    name: "Ceci Vargas",
    facility: OM,
    room: "17",
    payer: "Synthetic Medicare",
    statusLabel: "Long-term care",
    dateOfBirth: "1952-04-18",
    diagnoses: ["Synthetic hypothyroidism"],
    admissionDate: "2026-05-01T12:00:00.000Z",
    lengthOfStayDays: 129,
    ptSessionsPerWeek: null,
    lastPhysicianVisit: "2026-08-31",
    lastNpVisit: null,
    vitals: null,
    labFlags: [],
    noteText:
      "Nursing reports comfortable day. Vitals monitor offline, manual recheck scheduled.",
    noteRecordedAt: "2026-09-07T04:40:00.000Z",
    weights: [
      { observedAt: "2026-08-12T08:00:00.000Z", valueKg: 67.0 },
      { observedAt: "2026-09-05T08:00:00.000Z", valueKg: 66.9 },
    ],
    visitHistory: [
      { providerRole: "PHYSICIAN", occurredAt: "2026-08-31T15:00:00.000Z" },
    ],
    carriedForwardFrom: null,
    dataFreshnessHours: 6,
    scenario: "No vitals in the last sync cycle — data-quality flag only.",
  },
  {
    id: "synthetic-patient-021",
    name: "Leon Hartley",
    facility: OM,
    room: "3",
    payer: "Synthetic Managed Care",
    statusLabel: "Long-term care",
    dateOfBirth: "1939-03-27",
    diagnoses: ["Synthetic vascular dementia"],
    admissionDate: "2026-01-15T12:00:00.000Z",
    lengthOfStayDays: 235,
    ptSessionsPerWeek: null,
    lastPhysicianVisit: "2026-08-08",
    lastNpVisit: "2026-08-25",
    vitals: normalVitals("2026-09-07T04:35:00.000Z"),
    labFlags: [],
    noteText: "Stable. Routine care continued.",
    noteRecordedAt: "2026-09-07T04:30:00.000Z",
    weights: [
      { observedAt: "2026-08-10T08:00:00.000Z", valueKg: 70.0 },
      { observedAt: "2026-09-05T08:00:00.000Z", valueKg: 69.9 },
    ],
    visitHistory: [
      { providerRole: "PHYSICIAN", occurredAt: "2026-08-08T15:00:00.000Z" },
      {
        providerRole: "NURSE_PRACTITIONER",
        occurredAt: "2026-08-25T14:00:00.000Z",
      },
    ],
    carriedForwardFrom: null,
    dataFreshnessHours: 4,
    scenario:
      "Exactly 30 days since the physician visit — boundary case, due soon not overdue.",
  },
  {
    id: "synthetic-patient-022",
    name: "Marta Kilby",
    facility: OM,
    room: "11B",
    payer: "Synthetic Commercial",
    statusLabel: "Long-term care",
    dateOfBirth: "1945-10-05",
    diagnoses: ["Synthetic chronic bronchitis"],
    admissionDate: "2026-04-05T12:00:00.000Z",
    lengthOfStayDays: 155,
    ptSessionsPerWeek: null,
    lastPhysicianVisit: "2026-08-30",
    lastNpVisit: null,
    vitals: {
      temperatureC: 38.0,
      spo2: 95,
      systolic: 128,
      diastolic: 74,
      heartRate: 88,
      recordedAt: "2026-09-07T05:00:00.000Z",
    },
    labFlags: [],
    noteText:
      "Low-grade temp on routine check, resident asymptomatic, monitoring.",
    noteRecordedAt: "2026-09-07T04:55:00.000Z",
    weights: [
      { observedAt: "2026-08-11T08:00:00.000Z", valueKg: 61.0 },
      { observedAt: "2026-09-05T08:00:00.000Z", valueKg: 61.1 },
    ],
    visitHistory: [
      { providerRole: "PHYSICIAN", occurredAt: "2026-08-30T15:00:00.000Z" },
    ],
    carriedForwardFrom: null,
    dataFreshnessHours: 3,
    scenario:
      "Temperature exactly at the 38.0°C threshold — inclusive boundary fires the signal.",
  },
  {
    id: "synthetic-patient-023",
    name: "Dwight Ferris",
    facility: NW,
    room: "212",
    payer: "Synthetic Medicare",
    statusLabel: "Long-term care",
    dateOfBirth: "1934-07-19",
    diagnoses: ["Synthetic CAD", "Synthetic CKD"],
    admissionDate: "2026-02-01T12:00:00.000Z",
    lengthOfStayDays: 218,
    ptSessionsPerWeek: null,
    lastPhysicianVisit: "2026-08-28",
    lastNpVisit: "2026-08-28",
    vitals: {
      temperatureC: 36.9,
      spo2: 96,
      systolic: 138,
      diastolic: 80,
      heartRate: 90,
      recordedAt: "2026-09-07T05:20:00.000Z",
    },
    labFlags: [],
    noteText:
      "Hospital return this morning after ED visit for chest pain, readmitted to unit, telemetry ordered.",
    noteRecordedAt: "2026-09-07T05:25:00.000Z",
    weights: [
      { observedAt: "2026-08-10T08:00:00.000Z", valueKg: 77.0 },
      { observedAt: "2026-09-05T08:00:00.000Z", valueKg: 76.7 },
    ],
    visitHistory: [
      { providerRole: "PHYSICIAN", occurredAt: "2026-08-28T15:00:00.000Z" },
    ],
    carriedForwardFrom: null,
    dataFreshnessHours: 2,
    scenario:
      "Returned from hospital this morning — critical transfer keyword.",
  },
  {
    id: "synthetic-patient-024",
    name: "Rosa Lindqvist",
    facility: LS,
    room: "36",
    payer: "Synthetic Managed Care",
    statusLabel: "Long-term care",
    dateOfBirth: "1946-01-30",
    diagnoses: ["Synthetic diabetes", "Synthetic peripheral vascular disease"],
    admissionDate: "2026-03-20T12:00:00.000Z",
    lengthOfStayDays: 171,
    ptSessionsPerWeek: null,
    lastPhysicianVisit: "2026-08-25",
    lastNpVisit: "2026-08-25",
    vitals: normalVitals("2026-09-07T04:45:00.000Z"),
    labFlags: [],
    noteText:
      "Stage 2 pressure ulcer noted on sacrum during care, wound care team consulted, offloading in place.",
    noteRecordedAt: "2026-09-07T04:40:00.000Z",
    weights: [
      { observedAt: "2026-08-11T08:00:00.000Z", valueKg: 69.0 },
      { observedAt: "2026-09-05T08:00:00.000Z", valueKg: 68.7 },
    ],
    visitHistory: [
      { providerRole: "PHYSICIAN", occurredAt: "2026-08-25T15:00:00.000Z" },
    ],
    carriedForwardFrom: null,
    dataFreshnessHours: 4,
    scenario:
      "Stage 2 pressure ulcer with wound-care consult — two note keywords.",
  },
  {
    id: "synthetic-patient-025",
    name: "Curtis Vance",
    facility: OM,
    room: "20",
    payer: "Synthetic Medicare",
    statusLabel: "Long-term care",
    dateOfBirth: "1942-09-12",
    diagnoses: ["Synthetic dementia", "Synthetic epilepsy"],
    admissionDate: "2026-02-18T12:00:00.000Z",
    lengthOfStayDays: 201,
    ptSessionsPerWeek: null,
    lastPhysicianVisit: "2026-08-27",
    lastNpVisit: "2026-08-27",
    vitals: normalVitals("2026-09-07T05:00:00.000Z"),
    labFlags: [],
    noteText:
      "New altered mental status overnight, more somnolent than baseline, likely delirium, workup initiated.",
    noteRecordedAt: "2026-09-07T04:20:00.000Z",
    weights: [
      { observedAt: "2026-08-10T08:00:00.000Z", valueKg: 72.0 },
      { observedAt: "2026-09-05T08:00:00.000Z", valueKg: 71.8 },
    ],
    visitHistory: [
      { providerRole: "PHYSICIAN", occurredAt: "2026-08-27T15:00:00.000Z" },
    ],
    carriedForwardFrom: null,
    dataFreshnessHours: 3,
    scenario: "New altered mental status overnight — neurological escalation.",
  },
];
