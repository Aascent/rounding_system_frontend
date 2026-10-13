import { Plus } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Panel({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card p-6 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function PanelHeading({
  title,
  description,
  action,
}: Readonly<{ title: string; description?: ReactNode; action?: ReactNode }>) {
  return (
    <div className="flex items-start justify-between gap-5">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function AddButton({
  label,
  onClick,
}: Readonly<{ label: string; onClick: () => void }>) {
  return (
    <Button type="button" size="sm" onClick={onClick}>
      <Plus className="size-3.5" aria-hidden="true" />
      {label}
    </Button>
  );
}

export function KeywordToggle({
  active,
  label,
  onToggle,
}: Readonly<{ active: boolean; label: string; onToggle: () => void }>) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={`${active ? "Deactivate" : "Activate"} ${label}`}
      onClick={onToggle}
      className={cn(
        "relative h-5 w-9 rounded-full p-0.5 transition-colors",
        active ? "bg-primary" : "bg-muted-foreground/45",
      )}
    >
      <span
        className={cn(
          "block size-4 rounded-full bg-white transition-transform",
          active && "translate-x-4",
        )}
      />
    </button>
  );
}

/** A `<dl>` row used by the threshold-confirm modal and the system panel. */
export function DescRow({
  term,
  children,
  className,
}: Readonly<{ term: ReactNode; children: ReactNode; className?: string }>) {
  return (
    <div className={className}>
      <dt className="text-xs font-bold uppercase tracking-[0.05em] text-muted-foreground">
        {term}
      </dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}
