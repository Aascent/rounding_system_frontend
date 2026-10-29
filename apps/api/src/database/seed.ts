import {
  RULE_CATALOG,
  SYNTHETIC_NOW,
  evaluateSources,
  isOnTodaysList,
  planFacilityCoverage,
  syntheticAuditEvents,
  syntheticFacilities,
  syntheticKeywordLibrary,
  syntheticSourceRecords,
  syntheticSyncStatus,
  syntheticThresholds,
  syntheticUsers,
} from "@smart-rounding/contracts";
import { hashPassword } from "../auth/passwords.js";
import type { Database, SqlValue } from "./database.js";

/** Insert `rows` in multi-row batches (parameterised). */
export async function insertMany(
  db: Database,
  table: string,
  columns: readonly string[],
  rows: readonly (readonly SqlValue[])[],
  batch = 200,
): Promise<void> {
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch);
    const params: SqlValue[] = [];
    const values = chunk
      .map((row) => {
        const start = params.length;
        params.push(...row);
        return `(${row.map((_, j) => `$${start + j + 1}`).join(", ")})`;
      })
      .join(", ");
    await db.query(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${values}`,
      params,
    );
  }
}

/** Earlier daily runs, newest first, varying around today's census. */
const PRIOR_RUNS = [
  { minute: 43, patients: 6, lists: -6, errors: 0 },
  { minute: 46, patients: 11, lists: 9, errors: 0 },
  { minute: 44, patients: 4, lists: 3, errors: 1 },
  { minute: 45, patients: 15, lists: -11, errors: 0 },
  { minute: 42, patients: 9, lists: 7, errors: 0 },
  { minute: 47, patients: 13, lists: -4, errors: 0 },
] as const;

/**
 * Load the demo dataset into an empty database: facilities, staff accounts
 * (each with their own sign-in), coverage, patients, rule configuration,
 * history. Only ever runs in synthetic data mode on a database with no users.
 */
export async function seedDemoData(
  db: Database,
  demoPassword: string,
): Promise<boolean> {
  const [counted] = await db.query<{ count: number }>(
    "SELECT count(*)::int AS count FROM users",
  );
  const count = Number(counted?.count ?? 0);
  if (Number(count) > 0) return false;

  const now = new Date(SYNTHETIC_NOW);
  const evaluated = evaluateSources(syntheticSourceRecords, now);
  const facilityId = new Map(syntheticFacilities.map((f) => [f.name, f.id]));
  const passwordHash = await hashPassword(demoPassword);

  await db.transaction(async (tx) => {
    await insertMany(
      tx,
      "facilities",
      ["id", "name", "address"],
      syntheticFacilities.map((f) => [f.id, f.name, f.address]),
    );
    // Every account signs in with its own email; the demo shares one
    // password so the seeded staff are usable without a mail service.
    await insertMany(
      tx,
      "users",
      ["id", "name", "email", "role", "status", "provider_id", "password_hash"],
      syntheticUsers.map((u) => [
        u.id,
        u.name,
        u.email.toLowerCase(),
        u.role,
        u.status,
        u.providerId,
        passwordHash,
      ]),
    );

    const facilities = syntheticFacilities.map((f) => f.name);
    const active = (role: string) =>
      syntheticUsers
        .filter((u) => u.role === role && u.status === "ACTIVE")
        .sort((a, b) => a.id.localeCompare(b.id));
    const coverageRows: SqlValue[][] = [];
    for (const role of ["PHYSICIAN", "NURSE_PRACTITIONER"]) {
      for (const [facility, ids] of planFacilityCoverage(
        facilities,
        active(role),
      ))
        ids.forEach((id, position) =>
          coverageRows.push([facilityId.get(facility) ?? "", id, position]),
        );
    }
    await insertMany(
      tx,
      "facility_coverage",
      ["facility_id", "user_id", "position"],
      coverageRows,
    );

    await insertMany(
      tx,
      "patients",
      ["id", "facility_id", "name", "admission_date", "source"],
      syntheticSourceRecords.map((s) => [
        s.id,
        facilityId.get(s.facility) ?? "",
        s.name,
        s.admissionDate,
        JSON.stringify(s),
      ]),
    );

    await insertMany(
      tx,
      "thresholds",
      [
        "id",
        "label",
        "description",
        "value",
        "unit",
        "minimum",
        "maximum",
        "version",
        "updated_at",
      ],
      syntheticThresholds.map((t) => [
        t.id,
        t.label,
        t.description,
        t.value,
        t.unit,
        t.minimum,
        t.maximum,
        t.version,
        t.updatedAt,
      ]),
    );
    await insertMany(
      tx,
      "keywords",
      ["id", "keyword", "category", "severity", "matches", "active"],
      syntheticKeywordLibrary.map((k) => [
        k.id,
        k.keyword,
        k.category,
        k.severity,
        k.matches,
        k.active,
      ]),
    );
    await insertMany(
      tx,
      "rules",
      ["id", "active"],
      RULE_CATALOG.map((r) => [r.id, true]),
    );
    await insertMany(
      tx,
      "audit_events",
      ["id", "occurred_at", "actor", "event_type", "outcome", "summary"],
      syntheticAuditEvents.map((e) => [
        e.id,
        e.occurredAt,
        e.actor,
        e.eventType,
        e.outcome,
        e.summary,
      ]),
    );

    const listed = evaluated.filter((e) => isOnTodaysList(e.rounding));
    const started = Date.parse(syntheticSyncStatus.startedAt);
    const day = 24 * 60 * 60 * 1000;
    await insertMany(
      tx,
      "sync_runs",
      [
        "id",
        "started_at",
        "completed_at",
        "trigger",
        "status",
        "records_processed",
        "validation_rejects",
        "errors",
        "on_lists",
      ],
      [
        [
          syntheticSyncStatus.id,
          syntheticSyncStatus.startedAt,
          syntheticSyncStatus.completedAt,
          syntheticSyncStatus.trigger,
          syntheticSyncStatus.status,
          syntheticSyncStatus.recordsProcessed,
          syntheticSyncStatus.validationRejects,
          syntheticSyncStatus.errors,
          listed.length,
        ],
        ...PRIOR_RUNS.map((run, i): SqlValue[] => {
          const start = new Date(started - (i + 1) * day);
          start.setUTCMinutes(run.minute - 2);
          const end = new Date(start.getTime() + 2 * 60 * 1000);
          return [
            `sync-seed-${i + 1}`,
            start.toISOString(),
            end.toISOString(),
            "SCHEDULED",
            "SUCCEEDED",
            evaluated.length - run.patients,
            run.errors,
            run.errors,
            listed.length - run.lists,
          ];
        }),
      ],
    );
    await insertMany(
      tx,
      "rule_executions",
      [
        "run_id",
        "patient_id",
        "config_version",
        "priority",
        "urgency_score",
        "physician_required",
        "signals",
      ],
      listed.map((e) => [
        syntheticSyncStatus.id,
        e.rounding.id,
        1,
        e.rounding.priority,
        e.rounding.urgencyScore,
        e.rounding.physicianActionRequired,
        JSON.stringify(e.rounding.signals),
      ]),
    );
    await tx.query(
      "INSERT INTO app_state (key, value) VALUES ('config_version', 1)",
    );
  });
  return true;
}
