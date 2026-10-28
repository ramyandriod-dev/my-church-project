"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/lib/i18n";
import {
  IconMail,
  IconPhone,
  IconCalendar,
  IconHeart,
  IconMusic,
  IconCheckCircle2,
  IconGlobe,
  IconBell,
  IconLogOut,
  IconUser,
  IconChurch,
  IconEdit,
  IconSparkles,
  IconBriefcase,
  IconChevronRight,
  IconUsers,
  IconTrash2,
  IconAlertTriangle,
} from "../icons";
import { useMobileAuth } from "../mobile-auth-provider";
import { useMobilePrefs } from "../mobile-prefs";
import { mobileApiFetch } from "@/lib/mobile-app/api-client";
import { subscribeLocalRealtime } from "@/lib/realtime/local-broadcast";
import {
  MobileSection,
  SectionHeader,
  IconBadge,
} from "../primitives";
import { EditProfileModal, COMMON_TALENTS } from "../modals/edit-profile-modal";
import { DeleteProfileModal } from "../modals/delete-profile-modal";

interface FamilyMemberNode {
  id: string;
  name: string;
  relationship: string;
  avatarUrl?: string | null;
}

interface AttendanceHistoryItem {
  id: string;
  checkInTime: string;
  service?: {
    id: string;
    name: string;
    startTime: string;
  };
}

interface ProfileScreenProps {
  onOpenNotifications?: () => void;
  unreadCount?: number;
}

const TALENT_LABELS: Record<string, { ar: string; en: string }> = {
  singing: { ar: "ترنيم / كورال", en: "Vocals / Choir" },
  piano: { ar: "بيانو / كيبورد", en: "Piano / Keyboard" },
  guitar: { ar: "جيتار", en: "Guitar" },
  drums: { ar: "درامز / إيقاع", en: "Drums / Percussion" },
  sound: { ar: "هندسة صوت", en: "Sound Engineering" },
  photo: { ar: "تصوير فوتوغرافي", en: "Photography" },
  video: { ar: "مونتاج وفيديو", en: "Video Editing" },
  design: { ar: "تصميم جرافيك", en: "Graphic Design" },
  social: { ar: "سوشيال ميديا", en: "Social Media" },
  it: { ar: "برمجة وتكنولوجيا", en: "IT / Tech" },
  sundayschool: { ar: "مدارس أحد", en: "Sunday School" },
  biblestudy: { ar: "درس كتاب", en: "Bible Study" },
  discipleship: { ar: "تلمذة وشباب", en: "Discipleship" },
  translation: { ar: "ترجمة ولغات", en: "Translation" },
  ushering: { ar: "نظام واستقبال", en: "Ushering & Welcome" },
  medical: { ar: "رعاية طبية / تمريض", en: "Medical Care" },
  hospitality: { ar: "ضيافة ومطبخ", en: "Hospitality" },
  logistics: { ar: "تنظيم فعاليات ومخيمات", en: "Event Logistics" },
  sports: { ar: "أنشطة رياضية", en: "Sports Activities" },
};

function getTalentDisplay(skill: string, isAr: boolean): string {
  const common = COMMON_TALENTS.find(
    (t) => t.id === skill || t.nameAr === skill || t.nameEn === skill
  );
  if (common) return isAr ? common.nameAr : common.nameEn;
  if (TALENT_LABELS[skill]) return TALENT_LABELS[skill][isAr ? "ar" : "en"];
  return skill;
}

export function ProfileScreen({ onOpenNotifications, unreadCount = 0 }: ProfileScreenProps = {}) {
  const { mobileApp, common, locale, setLocale } = useTranslation();
  const { theme, setTheme, textScale, setTextScale } = useMobilePrefs();
  const isAr = locale === "ar";
  const { user, member, isLoading: isAuthLoading, logout, refreshProfile } = useMobileAuth();

  const [familyMembers, setFamilyMembers] = useState<FamilyMemberNode[]>([]);
  const [currentFamilyName, setCurrentFamilyName] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceHistoryItem[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editModalTab, setEditModalTab] = useState<"basic" | "ministry" | "talents" | "family">("basic");

  // Delete Profile Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleOpenEdit = (tab: "basic" | "ministry" | "talents" | "family" = "basic") => {
    setEditModalTab(tab);
    setIsEditModalOpen(true);
  };

  const toggleLanguage = () => {
    setLocale(locale === "ar" ? "en" : "ar");
  };

  // Derive real display name
  const displayName = member
    ? `${member.firstName} ${member.lastName}`.trim()
    : user?.name || user?.email || (isAr ? "عضو بالكنيسة" : "Church Member");

  // Single unified church name for all users (members, staff, leaders, admins)
  const churchName =
    isAr ? "كنيسة مصر الجديدة الإنجيلية" : "Heliopolis Evangelical Church";

  // Derive initials
  const getInitials = (name: string) => {
    if (!name) return isAr ? "كن" : "CH";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const memberInitials = getInitials(displayName);

  // Profile Completeness Derivations
  const hasPhone = Boolean(member?.phone && member.phone.trim().length > 0);
  const hasFamily = Boolean(member?.familyId || familyMembers.length > 0);

  const rawSkills = member?.talentProfile?.skills;
  const talentSkills: string[] = Array.isArray(rawSkills)
    ? rawSkills.map((s: any) => (typeof s === "string" ? s : s?.name || s?.id)).filter(Boolean)
    : [];
  const profession = member?.talentProfile?.profession?.trim() || "";
  const hasTalents = talentSkills.length > 0 || profession.length > 0;
  const hasMinistry = Boolean(member?.ministry && member.ministry.trim().length > 0);

  const completedSteps = [
    true, // Name / Email
    hasPhone,
    hasFamily,
    hasTalents || hasMinistry,
  ].filter(Boolean).length;
  const completionPercentage = Math.round((completedSteps / 4) * 100);

  // Format joined date
  const formatJoinedDate = (dateStr?: string) => {
    if (!dateStr) return isAr ? "عضو مسجل" : "Registered Member";
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat(isAr ? "ar-EG" : "en-US", {
        month: "long",
        year: "numeric",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  // Format check-in date
  const formatCheckInDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat(isAr ? "ar-EG" : "en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const fetchMemberDetails = useCallback(async () => {
    if (!member?.id) return;
    setIsLoadingDetails(true);

    try {
      // Fetch family tree if member belongs to a family
      try {
        const familyTree: any = await mobileApiFetch(`/api/members/${member.id}/family`);
        if (familyTree?.family?.name) {
          setCurrentFamilyName(familyTree.family.name);
        } else {
          setCurrentFamilyName(null);
        }
        if (familyTree?.members && Array.isArray(familyTree.members)) {
          const related = familyTree.members
            .filter((node: any) => {
              const memId = node.member?.id || node.id;
              return !node.isFocal && memId && memId !== member.id;
            })
            .map((node: any) => {
              const mem = node.member || node;
              const fName = mem.firstName || "";
              const lName = mem.lastName || "";
              const fullName = `${fName} ${lName}`.trim() || (isAr ? "فرد من الأسرة" : "Family Member");
              const rawRel = (node.relationshipToFocal || node.relationship || "").toLowerCase();

              let relLabel = isAr ? "فرد من الأسرة" : "Family Member";
              if (rawRel.includes("child") || rawRel === "son" || rawRel === "daughter") {
                relLabel = isAr ? "ابن / ابنة" : "Child";
              } else if (rawRel.includes("spouse") || rawRel === "wife" || rawRel === "husband") {
                relLabel = isAr ? "زوج / زوجة" : "Spouse";
              } else if (rawRel.includes("father")) {
                relLabel = isAr ? "الوالد (الأب)" : "Father";
              } else if (rawRel.includes("mother")) {
                relLabel = isAr ? "الوالدة (الأم)" : "Mother";
              } else if (rawRel.includes("parent")) {
                relLabel = isAr ? "أحد الوالدين" : "Parent";
              } else if (rawRel.includes("sibling") || rawRel === "brother" || rawRel === "sister") {
                relLabel = isAr ? "أخ / أخت" : "Sibling";
              } else if (rawRel.includes("guardian")) {
                relLabel = isAr ? "وصي / كفيل" : "Guardian";
              } else if (rawRel.includes("head")) {
                relLabel = isAr ? "رئيس الأسرة" : "Family Head";
              } else if (node.relationshipToFocal) {
                relLabel = node.relationshipToFocal;
              }

              return {
                id: mem.id || node.id,
                name: fullName,
                relationship: relLabel,
                avatarUrl: node.avatarUrl || mem.avatarUrl || null,
              };
            });
          setFamilyMembers(related);
        }
      } catch {
        setFamilyMembers([]);
        setCurrentFamilyName(null);
      }

      // Attendance history is not part of the review edition.
      setAttendanceRecords([]);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [member?.id, isAr]);

  // Load family and attendance details when member is loaded
  useEffect(() => {
    let isMounted = true;
    if (member?.id) {
      void fetchMemberDetails();
    }

    const unsubscribe = subscribeLocalRealtime((event) => {
      if (event.type === "attendance.reset") {
        setAttendanceRecords([]);
        void fetchMemberDetails();
      } else if (event.type === "member.profile_updated") {
        void refreshProfile();
        void fetchMemberDetails();
      }
    });

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "cmp:attendance-reset-trigger") {
        setAttendanceRecords([]);
        void fetchMemberDetails();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      isMounted = false;
      unsubscribe();
      window.removeEventListener("storage", handleStorage);
    };
  }, [member?.id, fetchMemberDetails, refreshProfile]);

  return (
    <div className="space-y-5 pb-6">
      {/* ─── 1. Identity Header: Me & My Family ───────────────────── */}
      <section className="px-1 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8A6A35]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B08D57]" />
            <span>{isAr ? "حسابي وعائلتي" : "Account & Family"}</span>
          </div>
          <h2 className="text-xl font-extrabold text-[#132F4C] tracking-tight mt-0.5">
            {mobileApp.tabProfile}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => handleOpenEdit("basic")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#132F4C] text-white hover:bg-[#132F4C] shadow-sm transition-all active:scale-95"
        >
          <IconEdit className="w-3.5 h-3.5" />
          <span>{isAr ? "تعديل البيانات" : "Edit Profile"}</span>
        </button>
      </section>

      {/* ─── 2. Profile Header Card ──────────────────────────────── */}
      <section className="rounded-[20px] bg-white ring-1 ring-inset ring-[#EAE3D6] p-5 sm:p-6 shadow-[0_2px_8px_rgba(19,47,76,0.04)] text-center relative overflow-hidden">
        <div className="relative inline-block mx-auto mb-3">
          <button
            type="button"
            onClick={() => handleOpenEdit("basic")}
            className="group relative block rounded-full focus:outline-none focus:ring-4 focus:ring-[#B08D57]/20 cursor-pointer transition-transform active:scale-95"
            title={isAr ? "تغيير الصورة الشخصية" : "Change Profile Photo"}
          >
            {isAuthLoading ? (
              <div className="w-20 h-20 rounded-full bg-[#EAE3D6] animate-pulse" />
            ) : member?.avatarUrl || user?.avatarUrl ? (
              <img
                src={member?.avatarUrl || user?.avatarUrl || ""}
                alt={displayName}
                className="w-20 h-20 rounded-full object-cover ring-2 ring-white shadow-md group-hover:opacity-90 transition-opacity"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#132F4C] text-white font-black text-2xl flex items-center justify-center ring-2 ring-white shadow-md">
                {memberInitials}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#132F4C] text-white flex items-center justify-center shadow-md border-2 border-white group-hover:bg-[#132F4C] transition-colors">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </button>
        </div>

        <h3 className="text-lg font-extrabold text-[#132F4C] leading-tight">
          {isAuthLoading ? (
            <span className="w-36 h-5 bg-[#EAE3D6] rounded animate-pulse inline-block" />
          ) : (
            displayName
          )}
        </h3>

        <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-[#8A6A35] font-bold">
          <IconChurch className="w-3.5 h-3.5 text-[#8A6A35] shrink-0" />
          <span>
            {isAuthLoading ? (
              <span className="w-48 h-3.5 bg-[#EAE3D6] rounded animate-pulse inline-block" />
            ) : (
              churchName
            )}
          </span>
        </div>

        {/* User Role, Ministry & Profession Badges */}
        <div className="mt-2.5 flex items-center justify-center gap-2 flex-wrap">
          {user?.role && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F5EEDF] text-[#8A6A35] border border-[#E8DCC0]/60">
              {isAr
                ? user.role === "admin"
                  ? "مدير النظام"
                  : user.role === "leader"
                  ? "قائد خدمة"
                  : user.role === "pastor"
                  ? "راعي"
                  : user.role === "usher"
                  ? "مرشد / استقبال"
                  : user.role === "staff"
                  ? "فريق العمل"
                  : "عضو الكنيسة"
                : user.role === "admin"
                ? "Administrator"
                : user.role === "leader"
                ? "Leader"
                : user.role === "pastor"
                ? "Pastor"
                : user.role === "usher"
                ? "Usher"
                : user.role === "staff"
                ? "Staff"
                : "Church Member"}
            </span>
          )}

          {member?.ministry && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200/60">
              {member.ministry}
            </span>
          )}

          {profession && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60 inline-flex items-center gap-1">
              <IconBriefcase className="w-3 h-3 text-purple-500" />
              <span>{profession}</span>
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F1ECE0] text-[#4B463A] text-xs font-medium">
            <IconCalendar className="w-3.5 h-3.5 text-[#8F8670]" />
            <span>
              {mobileApp.memberSince}: {formatJoinedDate(member?.joinedAt)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleOpenEdit("basic")}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-[#8A6A35] bg-[#F5EEDF] hover:bg-[#F5EEDF] transition-colors"
          >
            <IconEdit className="w-3 h-3" />
            <span>{isAr ? "تعديل" : "Edit"}</span>
          </button>
        </div>
      </section>

      {/* ─── 3. Complete Profile Progress Card (If < 100%) ─────────── */}
      {completionPercentage < 100 && (
        <section className="rounded-[20px] bg-gradient-to-br from-[#F5EEDF]/90 via-white to-purple-50/70 p-4 ring-1 ring-inset ring-[#E8DCC0]/70 shadow-[0_4px_16px_rgba(99,102,241,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#132F4C] to-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <IconSparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#132F4C]">
                  {isAr ? "أكمل بيانات عضويتك" : "Complete Your Profile"}
                </h4>
                <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                  {isAr
                    ? `ملفك الشخصي مكتمل بنسبة ${completionPercentage}%`
                    : `Your profile is ${completionPercentage}% complete`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!hasPhone) handleOpenEdit("basic");
                else if (!hasFamily) handleOpenEdit("family");
                else if (!hasTalents) handleOpenEdit("talents");
                else handleOpenEdit("ministry");
              }}
              className="px-3 py-1.5 rounded-xl bg-[#132F4C] hover:bg-[#132F4C] text-white text-xs font-bold shrink-0 shadow-sm transition-transform active:scale-95"
            >
              {isAr ? "إكمال الآن" : "Complete Now"}
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 w-full bg-[#F5EEDF]/60 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#132F4C] to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>

          {/* Quick action chips */}
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            {!hasPhone && (
              <button
                type="button"
                onClick={() => handleOpenEdit("basic")}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white text-[#8A6A35] ring-1 ring-[#E8DCC0]/80 hover:bg-[#F5EEDF] flex items-center gap-1 transition-colors"
              >
                <IconPhone className="w-3 h-3 text-[#8A6A35]" />
                <span>{isAr ? "+ أضف رقم هاتفك" : "+ Add Phone"}</span>
              </button>
            )}
            {!hasFamily && (
              <button
                type="button"
                onClick={() => handleOpenEdit("family")}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white text-rose-700 ring-1 ring-rose-200/80 hover:bg-rose-50 flex items-center gap-1 transition-colors"
              >
                <IconHeart className="w-3 h-3 text-rose-500" />
                <span>{isAr ? "+ اربط عائلتك" : "+ Link Family"}</span>
              </button>
            )}
            {!hasTalents && (
              <button
                type="button"
                onClick={() => handleOpenEdit("talents")}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white text-purple-700 ring-1 ring-purple-200/80 hover:bg-purple-50 flex items-center gap-1 transition-colors"
              >
                <IconSparkles className="w-3 h-3 text-purple-500" />
                <span>{isAr ? "+ شارك مواهبك ومهنتك" : "+ Add Talents"}</span>
              </button>
            )}
            {!hasMinistry && (
              <button
                type="button"
                onClick={() => handleOpenEdit("ministry")}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white text-teal-700 ring-1 ring-teal-200/80 hover:bg-teal-50 flex items-center gap-1 transition-colors"
              >
                <IconMusic className="w-3 h-3 text-teal-500" />
                <span>{isAr ? "+ اختر خدمتك الكنسية" : "+ Select Ministry"}</span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* ─── 4. Contact Information ──────────────────────────────── */}
      <MobileSection variant="grouped" accent="indigo">
        <div className="flex items-center justify-between pb-1">
          <SectionHeader
            title={mobileApp.contactInfo}
            icon={IconUser}
            accent="indigo"
          />
          <button
            type="button"
            onClick={() => handleOpenEdit("basic")}
            className="text-xs font-bold text-[#8A6A35] hover:text-[#8A6A35] flex items-center gap-1"
          >
            <IconEdit className="w-3.5 h-3.5" />
            <span>{isAr ? "تعديل" : "Edit"}</span>
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-white ring-1 ring-inset ring-[#EAE3D6] shadow-[0_2px_8px_rgba(19,47,76,0.04)] divide-y divide-slate-100 text-xs">
          <div className="py-2 first:pt-0 flex items-center justify-between">
            <span className="text-[#6F6650] font-medium flex items-center gap-2">
              <IconMail className="w-4 h-4 text-[#8A6A35]" />
              <span>{common.email}</span>
            </span>
            <span className="font-semibold text-[#4B463A] dir-ltr">
              {member?.email || user?.email || "—"}
            </span>
          </div>

          <div className="py-2 last:pb-0 flex items-center justify-between">
            <span className="text-[#6F6650] font-medium flex items-center gap-2">
              <IconPhone className="w-4 h-4 text-[#8A6A35]" />
              <span>{common.phone}</span>
            </span>
            {hasPhone ? (
              <span className="font-semibold text-[#4B463A] dir-ltr">
                {member?.phone}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenEdit("basic")}
                className="text-[#8A6A35] font-bold hover:underline inline-flex items-center gap-1"
              >
                <span>{isAr ? "+ أضف رقم هاتفك للتواصل" : "+ Add Phone Number"}</span>
              </button>
            )}
          </div>
        </div>
      </MobileSection>

      {/* ─── 5. Family & Household ───────────────────────────────── */}
      <MobileSection variant="grouped" accent="rose">
        <div className="flex items-center justify-between pb-1">
          <div className="min-w-0 flex-1">
            <SectionHeader
              title={mobileApp.familyCardTitle}
              subtitle={
                currentFamilyName
                  ? (isAr ? `الأسرة: ${currentFamilyName}` : `Family: ${currentFamilyName}`)
                  : (isAr ? "أفراد الأسرة والصلات العائلية" : "Registered family members")
              }
              icon={IconHeart}
              accent="rose"
            />
          </div>
          <button
            type="button"
            onClick={() => handleOpenEdit("family")}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 shrink-0"
          >
            <IconEdit className="w-3.5 h-3.5" />
            <span>{isAr ? "إدارة الأسرة" : "Manage Family"}</span>
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-white ring-1 ring-inset ring-[#EAE3D6] shadow-[0_2px_8px_rgba(19,47,76,0.04)]">
          {familyMembers.length > 0 ? (
            <div className="divide-y divide-slate-100 text-xs">
              {familyMembers.map((fam) => (
                <div key={fam.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                      <IconHeart className="w-3.5 h-3.5 fill-rose-500/20" />
                    </div>
                    <span className="font-bold text-[#4B463A]">{fam.name}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                    {fam.relationship}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center space-y-2">
              <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
                <IconHeart className="w-4 h-4" />
              </div>
              <p className="text-xs text-[#6F6650] font-medium">
                {currentFamilyName
                  ? (isAr
                      ? `أنت مسجل ضمن أسرة "${currentFamilyName}". يمكنك إضافة أفراد عائلتك (الأبناء، الزوجة...) الآن.`
                      : `You are registered with "${currentFamilyName}". You can add your children, spouse, or relatives now.`)
                  : (isAr
                      ? "لم يتم ربط حسابك بعائلتك بعد، يمكنك الانضمام لأسرة قائمة أو تسجيل أسرة جديدة."
                      : "No family relationships linked yet. Link your household or register a new family.")}
              </p>
              <button
                type="button"
                onClick={() => handleOpenEdit("family")}
                className="mt-1 px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs inline-flex items-center gap-1.5 border border-rose-200 transition-colors"
              >
                <span>
                  {currentFamilyName
                    ? (isAr ? "+ إضافة أفراد الأسرة" : "+ Add Family Members")
                    : (isAr ? "+ ربط الأسرة الآن" : "+ Link Family Now")}
                </span>
              </button>
            </div>
          )}
        </div>
      </MobileSection>

      {/* ─── 5b. Role in the church (request usher, leader, pastor, admin) ─── */}

      {/* ─── 6. Ministry Commitments ─────────────────────────────── */}
      <MobileSection variant="grouped" accent="teal">
        <div className="flex items-center justify-between pb-1">
          <SectionHeader
            title={mobileApp.ministryCommitments}
            subtitle={isAr ? "الخدمات واللجان الكنسية" : "Church service ministries"}
            icon={IconMusic}
            accent="teal"
          />
          <button
            type="button"
            onClick={() => handleOpenEdit("ministry")}
            className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            <IconEdit className="w-3.5 h-3.5" />
            <span>{isAr ? "تعديل" : "Edit"}</span>
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-white ring-1 ring-inset ring-[#EAE3D6] shadow-[0_2px_8px_rgba(19,47,76,0.04)]">
          {member?.ministry ? (
            <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <IconBadge icon={IconMusic} accent="teal" size="sm" />
                <div className="text-xs">
                  <p className="font-bold text-[#132F4C]">{member.ministry}</p>
                  <p className="text-teal-700 font-medium mt-0.5">
                    {isAr ? "عضو مشارك في الخدمة الكنسية" : "Active in Church Ministry"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenEdit("ministry")}
                className="p-1 text-teal-600 hover:text-teal-700"
              >
                <IconEdit className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="py-3 text-center space-y-2">
              <p className="text-xs text-[#8F8670] font-medium">
                {isAr ? "لم تحدد خدمتك الكنسية بعد" : "No active ministry assigned yet"}
              </p>
              <button
                type="button"
                onClick={() => handleOpenEdit("ministry")}
                className="px-3.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs inline-flex items-center gap-1.5 border border-teal-200 transition-colors"
              >
                <span>{isAr ? "+ اختيار خدمة كنسية" : "+ Select Ministry"}</span>
              </button>
            </div>
          )}
        </div>
      </MobileSection>

      {/* ─── 7. Talents & Skills ─────────────────────────────────── */}
      <MobileSection variant="grouped" accent="purple">
        <div className="flex items-center justify-between pb-1">
          <SectionHeader
            title={isAr ? "المواهب والمهارات" : "Talents & Skills"}
            subtitle={isAr ? "مواهبك وخبراتك التي تقدمها للكنيسة" : "Your gifts, skills, and profession"}
            icon={IconSparkles}
            accent="purple"
          />
          <button
            type="button"
            onClick={() => handleOpenEdit("talents")}
            className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            <IconEdit className="w-3.5 h-3.5" />
            <span>{isAr ? "تعديل" : "Edit"}</span>
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-white ring-1 ring-inset ring-[#EAE3D6] shadow-[0_2px_8px_rgba(19,47,76,0.04)] space-y-3">
          {profession && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <IconBriefcase className="w-4 h-4 text-purple-600 shrink-0" />
              <div className="flex-1">
                <span className="text-slate-500 font-medium">{isAr ? "المهنة / التخصص: " : "Profession: "}</span>
                <span className="font-bold text-[#132F4C]">{profession}</span>
              </div>
            </div>
          )}

          {talentSkills.length > 0 ? (
            <div>
              <p className="text-[11px] font-bold text-slate-500 mb-2">
                {isAr ? "المواهب والاهتمامات المحددة:" : "Selected Talents & Interests:"}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {talentSkills.map((skillId) => {
                  const label = getTalentDisplay(skillId, isAr);
                  return (
                    <span
                      key={skillId}
                      className="px-2.5 py-1 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200/60 inline-flex items-center gap-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      <span>{label}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-3 text-center space-y-2">
              <p className="text-xs text-[#8F8670] font-medium">
                {isAr
                  ? "شاركنا مواهبك (موسيقى، ميديا، تدريس، استقبال، تنظيم...) لدعم أنشطة الكنيسة"
                  : "Share your talents (music, media, teaching, ushering...) to serve the church"}
              </p>
              <button
                type="button"
                onClick={() => handleOpenEdit("talents")}
                className="px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs inline-flex items-center gap-1.5 border border-purple-200 transition-colors"
              >
                <span>{isAr ? "+ إضافة المواهب والمهارات" : "+ Add Talents & Skills"}</span>
              </button>
            </div>
          )}
        </div>
      </MobileSection>

      {/* ─── 8. Attendance History ───────────────────────────────── */}
      <MobileSection variant="grouped" accent="indigo">
        <SectionHeader
          title={mobileApp.attendanceFacts}
          subtitle={mobileApp.attendanceFactsSubtitle}
          icon={IconCalendar}
          accent="indigo"
        />

        <div className="p-3.5 rounded-2xl bg-white ring-1 ring-inset ring-[#EAE3D6] shadow-[0_2px_8px_rgba(19,47,76,0.04)]">
          {attendanceRecords.length > 0 ? (
            <div className="divide-y divide-slate-100 text-xs">
              {attendanceRecords.map((att) => (
                <div
                  key={att.id}
                  className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2"
                >
                  <span className="font-bold text-[#4B463A] truncate">
                    {att.service?.name || (isAr ? "اجتماع الكنيسة" : "Church Service")}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-[#8F8670] font-medium">
                      {formatCheckInDate(att.checkInTime)}
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                      <IconCheckCircle2 className="w-3 h-3" />
                      <span>{mobileApp.pastWeekAttended}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-2 text-center text-xs text-[#8F8670] font-medium">
              {isAr
                ? "لا توجد سجلات حضور مسجلة بعد"
                : "No attendance check-ins recorded yet"}
            </div>
          )}
        </div>
      </MobileSection>

      {/* ─── 9. Preferences & App Settings ──────────────────────── */}
      <MobileSection variant="grouped" accent="slate">
        <SectionHeader
          title={mobileApp.preferences}
          icon={IconGlobe}
          accent="slate"
        />

        <div className="p-2 rounded-2xl bg-white ring-1 ring-inset ring-[#EAE3D6] shadow-[0_2px_8px_rgba(19,47,76,0.04)] space-y-1.5">
          {/* Language Toggle Row */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="w-full p-2.5 rounded-xl hover:bg-[#FBF8F3] flex items-center justify-between text-xs font-bold text-[#4B463A] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <IconBadge icon={IconGlobe} accent="blue" size="sm" />
              <span>{mobileApp.language}</span>
            </div>
            <span className="text-xs font-bold text-[#8A6A35] bg-[#F5EEDF] px-2.5 py-1 rounded-lg border border-[#E8DCC0]">
              {mobileApp.languageToggle}
            </span>
          </button>

          {/* Appearance: theme */}
          <div className="p-2.5 rounded-xl space-y-2">
            <div className="flex items-center gap-2.5 text-xs font-bold text-[#4B463A]">
              <IconBadge icon={IconSparkles} accent="amber" size="sm" />
              <span>{isAr ? "المظهر" : "Appearance"}</span>
            </div>
            <div role="radiogroup" aria-label={isAr ? "المظهر" : "Appearance"} className="grid grid-cols-3 gap-1.5">
              {(
                [
                  ["light", isAr ? "فاتح" : "Light"],
                  ["dark", isAr ? "داكن" : "Dark"],
                  ["system", isAr ? "تلقائي" : "Auto"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={theme === value}
                  onClick={() => setTheme(value)}
                  className={`py-2 rounded-xl text-[11px] font-semibold ring-1 ring-inset transition-all active:scale-95 ${
                    theme === value
                      ? "bg-[#132F4C] text-[#F3E7CF] ring-[#132F4C]"
                      : "bg-[#FBF8F3] text-[#6F6650] ring-[#EAE3D6]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Text size */}
          <div className="p-2.5 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#4B463A]">
              <span>{isAr ? "حجم الخط" : "Text size"}</span>
              <span className="text-[11px] font-semibold text-[#8A6A35]">{textScale}%</span>
            </div>
            <div className="flex items-center gap-3" dir="ltr">
              <span className="text-[11px] font-semibold text-[#6F6650]">A</span>
              <input
                type="range"
                min={0}
                max={2}
                step={1}
                value={textScale === 100 ? 0 : textScale === 115 ? 1 : 2}
                onChange={(e) => setTextScale(([100, 115, 130] as const)[Number(e.target.value)])}
                aria-label={isAr ? "حجم الخط" : "Text size"}
                className="flex-1 accent-[#B08D57]"
              />
              <span className="text-[18px] font-semibold text-[#6F6650] leading-none">A</span>
            </div>
          </div>

          {/* Notifications Action */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="w-full p-2.5 rounded-xl flex items-center justify-between text-xs font-bold text-[#4B463A] hover:bg-[#FBF8F3] transition-colors active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <IconBadge icon={IconBell} accent="purple" size="sm" />
              <span>{mobileApp.notifications}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {unreadCount > 0 ? (
                <span className="text-white font-bold bg-rose-500 px-2 py-0.5 rounded-full text-[10px] animate-pulse">
                  {unreadCount} {isAr ? "جديدة" : "new"}
                </span>
              ) : (
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-100 text-[11px]">
                  {isAr ? "مفعّلة" : "Active"}
                </span>
              )}
            </div>
          </button>
        </div>
      </MobileSection>

      {/* ─── 10. Account Management & Danger Zone ─────────────────── */}
      <section className="space-y-3 pt-2">
        <button
          type="button"
          onClick={() => {
            void logout();
          }}
          className="w-full py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors active:scale-[0.98] cursor-pointer"
        >
          <IconLogOut className="w-4 h-4 rtl:rotate-180 text-slate-500" />
          <span>{mobileApp.signOut}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsDeleteModalOpen(true)}
          className="w-full py-3 px-4 rounded-2xl bg-rose-50/70 hover:bg-rose-100 text-rose-600 font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-rose-200/80 active:scale-[0.98] cursor-pointer"
        >
          <IconTrash2 className="w-4 h-4 text-rose-500" />
          <span>{isAr ? "حذف الملف الشخصي والحساب" : "Delete Profile & Account"}</span>
        </button>

        <p className="text-center text-[11px] text-[#8F8670] font-medium">
          {mobileApp.appVersion}
        </p>
      </section>

      {/* ─── 11. Interactive Edit Profile Modal ─────────────────── */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialMember={member}
        initialUser={user}
        initialTab={editModalTab}
        onOpenDelete={() => {
          setIsEditModalOpen(false);
          setIsDeleteModalOpen(true);
        }}
        onSaved={async () => {
          await refreshProfile();
          void fetchMemberDetails();
        }}
      />

      {/* ─── 12. Delete Profile Confirmation Modal ─────────────── */}
      <DeleteProfileModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDeleted={async () => {
          setIsDeleteModalOpen(false);
          await logout();
        }}
      />
    </div>
  );
}
