import {
  buildDashboardTotals,
  buildNpRoster,
  buildQueueInsights,
  caseloadScopeForUser,
  getNpRosterEntry,
  getSyntheticPatient,
  patientsInScope,
  queryRoundingList,
  roundingScopeForRole,
  summarizeRoundingScope,
  syntheticAuditEvents,
  syntheticDashboard,
  syntheticKeywordLibrary,
  featuredPatientIds,
  syntheticQueueInsights,
  syntheticSyncStatus,
  syntheticThresholds,
  syntheticUsers,
  type AuditEvent,
  type DashboardResponse,
  type KeywordEntry,
  type ManagedUser,
  type NpRosterEntry,
  type Paginated,
  type PatientDetailResponse,
  type QueueInsightsResponse,
  type RoundingListQuery,
  type RoundingPatient,
  type RoundingScopeTotals,
  type SyncStatus,
  type Threshold,
  type UserRole,
} from "@smart-rounding/contracts";

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
  auditEvents: AuditEvent[];
  sync: SyncStatus;
}>;

export interface ApplicationDataSource {
  /**
   * `role`, when given, scopes the dashboard totals and queue insights to
   * that role's own patients (see `roundingScopeForRole`) instead of the
   * facility-wide aggregate - matching what `roundingListPage` with the same
   * role would show, so the two never disagree on the count.
   */
  providerSummary(role?: UserRole): Promise<ProviderSummary>;
  /**
   * `role`, when given, hard-scopes the list to that role's assigned
   * patients (see `roundingScopeForRole`) — physicians and nurse
   * practitioners see different patients. Omit it for the unscoped,
   * facility-wide list (e.g. the dashboard preview).
   */
  roundingListPage(
    query: RoundingListQuery,
    role?: UserRole,
  ): Promise<RoundingListPage>;
  /**
   * The signed-in provider's whole caseload — every resident they cover,
   * with today's visits included — for the patient list.
   */
  caseloadPage(
    query: RoundingListQuery,
    role: UserRole,
  ): Promise<RoundingListPage>;
  /** The physician oversight roster: active NPs and their real panel sizes. */
  npRoster(): Promise<NpRosterEntry[]>;
  npRosterEntry(npId: string): Promise<NpRosterEntry | undefined>;
  /** One NP's whole caseload — every resident they cover. */
  npPatientList(
    npId: string,
    query: RoundingListQuery,
  ): Promise<RoundingListPage>;
  patient(id: string): Promise<PatientDetailResponse | undefined>;
  featuredPatientIds(): Promise<string[]>;
  adminData(): Promise<AdminData>;
}

/**
 * The login offers exactly one account per role, and the server only sees the
 * role cookie, so each provider role maps to that account's user. Scoping by
 * user (not just role) gives each provider their own share of today's list.
 */
const SIGNED_IN_USER_ID: Partial<Record<UserRole, string>> = {
  PHYSICIAN: "user-001",
  NURSE_PRACTITIONER: "user-002",
};

const scopeFor = (role: UserRole) =>
  roundingScopeForRole(role, SIGNED_IN_USER_ID[role]);

class SyntheticApplicationDataSource implements ApplicationDataSource {
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
      auditEvents: syntheticAuditEvents,
      sync: syntheticSyncStatus,
    });
  }
}

export const applicationData: ApplicationDataSource =
  new SyntheticApplicationDataSource();
