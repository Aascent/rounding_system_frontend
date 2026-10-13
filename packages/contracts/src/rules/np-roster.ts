import { syntheticUsers } from "../admin-data.js";
import type { ManagedUser } from "../schemas.js";
import { syntheticRoundingCandidates } from "./synthesize.js";

/**
 * A physician's read-only oversight roster of nurse practitioners, and each
 * NP's own patient panel.
 *
 * There is no real care-team assignment table yet (see docs/API.md), so each
 * synthetic patient is deterministically round-robined across the active NP
 * staff, in urgency order. Because the assignment walks the list in urgency
 * order rather than by facility or classification, every NP's resulting
 * panel spans the full range of priority, compliance and classification
 * cases — not just the "safe" ones — which is what a real panel looks like.
 */

/** Active nurse practitioners, in a stable (name) order — the roster itself. */
export const activeNpRoster: readonly ManagedUser[] = syntheticUsers
  .filter((u) => u.role === "NURSE_PRACTITIONER" && u.status === "ACTIVE")
  .sort((a, b) => a.name.localeCompare(b.name));

function assignedNpForIndex(index: number): ManagedUser | null {
  if (activeNpRoster.length === 0) return null;
  return activeNpRoster[index % activeNpRoster.length]!;
}

/** `patient id -> assigned NP's user id`. Empty string if no NP is active. */
export const assignedNpIdByPatientId: ReadonlyMap<string, string> = new Map(
  syntheticRoundingCandidates.map((patient, index) => [
    patient.id,
    assignedNpForIndex(index)?.id ?? "",
  ]),
);

export type NpRosterEntry = Readonly<{
  id: string;
  name: string;
  email: string;
  status: ManagedUser["status"];
  patientCount: number;
  highPriority: number;
  overdue: number;
}>;

/** One row per active NP, with their real panel's size and acuity mix. */
export function buildNpRoster(): NpRosterEntry[] {
  const tallies = new Map<
    string,
    { patientCount: number; highPriority: number; overdue: number }
  >();
  for (const patient of syntheticRoundingCandidates) {
    const npId = assignedNpIdByPatientId.get(patient.id);
    if (!npId) continue;
    const tally = tallies.get(npId) ?? {
      patientCount: 0,
      highPriority: 0,
      overdue: 0,
    };
    tally.patientCount += 1;
    if (patient.priority === "HIGH") tally.highPriority += 1;
    if (patient.complianceStatus === "OVERDUE") tally.overdue += 1;
    tallies.set(npId, tally);
  }
  return activeNpRoster.map((np) => ({
    id: np.id,
    name: np.name,
    email: np.email,
    status: np.status,
    ...(tallies.get(np.id) ?? { patientCount: 0, highPriority: 0, overdue: 0 }),
  }));
}

export function getNpRosterEntry(npId: string): NpRosterEntry | undefined {
  return buildNpRoster().find((entry) => entry.id === npId);
}
