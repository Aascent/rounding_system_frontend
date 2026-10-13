import {
  apiErrorSchema,
  auditEventSchema,
  dashboardResponseSchema,
  managedUserSchema,
  pageMetaSchema,
  patientDetailResponseSchema,
  queueInsightsResponseSchema,
  roundingPatientSchema,
  serviceStatusSchema,
  syncStatusSchema,
  thresholdSchema,
  thresholdUpdateSchema,
  ROUNDING_SORTS,
} from "@smart-rounding/contracts";
import { z } from "zod";

/**
 * OpenAPI 3.1 description of the application API. Component schemas are
 * generated from the same Zod contracts the API validates with, so the
 * documentation cannot drift from the payloads. Route coverage is enforced by
 * `openapi.test.ts`, which fails when a controller route is undocumented.
 */

type Method = "get" | "post" | "patch";
type Operation = Readonly<{
  summary: string;
  tags: string[];
  security?: readonly Record<string, string[]>[];
  parameters?: readonly unknown[];
  requestBody?: unknown;
  responses: Record<string, unknown>;
}>;

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

const json = (schema: unknown, description = "OK") => ({
  description,
  content: { "application/json": { schema } },
});

const body = (name: string) => ({
  required: true,
  content: { "application/json": { schema: ref(name) } },
});

const errors = {
  "400": json(ref("ApiError"), "Validation failed"),
  "401": json(ref("ApiError"), "Missing or invalid bearer token"),
  "403": json(ref("ApiError"), "Role not permitted"),
};

const pathParam = (name: string) => ({
  name,
  in: "path",
  required: true,
  schema: { type: "string" },
});

const queryParam = (
  name: string,
  description: string,
  schema: object = { type: "string" },
) => ({ name, in: "query", required: false, description, schema });

const pagingParams = [
  queryParam("page", "1-based page; clamped to the last page.", {
    type: "integer",
    minimum: 1,
    default: 1,
  }),
  queryParam("pageSize", "Items per page (1-100).", {
    type: "integer",
    minimum: 1,
    maximum: 100,
    default: 25,
  }),
];

const paginated = (item: string) => ({
  allOf: [
    ref("PageMeta"),
    {
      type: "object",
      properties: { items: { type: "array", items: ref(item) } },
    },
  ],
});

const roundingFilterParams = [
  queryParam("q", "Case-insensitive match on name, room, payer or status."),
  queryParam("priority", "Priority filter.", {
    enum: ["ALL", "HIGH", "MEDIUM", "LOW"],
  }),
  queryParam("compliance", "Compliance filter.", {
    enum: ["ALL", "OVERDUE", "DUE_SOON", "ON_TRACK"],
  }),
  queryParam("classification", "Stay classification filter.", {
    enum: ["ALL", "LONG_TERM", "SHORT_TERM"],
  }),
  queryParam("facility", "Exact facility name, or ALL."),
  queryParam("physicianOnly", "Only patients requiring a physician visit.", {
    type: "boolean",
  }),
  queryParam("sort", "Sort key (default URGENCY).", {
    enum: [...ROUNDING_SORTS],
  }),
];

const PROVIDER = ["provider"];
const ADMIN = ["admin"];
const bearer = [{ bearerAuth: [] }];

const secured = (op: Operation): Operation => ({ security: bearer, ...op });

/** `path -> method -> operation`. Paths are relative to the `/api/v1` server. */
const paths: Record<string, Partial<Record<Method, Operation>>> = {
  "/health": {
    get: {
      summary: "Liveness probe",
      tags: ["ops"],
      security: [],
      responses: { "200": json(ref("ServiceStatus")) },
    },
  },
  "/ready": {
    get: {
      summary: "Readiness probe",
      tags: ["ops"],
      security: [],
      responses: { "200": json(ref("ServiceStatus")) },
    },
  },
  "/openapi.json": {
    get: {
      summary: "This OpenAPI document",
      tags: ["ops"],
      security: [],
      responses: { "200": { description: "OpenAPI 3.1 document" } },
    },
  },
  "/auth/session": {
    get: secured({
      summary: "Current authenticated session",
      tags: ["auth"],
      responses: { "200": { description: "Session" }, ...errors },
    }),
  },
  "/provider/dashboard": {
    get: secured({
      summary: "Provider dashboard totals",
      tags: PROVIDER,
      responses: { "200": json(ref("DashboardResponse")), ...errors },
    }),
  },
  "/provider/rounding-list": {
    get: secured({
      summary: "Filtered, sorted, paginated rounding list",
      tags: PROVIDER,
      parameters: [...roundingFilterParams, ...pagingParams],
      responses: {
        "200": json(
          {
            allOf: [
              paginated("RoundingPatient"),
              {
                type: "object",
                properties: {
                  filtered: {
                    type: "integer",
                    description:
                      "Matches before paging, within the caller's scope.",
                  },
                  facilities: {
                    type: "array",
                    items: { type: "string" },
                    description:
                      "Facilities represented within the caller's scope.",
                  },
                  totals: {
                    type: "object",
                    description:
                      "Unfiltered aggregate counts for the caller's scope.",
                    properties: {
                      total: { type: "integer" },
                      highPriority: { type: "integer" },
                      overdue: { type: "integer" },
                      carryForward: { type: "integer" },
                      facilities: { type: "integer" },
                    },
                  },
                },
              },
            ],
          },
          "Hard-scoped server-side to the caller's role: PHYSICIAN sees patients whose signals require a physician visit; NURSE_PRACTITIONER sees the rest. The scope comes from the authenticated principal, never from a query parameter.",
        ),
        ...errors,
      },
    }),
  },
  "/provider/queue-insights": {
    get: secured({
      summary: "Aggregates for the priority queue charts",
      tags: PROVIDER,
      responses: { "200": json(ref("QueueInsightsResponse")), ...errors },
    }),
  },
  "/provider/patients/{id}": {
    get: secured({
      summary: "Patient detail with rule evidence",
      tags: PROVIDER,
      parameters: [pathParam("id")],
      responses: {
        "200": json(ref("PatientDetailResponse")),
        "404": json(ref("ApiError"), "Patient not found"),
        ...errors,
      },
    }),
  },
  "/admin/thresholds": {
    get: secured({
      summary: "List editable thresholds",
      tags: ADMIN,
      responses: {
        "200": json({ type: "array", items: ref("Threshold") }),
        ...errors,
      },
    }),
  },
  "/admin/thresholds/{id}": {
    patch: secured({
      summary: "Update a threshold value",
      tags: ADMIN,
      parameters: [pathParam("id")],
      requestBody: body("ThresholdUpdate"),
      responses: { "200": json(ref("Threshold")), ...errors },
    }),
  },
  "/admin/users": {
    get: secured({
      summary: "List users (paginated)",
      tags: ADMIN,
      parameters: pagingParams,
      responses: { "200": json(paginated("ManagedUser")), ...errors },
    }),
    post: secured({
      summary: "Create a user",
      tags: ADMIN,
      requestBody: body("ManagedUserInput"),
      responses: { "201": json(ref("ManagedUser")), ...errors },
    }),
  },
  "/admin/users/{id}": {
    patch: secured({
      summary: "Update a user (role, active state)",
      tags: ADMIN,
      parameters: [pathParam("id")],
      requestBody: body("ManagedUserInput"),
      responses: { "200": json(ref("ManagedUser")), ...errors },
    }),
  },
  "/admin/audit": {
    get: secured({
      summary: "Audit events (paginated)",
      tags: ADMIN,
      parameters: pagingParams,
      responses: { "200": json(paginated("AuditEvent")), ...errors },
    }),
  },
  "/admin/audit/export": {
    get: secured({
      summary: "Audit events as CSV",
      tags: ADMIN,
      responses: {
        "200": {
          description: "CSV export",
          content: { "text/csv": { schema: { type: "string" } } },
        },
        ...errors,
      },
    }),
  },
  "/admin/sync": {
    get: secured({
      summary: "Latest synchronization status",
      tags: ADMIN,
      responses: { "200": json(ref("SyncStatus")), ...errors },
    }),
    post: secured({
      summary: "Trigger a manual synchronization",
      tags: ADMIN,
      responses: { "201": json(ref("SyncStatus")), ...errors },
    }),
  },
};

const toSchema = (schema: z.ZodType): unknown =>
  z.toJSONSchema(schema, { unrepresentable: "any", io: "output" });

export function buildOpenApiDocument(version: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "Smart Rounding Compliance Platform API",
      version,
      description:
        "Synthetic-data contract. Exact production paths and PCC payloads are pending Phase 1 sandbox validation.",
    },
    servers: [{ url: "/api/v1" }],
    security: bearer,
    paths,
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        ApiError: toSchema(apiErrorSchema),
        ServiceStatus: toSchema(serviceStatusSchema),
        PageMeta: toSchema(pageMetaSchema),
        DashboardResponse: toSchema(dashboardResponseSchema),
        RoundingPatient: toSchema(roundingPatientSchema),
        QueueInsightsResponse: toSchema(queueInsightsResponseSchema),
        PatientDetailResponse: toSchema(patientDetailResponseSchema),
        Threshold: toSchema(thresholdSchema),
        ThresholdUpdate: toSchema(thresholdUpdateSchema),
        ManagedUser: toSchema(managedUserSchema),
        ManagedUserInput: toSchema(managedUserSchema.omit({ id: true })),
        AuditEvent: toSchema(auditEventSchema),
        SyncStatus: toSchema(syncStatusSchema),
      },
    },
  };
}

export type OpenApiDocument = ReturnType<typeof buildOpenApiDocument>;
