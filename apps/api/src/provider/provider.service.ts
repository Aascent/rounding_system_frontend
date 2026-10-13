import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  getSyntheticPatient,
  queryRoundingList,
  roundingScopeForRole,
  summarizeRoundingScope,
  syntheticDashboard,
  syntheticQueueInsights,
  type DashboardResponse,
  type Paginated,
  type PatientDetailResponse,
  type QueueInsightsResponse,
  type RoundingListQuery,
  type RoundingPatient,
  type RoundingScopeTotals,
  type UserRole,
} from "@smart-rounding/contracts";
import type { Environment } from "../config/environment.js";

export type RoundingListPage = Paginated<RoundingPatient> & {
  filtered: number;
  facilities: string[];
  totals: RoundingScopeTotals;
};

@Injectable()
export class ProviderService {
  constructor(
    @Inject("ENVIRONMENT") private readonly environment: Environment,
  ) {}

  dashboard(): DashboardResponse {
    this.assertSyntheticMode();
    return syntheticDashboard;
  }

  /**
   * `role` is the authenticated caller's role (from the auth guard, never
   * from client input) and hard-scopes the result to the patients that role
   * is responsible for — see {@link roundingScopeForRole}. Omitting it
   * returns the unscoped, facility-wide list.
   */
  roundingList(
    query: RoundingListQuery = {},
    role?: UserRole,
  ): RoundingListPage {
    this.assertSyntheticMode();
    const scope = role ? roundingScopeForRole(role) : {};
    const { facilities, totals } = summarizeRoundingScope(scope);
    return { ...queryRoundingList(query, scope), facilities, totals };
  }

  queueInsights(): QueueInsightsResponse {
    this.assertSyntheticMode();
    return syntheticQueueInsights;
  }

  patient(id: string): PatientDetailResponse | undefined {
    this.assertSyntheticMode();
    return getSyntheticPatient(id);
  }

  private assertSyntheticMode(): void {
    if (this.environment.DATA_MODE !== "synthetic") {
      throw new ServiceUnavailableException(
        "Clinical data source is not configured",
      );
    }
  }
}
