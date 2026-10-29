import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import {
  caseloadScopeForUser,
  roundingScopeForRole,
  summarizeRoundingScope,
  syntheticCensus,
  syntheticRoundingCandidates,
} from "@smart-rounding/contracts";
import {
  createTestContext,
  principal,
  type TestContext,
} from "../testing/test-context.js";

let ctx: TestContext;
before(async () => {
  ctx = await createTestContext();
});
after(() => ctx.close());

void test("the database-backed data matches the built-in demo data", async () => {
  const snap = await ctx.data.snapshot();
  assert.equal(snap.residents.length, syntheticCensus.total);
  assert.equal(snap.worklist.length, syntheticRoundingCandidates.length);
  for (const [who, role, id] of [
    ["physician", "PHYSICIAN", "user-001"],
    ["np", "NURSE_PRACTITIONER", "user-002"],
  ] as const) {
    const today = await ctx.provider.roundingList(
      { pageSize: 1 },
      principal(who),
    );
    assert.equal(
      today.total,
      summarizeRoundingScope(roundingScopeForRole(role, id)).totals.total,
      `${who} today`,
    );
    const caseload = await ctx.provider.caseload(
      { pageSize: 1 },
      principal(who),
    );
    assert.equal(
      caseload.total,
      summarizeRoundingScope(caseloadScopeForUser(role, id)).totals.total,
      `${who} caseload`,
    );
  }
});

void test("dashboard totals match the provider's own list", async () => {
  const summary = await ctx.provider.summary(principal("physician"));
  const list = await ctx.provider.roundingList(
    { pageSize: 1 },
    principal("physician"),
  );
  assert.equal(summary.dashboard.totals.patients, list.total);
  assert.equal(summary.dashboard.provider.name, "Dr. Taylor Bennett");
  const p = summary.insights.priorityBreakdown;
  assert.equal(p.HIGH + p.MEDIUM + p.LOW, list.total);
});

void test("patient access is scoped by resource, and views are audited", async () => {
  const snap = await ctx.data.snapshot();
  const caseyPatient = [...snap.npByPatientId].find(
    ([, np]) => np === "user-002",
  )![0];
  const otherPatient = [...snap.npByPatientId].find(
    ([, np]) => np && np !== "user-002",
  )![0];

  const own = await ctx.provider.patient(caseyPatient, principal("np"), null);
  assert.equal(own.patient.id, caseyPatient);
  await assert.rejects(
    ctx.provider.patient(otherPatient, principal("np"), null),
    ForbiddenException,
  );
  // Physicians oversee NP caseloads; admins never see clinical records.
  await ctx.provider.patient(otherPatient, principal("physician"), null);
  await assert.rejects(
    ctx.provider.patient(caseyPatient, principal("admin"), null),
    ForbiddenException,
  );
  await assert.rejects(
    ctx.provider.patient("no-such-patient", principal("physician"), null),
    NotFoundException,
  );
  const views = await ctx.audit.list({ eventType: "PATIENT_DETAIL_VIEW" });
  assert.ok(views.some((e) => e.outcome === "DENIED"));
  assert.ok(views.some((e) => e.summary.includes(caseyPatient)));
});

void test("visit notes are stored per patient", async () => {
  const snap = await ctx.data.snapshot();
  const id = [...snap.npByPatientId].find(([, np]) => np === "user-002")![0];
  const saved = await ctx.provider.addVisitNote(
    id,
    "Seen on rounds; stable.",
    principal("np"),
  );
  assert.equal(saved.authorName, "Casey Holt");
  const notes = await ctx.provider.visitNotes(id, principal("np"));
  assert.equal(notes[0]?.id, saved.id);
  await assert.rejects(
    ctx.provider.addVisitNote(id, "Not allowed", principal("admin")),
    ForbiddenException,
  );
});

void test("the physician's NP roster covers the whole census", async () => {
  const roster = await ctx.provider.npRoster();
  assert.equal(
    roster.reduce((sum, np) => sum + np.patientCount, 0),
    syntheticCensus.total,
  );
  const casey = await ctx.provider.npCaseload("user-002", { pageSize: 1 });
  assert.equal(
    casey.total,
    roster.find((np) => np.id === "user-002")?.patientCount,
  );
});

void test("fails closed without a configured data mode", async () => {
  const off = await createTestContext({ DATA_MODE: "disabled" });
  try {
    await assert.rejects(off.provider.summary(principal("physician")));
  } finally {
    await off.close();
  }
});
