import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  SYNTHETIC_NOW,
  buildDashboardTotals,
  buildNpRosterFrom,
  buildQueueInsights,
  caseloadScopeForUser,
  dashboardResponseSchema,
  patientDetailResponseSchema,
  roundingScopeForRole,
  visitNoteSchema,
  type DashboardResponse,
  type NpRosterEntry,
  type PatientDetailResponse,
  type QueueInsightsResponse,
  type RoundingListQuery,
  type RoundingListResult,
  type RoundingScopeSummary,
  type VisitNote,
} from "@smart-rounding/contracts";
import { AuditService } from "../audit/audit.service.js";
import type { AuthenticatedPrincipal } from "../auth/auth.types.js";
import type { Environment } from "../config/environment.js";
import { DATABASE, type Database } from "../database/database.js";
import {
  RoundingDataService,
  type Snapshot,
} from "../data/rounding-data.service.js";

export type RoundingListPage = RoundingListResult & {
  facilities: string[];
  totals: RoundingScopeSummary["totals"];
};

export type ProviderSummary = {
  dashboard: DashboardResponse;
  insights: QueueInsightsResponse;
};

const isProvider = (p: AuthenticatedPrincipal) =>
  p.role === "PHYSICIAN" || p.role === "NURSE_PRACTITIONER";

@Injectable()
export class ProviderService {
  constructor(
    @Inject("ENVIRONMENT") private readonly environment: Environment,
    @Inject(DATABASE) private readonly db: Database,
    private readonly data: RoundingDataService,
    private readonly audit: AuditService,
  ) {}

  private async snapshot(): Promise<Snapshot> {
    if (this.environment.DATA_MODE !== "synthetic")
      throw new ServiceUnavailableException(
        "Clinical data source is not configured",
      );
    return this.data.snapshot();
  }

  private async lastSync(): Promise<string> {
    const [row] = await this.db.query<{ completed_at: Date | string }>(
      "SELECT completed_at FROM sync_runs WHERE status = 'SUCCEEDED' ORDER BY started_at DESC LIMIT 1",
    );
    return row ? new Date(row.completed_at).toISOString() : SYNTHETIC_NOW;
  }

  /** Today's visits for the signed-in provider (or all of today for admins). */
  async summary(principal: AuthenticatedPrincipal): Promise<ProviderSummary> {
    const snap = await this.snapshot();
    const patients = snap.index.patientsInScope(
      roundingScopeForRole(principal.role, principal.subject),
    );
    const generatedAt = this.data.clock().toISOString();
    return {
      dashboard: dashboardResponseSchema.parse({
        mode: "synthetic",
        provider: {
          id: principal.providerId ?? principal.subject,
          name: principal.displayName,
          role: principal.role,
        },
        generatedAt,
        lastSuccessfulSync: await this.lastSync(),
        totals: buildDashboardTotals(patients),
      }),
      insights: buildQueueInsights(patients),
    };
  }

  private page(
    snap: Snapshot,
    query: RoundingListQuery,
    scope: Parameters<Snapshot["index"]["query"]>[1],
  ): RoundingListPage {
    const { facilities, totals } = snap.index.summarize(scope);
    return { ...snap.index.query(query, scope), facilities, totals };
  }

  /** Today's rounding list for the signed-in provider. */
  async roundingList(
    query: RoundingListQuery,
    principal: AuthenticatedPrincipal,
  ): Promise<RoundingListPage> {
    const snap = await this.snapshot();
    return this.page(
      snap,
      query,
      roundingScopeForRole(principal.role, principal.subject),
    );
  }

  /** Every resident the signed-in provider covers. */
  async caseload(
    query: RoundingListQuery,
    principal: AuthenticatedPrincipal,
  ): Promise<RoundingListPage> {
    if (!isProvider(principal))
      throw new ForbiddenException("Only providers have a caseload");
    const snap = await this.snapshot();
    return this.page(
      snap,
      query,
      caseloadScopeForUser(principal.role, principal.subject),
    );
  }

  /**
   * Resource scope, not just role: an NP may open only residents in their own
   * caseload; a physician may open their own and, for NP oversight, any
   * resident an NP covers. Admins do not see clinical records.
   */
  private assertCanView(
    snap: Snapshot,
    patientId: string,
    principal: AuthenticatedPrincipal,
  ): void {
    if (!snap.details.has(patientId))
      throw new NotFoundException("Patient not found");
    const allowed =
      principal.role === "PHYSICIAN"
        ? true
        : principal.role === "NURSE_PRACTITIONER"
          ? snap.npByPatientId.get(patientId) === principal.subject
          : false;
    if (!allowed)
      throw new ForbiddenException("You do not have access to this patient");
  }

  async patient(
    id: string,
    principal: AuthenticatedPrincipal,
    ip: string | null,
  ): Promise<PatientDetailResponse> {
    const snap = await this.snapshot();
    try {
      this.assertCanView(snap, id, principal);
    } catch (error) {
      if (error instanceof ForbiddenException)
        await this.audit.record({
          actor: principal.displayName,
          actorId: principal.subject,
          eventType: "PATIENT_DETAIL_VIEW",
          outcome: "DENIED",
          summary: `Denied patient detail for ${id}`,
          patientId: id,
          ip,
        });
      throw error;
    }
    // Data access log: who opened which record — never the clinical content.
    await this.audit.record({
      actor: principal.displayName,
      actorId: principal.subject,
      eventType: "PATIENT_DETAIL_VIEW",
      outcome: "SUCCESS",
      summary: `Opened patient detail for ${id}`,
      patientId: id,
      ip,
    });
    return patientDetailResponseSchema.parse({
      mode: "synthetic",
      patient: snap.details.get(id),
    });
  }

  async npRoster(): Promise<NpRosterEntry[]> {
    const snap = await this.snapshot();
    const nps = snap.users
      .filter((u) => u.role === "NURSE_PRACTITIONER" && u.status === "ACTIVE")
      .sort((a, b) => a.name.localeCompare(b.name));
    return buildNpRosterFrom(snap.residents, snap.npByPatientId, nps);
  }

  async npRosterEntry(npId: string): Promise<NpRosterEntry> {
    const entry = (await this.npRoster()).find((np) => np.id === npId);
    if (!entry) throw new NotFoundException("Nurse practitioner not found");
    return entry;
  }

  async npCaseload(
    npId: string,
    query: RoundingListQuery,
  ): Promise<RoundingListPage> {
    await this.npRosterEntry(npId);
    const snap = await this.snapshot();
    return this.page(
      snap,
      query,
      caseloadScopeForUser("NURSE_PRACTITIONER", npId),
    );
  }

  async visitNotes(
    patientId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<VisitNote[]> {
    const snap = await this.snapshot();
    this.assertCanView(snap, patientId, principal);
    const rows = await this.db.query<{
      id: string;
      patient_id: string;
      author_name: string;
      author_role: VisitNote["authorRole"];
      note: string;
      occurred_at: Date | string;
    }>(
      `SELECT id, patient_id, author_name, author_role, note, occurred_at
         FROM visit_notes WHERE patient_id = $1 ORDER BY occurred_at DESC`,
      [patientId],
    );
    return rows.map((r) =>
      visitNoteSchema.parse({
        id: r.id,
        patientId: r.patient_id,
        authorName: r.author_name,
        authorRole: r.author_role,
        note: r.note,
        occurredAt: new Date(r.occurred_at).toISOString(),
      }),
    );
  }

  async addVisitNote(
    patientId: string,
    note: string,
    principal: AuthenticatedPrincipal,
  ): Promise<VisitNote> {
    if (!isProvider(principal))
      throw new ForbiddenException("Only providers can add visit notes");
    const snap = await this.snapshot();
    this.assertCanView(snap, patientId, principal);
    const saved = visitNoteSchema.parse({
      id: `note-${randomUUID()}`,
      patientId,
      authorName: principal.displayName,
      authorRole: principal.role,
      note,
      occurredAt: new Date().toISOString(),
    });
    await this.db.query(
      `INSERT INTO visit_notes (id, patient_id, author_id, author_name, author_role, note, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        saved.id,
        patientId,
        principal.subject,
        saved.authorName,
        saved.authorRole,
        saved.note,
        saved.occurredAt,
      ],
    );
    await this.audit.record({
      actor: principal.displayName,
      actorId: principal.subject,
      eventType: "VISIT_NOTE_ADDED",
      outcome: "SUCCESS",
      summary: `Added a visit note for ${patientId}`,
      patientId,
    });
    return saved;
  }
}
