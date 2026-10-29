import {
  RULE_CATALOG,
  buildDashboardTotals,
  buildNpRoster,
  buildQueueInsights,
  caseloadScopeForUser,
  facilityCoverage,
  getNpRosterEntry,
  getSyntheticPatient,
  patientsInScope,
  queryRoundingList,
  roundingScopeForRole,
  summarizeRoundingScope,
  syntheticAuditEvents,
  syntheticCensus,
  syntheticDashboard,
  syntheticFacilities,
  syntheticKeywordLibrary,
  featuredPatientIds,
  syntheticQueueInsights,
  syntheticRoundingCandidates,
  syntheticSyncStatus,
  syntheticThresholds,
  syntheticUsers,
  type AuditEvent,
  type DashboardResponse,
  type FacilitySummary,
  type KeywordEntry,
  type ManagedUser,
  type NpRosterEntry,
  type Paginated,
  type PatientDetailResponse,
  type QueueInsightsResponse,
  type RoundingListQuery,
  type RoundingPatient,
  type RoundingScopeTotals,
  type RuleState,
  type SyncHistory,
  type SyncStatus,
  type Threshold,
  type UserRole,
} from "@smart-rounding/contracts";
import { usesBackend } from "./backend";
import { serverApi, serverApiRequired, toQueryString } from "./server-api";

export type ProviderSummary = Readonly<{
  dashboard: DashboardResponse;
  insights: QueueInsightsResponse;
}>;
export type RoundingListPage = Paginated<RoundingPatient> &
  Readonly<{
    filtered: number;
    facilities: string[];
    totals: RoundingScopeTotals;
  }>;
export type AdminData = Readonly<{
  thresholds: Threshold[];
  users: ManagedUser[];
  keywords: KeywordEntry[];
  rules: RuleState[];
  auditEvents: AuditEvent[];
  sync: SyncStatus;
  syncHistory: SyncHistory;
  facilities: FacilitySummary[];
  census: Readonly<{ patients: number; onListsToday: number }>;
}>;

/**
 * Everything the pages read. `role` is only used by the demo source, which
 * has no server session; the backend source always scopes to the signed-in
 * user on the server.
 */
export interface ApplicationDataSource {
  /** Today's visits for the signed-in provider: dashboard totals and charts. */
  providerSummary(role?: UserRole): Promise<ProviderSummary>;
  /** Today's visits as a filtered, paginated list. */
  roundingListPage(
    query: RoundingListQuery,
    role?: UserRole,
  ): Promise<RoundingListPage>;
  /** The signed-in provider's whole caseload, today's visits included. */
  caseloadPage(
    query: RoundingListQuery,
    role: UserRole,
  ): Promise<RoundingListPage>;
  /** The physician oversight roster: active NPs and their caseloads. */
  npRoster(): Promise<NpRosterEntry[]>;
  npRosterEntry(npId: string): Promise<NpRosterEntry | undefined>;
  /** One NP's whole caseload. */
  npPatientList(
    npId: string,
    query: RoundingListQuery,
  ): Promise<RoundingListPage>;
  patient(id: string): Promise<PatientDetailResponse | undefined>;
  /** Patients pre-rendered at build time (none when data is server-side). */
  featuredPatientIds(): Promise<string[]>;
  adminData(): Promise<AdminData>;
}

/**
 * The demo dataset has exactly one sign-in per role, and the server only
 * sees the role cookie, so each provider role maps to that account's user.
 */
const SIGNED_IN_USER_ID: Partial<Record<UserRole, string>> = {
  PHYSICIAN: "user-001",
  NURSE_PRACTITIONER: "user-002",
};

const scopeFor = (role: UserRole) =>
  roundingScopeForRole(role, SIGNED_IN_USER_ID[role]);

/** Earlier daily runs, newest first, varying around today's census. */
const PRIOR_RUNS = [
  { minute: 43, patients: 6, lists: -6, errors: 0 },
  { minute: 46, patients: 11, lists: 9, errors: 0 },
  { minute: 44, patients: 4, lists: 3, errors: 1 },
  { minute: 45, patients: 15, lists: -11, errors: 0 },
  { minute: 42, patients: 9, lists: 7, errors: 0 },
  { minute: 47, patients: 13, lists: -4, errors: 0 },
] as const;

function demoSyncHistory(): SyncHistory {
  const listed = syntheticRoundingCandidates.length;
  const started = Date.parse(syntheticSyncStatus.startedAt);
  const day = 24 * 60 * 60 * 1000;
  return [
    { ...syntheticSyncStatus, onLists: listed },
    ...PRIOR_RUNS.map((run, i) => {
      const start = new Date(started - (i + 1) * day);
      start.setUTCMinutes(run.minute - 2);
      return {
        id: `sync-demo-${i + 1}`,
        startedAt: start.toISOString(),
        completedAt: new Date(start.getTime() + 2 * 60 * 1000).toISOString(),
        trigger: "SCHEDULED" as const,
        status: "SUCCEEDED" as const,
        recordsProcessed: syntheticCensus.total - run.patients,
        validationRejects: run.errors,
        errors: run.errors,
        onLists: listed - run.lists,
      };
    }),
  ];
}

function demoFacilities(): FacilitySummary[] {
  const nameOf = new Map(syntheticUsers.map((u) => [u.id, u.name]));
  return syntheticFacilities.map((f) => ({
    id: f.id,
    name: f.name,
    address: f.address,
    patients: syntheticCensus.byFacility[f.name] ?? 0,
    onListsToday: syntheticRoundingCandidates.filter(
      (p) => p.facility === f.name,
    ).length,
    physicians: (facilityCoverage.get(f.name)?.physicians ?? []).map(
      (id) => nameOf.get(id) ?? id,
    ),
    nursePractitioners: (facilityCoverage.get(f.name)?.nurses ?? []).map(
      (id) => nameOf.get(id) ?? id,
    ),
  }));
}

class DemoApplicationDataSource implements ApplicationDataSource {
  providerSummary(role?: UserRole) {
    if (!role) {
      return Promise.resolve({
        dashboard: syntheticDashboard,
        insights: syntheticQueueInsights,
      });
    }
    const patients = patientsInScope(scopeFor(role));
    return Promise.resolve({
      dashboard: {
        ...syntheticDashboard,
        totals: buildDashboardTotals(patients),
      },
      insights: buildQueueInsights(patients),
    });
  }
  roundingListPage(query: RoundingListQuery, role?: UserRole) {
    const scope = role ? scopeFor(role) : { todayOnly: true };
    const { facilities, totals } = summarizeRoundingScope(scope);
    return Promise.resolve({
      ...queryRoundingList(query, scope),
      facilities,
      totals,
    });
  }
  caseloadPage(query: RoundingListQuery, role: UserRole) {
    const scope = caseloadScopeForUser(role, SIGNED_IN_USER_ID[role] ?? "");
    const { facilities, totals } = summarizeRoundingScope(scope);
    return Promise.resolve({
      ...queryRoundingList(query, scope),
      facilities,
      totals,
    });
  }
  npRoster() {
    return Promise.resolve(buildNpRoster());
  }
  npRosterEntry(npId: string) {
    return Promise.resolve(getNpRosterEntry(npId));
  }
  npPatientList(npId: string, query: RoundingListQuery) {
    const scope = caseloadScopeForUser("NURSE_PRACTITIONER", npId);
    const { facilities, totals } = summarizeRoundingScope(scope);
    return Promise.resolve({
      ...queryRoundingList(query, scope),
      facilities,
      totals,
    });
  }
  patient(id: string) {
    return Promise.resolve(getSyntheticPatient(id));
  }
  featuredPatientIds() {
    return Promise.resolve([...featuredPatientIds]);
  }
  adminData() {
    return Promise.resolve({
      thresholds: syntheticThresholds,
      users: syntheticUsers,
      keywords: syntheticKeywordLibrary,
      rules: RULE_CATALOG.map((rule) => ({
        ...rule,
        codes: [...rule.codes],
        active: true,
        updatedAt: null,
      })),
      auditEvents: syntheticAuditEvents,
      sync: syntheticSyncStatus,
      syncHistory: demoSyncHistory(),
      facilities: demoFacilities(),
      census: {
        patients: syntheticCensus.total,
        onListsToday: syntheticRoundingCandidates.length,
      },
    });
  }
}

/** Reads everything from the NestJS backend with the user's session. */
class BackendApplicationDataSource implements ApplicationDataSource {
  providerSummary() {
    return serverApiRequired<ProviderSummary>("/provider/summary");
  }
  roundingListPage(query: RoundingListQuery) {
    return serverApiRequired<RoundingListPage>(
      `/provider/rounding-list${toQueryString(query)}`,
    );
  }
  caseloadPage(query: RoundingListQuery) {
    return serverApiRequired<RoundingListPage>(
      `/provider/caseload${toQueryString(query)}`,
    );
  }
  npRoster() {
    return serverApiRequired<NpRosterEntry[]>("/provider/np-roster");
  }
  npRosterEntry(npId: string) {
    return serverApi<NpRosterEntry>(
      `/provider/np-roster/${encodeURIComponent(npId)}`,
    );
  }
  npPatientList(npId: string, query: RoundingListQuery) {
    return serverApiRequired<RoundingListPage>(
      `/provider/np-roster/${encodeURIComponent(npId)}/caseload${toQueryString(query)}`,
    );
  }
  patient(id: string) {
    return serverApi<PatientDetailResponse>(
      `/provider/patients/${encodeURIComponent(id)}`,
    );
  }
  featuredPatientIds() {
    return Promise.resolve([]);
  }
  adminData() {
    return serverApiRequired<AdminData>("/admin/overview");
  }
}

export const applicationData: ApplicationDataSource = usesBackend
  ? new BackendApplicationDataSource()
  : new DemoApplicationDataSource();
