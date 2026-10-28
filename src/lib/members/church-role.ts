/**
 * Church role: what someone does *inside the church*, shown as a badge so staff can
 * tell pastors, ushers and admins apart from regular members.
 *
 * Members carry no role of their own; it comes from the linked login account
 * (`User.role`). Anyone without an account, or with an unknown role string, is a
 * regular member. `super_admin` is shown as admin.
 */

export type ChurchRole = "admin" | "pastor" | "usher" | "leader" | "member";

export const CHURCH_ROLES: readonly ChurchRole[] = ["admin", "pastor", "leader", "usher", "member"];

export function normalizeChurchRole(raw: unknown): ChurchRole {
  const r = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (r === "admin" || r === "super_admin") return "admin";
  if (r === "pastor") return "pastor";
  if (r === "usher") return "usher";
  if (r === "leader") return "leader";
  return "member";
}

export const CHURCH_ROLE_META: Record<
  ChurchRole,
  { emoji: string; en: string; ar: string; classes: string }
> = {
  admin: { emoji: "🛡️", en: "Admin", ar: "إداري", classes: "bg-slate-100 text-slate-700 border-slate-300" },
  pastor: { emoji: "✝️", en: "Pastor", ar: "راعٍ", classes: "bg-purple-50 text-purple-700 border-purple-200" },
  leader: { emoji: "⭐", en: "Leader", ar: "قائد", classes: "bg-blue-50 text-blue-700 border-blue-200" },
  usher: { emoji: "🤝", en: "Usher", ar: "خادم استقبال", classes: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  member: { emoji: "🙂", en: "Member", ar: "عضو", classes: "bg-gray-50 text-gray-600 border-gray-200" },
};
