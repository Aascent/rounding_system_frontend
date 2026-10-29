import Link from "next/link";
import { redirect } from "next/navigation";
import { applicationData } from "../../../lib/application-data";
import { getSessionRole } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
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

/**
 * A physician's oversight roster of nurse practitioners — a staff directory,
 * not a patient table. Each row's counts come from that NP's own real
 * patient panel (see `np-roster.ts`); open a row to see those patients.
 */
export default async function NpRosterPage() {
  const role = await getSessionRole();
  if (role === "NURSE_PRACTITIONER") redirect("/provider/patient-list");
  if (role !== "PHYSICIAN") redirect("/");

  const roster = await applicationData.npRoster();
  const totals = roster.reduce(
    (acc, np) => ({
      patients: acc.patients + np.patientCount,
      visitsToday: acc.visitsToday + np.visitsToday,
      highPriority: acc.highPriority + np.highPriority,
      overdue: acc.overdue + np.overdue,
    }),
    { patients: 0, visitsToday: 0, highPriority: 0, overdue: 0 },
  );

  return (
    <PageContainer>
      <PageHeading
        kicker="Provider dashboard"
        title="Nurse practitioner list"
        description="The nurse practitioners covering your facilities and the rest of the practice. Open one to review their patients."
      />
      <p
        role="note"
        className="mb-4 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-2.5 text-[0.82rem] text-muted-foreground"
      >
        The totals below are added up across every active NP’s caseload — not
        the same scope as{" "}
        <Link
          href="/provider/patient-list"
          className="font-semibold text-primary hover:underline"
        >
          your own Patient list
        </Link>
        , so they won’t match it.
      </p>

      <MetricGrid aria-label="Nurse practitioner roster summary">
        <MetricCard
          label="Nurse practitioners"
          value={roster.length}
          hint="Active staff"
        />
        <MetricCard
          label="Patients covered"
          value={totals.patients}
          hint="Summed across every NP"
        />
        <MetricCard
          label="NP visits today"
          value={totals.visitsToday}
          hint="Summed across every NP"
        />
        <MetricCard
          label="Visits overdue"
          value={totals.overdue}
          hint="Summed across every NP"
        />
      </MetricGrid>

      <section
        className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        aria-labelledby="np-roster-heading"
      >
        <div className="border-b border-border p-6">
          <Kicker className="mb-1">Roster</Kicker>
          <h2 id="np-roster-heading" className="text-xl font-semibold">
            Nurse practitioners
          </h2>
        </div>

        {roster.length ? (
          <Table>
            <TableHeader>
              <TableRow className="border-0">
                <TableHead scope="col">Nurse practitioner</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col">Patients</TableHead>
                <TableHead scope="col">Visits today</TableHead>
                <TableHead scope="col">High priority</TableHead>
                <TableHead scope="col">Overdue</TableHead>
                <TableHead scope="col">
                  <span className="sr-only">Open</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.map((np) => (
                <TableRow key={np.id}>
                  <TableCell className="min-w-[220px]">
                    <Link
                      className="font-bold text-primary underline-offset-2 hover:underline"
                      href={`/provider/np-list/${np.id}`}
                    >
                      {np.name}
                    </Link>
                    <span className="mt-1 block text-[0.78rem] text-muted-foreground">
                      {np.email}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      tone={np.status === "ACTIVE" ? "success" : "neutral"}
                      dot
                    >
                      {np.status === "ACTIVE" ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{np.patientCount}</TableCell>
                  <TableCell>{np.visitsToday}</TableCell>
                  <TableCell>{np.highPriority}</TableCell>
                  <TableCell>{np.overdue}</TableCell>
                  <TableCell>
                    <Link
                      className="font-bold text-primary underline-offset-2 hover:underline"
                      href={`/provider/np-list/${np.id}`}
                      aria-label={`Open ${np.name}'s patients`}
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
            <h3 className="text-lg font-semibold">
              No active nurse practitioners
            </h3>
            <p className="mt-2 text-muted-foreground">
              There are no active nurse practitioner accounts right now.
            </p>
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
