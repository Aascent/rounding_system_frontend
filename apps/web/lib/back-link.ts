import type { Route } from "next";
import { applicationData } from "./application-data";

/**
 * Where the "Back to ..." link on the patient detail page returns to, and
 * what it's labeled. Callers linking to `/patients/[id]` append `?from=...`
 * (see backLinkQuery) so the label always matches where the visitor
 * actually came from, instead of a single hard-coded "rounding list".
 */
export type PatientBackLink = Readonly<{ href: Route; label: string }>;

const DASHBOARD: PatientBackLink = { href: "/provider", label: "dashboard" };
const PATIENT_LIST: PatientBackLink = {
  href: "/provider/patient-list",
  label: "patient list",
};
const NP_ROSTER: PatientBackLink = {
  href: "/provider/np-list",
  label: "nurse practitioner list",
};

const NP_PREFIX = "np-";

/**
 * Builds the `?from=...` value a patient link should carry, from the list
 * page's own `basePath` - so each list only has to say where it *is*, not
 * duplicate this mapping.
 */
export function backLinkQuery(basePath: string): string {
  if (basePath === PATIENT_LIST.href) return "patient-list";
  if (basePath === NP_ROSTER.href) return "np-list";
  if (basePath.startsWith(`${NP_ROSTER.href}/`))
    return `${NP_PREFIX}${basePath.slice(NP_ROSTER.href.length + 1)}`;
  return "dashboard";
}

/** Resolves a `from` query value (untrusted input) back to a safe, known link. */
export async function resolveBackLink(
  from: string | undefined,
): Promise<PatientBackLink> {
  if (!from) return DASHBOARD;
  if (from === "patient-list") return PATIENT_LIST;
  if (from === "np-list") return NP_ROSTER;
  if (from.startsWith(NP_PREFIX)) {
    const npId = from.slice(NP_PREFIX.length);
    const np = await applicationData.npRosterEntry(npId);
    if (np)
      return {
        href: `${NP_ROSTER.href}/${npId}` as Route,
        label: `${np.name}'s patients`,
      };
  }
  return DASHBOARD;
}
