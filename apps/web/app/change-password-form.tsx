"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  changePasswordRequestSchema,
  PASSWORD_MIN_LENGTH,
} from "@smart-rounding/contracts";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiFetch } from "@/lib/api-client";

const formSchema = changePasswordRequestSchema
  .and(z.object({ confirmPassword: z.string() }))
  .refine((v) => v.confirmPassword === v.newPassword, {
    message: "The passwords do not match.",
    path: ["confirmPassword"],
  });
type FormValues = z.infer<typeof formSchema>;

const fieldError = "text-xs font-bold text-destructive";

/**
 * Change the signed-in user's password. Used on its own page and, after an
 * admin reset, as the screen that must be completed before anything else.
 */
export function ChangePasswordForm({
  forced = false,
  onChanged,
}: Readonly<{ forced?: boolean; onChanged: () => void }>) {
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function submit(values: FormValues) {
    setError("");
    try {
      await apiFetch("/auth/password", {
        method: "POST",
        body: {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
      });
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Something went wrong. Please try again.",
      );
      return;
    }
    reset();
    onChanged();
  }

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(event) => void handleSubmit(submit)(event)}
    >
      <Label htmlFor="current-password">
        <span>{forced ? "Temporary password" : "Current password"}</span>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          {...register("currentPassword")}
          aria-invalid={!!errors.currentPassword}
        />
        {errors.currentPassword && (
          <small className={fieldError}>{errors.currentPassword.message}</small>
        )}
      </Label>
      <Label htmlFor="new-password">
        <span>New password</span>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          aria-describedby="new-password-hint"
          {...register("newPassword")}
          aria-invalid={!!errors.newPassword}
        />
        <small
          id="new-password-hint"
          className="text-[0.75rem] text-muted-foreground"
        >
          At least {PASSWORD_MIN_LENGTH} characters. A passphrase is easiest to
          remember.
        </small>
        {errors.newPassword && (
          <small className={fieldError}>{errors.newPassword.message}</small>
        )}
      </Label>
      <Label htmlFor="confirm-password">
        <span>Confirm new password</span>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword")}
          aria-invalid={!!errors.confirmPassword}
        />
        {errors.confirmPassword && (
          <small className={fieldError}>{errors.confirmPassword.message}</small>
        )}
      </Label>
      {error && (
        <p className="text-sm font-bold text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button
        type="submit"
        size={forced ? "lg" : "default"}
        disabled={isSubmitting}
        className={forced ? undefined : "justify-self-start"}
      >
        <KeyRound className="size-4" aria-hidden="true" />
        {isSubmitting ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}
