import assert from "node:assert/strict";
import test from "node:test";
import { ConflictException, ServiceUnavailableException } from "@nestjs/common";
import { loadEnvironment } from "../config/environment.js";
import { AdminService } from "./admin.service.js";

void test("supports synthetic threshold updates with optimistic concurrency", () => {
  const service = new AdminService(loadEnvironment({ DATA_MODE: "synthetic" }));
  const original = service.listThresholds()[0];
  assert.ok(original);
  const updated = service.updateThreshold(original.id, {
    value: 37.5,
    version: original.version,
  });
  assert.equal(updated.value, 37.5);
  assert.equal(updated.version, 2);
  assert.throws(
    () => service.updateThreshold(original.id, { value: 37, version: 1 }),
    ConflictException,
  );
});
void test("supports synthetic user and sync administration", () => {
  const service = new AdminService(loadEnvironment({ DATA_MODE: "synthetic" }));
  const user = service.listUsers()[0];
  assert.ok(user);
  assert.equal(
    service.updateUser(user.id, { status: "INACTIVE" }).status,
    "INACTIVE",
  );
  assert.equal(service.auditEvents().length, 150);
  assert.equal(service.triggerSync().status, "RUNNING");
  assert.throws(() => service.triggerSync(), ConflictException);
});
void test("creates a validated synthetic user", () => {
  const service = new AdminService(loadEnvironment({ DATA_MODE: "synthetic" }));
  const user = service.createUser({
    name: "New Synthetic User",
    email: "new-user@example.invalid",
    role: "PHYSICIAN",
    status: "ACTIVE",
    providerId: "synthetic-provider-003",
  });
  assert.equal(user.email, "new-user@example.invalid");
  assert.equal(service.listUsers().length, 84);
});
void test("admin APIs fail closed without a configured data mode", () => {
  const service = new AdminService(loadEnvironment({ DATA_MODE: "disabled" }));
  assert.throws(() => service.listUsers(), ServiceUnavailableException);
});
