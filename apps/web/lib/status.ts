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

export const priorityLabels: Record<string, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const complianceLabels: Record<string, string> = {
  OVERDUE: "Overdue",
  DUE_SOON: "Due soon",
  ON_TRACK: "On track",
};
