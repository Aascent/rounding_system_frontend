import {
  SYNTHETIC_NOW,
  roundingFacilities,
  syntheticCensus,
  syntheticRoundingCandidates,
  syntheticSyncStatus,
} from "@smart-rounding/contracts";

/**
 * Admin dashboard/facilities/system content. Counts are derived from the
 * same rounding dataset the provider views use, so every screen agrees.
 */

const ADDRESSES: Readonly<Record<string, string>> = {
  "Cedar Point Care": "2140 Cedar Point Road",
  "Lakeside Skilled Nursing": "789 Lakeshore Drive",
  "Maple Grove Health": "315 Maple Grove Parkway",
  "Northwind Care Center": "123 Northwind Avenue",
  "Oak Manor": "456 Oak Manor Street",
  "Riverside Rehabilitation": "88 Riverside Boulevard",
};

const formatCount = (value: number) => value.toLocaleString("en-US");

export const FACILITIES: ReadonlyArray<
  readonly [name: string, address: string, patients: number]
> = roundingFacilities.map(
  (name) =>
    [
      name,
      ADDRESSES[name] ?? "Address on file",
      syntheticCensus.byFacility[name] ?? 0,
    ] as const,
);

export const SYSTEM_STATUS: ReadonlyArray<
  readonly [label: string, detail: string]
> = [
  ["EMR connection", "Connected · last sync 6:45 AM"],
  ["API service", "Running"],
  ["Database", "Healthy"],
];

/** Patients the engine put on today's provider lists. */
export const LISTED_TODAY = syntheticRoundingCandidates.length;

// Day-to-day census variation for the earlier runs, newest first.
const RUN_VARIATION = [
  { time: "6:45 AM", patients: 0, flags: 0, errors: 0 },
  { time: "6:43 AM", patients: 6, flags: -6, errors: 0 },
  { time: "6:46 AM", patients: 11, flags: 9, errors: 0 },
  { time: "6:44 AM", patients: 4, flags: 3, errors: 1 },
  { time: "6:45 AM", patients: 15, flags: -11, errors: 0 },
  { time: "6:42 AM", patients: 9, flags: 7, errors: 0 },
  { time: "6:47 AM", patients: 13, flags: -4, errors: 0 },
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export const JOB_HISTORY: ReadonlyArray<
  readonly [string, string, string, string, number, string]
> = RUN_VARIATION.map((run, daysAgo) => {
  const date = new Date(Date.parse(SYNTHETIC_NOW) - daysAgo * DAY_MS);
  return [
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }),
    run.time,
    formatCount(syntheticSyncStatus.recordsProcessed - run.patients),
    formatCount(LISTED_TODAY - run.flags),
    run.errors,
    run.errors > 0 ? "Completed with warning" : "Succeeded",
  ] as const;
});

export const JOB_HISTORY_COLUMNS = [
  "Date",
  "Run time",
  "Patients",
  "On lists",
  "Errors",
  "Status",
] as const;
