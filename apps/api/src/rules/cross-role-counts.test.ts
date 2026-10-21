import assert from "node:assert/strict";
import test from "node:test";
import {
  buildNpRoster,
  caseloadScopeForUser,
  facilityCoverage,
  queryRoundingList,
  roundingScopeForRole,
  summarizeRoundingScope,
  syntheticCensus,
  syntheticDashboard,
  syntheticQueueInsights,
  syntheticRoundingCandidates,
  syntheticSyncStatus,
  syntheticUsers,
} from "@smart-rounding/contracts";

const activeProviders = (role: "PHYSICIAN" | "NURSE_PRACTITIONER") =>
  syntheticUsers.filter((u) => u.role === role && u.status === "ACTIVE");

const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);

void test("admin census matches the residents every role can see", () => {
  const census = syntheticCensus.total;
  // Admin "Residents" and the sync record count the same census.
  assert.equal(syntheticSyncStatus.recordsProcessed, census);
  assert.equal(sum(Object.values(syntheticCensus.byFacility)), census);
  // Every facility is covered by at least one physician and one NP.
  for (const [facility, team] of facilityCoverage) {
    assert.ok(team.physicians.length > 0, `${facility} has no physician`);
    assert.ok(team.nurses.length > 0, `${facility} has no NP`);
  }
  // Each role's caseloads together cover the whole census exactly once.
  for (const role of ["PHYSICIAN", "NURSE_PRACTITIONER"] as const) {
    const caseloads = activeProviders(role).map(
      (u) => summarizeRoundingScope(caseloadScopeForUser(role, u.id)).totals,
    );
    assert.equal(sum(caseloads.map((t) => t.total)), census, role);
  }
  // The physician's NP roster adds up to the census too.
  assert.equal(sum(buildNpRoster().map((np) => np.patientCount)), census);
});

void test("today's visits agree between admin, dashboards and lists", () => {
  const today = syntheticRoundingCandidates.length;
  // Admin "on today's rounding lists" and the queue aggregates.
  assert.equal(syntheticDashboard.totals.patients, today);
  const p = syntheticQueueInsights.priorityBreakdown;
  assert.equal(p.HIGH + p.MEDIUM + p.LOW, today);

  // Physician visits + NP visits = today's list, with no patient twice.
  const perProvider = (["PHYSICIAN", "NURSE_PRACTITIONER"] as const).flatMap(
    (role) =>
      activeProviders(role).map((u) => ({
        role,
        id: u.id,
        dashboard: summarizeRoundingScope(roundingScopeForRole(role, u.id))
          .totals.total,
        caseloadToday: summarizeRoundingScope(caseloadScopeForUser(role, u.id))
          .totals.today,
        listFilter: queryRoundingList(
          { visit: "TODAY", pageSize: 1 },
          caseloadScopeForUser(role, u.id),
        ).total,
      })),
  );
  assert.equal(sum(perProvider.map((x) => x.dashboard)), today);

  for (const x of perProvider) {
    // A provider's dashboard, their patient list's "Need a visit today"
    // card and its "Needs a visit today" filter all show the same number.
    assert.equal(x.caseloadToday, x.dashboard, `${x.id} caseload card`);
    assert.equal(x.listFilter, x.dashboard, `${x.id} list filter`);
  }

  // The roster's "Visits today" per NP matches that NP's own dashboard.
  for (const np of buildNpRoster()) {
    const own = perProvider.find((x) => x.id === np.id);
    assert.equal(np.visitsToday, own?.dashboard, np.name);
  }
});
