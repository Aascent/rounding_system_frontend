"use client";
import { paginate, type AuditEvent } from "@smart-rounding/contracts";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { SelectField } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Panel, PanelHeading } from "./ui";

const ALL = "ALL";

function toCsv(rows: readonly AuditEvent[]): string {
  return [
    "occurredAt,actor,eventType,outcome,summary",
    ...rows.map((row) =>
      [row.occurredAt, row.actor, row.eventType, row.outcome, row.summary]
        .map((value) => `"${value.replaceAll('"', '""')}"`)
        .join(","),
    ),
  ].join("\n");
}

function downloadCsv(text: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function AuditSection({ events }: Readonly<{ events: AuditEvent[] }>) {
  const [query, setQuery] = useState("");
  const [actor, setActor] = useState(ALL);
  const [eventType, setEventType] = useState(ALL);
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);

  const actors = useMemo(
    () => [...new Set(events.map((e) => e.actor))],
    [events],
  );
  const types = useMemo(
    () => [...new Set(events.map((e) => e.eventType))],
    [events],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return events.filter(
      (e) =>
        (actor === ALL || e.actor === actor) &&
        (eventType === ALL || e.eventType === eventType) &&
        (!date || e.occurredAt.startsWith(date)) &&
        `${e.actor} ${e.eventType} ${e.summary}`.toLowerCase().includes(q),
    );
  }, [actor, date, eventType, events, query]);

  const pageData = paginate(filtered, { page, pageSize: 25 });

  function resetToFirstPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <Panel>
      <PanelHeading
        title="Audit log"
        description="Synthetic operational events with no patient data."
        action={
          <Button
            type="button"
            size="sm"
            onClick={() => downloadCsv(toCsv(filtered), "synthetic-audit.csv")}
          >
            Export CSV
          </Button>
        }
      />
      <Label className="my-5 max-w-[420px]">
        <span>Filter events</span>
        <Input
          value={query}
          onChange={(event) => resetToFirstPage(setQuery)(event.target.value)}
          placeholder="Actor, event, or summary"
        />
      </Label>
      <div className="mb-4 grid gap-3.5 sm:grid-cols-3">
        <Label>
          <span>User</span>
          <SelectField
            ariaLabel="User"
            value={actor}
            onValueChange={resetToFirstPage(setActor)}
            options={[
              { value: ALL, label: "All users" },
              ...actors.map((a) => ({ value: a, label: a })),
            ]}
          />
        </Label>
        <Label>
          <span>Event type</span>
          <SelectField
            ariaLabel="Event type"
            value={eventType}
            onValueChange={resetToFirstPage(setEventType)}
            options={[
              { value: ALL, label: "All event types" },
              ...types.map((t) => ({ value: t, label: t })),
            ]}
          />
        </Label>
        <Label>
          <span>Date</span>
          <Input
            type="date"
            value={date}
            onChange={(event) => resetToFirstPage(setDate)(event.target.value)}
          />
        </Label>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-0">
            <TableHead>Time</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Outcome</TableHead>
            <TableHead>Summary</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageData.items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                {new Date(item.occurredAt).toLocaleString()}
              </TableCell>
              <TableCell>{item.actor}</TableCell>
              <TableCell>{item.eventType}</TableCell>
              <TableCell>{item.outcome}</TableCell>
              <TableCell>{item.summary}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-4">
        <Pagination
          page={pageData.page}
          totalPages={pageData.totalPages}
          total={pageData.total}
          pageSize={pageData.pageSize}
          itemLabel="events"
          onPageChange={setPage}
        />
      </div>
    </Panel>
  );
}
