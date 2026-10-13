import { z } from "zod";

export const serviceStatusSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  service: z.string().min(1),
  version: z.string().min(1),
  timestamp: z.iso.datetime(),
});
export type ServiceStatus = z.infer<typeof serviceStatusSchema>;

export const apiErrorSchema = z.object({
  statusCode: z.number().int().min(400).max(599),
  code: z.string().min(1),
  message: z.string().min(1),
  correlationId: z.string().min(1),
  timestamp: z.iso.datetime(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const userRoleSchema = z.enum([
  "PHYSICIAN",
  "NURSE_PRACTITIONER",
  "ADMIN",
]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const prioritySchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
export type Priority = z.infer<typeof prioritySchema>;

export const complianceStatusSchema = z.enum([
  "OVERDUE",
  "DUE_SOON",
  "ON_TRACK",
]);
export type ComplianceStatus = z.infer<typeof complianceStatusSchema>;

export const classificationSchema = z.enum(["LONG_TERM", "SHORT_TERM"]);
export type Classification = z.infer<typeof classificationSchema>;

/** Categories a fired rule can belong to. Mirrors proposal §2.1 signal groups. */
export const signalCategorySchema = z.enum([
  "COMPLIANCE",
  "NEW_ADMISSION",
  "VITALS",
  "LABS",
  "KEYWORD",
  "WEIGHT",
  "DATA_QUALITY",
]);
export type SignalCategory = z.infer<typeof signalCategorySchema>;

export const signalSeveritySchema = z.enum(["CRITICAL", "WARNING", "INFO"]);
export type SignalSeverity = z.infer<typeof signalSeveritySchema>;

export const ruleSignalSchema = z.object({
  code: z.string().min(1),
  category: signalCategorySchema,
  severity: signalSeveritySchema,
  label: z.string().min(1),
  evidence: z.string().min(1),
});
export type RuleSignal = z.infer<typeof ruleSignalSchema>;

export const roundingPatientSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  facility: z.string().min(1),
  room: z.string().min(1),
  payer: z.string().min(1),
  status: z.string().min(1),
  classification: classificationSchema,
  priority: prioritySchema,
  complianceStatus: complianceStatusSchema,
  lastPhysicianVisit: z.string().nullable(),
  lastNpVisit: z.string().nullable(),
  daysSinceAdmission: z.number().int().nonnegative(),
  urgencyScore: z.number().int().nonnegative(),
  physicianActionRequired: z.boolean(),
  reason: z.string().min(1),
  signals: z.array(ruleSignalSchema),
  carryForward: z.boolean(),
  scenario: z.string().min(1),
});
export type RoundingPatient = z.infer<typeof roundingPatientSchema>;

export const vitalsSchema = z.object({
  temperatureC: z.number().nullable(),
  spo2: z.number().nullable(),
  systolic: z.number().nullable(),
  diastolic: z.number().nullable(),
  heartRate: z.number().nullable(),
  recordedAt: z.iso.datetime().nullable(),
});
export type Vitals = z.infer<typeof vitalsSchema>;

export const labFlagSchema = z.object({
  analyte: z.string().min(1),
  value: z.string().min(1),
  flag: z.enum(["HH", "H", "NORMAL", "L", "LL"]),
  observedAt: z.iso.datetime(),
});
export type LabFlag = z.infer<typeof labFlagSchema>;

export const weightReadingSchema = z.object({
  observedAt: z.iso.datetime(),
  valueKg: z.number().positive(),
});
export type WeightReading = z.infer<typeof weightReadingSchema>;

export const dashboardResponseSchema = z.object({
  mode: z.literal("synthetic"),
  provider: z.object({
    id: z.string(),
    name: z.string(),
    role: userRoleSchema,
  }),
  generatedAt: z.iso.datetime(),
  lastSuccessfulSync: z.iso.datetime(),
  totals: z.object({
    patients: z.number().int().nonnegative(),
    highPriority: z.number().int().nonnegative(),
    overdue: z.number().int().nonnegative(),
    facilities: z.number().int().nonnegative(),
    carryForward: z.number().int().nonnegative(),
  }),
});
export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;

export const roundingListResponseSchema = z.object({
  mode: z.literal("synthetic"),
  generatedAt: z.iso.datetime(),
  items: z.array(roundingPatientSchema),
});
export type RoundingListResponse = z.infer<typeof roundingListResponseSchema>;

export const patientDetailResponseSchema = z.object({
  mode: z.literal("synthetic"),
  patient: roundingPatientSchema.extend({
    dateOfBirth: z.string().nullable(),
    diagnoses: z.array(z.string()),
    classificationBasis: z.string().min(1),
    complianceDetail: z.string().min(1),
    vitals: vitalsSchema,
    labFlags: z.array(labFlagSchema),
    weights: z.array(weightReadingSchema),
    observations: z.array(
      z.object({
        label: z.string(),
        value: z.string(),
        observedAt: z.iso.datetime(),
        status: z.string(),
      }),
    ),
    noteText: z.string(),
    noteRecordedAt: z.iso.datetime(),
    noteKeywordHits: z.array(
      z.object({ keyword: z.string(), observedAt: z.iso.datetime() }),
    ),
    visitHistory: z.array(
      z.object({ providerRole: userRoleSchema, occurredAt: z.iso.datetime() }),
    ),
    ruleEvidence: z.array(
      z.object({ rule: z.string(), evidence: z.string(), effect: z.string() }),
    ),
  }),
});
export type PatientDetailResponse = z.infer<typeof patientDetailResponseSchema>;
export type PatientDetail = PatientDetailResponse["patient"];

export const queueInsightsResponseSchema = z.object({
  mode: z.literal("synthetic"),
  generatedAt: z.iso.datetime(),
  priorityBreakdown: z.object({
    HIGH: z.number().int().nonnegative(),
    MEDIUM: z.number().int().nonnegative(),
    LOW: z.number().int().nonnegative(),
  }),
  complianceBreakdown: z.object({
    OVERDUE: z.number().int().nonnegative(),
    DUE_SOON: z.number().int().nonnegative(),
    ON_TRACK: z.number().int().nonnegative(),
  }),
  classificationBreakdown: z.object({
    LONG_TERM: z.number().int().nonnegative(),
    SHORT_TERM: z.number().int().nonnegative(),
  }),
  signalCategories: z.array(
    z.object({
      category: signalCategorySchema,
      label: z.string(),
      patients: z.number().int().nonnegative(),
      critical: z.number().int().nonnegative(),
    }),
  ),
  facilityLoad: z.array(
    z.object({
      facility: z.string(),
      patients: z.number().int().nonnegative(),
      highPriority: z.number().int().nonnegative(),
    }),
  ),
  topQueue: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      facility: z.string(),
      room: z.string(),
      priority: prioritySchema,
      classification: classificationSchema,
      complianceStatus: complianceStatusSchema,
      urgencyScore: z.number().int().nonnegative(),
      physicianActionRequired: z.boolean(),
      reason: z.string(),
    }),
  ),
});
export type QueueInsightsResponse = z.infer<typeof queueInsightsResponseSchema>;

export const thresholdSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  value: z.number(),
  unit: z.string(),
  minimum: z.number(),
  maximum: z.number(),
  version: z.number().int().positive(),
  updatedAt: z.iso.datetime(),
});
export const thresholdUpdateSchema = z.object({
  value: z.number(),
  version: z.number().int().positive(),
});
export type Threshold = z.infer<typeof thresholdSchema>;

export const managedUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  role: userRoleSchema,
  status: z.enum(["ACTIVE", "INACTIVE"]),
  providerId: z.string().nullable(),
});
export type ManagedUser = z.infer<typeof managedUserSchema>;

export const auditEventSchema = z.object({
  id: z.string(),
  occurredAt: z.iso.datetime(),
  actor: z.string(),
  eventType: z.string(),
  outcome: z.enum(["SUCCESS", "DENIED", "FAILED"]),
  summary: z.string(),
});
export type AuditEvent = z.infer<typeof auditEventSchema>;

export const syncStatusSchema = z.object({
  id: z.string(),
  startedAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
  trigger: z.enum(["SCHEDULED", "MANUAL"]),
  status: z.enum(["SUCCEEDED", "RUNNING", "FAILED"]),
  recordsProcessed: z.number().int().nonnegative(),
  validationRejects: z.number().int().nonnegative(),
  errors: z.number().int().nonnegative(),
});
export type SyncStatus = z.infer<typeof syncStatusSchema>;

export const keywordEntrySchema = z.object({
  id: z.string(),
  keyword: z.string(),
  category: z.string(),
  severity: signalSeveritySchema,
  matches: z.number().int().nonnegative(),
  active: z.boolean(),
});
export type KeywordEntry = z.infer<typeof keywordEntrySchema>;
