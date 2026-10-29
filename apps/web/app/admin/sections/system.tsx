import type { SyncHistory, SyncStatus } from "@smart-rounding/contracts";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { JOB_HISTORY_COLUMNS, jobHistoryRows } from "./fixtures";
import { DescRow, Panel } from "./ui";

export function SystemSection({
  sync,
  history,
  onTriggerSync,
}: Readonly<{
  sync: SyncStatus;
  history: SyncHistory;
  onTriggerSync: () => void;
}>) {
  const rows: ReadonlyArray<readonly [string, string | number]> = [
    ["Trigger", sync.trigger],
    ["Started", new Date(sync.startedAt).toLocaleString()],
    [
      "Completed",
      sync.completedAt ? new Date(sync.completedAt).toLocaleString() : "—",
    ],
    ["Records processed", sync.recordsProcessed],
    ["Validation rejects", sync.validationRejects],
    ["Errors", sync.errors],
  ];
  return (
    <div className="grid gap-4">
      <Panel className="flex flex-col justify-between gap-7 md:flex-row md:items-start">
        <div className="w-full md:max-w-[600px]">
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-primary">
            Current status
          </p>
          <h2 className="mb-3 text-lg font-semibold">{sync.status}</h2>
          <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            {rows.map(([term, value]) => (
              <DescRow
                key={term}
                term={term}
                className="border-t border-border py-3 first:border-t-0 sm:[&:nth-child(2)]:border-t-0"
              >
                {value}
              </DescRow>
            ))}
          </dl>
        </div>
        <Button
          type="button"
          onClick={onTriggerSync}
          disabled={sync.status === "RUNNING"}
        >
          {sync.status === "RUNNING" ? "Sync in progress" : "Start manual sync"}
        </Button>
      </Panel>
      <Panel>
        <h2 className="text-lg font-semibold">Daily job history</h2>
        <Table className="mt-3">
          <TableHeader>
            <TableRow className="border-0">
              {JOB_HISTORY_COLUMNS.map((c) => (
                <TableHead key={c}>
                  {c === "Patients" ? "Patients processed" : c}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobHistoryRows(history).map((run, row) => (
              <TableRow key={history[row]?.id ?? row}>
                {run.map((value, index) => (
                  <TableCell key={index}>{value}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </div>
  );
}
