import {
  DEFAULT_PAGE_SIZE,
  parseRoundingListQuery,
  type ParsedRoundingListQuery,
} from "@smart-rounding/contracts";
import type { RoundingFilterValues } from "./rounding-filters";

export type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

/** Turn raw Next.js searchParams into the engine query + filter view-model. */
export function parseRoundingSearchParams(raw: SearchParams): {
  query: ParsedRoundingListQuery;
  filters: RoundingFilterValues;
  pageSize: number;
  querySansPage: string;
} {
  const query = parseRoundingListQuery({
    q: first(raw.q),
    priority: first(raw.priority),
    facility: first(raw.facility),
    compliance: first(raw.compliance),
    classification: first(raw.classification),
    visit: first(raw.visit),
    sort: first(raw.sort),
    page: first(raw.page),
    pageSize: first(raw.pageSize),
  });
  const { pageSize } = query;
  const filters: RoundingFilterValues = {
    q: query.q,
    priority: query.priority,
    facility: query.facility,
    compliance: query.compliance,
    classification: query.classification,
    visit: query.visit,
    sort: query.sort,
  };

  const params = new URLSearchParams();
  const add = (key: string, value: string) => {
    if (value && value !== "ALL" && value !== "URGENCY") params.set(key, value);
  };
  add("q", filters.q);
  add("priority", filters.priority);
  add("facility", filters.facility);
  add("compliance", filters.compliance);
  add("classification", filters.classification);
  add("visit", filters.visit);
  add("sort", filters.sort);
  if (pageSize !== DEFAULT_PAGE_SIZE) params.set("pageSize", String(pageSize));

  return { query, filters, pageSize, querySansPage: params.toString() };
}
