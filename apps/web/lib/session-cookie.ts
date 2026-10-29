import type { UserRole } from "@smart-rounding/contracts";

/**
 * In demo mode the session lives in `localStorage` (see
 * `app/app-shell.tsx`) — but Server Components can't read that, so the
 * client mirrors just the role into this cookie for server-side scoping
 * (e.g. the role-specific patient list). No PHI, no real auth: this is a
 * convenience for a demo whose "identity provider" is already a client-only
 * browser-only demo session, not a security boundary. With the backend the HttpOnly session cookie is authoritative.
 *
 * Kept dependency-free (no `next/headers`) so both the client (`app-shell.tsx`,
 * via `document.cookie`) and the server (`lib/session.ts`, via `next/headers`)
 * can import it without pulling server-only APIs into the client bundle.
 */
export const SESSION_ROLE_COOKIE = "sr-role";

const KNOWN_ROLES: readonly UserRole[] = [
  "PHYSICIAN",
  "NURSE_PRACTITIONER",
  "ADMIN",
];

export function isUserRole(
  value: string | undefined | null,
): value is UserRole {
  return !!value && (KNOWN_ROLES as readonly string[]).includes(value);
}
