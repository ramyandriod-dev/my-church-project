import { describe, expect, it } from "vitest";
import { CHURCH_ROLES, CHURCH_ROLE_META, normalizeChurchRole } from "./church-role";

describe("normalizeChurchRole", () => {
  it("maps known roles, treating super_admin as admin", () => {
    expect(normalizeChurchRole("super_admin")).toBe("admin");
    expect(normalizeChurchRole("ADMIN")).toBe("admin");
    expect(normalizeChurchRole("pastor")).toBe("pastor");
    expect(normalizeChurchRole(" usher ")).toBe("usher");
    expect(normalizeChurchRole("leader")).toBe("leader");
  });
  it("defaults to member for missing or unknown values", () => {
    for (const v of [undefined, null, "", "member", "wizard", 7]) expect(normalizeChurchRole(v)).toBe("member");
  });
  it("has display metadata for every role", () => {
    for (const r of CHURCH_ROLES) expect(CHURCH_ROLE_META[r].en.length).toBeGreaterThan(0);
  });
});
