import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  createTestContext,
  principal,
  type TestContext,
} from "../testing/test-context.js";
import { AllowedBeforePasswordChange } from "./auth.decorators.js";
import { AuthenticationGuard } from "./auth.guard.js";
import { SESSION_COOKIE } from "./auth.service.js";

let ctx: TestContext;
before(async () => {
  ctx = await createTestContext({ SESSION_IDLE_MINUTES: "30" });
});
after(() => ctx.close());

const login = (email: string, overrides: Record<string, unknown> = {}) =>
  ctx.auth.login(
    {
      email,
      password: "Demo123!",
      mfa: "123456",
      remember: false,
      ...overrides,
    },
    { ip: "127.0.0.1" },
  );

void test("each seeded user signs in with their own email", async () => {
  const physician = await login("provider@smart-rounding.test");
  assert.equal(physician.session.user.role, "PHYSICIAN");
  assert.equal(physician.session.user.name, "Dr. Taylor Bennett");
  assert.equal(physician.maxAgeMs, null, "no remember me: session cookie");
  const other = await login("riley.wells7@example.invalid");
  assert.equal(other.session.user.role, "NURSE_PRACTITIONER");

  const resolved = await ctx.auth.resolve(physician.token);
  assert.equal(resolved.principal.subject, "user-001");
});

void test("wrong password, wrong MFA and unknown users get one message", async () => {
  for (const attempt of [
    () => login("provider@smart-rounding.test", { password: "nope" }),
    () => login("provider@smart-rounding.test", { mfa: "000000" }),
    () => login("nobody@smart-rounding.test"),
  ])
    await assert.rejects(attempt, (e: unknown) => {
      assert.ok(e instanceof UnauthorizedException);
      assert.match(e.message, /email, password, or MFA code is incorrect/);
      return true;
    });
  const logins = await ctx.audit.list({ eventType: "LOGIN" });
  assert.ok(logins.some((e) => e.outcome === "DENIED"));
});

void test("deactivated accounts cannot sign in", async () => {
  // user-005 (Jordan Lee) is seeded inactive.
  await assert.rejects(login("jordan@example.invalid"), UnauthorizedException);
});

void test("remember me keeps a persistent cookie for longer", async () => {
  const remembered = await login("np@smart-rounding.test", { remember: true });
  assert.ok(remembered.maxAgeMs && remembered.maxAgeMs > 24 * 60 * 60 * 1000);
  assert.equal(remembered.session.remember, true);
});

void test("idle and signed-out sessions are rejected", async () => {
  const { token } = await login("provider@smart-rounding.test");
  // Pretend the last activity was 31 minutes ago.
  await ctx.db.query(
    "UPDATE sessions SET last_seen_at = now() - interval '31 minutes' WHERE user_id = 'user-001'",
  );
  await assert.rejects(ctx.auth.resolve(token), UnauthorizedException);

  const fresh = await login("provider@smart-rounding.test");
  const resolved = await ctx.auth.resolve(fresh.token);
  await ctx.auth.logout(resolved.principal, {});
  await assert.rejects(ctx.auth.resolve(fresh.token), UnauthorizedException);
  await assert.rejects(ctx.auth.resolve(undefined), UnauthorizedException);
});

void test("passwords are stored hashed, never in plain text", async () => {
  const rows = await ctx.db.query<{ password_hash: string }>(
    "SELECT password_hash FROM users",
  );
  assert.ok(rows.every((r) => r.password_hash.startsWith("scrypt$")));
  assert.ok(rows.every((r) => !r.password_hash.includes("Demo123!")));
});

void test("repeated failures lock the account for a while", async () => {
  for (let i = 0; i < 5; i += 1)
    await assert.rejects(
      login("np@smart-rounding.test", { password: "wrong" }),
      UnauthorizedException,
    );
  // Even the right password is refused while locked.
  await assert.rejects(login("np@smart-rounding.test"), UnauthorizedException);
  await ctx.db.query(
    "UPDATE users SET locked_until = now() - interval '1 minute' WHERE email = 'np@smart-rounding.test'",
  );
  const ok = await login("np@smart-rounding.test");
  assert.equal(ok.session.user.role, "NURSE_PRACTITIONER");
});

void test("a reset password must be changed before anything else works", async () => {
  const [user] = await ctx.db.query<{ id: string }>(
    "SELECT id FROM users WHERE email = 'admin@smart-rounding.test'",
  );
  const userId = user!.id;
  const { temporaryPassword } = await ctx.admin.resetPassword(
    userId,
    principal("admin"),
  );
  const other = await login("admin@smart-rounding.test", {
    password: temporaryPassword,
  });
  const current = await login("admin@smart-rounding.test", {
    password: temporaryPassword,
  });
  assert.equal(current.session.mustChangePassword, true);

  // The guard only lets marked routes through until the password changes.
  const resolved = await ctx.auth.resolve(current.token);
  const guard = new AuthenticationGuard(new Reflector(), ctx.auth);
  const contextFor = (handler: () => void) =>
    ({
      getHandler: () => handler,
      getClass: () => class {},
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { cookie: `${SESSION_COOKIE}=${current.token}` },
        }),
      }),
    }) as unknown as ExecutionContext;
  const allowed = () => undefined;
  AllowedBeforePasswordChange()(allowed, "allowed", {
    value: allowed,
  } as PropertyDescriptor);
  assert.equal(await guard.canActivate(contextFor(allowed)), true);
  await assert.rejects(
    guard.canActivate(contextFor(() => undefined)),
    ForbiddenException,
  );

  await assert.rejects(
    ctx.auth.changePassword(
      resolved.principal,
      { currentPassword: "wrong", newPassword: "N3w-password!" },
      {},
    ),
    BadRequestException,
  );
  await ctx.auth.changePassword(
    resolved.principal,
    { currentPassword: temporaryPassword, newPassword: "N3w-password!" },
    {},
  );
  const after = await ctx.auth.resolve(current.token);
  assert.equal(after.session.mustChangePassword, false, "this session stays");
  await assert.rejects(ctx.auth.resolve(other.token), UnauthorizedException);
  await assert.rejects(
    login("admin@smart-rounding.test", { password: temporaryPassword }),
    UnauthorizedException,
  );
  const fresh = await login("admin@smart-rounding.test", {
    password: "N3w-password!",
  });
  assert.equal(fresh.session.mustChangePassword, false);
  const changes = await ctx.audit.list({ eventType: "PASSWORD_CHANGE" });
  assert.deepEqual(changes.map((e) => e.outcome).sort(), ["DENIED", "SUCCESS"]);
});

void test("wrong current passwords lock the account and sign it out", async () => {
  const first = await login("np@smart-rounding.test");
  const second = await login("np@smart-rounding.test");
  const { principal: np } = await ctx.auth.resolve(first.token);
  const attempt = () =>
    ctx.auth.changePassword(
      np,
      { currentPassword: "wrong", newPassword: "N3w-password!" },
      {},
    );
  for (let i = 1; i < ctx.environment.LOGIN_MAX_ATTEMPTS; i++)
    await assert.rejects(attempt(), BadRequestException);
  await assert.rejects(attempt(), UnauthorizedException);
  for (const token of [first.token, second.token])
    await assert.rejects(ctx.auth.resolve(token), UnauthorizedException);
  // Locked: even the right password is refused until the lock expires.
  await assert.rejects(login("np@smart-rounding.test"), UnauthorizedException);
  await ctx.db.query(
    "UPDATE users SET locked_until = NULL, failed_logins = 0 WHERE email = 'np@smart-rounding.test'",
  );
});
