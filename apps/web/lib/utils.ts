import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge conditional class names and de-duplicate conflicting Tailwind
 * utilities. The explicit return type keeps every call site safely typed even
 * if an editor's TS server resolves `tailwind-merge`'s types lazily.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
