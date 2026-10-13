import type { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Field wrapper: renders a <label> as a vertical stack so callers can nest
 * `<span>caption</span>`, the control, and an error message inside one element.
 */
export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      data-slot="label"
      className={cn(
        "grid gap-1.5 text-xs font-bold tracking-[0.015em] text-foreground/80 [&>span]:leading-none",
        "has-[input:disabled]:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
