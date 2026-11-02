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
  /** Signed in with a temporary password: nothing else works until it is changed. */
  mustChangePassword: z.boolean(),
});
export type SessionResponse = z.infer<typeof sessionResponseSchema>;

/**
 * Minimum length for a password the user chooses. NIST SP 800-63B's floor;
 * the practice's actual password policy is still to be confirmed.
 */
export const PASSWORD_MIN_LENGTH = 8;

export const changePasswordRequestSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password.").max(200),
    newPassword: z
      .string()
      .min(
        PASSWORD_MIN_LENGTH,
        `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
      )
      .max(200, "Use at most 200 characters."),
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "Choose a password different from the current one.",
    path: ["newPassword"],
  });
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;

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
