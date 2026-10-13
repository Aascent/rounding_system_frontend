import assert from "node:assert/strict";
import test from "node:test";
import { loadEnvironment } from "./environment.js";

void test("loads safe defaults", () => {
  const value = loadEnvironment({});
  assert.equal(value.PORT, 3001);
  assert.equal(value.NODE_ENV, "development");
});

void test("rejects an invalid port without exposing values", () => {
  assert.throws(
    () => loadEnvironment({ PORT: "invalid" }),
    /Invalid application configuration: PORT/,
  );
});
