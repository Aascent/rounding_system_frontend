import { paginate, type Paginated } from "../pagination.js";
import {
  parseRoundingListQuery,
  type RoundingListQuery,
  type RoundingSort,
} from "../rounding-query.js";
import type { RoundingPatient, UserRole } from "../schemas.js";
import { assignedNpIdByPatientId } from "./np-roster.js";
import { syntheticRoundingCandidates } from "./synthesize.js";

export type RoundingListResult = Paginated<RoundingPatient> &
  Readonly<{ filtered: number }>;

/**
 * A hard, server-decided restriction on which patients a caller may see —
 * distinct from the user-adjustable {@link RoundingListQuery} filters, and
 * never sourced from client input. `undefined` fields mean "no restriction."
 * Multiple fields combine with AND.
 */
export type RoundingListScope = Readonly<{
  physicianActionRequired?: boolean;
  /** Restricts to one nurse practitioner's real patient panel — see `np-roster.ts`. */
  assignedNpId?: string;
}>;

/**
 * Maps a provider role to the patients they are responsible for rounding on:
 * physicians take the patients whose signals require a physician visit
 * (critical findings, new admissions, the 30-day long-term rule); nurse
 * practitioners take the remainder, which they may see under protocol. Admins
 * (and any other role) get no hard scope. This keeps the split deterministic
 * and derived from the same rule evidence the rest of the app already shows,
 * rather than a separate, unvalidated assignment table.
 */
export function roundingScopeForRole(role: UserRole): RoundingListScope {
  if (role === "PHYSICIAN") return { physicianActionRequired: true };
  if (role === "NURSE_PRACTITIONER") return { physicianActionRequired: false };
  return {};
}

type Row = Readonly<{
  patient: RoundingPatient;
  haystack: string;
  assignedNpId: string;
}>;

function matchesScope(row: Row, scope: RoundingListScope): boolean {
  return (
    (scope.physicianActionRequired === undefined ||
      row.patient.physicianActionRequired === scope.physicianActionRequired) &&
    (scope.assignedNpId === undefined ||
      row.assignedNpId === scope.assignedNpId)
  );
}

export type RoundingScopeTotals = Readonly<{
  total: number;
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
  for (const { patient: p } of rows) {
    facilitySet.add(p.facility);
    if (p.priority === "HIGH") highPriority += 1;
    if (p.complianceStatus === "OVERDUE") overdue += 1;
    if (p.carryForward) carryForward += 1;
  }
  const facilities = [...facilitySet].sort();
  return {
    totals: {
      total: rows.length,
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
  const base = syntheticRoundingCandidates.map(toRow);
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
        (!needle || row.haystack.includes(needle)),
    )
    .map((row) => row.patient);

  return {
    ...paginate(matches, query),
    filtered: matches.length,
  };
}
