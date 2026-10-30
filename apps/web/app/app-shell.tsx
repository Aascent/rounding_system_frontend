"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { RouteState, Spinner } from "@/components/page";
import type { SessionResponse } from "@smart-rounding/contracts";
import { apiFetch } from "@/lib/api-client";
import { usesBackend } from "@/lib/backend";
import { isUserRole, SESSION_ROLE_COOKIE } from "@/lib/session-cookie";
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
  const userMenuRef = useRef<HTMLDetailsElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // Keep the current page's tab visible when the nav scrolls on small screens.
  useEffect(() => {
    navRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname, session]);

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

  useEffect(() => {
    function closeAccountMenu(event: PointerEvent) {
      const menu = userMenuRef.current;
      if (menu && event.target instanceof Node && !menu.contains(event.target))
        menu.removeAttribute("open");
    }
    document.addEventListener("pointerdown", closeAccountMenu);
    return () => document.removeEventListener("pointerdown", closeAccountMenu);
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

  const navigation: ReadonlyArray<readonly [Route, string]> =
    session.role === "ADMIN"
      ? [
          ["/admin", "Dashboard"],
          ["/admin/users", "Users"],
          ["/admin/thresholds", "Thresholds"],
          ["/admin/rules", "Rules"],
          ["/admin/keywords", "Keywords"],
          ["/admin/facilities", "Facilities"],
          ["/admin/audit", "Audit"],
          ["/admin/system", "System"],
        ]
      : session.role === "PHYSICIAN"
        ? [
            ["/provider", "Dashboard"],
            ["/provider/patient-list", "Patient list"],
            // Oversight into the NP caseload — see np-list/page.tsx.
            ["/provider/np-list", "NP list"],
            ["/provider/reports", "Reports"],
          ]
        : [
            ["/provider", "Dashboard"],
            ["/provider/patient-list", "Patient list"],
            ["/provider/reports", "Reports"],
          ];
  const roleLabel = session.role.replaceAll("_", " ");
  const initials = session.name.trim().slice(0, 2).toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-50 grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-border bg-card px-5 py-2.5 shadow-sm sm:gap-8 sm:px-[max(20px,calc((100vw-1240px)/2))]">
        <Link
          className="flex items-center gap-2.5 font-bold tracking-[-0.015em]"
          href={session.role === "ADMIN" ? "/admin" : "/provider"}
        >
          <span
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-[10px] bg-gradient-to-br from-[#16816f] to-primary-strong text-sm font-bold text-white shadow-[0_4px_12px_rgba(13,107,93,0.17)]"
          >
            SR
          </span>
          <span className="hidden sm:inline">Smart Rounding</span>
        </Link>
        <nav
          ref={navRef}
          aria-label="Primary navigation"
          // Below lg the links can overflow: they scroll sideways, and the
          // right edge fades so it is clear there is more.
          className="flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] max-lg:pr-6 max-lg:[mask-image:linear-gradient(to_right,#000_calc(100%-28px),transparent)] [&::-webkit-scrollbar]:hidden"
        >
          {navigation.map(([href, label]) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-2 text-[0.82rem] font-bold transition-colors",
                  active
                    ? "text-primary-strong shadow-[inset_0_-3px_0_var(--primary)]"
                    : "text-muted-foreground hover:bg-muted hover:text-primary",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3.5">
          <span className="hidden min-w-0 flex-col items-end gap-0.5 sm:flex">
            <strong className="max-w-[170px] truncate text-sm">
              {session.name}
            </strong>
            <small className="text-[0.68rem] capitalize text-muted-foreground">
              {roleLabel.toLowerCase()}
            </small>
          </span>
          <details
            ref={userMenuRef}
            className="group relative [&_summary]:list-none"
          >
            <summary
              aria-label={`Open account menu for ${session.name}`}
              className="grid size-[42px] cursor-pointer place-items-center rounded-full border-2 border-secondary bg-gradient-to-br from-[#16816f] to-primary-strong text-[0.78rem] font-bold tracking-[0.04em] text-white outline-none transition-[border-color,box-shadow] hover:border-primary/60 hover:shadow-[0_4px_10px_rgba(13,107,93,0.24)] focus-visible:ring-[3px] focus-visible:ring-ring/60 group-open:border-primary/60 group-open:ring-[3px] group-open:ring-ring/40"
            >
              <span aria-hidden="true">{initials}</span>
            </summary>
            <div className="absolute right-0 top-[calc(100%+10px)] z-40 w-[230px] origin-top-right animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 rounded-xl border border-border bg-popover p-3.5 shadow-lg duration-150">
              <div className="flex flex-col items-start gap-0.5 border-b border-border px-0.5 pb-3">
                <strong className="text-sm">{session.name}</strong>
                <small className="text-[0.7rem] capitalize text-muted-foreground">
                  {roleLabel.toLowerCase()}
                </small>
              </div>
              <button
                type="button"
                className="mt-2.5 w-full rounded-md px-2 py-2 text-left text-sm font-semibold text-primary transition-colors hover:bg-secondary"
                onClick={() => {
                  void (
                    usesBackend
                      ? apiFetch("/auth/logout", { method: "POST" }).catch(
                          () => undefined,
                        )
                      : Promise.resolve()
                  ).finally(() => {
                    clearUserSession();
                    setSession(null);
                    router.replace("/");
                  });
                }}
              >
                Sign out
              </button>
            </div>
          </details>
        </div>
      </header>
      {serverSession && <IdleWatcher initial={serverSession} />}
      {children}
    </>
  );
}
