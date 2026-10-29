import type { FacilitySummary } from "@smart-rounding/contracts";
import { Panel } from "./ui";

export function FacilitiesSection({
  facilities,
}: Readonly<{ facilities: readonly FacilitySummary[] }>) {
  return (
    <Panel>
      <h2 className="text-lg font-semibold">Facility management</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Facilities and patients come from the EMR sync; coverage shows which
        physicians and nurse practitioners look after each one.
      </p>
      <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
        {facilities.map((facility) => (
          <article
            key={facility.id}
            className="flex flex-col gap-1.5 rounded-xl border border-border p-5 shadow-sm"
          >
            <strong>{facility.name}</strong>
            <span className="text-sm text-muted-foreground">
              {facility.address}
            </span>
            <small className="text-muted-foreground">
              {facility.patients.toLocaleString("en-US")} patients ·{" "}
              {facility.onListsToday.toLocaleString("en-US")} on today&apos;s
              lists
            </small>
            <dl className="mt-2 grid gap-1 text-[0.82rem]">
              <div>
                <dt className="inline font-semibold">Physicians: </dt>
                <dd className="inline text-muted-foreground">
                  {facility.physicians.join(", ") || "None assigned"}
                </dd>
              </div>
              <div>
                <dt className="inline font-semibold">Nurse practitioners: </dt>
                <dd className="inline text-muted-foreground">
                  {facility.nursePractitioners.join(", ") || "None assigned"}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </Panel>
  );
}
