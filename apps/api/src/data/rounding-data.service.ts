import { Inject, Injectable } from "@nestjs/common";
import {
  SYNTHETIC_NOW,
  assignResidents,
  buildRuleConfig,
  createRoundingIndex,
  evaluateSources,
  isOnTodaysList,
  type EvaluatedResident,
  type KeywordEntry,
  type ManagedUser,
  type PatientDetail,
  type RoundingIndex,
  type RoundingPatient,
  type SyntheticPatientSource,
} from "@smart-rounding/contracts";
import type { Environment } from "../config/environment.js";
import { DATABASE, type Database } from "../database/database.js";
import { insertMany } from "../database/seed.js";

export type FacilityRecord = Readonly<{
  id: string;
  name: string;
  address: string;
}>;

/** One consistent, evaluated view of the database: what every screen reads. */
export type Snapshot = Readonly<{
  residents: readonly RoundingPatient[];
  worklist: readonly RoundingPatient[];
  details: ReadonlyMap<string, PatientDetail>;
  index: RoundingIndex;
  physicianByPatientId: ReadonlyMap<string, string>;
  npByPatientId: ReadonlyMap<string, string>;
  users: readonly ManagedUser[];
  facilities: readonly FacilityRecord[];
  /** Facility name -> covering active physicians / NPs, in coverage order. */
  coverage: ReadonlyMap<
    string,
    Readonly<{ physicians: readonly string[]; nurses: readonly string[] }>
  >;
  configVersion: number;
  evaluated: readonly EvaluatedResident[];
}>;

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: ManagedUser["role"];
  status: ManagedUser["status"];
  provider_id: string | null;
};

const asJson = <T>(value: unknown): T =>
  (typeof value === "string" ? JSON.parse(value) : value) as T;

/**
 * Loads patients and the rule configuration from the database, evaluates
 * them with the shared rules engine, and indexes the result. The snapshot is
 * cached until something that changes it (a sync, a threshold/rule/keyword
 * edit, a user change) calls {@link invalidate}.
 */
@Injectable()
export class RoundingDataService {
  private cache: Promise<Snapshot> | undefined;

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject("ENVIRONMENT") private readonly environment: Environment,
  ) {}

  /** The evaluation clock: the demo data is anchored to its own "today". */
  clock(): Date {
    return this.environment.DATA_MODE === "synthetic"
      ? new Date(SYNTHETIC_NOW)
      : new Date();
  }

  invalidate(): void {
    this.cache = undefined;
  }

  snapshot(): Promise<Snapshot> {
    this.cache ??= this.build().catch((error: unknown) => {
      this.cache = undefined;
      throw error;
    });
    return this.cache;
  }

  /** Persist which rules fired for today's list under `runId`. */
  async recordRun(runId: string, db: Database = this.db): Promise<number> {
    const snap = await this.snapshot();
    await insertMany(
      db,
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
      snap.worklist.map((p) => [
        runId,
        p.id,
        snap.configVersion,
        p.priority,
        p.urgencyScore,
        p.physicianActionRequired,
        JSON.stringify(p.signals),
      ]),
    );
    return snap.worklist.length;
  }

  private async build(): Promise<Snapshot> {
    const [
      patients,
      thresholds,
      keywords,
      rules,
      users,
      facilities,
      coverage,
      state,
    ] = await Promise.all([
      this.db.query<{ source: unknown }>(
        "SELECT source FROM patients ORDER BY id",
      ),
      this.db.query<{ id: string; value: number }>(
        "SELECT id, value FROM thresholds",
      ),
      this.db.query<{
        keyword: string;
        category: string;
        severity: KeywordEntry["severity"];
        active: boolean;
      }>("SELECT keyword, category, severity, active FROM keywords"),
      this.db.query<{ id: string; active: boolean }>(
        "SELECT id, active FROM rules",
      ),
      this.db.query<UserRow>(
        "SELECT id, name, email, role, status, provider_id FROM users ORDER BY id",
      ),
      this.db.query<FacilityRecord>(
        "SELECT id, name, address FROM facilities WHERE active ORDER BY name",
      ),
      this.db.query<{ facility: string; user_id: string; role: string }>(
        `SELECT f.name AS facility, c.user_id, u.role
             FROM facility_coverage c
             JOIN facilities f ON f.id = c.facility_id
             JOIN users u ON u.id = c.user_id
            WHERE u.status = 'ACTIVE'
            ORDER BY f.name, c.position`,
      ),
      this.db.query<{ value: number }>(
        "SELECT value FROM app_state WHERE key = 'config_version'",
      ),
    ]);

    const cfg = buildRuleConfig({
      thresholds: thresholds.map((t) => ({ id: t.id, value: Number(t.value) })),
      keywords: keywords.map((k) => ({
        keyword: k.keyword,
        category: k.category,
        severity: k.severity,
        active: Boolean(k.active),
      })),
      inactiveRuleIds: rules.filter((r) => !r.active).map((r) => r.id),
    });
    const sources = patients.map((p) =>
      asJson<SyntheticPatientSource>(p.source),
    );
    const evaluated = evaluateSources(sources, this.clock(), cfg);
    const residents = evaluated.map((e) => e.rounding);

    const physicianCoverage = new Map<string, string[]>();
    const npCoverage = new Map<string, string[]>();
    for (const row of coverage) {
      const target =
        row.role === "PHYSICIAN"
          ? physicianCoverage
          : row.role === "NURSE_PRACTITIONER"
            ? npCoverage
            : undefined;
      if (!target) continue;
      target.set(row.facility, [
        ...(target.get(row.facility) ?? []),
        row.user_id,
      ]);
    }
    const physicianByPatientId = assignResidents(residents, physicianCoverage);
    const npByPatientId = assignResidents(residents, npCoverage);

    return {
      residents,
      worklist: residents.filter(isOnTodaysList),
      details: new Map(evaluated.map((e) => [e.detail.id, e.detail])),
      index: createRoundingIndex(residents, {
        physicianByPatientId,
        npByPatientId,
      }),
      physicianByPatientId,
      npByPatientId,
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        providerId: u.provider_id,
      })),
      facilities,
      coverage: new Map(
        facilities.map((f) => [
          f.name,
          {
            physicians: physicianCoverage.get(f.name) ?? [],
            nurses: npCoverage.get(f.name) ?? [],
          },
        ]),
      ),
      configVersion: Number(state[0]?.value ?? 1),
      evaluated,
    };
  }

  /** Bump the rule configuration version (after a threshold/rule/keyword edit). */
  async bumpConfigVersion(db: Database = this.db): Promise<void> {
    await db.query(
      "UPDATE app_state SET value = value + 1 WHERE key = 'config_version'",
    );
  }
}
