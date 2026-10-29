"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tag, UserPlus } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select";

const userSchema = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters").max(100),
  email: z.email("Enter a valid email address").max(254),
  role: z.enum(["PHYSICIAN", "NURSE_PRACTITIONER", "ADMIN"]),
});
const keywordSchema = z.object({
  keyword: z.string().trim().min(2, "Enter at least 2 characters").max(100),
  category: z.enum([
    "Clinical",
    "Injury / safety",
    "Wound / skin",
    "Neurological",
    "Respiratory",
  ]),
});
export type UserFormValues = z.infer<typeof userSchema>;
export type KeywordFormValues = z.infer<typeof keywordSchema>;
const roles = [
  { value: "PHYSICIAN", label: "Physician" },
  { value: "NURSE_PRACTITIONER", label: "Nurse practitioner" },
  { value: "ADMIN", label: "Administrator" },
] as const;
const categories = [
  "Clinical",
  "Injury / safety",
  "Wound / skin",
  "Neurological",
  "Respiratory",
].map((value) => ({ value, label: value }));

const formCls = "grid gap-4";
const errorCls = "text-xs font-bold text-destructive";

export function UserForm({
  onSubmit,
}: Readonly<{
  onSubmit: (values: UserFormValues) => boolean | Promise<boolean>;
}>) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: "", email: "", role: "PHYSICIAN" },
  });
  return (
    <form
      className={formCls}
      noValidate
      onSubmit={(event) =>
        void handleSubmit(async (values) => {
          if (await onSubmit(values)) reset();
        })(event)
      }
    >
      <Label htmlFor="user-name">
        <span>Name</span>
        <Input
          id="user-name"
          {...register("name")}
          aria-invalid={!!errors.name}
          autoFocus
        />
        {errors.name && (
          <small className={errorCls}>{errors.name.message}</small>
        )}
      </Label>
      <Label htmlFor="user-email">
        <span>Email</span>
        <Input
          id="user-email"
          type="email"
          autoComplete="email"
          {...register("email")}
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <small className={errorCls}>{errors.email.message}</small>
        )}
      </Label>
      <Label>
        <span>Role</span>
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <SelectField
              value={field.value}
              onValueChange={field.onChange}
              options={roles}
              ariaLabel="User role"
            />
          )}
        />
      </Label>
      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={isSubmitting}>
          <UserPlus className="size-4" aria-hidden="true" />
          {isSubmitting ? "Adding…" : "Add user"}
        </Button>
      </div>
    </form>
  );
}

export function KeywordForm({
  onSubmit,
}: Readonly<{
  onSubmit: (values: KeywordFormValues) => boolean | Promise<boolean>;
}>) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<KeywordFormValues>({
    resolver: zodResolver(keywordSchema),
    defaultValues: { keyword: "", category: "Clinical" },
  });
  return (
    <form
      className={formCls}
      noValidate
      onSubmit={(event) =>
        void handleSubmit(async (values) => {
          if (await onSubmit(values)) reset();
        })(event)
      }
    >
      <Label htmlFor="keyword">
        <span>Keyword or phrase</span>
        <Input
          id="keyword"
          {...register("keyword")}
          aria-invalid={!!errors.keyword}
          autoFocus
        />
        {errors.keyword && (
          <small className={errorCls}>{errors.keyword.message}</small>
        )}
      </Label>
      <Label>
        <span>Category</span>
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <SelectField
              value={field.value}
              onValueChange={field.onChange}
              options={categories}
              ariaLabel="Keyword category"
            />
          )}
        />
      </Label>
      <p className="text-[0.8rem] leading-relaxed text-muted-foreground">
        Clinical use requires an approved keyword catalog.
      </p>
      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={isSubmitting}>
          <Tag className="size-4" aria-hidden="true" />
          {isSubmitting ? "Adding…" : "Add keyword"}
        </Button>
      </div>
    </form>
  );
}
