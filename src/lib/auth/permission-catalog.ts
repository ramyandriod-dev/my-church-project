/**
 * Permission catalog
 *
 * Every permission in the system, grouped into the features people recognise,
 * with English and Arabic labels. Settings → Access & roles draws its matrix
 * from this list, and the server accepts only permissions listed here, so a
 * hand-written request cannot grant something that does not exist.
 *
 * A test checks that every permission any default role holds appears here, so a
 * new permission cannot be added to the code without also appearing on screen.
 *
 * `messages.self` is deliberately absent: it is not a role permission but the
 * member's own-conversation grant, added automatically to anyone whose login is
 * linked to a member record, and kept out of staff roles on purpose.
 */

import type { Permission } from "../backend/types";

/** Roles whose permissions can be edited. `super_admin` always has everything. */
export const EDITABLE_ROLES = ["admin", "pastor", "leader", "usher", "member"] as const;
export type EditableRole = (typeof EDITABLE_ROLES)[number];

/** Roles a person can hold, from most to least access. */
export const ALL_ROLES = ["super_admin", ...EDITABLE_ROLES] as const;
export type AnyRole = (typeof ALL_ROLES)[number];

/** Roles someone may ask for when they create their profile. */
export const REQUESTABLE_ROLES = ["usher", "leader", "pastor", "admin"] as const;
export type RequestableRole = (typeof REQUESTABLE_ROLES)[number];

export const ROLE_LABELS: Record<AnyRole, { en: string; ar: string; descEn: string; descAr: string }> = {
  super_admin: { en: "Super admin", ar: "مدير النظام", descEn: "Everything, always. Cannot be limited.", descAr: "صلاحيات كاملة دائمًا ولا يمكن تقييدها." },
  admin: { en: "Admin", ar: "إداري", descEn: "Runs the church office and the platform.", descAr: "يدير مكتب الكنيسة والمنصة." },
  pastor: { en: "Pastor", ar: "راعٍ", descEn: "Pastoral care, people and ministries.", descAr: "الرعاية والأعضاء والخدمات." },
  leader: { en: "Leader", ar: "قائد", descEn: "Leads a group or ministry.", descAr: "يقود مجموعة أو خدمة." },
  usher: { en: "Usher", ar: "خادم استقبال", descEn: "Welcomes people and checks them in.", descAr: "يستقبل الحضور ويسجل دخولهم." },
  member: { en: "Member", ar: "عضو", descEn: "Everyone in the member app.", descAr: "كل مستخدمي تطبيق الأعضاء." },
};

/** Higher can manage lower. Used to stop someone granting more than they have. */
export const ROLE_LEVEL: Record<AnyRole, number> = {
  super_admin: 100,
  admin: 80,
  pastor: 60,
  leader: 40,
  usher: 30,
  member: 20,
};

export interface PermissionItem {
  id: Permission;
  en: string;
  ar: string;
}

export interface FeatureGroup {
  id: string;
  en: string;
  ar: string;
  permissions: PermissionItem[];
}

const crud = (prefix: string, noun: { en: string; ar: string }): PermissionItem[] => [
  { id: `${prefix}.read` as Permission, en: `View ${noun.en}`, ar: `عرض ${noun.ar}` },
  { id: `${prefix}.create` as Permission, en: `Add ${noun.en}`, ar: `إضافة ${noun.ar}` },
  { id: `${prefix}.update` as Permission, en: `Edit ${noun.en}`, ar: `تعديل ${noun.ar}` },
  { id: `${prefix}.delete` as Permission, en: `Delete ${noun.en}`, ar: `حذف ${noun.ar}` },
];

export const FEATURE_GROUPS: FeatureGroup[] = [
  { id: "people", en: "People", ar: "الأعضاء", permissions: crud("members", { en: "members", ar: "الأعضاء" }) },
  { id: "families", en: "Families", ar: "الأسر", permissions: crud("families", { en: "families", ar: "الأسر" }) },
  { id: "groups", en: "Groups", ar: "المجموعات", permissions: crud("groups", { en: "groups", ar: "المجموعات" }) },
  { id: "ministries", en: "Ministries", ar: "الخدمات", permissions: crud("ministries", { en: "ministries", ar: "الخدمات" }) },
  { id: "events", en: "Events", ar: "الفعاليات", permissions: crud("events", { en: "events", ar: "الفعاليات" }) },
  {
    id: "attendance",
    en: "Attendance",
    ar: "الحضور",
    permissions: [
      { id: "attendance.read", en: "View attendance", ar: "عرض الحضور" },
      { id: "attendance.checkin", en: "Check people in", ar: "تسجيل دخول الحضور" },
      { id: "attendance.create", en: "Record attendance", ar: "تسجيل الحضور" },
      { id: "attendance.update", en: "Edit attendance", ar: "تعديل الحضور" },
      { id: "attendance.delete", en: "Delete attendance", ar: "حذف الحضور" },
    ],
  },
  { id: "followups", en: "Follow-ups", ar: "المتابعات", permissions: crud("followups", { en: "follow-ups", ar: "المتابعات" }) },
  { id: "shepherding", en: "Shepherding", ar: "الرعاية", permissions: crud("shepherding", { en: "care records", ar: "سجلات الرعاية" }) },
  {
    id: "prayers",
    en: "Prayer requests (private)",
    ar: "طلبات الصلاة (خاصة)",
    permissions: crud("prayers", { en: "prayer requests", ar: "طلبات الصلاة" }),
  },
  {
    id: "prayerWall",
    en: "Prayer wall",
    ar: "حائط الصلاة",
    permissions: [
      { id: "prayer_wall.read", en: "See the wall", ar: "عرض الحائط" },
      { id: "prayer_wall.post", en: "Share prayers", ar: "مشاركة الصلوات" },
      { id: "prayer_wall.moderate", en: "Approve prayers", ar: "الموافقة على الصلوات" },
    ],
  },
  {
    id: "seating",
    en: "Seating",
    ar: "الجلوس",
    permissions: [
      { id: "seating.reserve", en: "Reserve seats (5 minutes)", ar: "حجز مقاعد (٥ دقائق)" },
      { id: "seating.manage", en: "Manage reservations (ushers)", ar: "إدارة الحجوزات (الخدام)" },
    ],
  },
  {
    id: "community",
    en: "Talent and ideas",
    ar: "المواهب والأفكار",
    permissions: [
      { id: "talent.read", en: "View talent directory", ar: "عرض دليل المواهب" },
      { id: "talent.update", en: "Edit talent profiles", ar: "تعديل ملفات المواهب" },
      { id: "ideas.read", en: "View ideas", ar: "عرض الأفكار" },
      { id: "ideas.create", en: "Share ideas", ar: "مشاركة الأفكار" },
      { id: "ideas.manage", en: "Manage ideas", ar: "إدارة الأفكار" },
    ],
  },
  {
    id: "messages",
    en: "Messages and announcements",
    ar: "الرسائل والإعلانات",
    permissions: [
      { id: "messages.read", en: "Read all conversations", ar: "قراءة كل المحادثات" },
      { id: "messages.send", en: "Message members", ar: "مراسلة الأعضاء" },
      { id: "announcements.send", en: "Send announcements", ar: "إرسال الإعلانات" },
    ],
  },
  {
    id: "reports",
    en: "Reports and AI",
    ar: "التقارير والذكاء الاصطناعي",
    permissions: [
      { id: "reports.read", en: "View reports", ar: "عرض التقارير" },
      { id: "reports.generate", en: "Generate reports", ar: "إنشاء التقارير" },
      { id: "ai.use", en: "Use AI assistant", ar: "استخدام المساعد الذكي" },
    ],
  },
  {
    id: "admin",
    en: "Administration",
    ar: "الإدارة",
    permissions: [
      { id: "settings.read", en: "View settings", ar: "عرض الإعدادات" },
      { id: "settings.update", en: "Change settings", ar: "تعديل الإعدادات" },
      ...crud("users", { en: "logins", ar: "حسابات الدخول" }),
      { id: "audit.read", en: "View audit log", ar: "عرض سجل التدقيق" },
      { id: "roles.manage", en: "Manage roles and access", ar: "إدارة الأدوار والصلاحيات" },
    ],
  },
];

export const ALL_PERMISSIONS: Permission[] = FEATURE_GROUPS.flatMap((g) => g.permissions.map((p) => p.id));

const KNOWN = new Set<string>(ALL_PERMISSIONS);
export function isKnownPermission(p: string): p is Permission {
  return KNOWN.has(p);
}

/**
 * Permissions that only senior roles may hold. Granting role management to
 * "member" would hand every self-registered account the keys, so the server
 * refuses it for the roles below.
 */
export const SENIOR_ONLY: Permission[] = ["roles.manage", "users.create", "users.update", "users.delete", "settings.update"];
export const SENIOR_ROLES: AnyRole[] = ["super_admin", "admin", "pastor"];

export function isEditableRole(r: string): r is EditableRole {
  return (EDITABLE_ROLES as readonly string[]).includes(r);
}
export function isAnyRole(r: string): r is AnyRole {
  return (ALL_ROLES as readonly string[]).includes(r);
}
