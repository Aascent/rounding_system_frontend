import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { applicationData } from "../../../lib/application-data";
import { resolveBackLink } from "@/lib/back-link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Kicker, PageContainer } from "@/components/page";
import {
  complianceLabels,
  complianceTone,
  priorityLabels,
  priorityTone,
} from "@/lib/status";
import { VisitNotes } from "./visit-notes";

// Pre-render only the hand-authored scenario patients; the ~975 generated
// records render on demand (dynamicParams defaults to true).
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await applicationData.featuredPatientIds()).map((id) => ({ id }));
}

function DescRow({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="border-t border-border py-3 first:border-t-0">
      <dt className="text-xs font-bold uppercase tracking-[0.05em] text-muted-foreground">
        {term}
      </dt>
      <dd className="mt-1.5 leading-snug">{children}</dd>
    </div>
  );
}

function utc(value: string): string {
  return `${new Date(value).toLocaleString("en-US", { timeZone: "UTC" })} UTC`;
}

const severityTone = {
  CRITICAL: "danger",
  WARNING: "warning",
  INFO: "neutral",
} as const;

export default async function PatientPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}>) {
  const { id } = await params;
  const [response, { from }] = await Promise.all([
    applicationData.patient(id),
    searchParams,
  ]);
  if (!response) notFound();
  const { patient } = response;
  const v = patient.vitals;
  const weightDelta =
    patient.weights.length >= 2
      ? patient.weights.at(-1)!.valueKg - patient.weights[0]!.valueKg
      : null;

  const backLink = await resolveBackLink(from);
  return (
    <PageContainer>
      <nav
        className="flex items-center justify-between border-b border-border py-4"
        aria-label="Breadcrumb"
      >
        <Link
          href={backLink.href}
          className="font-bold text-primary underline-offset-2 hover:underline"
        >
          ← Back to {backLink.label}
        </Link>
      </nav>

      <header className="flex flex-col gap-5 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-[760px]">
          <Kicker>Patient detail</Kicker>
          <h1 className="text-[clamp(2rem,3.5vw,3rem)] font-semibold leading-[1.08]">
            {patient.name}
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            {patient.facility} · Room {patient.room} · {patient.status}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={priorityTone(patient.priority)} dot>
            {priorityLabels[patient.priority]}
          </Badge>
          <Badge tone={complianceTone(patient.complianceStatus)} dot>
            {complianceLabels[patient.complianceStatus]}
          </Badge>
          <Badge tone="outline">
            {patient.classification === "LONG_TERM"
              ? "Long-term"
              : "Short-term"}
          </Badge>
          <Badge tone="neutral">Urgency {patient.urgencyScore}</Badge>
          {patient.physicianActionRequired && (
            <Badge tone="danger">Physician visit required</Badge>
          )}
        </div>
      </header>

      <aside className="mb-4 rounded-xl border border-dashed border-border bg-muted/40 px-5 py-3.5 text-sm">
        <strong className="text-muted-foreground">Scenario:</strong>{" "}
        {patient.scenario}
      </aside>

      <section className="mb-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Why this patient is on the list</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <p className="mb-2 text-lg leading-snug">{patient.reason}</p>
            <p className="mb-5 text-sm text-muted-foreground">
              {patient.complianceDetail}
            </p>
            {patient.signals.length === 0 ? (
              <p className="text-muted-foreground">
                No rule signals fired — routine review candidate.
              </p>
            ) : (
              <ul className="grid gap-2.5">
                {patient.signals.map((s) => (
                  <li
                    key={s.code}
                    className="grid grid-cols-[auto_1fr] items-start gap-3 border-t border-border pt-3 first:border-t-0"
                  >
                    <Badge tone={severityTone[s.severity]} size="sm">
                      {s.severity}
                    </Badge>
                    <div>
                      <strong className="block text-sm">{s.label}</strong>
                      <span className="text-sm text-muted-foreground">
                        {s.evidence}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Patient context</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <dl>
              <DescRow term="Date of birth">
                {patient.dateOfBirth ?? "Not recorded"}
              </DescRow>
              <DescRow term="Payer">{patient.payer}</DescRow>
              <DescRow term="Days since admission">
                {patient.daysSinceAdmission}
              </DescRow>
              <DescRow term="Classification basis">
                {patient.classificationBasis}
              </DescRow>
              <DescRow term="Diagnoses">{patient.diagnoses.join(", ")}</DescRow>
            </dl>
          </CardContent>
        </Card>
      </section>

      <section className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Latest vitals</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {v.recordedAt ? (
              <dl>
                <DescRow term="Temperature">
                  {v.temperatureC !== null ? `${v.temperatureC} °C` : "—"}
                </DescRow>
                <DescRow term="Oxygen saturation">
                  {v.spo2 !== null ? `${v.spo2}%` : "—"}
                </DescRow>
                <DescRow term="Blood pressure">
                  {v.systolic !== null && v.diastolic !== null
                    ? `${v.systolic}/${v.diastolic}`
                    : "—"}
                </DescRow>
                <DescRow term="Heart rate">
                  {v.heartRate !== null ? `${v.heartRate} bpm` : "—"}
                </DescRow>
                <DescRow term="Recorded">{utc(v.recordedAt)}</DescRow>
              </dl>
            ) : (
              <p className="text-muted-foreground">
                No vitals ingested in the last sync cycle.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lab flags</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {patient.labFlags.length ? (
              <ul className="grid gap-2.5">
                {patient.labFlags.map((lab) => (
                  <li
                    key={`${lab.analyte}-${lab.observedAt}`}
                    className="flex items-center justify-between gap-3 border-t border-border py-3 first:border-t-0"
                  >
                    <span>
                      <strong>{lab.analyte}</strong>
                      <span className="mt-0.5 block text-[0.78rem] text-muted-foreground">
                        {lab.value}
                      </span>
                    </span>
                    <Badge
                      tone={
                        lab.flag === "HH" || lab.flag === "LL"
                          ? "danger"
                          : lab.flag === "NORMAL"
                            ? "neutral"
                            : "warning"
                      }
                      size="sm"
                    >
                      {lab.flag}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">
                No lab flags in the last cycle.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Weight trend</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {patient.weights.length ? (
              <>
                <ul className="grid gap-2">
                  {patient.weights.map((w) => (
                    <li
                      key={w.observedAt}
                      className="flex items-center justify-between gap-3 border-t border-border py-2 text-sm first:border-t-0"
                    >
                      <time
                        dateTime={w.observedAt}
                        className="text-muted-foreground"
                      >
                        {new Date(w.observedAt).toLocaleDateString("en-US", {
                          timeZone: "UTC",
                          month: "short",
                          day: "numeric",
                        })}
                      </time>
                      <span className="font-semibold tabular-nums">
                        {w.valueKg} kg
                      </span>
                    </li>
                  ))}
                </ul>
                {weightDelta !== null && (
                  <p className="mt-2 text-[0.78rem] text-muted-foreground">
                    Net {weightDelta >= 0 ? "+" : ""}
                    {weightDelta.toFixed(1)} kg over the window shown.
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No weight readings.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="mb-4">
        <CardHeader>
          <Kicker className="mb-1">Latest clinical note</Kicker>
          <CardTitle>Note &amp; keyword hits</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <blockquote className="border-l-4 border-border pl-4 text-sm leading-relaxed text-foreground/90">
            {patient.noteText}
          </blockquote>
          <p className="mt-2 text-[0.75rem] text-muted-foreground">
            Recorded {utc(patient.noteRecordedAt)}
          </p>
          {patient.noteKeywordHits.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {patient.noteKeywordHits.map((hit) => (
                <Badge key={hit.keyword} tone="warning" size="sm">
                  {hit.keyword}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <section className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Visit history</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {patient.visitHistory.length ? (
              <ul className="grid gap-2.5">
                {patient.visitHistory.map((visit) => (
                  <li
                    key={`${visit.providerRole}-${visit.occurredAt}`}
                    className="flex flex-col gap-1 border-t border-border py-3 first:border-t-0"
                  >
                    <strong>{visit.providerRole.replaceAll("_", " ")}</strong>
                    <time
                      dateTime={visit.occurredAt}
                      className="text-[0.78rem] text-muted-foreground"
                    >
                      {utc(visit.occurredAt)}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">
                No physician or NP visit on record.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Compliance breakdown</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <dl>
              <DescRow term="Current status">
                {complianceLabels[patient.complianceStatus]}
              </DescRow>
              <DescRow term="Detail">{patient.complianceDetail}</DescRow>
              <DescRow term="Last physician visit">
                {patient.lastPhysicianVisit ?? "Not recorded"}
              </DescRow>
              <DescRow term="Last NP visit">
                {patient.lastNpVisit ?? "Not recorded"}
              </DescRow>
              <DescRow term="Carry-forward">
                {patient.carryForward ? "Yes" : "No"}
              </DescRow>
            </dl>
          </CardContent>
        </Card>
      </section>

      <div className="mb-4">
        <VisitNotes patientId={patient.id} />
      </div>

      <aside className="border-l-4 border-primary bg-secondary px-5 py-4">
        <strong>Illustrative information only</strong>
        <p className="mt-1 text-[#37524c]">
          Thresholds, keywords and classification heuristics are illustrative
          configuration — not validated clinical rules or medical advice.
        </p>
      </aside>
    </PageContainer>
  );
}
