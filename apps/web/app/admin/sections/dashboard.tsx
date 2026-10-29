import type {
  KeywordEntry,
  ManagedUser,
  SyncStatus,
  FacilitySummary,
  SyncHistory,
} from "@smart-rounding/contracts";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MetricCard, MetricGrid } from "@/components/page";
import {
  JOB_HISTORY_COLUMNS,
  SYSTEM_STATUS,
  formatRunTime,
  jobHistoryRows,
} from "./fixtures";
import { AddButton, KeywordToggle, Panel, PanelHeading } from "./ui";

const panelLink = "text-[0.78rem] font-bold text-primary hover:underline";

export function DashboardSection({
  users,
  keywords,
  sync,
  census,
  facilities,
  history,
  onAddUser,
  onAddKeyword,
  onToggleKeyword,
}: Readonly<{
  users: ManagedUser[];
  keywords: KeywordEntry[];
  sync: SyncStatus;
  census: Readonly<{ patients: number; onListsToday: number }>;
  facilities: readonly FacilitySummary[];
  history: SyncHistory;
  onAddUser: () => void;
  onAddKeyword: () => void;
  onToggleKeyword: (id: string) => void;
}>) {
  return (
    <section className="grid gap-4">
      <MetricGrid className="mb-0 lg:grid-cols-5">
        <MetricCard
          label="System status"
          value="Connected"
          valueClassName="text-2xl"
          hint="Data service online"
        />
        <MetricCard
          label="Last job run"
          value={formatRunTime(
            history.find((run) => run.status !== "RUNNING")?.completedAt ??
              null,
          )}
          valueClassName="text-2xl"
          hint="Daily synchronization"
        />
        <MetricCard
          label="Total patients"
          value={census.patients.toLocaleString("en-US")}
          hint={`${census.onListsToday.toLocaleString("en-US")} on today's rounding lists`}
        />
        <MetricCard
          label="Active keywords"
          value={keywords.filter((k) => k.active).length}
          hint="Review library"
        />
        <MetricCard
          label="Active users"
          value={users.filter((u) => u.status === "ACTIVE").length}
          hint="Across all roles"
        />
      </MetricGrid>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-4">
          <PanelHeading
            title="User management"
            action={<AddButton label="Add user" onClick={onAddUser} />}
          />
          <Table className="mt-3 text-[0.78rem]">
            <TableHeader>
              <TableRow className="border-0">
                <TableHead className="px-2 py-2">Name</TableHead>
                <TableHead className="px-2 py-2">Role</TableHead>
                <TableHead className="px-2 py-2">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.slice(0, 6).map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="min-w-[145px] px-2 py-2">
                    <strong>{user.name}</strong>
                    <span className="mt-0.5 block text-muted-foreground">
                      {user.email}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 py-2">
                    {user.role.replaceAll("_", " ")}
                  </TableCell>
                  <TableCell className="px-2 py-2">
                    <Badge
                      tone={user.status === "ACTIVE" ? "success" : "neutral"}
                      size="sm"
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>

        <Panel className="p-4">
          <PanelHeading
            title="Keyword library"
            action={<AddButton label="Add keyword" onClick={onAddKeyword} />}
          />
          <Table className="mt-3 text-[0.78rem]">
            <TableHeader>
              <TableRow className="border-0">
                <TableHead className="px-2 py-2">Keyword</TableHead>
                <TableHead className="px-2 py-2">Category</TableHead>
                <TableHead className="px-2 py-2">Matches</TableHead>
                <TableHead className="px-2 py-2">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keywords.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="px-2 py-2">
                    <strong>{item.keyword}</strong>
                  </TableCell>
                  <TableCell className="px-2 py-2">{item.category}</TableCell>
                  <TableCell className="px-2 py-2">{item.matches}</TableCell>
                  <TableCell className="px-2 py-2">
                    <KeywordToggle
                      active={item.active}
                      label={item.keyword}
                      onToggle={() => onToggleKeyword(item.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>

        <Panel className="p-4">
          <PanelHeading
            title="Facility management"
            action={
              <Link className={panelLink} href="/admin/facilities">
                View all
              </Link>
            }
          />
          <ul className="mt-3">
            {facilities.map(({ name, address, patients }) => (
              <li
                key={name}
                className="flex items-center justify-between gap-3 border-t border-border px-1 py-2.5"
              >
                <span className="flex flex-col gap-0.5">
                  <strong>{name}</strong>
                  <small className="text-[0.73rem] text-muted-foreground">
                    {address}
                  </small>
                </span>
                <b className="text-[0.73rem] font-bold text-muted-foreground">
                  {patients.toLocaleString("en-US")} patients
                </b>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="p-4">
          <PanelHeading
            title="System monitoring"
            action={
              <Link className={panelLink} href="/admin/system">
                Details
              </Link>
            }
          />
          <ul className="mt-3">
            {[
              [
                "EMR connection",
                `Connected · last sync ${formatRunTime(sync.completedAt ?? sync.startedAt)}`,
              ] as const,
              ...SYSTEM_STATUS,
              [
                "Daily job",
                `${sync.status} · ${sync.recordsProcessed.toLocaleString("en-US")} processed`,
              ] as const,
            ].map(([label, detail]) => (
              <li
                key={label}
                className="relative flex flex-col gap-0.5 py-2 pl-5"
              >
                <span className="absolute left-0.5 top-[0.7rem] size-2 rounded-full bg-[#24823c]" />
                <span>{label}</span>
                <small className="text-[0.73rem] text-muted-foreground">
                  {detail}
                </small>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel>
        <PanelHeading
          title="Daily job history — Last 7 runs"
          action={
            <Link className={panelLink} href="/admin/system">
              View system
            </Link>
          }
        />
        <Table className="mt-3">
          <TableHeader>
            <TableRow className="border-0">
              {JOB_HISTORY_COLUMNS.map((c) => (
                <TableHead key={c}>{c}</TableHead>
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
    </section>
  );
}
