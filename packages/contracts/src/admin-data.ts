import { illustrativeRuleConfig } from "./rules/config.js";
import type {
  AuditEvent,
  KeywordEntry,
  ManagedUser,
  SyncStatus,
  Threshold,
} from "./schemas.js";

export const syntheticThresholds: Threshold[] = [
  {
    id: "temperature-high",
    label: "Temperature review threshold",
    description: "Illustrative threshold only; pending clinical approval.",
    value: illustrativeRuleConfig.vitals.temperatureHighC,
    unit: "°C",
    minimum: 37,
    maximum: 42,
    version: 1,
    updatedAt: "2026-09-07T07:10:00.000Z",
  },
  {
    id: "oxygen-low",
    label: "Oxygen saturation review threshold",
    description: "Illustrative threshold only; pending clinical approval.",
    value: illustrativeRuleConfig.vitals.spo2LowPct,
    unit: "%",
    minimum: 80,
    maximum: 100,
    version: 1,
    updatedAt: "2026-09-07T07:10:00.000Z",
  },
  {
    id: "systolic-high",
    label: "Systolic blood pressure review threshold",
    description: "Illustrative threshold only; pending clinical approval.",
    value: illustrativeRuleConfig.vitals.systolicHigh,
    unit: "mmHg",
    minimum: 140,
    maximum: 220,
    version: 1,
    updatedAt: "2026-09-07T07:10:00.000Z",
  },
  {
    id: "heart-rate-high",
    label: "Heart rate review threshold",
    description: "Illustrative threshold only; pending clinical approval.",
    value: illustrativeRuleConfig.vitals.heartRateHigh,
    unit: "bpm",
    minimum: 90,
    maximum: 160,
    version: 1,
    updatedAt: "2026-09-07T07:10:00.000Z",
  },
  {
    id: "weight-change-acute",
    label: "Acute weight change window",
    description: "Illustrative threshold only; pending clinical approval.",
    value: illustrativeRuleConfig.weight.acutePctChange,
    unit: "%",
    minimum: 1,
    maximum: 15,
    version: 1,
    updatedAt: "2026-09-07T07:10:00.000Z",
  },
  {
    id: "long-term-interval",
    label: "Long-term physician visit interval",
    description: "Illustrative threshold only; pending clinical approval.",
    value: illustrativeRuleConfig.compliance.longTermIntervalDays,
    unit: "days",
    minimum: 14,
    maximum: 45,
    version: 1,
    updatedAt: "2026-09-07T07:10:00.000Z",
  },
];

export const syntheticKeywordLibrary: KeywordEntry[] =
  illustrativeRuleConfig.keywords.map((keyword, index) => ({
    id: `kw-${index + 1}`,
    keyword: keyword.phrase,
    category: keyword.category,
    severity: keyword.severity,
    matches: [12, 3, 2, 4, 6, 4, 5, 3, 7, 9, 5][index] ?? 0,
    active: true,
  }));

const CORE_USERS: ManagedUser[] = [
  {
    id: "user-001",
    name: "Dr. Taylor Demo",
    email: "taylor@example.invalid",
    role: "PHYSICIAN",
    status: "ACTIVE",
    providerId: "synthetic-provider-001",
  },
  {
    id: "user-002",
    name: "Casey Example",
    email: "casey@example.invalid",
    role: "NURSE_PRACTITIONER",
    status: "ACTIVE",
    providerId: "synthetic-provider-002",
  },
  {
    id: "user-003",
    name: "Alex Admin",
    email: "admin@example.invalid",
    role: "ADMIN",
    status: "ACTIVE",
    providerId: null,
  },
  {
    id: "user-004",
    name: "Dr. Priya Rao",
    email: "priya@example.invalid",
    role: "PHYSICIAN",
    status: "ACTIVE",
    providerId: "synthetic-provider-003",
  },
  {
    id: "user-005",
    name: "Jordan Lee",
    email: "jordan@example.invalid",
    role: "NURSE_PRACTITIONER",
    status: "INACTIVE",
    providerId: "synthetic-provider-004",
  },
];

function generatedUsers(count: number): ManagedUser[] {
  const first = [
    "Morgan",
    "Riley",
    "Avery",
    "Quinn",
    "Reese",
    "Parker",
    "Rowan",
    "Sage",
    "Devon",
    "Harper",
    "Emerson",
    "Finley",
    "Marlowe",
    "Ellis",
    "Blake",
  ];
  const last = [
    "Carter",
    "Bailey",
    "Reed",
    "Fisher",
    "Hayes",
    "Palmer",
    "Bishop",
    "Wells",
    "Grant",
    "Chase",
    "Sutton",
    "Vance",
    "Nash",
    "Booth",
    "Frost",
  ];
  const roles = ["PHYSICIAN", "NURSE_PRACTITIONER", "ADMIN"] as const;
  return Array.from({ length: count }, (_, i) => {
    const n = i + CORE_USERS.length + 1;
    const role = roles[(i * 7) % 10 === 0 ? 2 : i % 2] ?? "PHYSICIAN";
    // Base-15 counter (index, then carry into the surname) rather than two
    // independent `mod 15` cycles: since 15 divides evenly into both, any
    // fixed-multiplier `(i * k) % 15` pairing repeats after only 15 users
    // (whatever k is, once i wraps past 15 both indices are back where they
    // started) instead of the full 15*15 = 225 combinations.
    const fn = first[i % first.length] ?? "User";
    const ln = last[Math.floor(i / first.length) % last.length] ?? "Sample";
    return {
      id: `user-${String(n).padStart(3, "0")}`,
      name: role === "PHYSICIAN" ? `Dr. ${fn} ${ln}` : `${fn} ${ln}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}${n}@example.invalid`,
      role,
      status: i % 9 === 0 ? "INACTIVE" : "ACTIVE",
      providerId: role === "ADMIN" ? null : `synthetic-provider-${100 + n}`,
    } satisfies ManagedUser;
  });
}

export const syntheticUsers: ManagedUser[] = [
  ...CORE_USERS,
  ...generatedUsers(78),
];

const CORE_AUDIT: AuditEvent[] = [
  {
    id: "audit-0001",
    occurredAt: "2026-09-07T07:15:00.000Z",
    actor: "Alex Admin",
    eventType: "THRESHOLD_VIEW",
    outcome: "SUCCESS",
    summary: "Viewed synthetic threshold configuration",
  },
  {
    id: "audit-0002",
    occurredAt: "2026-09-07T07:00:00.000Z",
    actor: "System",
    eventType: "LIST_GENERATED",
    outcome: "SUCCESS",
    summary: "Generated 1000 synthetic rounding candidates across 6 facilities",
  },
  {
    id: "audit-0003",
    occurredAt: "2026-09-07T06:45:00.000Z",
    actor: "System",
    eventType: "SYNC_COMPLETED",
    outcome: "SUCCESS",
    summary: "Synthetic synchronization completed (1000 records, 12 rejected)",
  },
  {
    id: "audit-0004",
    occurredAt: "2026-09-07T06:30:00.000Z",
    actor: "Dr. Taylor Demo",
    eventType: "PATIENT_DETAIL_VIEW",
    outcome: "SUCCESS",
    summary: "Opened synthetic patient detail for synthetic-patient-0003",
  },
  {
    id: "audit-0005",
    occurredAt: "2026-09-06T22:10:00.000Z",
    actor: "Jordan Lee",
    eventType: "LOGIN",
    outcome: "DENIED",
    summary: "Login denied for a deactivated synthetic account",
  },
  {
    id: "audit-0006",
    occurredAt: "2026-09-06T18:05:00.000Z",
    actor: "System",
    eventType: "SYNC_FAILED",
    outcome: "FAILED",
    summary: "Synthetic sync retry after a simulated adapter timeout",
  },
];

function generatedAudit(count: number): AuditEvent[] {
  const actors = [
    "Alex Admin",
    "Dr. Taylor Demo",
    "Casey Example",
    "Dr. Priya Rao",
    "System",
    "Jordan Lee",
    "Morgan Carter",
  ];
  const types = [
    "LOGIN",
    "LOGOUT",
    "PATIENT_DETAIL_VIEW",
    "THRESHOLD_UPDATE",
    "USER_ROLE_CHANGE",
    "USER_STATUS_CHANGE",
    "KEYWORD_ADD",
    "AUDIT_EXPORT",
    "SYNC_TRIGGERED",
    "LIST_GENERATED",
  ];
  const outcomes = [
    "SUCCESS",
    "SUCCESS",
    "SUCCESS",
    "DENIED",
    "FAILED",
  ] as const;
  const base = Date.parse("2026-09-06T17:00:00.000Z");
  return Array.from({ length: count }, (_, i) => {
    const actor = actors[(i * 3) % actors.length] ?? "System";
    const eventType = types[(i * 7) % types.length] ?? "LOGIN";
    return {
      id: `audit-${String(i + CORE_AUDIT.length + 1).padStart(4, "0")}`,
      occurredAt: new Date(base - i * 9 * 60 * 1000).toISOString(),
      actor,
      eventType,
      outcome: outcomes[i % outcomes.length] ?? "SUCCESS",
      summary: `Synthetic ${eventType.toLowerCase().replaceAll("_", " ")} by ${actor}`,
    } satisfies AuditEvent;
  });
}

export const syntheticAuditEvents: AuditEvent[] = [
  ...CORE_AUDIT,
  ...generatedAudit(144),
];

export const syntheticSyncStatus: SyncStatus = {
  id: "sync-001",
  startedAt: "2026-09-07T06:44:00.000Z",
  completedAt: "2026-09-07T06:45:00.000Z",
  trigger: "SCHEDULED",
  status: "SUCCEEDED",
  recordsProcessed: 25,
  validationRejects: 1,
  errors: 0,
};
