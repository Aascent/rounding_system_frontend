import { redirect } from "next/navigation";
import { applicationData } from "../../../lib/application-data";
import { getSessionRole } from "@/lib/session";
import {
  parseRoundingSearchParams,
  type SearchParams,
} from "../rounding-query";
import { RoundingListView } from "../rounding-list-view";

const COPY = {
  PHYSICIAN: {
    title: "Patient list",
    description:
      "Every patient you are the attending physician for. Those who need a visit from you today are marked.",
  },
  NURSE_PRACTITIONER: {
    title: "Patient list",
    description:
      "Every patient in your care. Those who need a visit from you today are marked.",
  },
} as const;

export default async function PatientListPage({
  searchParams,
}: Readonly<{ searchParams: Promise<SearchParams> }>) {
  const role = await getSessionRole();
  // Only physicians and NPs round on patients; anyone else (or a missing/
  // blocked session cookie) goes back through sign-in.
  if (role !== "PHYSICIAN" && role !== "NURSE_PRACTITIONER") redirect("/");

  const parsed = parseRoundingSearchParams(await searchParams);
  const pageData = await applicationData.caseloadPage(parsed.query, role);
  const copy = COPY[role];

  return (
    <RoundingListView
      title={copy.title}
      description={copy.description}
      basePath="/provider/patient-list"
      pageData={pageData}
      filters={parsed.filters}
      pageSize={parsed.pageSize}
      querySansPage={parsed.querySansPage}
      scopeLabel="patients in your care"
      visitFor={role}
    />
  );
}
