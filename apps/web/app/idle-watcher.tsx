"use client";

import type { SessionResponse } from "@smart-rounding/contracts";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, handleSignedOut } from "@/lib/api-client";

/** Show the warning this long before the idle timeout. */
const WARN_BEFORE_MS = 60 * 1000;
/** Tell the server about activity at most this often. */
const PING_INTERVAL_MS = 60 * 1000;
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

  async function ping() {
    lastPing.current = Date.now();
    const session = await apiFetch<SessionResponse>("/auth/session");
    setExpiresAt(Date.parse(session.idleExpiresAt));
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

  useEffect(() => {
    if (now >= expiresAt) {
      void apiFetch("/auth/logout", { method: "POST" })
        .catch(() => undefined)
        .finally(handleSignedOut);
    }
  }, [now, expiresAt]);

  const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  if (expiresAt - now > WARN_BEFORE_MS) return null;
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
        <div className="mt-5 flex justify-end">
          <Button
            type="button"
            onClick={() => void ping().catch(() => undefined)}
          >
            Stay signed in
          </Button>
        </div>
      </div>
    </div>
  );
}
