/**
 * Announcement audiences.
 *
 * An audience is a set of *selectors* — everyone, church roles, groups, ministries —
 * plus a status filter. Selectors are combined as a union ("pastors AND the Youth
 * group"), and the status filter then narrows the result (active members only by
 * default, so lapsed contacts are not messaged unless the sender asks).
 *
 * This file is pure: no database, no clock. The service loads the candidate
 * members and calls it, so the rules can be tested exhaustively.
 */

import type { ChurchRole } from "@/lib/members/church-role";

export type AudienceStatus = "active" | "inactive" | "visitor";

export interface AudienceSpec {
  /** Every member in the church (still narrowed by `statuses`). */
  everyone?: boolean;
  roles?: ChurchRole[];
  groupIds?: string[];
  /** Ministry names, as stored on the member record. */
  ministries?: string[];
  /** Defaults to active members only. */
  statuses?: AudienceStatus[];
}

export interface AudienceCandidate {
  id: string;
  status: string;
  ministry: string | null;
  groupId: string | null;
  role: ChurchRole;
}

export const DEFAULT_STATUSES: AudienceStatus[] = ["active"];

/** True when the sender has picked at least one way of choosing people. */
export function hasSelector(spec: AudienceSpec): boolean {
  return Boolean(
    spec.everyone || spec.roles?.length || spec.groupIds?.length || spec.ministries?.length,
  );
}

/** The member ids an audience reaches. An audience with no selector reaches nobody. */
export function resolveAudience(candidates: AudienceCandidate[], spec: AudienceSpec): string[] {
  if (!hasSelector(spec)) return [];

  const roles = new Set(spec.roles ?? []);
  const groups = new Set(spec.groupIds ?? []);
  const ministries = new Set((spec.ministries ?? []).map((m) => m.toLowerCase()));
  const statuses = new Set<string>(spec.statuses?.length ? spec.statuses : DEFAULT_STATUSES);

  const out: string[] = [];
  for (const c of candidates) {
    if (!statuses.has(c.status)) continue;
    const selected =
      spec.everyone ||
      roles.has(c.role) ||
      (c.groupId !== null && groups.has(c.groupId)) ||
      (c.ministry !== null && ministries.has(c.ministry.toLowerCase()));
    if (selected) out.push(c.id);
  }
  return out;
}

/**
 * Group leaders may only message the groups they lead. Returns a friendly reason
 * when the audience goes beyond that, or null when it is fine.
 */
export function leaderAudienceProblem(spec: AudienceSpec, ledGroupIds: string[]): string | null {
  if (spec.everyone || spec.roles?.length || spec.ministries?.length) {
    return "Group leaders can message only the groups they lead.";
  }
  const picked = spec.groupIds ?? [];
  if (picked.length === 0) return "Pick at least one of your groups.";
  const led = new Set(ledGroupIds);
  if (picked.some((g) => !led.has(g))) return "You can only message groups you lead.";
  return null;
}

const ROLE_LABEL: Record<ChurchRole, string> = {
  admin: "Admins",
  pastor: "Pastors",
  leader: "Leaders",
  usher: "Ushers",
  member: "Regular members",
};

/** A short human summary stored with the announcement, e.g. "Pastors, Youth group". */
export function describeAudience(spec: AudienceSpec, groupNames: Record<string, string> = {}): string {
  if (!hasSelector(spec)) return "Nobody";
  const parts: string[] = [];
  if (spec.everyone) parts.push("Everyone");
  for (const r of spec.roles ?? []) parts.push(ROLE_LABEL[r]);
  for (const g of spec.groupIds ?? []) parts.push(groupNames[g] ?? "A group");
  for (const m of spec.ministries ?? []) parts.push(`${m} ministry`);
  const statuses = spec.statuses?.length ? spec.statuses : DEFAULT_STATUSES;
  const suffix = statuses.length === 1 && statuses[0] === "active" ? "" : ` (${statuses.join(", ")})`;
  return parts.join(", ").slice(0, 280) + suffix;
}
