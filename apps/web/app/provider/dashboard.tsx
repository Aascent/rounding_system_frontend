"use client";
import type {
  DashboardResponse,
  QueueInsightsResponse,
  RoundingPatient,
} from "@smart-rounding/contracts";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DonutChart,
  FacilityLoadChart,
  RankedBarChart,
  StackedSignalChart,
} from "@/components/ui/chart";
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
  SyntheticBadge,
} from "@/components/page";
import { priorityTone } from "@/lib/status";

export function ProviderDashboard({
  dashboard,
  insights,
  preview,
  previewTotal,
}: Readonly<{
  dashboard: DashboardResponse;
  insights: QueueInsightsResponse;
  preview: RoundingPatient[];
  previewTotal: number;
}>) {
  return (
    <PageContainer>
      <PageHeading
        kicker="Provider dashboard"
        title="Today’s rounding overview"
        description="Deterministic rule signals over synthetic data. Patients are ordered by clinical urgency, with physician-required visits breaking ties."
        actions={<SyntheticBadge />}
      />

      <MetricGrid>
        <MetricCard
          label="Your patients"
          value={dashboard.totals.patients}
          hint={`Across ${dashboard.totals.facilities} facilities`}
        />
        <MetricCard
          label="High priority"
          value={dashboard.totals.highPriority}
          hint="See first"
        />
        <MetricCard
          label="Compliance overdue"
          value={dashboard.totals.overdue}
          hint="Physician interval missed"
        />
        <MetricCard
          label="Carried forward"
          value={dashboard.totals.carryForward}
          hint="Unseen from prior day"
        />
      </MetricGrid>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Kicker className="mb-1">Rounding queue</Kicker>
            <CardTitle>Who to see first</CardTitle>
            <p className="text-sm text-muted-foreground">
              Top {insights.topQueue.length} of{" "}
              {dashboard.totals.patients.toLocaleString()} by urgency score.
            </p>
          </CardHeader>
          <CardContent className="pt-2">
            <RankedBarChart
              unit="pts"
              maxVisibleRows={8}
              data={insights.topQueue.map((p) => ({
                label: p.name,
                value: p.urgencyScore,
                tone: priorityTone(p.priority),
                meta: `${p.name} · ${p.reason}`,
              }))}
            />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
              {insights.topQueue.slice(0, 5).map((p) => (
                <Link
                  key={p.id}
                  href={`/patients/${p.id}?from=dashboard`}
                  className="font-semibold text-primary hover:underline"
                >
                  {p.name}
                  {p.physicianActionRequired ? " · MD" : ""}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Case mix</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 pt-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Priority band
              </p>
              <DonutChart
                centerLabel={dashboard.totals.patients.toLocaleString()}
                centerSublabel="patients"
                segments={[
                  {
                    label: "High",
                    value: insights.priorityBreakdown.HIGH,
                    tone: "danger",
                  },
                  {
                    label: "Medium",
                    value: insights.priorityBreakdown.MEDIUM,
                    tone: "warning",
                  },
                  {
                    label: "Low",
                    value: insights.priorityBreakdown.LOW,
                    tone: "success",
                  },
                ]}
              />
            </div>
            <div className="border-t border-border pt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Compliance status
              </p>
              <DonutChart
                height={170}
                centerLabel={insights.complianceBreakdown.OVERDUE}
                centerSublabel="overdue"
                segments={[
                  {
                    label: "Overdue",
                    value: insights.complianceBreakdown.OVERDUE,
                    tone: "danger",
                  },
                  {
                    label: "Due soon",
                    value: insights.complianceBreakdown.DUE_SOON,
                    tone: "warning",
                  },
                  {
                    label: "On track",
                    value: insights.complianceBreakdown.ON_TRACK,
                    tone: "success",
                  },
                ]}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Signals by category</CardTitle>
            <p className="text-sm text-muted-foreground">
              Patients with at least one rule signal; the red segment is the
              critical count.
            </p>
          </CardHeader>
          <CardContent className="pt-2">
            <StackedSignalChart
              data={insights.signalCategories.map((c) => ({
                label: c.label,
                base: c.patients - c.critical,
                critical: c.critical,
                total: c.patients,
              }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rounding pressure by facility</CardTitle>
            <p className="text-sm text-muted-foreground">
              Candidate volume and high-priority count per facility.
            </p>
          </CardHeader>
          <CardContent className="pt-2">
            <FacilityLoadChart
              data={insights.facilityLoad.map((f) => ({
                label: f.facility,
                patients: f.patients,
                highPriority: f.highPriority,
              }))}
            />
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-2 border-b border-border p-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Kicker className="mb-1">Preview</Kicker>
            <h2 className="text-xl font-semibold">Top of today&apos;s queue</h2>
          </div>
          <Link
            href="/provider/patient-list"
            className="text-sm font-bold text-primary hover:underline"
          >
            Open full rounding list ({previewTotal.toLocaleString()}) →
          </Link>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-0">
              <TableHead>Patient</TableHead>
              <TableHead>Facility / room</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Compliance</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.map((patient) => (
              <TableRow key={patient.id}>
                <TableCell className="min-w-[180px]">
                  <Link
                    className="font-bold text-primary underline-offset-2 hover:underline"
                    href={`/patients/${patient.id}?from=dashboard`}
                  >
                    {patient.name}
                  </Link>
                  {patient.physicianActionRequired && (
                    <span className="ml-2 text-[0.7rem] font-bold uppercase text-destructive">
                      MD
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {patient.facility}
                  <span className="mt-1 block text-[0.78rem] text-muted-foreground">
                    Room {patient.room}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge tone={priorityTone(patient.priority)} dot>
                    {patient.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  {patient.complianceStatus.replace("_", " ")}
                </TableCell>
                <TableCell className="text-[0.9rem]">
                  {patient.reason}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </PageContainer>
  );
}
