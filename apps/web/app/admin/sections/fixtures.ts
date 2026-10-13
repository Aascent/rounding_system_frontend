/** Static illustrative content for the Admin dashboard/facilities/system views. */

export const FACILITIES: ReadonlyArray<
  readonly [name: string, address: string, providers: number]
> = [
  ["Northwind Care Center", "123 Sample Avenue", 8],
  ["Lakeside Skilled Nursing", "789 Demo Lane", 4],
  ["Oak Manor", "456 Example Street", 5],
];

export const SYSTEM_STATUS: ReadonlyArray<
  readonly [label: string, detail: string]
> = [
  ["EMR connection", "Connected · last sync 6:45 AM"],
  ["API service", "Running · synthetic mode"],
  ["Database", "Healthy · fixture store"],
];

export const JOB_HISTORY: ReadonlyArray<
  readonly [string, string, number, number, number, string]
> = [
  ["Sep 3, 2026", "6:45 AM", 24, 9, 0, "Succeeded"],
  ["Sep 2, 2026", "6:43 AM", 22, 7, 0, "Succeeded"],
  ["Sep 1, 2026", "6:46 AM", 25, 11, 1, "Completed with warning"],
  ["Aug 31, 2026", "6:44 AM", 23, 8, 0, "Succeeded"],
];

export const JOB_HISTORY_COLUMNS = [
  "Date",
  "Run time",
  "Patients",
  "Flags",
  "Errors",
  "Status",
] as const;
