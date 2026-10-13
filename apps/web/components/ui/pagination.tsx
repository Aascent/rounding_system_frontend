"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { pageWindow } from "@smart-rounding/contracts";
import { cn } from "@/lib/utils";

type BaseProps = Readonly<{
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  className?: string;
  itemLabel?: string;
}>;

/**
 * Link mode (usable from a Server Component): pass `basePath` and the current
 * query string without `page`; hrefs are built as `basePath?query&page=N`.
 * Callback mode: pass `onPageChange`.
 */
type PaginationProps = BaseProps &
  (
    | { basePath: string; query?: string; onPageChange?: never }
    | { onPageChange: (page: number) => void; basePath?: never; query?: never }
  );

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  className,
  itemLabel = "results",
  ...mode
}: PaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const windowPages = pageWindow(page, totalPages, 1);

  function cell(
    target: number,
    label: ReactNode,
    opts: { disabled?: boolean; active?: boolean; ariaLabel?: string } = {},
  ) {
    const classes = cn(
      "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2.5 text-sm font-semibold transition-colors",
      opts.active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border bg-card text-foreground hover:bg-muted",
      opts.disabled && "pointer-events-none opacity-40",
    );
    if ("basePath" in mode) {
      const qs = mode.query ? `${mode.query}&` : "";
      return (
        <Link
          href={`${mode.basePath}?${qs}page=${target}`}
          aria-label={opts.ariaLabel}
          aria-current={opts.active ? "page" : undefined}
          aria-disabled={opts.disabled || undefined}
          className={classes}
          scroll={false}
        >
          {label}
        </Link>
      );
    }
    const { onPageChange } = mode;
    return (
      <button
        type="button"
        disabled={opts.disabled}
        aria-label={opts.ariaLabel}
        aria-current={opts.active ? "page" : undefined}
        onClick={() => onPageChange(target)}
        className={classes}
      >
        {label}
      </button>
    );
  }

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex flex-col-reverse items-center justify-between gap-3 sm:flex-row",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {total === 0 ? (
          <>No {itemLabel}</>
        ) : (
          <>
            <span className="font-semibold text-foreground">
              {from.toLocaleString()}–{to.toLocaleString()}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-foreground">
              {total.toLocaleString()}
            </span>{" "}
            {itemLabel}
          </>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {cell(page - 1, <ChevronLeft className="size-4" aria-hidden="true" />, {
          disabled: page <= 1,
          ariaLabel: "Previous page",
        })}
        {windowPages.map((p, i) =>
          p === -1 ? (
            <span
              key={`gap-${i}`}
              aria-hidden="true"
              className="px-1 text-muted-foreground"
            >
              …
            </span>
          ) : (
            <span key={p}>
              {cell(p, p.toLocaleString(), {
                active: p === page,
                ariaLabel: `Page ${p}`,
              })}
            </span>
          ),
        )}
        {cell(
          page + 1,
          <ChevronRight className="size-4" aria-hidden="true" />,
          {
            disabled: page >= totalPages,
            ariaLabel: "Next page",
          },
        )}
      </div>
    </nav>
  );
}
