import type { Route } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Kicker,
  MetricCard,
  MetricGrid,
  PageContainer,
  PageHeading,
} from "@/components/page";
import {
  complianceLabels,
  complianceTone,
  priorityLabels,
  priorityTone,
} from "@/lib/status";
import {
  needsVisitToday,
  type RoundingPatient,
} from "@smart-rounding/contracts";
import type { RoundingListPage } from "@/lib/application-data";
import { backLinkQuery } from "@/lib/back-link";
import { RoundingFilters, type RoundingFilterValues } from "./rounding-filters";

function formatDate(value: string | null): string {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function signalSummary(signals: RoundingPatient["signals"]): string {
  if (signals.length === 0) return "No active signals";
  const critical = signals.filter((s) => s.severity === "CRITICAL").length;
  const plural = signals.length === 1 ? "" : "s";
  return critical > 0
    ? `${signals.length} signal${plural} \u00B7 ${critical} critical`
    : `${signals.length} signal${plural}`;
}

export function RoundingListView({
  title,
  description,
  basePath,
  pageData,
  filters,
  pageSize,
  querySansPage,
  scopeLabel = "in your list",
  visitFor,
  backLink,
}: Readonly<{
  title: string;
  description: string;
  basePath: string;
  pageData: RoundingListPage;
  filters: RoundingFilterValues;
  pageSize: number;
  querySansPage: string;
  /**
   * How the scope is described inline, e.g. "in your list" (the viewer's own
   * caseload) vs. "in the NP caseload" (oversight into someone else's).
   */
  scopeLabel?: string;
  /** Whose visits the "Visit today" marker shows (the viewer's role). */
  visitFor?: "PHYSICIAN" | "NURSE_PRACTITIONER";
  /** Optional "Back to …" link above the heading (e.g. an NP's caseload). */
  backLink?: Readonly<{ href: Route; label: string }>;
}>) {
  const linkCls = "font-bold text-primary underline-offset-2 hover:underline";
  const { totals } = pageData;
  const scopeLabelCapitalized =
    scopeLabel.charAt(0).toUpperCase() + scopeLabel.slice(1);
  const fromParam = backLinkQuery(basePath);
  const patientHref = (id: string) => `/patients/${id}?from=${fromParam}`;

  return (
    <PageContainer>
      {backLink && (
        <nav className="border-b border-border py-4" aria-label="Breadcrumb">
          <Link
            href={backLink.href}
            className="font-bold text-primary underline-offset-2 hover:underline"
          >
            ← Back to {backLink.label}
          </Link>
        </nav>
      )}
      <PageHeading
        kicker="Provider dashboard"
        title={title}
        description={description}
      />

      <MetricGrid aria-label="Rounding summary">
        <MetricCard
          label={scopeLabelCapitalized}
          value={totals.total}
          hint={`Across ${totals.facilities} ${totals.facilities === 1 ? "facility" : "facilities"}`}
        />
        <MetricCard
          label="Need a visit today"
          value={totals.today}
          hint={`${totals.highPriority} high priority`}
        />
        <MetricCard
          label="Visits overdue"
          value={totals.overdue}
          hint="Past the required visit window"
        />
        <MetricCard
          label="Carried over"
          value={totals.carryForward}
          hint="Not seen yesterday"
        />
      </MetricGrid>

      <section
        className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        aria-labelledby="rounding-list-heading"
      >
        <div className="flex flex-col gap-2 border-b border-border p-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Kicker className="mb-1">Caseload</Kicker>
            <h2 id="rounding-list-heading" className="text-xl font-semibold">
              Patients
            </h2>
          </div>
          <span className="text-sm text-muted-foreground">
            {pageData.filtered.toLocaleString()} match
            {pageData.filtered === 1 ? "" : "es"} {"\u00B7"}{" "}
            {totals.total.toLocaleString()} {scopeLabel}
          </span>
        </div>

        <RoundingFilters
          values={filters}
          facilities={pageData.facilities}
          pageSize={pageSize}
        />

        {pageData.items.length ? (
          <Table>
            <TableHeader>
              <TableRow className="border-0">
                <TableHead scope="col">Patient</TableHead>
                <TableHead scope="col">Priority</TableHead>
                <TableHead scope="col">Visit timing</TableHead>
                <TableHead scope="col">Class / signals</TableHead>
                <TableHead scope="col">Payer / status</TableHead>
                <TableHead scope="col">Last physician visit</TableHead>
                <TableHead scope="col">Last NP visit</TableHead>
                <TableHead scope="col">Days admitted</TableHead>
                <TableHead scope="col">Reason</TableHead>
                <TableHead scope="col">
                  <span className="sr-only">Open</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.items.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell className="min-w-[220px]">
                    <Link className={linkCls} href={patientHref(patient.id)}>
                      {patient.name}
                    </Link>
                    {patient.physicianActionRequired && (
                      <span className="ml-2 align-middle text-[0.68rem] font-bold uppercase text-destructive">
                        MD
                      </span>
                    )}
                    <span className="mt-1 block text-[0.78rem] text-muted-foreground">
                      {patient.facility} {"\u00B7"} Room {patient.room}
                    </span>
                    {needsVisitToday(patient, visitFor) && (
                      <span className="mt-1 block w-max rounded-md bg-primary/10 px-1.5 py-0.5 text-[0.72rem] font-bold text-primary">
                        Visit today
                      </span>
                    )}
                    {patient.carryForward && (
                      <em className="mt-1 block w-max rounded-md bg-warning-soft px-1.5 py-0.5 text-[0.72rem] font-bold not-italic text-warning">
                        Carried over
                      </em>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge tone={priorityTone(patient.priority)} dot>
                      {priorityLabels[patient.priority]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge tone={complianceTone(patient.complianceStatus)} dot>
                      {complianceLabels[patient.complianceStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell className="min-w-[150px]">
                    <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {patient.classification === "LONG_TERM"
                        ? "Long-term"
                        : "Short-term"}
                    </span>
                    <span className="mt-1 block text-[0.78rem] text-muted-foreground">
                      {signalSummary(patient.signals)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {patient.payer}
                    <span className="mt-1 block text-[0.78rem] text-muted-foreground">
                      {patient.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {formatDate(patient.lastPhysicianVisit)}
                  </TableCell>
                  <TableCell>{formatDate(patient.lastNpVisit)}</TableCell>
                  <TableCell>{patient.daysSinceAdmission}</TableCell>
                  <TableCell className="min-w-[235px] text-[0.9rem]">
                    {patient.reason}
                  </TableCell>
                  <TableCell>
                    <Link
                      className={linkCls}
                      href={patientHref(patient.id)}
                      aria-label={`Open ${patient.name}`}
                    >
                      Open
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="px-6 py-16 text-center">
            <h3 className="text-lg font-semibold">No matching patients</h3>
            <p className="mt-2 text-muted-foreground">
              No patients match the current filters.
            </p>
            <Link
              href={basePath}
              className="mt-4 inline-block font-bold text-primary hover:underline"
            >
              Clear filters
            </Link>
          </div>
        )}

        {pageData.total > 0 && (
          <div className="border-t border-border p-6">
            <Pagination
              page={pageData.page}
              totalPages={pageData.totalPages}
              total={pageData.filtered}
              pageSize={pageData.pageSize}
              itemLabel="patients"
              basePath={basePath}
              query={querySansPage}
            />
          </div>
        )}
      </section>

      <footer className="mt-7 flex flex-col justify-between gap-3 border-t border-border pt-5 text-[0.8rem] text-muted-foreground sm:flex-row">
        <p>
          Decision support only. Clinicians remain responsible for care
          decisions.
        </p>
      </footer>
    </PageContainer>
  );
}
