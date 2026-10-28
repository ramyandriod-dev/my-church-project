import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");

const peoplePageSrc = read("src/app/(dashboard)/people/page.tsx");
const familiesPageSrc = read("src/app/(dashboard)/families/page.tsx");
const member360PageSrc = read("src/app/(dashboard)/people/[memberId]/page.tsx");
const wsRouteSrc = read("src/app/api/realtime/ws/route.ts");

describe("Phase 4 CRM Live WebSocket Listeners", () => {
  it("subscribes to onMemberUpdated in People directory", () => {
    expect(peoplePageSrc).toContain("useAttendanceRealtime");
    expect(peoplePageSrc).toContain("onMemberUpdated: (event) =>");
    expect(peoplePageSrc).toContain("void loadMembers()");
    expect(peoplePageSrc).toContain("showToast");
  });

  it("subscribes to onMemberUpdated in Families directory", () => {
    expect(familiesPageSrc).toContain("useAttendanceRealtime");
    expect(familiesPageSrc).toContain("onMemberUpdated: (event) =>");
    expect(familiesPageSrc).toContain("void loadFamiliesData()");
    expect(familiesPageSrc).toContain("setRealtimeToast");
  });

  it("subscribes to onMemberUpdated in Member 360 page", () => {
    expect(member360PageSrc).toContain("useAttendanceRealtime");
    expect(member360PageSrc).toContain("onMemberUpdated: (event) =>");
    expect(member360PageSrc).toContain("void loadMember360Data()");
  });

  it("forwards WebSocket upgrade directly to REALTIME_SERVICE in route handler", () => {
    expect(wsRouteSrc).toContain("isWebSocketUpgrade");
    expect(wsRouteSrc).toContain("return realtimeService.fetch(request)");
  });
});
