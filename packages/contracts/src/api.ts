import { z } from "zod";
import {
  managedUserSchema,
  signalSeveritySchema,
  syncStatusSchema,
  userRoleSchema,
} from "./schemas.js";

/**
 * Request/response shapes for the backend endpoints added alongside the
 * database. Shared by the NestJS API and the web client so both validate the
 * same contract.
 */

export const loginRequestSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(200),
  mfa: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
  remember: z.boolean().default(false),
});
export type LoginRequest = z.input<typeof loginRequestSchema>;

/** The signed-in user and when the session will lapse. */
export const sessionResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.email(),
    role: userRoleSchema,
  }),
  /** When the session ends if there is no further activity. */
  idleExpiresAt: z.iso.datetime(),
  /** Hard limit regardless of activity. */
  expiresAt: z.iso.datetime(),
  idleTimeoutMinutes: z.number().int().positive(),
  remember: z.boolean(),
});
export type SessionResponse = z.infer<typeof sessionResponseSchema>;

export const createUserRequestSchema = managedUserSchema
  .omit({ id: true, providerId: true })
  .extend({
    email: z.email().trim().toLowerCase(),
    name: z.string().trim().min(2).max(120),
  });
export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;

/** A new account plus its one-time temporary password (shown once). */
export const createUserResponseSchema = z.object({
  user: managedUserSchema,
  temporaryPassword: z.string().min(8),
});
export type CreateUserResponse = z.infer<typeof createUserResponseSchema>;

export const updateUserRequestSchema = managedUserSchema
  .pick({ role: true, status: true })
  .partial();

export const createKeywordRequestSchema = z.object({
  keyword: z.string().trim().toLowerCase().min(2).max(60),
  category: z.string().trim().min(2).max(60),
  severity: signalSeveritySchema.exclude(["INFO"]),
});
export type CreateKeywordRequest = z.infer<typeof createKeywordRequestSchema>;

export const keywordToggleSchema = z.object({ active: z.boolean() });

export const facilitySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  patients: z.number().int().nonnegative(),
  onListsToday: z.number().int().nonnegative(),
  physicians: z.array(z.string()),
  nursePractitioners: z.array(z.string()),
});
export type FacilitySummary = z.infer<typeof facilitySummarySchema>;

export const syncHistorySchema = z.array(
  syncStatusSchema.extend({ onLists: z.number().int().nonnegative() }),
);
export type SyncHistory = z.infer<typeof syncHistorySchema>;

export const visitNoteCreateSchema = z.object({
  note: z.string().trim().min(3).max(4000),
});
