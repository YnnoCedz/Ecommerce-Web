import assert from "node:assert/strict";
import test from "node:test";
import {
  createDebouncedProductSearch,
  isEligibleProductSearch,
  isLatestProductSearch,
} from "../src/utils/promotionProductSearch.ts";

function fakeTimers() {
  let nextId = 0;
  const callbacks = new Map<number, () => void>();
  const delays: number[] = [];

  return {
    api: {
      setTimeout(callback: () => void, delay: number) {
        const id = ++nextId;
        callbacks.set(id, callback);
        delays.push(delay);
        return id;
      },
      clearTimeout(id: number) {
        callbacks.delete(id);
      },
    },
    runPending() {
      const pending = [...callbacks.values()];
      callbacks.clear();
      pending.forEach((callback) => callback());
    },
    count: () => callbacks.size,
    delays,
  };
}

test("rapid typing leaves one debounced product search", () => {
  const timers = fakeTimers();
  const scheduler = createDebouncedProductSearch(timers.api);
  const searches: string[] = [];

  for (const query of ["i", "ip", "ipa", "ipad"])
    scheduler.schedule(() => searches.push(query));

  assert.equal(timers.count(), 1);
  assert.equal(timers.delays.at(-1), 2000);
  assert.deepEqual(searches, []);
  timers.runPending();
  assert.deepEqual(searches, ["ipad"]);
});

test("flush searches immediately and cancels the scheduled duplicate", () => {
  const timers = fakeTimers();
  const scheduler = createDebouncedProductSearch(timers.api);
  const searches: string[] = [];

  scheduler.schedule(() => searches.push("delayed ipad"));
  scheduler.flush(() => searches.push("ipad"));
  timers.runPending();

  assert.deepEqual(searches, ["ipad"]);
});

test("clear cancels a pending search", () => {
  const timers = fakeTimers();
  const scheduler = createDebouncedProductSearch(timers.api);
  let calls = 0;

  scheduler.schedule(() => calls++);
  scheduler.cancel();
  timers.runPending();

  assert.equal(calls, 0);
});

test("only the latest request id may update search results", () => {
  assert.equal(isLatestProductSearch(4, 5), false);
  assert.equal(isLatestProductSearch(5, 5), true);
});

test("typed searches require at least two non-space characters", () => {
  assert.equal(isEligibleProductSearch("i"), false);
  assert.equal(isEligibleProductSearch(" ip "), true);
});
