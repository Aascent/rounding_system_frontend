import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Centered page column shared by every authenticated route. */
export function PageContainer({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <main
      className={cn("mx-auto w-full max-w-310 px-5 pb-10", className)}
      {...props}
    />
  );
}

export function Kicker({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "mb-2.5 text-xs font-bold uppercase tracking-[0.13em] text-primary",
        className,
      )}
      {...props}
    />
  );
}

export function PageHeading({
  kicker,
  title,
  description,
  actions,
  className,
}: Readonly<{
  kicker: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}>) {
  return (
    <section
      className={cn(
        "flex flex-col gap-6 py-11 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-[760px]">
        <Kicker>{kicker}</Kicker>
        <h1 className="text-[clamp(2rem,3.5vw,3.25rem)] font-semibold leading-[1.08]">
          {title}
        </h1>
        {description && (
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-3">{actions}</div>
      )}
    </section>
  );
}

export function RouteState({
  kicker,
  title,
  description,
  children,
  role,
  live,
}: Readonly<{
  kicker?: string;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  role?: "alert" | "status";
  live?: "polite" | "assertive";
}>) {
  return (
    <main
      className="mx-auto grid min-h-[70vh] max-w-[560px] place-items-center content-center gap-4 px-5 text-center"
      role={role}
      aria-live={live}
    >
      {kicker && <Kicker className="mb-0">{kicker}</Kicker>}
      <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-tight">
        {title}
      </h1>
      {description && <p className="text-muted-foreground">{description}</p>}
      {children}
    </main>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  valueClassName,
}: Readonly<{
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  valueClassName?: string;
}>) {
  return (
    <article className="flex min-h-[150px] flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
      <span className="text-sm font-bold text-muted-foreground">{label}</span>
      <strong
        className={cn(
          "mb-0.5 mt-auto text-[2.4rem] leading-none tracking-[-0.04em]",
          valueClassName,
        )}
      >
        {value}
      </strong>
      {hint && <small className="text-muted-foreground">{hint}</small>}
    </article>
  );
}

export function MetricGrid({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn("mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4", className)}
      {...props}
    />
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block size-9 animate-spin rounded-full border-4 border-secondary border-t-primary",
        className,
      )}
    />
  );
}
