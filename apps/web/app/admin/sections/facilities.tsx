import { FACILITIES } from "./fixtures";
import { Panel } from "./ui";

export function FacilitiesSection() {
  return (
    <Panel>
      <h2 className="text-lg font-semibold">Facility management</h2>
      <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
        {FACILITIES.map(([name, address, providers]) => (
          <article
            key={name}
            className="flex flex-col gap-1.5 rounded-xl border border-border p-5 shadow-sm"
          >
            <strong>{name}</strong>
            <span className="text-sm text-muted-foreground">{address}</span>
            <small className="text-muted-foreground">
              {providers} assigned providers · Active
            </small>
          </article>
        ))}
      </div>
    </Panel>
  );
}
