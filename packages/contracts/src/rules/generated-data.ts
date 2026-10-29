import type { SyntheticPatientSource } from "./source-data.js";

/**
 * Procedurally generated synthetic patients for volume / pagination testing.
 * Deterministic (seeded), so the dataset is stable across builds. These sit
 * after the 25 hand-authored scenario records in the rounding list.
 */

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FACILITIES = [
  "Northwind Care Center",
  "Lakeside Skilled Nursing",
  "Oak Manor",
  "Riverside Rehabilitation",
  "Maple Grove Health",
  "Cedar Point Care",
];
const FIRST = [
  "James",
  "Mary",
  "Robert",
  "Patricia",
  "John",
  "Jennifer",
  "Michael",
  "Linda",
  "David",
  "Elizabeth",
  "William",
  "Barbara",
  "Richard",
  "Susan",
  "Joseph",
  "Jessica",
  "Thomas",
  "Sarah",
  "Charles",
  "Karen",
  "Frank",
  "Nancy",
  "Gerald",
  "Lisa",
  "Raymond",
  "Betty",
  "Harold",
  "Dorothy",
  "Arthur",
  "Sandra",
  "Eugene",
  "Ashley",
  "Ralph",
  "Kimberly",
  "Roy",
  "Donna",
  "Louis",
  "Carol",
  "Philip",
  "Michelle",
  "Howard",
  "Amanda",
  "Alan",
  "Melissa",
  "Ernest",
  "Deborah",
  "Clarence",
  "Stephanie",
];
const LAST = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Gonzalez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
  "Perez",
  "Thompson",
  "White",
  "Harris",
  "Sanchez",
  "Clark",
  "Ramirez",
  "Lewis",
  "Robinson",
  "Walker",
  "Young",
  "Allen",
  "King",
  "Wright",
  "Scott",
  "Torres",
  "Nguyen",
  "Hill",
  "Flores",
  "Green",
  "Adams",
  "Nelson",
  "Baker",
  "Hall",
  "Rivera",
  "Campbell",
  "Mitchell",
];
const PAYERS = ["Medicare", "Managed Care", "Commercial", "Medicaid"];
const BENIGN_NOTES = [
  "Resident stable overnight, no acute concerns.",
  "Participating in scheduled therapies, comfortable.",
  "Nursing reports a quiet day, vitals at baseline.",
  "No new complaints, tolerating diet well.",
  "Sleeping well, pain controlled with routine medication.",
  "Family visited, resident in good spirits.",
];
const KEYWORD_NOTES = [
  "Resident had a fall in the bathroom, no injury noted, MD aware.",
  "Small wound observed on left heel, wound care to assess.",
  "Refusing meds this morning, will re-approach later.",
  "Query pressure ulcer on coccyx, staged by wound nurse.",
  "Reported hospital return after ED visit, back on unit.",
  "New altered mental status this shift, workup started.",
];
const DIAGNOSES = [
  "Hypertension",
  "Diabetes",
  "COPD",
  "Heart failure",
  "Dementia",
  "Chronic kidney disease",
  "Osteoarthritis",
  "Atrial fibrillation",
  "Post-op recovery",
  "Peripheral vascular disease",
];

const NOW_MS = Date.parse("2026-09-07T07:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

function isoDate(daysAgo: number): string {
  return new Date(NOW_MS - daysAgo * DAY).toISOString().slice(0, 10);
}
function isoTime(daysAgo: number, hour = 5): string {
  const d = new Date(NOW_MS - daysAgo * DAY);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

/** Display values for synthetic lab results; the engine reads only the flag. */
const LAB_PANEL = [
  {
    analyte: "Potassium",
    unit: "mmol/L",
    decimals: 1,
    high: [5.3, 5.9],
    critical: [6.3, 7.0],
  },
  {
    analyte: "Sodium",
    unit: "mmol/L",
    decimals: 0,
    high: [147, 152],
    critical: [157, 162],
  },
  {
    analyte: "Creatinine",
    unit: "mg/dL",
    decimals: 1,
    high: [1.6, 2.4],
    critical: [3.6, 5.2],
  },
  {
    analyte: "Glucose",
    unit: "mg/dL",
    decimals: 0,
    high: [220, 320],
    critical: [420, 560],
  },
] as const;

export function generateSyntheticPatients(
  count: number,
  startIndex: number,
): SyntheticPatientSource[] {
  const rand = mulberry32(0x5a17d0 + startIndex);
  const pick = <T>(arr: readonly T[]): T =>
    arr[Math.floor(rand() * arr.length)] as T;
  const range = (lo: number, hi: number) => lo + rand() * (hi - lo);
  const chance = (p: number) => rand() < p;

  const out: SyntheticPatientSource[] = [];
  for (let i = 0; i < count; i += 1) {
    const n = startIndex + i;
    // Daily incidence is calibrated to a typical post-acute census: roughly
    // one resident in seven needs a visit on any given day.
    const isRehab = chance(0.22);
    // ~1% of residents were admitted in the last few days and have not yet
    // had their initial physician visit.
    const isNewAdmission = chance(0.012);
    const los = isNewAdmission
      ? Math.round(range(0, 5))
      : isRehab
        ? Math.round(range(6, 60))
        : Math.round(range(90, 400));
    const admissionDaysAgo = los;

    // Compliance spread: providers mostly visit ahead of the window, so only
    // a small share is due or overdue on any given day.
    const roll = rand();
    let lastPhysDaysAgo: number | null;
    let lastNpDaysAgo: number | null;
    if (isNewAdmission) {
      lastPhysDaysAgo = null;
      lastNpDaysAgo = chance(0.5) ? Math.min(1, los) : null;
    } else if (isRehab) {
      // Short-term / rehab cadence is every ~3 days.
      if (roll < 0.62) lastNpDaysAgo = 1;
      else if (roll < 0.84) lastNpDaysAgo = 2;
      else if (roll < 0.96) lastNpDaysAgo = 3;
      else lastNpDaysAgo = Math.round(range(4, 7));
      lastPhysDaysAgo = Math.round(range(lastNpDaysAgo, 6));
    } else {
      if (roll < 0.003) lastPhysDaysAgo = Math.round(range(46, 66));
      else if (roll < 0.013) lastPhysDaysAgo = Math.round(range(31, 44));
      else if (roll < 0.03) lastPhysDaysAgo = Math.round(range(25, 30));
      else lastPhysDaysAgo = Math.round(range(1, 23));
      lastNpDaysAgo = chance(0.55) ? Math.round(range(1, 20)) : null;
    }

    const abnormalVitals = chance(0.015);
    const vitals = chance(0.005)
      ? null
      : {
          temperatureC:
            abnormalVitals && chance(0.4)
              ? Number(range(38.0, 39.8).toFixed(1))
              : Number(range(36.3, 37.4).toFixed(1)),
          spo2:
            abnormalVitals && chance(0.4)
              ? Math.round(range(86, 92))
              : Math.round(range(94, 99)),
          systolic:
            abnormalVitals && chance(0.5)
              ? Math.round(range(180, 210))
              : Math.round(range(108, 140)),
          diastolic: Math.round(range(62, 92)),
          heartRate:
            abnormalVitals && chance(0.3)
              ? Math.round(range(110, 132))
              : Math.round(range(58, 96)),
          recordedAt: isoTime(0, 5),
        };

    // Same three draws as before (panel, flag, value), so the rest of the
    // generated population is unchanged.
    const labFlags: SyntheticPatientSource["labFlags"] = [];
    if (chance(0.008)) {
      const lab = pick(LAB_PANEL);
      const critical = chance(0.4);
      const [lo, hi] = critical ? lab.critical : lab.high;
      labFlags.push({
        analyte: lab.analyte,
        value: `${range(lo, hi).toFixed(lab.decimals)} ${lab.unit}`,
        flag: critical ? "HH" : "H",
        observedAt: isoTime(0, 4),
      });
    }

    const hasKeyword = chance(0.012);
    const weightBase = range(52, 96);
    const weightDrift = chance(0.01)
      ? weightBase * (chance(0.5) ? 1.05 : 0.94)
      : weightBase * range(0.99, 1.01);

    out.push({
      id: `patient-${String(n).padStart(4, "0")}`,
      name: `${pick(FIRST)} ${pick(LAST)}`,
      facility: pick(FACILITIES),
      room: `${Math.round(range(1, 4))}${String.fromCharCode(65 + Math.floor(rand() * 3))}-${Math.round(range(1, 40))}`,
      payer: pick(PAYERS),
      statusLabel:
        isRehab || isNewAdmission
          ? "Short-term rehabilitation"
          : "Long-term care",
      dateOfBirth: isoDate(Math.round(range(60, 100) * 365)),
      diagnoses: [pick(DIAGNOSES), pick(DIAGNOSES)].filter(
        (d, idx, a) => a.indexOf(d) === idx,
      ),
      admissionDate: isoTime(admissionDaysAgo, 12),
      lengthOfStayDays: los,
      ptSessionsPerWeek:
        isRehab && !isNewAdmission ? Math.round(range(3, 6)) : null,
      lastPhysicianVisit:
        lastPhysDaysAgo === null ? null : isoDate(lastPhysDaysAgo),
      lastNpVisit: lastNpDaysAgo === null ? null : isoDate(lastNpDaysAgo),
      vitals,
      labFlags,
      noteText: hasKeyword ? pick(KEYWORD_NOTES) : pick(BENIGN_NOTES),
      noteRecordedAt: isoTime(0, 5),
      weights: [
        { observedAt: isoTime(28, 8), valueKg: Number(weightBase.toFixed(1)) },
        { observedAt: isoTime(2, 8), valueKg: Number(weightDrift.toFixed(1)) },
      ],
      visitHistory: [
        ...(lastPhysDaysAgo === null
          ? []
          : [
              {
                providerRole: "PHYSICIAN" as const,
                occurredAt: isoTime(lastPhysDaysAgo, 15),
              },
            ]),
        ...(lastNpDaysAgo === null
          ? []
          : [
              {
                providerRole: "NURSE_PRACTITIONER" as const,
                occurredAt: isoTime(lastNpDaysAgo, 14),
              },
            ]),
      ],
      carriedForwardFrom: chance(0.008) ? isoDate(1) : null,
      dataFreshnessHours: chance(0.004) ? range(31, 60) : range(1, 8),
      scenario: isNewAdmission
        ? "Recently admitted; initial physician visit pending."
        : isRehab
          ? "Short-term rehabilitation stay with therapy several times a week."
          : "Long-term care patient on routine monthly physician visits.",
    });
  }
  return out;
}
