import assert from "node:assert/strict";
import test from "node:test";
import {
  queryRoundingList,
  roundingScopeForRole,
  summarizeRoundingScope,
  syntheticRoundingCandidates,
} from "@smart-rounding/contracts";

const TOTAL = syntheticRoundingCandidates.length;

void test("roundingScopeForRole splits the list by physician-required status", () => {
  assert.deepEqual(roundingScopeForRole("PHYSICIAN"), {
    physicianActionRequired: true,
  });
  assert.deepEqual(roundingScopeForRole("NURSE_PRACTITIONER"), {
    physicianActionRequired: false,
  });
  // Admin (and any future role) gets no hard restriction.
  assert.deepEqual(roundingScopeForRole("ADMIN"), {});
});

void test("queryRoundingList applies scope as a hard AND with user filters", () => {
  const physicianScope = roundingScopeForRole("PHYSICIAN");
  const npScope = roundingScopeForRole("NURSE_PRACTITIONER");

  // `.total` (pre-pagination match count) is unaffected by the page-size cap,
  // unlike `.items`, so it is safe to compare against the whole dataset.
  const physicianOnly = queryRoundingList({ pageSize: TOTAL }, physicianScope);
  const npOnly = queryRoundingList({ pageSize: TOTAL }, npScope);
  const unscoped = queryRoundingList({ pageSize: TOTAL });
  const expectedPhysicianCount = syntheticRoundingCandidates.filter(
    (p) => p.physicianActionRequired,
  ).length;

  assert.equal(physicianOnly.total + npOnly.total, unscoped.total);
  assert.equal(physicianOnly.total, expectedPhysicianCount);
  assert.equal(npOnly.total, TOTAL - expectedPhysicianCount);
  assert.ok(physicianOnly.items.every((p) => p.physicianActionRequired));
  assert.ok(npOnly.items.every((p) => !p.physicianActionRequired));

  // A user filter that contradicts the scope yields an empty (not erroring) page.
  const contradiction = queryRoundingList({ physicianOnly: "true" }, npScope);
  assert.equal(contradiction.total, 0);
  assert.equal(contradiction.items.length, 0);

  // Sort/paging still work inside a scope.
  const page2 = queryRoundingList({ page: 2, pageSize: 10 }, physicianScope);
  assert.equal(page2.items.length, 10);
  assert.equal(page2.page, 2);
});

void test("summarizeRoundingScope totals and facilities match the scoped query", () => {
  const scope = roundingScopeForRole("PHYSICIAN");
  const summary = summarizeRoundingScope(scope);
  const queried = queryRoundingList({ pageSize: TOTAL }, scope);
  const inScope = syntheticRoundingCandidates.filter(
    (p) => p.physicianActionRequired,
  );

  assert.equal(summary.totals.total, queried.total);
  assert.equal(summary.totals.total, inScope.length);
  assert.equal(
    summary.totals.highPriority,
    inScope.filter((p) => p.priority === "HIGH").length,
  );
  assert.equal(
    summary.totals.overdue,
    inScope.filter((p) => p.complianceStatus === "OVERDUE").length,
  );
  assert.equal(
    summary.totals.carryForward,
    inScope.filter((p) => p.carryForward).length,
  );
  assert.deepEqual(
    summary.facilities,
    [...new Set(inScope.map((p) => p.facility))].sort(),
  );
  assert.equal(summary.totals.facilities, summary.facilities.length);

  // The empty scope's totals equal the whole dataset.
  const all = summarizeRoundingScope();
  assert.equal(all.totals.total, TOTAL);
});
