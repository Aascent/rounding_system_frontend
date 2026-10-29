import { illustrativeRuleConfig } from "./rules/config.js";
import {
  roundingFacilities,
  syntheticCensus,
  syntheticRoundingCandidates,
} from "./rules/synthesize.js";
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
    name: "Dr. Taylor Bennett",
    email: "provider@smart-rounding.test",
    role: "PHYSICIAN",
    status: "ACTIVE",
    providerId: "provider-001",
  },
  {
    id: "user-002",
    name: "Casey Holt",
    email: "np@smart-rounding.test",
    role: "NURSE_PRACTITIONER",
    status: "ACTIVE",
    providerId: "provider-002",
  },
  {
    id: "user-003",
    name: "Alex Reyes",
    email: "admin@smart-rounding.test",
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
    providerId: "provider-003",
  },
  {
    id: "user-005",
    name: "Jordan Lee",
    email: "jordan@example.invalid",
    role: "NURSE_PRACTITIONER",
    status: "INACTIVE",
    providerId: "provider-004",
  },
];

function generatedUsers(): ManagedUser[] {
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
  // A practice of ~1,000 residents: 5 physicians, 9 NPs and 3 admins in all
  // (including the core accounts above), with one inactive per clinical role.
  const plan: ReadonlyArray<
    readonly [ManagedUser["role"], ManagedUser["status"]]
  > = [
    ["PHYSICIAN", "ACTIVE"],
    ["NURSE_PRACTITIONER", "ACTIVE"],
    ["NURSE_PRACTITIONER", "ACTIVE"],
    ["PHYSICIAN", "ACTIVE"],
    ["NURSE_PRACTITIONER", "ACTIVE"],
    ["ADMIN", "ACTIVE"],
    ["NURSE_PRACTITIONER", "ACTIVE"],
    ["NURSE_PRACTITIONER", "ACTIVE"],
    ["PHYSICIAN", "INACTIVE"],
    ["NURSE_PRACTITIONER", "ACTIVE"],
    ["ADMIN", "ACTIVE"],
    ["NURSE_PRACTITIONER", "ACTIVE"],
  ];
  return plan.map(([role, status], i) => {
    const n = i + CORE_USERS.length + 1;
    // The staff list is shorter than either name list, so a coprime stride
    // through the surnames gives every generated user a distinct pairing.
    const fn = first[i % first.length] ?? "User";
    const ln = last[(i * 7) % last.length] ?? "Smith";
    return {
      id: `user-${String(n).padStart(3, "0")}`,
      name: role === "PHYSICIAN" ? `Dr. ${fn} ${ln}` : `${fn} ${ln}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}${n}@example.invalid`,
      role,
      status,
      providerId: role === "ADMIN" ? null : `provider-${100 + n}`,
    } satisfies ManagedUser;
  });
}

export const syntheticUsers: ManagedUser[] = [
  ...CORE_USERS,
  ...generatedUsers(),
];

/** The latest sync processes the whole census; the engine selects today's candidates from it. */
const PATIENT_COUNT = syntheticCensus.total;
const CANDIDATE_COUNT = syntheticRoundingCandidates.length;
const SYNC_REJECTS = 12;

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const CORE_AUDIT: AuditEvent[] = [
  {
    id: "audit-0001",
    occurredAt: "2026-09-07T07:15:00.000Z",
    actor: "Alex Reyes",
    eventType: "THRESHOLD_VIEW",
    outcome: "SUCCESS",
    summary: "Viewed threshold configuration",
  },
  {
    id: "audit-0002",
    occurredAt: "2026-09-07T07:00:00.000Z",
    actor: "System",
    eventType: "LIST_GENERATED",
    outcome: "SUCCESS",
    summary: `Generated ${CANDIDATE_COUNT} rounding candidates from ${PATIENT_COUNT} patients across ${roundingFacilities.length} facilities`,
  },
  {
    id: "audit-0003",
    occurredAt: "2026-09-07T06:45:00.000Z",
    actor: "System",
    eventType: "SYNC_COMPLETED",
    outcome: "SUCCESS",
    summary: `Synchronization completed (${PATIENT_COUNT} records, ${SYNC_REJECTS} rejected)`,
  },
  {
    id: "audit-0004",
    occurredAt: "2026-09-07T06:30:00.000Z",
    actor: "Dr. Taylor Bennett",
    eventType: "PATIENT_DETAIL_VIEW",
    outcome: "SUCCESS",
    summary: "Opened patient detail for patient-003",
  },
  {
    id: "audit-0005",
    occurredAt: "2026-09-06T22:10:00.000Z",
    actor: "Jordan Lee",
    eventType: "LOGIN",
    outcome: "DENIED",
    summary: "Login denied for a deactivated account",
  },
  {
    id: "audit-0006",
    occurredAt: "2026-09-06T18:05:00.000Z",
    actor: "System",
    eventType: "SYNC_FAILED",
    outcome: "FAILED",
    summary: "Sync retry after an adapter timeout",
  },
];

function generatedAudit(count: number): AuditEvent[] {
  const actors = [
    "Alex Reyes",
    "Dr. Taylor Bennett",
    "Casey Holt",
    "Dr. Priya Rao",
    "System",
    "Jordan Lee",
    "Dr. Morgan Carter",
    "Riley Wells",
    "Parker Palmer",
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
      summary: `${capitalize(eventType.toLowerCase().replaceAll("_", " "))} by ${actor}`,
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
  recordsProcessed: PATIENT_COUNT,
  validationRejects: SYNC_REJECTS,
  errors: 0,
};

/** The practice's facilities and their street addresses. */
export const syntheticFacilities: readonly {
  id: string;
  name: string;
  address: string;
}[] = [
  {
    id: "fac-cedar-point",
    name: "Cedar Point Care",
    address: "2140 Cedar Point Road",
  },
  {
    id: "fac-lakeside",
    name: "Lakeside Skilled Nursing",
    address: "789 Lakeshore Drive",
  },
  {
    id: "fac-maple-grove",
    name: "Maple Grove Health",
    address: "315 Maple Grove Parkway",
  },
  {
    id: "fac-northwind",
    name: "Northwind Care Center",
    address: "123 Northwind Avenue",
  },
  { id: "fac-oak-manor", name: "Oak Manor", address: "456 Oak Manor Street" },
  {
    id: "fac-riverside",
    name: "Riverside Rehabilitation",
    address: "88 Riverside Boulevard",
  },
];
