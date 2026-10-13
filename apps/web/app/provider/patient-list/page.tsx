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
      "Patients whose signals require a physician visit — critical findings, new admissions, and the long-term 30-day rule — ordered by clinical urgency.",
  },
  NURSE_PRACTITIONER: {
    title: "Patient list",
    description:
      "Patients you can round on under NP protocol (no physician visit currently required), ordered by clinical urgency.",
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
  const pageData = await applicationData.roundingListPage(parsed.query, role);
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
    />
  );
}
