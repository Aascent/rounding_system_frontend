"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select";

export type RoundingFilterValues = Readonly<{
  q: string;
  priority: string;
  facility: string;
  compliance: string;
  classification: string;
  visit: string;
  sort: string;
}>;

const DEFAULTS: RoundingFilterValues = {
  q: "",
  priority: "ALL",
  facility: "ALL",
  compliance: "ALL",
  classification: "ALL",
  visit: "ALL",
  sort: "URGENCY",
};

export function RoundingFilters({
  values,
  facilities,
  pageSize,
}: Readonly<{
  values: RoundingFilterValues;
  facilities: readonly string[];
  pageSize: number;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(values.q);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => setQ(values.q), [values.q]);

  function apply(patch: Partial<RoundingFilterValues>) {
    const next = { ...values, ...patch };
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page"); // any filter change returns to page 1
    if (pageSize !== 25) params.set("pageSize", String(pageSize));
    for (const [key, def] of Object.entries(DEFAULTS)) {
      const value = next[key as keyof RoundingFilterValues];
      if (value === def || value === "") params.delete(key);
      else params.set(key, value);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function onSearch(value: string) {
    setQ(value);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => apply({ q: value.trim() }), 350);
  }

  const isFiltered =
    values.q !== "" ||
    values.priority !== "ALL" ||
    values.facility !== "ALL" ||
    values.compliance !== "ALL" ||
    values.classification !== "ALL" ||
    values.visit !== "ALL" ||
    values.sort !== "URGENCY";

  return (
    <div
      className="grid gap-3.5 border-b border-border bg-muted/40 p-6 sm:grid-cols-2 lg:grid-cols-3"
      role="search"
    >
      <Label className="sm:col-span-2 lg:col-span-1">
        <span>Search patient or room</span>
        <Input
          type="search"
          value={q}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Name, room, payer, status"
        />
      </Label>
      <Label>
        <span>Visit</span>
        <SelectField
          ariaLabel="Visit"
          value={values.visit}
          onValueChange={(v) => apply({ visit: v })}
          options={[
            { value: "ALL", label: "All patients" },
            { value: "TODAY", label: "Needs a visit today" },
          ]}
        />
      </Label>
      <Label>
        <span>Priority</span>
        <SelectField
          ariaLabel="Priority"
          value={values.priority}
          onValueChange={(v) => apply({ priority: v })}
          options={[
            { value: "ALL", label: "All priorities" },
            { value: "HIGH", label: "High" },
            { value: "MEDIUM", label: "Medium" },
            { value: "LOW", label: "Low" },
          ]}
        />
      </Label>
      <Label>
        <span>Facility</span>
        <SelectField
          ariaLabel="Facility"
          value={values.facility}
          onValueChange={(v) => apply({ facility: v })}
          options={[
            { value: "ALL", label: "All facilities" },
            ...facilities.map((f) => ({ value: f, label: f })),
          ]}
        />
      </Label>
      <Label>
        <span>Compliance</span>
        <SelectField
          ariaLabel="Compliance"
          value={values.compliance}
          onValueChange={(v) => apply({ compliance: v })}
          options={[
            { value: "ALL", label: "All statuses" },
            { value: "OVERDUE", label: "Overdue" },
            { value: "DUE_SOON", label: "Due soon" },
            { value: "ON_TRACK", label: "On schedule" },
          ]}
        />
      </Label>
      <Label>
        <span>Classification</span>
        <SelectField
          ariaLabel="Classification"
          value={values.classification}
          onValueChange={(v) => apply({ classification: v })}
          options={[
            { value: "ALL", label: "All" },
            { value: "LONG_TERM", label: "Long-term" },
            { value: "SHORT_TERM", label: "Short-term" },
          ]}
        />
      </Label>
      <Label>
        <span>Sort by</span>
        <SelectField
          ariaLabel="Sort by"
          value={values.sort}
          onValueChange={(v) => apply({ sort: v })}
          options={[
            { value: "URGENCY", label: "Urgency score" },
            { value: "PRIORITY", label: "Priority (High to Low)" },
            { value: "NAME", label: "Patient name" },
            { value: "ADMISSION", label: "Days since admission" },
            { value: "LAST_VISIT", label: "Oldest physician visit" },
          ]}
        />
      </Label>
      {isFiltered && (
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setQ("");
              router.replace(pathname, { scroll: false });
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
