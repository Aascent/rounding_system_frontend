/**
 * Priority / compliance → visual tone. The returned union is deliberately the
 * intersection of the `Badge` and chart tone sets, so these helpers can drive
 * both a `<Badge tone>` and a chart `tone` prop.
 */
export type StatusTone = "danger" | "warning" | "success";

export function priorityTone(priority: string): StatusTone {
  if (priority === "HIGH") return "danger";
  if (priority === "MEDIUM") return "warning";
  return "success";
}

export function complianceTone(status: string): StatusTone {
  if (status === "OVERDUE") return "danger";
  if (status === "DUE_SOON") return "warning";
  return "success";
}

/** Plain-language urgency bands, used everywhere a priority is shown. */
export const priorityLabels: Record<string, string> = {
  HIGH: "See first",
  MEDIUM: "See today",
  LOW: "Routine",
};

export const complianceLabels: Record<string, string> = {
  OVERDUE: "Overdue",
  DUE_SOON: "Due soon",
  ON_TRACK: "On schedule",
};
