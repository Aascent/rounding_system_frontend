"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { RouteState, Spinner } from "@/components/page";
import type { SessionResponse } from "@smart-rounding/contracts";
import { apiFetch } from "@/lib/api-client";
import { usesBackend } from "@/lib/backend";
import { isUserRole, SESSION_ROLE_COOKIE } from "@/lib/session-cookie";
import { cn } from "@/lib/utils";
import { AppNavigation } from "./app-navigation";

const SIDEBAR_KEY = "smart-rounding.sidebar";
import { IdleWatcher } from "./idle-watcher";

export type UserSession = Readonly<{
  name: string;
  role: "PHYSICIAN" | "NURSE_PRACTITIONER" | "ADMIN";
}>;

const sessionKey = "smart-rounding.session";

/**
 * Persists the session to `localStorage` (read by every client component via
 * {@link useUserSession}) and mirrors the role alone into a cookie so
 * Server Components can scope read-only data — see `lib/session.ts`.
 */
export function saveUserSession(session: UserSession): void {
  window.localStorage.setItem(sessionKey, JSON.stringify(session));
  document.cookie = `${SESSION_ROLE_COOKIE}=${session.role}; path=/; max-age=${60 * 60 * 12}; samesite=lax`;
}

export function clearUserSession(): void {
  window.localStorage.removeItem(sessionKey);
  document.cookie = `${SESSION_ROLE_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

function readUserSession(): UserSession | null {
  const stored = window.localStorage.getItem(sessionKey);
  if (!stored) return null;
  try {
    const value: unknown = JSON.parse(stored);
    if (
      typeof value === "object" &&
      value !== null &&
      "name" in value &&
      typeof value.name === "string" &&
      "role" in value &&
      isUserRole(String(value.role))
    )
      return value as UserSession;
  } catch {
    window.localStorage.removeItem(sessionKey);
  }
  return null;
}

/**
 * Reusable client-side read of the signed-in user (name and role), for any component that
 * needs the current user's name/role (e.g. attributing a visit note) without
 * duplicating the storage/parsing logic above. Returns `null` until mounted
 * (avoids a hydration mismatch) or when signed out.
 */
export function useUserSession(): UserSession | null {
  const [session, setSession] = useState<UserSession | null>(null);
  useEffect(() => setSession(readUserSession()), []);
  return session;
}

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = pathname === "/" || pathname === "/login";
  const [session, setSession] = useState<UserSession | null>(null);
  const [ready, setReady] = useState(isPublic);
  const [serverSession, setServerSession] = useState<SessionResponse | null>(
    null,
  );

  // With the backend the server session is authoritative: confirm it (an
  // ended session redirects to sign-in) and refresh the cached name/role.
  useEffect(() => {
    if (!usesBackend || isPublic) return;
    let cancelled = false;
    apiFetch<SessionResponse>("/auth/session")
      .then((current) => {
        if (cancelled) return;
        const fresh = { name: current.user.name, role: current.user.role };
        saveUserSession(fresh);
        setSession(fresh);
        setServerSession(current);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isPublic]);

  useEffect(() => {
    const current = readUserSession();
    setSession(current);
    setReady(true);
    if (!isPublic && !current) router.replace("/");
    else if (
      current &&
      pathname.startsWith("/admin") &&
      current.role !== "ADMIN"
    )
      router.replace("/provider");
    else if (
      current &&
      current.role === "ADMIN" &&
      (pathname.startsWith("/provider") || pathname.startsWith("/patients"))
    )
      router.replace("/admin");
  }, [isPublic, pathname, router]);

  const [collapsed, setCollapsed] = useState(false);

  // Remember the desktop sidebar state on this device.
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_KEY) === "collapsed");
    } catch {
      // Storage blocked: start expanded.
    }
  }, []);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(
          SIDEBAR_KEY,
          next ? "collapsed" : "expanded",
        );
      } catch {
        // Storage blocked: the toggle still works for this visit.
      }
      return next;
    });
  }

  // Ctrl+B / Cmd+B toggles the sidebar, the common convention.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleSidebar();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (isPublic) return children;
  const wrongRole =
    !!session &&
    ((pathname.startsWith("/admin") && session.role !== "ADMIN") ||
      (session.role === "ADMIN" &&
        (pathname.startsWith("/provider") ||
          pathname.startsWith("/patients"))));
  if (!ready || !session || wrongRole)
    return (
      <RouteState title="Checking session…" live="polite">
        <Spinner className="mx-auto" />
      </RouteState>
    );

  function signOut() {
    void (
      usesBackend
        ? apiFetch("/auth/logout", { method: "POST" }).catch(() => undefined)
        : Promise.resolve()
    ).finally(() => {
      clearUserSession();
      setSession(null);
      router.replace("/");
    });
  }

  return (
    <>
      <AppNavigation
        role={session.role}
        name={session.name}
        onSignOut={signOut}
        collapsed={collapsed}
        onToggleCollapsed={toggleSidebar}
      />
      {serverSession && <IdleWatcher initial={serverSession} />}
      <div
        className={cn(
          "transition-[padding] duration-200",
          collapsed ? "lg:pl-[4.5rem]" : "lg:pl-64",
        )}
      >
        {children}
      </div>
    </>
  );
}
