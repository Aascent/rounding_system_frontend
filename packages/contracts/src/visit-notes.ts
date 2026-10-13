import { z } from "zod";
import { userRoleSchema } from "./schemas.js";

/**
 * A free-text rounding note a physician or NP attaches to a patient during
 * their visit. Distinct from `PatientDetail.noteText` (the single ingested
 * PCC clinical note used for keyword detection) — this is an app-authored
 * log entry, one per visit, newest first.
 *
 * V1 note: this ships client-side only (see `apps/web`'s patient page),
 * stored per-browser rather than synced to a backend — there is no
 * persistence tier yet (see docs/API.md). The shape is defined here so the
 * same schema can back a real endpoint later without a breaking change.
 */

export const VISIT_NOTE_MAX_LENGTH = 4000;
export const VISIT_NOTE_MIN_LENGTH = 3;

/** Only the two roles that round on patients can author a visit note. */
export const visitNoteAuthorRoleSchema = userRoleSchema.exclude(["ADMIN"]);
export type VisitNoteAuthorRole = z.infer<typeof visitNoteAuthorRoleSchema>;

export const visitNoteSchema = z.object({
  id: z.string().min(1),
  patientId: z.string().min(1),
  authorName: z.string().trim().min(1).max(120),
  authorRole: visitNoteAuthorRoleSchema,
  note: z.string().trim().min(VISIT_NOTE_MIN_LENGTH).max(VISIT_NOTE_MAX_LENGTH),
  occurredAt: z.iso.datetime(),
});
export type VisitNote = z.infer<typeof visitNoteSchema>;

/** What the "add a note" form submits before an id/timestamp are stamped on. */
export const visitNoteDraftSchema = visitNoteSchema.pick({ note: true });
export type VisitNoteDraft = z.infer<typeof visitNoteDraftSchema>;
