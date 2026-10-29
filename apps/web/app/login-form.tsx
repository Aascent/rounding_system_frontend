"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { SessionResponse } from "@smart-rounding/contracts";
import { LogIn } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiFetch } from "@/lib/api-client";
import { usesBackend } from "@/lib/backend";
import { saveUserSession, type UserSession } from "./app-shell";

/** Demo-only sign-ins, used when no backend is configured. */
const demoAccounts = {
  "provider@smart-rounding.test": {
    password: "Demo123!",
    mfa: "123456",
    session: { name: "Dr. Taylor Bennett", role: "PHYSICIAN" },
  },
  "np@smart-rounding.test": {
    password: "Demo123!",
    mfa: "123456",
    session: { name: "Casey Holt", role: "NURSE_PRACTITIONER" },
  },
  "admin@smart-rounding.test": {
    password: "Demo123!",
    mfa: "123456",
    session: { name: "Alex Reyes", role: "ADMIN" },
  },
} as const satisfies Record<
  string,
  { password: string; mfa: string; session: UserSession }
>;

const REMEMBERED_EMAIL_KEY = "smart-rounding.remembered-email";
const INCORRECT = "The email, password, or MFA code is incorrect.";

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  mfa: z.string().regex(/^\d{6}$/, "Enter the 6-digit MFA code"),
  remember: z.boolean(),
});
type LoginValues = z.infer<typeof loginSchema>;

const fieldError = "text-xs font-bold text-destructive";

const destinationFor = (role: UserSession["role"]) =>
  role === "ADMIN" ? "/admin" : "/provider";

function readRememberedEmail(): string {
  try {
    return window.localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

function rememberEmail(email: string, remember: boolean): void {
  try {
    if (remember) window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    else window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  } catch {
    // Storage blocked: remember me still works server-side.
  }
}

export function LoginForm() {
  const router = useRouter();
  const expired = useSearchParams().get("expired") === "1";
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", mfa: "", remember: false },
  });

  useEffect(() => {
    const remembered = readRememberedEmail();
    if (remembered) {
      setValue("email", remembered);
      setValue("remember", true);
    }
  }, [setValue]);

  async function signIn(values: LoginValues) {
    setError("");
    const email = values.email.trim().toLowerCase();
    let session: UserSession;
    if (usesBackend) {
      try {
        const result = await apiFetch<SessionResponse>("/auth/login", {
          method: "POST",
          body: { ...values, email },
        });
        session = { name: result.user.name, role: result.user.role };
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : INCORRECT);
        return;
      }
    } else {
      const account = demoAccounts[email as keyof typeof demoAccounts];
      if (
        !account ||
        values.password !== account.password ||
        values.mfa !== account.mfa
      ) {
        setError(INCORRECT);
        return;
      }
      session = account.session;
    }
    rememberEmail(email, values.remember);
    saveUserSession(session);
    router.push(destinationFor(session.role));
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(circle_at_15%_10%,#d8eee7_0,transparent_34%),linear-gradient(145deg,#f7faf9,#edf4f1)] p-6">
      <section className="w-full max-w-[480px] rounded-2xl border border-border bg-card p-8 shadow-[0_20px_60px_rgba(23,58,48,0.13)] sm:p-9">
        <span
          aria-hidden="true"
          className="grid size-10 place-items-center rounded-[10px] bg-gradient-to-br from-[#16816f] to-primary-strong text-sm font-bold text-white shadow-[0_4px_12px_rgba(13,107,93,0.17)]"
        >
          SR
        </span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.13em] text-primary">
          Secure access
        </p>
        <h1 className="mt-1 text-[clamp(1.9rem,4vw,2.4rem)] font-semibold leading-tight">
          Sign in to Smart Rounding
        </h1>
        {expired && (
          <p
            className="mt-4 border-l-4 border-warning bg-warning-soft px-4 py-3 text-sm"
            role="status"
          >
            Your session ended. Please sign in again.
          </p>
        )}
        <form
          noValidate
          className="my-6 grid gap-4"
          onSubmit={(event) => void handleSubmit(signIn)(event)}
        >
          <Label htmlFor="login-email">
            <span>Email address</span>
            <Input
              id="login-email"
              type="email"
              autoComplete="username"
              {...register("email")}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <small className={fieldError}>{errors.email.message}</small>
            )}
          </Label>
          <Label htmlFor="login-password">
            <span>Password</span>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <small className={fieldError}>{errors.password.message}</small>
            )}
          </Label>
          <Label htmlFor="login-mfa">
            <span>MFA verification code</span>
            <Input
              id="login-mfa"
              inputMode="numeric"
              autoComplete="one-time-code"
              {...register("mfa")}
              aria-invalid={!!errors.mfa}
            />
            {errors.mfa && (
              <small className={fieldError}>{errors.mfa.message}</small>
            )}
          </Label>
          <label
            htmlFor="login-remember"
            className="flex cursor-pointer items-center gap-2.5 text-sm"
          >
            <input
              id="login-remember"
              type="checkbox"
              className="size-4 accent-[var(--primary)]"
              {...register("remember")}
            />
            <span>
              Remember me
              <small className="block text-[0.75rem] text-muted-foreground">
                Keep me signed in on this device and remember my email.
              </small>
            </span>
          </label>
          {error && (
            <p className="text-sm font-bold text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={isSubmitting}>
            <LogIn className="size-4" aria-hidden="true" />
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <details className="text-[0.82rem] text-muted-foreground [&_summary]:cursor-pointer [&_summary]:font-bold [&_summary]:text-primary">
          <summary>View login credentials</summary>
          <p className="mt-2">Provider: provider@smart-rounding.test</p>
          <p className="mt-1">NP: np@smart-rounding.test</p>
          <p className="mt-1">Admin: admin@smart-rounding.test</p>
          <p className="mt-1">Password: Demo123! · MFA: 123456</p>
          {usesBackend && (
            <p className="mt-2">
              Every other staff member signs in with their own email (see Admin
              → Users) and the same demo password.
            </p>
          )}
        </details>
      </section>
    </main>
  );
}
