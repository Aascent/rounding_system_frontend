export const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days elapsed from `from` to `to`, or null when there is no `from`. */
export function daysBetween(from: string | null, to: Date): number | null {
  if (!from) return null;
  return Math.floor((to.getTime() - new Date(from).getTime()) / DAY_MS);
}
