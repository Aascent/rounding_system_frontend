import { notFound, redirect } from "next/navigation";
import { applicationData } from "../../../../lib/application-data";
import { getSessionRole } from "@/lib/session";
import {
  parseRoundingSearchParams,
  type SearchParams,
} from "../../rounding-query";
import { RoundingListView } from "../../rounding-list-view";

/**
 * One nurse practitioner's real patient panel, unfiltered by role scope -
 * every priority, compliance and classification case they're covering, not
 * just the subset that doesn't need a physician. See `np-roster.ts`.
 */
export default async function NpPatientsPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ npId: string }>;
  searchParams: Promise<SearchParams>;
}>) {
  const role = await getSessionRole();
  if (role === "NURSE_PRACTITIONER") redirect("/provider/patient-list");
  if (role !== "PHYSICIAN") redirect("/");

  const [{ npId }, search] = await Promise.all([params, searchParams]);
  const parsed = parseRoundingSearchParams(search);
  // Load the NP and their patients together. An unknown NP still shows
  // "not found": the list's own failure is only surfaced once the NP exists.
  const listRequest = applicationData.npPatientList(npId, parsed.query);
  listRequest.catch(() => undefined);
  const np = await applicationData.npRosterEntry(npId);
  if (!np) notFound();
  const pageData = await listRequest;

  return (
    <RoundingListView
      title={`${np.name}'s patients`}
      description={`Every patient in ${np.name}'s caseload. Those who need an NP visit today are marked.`}
      basePath={`/provider/np-list/${npId}`}
      pageData={pageData}
      filters={parsed.filters}
      pageSize={parsed.pageSize}
      querySansPage={parsed.querySansPage}
      scopeLabel={`in ${np.name}'s caseload`}
      visitFor="NURSE_PRACTITIONER"
      backLink={{ href: "/provider/np-list", label: "nurse practitioner list" }}
    />
  );
}
