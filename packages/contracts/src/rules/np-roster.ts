import { syntheticUsers } from "../admin-data.js";
import type { ManagedUser, RoundingPatient } from "../schemas.js";
import {
  isOnTodaysList,
  roundingFacilities,
  syntheticResidents,
} from "./synthesize.js";

/**
 * Care-team coverage: which physician and nurse practitioner look after each
 * resident, and the physician's read-only oversight roster of NPs.
 *
 * There is no real care-team assignment table yet (see docs/API.md), so
 * coverage is derived deterministically the way a post-acute practice is
 * usually staffed: each facility has an attending physician and an NP, and
 * when a role has fewer providers than facilities (or more), the extra
 * facilities (or providers) are shared. Inside a facility covered by more
 * than one provider of a role, residents alternate between them.
 *
 * Every resident therefore has both an attending physician and an NP — their
 * caseloads — while today's visits split by rule evidence: physician-required
 * patients go to the attending physician, the rest to the NP.
 */

/** Stable (id) order, so the core sign-in accounts lead their role. */
const byId = (a: ManagedUser, b: ManagedUser) => a.id.localeCompare(b.id);

const active = (role: ManagedUser["role"]) =>
  syntheticUsers
    .filter((u) => u.role === role && u.status === "ACTIVE")
    .sort(byId);

/** Active nurse practitioners, in a stable (name) order — the roster itself. */
export const activeNpRoster: readonly ManagedUser[] = active(
  "NURSE_PRACTITIONER",
).sort((a, b) => a.name.localeCompare(b.name));

/**
 * Facility -> covering providers of a role. Provider `i` takes facility `i`;
 * leftover facilities go to the first providers again, and leftover providers
 * co-cover the last facilities. The backend seeds its coverage table with it.
 */
export function planFacilityCoverage(
  facilities: readonly string[],
  providers: readonly Pick<ManagedUser, "id">[],
): ReadonlyMap<string, readonly string[]> {
  const map = new Map<string, string[]>(
    facilities.map((facility) => [facility, []]),
  );
  if (providers.length === 0) return map;
  facilities.forEach((facility, i) => {
    map.get(facility)!.push(providers[i % providers.length]!.id);
  });
  providers.slice(facilities.length).forEach((provider, k) => {
    const facility = facilities[facilities.length - 1 - k] ?? facilities[0]!;
    map.get(facility)!.push(provider.id);
  });
  return map;
}

const coverage = (providers: readonly ManagedUser[]) =>
  planFacilityCoverage(roundingFacilities, providers);

export type FacilityCoverage = Readonly<{
  physicians: readonly string[];
  nurses: readonly string[];
}>;

const physicianCoverage = coverage(active("PHYSICIAN"));
const npCoverage = coverage(active("NURSE_PRACTITIONER"));

/** Which physicians and NPs cover each facility. */
export const facilityCoverage: ReadonlyMap<string, FacilityCoverage> = new Map(
  roundingFacilities.map((facility) => [
    facility,
    {
      physicians: physicianCoverage.get(facility) ?? [],
      nurses: npCoverage.get(facility) ?? [],
    },
  ]),
);

/**
 * `patient id -> provider id`: residents of a facility alternate between the
 * providers covering it, in urgency order.
 */
export function assignResidents(
  residents: readonly RoundingPatient[],
  byFacility: ReadonlyMap<string, readonly string[]>,
): Map<string, string> {
  const seen = new Map<string, number>();
  return new Map(
    residents.map((patient) => {
      const providers = byFacility.get(patient.facility) ?? [];
      const n = seen.get(patient.facility) ?? 0;
      seen.set(patient.facility, n + 1);
      return [patient.id, providers[n % Math.max(providers.length, 1)] ?? ""];
    }),
  );
}

/** `patient id -> attending physician's user id`, for every resident. */
export const assignedPhysicianIdByPatientId: ReadonlyMap<string, string> =
  assignResidents(syntheticResidents, physicianCoverage);

/** `patient id -> covering NP's user id`, for every resident. */
export const assignedNpIdByPatientId: ReadonlyMap<string, string> =
  assignResidents(syntheticResidents, npCoverage);

export type NpRosterEntry = Readonly<{
  id: string;
  name: string;
  email: string;
  status: ManagedUser["status"];
  /** Residents in the NP's caseload. */
  patientCount: number;
  /** Of those, how many need an NP visit today. */
  visitsToday: number;
  /** Of today's NP visits, how many are high priority. */
  highPriority: number;
  overdue: number;
}>;

type Tally = Pick<
  NpRosterEntry,
  "patientCount" | "visitsToday" | "highPriority" | "overdue"
>;

const emptyTally = (): Tally => ({
  patientCount: 0,
  visitsToday: 0,
  highPriority: 0,
  overdue: 0,
});

/** One row per NP in `nps`, with their caseload's size and today's workload. */
export function buildNpRosterFrom(
  residents: readonly RoundingPatient[],
  npByPatientId: ReadonlyMap<string, string>,
  nps: readonly ManagedUser[],
): NpRosterEntry[] {
  const tallies = new Map<string, Tally>();
  for (const patient of residents) {
    const npId = npByPatientId.get(patient.id);
    if (!npId) continue;
    const tally = tallies.get(npId) ?? emptyTally();
    const npVisit = isOnTodaysList(patient) && !patient.physicianActionRequired;
    tallies.set(npId, {
      patientCount: tally.patientCount + 1,
      visitsToday: tally.visitsToday + (npVisit ? 1 : 0),
      highPriority:
        tally.highPriority + (npVisit && patient.priority === "HIGH" ? 1 : 0),
      overdue: tally.overdue + (patient.complianceStatus === "OVERDUE" ? 1 : 0),
    });
  }
  return nps.map((np) => ({
    id: np.id,
    name: np.name,
    email: np.email,
    status: np.status,
    ...(tallies.get(np.id) ?? emptyTally()),
  }));
}

/** The built-in demo dataset's NP roster. */
export function buildNpRoster(): NpRosterEntry[] {
  return buildNpRosterFrom(
    syntheticResidents,
    assignedNpIdByPatientId,
    activeNpRoster,
  );
}

export function getNpRosterEntry(npId: string): NpRosterEntry | undefined {
  return buildNpRoster().find((entry) => entry.id === npId);
}
