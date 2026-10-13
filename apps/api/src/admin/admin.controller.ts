import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  paginate,
  type AuditEvent,
  type ManagedUser,
  type Paginated,
  type SyncStatus,
  type Threshold,
} from "@smart-rounding/contracts";
import { AdminService } from "./admin.service.js";
import { Roles } from "../auth/auth.decorators.js";

@Controller("admin")
@Roles("ADMIN")
export class AdminController {
  constructor(private readonly service: AdminService) {}
  @Get("thresholds") thresholds(): Threshold[] {
    return this.service.listThresholds();
  }
  @Patch("thresholds/:id") updateThreshold(
    @Param("id") id: string,
    @Body() body: unknown,
  ): Threshold {
    return this.service.updateThreshold(id, body);
  }
  @Get("users") users(
    @Query() query: Record<string, string | undefined>,
  ): Paginated<ManagedUser> {
    return paginate(this.service.listUsers(), {
      page: query.page,
      pageSize: query.pageSize,
    });
  }
  @Post("users") createUser(@Body() body: unknown): ManagedUser {
    return this.service.createUser(body);
  }
  @Patch("users/:id") updateUser(
    @Param("id") id: string,
    @Body() body: unknown,
  ): ManagedUser {
    return this.service.updateUser(id, body);
  }
  @Get("audit") audit(
    @Query() query: Record<string, string | undefined>,
  ): Paginated<AuditEvent> {
    return paginate(this.service.auditEvents(), {
      page: query.page,
      pageSize: query.pageSize,
    });
  }
  @Get("audit/export")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="synthetic-audit.csv"')
  exportAudit(): string {
    return [
      "occurredAt,actor,eventType,outcome,summary",
      ...this.service
        .auditEvents()
        .map((row) =>
          [row.occurredAt, row.actor, row.eventType, row.outcome, row.summary]
            .map((value) => `"${value.replaceAll('"', '""')}"`)
            .join(","),
        ),
    ].join("\n");
  }
  @Get("sync") sync(): SyncStatus {
    return this.service.syncStatus();
  }
  @Post("sync") triggerSync(): SyncStatus {
    return this.service.triggerSync();
  }
}
