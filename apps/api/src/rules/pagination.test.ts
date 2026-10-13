import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizePageParams,
  pageWindow,
  paginate,
} from "@smart-rounding/contracts";

const items = Array.from({ length: 97 }, (_, i) => i + 1);

void test("normalizePageParams clamps and defaults every bad input", () => {
  assert.deepEqual(normalizePageParams({}), { page: 1, pageSize: 25 });
  assert.deepEqual(normalizePageParams({ page: "3", pageSize: "10" }), {
    page: 3,
    pageSize: 10,
  });
  assert.deepEqual(normalizePageParams({ page: -5, pageSize: 0 }), {
    page: 1,
    pageSize: 1,
  });
  assert.deepEqual(normalizePageParams({ page: "abc", pageSize: "1e9" }), {
    page: 1,
    pageSize: 100,
  });
  assert.deepEqual(normalizePageParams({ pageSize: 3.9 }), {
    page: 1,
    pageSize: 3,
  });
});

void test("paginate returns a correct first / middle / last page", () => {
  const first = paginate(items, { page: 1, pageSize: 20 });
  assert.deepEqual(
    first.items,
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  );
  assert.equal(first.total, 97);
  assert.equal(first.totalPages, 5);
  assert.equal(first.hasPrev, false);
  assert.equal(first.hasNext, true);

  const middle = paginate(items, { page: 3, pageSize: 20 });
  assert.equal(middle.items[0], 41);
  assert.equal(middle.items.at(-1), 60);
  assert.equal(middle.hasPrev, true);
  assert.equal(middle.hasNext, true);

  const last = paginate(items, { page: 5, pageSize: 20 });
  assert.equal(last.items.length, 17); // partial final page
  assert.equal(last.items.at(-1), 97);
  assert.equal(last.hasNext, false);
});

void test("paginate clamps an out-of-range page to the last page", () => {
  const beyond = paginate(items, { page: 999, pageSize: 20 });
  assert.equal(beyond.page, 5);
  assert.equal(beyond.items.at(-1), 97);
  assert.equal(beyond.hasNext, false);
});

void test("paginate handles an empty collection", () => {
  const empty = paginate([], { page: 4, pageSize: 10 });
  assert.deepEqual(empty.items, []);
  assert.equal(empty.page, 1);
  assert.equal(empty.total, 0);
  assert.equal(empty.totalPages, 1);
  assert.equal(empty.hasPrev, false);
  assert.equal(empty.hasNext, false);
});

void test("paginate never throws on absurd params", () => {
  assert.doesNotThrow(() =>
    paginate(items, { page: -1, pageSize: Number.MAX_SAFE_INTEGER }),
  );
  const r = paginate(items, { page: "x", pageSize: "y" });
  assert.equal(r.page, 1);
  assert.equal(r.pageSize, 25);
});

void test("pageWindow elides with ellipsis markers", () => {
  assert.deepEqual(pageWindow(1, 1), [1]);
  assert.deepEqual(pageWindow(1, 5), [1, 2, -1, 5]);
  assert.deepEqual(pageWindow(3, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(pageWindow(10, 20), [1, -1, 9, 10, 11, -1, 20]);
  assert.deepEqual(pageWindow(20, 20), [1, -1, 19, 20]);
});
