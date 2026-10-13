import { z } from "zod";

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 25;

export type PageMeta = Readonly<{
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}>;

export type Paginated<T> = Readonly<{ items: T[] } & PageMeta>;

export const pageMetaSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().positive(),
  hasPrev: z.boolean(),
  hasNext: z.boolean(),
});

export function paginatedSchema<T extends z.ZodTypeAny>(item: T) {
  return pageMetaSchema.extend({ items: z.array(item) });
}

function toInt(value: unknown, fallback: number): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Normalise arbitrary page / pageSize input (query string, number, missing,
 * NaN, negative, absurdly large) into safe bounds. Never throws.
 */
export function normalizePageParams(raw: {
  page?: unknown;
  pageSize?: unknown;
}): { page: number; pageSize: number } {
  const pageSize = clamp(
    toInt(raw.pageSize, DEFAULT_PAGE_SIZE),
    1,
    MAX_PAGE_SIZE,
  );
  const page = Math.max(1, toInt(raw.page, 1));
  return { page, pageSize };
}

/**
 * Slice `items` into a page. A `page` beyond the last page is clamped to the
 * last page; an empty collection returns `page: 1`, `totalPages: 1`, `items: []`.
 */
export function paginate<T>(
  items: readonly T[],
  raw: { page?: unknown; pageSize?: unknown } = {},
): Paginated<T> {
  const { pageSize } = normalizePageParams(raw);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const requestedPage = Math.max(1, toInt(raw.page, 1));
  const page = Math.min(requestedPage, totalPages);
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    total,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  };
}

/** Page numbers to render in a pager, with `-1` marking an elided gap. */
export function pageWindow(
  current: number,
  totalPages: number,
  radius = 1,
): number[] {
  if (totalPages <= 1) return [1];
  const pages = new Set<number>([1, totalPages]);
  for (let p = current - radius; p <= current + radius; p += 1)
    if (p >= 1 && p <= totalPages) pages.add(p);
  const sorted = [...pages].sort((a, b) => a - b);
  const out: number[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push(-1);
    out.push(p);
    prev = p;
  }
  return out;
}
