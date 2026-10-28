import { describe, it, expect, vi } from "vitest";
import { fetchAllMembers } from "./fetch-all-members";

/** A fake /api/members with `total` members, 100 per page. */
function fakeApi(total: number) {
  return vi.fn(async (url: string) => {
    const page = Number(new URL(url, "http://x").searchParams.get("page"));
    const start = (page - 1) * 100;
    const data = Array.from({ length: Math.max(0, Math.min(100, total - start)) }, (_, i) => ({ id: `m-${start + i}` }));
    return new Response(JSON.stringify({ success: true, data, meta: { page, limit: 100, total, totalPages: Math.ceil(total / 100) } }));
  });
}

describe("fetchAllMembers", () => {
  it("returns members beyond the first 100", async () => {
    const api = fakeApi(155);
    const members = await fetchAllMembers(api as unknown as typeof fetch);
    expect(members).toHaveLength(155);
    expect(members.map((m: any) => m.id)).toContain("m-154");
    expect(api).toHaveBeenCalledTimes(2);
  });

  it("makes one request when everyone fits on a page", async () => {
    const api = fakeApi(40);
    expect(await fetchAllMembers(api as unknown as typeof fetch)).toHaveLength(40);
    expect(api).toHaveBeenCalledTimes(1);
  });

  it("reports a failed first page, so the caller can react (e.g. to a 401)", async () => {
    const api = vi.fn(async () => new Response("", { status: 401 }));
    await expect(fetchAllMembers(api as unknown as typeof fetch)).rejects.toMatchObject({ status: 401 });
  });
});
