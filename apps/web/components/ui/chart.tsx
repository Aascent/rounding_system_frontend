"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type ResponsiveContainerProps,
} from "recharts";
import { cn } from "@/lib/utils";

export type ChartTone =
  "primary" | "warning" | "danger" | "success" | "neutral";

/*
 * Recharts writes `fill`/`stroke` as SVG *attributes*, where `var(--token)`
 * does not resolve. These hex values mirror the light-only palette in
 * app/styles.css; keep them in sync if the tokens change.
 */
export const TONE_VAR: Record<ChartTone, string> = {
  primary: "#0d6b5d",
  warning: "#9a641b",
  danger: "#a94032",
  success: "#2f8f6b",
  neutral: "#9aa8a4",
};

const CHART_INK = "#607370";
const CHART_GRID = "#eef3f1";
const CHART_SURFACE = "#ffffff";

const AXIS_TICK = { fill: CHART_INK, fontSize: 12 } as const;

/**
 * Shared "which segment is the mouse over" state for a chart's `Cell`s.
 * Recharts merges a `Cell`'s props onto the shape it decorates (a bar
 * rectangle or a pie sector), so per-segment mouse handlers and styling
 * declared here reach the real SVG element — this is the idiomatic recharts
 * way to make a chart feel hoverable per-segment rather than only via the
 * tooltip's row-wide cursor highlight.
 */
type ChartHover = Readonly<{
  index: number | null;
  onEnter: (index: number) => void;
  onLeave: () => void;
}>;

function useChartHover(): ChartHover {
  const [index, setIndex] = useState<number | null>(null);
  return { index, onEnter: setIndex, onLeave: () => setIndex(null) };
}

/** Spread onto a `Cell`: highlights the hovered segment, dims the rest. */
function hoverCellProps(
  hover: ChartHover,
  index: number,
): Readonly<{
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  style: CSSProperties;
  fillOpacity: number;
}> {
  const active = hover.index === index;
  const dimmed = hover.index !== null && !active;
  return {
    onMouseEnter: () => hover.onEnter(index),
    onMouseLeave: hover.onLeave,
    style: {
      cursor: "pointer",
      transition: "opacity 160ms ease, filter 160ms ease",
      filter: active
        ? "brightness(1.12) drop-shadow(0 2px 5px rgba(15,45,38,0.28))"
        : undefined,
    },
    fillOpacity: dimmed ? 0.4 : 1,
  };
}

export function ChartFrame({
  height = 260,
  className,
  children,
}: Readonly<{
  height?: number;
  className?: string;
  children: ResponsiveContainerProps["children"];
}>) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

type TooltipRow = { name?: ReactNode; value?: ReactNode; color?: string };

function ChartTooltip({
  active,
  payload,
  label,
  hideLabel,
}: {
  active?: boolean;
  payload?: TooltipRow[];
  label?: ReactNode;
  hideLabel?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      {!hideLabel && label != null && (
        <p className="mb-1 font-semibold text-foreground">{label}</p>
      )}
      <ul className="grid gap-0.5">
        {payload.map((row, i) => (
          <li key={i} className="flex items-center gap-2 text-muted-foreground">
            <span
              className="size-2 rounded-[3px]"
              style={{ background: row.color ?? "var(--primary)" }}
            />
            <span>{row.name}</span>
            <span className="ml-auto font-semibold tabular-nums text-foreground">
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type HBarDatum = Readonly<{
  label: string;
  value: number;
  tone?: ChartTone | undefined;
  meta?: string | undefined;
}>;

const RANKED_ROW_HEIGHT = 40;
const RANKED_MARGIN = 24;

/**
 * Horizontal ranked bar chart (categories on the Y axis).
 *
 * `maxVisibleRows` caps how tall the chart appears without cutting off data:
 * every row still renders at full size, but past that many rows the chart
 * becomes its own scroll region instead of growing the page indefinitely.
 */
export function RankedBarChart({
  data,
  height,
  unit,
  maxVisibleRows,
}: Readonly<{
  data: readonly HBarDatum[];
  height?: number;
  unit?: string;
  maxVisibleRows?: number;
}>) {
  const fullHeight =
    height ?? Math.max(180, data.length * RANKED_ROW_HEIGHT + RANKED_MARGIN);
  const chart = (
    <ChartFrame height={fullHeight}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 44, bottom: 4, left: 8 }}
        barCategoryGap={10}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={140}
          tickLine={false}
          axisLine={false}
          tick={AXIS_TICK}
          interval={0}
        />
        <Tooltip
          cursor={{ fill: CHART_GRID, opacity: 0.6 }}
          content={({ active, payload }) => (
            <ChartTooltip
              active={active}
              hideLabel
              payload={payload?.map((p) => ({
                name:
                  (p.payload as HBarDatum | undefined)?.meta ??
                  (p.payload as HBarDatum | undefined)?.label,
                value: `${p.value as number}${unit ? ` ${unit}` : ""}`,
                color: TONE_VAR[(p.payload as HBarDatum).tone ?? "primary"],
              }))}
            />
          )}
        />
        <Bar
          dataKey="value"
          radius={[0, 6, 6, 0]}
          maxBarSize={22}
          isAnimationActive={false}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={TONE_VAR[d.tone ?? "primary"]} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            className="fill-foreground text-xs font-semibold"
          />
        </Bar>
      </BarChart>
    </ChartFrame>
  );

  if (!maxVisibleRows || data.length <= maxVisibleRows) return chart;
  return (
    <div
      className="-mr-1 overflow-y-auto pr-1 [scrollbar-gutter:stable]"
      style={{ maxHeight: maxVisibleRows * RANKED_ROW_HEIGHT + RANKED_MARGIN }}
    >
      {chart}
    </div>
  );
}

export type StackBarDatum = Readonly<{
  label: string;
  base: number;
  critical: number;
  total: number;
}>;

/** Horizontal stacked bar: a neutral base plus a highlighted "critical" segment. */
/** A bar-end total label, drawn only on the segment `isEnd` selects. */
function totalAfter(
  data: readonly StackBarDatum[],
  isEnd: (d: StackBarDatum) => boolean,
) {
  function TotalLabel(props: {
    x?: number | string | undefined;
    y?: number | string | undefined;
    width?: number | string | undefined;
    height?: number | string | undefined;
    value?: unknown;
  }) {
    // `index` counts only rendered segments, so look the row up by label.
    const d = data.find((row) => row.label === props.value);
    if (!d || !isEnd(d)) return null;
    return (
      <text
        x={Number(props.x) + Number(props.width) + 6}
        y={Number(props.y) + Number(props.height) / 2}
        dominantBaseline="central"
        className="fill-foreground text-xs font-semibold"
      >
        {d.total}
      </text>
    );
  }
  return TotalLabel;
}

export function StackedSignalChart({
  data,
  height,
}: Readonly<{ data: readonly StackBarDatum[]; height?: number }>) {
  return (
    <ChartFrame height={height ?? Math.max(200, data.length * 40 + 24)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 32, bottom: 4, left: 8 }}
        barCategoryGap={10}
      >
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={150}
          tickLine={false}
          axisLine={false}
          tick={AXIS_TICK}
          interval={0}
        />
        <Tooltip
          cursor={{ fill: CHART_GRID, opacity: 0.6 }}
          content={({ active, payload, label }) => (
            <ChartTooltip
              active={active}
              label={label}
              payload={payload?.map((p) => ({
                name: p.name === "critical" ? "Critical" : "Not critical",
                value: p.value as number,
                color:
                  p.name === "critical" ? TONE_VAR.danger : TONE_VAR.primary,
              }))}
            />
          )}
        />
        <Bar
          isAnimationActive={false}
          dataKey="base"
          stackId="s"
          fill={TONE_VAR.primary}
          radius={[6, 0, 0, 6]}
          maxBarSize={22}
        >
          {/* The total sits after whichever segment ends the bar. */}
          <LabelList
            dataKey="label"
            content={totalAfter(data, (d) => d.critical === 0)}
          />
        </Bar>
        <Bar
          isAnimationActive={false}
          dataKey="critical"
          stackId="s"
          fill={TONE_VAR.danger}
          radius={[0, 6, 6, 0]}
          maxBarSize={22}
        >
          <LabelList
            dataKey="label"
            content={totalAfter(data, (d) => d.critical > 0)}
          />
        </Bar>
      </BarChart>
    </ChartFrame>
  );
}

export type GroupBarDatum = Readonly<{
  label: string;
  patients: number;
  highPriority: number;
}>;

export function FacilityLoadChart({
  data,
  height,
}: Readonly<{ data: readonly GroupBarDatum[]; height?: number }>) {
  return (
    <div>
      <ChartFrame height={height ?? Math.max(200, data.length * 56 + 24)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 32, bottom: 4, left: 8 }}
          barGap={4}
        >
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={150}
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK}
            interval={0}
          />
          <Tooltip
            cursor={{ fill: CHART_GRID, opacity: 0.6 }}
            content={({ active, payload, label }) => (
              <ChartTooltip
                active={active}
                label={label}
                payload={payload?.map((p) => ({
                  name:
                    p.name === "highPriority"
                      ? "High priority"
                      : "Patients today",
                  value: p.value as number,
                  color:
                    p.name === "highPriority"
                      ? TONE_VAR.danger
                      : TONE_VAR.primary,
                }))}
              />
            )}
          />
          <Bar
            isAnimationActive={false}
            dataKey="patients"
            fill={TONE_VAR.primary}
            radius={[0, 5, 5, 0]}
            maxBarSize={16}
          >
            <LabelList
              dataKey="patients"
              position="right"
              className="fill-foreground text-xs font-semibold"
            />
          </Bar>
          <Bar
            isAnimationActive={false}
            dataKey="highPriority"
            fill={TONE_VAR.danger}
            radius={[0, 5, 5, 0]}
            maxBarSize={16}
          >
            <LabelList
              dataKey="highPriority"
              position="right"
              className="fill-muted-foreground text-xs font-semibold"
            />
          </Bar>
        </BarChart>
      </ChartFrame>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-full"
            style={{ background: TONE_VAR.primary }}
          />
          Patients today
        </li>
        <li className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-full"
            style={{ background: TONE_VAR.danger }}
          />
          High priority
        </li>
      </ul>
    </div>
  );
}

export type DonutSegment = Readonly<{
  label: string;
  value: number;
  tone: ChartTone;
}>;

export function DonutChart({
  segments,
  centerLabel,
  centerSublabel,
  height = 190,
}: Readonly<{
  segments: readonly DonutSegment[];
  centerLabel?: ReactNode;
  centerSublabel?: ReactNode;
  height?: number;
}>) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const hover = useChartHover();
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <div className="relative shrink-0" style={{ width: height, height }}>
        {/*
         * Rendered before the chart (not just positioned under it) so it
         * paints first: recharts' hover tooltip is a plain sibling div in
         * this same stacking context, and an element later in the DOM paints
         * over an earlier one at the same z-index. With the label after the
         * chart, the tooltip for a wedge under the donut hole was hidden
         * behind this "1,000 / candidates" overlay. `wrapperStyle` on the
         * Tooltip below is a second, explicit guard for the same reason.
         */}
        <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-semibold leading-none">
            {centerLabel ?? total}
          </span>
          {centerSublabel && (
            <span className="mt-1 text-[0.66rem] uppercase tracking-wide text-muted-foreground">
              {centerSublabel}
            </span>
          )}
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              wrapperStyle={{ zIndex: 10 }}
              content={({ active, payload }) => (
                <ChartTooltip
                  active={active}
                  hideLabel
                  payload={payload?.map((p) => ({
                    name: (p.payload as DonutSegment).label,
                    value: p.value as number,
                    color: TONE_VAR[(p.payload as DonutSegment).tone],
                  }))}
                />
              )}
            />
            <Pie
              data={segments}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="100%"
              paddingAngle={2}
              stroke={CHART_SURFACE}
              strokeWidth={2}
              isAnimationActive={false}
            >
              {segments.map((s, i) => (
                <Cell
                  key={i}
                  fill={TONE_VAR[s.tone]}
                  strokeWidth={hover.index === i ? 3 : 2}
                  {...hoverCellProps(hover, i)}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="grid min-w-[10rem] flex-1 gap-1.5 text-sm">
        {segments.map((s, i) => (
          <li
            key={i}
            className="flex cursor-pointer items-center gap-2 rounded-md px-1 -mx-1 transition-opacity duration-150"
            style={{
              opacity: hover.index !== null && hover.index !== i ? 0.5 : 1,
            }}
            onMouseEnter={() => hover.onEnter(i)}
            onMouseLeave={hover.onLeave}
          >
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full"
              style={{ background: TONE_VAR[s.tone] }}
            />
            <span className="whitespace-nowrap text-muted-foreground">
              {s.label}
            </span>
            <span className="ml-auto pl-4 font-semibold tabular-nums">
              {s.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
