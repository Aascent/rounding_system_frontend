import { cookies } from "next/headers";
import type { SessionResponse, UserRole } from "@smart-rounding/contracts";
import { usesBackend } from "./backend";
import { isUserRole, SESSION_ROLE_COOKIE } from "./session-cookie";

/**
 * Server-side read of the signed-in user's role. With the backend it comes
 * from the server session (authoritative); in the demo it comes from the role
 * cookie the client mirrors. Returns `null` when signed out or malformed —
 * callers decide what to do (typically redirect to `/`).
 */
export async function getSessionRole(): Promise<UserRole | null> {
  const store = await cookies();
  if (usesBackend) {
    const base = process.env.API_BASE_URL?.replace(/\/+$/, "");
    if (!base) return null;
    const response = await fetch(`${base}/api/v1/auth/session`, {
      headers: { cookie: store.toString() },
      cache: "no-store",
    }).catch(() => null);
    if (!response?.ok) return null;
    const session = (await response.json()) as SessionResponse;
    return isUserRole(session.user.role) ? session.user.role : null;
  }
  const value = store.get(SESSION_ROLE_COOKIE)?.value;
  return isUserRole(value) ? value : null;
}
