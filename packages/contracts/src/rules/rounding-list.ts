import { paginate, type Paginated } from "../pagination.js";
import {
  parseRoundingListQuery,
  type RoundingListQuery,
  type RoundingSort,
} from "../rounding-query.js";
import type { RoundingPatient, UserRole } from "../schemas.js";
import {
  assignedNpIdByPatientId,
  assignedPhysicianIdByPatientId,
} from "./np-roster.js";
import { isOnTodaysList, syntheticResidents } from "./synthesize.js";

export type RoundingListResult = Paginated<RoundingPatient> &
  Readonly<{ filtered: number }>;

/**
 * A hard, server-decided restriction on which patients a caller may see —
 * distinct from the user-adjustable {@link RoundingListQuery} filters, and
 * never sourced from client input. `undefined` fields mean "no restriction."
 * Multiple fields combine with AND.
 */
export type RoundingListScope = Readonly<{
  /** Only residents who need a visit today (see `isOnTodaysList`). */
  todayOnly?: boolean;
  physicianActionRequired?: boolean;
  /** Restricts to one NP's caseload — see `np-roster.ts`. */
  assignedNpId?: string;
  /** Restricts to one attending physician's caseload — see `np-roster.ts`. */
  assignedPhysicianId?: string;
  /**
   * Whose visits "today" means inside a caseload: a physician's caseload
   * also holds residents only the NP needs to see today, and vice versa.
   */
  visitFor?: "PHYSICIAN" | "NURSE_PRACTITIONER";
}>;

/** Whether `patient` needs a visit today from a provider of `role` (any role if omitted). */
export function needsVisitToday(
  patient: RoundingPatient,
  role?: RoundingListScope["visitFor"],
): boolean {
  if (!isOnTodaysList(patient)) return false;
  if (role === "PHYSICIAN") return patient.physicianActionRequired;
  if (role === "NURSE_PRACTITIONER") return !patient.physicianActionRequired;
  return true;
}

/**
 * Today's rounding list for a provider role: physicians take the patients
 * whose signals require a physician visit (critical findings, new admissions,
 * the long-term physician interval); nurse practitioners take the remainder,
 * which they may see under protocol. Admins (and any other role) see the
 * whole of today's list. The split is deterministic and derived from the same
 * rule evidence the rest of the app already shows.
 *
 * `userId`, when given, narrows that to the signed-in provider's own
 * residents (see `np-roster.ts`); without it the scope is role-wide.
 */
export function roundingScopeForRole(
  role: UserRole,
  userId?: string,
): RoundingListScope {
  if (role === "PHYSICIAN")
    return {
      todayOnly: true,
      physicianActionRequired: true,
      ...(userId ? { assignedPhysicianId: userId } : {}),
    };
  if (role === "NURSE_PRACTITIONER")
    return {
      todayOnly: true,
      physicianActionRequired: false,
      ...(userId ? { assignedNpId: userId } : {}),
    };
  return { todayOnly: true };
}

/**
 * A provider's whole caseload — every resident they cover, whether or not
 * they need a visit today. Non-provider roles have no caseload.
 */
export function caseloadScopeForUser(
  role: UserRole,
  userId: string,
): RoundingListScope {
  if (role === "PHYSICIAN")
    return { assignedPhysicianId: userId, visitFor: "PHYSICIAN" };
  if (role === "NURSE_PRACTITIONER")
    return { assignedNpId: userId, visitFor: "NURSE_PRACTITIONER" };
  return { assignedPhysicianId: "", assignedNpId: "" };
}

type Row = Readonly<{
  patient: RoundingPatient;
  haystack: string;
  assignedNpId: string;
  assignedPhysicianId: string;
}>;

function matchesScope(row: Row, scope: RoundingListScope): boolean {
  return (
    (!scope.todayOnly || isOnTodaysList(row.patient)) &&
    (scope.physicianActionRequired === undefined ||
      row.patient.physicianActionRequired === scope.physicianActionRequired) &&
    (scope.assignedNpId === undefined ||
      row.assignedNpId === scope.assignedNpId) &&
    (scope.assignedPhysicianId === undefined ||
      row.assignedPhysicianId === scope.assignedPhysicianId)
  );
}

export type RoundingScopeTotals = Readonly<{
  total: number;
  /** Residents in the scope who need a visit today. */
  today: number;
  highPriority: number;
  overdue: number;
  carryForward: number;
  facilities: number;
}>;

export type RoundingScopeSummary = Readonly<{
  totals: RoundingScopeTotals;
  facilities: string[];
}>;

/**
 * Aggregate counts and the facility list for a scope, computed in one pass so
 * a scoped view (e.g. a nurse practitioner's patient list) can show totals
 * and a facility filter that match what it actually contains, instead of the
 * facility-wide numbers.
 */
export function summarizeRoundingScope(
  scope: RoundingListScope = {},
): RoundingScopeSummary {
  const rows = rowsFor("URGENCY").filter((row) => matchesScope(row, scope));
  const facilitySet = new Set<string>();
  let highPriority = 0;
  let overdue = 0;
  let carryForward = 0;
  let today = 0;
  for (const { patient: p } of rows) {
    facilitySet.add(p.facility);
    const visit = needsVisitToday(p, scope.visitFor);
    if (visit) today += 1;
    // Inside a caseload, "see first" counts only the viewer's own visits.
    if (p.priority === "HIGH" && (!scope.visitFor || visit)) highPriority += 1;
    if (p.complianceStatus === "OVERDUE") overdue += 1;
    if (p.carryForward) carryForward += 1;
  }
  const facilities = [...facilitySet].sort();
  return {
    totals: {
      total: rows.length,
      today,
      highPriority,
      overdue,
      carryForward,
      facilities: facilities.length,
    },
    facilities,
  };
}

/**
 * Every patient in a scope, in urgency order, with no filtering/paging -
 * for building dashboard/report aggregates (see buildQueueInsights) over a
 * scoped view instead of the whole synthetic population.
 */
export function patientsInScope(
  scope: RoundingListScope = {},
): readonly RoundingPatient[] {
  return rowsFor("URGENCY")
    .filter((row) => matchesScope(row, scope))
    .map((row) => row.patient);
}

const PRIORITY_RANK: Record<RoundingPatient["priority"], number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

type Comparator = (a: RoundingPatient, b: RoundingPatient) => number;

/** Comparators for the non-default sorts; `URGENCY` is the source order. */
const COMPARATORS: Record<Exclude<RoundingSort, "URGENCY">, Comparator> = {
  NAME: (a, b) => a.name.localeCompare(b.name),
  ADMISSION: (a, b) => b.daysSinceAdmission - a.daysSinceAdmission,
  LAST_VISIT: (a, b) =>
    (a.lastPhysicianVisit ?? "").localeCompare(b.lastPhysicianVisit ?? ""),
  PRIORITY: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
};

const toRow = (patient: RoundingPatient): Row => ({
  patient,
  haystack:
    `${patient.name} ${patient.room} ${patient.payer} ${patient.status}`.toLowerCase(),
  assignedNpId: assignedNpIdByPatientId.get(patient.id) ?? "",
  assignedPhysicianId: assignedPhysicianIdByPatientId.get(patient.id) ?? "",
});

/**
 * The dataset is immutable, so each ordering is computed once (lazily) and
 * reused; a request only filters and slices. Sorts are stable, so ties keep
 * urgency order.
 */
const rowsBySort = new Map<RoundingSort, readonly Row[]>();

function rowsFor(sort: RoundingSort): readonly Row[] {
  const cached = rowsBySort.get(sort);
  if (cached) return cached;
  const base = syntheticResidents.map(toRow);
  const rows =
    sort === "URGENCY"
      ? base
      : [...base].sort((a, b) => COMPARATORS[sort](a.patient, b.patient));
  rowsBySort.set(sort, rows);
  return rows;
}

/**
 * Filter, sort and paginate the synthetic rounding list. Never throws.
 *
 * `scope` is applied first and is not user-adjustable — see
 * {@link roundingScopeForRole}. `raw` is the lenient, client-supplied query
 * (search, filters, sort, paging).
 */
export function queryRoundingList(
  raw: RoundingListQuery = {},
  scope: RoundingListScope = {},
): RoundingListResult {
  const query = parseRoundingListQuery(raw);
  const needle = query.q.toLowerCase();

  const matches = rowsFor(query.sort)
    .filter(
      (row) =>
        matchesScope(row, scope) &&
        (query.priority === "ALL" || row.patient.priority === query.priority) &&
        (query.compliance === "ALL" ||
          row.patient.complianceStatus === query.compliance) &&
        (query.classification === "ALL" ||
          row.patient.classification === query.classification) &&
        (query.facility === "ALL" || row.patient.facility === query.facility) &&
        (!query.physicianOnly || row.patient.physicianActionRequired) &&
        (query.visit === "ALL" ||
          needsVisitToday(row.patient, scope.visitFor)) &&
        (!needle || row.haystack.includes(needle)),
    )
    .map((row) => row.patient);

  return {
    ...paginate(matches, query),
    filtered: matches.length,
  };
}
