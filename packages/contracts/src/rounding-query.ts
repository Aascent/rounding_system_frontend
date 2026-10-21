import { z } from "zod";
import { normalizePageParams } from "./pagination.js";

/**
 * Single source of truth for the rounding-list query (page, filters, sort).
 * Used by the API controller, the web URL parser and the query engine, so the
 * three can never disagree about defaults or accepted values.
 *
 * Parsing is deliberately lenient and never throws: an unknown filter value
 * falls back to its default ("ALL"/"URGENCY"), mirroring how
 * {@link normalizePageParams} clamps paging. Hand-edited URLs still work.
 */

export const ROUNDING_SORTS = [
  "URGENCY",
  "PRIORITY",
  "NAME",
  "ADMISSION",
  "LAST_VISIT",
] as const;
export type RoundingSort = (typeof ROUNDING_SORTS)[number];

const trimUpper = (value: unknown): unknown =>
  typeof value === "string" ? value.trim().toUpperCase() : value;

/** Case-insensitive enum that falls back to `fallback` for anything else. */
const lenientEnum = <const T extends readonly [string, ...string[]]>(
  values: T,
  fallback: T[number],
) => z.preprocess(trimUpper, z.enum(values)).catch(fallback);

const roundingFiltersSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  priority: lenientEnum(["ALL", "HIGH", "MEDIUM", "LOW"], "ALL"),
  compliance: lenientEnum(["ALL", "OVERDUE", "DUE_SOON", "ON_TRACK"], "ALL"),
  classification: lenientEnum(["ALL", "LONG_TERM", "SHORT_TERM"], "ALL"),
  /** `TODAY` keeps only residents who need a visit today. */
  visit: lenientEnum(["ALL", "TODAY"], "ALL"),
  facility: z.string().trim().min(1).max(100).catch("ALL"),
  physicianOnly: z
    .preprocess((v) => v === true || v === "true", z.boolean())
    .catch(false),
  sort: lenientEnum(ROUNDING_SORTS, "URGENCY"),
});

export type RoundingListFilters = z.infer<typeof roundingFiltersSchema>;

/** Fully normalised query: every field present, typed and in range. */
export type ParsedRoundingListQuery = RoundingListFilters &
  Readonly<{ page: number; pageSize: number }>;

/**
 * Raw, untyped input as it arrives from a query string or a caller. Values may
 * be strings, numbers, booleans or missing.
 */
export type RoundingListQuery = Readonly<{
  page?: unknown;
  pageSize?: unknown;
  q?: unknown;
  priority?: unknown;
  facility?: unknown;
  compliance?: unknown;
  classification?: unknown;
  visit?: unknown;
  physicianOnly?: unknown;
  sort?: unknown;
}>;

export function parseRoundingListQuery(
  raw: RoundingListQuery = {},
): ParsedRoundingListQuery {
  return {
    ...roundingFiltersSchema.parse(raw),
    ...normalizePageParams(raw),
  };
}
