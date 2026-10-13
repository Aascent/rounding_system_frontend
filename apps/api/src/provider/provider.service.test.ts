import assert from "node:assert/strict";
import test from "node:test";
import { ServiceUnavailableException } from "@nestjs/common";
import { loadEnvironment } from "../config/environment.js";
import { ProviderService } from "./provider.service.js";

void test("returns schema-validated synthetic provider responses", () => {
  const service = new ProviderService(
    loadEnvironment({ DATA_MODE: "synthetic" }),
  );
  assert.equal(service.dashboard().mode, "synthetic");
  const page1 = service.roundingList({ page: 1, pageSize: 25 });
  assert.equal(page1.items.length, 25);
  assert.equal(page1.total, 1000);
  assert.equal(page1.totalPages, 40);
  assert.equal(page1.hasPrev, false);
  assert.equal(page1.hasNext, true);
  // page beyond the end is clamped to the last page
  const clamped = service.roundingList({ page: 9999, pageSize: 25 });
  assert.equal(clamped.page, 40);
  assert.equal(clamped.hasNext, false);
  // a filter with no matches yields an empty page, not an error
  const none = service.roundingList({ q: "no-such-patient-zzz" });
  assert.equal(none.items.length, 0);
  assert.equal(none.filtered, 0);
  assert.equal(
    service.patient("synthetic-patient-001")?.patient.name,
    "Avery Sample",
  );
  assert.equal(service.patient("missing"), undefined);
});

void test("fails closed when no clinical data source is configured", () => {
  const service = new ProviderService(
    loadEnvironment({ DATA_MODE: "disabled" }),
  );
  assert.throws(() => service.roundingList(), ServiceUnavailableException);
});

void test("scopes the rounding list to the caller's role", () => {
  const service = new ProviderService(
    loadEnvironment({ DATA_MODE: "synthetic" }),
  );
  const unscoped = service.roundingList({ pageSize: 1 });
  const physician = service.roundingList({ pageSize: 1 }, "PHYSICIAN");
  const np = service.roundingList({ pageSize: 1 }, "NURSE_PRACTITIONER");

  // The two role scopes partition the full list: disjoint, and summing to it.
  assert.equal(physician.total + np.total, unscoped.total);
  assert.ok(physician.total > 0 && np.total > 0);
  assert.equal(physician.totals.total, physician.total);
  assert.equal(np.totals.total, np.total);

  // A sample of returned items (pageSize is capped at 100) respects the
  // scope's invariant.
  const physicianSample = service.roundingList({ pageSize: 100 }, "PHYSICIAN");
  assert.ok(
    physicianSample.items.every((p) => p.physicianActionRequired),
    "physician scope only returns patients requiring a physician visit",
  );
  const npSample = service.roundingList(
    { pageSize: 100 },
    "NURSE_PRACTITIONER",
  );
  assert.ok(
    npSample.items.every((p) => !p.physicianActionRequired),
    "NP scope excludes patients requiring a physician visit",
  );

  // An unrecognized/absent role (e.g. undefined) is unscoped.
  assert.equal(unscoped.total, physician.total + np.total);
  assert.deepEqual(
    [...unscoped.facilities].sort(),
    [...new Set([...physician.facilities, ...np.facilities])].sort(),
  );
});
