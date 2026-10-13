import { cookies } from "next/headers";
import type { UserRole } from "@smart-rounding/contracts";
import { isUserRole, SESSION_ROLE_COOKIE } from "./session-cookie";

/**
 * Server-side read of the synthetic session's role. Returns `null` when
 * absent or malformed (e.g. cookies blocked, a stale/tampered value) rather
 * than throwing — callers decide what to do (typically redirect to `/`).
 */
export async function getSessionRole(): Promise<UserRole | null> {
  const store = await cookies();
  const value = store.get(SESSION_ROLE_COOKIE)?.value;
  return isUserRole(value) ? value : null;
}
