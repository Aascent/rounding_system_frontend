import assert from "node:assert/strict";
import test from "node:test";
import {
  VISIT_NOTE_MAX_LENGTH,
  VISIT_NOTE_MIN_LENGTH,
  visitNoteDraftSchema,
  visitNoteSchema,
} from "@smart-rounding/contracts";

const base = {
  id: "note-1",
  patientId: "patient-001",
  authorName: "Dr. Taylor Bennett",
  authorRole: "PHYSICIAN" as const,
  note: "Patient stable, continue current plan.",
  occurredAt: "2026-09-21T14:00:00.000Z",
};

void test("visitNoteSchema accepts a well-formed note", () => {
  assert.deepEqual(visitNoteSchema.parse(base), base);
});

void test("visitNoteSchema rejects an ADMIN author", () => {
  assert.throws(() => visitNoteSchema.parse({ ...base, authorRole: "ADMIN" }));
});

void test("visitNoteSchema rejects an empty, whitespace-only or oversized note", () => {
  assert.throws(() => visitNoteSchema.parse({ ...base, note: "" }));
  assert.throws(() => visitNoteSchema.parse({ ...base, note: "  " }));
  assert.throws(() =>
    visitNoteSchema.parse({
      ...base,
      note: "x".repeat(VISIT_NOTE_MAX_LENGTH + 1),
    }),
  );
  // Boundary: exactly the max length is fine.
  const atMax = visitNoteSchema.parse({
    ...base,
    note: "x".repeat(VISIT_NOTE_MAX_LENGTH),
  });
  assert.equal(atMax.note.length, VISIT_NOTE_MAX_LENGTH);
  // Boundary: shorter than the minimum is rejected.
  assert.throws(() =>
    visitNoteSchema.parse({
      ...base,
      note: "x".repeat(VISIT_NOTE_MIN_LENGTH - 1),
    }),
  );
});

void test("visitNoteSchema trims surrounding whitespace", () => {
  const parsed = visitNoteSchema.parse({ ...base, note: "  padded note  " });
  assert.equal(parsed.note, "padded note");
});

void test("visitNoteDraftSchema is just the note field", () => {
  assert.deepEqual(visitNoteDraftSchema.parse({ note: "Reviewed vitals." }), {
    note: "Reviewed vitals.",
  });
  assert.throws(() => visitNoteDraftSchema.parse({ note: "" }));
});
