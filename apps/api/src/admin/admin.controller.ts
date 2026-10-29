import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import {
  paginate,
  type AuditEvent,
  type CreateUserResponse,
  type FacilitySummary,
  type KeywordEntry,
  type ManagedUser,
  type Paginated,
  type RuleState,
  type SyncHistory,
  type SyncStatus,
  type Threshold,
} from "@smart-rounding/contracts";
import { Roles } from "../auth/auth.decorators.js";
import type {
  AuthenticatedPrincipal,
  AuthenticatedRequest,
} from "../auth/auth.types.js";
import type { AuditFilter } from "../audit/audit.service.js";
import { AdminService } from "./admin.service.js";

type QueryRecord = Record<string, string | undefined>;

const principalOf = (request: AuthenticatedRequest): AuthenticatedPrincipal => {
  if (!request.principal) throw new Error("Authenticated principal missing");
  return request.principal;
};

const auditFilter = (query: QueryRecord): AuditFilter => ({
  q: query.q?.slice(0, 100),
  eventType: query.eventType,
  actor: query.actor,
  date: query.date,
});

const csvCell = (value: string) => `"${value.replaceAll('"', '""')}"`;

@Controller("admin")
@Roles("ADMIN")
export class AdminController {
  constructor(private readonly service: AdminService) {}

  /** Everything the admin workspace loads up front, in one round trip. */
  @Get("overview")
  async overview(): Promise<{
    thresholds: Threshold[];
    users: ManagedUser[];
    keywords: KeywordEntry[];
    rules: RuleState[];
    auditEvents: AuditEvent[];
    sync: SyncStatus;
    syncHistory: SyncHistory;
    facilities: FacilitySummary[];
    census: { patients: number; onListsToday: number };
  }> {
    const [
      thresholds,
      users,
      keywords,
      rules,
      auditEvents,
      sync,
      syncHistory,
      facilities,
      census,
    ] = await Promise.all([
      this.service.listThresholds(),
      this.service.listUsers(),
      this.service.listKeywords(),
      this.service.listRules(),
      this.service.auditEvents(),
      this.service.syncStatus(),
      this.service.syncHistory(),
      this.service.facilities(),
      this.service.census(),
    ]);
    return {
      thresholds,
      users,
      keywords,
      rules,
      auditEvents,
      sync,
      syncHistory,
      facilities,
      census,
    };
  }

  @Get("thresholds") thresholds(): Promise<Threshold[]> {
    return this.service.listThresholds();
  }
  @Patch("thresholds/:id") updateThreshold(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<Threshold> {
    return this.service.updateThreshold(id, body, principalOf(request));
  }

  @Get("users") async users(
    @Query() query: QueryRecord,
  ): Promise<Paginated<ManagedUser>> {
    return paginate(await this.service.listUsers(), {
      page: query.page,
      pageSize: query.pageSize,
    });
  }
  @Post("users") createUser(
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<CreateUserResponse> {
    return this.service.createUser(body, principalOf(request));
  }
  @Patch("users/:id") updateUser(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<ManagedUser> {
    return this.service.updateUser(id, body, principalOf(request));
  }
  @Post("users/:id/reset-password")
  @HttpCode(200)
  resetPassword(
    @Param("id") id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<{ temporaryPassword: string }> {
    return this.service.resetPassword(id, principalOf(request));
  }

  @Get("keywords") keywords(): Promise<KeywordEntry[]> {
    return this.service.listKeywords();
  }
  @Post("keywords") createKeyword(
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<KeywordEntry> {
    return this.service.createKeyword(body, principalOf(request));
  }
  @Patch("keywords/:id") toggleKeyword(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<KeywordEntry> {
    return this.service.toggleKeyword(id, body, principalOf(request));
  }

  @Get("rules") rules(): Promise<RuleState[]> {
    return this.service.listRules();
  }
  @Patch("rules/:id") toggleRule(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<RuleState> {
    return this.service.toggleRule(id, body, principalOf(request));
  }

  /** Paginated, filterable by date (YYYY-MM-DD), user, event type and text. */
  @Get("audit") async audit(
    @Query() query: QueryRecord,
  ): Promise<Paginated<AuditEvent>> {
    return paginate(await this.service.auditEvents(auditFilter(query)), {
      page: query.page,
      pageSize: query.pageSize,
    });
  }
  /** Same filters as the on-screen log. */
  @Get("audit/export")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="audit-log.csv"')
  async exportAudit(@Query() query: QueryRecord): Promise<string> {
    const rows = await this.service.auditEvents(auditFilter(query));
    return [
      "occurredAt,actor,eventType,outcome,summary",
      ...rows.map((row) =>
        [row.occurredAt, row.actor, row.eventType, row.outcome, row.summary]
          .map(csvCell)
          .join(","),
      ),
    ].join("\n");
  }

  @Get("sync") sync(): Promise<SyncStatus> {
    return this.service.syncStatus();
  }
  @Get("sync/history") syncHistory(): Promise<SyncHistory> {
    return this.service.syncHistory();
  }
  @Post("sync") triggerSync(
    @Req() request: AuthenticatedRequest,
  ): Promise<SyncStatus> {
    return this.service.triggerSync(principalOf(request));
  }

  @Get("facilities") facilities(): Promise<FacilitySummary[]> {
    return this.service.facilities();
  }
}
