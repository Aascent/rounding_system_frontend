import type { SyncHistory, SyncStatus } from "@smart-rounding/contracts";

/** Admin dashboard/system display helpers, built from the loaded data. */

export const SYSTEM_STATUS: ReadonlyArray<
  readonly [label: string, detail: string]
> = [
  ["API service", "Running"],
  ["Database", "Healthy"],
];

const formatCount = (value: number) => value.toLocaleString("en-US");

export function formatRunTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function formatRunDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function statusLabel(run: SyncStatus): string {
  if (run.status === "RUNNING") return "Running";
  if (run.status === "FAILED") return "Failed";
  return run.errors > 0 ? "Completed with warning" : "Succeeded";
}

export const JOB_HISTORY_COLUMNS = [
  "Date",
  "Run time",
  "Patients",
  "On lists",
  "Errors",
  "Status",
] as const;

/** One table row per sync run, newest first. */
export function jobHistoryRows(
  history: SyncHistory,
): ReadonlyArray<readonly [string, string, string, string, number, string]> {
  return history.map(
    (run) =>
      [
        formatRunDate(run.startedAt),
        formatRunTime(run.startedAt),
        run.status === "RUNNING" ? "—" : formatCount(run.recordsProcessed),
        run.status === "RUNNING" ? "—" : formatCount(run.onLists),
        run.errors,
        statusLabel(run),
      ] as const,
  );
}
