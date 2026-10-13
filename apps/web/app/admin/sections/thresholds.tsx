import type { Threshold } from "@smart-rounding/contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "./ui";

export function ThresholdsSection({
  thresholds,
  onReview,
}: Readonly<{
  thresholds: Threshold[];
  onReview: (item: Threshold, value: number) => void;
}>) {
  return (
    <Panel>
      <h2 className="text-lg font-semibold">Numeric thresholds</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Illustrative values only. New rule types cannot be created.
      </p>
      <div className="mt-5 grid gap-3">
        {thresholds.map((item) => (
          <form
            key={item.id}
            className="grid items-end gap-4 rounded-xl border border-border p-4 sm:grid-cols-[1fr_150px_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              onReview(item, Number(data.get("value")));
            }}
          >
            <div>
              <strong>{item.label}</strong>
              <p className="my-1 text-sm text-muted-foreground">
                {item.description}
              </p>
              <small className="text-muted-foreground">
                Allowed: {item.minimum}–{item.maximum} {item.unit} · Version{" "}
                {item.version}
              </small>
            </div>
            <Label>
              <span>Value ({item.unit})</span>
              <Input
                name="value"
                type="number"
                min={item.minimum}
                max={item.maximum}
                step="0.1"
                defaultValue={item.value}
              />
            </Label>
            <Button type="submit">Review &amp; save</Button>
          </form>
        ))}
      </div>
    </Panel>
  );
}
