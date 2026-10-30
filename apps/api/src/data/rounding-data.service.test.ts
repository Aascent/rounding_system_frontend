import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import {
  createTestContext,
  type TestContext,
} from "../testing/test-context.js";

let ctx: TestContext;
before(async () => {
  ctx = await createTestContext();
});
after(() => ctx.close());

void test("the evaluated list is cached for the day and rebuilt on a new day", async () => {
  let now = new Date("2026-09-10T08:00:00Z");
  ctx.data.clock = () => now;

  const first = ctx.data.snapshot();
  now = new Date("2026-09-10T23:59:00Z");
  assert.equal(ctx.data.snapshot(), first, "same day reuses the cache");

  now = new Date("2026-09-11T00:01:00Z");
  const nextDay = ctx.data.snapshot();
  assert.notEqual(nextDay, first, "a new day rebuilds the list");
  await Promise.all([first, nextDay]);
});
