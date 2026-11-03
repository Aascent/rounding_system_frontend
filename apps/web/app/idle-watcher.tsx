"use client";

import type { SessionResponse } from "@smart-rounding/contracts";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch, handleSignedOut } from "@/lib/api-client";

/** Show the warning this long before the idle timeout. */
const WARN_BEFORE_MS = 60 * 1000;
/** Tell the server about activity at most this often. */
const PING_INTERVAL_MS = 60 * 1000;
/** Give up on a session refresh that hangs (e.g. the API is waking up). */
const PING_TIMEOUT_MS = 20 * 1000;
/** "Stay signed in" retries this many times while the API wakes up. */
const STAY_ATTEMPTS = 4;
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll"] as const;

/**
 * Mirrors the server's idle timeout in the browser: activity keeps the
 * session alive, a dialog warns a minute before it lapses, and the user is
 * signed out when it does. The server enforces the timeout regardless.
 */
export function IdleWatcher({
  initial,
}: Readonly<{ initial: SessionResponse }>) {
  const [expiresAt, setExpiresAt] = useState(() =>
    Date.parse(initial.idleExpiresAt),
  );
  const [now, setNow] = useState(() => Date.now());
  const lastActivity = useRef(Date.now());
  const lastPing = useRef(Date.now());
  const [staying, setStaying] = useState(false);
  const [stayFailed, setStayFailed] = useState(false);

  async function ping() {
    lastPing.current = Date.now();
    const session = await apiFetch<SessionResponse>("/auth/session", {
      signal: AbortSignal.timeout(PING_TIMEOUT_MS),
    });
    setExpiresAt(Date.parse(session.idleExpiresAt));
  }

  /**
   * A hosted API that sleeps when idle can take up to a minute to answer the
   * first request, so keep trying on network errors and timeouts. A real
   * answer from the server (e.g. 401: the session already ended) is final.
   */
  async function staySignedIn() {
    setStaying(true);
    setStayFailed(false);
    try {
      for (let attempt = 1; ; attempt++) {
        try {
          await ping();
          return;
        } catch (caught) {
          if (caught instanceof ApiError || attempt >= STAY_ATTEMPTS)
            throw caught;
        }
      }
    } catch {
      setStayFailed(true);
    } finally {
      setStaying(false);
    }
  }

  useEffect(() => {
    const onActivity = () => {
      lastActivity.current = Date.now();
    };
    for (const name of ACTIVITY_EVENTS)
      window.addEventListener(name, onActivity, { passive: true });
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (
        lastActivity.current > lastPing.current &&
        current - lastPing.current >= PING_INTERVAL_MS
      )
        void ping().catch(() => undefined);
    }, 1000);
    return () => {
      for (const name of ACTIVITY_EVENTS)
        window.removeEventListener(name, onActivity);
      window.clearInterval(timer);
    };
  }, []);

  // When the warning appears, wake the API (if it is asleep) without counting
  // as activity, so "Stay signed in" answers quickly.
  const warning = expiresAt - now <= WARN_BEFORE_MS;
  useEffect(() => {
    if (warning)
      void fetch("/api/v1/health", { cache: "no-store" }).catch(
        () => undefined,
      );
  }, [warning]);

  useEffect(() => {
    // While "Stay signed in" is waiting, let the server's answer decide.
    if (now >= expiresAt && !staying) {
      void apiFetch("/auth/logout", { method: "POST" })
        .catch(() => undefined)
        .finally(handleSignedOut);
    }
  }, [now, expiresAt, staying]);

  const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  if (!warning) return null;
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="idle-title"
      aria-describedby="idle-description"
      className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-5"
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h2 id="idle-title" className="text-lg font-semibold">
          Are you still there?
        </h2>
        <p id="idle-description" className="mt-2 text-sm text-muted-foreground">
          For security you will be signed out in {remaining} second
          {remaining === 1 ? "" : "s"} because of inactivity.
        </p>
        {staying && (
          <p role="status" className="mt-3 text-sm text-muted-foreground">
            Connecting to the server… this can take up to a minute.
          </p>
        )}
        {stayFailed && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            Couldn&apos;t reach the server. Please try again.
          </p>
        )}
        <div className="mt-5 flex justify-end">
          <Button
            type="button"
            disabled={staying}
            aria-busy={staying}
            onClick={() => void staySignedIn()}
          >
            {staying ? "Staying signed in…" : "Stay signed in"}
          </Button>
        </div>
      </div>
    </div>
  );
}
