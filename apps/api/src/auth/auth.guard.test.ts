import assert from "node:assert/strict";
import test from "node:test";
import {
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { loadEnvironment } from "../config/environment.js";
import { resolveSyntheticPrincipal } from "./auth.guard.js";

void test("resolves active synthetic identities", () => {
  const principal = resolveSyntheticPrincipal(
    "user-001",
    loadEnvironment({ DATA_MODE: "synthetic", AUTH_MODE: "synthetic" }),
  );
  assert.equal(principal.role, "PHYSICIAN");
  assert.equal(principal.providerId, "provider-001");
});
void test("rejects missing or unknown synthetic identities", () => {
  const environment = loadEnvironment({
    DATA_MODE: "synthetic",
    AUTH_MODE: "synthetic",
  });
  assert.throws(
    () => resolveSyntheticPrincipal(undefined, environment),
    UnauthorizedException,
  );
  assert.throws(
    () => resolveSyntheticPrincipal("unknown", environment),
    UnauthorizedException,
  );
});
void test("fails closed when identity mode is disabled", () => {
  assert.throws(
    () =>
      resolveSyntheticPrincipal(
        "user-001",
        loadEnvironment({ DATA_MODE: "synthetic" }),
      ),
    ServiceUnavailableException,
  );
});
