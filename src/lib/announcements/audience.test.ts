import { describe, expect, it } from "vitest";
import {
  describeAudience,
  hasSelector,
  leaderAudienceProblem,
  resolveAudience,
  type AudienceCandidate,
} from "./audience";

const c = (id: string, over: Partial<AudienceCandidate> = {}): AudienceCandidate => ({
  id,
  status: "active",
  ministry: null,
  groupId: null,
  role: "member",
  ...over,
});

const people: AudienceCandidate[] = [
  c("pastor", { role: "pastor", ministry: "Worship" }),
  c("usher", { role: "usher", groupId: "g-ushers" }),
  c("admin", { role: "admin" }),
  c("youth1", { groupId: "g-youth", ministry: "Youth" }),
  c("youth2", { groupId: "g-youth", status: "inactive" }),
  c("plain"),
  c("visitor", { status: "visitor" }),
];

describe("resolveAudience", () => {
  it("reaches nobody without a selector", () => {
    expect(hasSelector({})).toBe(false);
    expect(resolveAudience(people, {})).toEqual([]);
    expect(resolveAudience(people, { statuses: ["active"] })).toEqual([]);
  });

  it("everyone defaults to active members only", () => {
    expect(resolveAudience(people, { everyone: true })).toEqual(["pastor", "usher", "admin", "youth1", "plain"]);
  });

  it("can include other statuses on request", () => {
    expect(resolveAudience(people, { everyone: true, statuses: ["active", "visitor"] })).toContain("visitor");
    expect(resolveAudience(people, { groupIds: ["g-youth"], statuses: ["inactive"] })).toEqual(["youth2"]);
  });

  it("filters by role, separating staff from regular members", () => {
    expect(resolveAudience(people, { roles: ["pastor"] })).toEqual(["pastor"]);
    expect(resolveAudience(people, { roles: ["usher", "admin"] })).toEqual(["usher", "admin"]);
    expect(resolveAudience(people, { roles: ["member"] })).toEqual(["youth1", "plain"]);
  });

  it("unions selectors without duplicating anyone", () => {
    expect(resolveAudience(people, { roles: ["pastor"], groupIds: ["g-youth"], ministries: ["worship"] })).toEqual([
      "pastor",
      "youth1",
    ]);
  });
});

describe("leaderAudienceProblem", () => {
  it("allows only groups the leader leads", () => {
    expect(leaderAudienceProblem({ groupIds: ["a"] }, ["a", "b"])).toBeNull();
    expect(leaderAudienceProblem({ groupIds: ["a", "z"] }, ["a"])).not.toBeNull();
    expect(leaderAudienceProblem({ groupIds: [] }, ["a"])).not.toBeNull();
  });
  it("blocks church-wide, role and ministry audiences", () => {
    expect(leaderAudienceProblem({ everyone: true, groupIds: ["a"] }, ["a"])).not.toBeNull();
    expect(leaderAudienceProblem({ roles: ["pastor"], groupIds: ["a"] }, ["a"])).not.toBeNull();
    expect(leaderAudienceProblem({ ministries: ["Youth"], groupIds: ["a"] }, ["a"])).not.toBeNull();
  });
});

describe("describeAudience", () => {
  it("summarises selectors and non-default statuses", () => {
    expect(describeAudience({ roles: ["pastor", "usher"], groupIds: ["g1"] }, { g1: "Youth Group" })).toBe(
      "Pastors, Ushers, Youth Group",
    );
    expect(describeAudience({ everyone: true, statuses: ["active", "visitor"] })).toBe("Everyone (active, visitor)");
    expect(describeAudience({})).toBe("Nobody");
  });
});
