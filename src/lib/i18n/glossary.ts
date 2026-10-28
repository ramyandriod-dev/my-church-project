/**
 * Church-Specific Master Arabic Localization Glossary
 * Follows Christian Arabic church-management standards across
 * Coptic Orthodox, Evangelical/Protestant, Anglican, and Catholic churches.
 */

import { Locale } from "./types";

export const CHURCH_GLOSSARY = {
  // Primary
  church: { ar: "الكنيسة", en: "Church" },
  churchManagement: { ar: "إدارة الكنيسة", en: "Church Management" },
  churchManagementPlatform: { ar: "منصة إدارة الكنيسة", en: "Church Management Platform" },
  people: { ar: "الأعضاء", en: "People" },
  member: { ar: "عضو", en: "Member" },
  members: { ar: "الأعضاء", en: "Members" },
  person: { ar: "شخص", en: "Person" },
  peopleDirectory: { ar: "دليل الأعضاء", en: "People Directory" },
  profile: { ar: "الملف الشخصي", en: "Profile" },
  memberProfile: { ar: "ملف العضو", en: "Member Profile" },
  member360: { ar: "الملف الشامل للعضو", en: "Member 360" },
  dashboard: { ar: "لوحة المعلومات", en: "Dashboard" },
  overview: { ar: "نظرة عامة", en: "Overview" },
  home: { ar: "الرئيسية", en: "Home" },
  settings: { ar: "الإعدادات", en: "Settings" },

  // Church Structure
  ministry: { ar: "الخدمة", en: "Ministry" },
  ministries: { ar: "الخدمات", en: "Ministries" },
  ministryLeader: { ar: "مسؤول الخدمة", en: "Ministry Leader" },
  ministryTeam: { ar: "فريق الخدمة", en: "Ministry Team" },
  serving: { ar: "الخدمة", en: "Serving" },
  servingRole: { ar: "دور الخدمة", en: "Serving Role" },
  volunteer: { ar: "متطوع", en: "Volunteer" },
  volunteers: { ar: "المتطوعون", en: "Volunteers" },
  volunteerTeam: { ar: "فريق المتطوعين", en: "Volunteer Team" },
  servant: { ar: "خادم", en: "Servant" },
  servants: { ar: "الخدام", en: "Servants" },
  ministryServant: { ar: "خادم في الخدمة", en: "Ministry Servant" },
  serviceLeader: { ar: "مسؤول الخدمة", en: "Service Leader" },
  pastor: { ar: "راعي", en: "Pastor" },
  pastoral: { ar: "رعوي", en: "Pastoral" },
  pastoralCare: { ar: "الرعاية الكنسية", en: "Pastoral Care" },
  pastoralCareTeam: { ar: "فريق الرعاية", en: "Pastoral Care Team" },
  shepherd: { ar: "مسؤول الرعاية", en: "Shepherd" },
  assignedShepherd: { ar: "مسؤول الرعاية", en: "Assigned Shepherd" },
  shepherding: { ar: "الرعاية والمتابعة", en: "Shepherding" },
  pastoralVisit: { ar: "زيارة رعوية / افتقاد", en: "Pastoral Visit" },
  pastoralVisits: { ar: "الزيارات الرعوية", en: "Pastoral Visits" },
  pastoralContact: { ar: "تواصل رعوي", en: "Pastoral Contact" },
  care: { ar: "الرعاية", en: "Care" },
  careNeeds: { ar: "احتياجات الرعاية", en: "Care Needs" },
  careStatus: { ar: "حالة الرعاية", en: "Care Status" },
  pastoralNotes: { ar: "ملاحظات الرعاية", en: "Pastoral Notes" },

  // Groups
  groups: { ar: "المجموعات", en: "Groups" },
  group: { ar: "مجموعة", en: "Group" },
  smallGroup: { ar: "مجموعة صغيرة", en: "Small Group" },
  groupLeader: { ar: "مسؤول المجموعة", en: "Group Leader" },
  groupMembers: { ar: "أعضاء المجموعة", en: "Group Members" },
  groupParticipation: { ar: "المشاركة في المجموعة", en: "Group Participation" },

  // Attendance
  attendance: { ar: "الحضور", en: "Attendance" },
  attendanceRecord: { ar: "سجل الحضور", en: "Attendance Record" },
  attendanceHistory: { ar: "سجل الحضور السابق", en: "Attendance History" },
  attendanceRate: { ar: "نسبة الحضور", en: "Attendance Rate" },
  attendanceTrend: { ar: "اتجاه الحضور", en: "Attendance Trend" },
  present: { ar: "حاضر", en: "Present" },
  absent: { ar: "غائب", en: "Absent" },
  checkedIn: { ar: "سجّل الحضور", en: "Checked In" },
  checkIn: { ar: "تسجيل الحضور", en: "Check-in" },
  liveCheckIn: { ar: "تسجيل الحضور المباشر", en: "Live Check-in" },
  peopleHereNow: { ar: "الموجودون الآن", en: "People Here Now" },
  liveNow: { ar: "يحدث الآن", en: "Live Now" },
  currentlyPresent: { ar: "الموجودون حاليًا", en: "Currently Present" },

  // Events & Services
  event: { ar: "فعالية", en: "Event" },
  events: { ar: "الفعاليات", en: "Events" },
  upcomingEvents: { ar: "الفعاليات القادمة", en: "Upcoming Events" },
  churchService: { ar: "اجتماع / خدمة", en: "Church Service" },
  worshipService: { ar: "اجتماع عبادة", en: "Worship Service" },
  prayerMeeting: { ar: "اجتماع صلاة", en: "Prayer Meeting" },
  bibleStudy: { ar: "دراسة الكتاب المقدس", en: "Bible Study" },
  youthMeeting: { ar: "اجتماع الشباب", en: "Youth Meeting" },
  sundaySchool: { ar: "مدارس الأحد", en: "Sunday School" },
  worship: { ar: "العبادة", en: "Worship" },
  worshipTeam: { ar: "فريق العبادة", en: "Worship Team" },

  // Follow-ups
  followUp: { ar: "متابعة", en: "Follow-up" },
  followUps: { ar: "المتابعات", en: "Follow-ups" },
  followUpNeeded: { ar: "تحتاج إلى متابعة", en: "Follow-Up Needed" },
  openFollowUps: { ar: "المتابعات المفتوحة", en: "Open Follow-ups" },
  pendingFollowUps: { ar: "المتابعات المعلقة", en: "Pending Follow-ups" },
  completedFollowUps: { ar: "المتابعات المكتملة", en: "Completed Follow-ups" },
  followUpOwner: { ar: "مسؤول المتابعة", en: "Follow-Up Owner" },
  followUpStatus: { ar: "حالة المتابعة", en: "Follow-Up Status" },

  // Prayer
  prayer: { ar: "الصلاة", en: "Prayer" },
  prayerRequest: { ar: "طلب صلاة", en: "Prayer Request" },
  prayerRequests: { ar: "طلبات الصلاة", en: "Prayer Requests" },
  prayerRequestsToday: { ar: "طلبات الصلاة اليوم", en: "Prayer Requests Today" },
  activePrayerRequests: { ar: "طلبات الصلاة النشطة", en: "Active Prayer Requests" },
  inPrayer: { ar: "قيد الصلاة", en: "In Prayer" },
  answered: { ar: "تمت الاستجابة", en: "Answered" },
  addPrayerRequest: { ar: "إضافة طلب صلاة", en: "Add Prayer Request" },
  prayedFor: { ar: "تمت الصلاة من أجله", en: "Prayed For" },

  // Engagement & Discipleship
  engagement: { ar: "المشاركة", en: "Engagement" },
  memberEngagement: { ar: "مشاركة العضو", en: "Member Engagement" },
  engagementJourney: { ar: "مسيرة المشاركة", en: "Engagement Journey" },
  discipleship: { ar: "التلمذة", en: "Discipleship" },
  discipleshipJourney: { ar: "مسيرة التلمذة", en: "Discipleship Journey" },
  spiritualGrowth: { ar: "النمو الروحي", en: "Spiritual Growth" },
  churchLife: { ar: "الحياة الكنسية", en: "Church Life" },

  // Giving
  giving: { ar: "العطاء", en: "Giving" },
  weeklyGiving: { ar: "العطاء الأسبوعي", en: "Weekly Giving" },
  monthlyGiving: { ar: "العطاء الشهري", en: "Monthly Giving" },
  totalGiving: { ar: "إجمالي العطاء", en: "Total Giving" },

  // Reports & Trends
  reports: { ar: "التقارير", en: "Reports" },
  report: { ar: "تقرير", en: "Report" },
  trends: { ar: "الاتجاهات", en: "Trends" },
  analytics: { ar: "التحليلات", en: "Analytics" },
  growth: { ar: "النمو", en: "Growth" },
  growthRate: { ar: "معدل النمو", en: "Growth Rate" },

  // Statuses
  active: { ar: "نشط", en: "Active" },
  inactive: { ar: "غير نشط", en: "Inactive" },
  visitor: { ar: "زائر", en: "Visitor" },
  newVisitor: { ar: "زائر جديد", en: "New Visitor" },
  committed: { ar: "ملتزم", en: "Committed" },
  goldPillar: { ar: "العضو الذهبي الملتزم", en: "Gold Pillar" },
  needsAttention: { ar: "تحتاج إلى اهتمام", en: "Needs Attention" },
  pending: { ar: "معلق", en: "Pending" },
  completed: { ar: "مكتمل", en: "Completed" },
} as const;

export function tMinistry(ministryName: string, locale: Locale = "ar"): string {
  if (locale === "en") return ministryName;
  const map: Record<string, string> = {
    "All": "كل الخدمات",
    "Worship": "خدمة العبادة والتسبيح",
    "Youth": "اجتماع الشباب",
    "Children": "مدارس الأحد",
    "Outreach": "خدمة الافتقاد والامتداد",
    "Admin": "الإدارة الكنسية",
    "Media": "خدمة الإعلام والنشر",
    "Hospitality": "خدمة الاستقبال والنظام",
    "Prayer": "خدمة الصلاة والشفاعة",
    "Discipleship": "خدمة التلمذة وتثبيت المؤمنين",
    "Counseling": "المشورة والرعاية الأسرية",
    "Men": "اجتماع الرجال",
    "Women": "اجتماع السيدات",
  };
  return map[ministryName] || ministryName;
}

export function tStatus(status: string, locale: Locale = "ar"): string {
  if (locale === "en") {
    if (status === "deletion_requested" || status === "Deletion Requested") return "Deletion Requested";
    return status;
  }
  const map: Record<string, string> = {
    active: "نشط",
    inactive: "غير نشط",
    visitor: "زائر",
    deletion_requested: "طلب حذف",
    "Deletion Requested": "طلب حذف",
    new: "جديد",
    pending: "معلق",
    completed: "مكتمل",
    open: "مفتوحة",
    closed: "مغلقة",
    cancelled: "ملغاة",
    answered: "تمت الاستجابة",
    in_prayer: "قيد الصلاة",
    urgent: "عاجل",
    normal: "عادي",
    high: "مرتفع",
    low: "منخفض",
    Committed: "عضو ملتزم",
    Active: "نشط",
    Inactive: "غير نشط",
    Visitor: "زائر",
  };
  return map[status] || status;
}

export function tRole(role: string, locale: Locale = "ar"): string {
  if (locale === "en") return role;
  const map: Record<string, string> = {
    "Admin": "مسؤول النظام",
    "Administrator": "مسؤول النظام",
    "Pastor": "راعي الكنيسة",
    "Senior Pastor": "راعي الكنيسة",
    "Associate Pastor": "مساعد راعي الكنيسة",
    "Leader": "مسؤول الخدمة",
    "Ministry Leader": "مسؤول الخدمة",
    "Group Leader": "مسؤول المجموعة",
    "Servant": "خادم",
    "Ministry Servant": "خادم في الخدمة",
    "Volunteer": "متطوع",
    "Member": "عضو",
    "Visitor": "زائر",
    "Staff": "فريق العمل الإداري",
    "Shepherd": "مسؤول الرعاية",
  };
  return map[role] || role;
}

export function tAbsenceReason(reason: string, locale: Locale = "ar"): string {
  if (locale === "en") return reason;
  const map: Record<string, string> = {
    "Sick": "وعكة صحية",
    "Travel": "سفر خارج المدينة",
    "Family": "ظرف عائلي",
    "Work": "عمل طارئ",
    "Other": "ظرف آخر",
  };
  return map[reason] || reason;
}

export function tDayName(day: string, locale: Locale = "ar"): string {
  if (locale === "en") return day;
  const map: Record<string, string> = {
    Sunday: "الأحد",
    Monday: "الاثنين",
    Tuesday: "الثلاثاء",
    Wednesday: "الأربعاء",
    Thursday: "الخميس",
    Friday: "الجمعة",
    Saturday: "السبت",
  };
  return map[day] || day;
}

export function tMonthName(month: string, locale: Locale = "ar"): string {
  if (locale === "en") return month;
  const map: Record<string, string> = {
    January: "يناير",
    February: "فبراير",
    March: "مارس",
    April: "أبريل",
    May: "مايو",
    June: "يونيو",
    July: "يوليو",
    August: "أغسطس",
    September: "سبتمبر",
    October: "أكتوبر",
    November: "نوفمبر",
    December: "ديسمبر",
  };
  return map[month] || month;
}
