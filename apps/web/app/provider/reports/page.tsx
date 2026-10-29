import { applicationData } from "../../../lib/application-data";
import { getSessionRole } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DonutChart, RankedBarChart } from "@/components/ui/chart";
import {
  MetricCard,
  MetricGrid,
  PageContainer,
  PageHeading,
} from "@/components/page";

export default async function ReportsPage() {
  const role = await getSessionRole();
  const scopeRole =
    role === "PHYSICIAN" || role === "NURSE_PRACTITIONER" ? role : undefined;
  const { dashboard, insights } =
    await applicationData.providerSummary(scopeRole);
  const p = insights.priorityBreakdown;
  const c = insights.classificationBreakdown;

  return (
    <PageContainer>
      <PageHeading
        kicker="Provider reports"
        title="Daily rounding summary"
        description="Operational reporting only; advanced analytics remain outside V1."
      />
      <MetricGrid>
        <MetricCard
          label="On your list today"
          value={dashboard.totals.patients}
          hint="Current run"
        />
        <MetricCard
          label="High priority"
          value={dashboard.totals.highPriority}
          hint="See first"
        />
        <MetricCard
          label="Carried over"
          value={dashboard.totals.carryForward}
          hint="Not seen yesterday"
        />
        <MetricCard
          label="Last sync"
          value="6:45"
          valueClassName="text-[2rem]"
          hint="UTC"
        />
      </MetricGrid>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Priority distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <DonutChart
              centerLabel={dashboard.totals.patients.toLocaleString()}
              centerSublabel="patients"
              segments={[
                { label: "High", value: p.HIGH, tone: "danger" },
                { label: "Medium", value: p.MEDIUM, tone: "warning" },
                { label: "Low", value: p.LOW, tone: "success" },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Classification split</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <DonutChart
              centerLabel={(c.LONG_TERM + c.SHORT_TERM).toLocaleString()}
              centerSublabel="patients"
              segments={[
                { label: "Long-term", value: c.LONG_TERM, tone: "primary" },
                { label: "Short-term", value: c.SHORT_TERM, tone: "warning" },
              ]}
            />
          </CardContent>
        </Card>
      </section>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Rule-signal volume by category</CardTitle>
          <p className="text-sm text-muted-foreground">
            Number of patients with at least one signal in each category.
          </p>
        </CardHeader>
        <CardContent className="pt-2">
          <RankedBarChart
            data={insights.signalCategories.map((cat) => ({
              label: cat.label,
              value: cat.patients,
              tone: cat.critical > 0 ? "danger" : "primary",
              meta: `${cat.label}: ${cat.patients} patients (${cat.critical} critical)`,
            }))}
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
