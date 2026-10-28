import { describe, expect, it } from "vitest";
import { createRefreshGuard, fetchMemberFamilyTree } from "./refresh-guard";

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
}

function deferred(): Deferred {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

describe("createRefreshGuard", () => {
  it("runs a single operation to completion and tracks state", async () => {
    const guard = createRefreshGuard();
    const gate = deferred();
    let ran = 0;
    let ended = false;

    guard.run(async () => {
      ran += 1;
      await gate.promise;
      ended = true;
    });

    await flush();
    expect(guard.isRunning()).toBe(true);
    expect(ran).toBe(1);
    expect(ended).toBe(false);

    gate.resolve();
    await flush();
    expect(ended).toBe(true);
    expect(guard.isRunning()).toBe(false);
  });

  it("collapses concurrent triggers into a single trailing run", async () => {
    const guard = createRefreshGuard();
    const gate = deferred();
    const order: string[] = [];
    let runCount = 0;

    const operation = async () => {
      runCount += 1;
      const id = runCount;
      order.push(`start${id}`);
      if (id === 1) await gate.promise;
      order.push(`end${id}`);
    };

    guard.run(operation);
    await flush();
    expect(order).toEqual(["start1"]);

    guard.run(operation);
    guard.run(operation);
    guard.run(operation);
    await flush();

    expect(runCount).toBe(1);

    gate.resolve();
    await flush();
    await flush();

    expect(runCount).toBe(2);
    expect(order).toEqual(["start1", "end1", "start2", "end2"]);
  });

  it("runs non-overlapping triggers once each", async () => {
    const guard = createRefreshGuard();
    let runs = 0;
    const operation = async () => {
      runs += 1;
    };

    guard.run(operation);
    await flush();
    guard.run(operation);
    await flush();

    expect(runs).toBe(2);
  });

  it("does not lose the trailing refresh when the running operation rejects", async () => {
    const guard = createRefreshGuard();
    const gate = deferred();
    let runs = 0;

    const operation = async () => {
      runs += 1;
      if (runs === 1) {
        await gate.promise;
        throw new Error("boom");
      }
    };

    guard.run(operation);
    await flush();
    guard.run(operation);
    await flush();

    gate.resolve();
    await flush();
    await flush();

    expect(runs).toBe(2);
  });
});

describe("fetchMemberFamilyTree", () => {
  const familyJson = { data: { family: { id: "f1" } } };

  it("performs exactly one request to the family-tree endpoint (A2)", async () => {
    const urls: string[] = [];
    const fetcher = async (url: string) => {
      urls.push(url);
      return { ok: true, json: async () => familyJson };
    };

    const tree = await fetchMemberFamilyTree("member-1", fetcher);

    expect(urls).toEqual(["/api/members/member-1/family"]);
    expect(tree).toEqual(familyJson.data);
  });

  it("falls back to the whole payload when there is no data key", async () => {
    const payload = { members: [{ member: { id: "m1" } }] };
    const fetcher = async () => ({ ok: true, json: async () => payload });

    const tree = await fetchMemberFamilyTree("member-2", fetcher);

    expect(tree).toEqual(payload);
  });

  it("returns null when the request is not ok", async () => {
    const fetcher = async () => ({ ok: false, json: async () => ({}) });

    const tree = await fetchMemberFamilyTree("member-3", fetcher);

    expect(tree).toBeNull();
  });
});