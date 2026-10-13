"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  VISIT_NOTE_MAX_LENGTH,
  visitNoteDraftSchema,
  visitNoteSchema,
  type VisitNote,
  type VisitNoteDraft,
} from "@smart-rounding/contracts";
import { NotebookPen } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useSyntheticSession } from "@/app/app-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const storageKey = (patientId: string) =>
  `smart-rounding.visit-notes.${patientId}`;

function newNoteId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `note-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Reads and validates the notes stored for one patient; drops anything malformed. */
function readNotes(patientId: string): VisitNote[] {
  try {
    const raw = window.localStorage.getItem(storageKey(patientId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => visitNoteSchema.safeParse(entry))
      .filter((result) => result.success)
      .map((result) => result.data);
  } catch {
    return [];
  }
}

function formatNoteTime(value: string): string {
  return `${new Date(value).toLocaleString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })} UTC`;
}

const roleLabel = {
  PHYSICIAN: "Physician",
  NURSE_PRACTITIONER: "Nurse practitioner",
} as const;

export function VisitNotes({ patientId }: Readonly<{ patientId: string }>) {
  const session = useSyntheticSession();
  const [notes, setNotes] = useState<VisitNote[] | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  useEffect(() => setNotes(readNotes(patientId)), [patientId]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VisitNoteDraft>({
    resolver: zodResolver(visitNoteDraftSchema),
    defaultValues: { note: "" },
  });
  const noteLength = watch("note")?.length ?? 0;

  const canAuthor =
    session?.role === "PHYSICIAN" || session?.role === "NURSE_PRACTITIONER";

  function addNote(values: VisitNoteDraft) {
    if (!canAuthor || !session) return;
    const entry = visitNoteSchema.parse({
      id: newNoteId(),
      patientId,
      authorName: session.name,
      authorRole: session.role,
      note: values.note,
      occurredAt: new Date().toISOString(),
    });
    const next = [entry, ...(notes ?? [])];
    setNotes(next);
    try {
      window.localStorage.setItem(storageKey(patientId), JSON.stringify(next));
    } catch {
      // Storage can be full or blocked (private browsing); the note still
      // shows for this session, it just won't survive a reload.
    }
    setJustAddedId(entry.id);
    reset({ note: "" });
  }

  const remaining = VISIT_NOTE_MAX_LENGTH - noteLength;
  const nearLimit = remaining <= 200;
  const loaded = notes !== null;
  const sortedNotes = useMemo(() => notes ?? [], [notes]);

  return (
    <section
      className="rounded-2xl border border-border bg-card shadow-sm"
      aria-labelledby="visit-notes-heading"
    >
      <header className="flex items-center gap-2.5 border-b border-border px-6 py-4">
        <NotebookPen className="size-4 text-primary" aria-hidden="true" />
        <h2 id="visit-notes-heading" className="text-base font-semibold">
          Visit notes
        </h2>
        {loaded && sortedNotes.length > 0 && (
          <span className="ml-auto text-xs font-semibold text-muted-foreground">
            {sortedNotes.length} note{sortedNotes.length === 1 ? "" : "s"}
          </span>
        )}
      </header>

      <div className="px-6 py-4">
        {canAuthor ? (
          <form
            noValidate
            className="grid gap-2.5"
            onSubmit={(event) => void handleSubmit(addNote)(event)}
          >
            <Label htmlFor="visit-note-text" className="sr-only">
              Add a visit note
            </Label>
            <Textarea
              id="visit-note-text"
              placeholder="Document what you observed and any follow-up during this visit…"
              maxLength={VISIT_NOTE_MAX_LENGTH}
              aria-invalid={!!errors.note}
              aria-describedby="visit-note-count"
              {...register("note")}
            />
            <div className="flex items-center justify-between gap-3">
              <span aria-live="polite">
                {errors.note && (
                  <small className="text-xs font-bold text-destructive">
                    {errors.note.message}
                  </small>
                )}
              </span>
              <div className="flex items-center gap-3">
                <small
                  id="visit-note-count"
                  className={
                    nearLimit
                      ? "text-xs font-semibold text-warning"
                      : "text-xs text-muted-foreground"
                  }
                >
                  {remaining.toLocaleString()} characters left
                </small>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? "Saving…" : "Add note"}
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sign in as a physician or nurse practitioner to add a visit note.
          </p>
        )}
        <p className="mt-3 text-[0.72rem] text-muted-foreground">
          Stored in this browser only for the synthetic preview — not synced to
          a backend or other devices.
        </p>
      </div>

      <div className="border-t border-border">
        {!loaded ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            Loading notes…
          </p>
        ) : sortedNotes.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            No visit notes yet — add one above.
          </p>
        ) : (
          <ul className="grid gap-0" aria-label="Visit notes, newest first">
            {sortedNotes.map((note) => (
              <li
                key={note.id}
                className={
                  note.id === justAddedId
                    ? "border-t border-border bg-secondary/50 px-6 py-4 first:border-t-0"
                    : "border-t border-border px-6 py-4 first:border-t-0"
                }
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <strong className="text-sm">{note.authorName}</strong>
                  <span className="text-[0.72rem] font-bold uppercase tracking-wide text-muted-foreground">
                    {roleLabel[note.authorRole]}
                  </span>
                  <time
                    dateTime={note.occurredAt}
                    className="ml-auto text-[0.75rem] text-muted-foreground"
                  >
                    {formatNoteTime(note.occurredAt)}
                  </time>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {note.note}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
