import type { Database } from "./database.js";

/**
 * Ordered, forward-only schema migrations. Each runs once, in a transaction,
 * and is recorded in `schema_migrations`. Never edit an applied migration;
 * add a new one.
 */
export const MIGRATIONS: readonly {
  version: number;
  name: string;
  sql: string;
}[] = [
  {
    version: 1,
    name: "initial schema",
    sql: `
CREATE TABLE facilities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('PHYSICIAN', 'NURSE_PRACTITIONER', 'ADMIN')),
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')),
  provider_id TEXT,
  password_hash TEXT NOT NULL,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  remember BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  ip TEXT,
  user_agent TEXT
);
CREATE INDEX sessions_user_idx ON sessions(user_id);

CREATE TABLE facility_coverage (
  facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  PRIMARY KEY (facility_id, user_id)
);

CREATE TABLE patients (
  id TEXT PRIMARY KEY,
  facility_id TEXT NOT NULL REFERENCES facilities(id),
  name TEXT NOT NULL,
  admission_date TIMESTAMPTZ NOT NULL,
  -- The normalised source record the rules engine evaluates.
  source JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX patients_facility_idx ON patients(facility_id);

CREATE TABLE thresholds (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  unit TEXT NOT NULL,
  minimum DOUBLE PRECISION NOT NULL,
  maximum DOUBLE PRECISION NOT NULL,
  version INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

CREATE TABLE threshold_history (
  id SERIAL PRIMARY KEY,
  threshold_id TEXT NOT NULL REFERENCES thresholds(id),
  old_value DOUBLE PRECISION NOT NULL,
  new_value DOUBLE PRECISION NOT NULL,
  version INTEGER NOT NULL,
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE keywords (
  id TEXT PRIMARY KEY,
  keyword TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'WARNING', 'INFO')),
  matches INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

CREATE TABLE rules (
  id TEXT PRIMARY KEY,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ,
  updated_by TEXT
);

CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor TEXT NOT NULL,
  actor_id TEXT,
  event_type TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('SUCCESS', 'DENIED', 'FAILED')),
  summary TEXT NOT NULL,
  patient_id TEXT,
  ip TEXT
);
CREATE INDEX audit_events_time_idx ON audit_events(occurred_at DESC);

CREATE TABLE sync_runs (
  id TEXT PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  trigger TEXT NOT NULL CHECK (trigger IN ('SCHEDULED', 'MANUAL')),
  status TEXT NOT NULL CHECK (status IN ('SUCCEEDED', 'RUNNING', 'FAILED')),
  records_processed INTEGER NOT NULL DEFAULT 0,
  validation_rejects INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  on_lists INTEGER NOT NULL DEFAULT 0,
  triggered_by TEXT
);
CREATE INDEX sync_runs_started_idx ON sync_runs(started_at DESC);

-- Which rules fired for each patient in each run, with the configuration
-- version they ran under: the explainability record.
CREATE TABLE rule_executions (
  run_id TEXT NOT NULL REFERENCES sync_runs(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  config_version INTEGER NOT NULL,
  priority TEXT NOT NULL,
  urgency_score INTEGER NOT NULL,
  physician_required BOOLEAN NOT NULL,
  signals JSONB NOT NULL,
  PRIMARY KEY (run_id, patient_id)
);

CREATE TABLE visit_notes (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id),
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  note TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX visit_notes_patient_idx ON visit_notes(patient_id, occurred_at DESC);

-- Monotonic counters (e.g. the rule configuration version).
CREATE TABLE app_state (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);
`,
  },
];

export async function migrate(db: Database): Promise<number[]> {
  await db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
  );
  const done = new Set(
    (
      await db.query<{ version: number }>(
        "SELECT version FROM schema_migrations",
      )
    ).map((r) => Number(r.version)),
  );
  const applied: number[] = [];
  for (const m of MIGRATIONS) {
    if (done.has(m.version)) continue;
    await db.transaction(async (tx) => {
      await tx.exec(m.sql);
      await tx.query(
        "INSERT INTO schema_migrations (version, name) VALUES ($1, $2)",
        [m.version, m.name],
      );
    });
    applied.push(m.version);
  }
  return applied;
}
