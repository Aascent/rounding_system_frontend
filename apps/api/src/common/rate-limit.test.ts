import assert from "node:assert/strict";
import { test } from "node:test";
import type { ExecutionContext } from "@nestjs/common";
import { PasswordAttempt } from "../auth/auth.decorators.js";
import { loadEnvironment } from "../config/environment.js";
import { rateLimitOptions } from "./rate-limit.js";

const options = rateLimitOptions(loadEnvironment({}));
const throttlers = Array.isArray(options) ? options : options.throttlers;
const password = throttlers.find((t) => t.name === "password")!;
const contextFor = (handler: () => void) =>
  ({ getHandler: () => handler }) as unknown as ExecutionContext;

void test("only routes marked @PasswordAttempt() count as password attempts", () => {
  const marked = () => undefined;
  PasswordAttempt()(marked, "marked", { value: marked } as PropertyDescriptor);
  assert.equal(password.skipIf!(contextFor(marked)), false);
  assert.equal(password.skipIf!(contextFor(() => undefined)), true);
});

void test("password attempts are tracked per client and account", async () => {
  const track = (req: Record<string, unknown>) =>
    password.getTracker!(
      req,
      contextFor(() => undefined),
    );
  assert.equal(
    await track({
      ip: "10.0.0.1",
      headers: {},
      body: { email: " NP@X.test " },
    }),
    "10.0.0.1|np@x.test",
  );
  assert.equal(
    await track({ ip: "10.0.0.1", headers: { cookie: "sr_session=abc" } }),
    "10.0.0.1|abc",
  );
});
