"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSyntheticSession, type SyntheticSession } from "./app-shell";

const accounts = {
  "provider@smart-rounding.test": {
    password: "Demo123!",
    mfa: "123456",
    session: { name: "Dr. Taylor Bennett", role: "PHYSICIAN" },
    destination: "/provider",
  },
  "np@smart-rounding.test": {
    password: "Demo123!",
    mfa: "123456",
    session: { name: "Casey Holt", role: "NURSE_PRACTITIONER" },
    destination: "/provider",
  },
  "admin@smart-rounding.test": {
    password: "Demo123!",
    mfa: "123456",
    session: { name: "Alex Reyes", role: "ADMIN" },
    destination: "/admin",
  },
} as const satisfies Record<
  string,
  {
    password: string;
    mfa: string;
    session: SyntheticSession;
    destination: string;
  }
>;
const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  mfa: z.string().regex(/^\d{6}$/, "Enter the 6-digit MFA code"),
});
type LoginValues = z.infer<typeof loginSchema>;

const fieldError = "text-xs font-bold text-destructive";

export function SyntheticLogin() {
  const router = useRouter();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", mfa: "" },
  });
  function signIn(values: LoginValues) {
    setError("");
    const account =
      accounts[values.email.trim().toLowerCase() as keyof typeof accounts];
    if (
      !account ||
      values.password !== account.password ||
      values.mfa !== account.mfa
    ) {
      setError("The email, password, or MFA code is incorrect.");
      return;
    }
    saveSyntheticSession(account.session);
    router.push(account.destination);
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
        </details>
      </section>
    </main>
  );
}
