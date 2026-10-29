import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { AuditEvent } from "@smart-rounding/contracts";
import { DATABASE, type Database } from "../database/database.js";

export type AuditEntry = Readonly<{
  actor: string;
  actorId?: string | null;
  eventType: string;
  outcome: AuditEvent["outcome"];
  summary: string;
  /** Set for data-access events; no clinical payload is ever logged. */
  patientId?: string | null;
  ip?: string | null;
}>;

export type AuditFilter = Readonly<{
  q?: string | undefined;
  eventType?: string | undefined;
  actor?: string | undefined;
  date?: string | undefined;
}>;

type Row = {
  id: string;
  occurred_at: Date | string;
  actor: string;
  event_type: string;
  outcome: AuditEvent["outcome"];
  summary: string;
};

const toEvent = (r: Row): AuditEvent => ({
  id: r.id,
  occurredAt: new Date(r.occurred_at).toISOString(),
  actor: r.actor,
  eventType: r.event_type,
  outcome: r.outcome,
  summary: r.summary,
});

/** Append-only audit trail of access and administrative actions. */
@Injectable()
export class AuditService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.db.query(
      `INSERT INTO audit_events (id, actor, actor_id, event_type, outcome, summary, patient_id, ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        `audit-${randomUUID()}`,
        entry.actor,
        entry.actorId ?? null,
        entry.eventType,
        entry.outcome,
        entry.summary,
        entry.patientId ?? null,
        entry.ip ?? null,
      ],
    );
  }

  /** Newest first, filtered on the server (same filters as the admin screen). */
  async list(filter: AuditFilter = {}, limit = 1000): Promise<AuditEvent[]> {
    const where: string[] = [];
    const params: (string | number)[] = [];
    const add = (clause: string, value: string) => {
      params.push(value);
      where.push(clause.replace("?", `$${params.length}`));
    };
    if (filter.eventType) add("event_type = ?", filter.eventType);
    if (filter.actor) add("actor = ?", filter.actor);
    if (filter.date && /^\d{4}-\d{2}-\d{2}$/.test(filter.date))
      add(
        "to_char(occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') = ?",
        filter.date,
      );
    if (filter.q)
      add(
        "lower(actor || ' ' || event_type || ' ' || summary) LIKE ?",
        `%${filter.q.toLowerCase().replace(/[%_\\]/g, "")}%`,
      );
    params.push(limit);
    const rows = await this.db.query<Row>(
      `SELECT id, occurred_at, actor, event_type, outcome, summary FROM audit_events
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY occurred_at DESC, id DESC LIMIT $${params.length}`,
      params,
    );
    return rows.map(toEvent);
  }
}
