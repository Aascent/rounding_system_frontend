import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { ConflictException } from "@nestjs/common";
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

const admin = principal("admin");

void test("threshold edits are validated, versioned, audited and re-run the rules", async () => {
  const oxygen = (await ctx.admin.listThresholds()).find(
    (t) => t.id === "oxygen-low",
  );
  assert.ok(oxygen);
  const listedBefore = (await ctx.data.snapshot()).worklist.length;

  await assert.rejects(
    ctx.admin.updateThreshold(
      oxygen.id,
      { value: oxygen.maximum + 1, version: oxygen.version },
      admin,
    ),
    ConflictException,
  );
  const updated = await ctx.admin.updateThreshold(
    oxygen.id,
    { value: 94, version: oxygen.version },
    admin,
  );
  assert.equal(updated.value, 94);
  assert.equal(updated.version, oxygen.version + 1);
  // A stale version is refused.
  await assert.rejects(
    ctx.admin.updateThreshold(
      oxygen.id,
      { value: 93, version: oxygen.version },
      admin,
    ),
    ConflictException,
  );
  // A stricter oxygen threshold flags at least as many patients.
  assert.ok((await ctx.data.snapshot()).worklist.length >= listedBefore);
  const [history] = await ctx.db.query<{ new_value: number }>(
    "SELECT new_value FROM threshold_history WHERE threshold_id = 'oxygen-low'",
  );
  assert.equal(Number(history?.new_value), 94);
  const log = await ctx.audit.list({ eventType: "THRESHOLD_UPDATE" });
  assert.match(log[0]?.summary ?? "", /from 92 to 94/);
});

void test("a new user gets a one-time password that works for sign-in", async () => {
  const created = await ctx.admin.createUser(
    {
      name: "Dana Fox",
      email: "dana.fox@example.invalid",
      role: "NURSE_PRACTITIONER",
      status: "ACTIVE",
    },
    admin,
  );
  assert.equal(created.user.email, "dana.fox@example.invalid");
  const session = await ctx.auth.login(
    {
      email: "dana.fox@example.invalid",
      password: created.temporaryPassword,
      mfa: "123456",
      remember: false,
    },
    {},
  );
  assert.equal(session.session.user.name, "Dana Fox");
  await assert.rejects(
    ctx.admin.createUser(
      {
        name: "Duplicate",
        email: "dana.fox@example.invalid",
        role: "ADMIN",
        status: "ACTIVE",
      },
      admin,
    ),
    ConflictException,
  );
});

void test("deactivating a user ends their sessions; admins cannot lock themselves out", async () => {
  const { token } = await ctx.auth.login(
    {
      email: "np@smart-rounding.test",
      password: "Demo123!",
      mfa: "123456",
      remember: false,
    },
    {},
  );
  await ctx.admin.updateUser("user-002", { status: "INACTIVE" }, admin);
  await assert.rejects(ctx.auth.resolve(token));
  await ctx.admin.updateUser("user-002", { status: "ACTIVE" }, admin);
  await assert.rejects(
    ctx.admin.updateUser(admin.subject, { status: "INACTIVE" }, admin),
    ConflictException,
  );
});

void test("rules can be switched off, except regulatory ones", async () => {
  const rules = await ctx.admin.listRules();
  assert.ok(rules.every((r) => r.active));
  await assert.rejects(
    ctx.admin.toggleRule("new-admission", { active: false }, admin),
    ConflictException,
  );
  const fever = await ctx.admin.toggleRule("fever", { active: false }, admin);
  assert.equal(fever.active, false);
  const snap = await ctx.data.snapshot();
  assert.ok(
    snap.residents.every((p) =>
      p.signals.every((s) => s.code !== "VITALS_FEVER"),
    ),
  );
  await ctx.admin.toggleRule("fever", { active: true }, admin);
});

void test("keywords can be added and switched off", async () => {
  const added = await ctx.admin.createKeyword(
    { keyword: "chest pain", category: "Cardiac", severity: "CRITICAL" },
    admin,
  );
  assert.equal(added.active, true);
  const off = await ctx.admin.toggleKeyword(added.id, { active: false }, admin);
  assert.equal(off.active, false);
});

void test("a manual sync records which rules fired for today's list", async () => {
  const started = await ctx.admin.triggerSync(admin);
  assert.equal(started.status, "RUNNING");
  await assert.rejects(ctx.admin.triggerSync(admin), ConflictException);
  const done = await ctx.admin.completeSync(started.id);
  assert.equal(done.status, "SUCCEEDED");
  const snap = await ctx.data.snapshot();
  assert.equal(done.recordsProcessed, snap.residents.length);
  const [row] = await ctx.db.query<{ count: number }>(
    "SELECT count(*)::int AS count FROM rule_executions WHERE run_id = $1",
    [started.id],
  );
  assert.equal(Number(row?.count), snap.worklist.length);
  const history = await ctx.admin.syncHistory();
  assert.equal(history[0]?.id, started.id);
});

void test("the audit log filters on the server", async () => {
  const all = await ctx.admin.auditEvents();
  assert.ok(all.length > 100);
  const logins = await ctx.admin.auditEvents({ eventType: "LOGIN" });
  assert.ok(logins.every((e) => e.eventType === "LOGIN"));
  const searched = await ctx.admin.auditEvents({ q: "threshold" });
  assert.ok(
    searched.every((e) =>
      `${e.actor} ${e.eventType} ${e.summary}`
        .toLowerCase()
        .includes("threshold"),
    ),
  );
});

void test("facilities report patients, today's lists and coverage", async () => {
  const facilities = await ctx.admin.facilities();
  assert.equal(facilities.length, 6);
  const census = await ctx.admin.census();
  assert.equal(
    facilities.reduce((s, f) => s + f.patients, 0),
    census.patients,
  );
  assert.ok(
    facilities.every(
      (f) => f.physicians.length > 0 && f.nursePractitioners.length > 0,
    ),
  );
});
