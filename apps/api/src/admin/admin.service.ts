import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { z } from "zod";
import {
  RULE_CATALOG,
  createKeywordRequestSchema,
  createUserRequestSchema,
  keywordEntrySchema,
  keywordToggleSchema,
  managedUserSchema,
  ruleStateSchema,
  ruleToggleSchema,
  syncStatusSchema,
  thresholdSchema,
  thresholdUpdateSchema,
  updateUserRequestSchema,
  type AuditEvent,
  type CreateUserResponse,
  type FacilitySummary,
  type KeywordEntry,
  type ManagedUser,
  type RuleState,
  type SyncHistory,
  type SyncStatus,
  type Threshold,
} from "@smart-rounding/contracts";
import { AuditService, type AuditFilter } from "../audit/audit.service.js";
import { AuthService } from "../auth/auth.service.js";
import type { AuthenticatedPrincipal } from "../auth/auth.types.js";
import { hashPassword, temporaryPassword } from "../auth/passwords.js";
import type { Environment } from "../config/environment.js";
import { DATABASE, type Database } from "../database/database.js";
import { RoundingDataService } from "../data/rounding-data.service.js";

function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new BadRequestException("Request validation failed");
  return result.data;
}

const iso = (value: Date | string | null): string | null =>
  value === null ? null : new Date(value).toISOString();

type ThresholdRow = {
  id: string;
  label: string;
  description: string;
  value: number;
  unit: string;
  minimum: number;
  maximum: number;
  version: number;
  updated_at: Date | string;
};
type SyncRow = {
  id: string;
  started_at: Date | string;
  completed_at: Date | string | null;
  trigger: SyncStatus["trigger"];
  status: SyncStatus["status"];
  records_processed: number;
  validation_rejects: number;
  errors: number;
  on_lists: number;
};
type UserRow = {
  id: string;
  name: string;
  email: string;
  role: ManagedUser["role"];
  status: ManagedUser["status"];
  provider_id: string | null;
};

const toThreshold = (r: ThresholdRow): Threshold =>
  thresholdSchema.parse({
    id: r.id,
    label: r.label,
    description: r.description,
    value: Number(r.value),
    unit: r.unit,
    minimum: Number(r.minimum),
    maximum: Number(r.maximum),
    version: Number(r.version),
    updatedAt: iso(r.updated_at),
  });
const toSync = (r: SyncRow): SyncStatus =>
  syncStatusSchema.parse({
    id: r.id,
    startedAt: iso(r.started_at),
    completedAt: iso(r.completed_at),
    trigger: r.trigger,
    status: r.status,
    recordsProcessed: Number(r.records_processed),
    validationRejects: Number(r.validation_rejects),
    errors: Number(r.errors),
  });
const toUser = (r: UserRow): ManagedUser =>
  managedUserSchema.parse({
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    status: r.status,
    providerId: r.provider_id,
  });

/** How long a demo "sync" takes: it re-evaluates the stored records. */
export const SYNC_DURATION_MS = 2500;

@Injectable()
export class AdminService {
  constructor(
    @Inject("ENVIRONMENT") private readonly environment: Environment,
    @Inject(DATABASE) private readonly db: Database,
    private readonly data: RoundingDataService,
    private readonly audit: AuditService,
    private readonly auth: AuthService,
  ) {}

  private assertSynthetic(): void {
    if (this.environment.DATA_MODE !== "synthetic")
      throw new ServiceUnavailableException(
        "Administrative data source is not configured",
      );
  }

  private log(
    principal: AuthenticatedPrincipal,
    eventType: string,
    summary: string,
  ): Promise<void> {
    return this.audit.record({
      actor: principal.displayName,
      actorId: principal.subject,
      eventType,
      outcome: "SUCCESS",
      summary,
    });
  }

  // ---------------------------------------------------------------- thresholds

  async listThresholds(): Promise<Threshold[]> {
    this.assertSynthetic();
    const rows = await this.db.query<ThresholdRow>(
      "SELECT * FROM thresholds ORDER BY label",
    );
    return rows.map(toThreshold);
  }

  /** Validated, versioned (optimistic) and audited numeric threshold change. */
  async updateThreshold(
    id: string,
    input: unknown,
    principal: AuthenticatedPrincipal,
  ): Promise<Threshold> {
    this.assertSynthetic();
    const update = parseInput(thresholdUpdateSchema, input);
    const updated = await this.db.transaction(async (tx) => {
      const [row] = await tx.query<ThresholdRow>(
        "SELECT * FROM thresholds WHERE id = $1 FOR UPDATE",
        [id],
      );
      if (!row) throw new NotFoundException("Threshold not found");
      if (update.version !== Number(row.version))
        throw new ConflictException(
          "Threshold has changed; refresh and try again",
        );
      if (
        update.value < Number(row.minimum) ||
        update.value > Number(row.maximum)
      )
        throw new ConflictException(
          "Threshold value is outside its allowed range",
        );
      const [next] = await tx.query<ThresholdRow>(
        `UPDATE thresholds SET value = $2, version = version + 1, updated_at = now(), updated_by = $3
          WHERE id = $1 RETURNING *`,
        [id, update.value, principal.subject],
      );
      await tx.query(
        `INSERT INTO threshold_history (threshold_id, old_value, new_value, version, changed_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          id,
          Number(row.value),
          update.value,
          Number(next!.version),
          principal.subject,
        ],
      );
      await this.data.bumpConfigVersion(tx);
      return { before: Number(row.value), after: toThreshold(next!) };
    });
    this.data.invalidate();
    await this.log(
      principal,
      "THRESHOLD_UPDATE",
      `Changed ${updated.after.label} from ${updated.before} to ${updated.after.value} ${updated.after.unit} (version ${updated.after.version})`,
    );
    return updated.after;
  }

  // --------------------------------------------------------------------- users

  async listUsers(): Promise<ManagedUser[]> {
    this.assertSynthetic();
    const rows = await this.db.query<UserRow>(
      "SELECT id, name, email, role, status, provider_id FROM users ORDER BY id",
    );
    return rows.map(toUser);
  }

  async createUser(
    input: unknown,
    principal: AuthenticatedPrincipal,
  ): Promise<CreateUserResponse> {
    this.assertSynthetic();
    const create = parseInput(createUserRequestSchema, input);
    const [counted] = await this.db.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM users",
    );
    const count = Number(counted?.count ?? 0);
    const n = Number(count) + 1;
    const id = `user-${String(n).padStart(3, "0")}-${randomUUID().slice(0, 4)}`;
    const password = temporaryPassword();
    const providerId =
      create.role === "ADMIN" ? null : `provider-${randomUUID().slice(0, 8)}`;
    try {
      await this.db.query(
        `INSERT INTO users (id, name, email, role, status, provider_id, password_hash, must_change_password)
         VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)`,
        [
          id,
          create.name,
          create.email,
          create.role,
          create.status,
          providerId,
          await hashPassword(password),
        ],
      );
    } catch {
      throw new ConflictException("A user with this email already exists");
    }
    this.data.invalidate();
    await this.log(
      principal,
      "USER_CREATED",
      `Created ${create.name} (${create.role.replace("_", " ").toLowerCase()})`,
    );
    return {
      user: toUser({
        id,
        name: create.name,
        email: create.email,
        role: create.role,
        status: create.status,
        provider_id: providerId,
      }),
      temporaryPassword: password,
    };
  }

  async updateUser(
    id: string,
    input: unknown,
    principal: AuthenticatedPrincipal,
  ): Promise<ManagedUser> {
    this.assertSynthetic();
    const update = parseInput(updateUserRequestSchema, input);
    if (
      id === principal.subject &&
      (update.status === "INACTIVE" || update.role)
    )
      throw new ConflictException(
        "You cannot change your own role or deactivate yourself",
      );
    const user = await this.db.transaction(async (tx) => {
      const [row] = await tx.query<UserRow>(
        `UPDATE users SET role = COALESCE($2, role), status = COALESCE($3, status), updated_at = now()
          WHERE id = $1 RETURNING id, name, email, role, status, provider_id`,
        [id, update.role ?? null, update.status ?? null],
      );
      if (!row) throw new NotFoundException("User not found");
      // A role change or deactivation takes effect immediately.
      if (update.role || update.status === "INACTIVE")
        await this.auth.revokeAll(id, tx);
      return toUser(row);
    });
    this.data.invalidate();
    await this.log(
      principal,
      update.role ? "USER_ROLE_CHANGED" : "USER_STATUS_CHANGED",
      update.role
        ? `Changed ${user.name}'s role to ${user.role.replace("_", " ").toLowerCase()}`
        : `${user.status === "ACTIVE" ? "Activated" : "Deactivated"} ${user.name}`,
    );
    return user;
  }

  async resetPassword(
    id: string,
    principal: AuthenticatedPrincipal,
  ): Promise<{ temporaryPassword: string }> {
    this.assertSynthetic();
    const password = temporaryPassword();
    const rows = await this.db.query<{ name: string }>(
      `UPDATE users SET password_hash = $2, must_change_password = TRUE, failed_logins = 0, locked_until = NULL, updated_at = now()
        WHERE id = $1 RETURNING name`,
      [id, await hashPassword(password)],
    );
    if (!rows[0]) throw new NotFoundException("User not found");
    await this.auth.revokeAll(id);
    await this.log(
      principal,
      "PASSWORD_RESET",
      `Reset ${rows[0].name}'s password`,
    );
    return { temporaryPassword: password };
  }

  // ------------------------------------------------------------------ keywords

  async listKeywords(): Promise<KeywordEntry[]> {
    this.assertSynthetic();
    const rows = await this.db.query<KeywordEntry>(
      "SELECT id, keyword, category, severity, matches, active FROM keywords ORDER BY id",
    );
    return rows.map((r) =>
      keywordEntrySchema.parse({ ...r, matches: Number(r.matches) }),
    );
  }

  async createKeyword(
    input: unknown,
    principal: AuthenticatedPrincipal,
  ): Promise<KeywordEntry> {
    this.assertSynthetic();
    const create = parseInput(createKeywordRequestSchema, input);
    const entry = keywordEntrySchema.parse({
      id: `kw-${randomUUID().slice(0, 8)}`,
      ...create,
      matches: 0,
      active: true,
    });
    try {
      await this.db.transaction(async (tx) => {
        await tx.query(
          `INSERT INTO keywords (id, keyword, category, severity, matches, active, updated_by)
           VALUES ($1, $2, $3, $4, 0, TRUE, $5)`,
          [
            entry.id,
            entry.keyword,
            entry.category,
            entry.severity,
            principal.subject,
          ],
        );
        await this.data.bumpConfigVersion(tx);
      });
    } catch {
      throw new ConflictException("That keyword is already in the library");
    }
    this.data.invalidate();
    await this.log(
      principal,
      "KEYWORD_ADDED",
      `Added keyword “${entry.keyword}”`,
    );
    return entry;
  }

  async toggleKeyword(
    id: string,
    input: unknown,
    principal: AuthenticatedPrincipal,
  ): Promise<KeywordEntry> {
    this.assertSynthetic();
    const { active } = parseInput(keywordToggleSchema, input);
    const row = await this.db.transaction(async (tx) => {
      const [updated] = await tx.query<KeywordEntry>(
        `UPDATE keywords SET active = $2, updated_at = now(), updated_by = $3 WHERE id = $1
         RETURNING id, keyword, category, severity, matches, active`,
        [id, active, principal.subject],
      );
      if (!updated) throw new NotFoundException("Keyword not found");
      await this.data.bumpConfigVersion(tx);
      return updated;
    });
    this.data.invalidate();
    await this.log(
      principal,
      "KEYWORD_TOGGLED",
      `${active ? "Enabled" : "Disabled"} keyword “${row.keyword}”`,
    );
    return keywordEntrySchema.parse({ ...row, matches: Number(row.matches) });
  }

  // --------------------------------------------------------------------- rules

  async listRules(): Promise<RuleState[]> {
    this.assertSynthetic();
    const rows = await this.db.query<{
      id: string;
      active: boolean;
      updated_at: Date | string | null;
    }>("SELECT id, active, updated_at FROM rules");
    const state = new Map(rows.map((r) => [r.id, r]));
    return RULE_CATALOG.map((rule) =>
      ruleStateSchema.parse({
        ...rule,
        codes: [...rule.codes],
        active: rule.locked
          ? true
          : Boolean(state.get(rule.id)?.active ?? true),
        updatedAt: iso(state.get(rule.id)?.updated_at ?? null),
      }),
    );
  }

  async toggleRule(
    id: string,
    input: unknown,
    principal: AuthenticatedPrincipal,
  ): Promise<RuleState> {
    this.assertSynthetic();
    const { active } = parseInput(ruleToggleSchema, input);
    const rule = RULE_CATALOG.find((r) => r.id === id);
    if (!rule) throw new NotFoundException("Rule not found");
    if (rule.locked)
      throw new ConflictException(
        "Regulatory compliance rules cannot be switched off",
      );
    await this.db.transaction(async (tx) => {
      await tx.query(
        `INSERT INTO rules (id, active, updated_at, updated_by) VALUES ($1, $2, now(), $3)
         ON CONFLICT (id) DO UPDATE SET active = $2, updated_at = now(), updated_by = $3`,
        [id, active, principal.subject],
      );
      await this.data.bumpConfigVersion(tx);
    });
    this.data.invalidate();
    await this.log(
      principal,
      "RULE_TOGGLED",
      `${active ? "Enabled" : "Disabled"} rule “${rule.name}”`,
    );
    return (await this.listRules()).find((r) => r.id === id)!;
  }

  // --------------------------------------------------------------------- audit

  auditEvents(filter: AuditFilter = {}): Promise<AuditEvent[]> {
    this.assertSynthetic();
    return this.audit.list(filter);
  }

  // ---------------------------------------------------------------------- sync

  async syncStatus(): Promise<SyncStatus> {
    this.assertSynthetic();
    const [row] = await this.db.query<SyncRow>(
      "SELECT * FROM sync_runs ORDER BY started_at DESC LIMIT 1",
    );
    if (!row) throw new NotFoundException("No synchronization has run yet");
    return toSync(row);
  }

  async syncHistory(limit = 7): Promise<SyncHistory> {
    this.assertSynthetic();
    const rows = await this.db.query<SyncRow>(
      "SELECT * FROM sync_runs ORDER BY started_at DESC LIMIT $1",
      [limit],
    );
    return rows.map((r) => ({ ...toSync(r), onLists: Number(r.on_lists) }));
  }

  /**
   * Start a manual sync. In synthetic mode no external system is contacted:
   * the stored records are re-evaluated and the run's rule executions saved.
   */
  async triggerSync(principal: AuthenticatedPrincipal): Promise<SyncStatus> {
    this.assertSynthetic();
    const running = await this.db.query(
      "SELECT id FROM sync_runs WHERE status = 'RUNNING' LIMIT 1",
    );
    if (running.length)
      throw new ConflictException("A synchronization is already running");
    const id = `sync-${randomUUID()}`;
    const [row] = await this.db.query<SyncRow>(
      `INSERT INTO sync_runs (id, started_at, trigger, status, triggered_by)
       VALUES ($1, now(), 'MANUAL', 'RUNNING', $2) RETURNING *`,
      [id, principal.subject],
    );
    await this.log(
      principal,
      "SYNC_TRIGGERED",
      "Started a manual synchronization",
    );
    setTimeout(
      () => void this.completeSync(id).catch(() => undefined),
      SYNC_DURATION_MS,
    );
    return toSync(row!);
  }

  /** Finish a running sync: re-evaluate, record rule executions, close the run. */
  async completeSync(id: string): Promise<SyncStatus> {
    this.data.invalidate();
    try {
      const snap = await this.data.snapshot();
      const row = await this.db.transaction(async (tx) => {
        const listed = await this.data.recordRun(id, tx);
        const [updated] = await tx.query<SyncRow>(
          `UPDATE sync_runs SET status = 'SUCCEEDED', completed_at = now(),
                  records_processed = $2, on_lists = $3
            WHERE id = $1 AND status = 'RUNNING' RETURNING *`,
          [id, snap.residents.length, listed],
        );
        return updated;
      });
      if (!row) throw new NotFoundException("Sync run not found");
      await this.audit.record({
        actor: "System",
        eventType: "SYNC_COMPLETED",
        outcome: "SUCCESS",
        summary: `Synchronization completed (${snap.residents.length} records, ${snap.worklist.length} on today's lists)`,
      });
      return toSync(row);
    } catch (error) {
      await this.db.query(
        "UPDATE sync_runs SET status = 'FAILED', completed_at = now(), errors = errors + 1 WHERE id = $1",
        [id],
      );
      throw error;
    }
  }

  // ---------------------------------------------------------------- facilities

  async facilities(): Promise<FacilitySummary[]> {
    this.assertSynthetic();
    const snap = await this.data.snapshot();
    const nameOf = new Map(snap.users.map((u) => [u.id, u.name]));
    const counts = new Map<string, { patients: number; today: number }>();
    for (const p of snap.residents) {
      const c = counts.get(p.facility) ?? { patients: 0, today: 0 };
      c.patients += 1;
      counts.set(p.facility, c);
    }
    for (const p of snap.worklist) counts.get(p.facility)!.today += 1;
    return snap.facilities.map((f) => ({
      id: f.id,
      name: f.name,
      address: f.address,
      patients: counts.get(f.name)?.patients ?? 0,
      onListsToday: counts.get(f.name)?.today ?? 0,
      physicians: (snap.coverage.get(f.name)?.physicians ?? []).map(
        (id) => nameOf.get(id) ?? id,
      ),
      nursePractitioners: (snap.coverage.get(f.name)?.nurses ?? []).map(
        (id) => nameOf.get(id) ?? id,
      ),
    }));
  }

  /** Practice-wide counts for the admin dashboard. */
  async census(): Promise<{ patients: number; onListsToday: number }> {
    this.assertSynthetic();
    const snap = await this.data.snapshot();
    return {
      patients: snap.residents.length,
      onListsToday: snap.worklist.length,
    };
  }
}
