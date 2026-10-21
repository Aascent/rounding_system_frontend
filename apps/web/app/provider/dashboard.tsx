"use client";
import type {
  DashboardResponse,
  QueueInsightsResponse,
} from "@smart-rounding/contracts";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DonutChart,
  FacilityLoadChart,
  StackedSignalChart,
} from "@/components/ui/chart";
import {
  Kicker,
  MetricCard,
  MetricGrid,
  PageContainer,
  PageHeading,
} from "@/components/page";
import { priorityLabels, priorityTone } from "@/lib/status";

/** How many of today's most urgent patients the queue card lists. */
const QUEUE_ROWS = 8;

export function ProviderDashboard({
  dashboard,
  insights,
}: Readonly<{
  dashboard: DashboardResponse;
  insights: QueueInsightsResponse;
}>) {
  const queue = insights.topQueue.slice(0, QUEUE_ROWS);
  return (
    <PageContainer>
      <PageHeading
        kicker="Provider dashboard"
        title="Today’s rounding overview"
        description="The patients who need a visit from you today, most urgent first."
      />

      <MetricGrid>
        <MetricCard
          label="On your list today"
          value={dashboard.totals.patients}
          hint={`Across ${dashboard.totals.facilities} ${dashboard.totals.facilities === 1 ? "facility" : "facilities"}`}
        />
        <MetricCard
          label="See first"
          value={dashboard.totals.highPriority}
          hint="Urgent findings"
        />
        <MetricCard
          label="Visits overdue"
          value={dashboard.totals.overdue}
          hint="Past the required visit window"
        />
        <MetricCard
          label="Carried over"
          value={dashboard.totals.carryForward}
          hint="Not seen yesterday"
        />
      </MetricGrid>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col lg:col-span-2">
          <CardHeader>
            <Kicker className="mb-1">Rounding queue</Kicker>
            <CardTitle>Who to see first</CardTitle>
            <p className="text-sm text-muted-foreground">
              {queue.length < dashboard.totals.patients
                ? `The ${queue.length} most urgent of your ${dashboard.totals.patients.toLocaleString()} patients today.`
                : `All ${dashboard.totals.patients.toLocaleString()} of your patients today, most urgent first.`}
            </p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col pt-1">
            {queue.length ? (
              <ol className="divide-y divide-border">
                {queue.map((p, index) => (
                  <li key={p.id} className="flex items-start gap-3 py-3">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground"
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/patients/${p.id}?from=dashboard`}
                        className="font-semibold text-primary underline-offset-2 hover:underline"
                      >
                        {p.name}
                      </Link>
                      <span className="block text-[0.78rem] text-muted-foreground sm:ml-2 sm:inline">
                        {p.facility} · Room {p.room}
                      </span>
                      <p className="mt-0.5 line-clamp-2 text-[0.84rem] text-foreground/80">
                        {p.reason}
                      </p>
                    </div>
                    <Badge
                      tone={priorityTone(p.priority)}
                      dot
                      className="mt-0.5 shrink-0"
                    >
                      {priorityLabels[p.priority]}
                    </Badge>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="py-10 text-center text-muted-foreground">
                No visits needed today.
              </p>
            )}
            <Link
              href="/provider/patient-list?visit=TODAY"
              className="mt-auto border-t border-border pt-3 text-sm font-bold text-primary hover:underline"
            >
              See all {dashboard.totals.patients.toLocaleString()} visits for
              today →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>How urgent is today&apos;s list?</CardTitle>
            <p className="text-sm text-muted-foreground">
              Your patients today, grouped by how soon they should be seen.
            </p>
          </CardHeader>
          <CardContent className="grid gap-6 pt-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Urgency
              </p>
              <DonutChart
                centerLabel={dashboard.totals.patients.toLocaleString()}
                centerSublabel="patients today"
                segments={[
                  {
                    label: "See first",
                    value: insights.priorityBreakdown.HIGH,
                    tone: "danger",
                  },
                  {
                    label: "See today",
                    value: insights.priorityBreakdown.MEDIUM,
                    tone: "warning",
                  },
                  {
                    label: "Routine visit",
                    value: insights.priorityBreakdown.LOW,
                    tone: "success",
                  },
                ]}
              />
            </div>
            <div className="border-t border-border pt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Visit timing
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
                    label: "On schedule",
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
            <CardTitle>Why patients are on your list</CardTitle>
            <p className="text-sm text-muted-foreground">
              Patients flagged by each type of check. Red shows how many are
              critical.
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
            <CardTitle>Patients by facility</CardTitle>
            <p className="text-sm text-muted-foreground">
              Your patients today at each facility, and how many to see first.
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
    </PageContainer>
  );
}
