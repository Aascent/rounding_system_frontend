"use client";

import { LogOut } from "lucide-react";
import { ChangePasswordForm } from "./change-password-form";

/**
 * Shown instead of the app after signing in with a temporary password (a new
 * account or an admin reset). The API refuses everything else until the
 * password is changed, so this is the only way forward besides signing out.
 */
export function PasswordChangeRequired({
  onChanged,
  onSignOut,
}: Readonly<{ onChanged: () => void; onSignOut: () => void }>) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(circle_at_15%_10%,#d8eee7_0,transparent_34%),linear-gradient(145deg,#f7faf9,#edf4f1)] p-4 sm:p-6">
      <section className="w-full max-w-[480px] rounded-2xl border border-border bg-card p-6 shadow-[0_20px_60px_rgba(23,58,48,0.13)] sm:p-9">
        <p className="text-xs font-bold uppercase tracking-[0.13em] text-primary">
          Secure access
        </p>
        <h1 className="mt-1 text-[clamp(1.6rem,4vw,2.2rem)] font-semibold leading-tight">
          Set a new password
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You signed in with a temporary password. Choose your own password to
          continue.
        </p>
        <div className="my-6">
          <ChangePasswordForm forced onChanged={onChanged} />
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="inline-flex items-center gap-2 rounded-md text-sm font-bold text-primary outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </button>
      </section>
    </main>
  );
}
