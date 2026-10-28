"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "@/lib/i18n";
import { AvatarCropperModal } from "./avatar-cropper-modal";
import {
  IconUser,
  IconPhone,
  IconUsers,
  IconMusic,
  IconHeart,
  IconSparkles,
  IconCheckCircle2,
  IconX,
  IconSend,
  IconChurch,
} from "../icons";
import { mobileApiFetch } from "@/lib/mobile-app/api-client";
import { publishLocalRealtime } from "@/lib/realtime/local-broadcast";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (updatedMember: any) => void;
  initialMember?: any;
  initialUser?: any;
  initialTab?: "basic" | "ministry" | "talents" | "family";
  isOnboarding?: boolean;
  onOpenDelete?: () => void;
}

interface FamilyDirectoryItem {
  id: string;
  name: string;
  headMemberId?: string | null;
  memberCount?: number;
}

export const COMMON_TALENTS = [
  // Music & Worship
  { id: "singing", nameAr: "ترنيم / كورال", nameEn: "Vocals / Choir", cat: "music" },
  { id: "piano", nameAr: "بيانو / كيبورد", nameEn: "Piano / Keyboard", cat: "music" },
  { id: "guitar", nameAr: "جيتار", nameEn: "Guitar", cat: "music" },
  { id: "drums", nameAr: "درامز / إيقاع", nameEn: "Drums / Percussion", cat: "music" },
  { id: "sound", nameAr: "هندسة صوت", nameEn: "Sound Engineering", cat: "music" },
  // Media & Technology
  { id: "photo", nameAr: "تصوير فوتوغرافي", nameEn: "Photography", cat: "media" },
  { id: "video", nameAr: "مونتاج وفيديو", nameEn: "Video Editing", cat: "media" },
  { id: "design", nameAr: "تصميم جرافيك", nameEn: "Graphic Design", cat: "media" },
  { id: "social", nameAr: "سوشيال ميديا", nameEn: "Social Media", cat: "media" },
  { id: "it", nameAr: "برمجة وتكنولوجيا", nameEn: "IT / Tech", cat: "media" },
  // Teaching & Children
  { id: "sundayschool", nameAr: "مدارس أحد", nameEn: "Sunday School", cat: "teaching" },
  { id: "biblestudy", nameAr: "درس كتاب", nameEn: "Bible Study", cat: "teaching" },
  { id: "discipleship", nameAr: "تلمذة وشباب", nameEn: "Discipleship", cat: "teaching" },
  { id: "translation", nameAr: "ترجمة ولغات", nameEn: "Translation", cat: "teaching" },
  // Practical & Service
  { id: "ushering", nameAr: "نظام واستقبال", nameEn: "Ushering & Welcome", cat: "practical" },
  { id: "medical", nameAr: "رعاية طبية / تمريض", nameEn: "Medical Care", cat: "practical" },
  { id: "hospitality", nameAr: "ضيافة ومطبخ", nameEn: "Hospitality", cat: "practical" },
  { id: "logistics", nameAr: "تنظيم فعاليات ومخيمات", nameEn: "Event Logistics", cat: "practical" },
  { id: "sports", nameAr: "أنشطة رياضية", nameEn: "Sports Activities", cat: "practical" },
];

const CHURCH_MINISTRIES = [
  { id: "Worship & Music", nameAr: "خدمة التسبيح والترنيم", nameEn: "Worship & Music Ministry" },
  { id: "Media & Tech", nameAr: "الميديا والإنتاج المرئي", nameEn: "Media & Tech Production" },
  { id: "Sunday School & Kids", nameAr: "خدمة مدارس الأحد والأطفال", nameEn: "Sunday School & Kids" },
  { id: "Youth & College", nameAr: "خدمة الشباب والجامعيين", nameEn: "Youth & College Ministry" },
  { id: "Ushers & Hospitality", nameAr: "الاستقبال والنظام", nameEn: "Ushers & Hospitality" },
  { id: "Pastoral Care & Visitation", nameAr: "الرعاية والافتقاد", nameEn: "Pastoral Care & Visitation" },
  { id: "Prayer Team", nameAr: "فريق الصلاة والشفاعة", nameEn: "Prayer Team" },
  { id: "Community Outreach", nameAr: "خدمة المجتمع والإغاثة", nameEn: "Community Outreach" },
];

export function EditProfileModal({
  isOpen,
  onClose,
  onSaved,
  initialMember,
  initialUser,
  initialTab = "basic",
  isOnboarding = false,
  onOpenDelete,
}: EditProfileModalProps) {
  const { locale } = useTranslation();
  const isAr = locale === "ar";

  const [activeTab, setActiveTab] = useState<"basic" | "ministry" | "talents" | "family">(initialTab);

  // Form Fields
  const [firstName, setFirstName] = useState(initialMember?.firstName || initialUser?.name?.split(" ")[0] || "");
  const [lastName, setLastName] = useState(
    initialMember?.lastName || initialUser?.name?.split(" ").slice(1).join(" ") || ""
  );
  const [phone, setPhone] = useState(initialMember?.phone || "");
  const [avatarUrl, setAvatarUrl] = useState(initialMember?.avatarUrl || initialUser?.avatarUrl || "");
  const [ministry, setMinistry] = useState(initialMember?.ministry || "");
  const [profession, setProfession] = useState(initialMember?.talentProfile?.profession || "");
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    initialMember?.talentProfile?.skills?.map((s: any) => s.name) || []
  );

  // Family Fields
  const [familyMode, setFamilyMode] = useState<"existing" | "new" | "keep">("keep");
  const [familiesList, setFamiliesList] = useState<FamilyDirectoryItem[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState("");
  const [relationshipType, setRelationshipType] = useState("child");
  const [newFamilyName, setNewFamilyName] = useState("");
  const [currentFamily, setCurrentFamily] = useState<{
    id: string;
    name: string;
    headMemberId?: string | null;
    isHead?: boolean;
  } | null>(null);
  const [currentFamilyMembers, setCurrentFamilyMembers] = useState<
    Array<{
      id: string;
      name: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      relationship: string;
      relationshipKey?: "son" | "daughter" | "wife" | "husband" | "father" | "mother" | "brother" | "sister" | "guardian" | "other";
      isHead?: boolean;
      isFocal?: boolean;
      avatarUrl?: string | null;
    }>
  >([]);
  const [editingFamilyMemberId, setEditingFamilyMemberId] = useState<string | null>(null);
  const [editedFamilyMembers, setEditedFamilyMembers] = useState<
    Record<
      string,
      {
        firstName: string;
        lastName: string;
        relationship: "son" | "daughter" | "wife" | "husband" | "father" | "mother" | "brother" | "sister" | "guardian" | "other";
        phone: string;
      }
    >
  >({});
  const [removedFamilyMemberIds, setRemovedFamilyMemberIds] = useState<string[]>([]);
  const [isLoadingFamily, setIsLoadingFamily] = useState(false);
  const [showFamilySwitch, setShowFamilySwitch] = useState(false);
  const [familyMembersToAdd, setFamilyMembersToAdd] = useState<
    Array<{
      id: string;
      firstName: string;
      lastName: string;
      relationship: "son" | "daughter" | "wife" | "husband" | "father" | "mother" | "brother" | "sister" | "guardian" | "other";
      phone: string;
    }>
  >([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Avatar Upload & Cropping State
  const [rawImageToCrop, setRawImageToCrop] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!file.type.startsWith("image/")) {
      setErrorMessage(isAr ? "يرجى اختيار ملف صورة صالح" : "Please select a valid image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        setRawImageToCrop(result);
        setIsCropperOpen(true);
      }
    };
    reader.readAsDataURL(file);
  };

  // Sync state whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setFirstName(initialMember?.firstName || initialUser?.name?.split(" ")[0] || "");
      setLastName(
        initialMember?.lastName || initialUser?.name?.split(" ").slice(1).join(" ") || ""
      );
      setPhone(initialMember?.phone || "");
      setAvatarUrl(initialMember?.avatarUrl || initialUser?.avatarUrl || "");
      setMinistry(initialMember?.ministry || "");
      setProfession(initialMember?.talentProfile?.profession || "");

      const rawSkills = initialMember?.talentProfile?.skills;
      const skills = Array.isArray(rawSkills)
        ? rawSkills.map((s: any) => (typeof s === "string" ? s : s?.name || s?.id)).filter(Boolean)
        : [];
      setSelectedSkills(skills);
      setIsSuccess(false);
      setErrorMessage(null);
    }
  }, [isOpen, initialMember, initialUser, initialTab]);

  // Load existing families list
  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    async function loadFamilies() {
      try {
        const res: any = await mobileApiFetch("/api/families?view=directory").catch(async () => {
          const fallback = await fetch("/api/families?view=directory").catch(() => null);
          return fallback ? fallback.json() : null;
        });
        const list = res?.items || res?.data?.items || (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
        if (Array.isArray(list) && active) {
          const mapped: FamilyDirectoryItem[] = list
            .map((item: any) => ({
              id: item.family?.id || item.id,
              name: item.family?.name || item.name,
              headMemberId: item.family?.headMemberId || item.headMemberId,
              memberCount: item.familySize || item.memberCount,
            }))
            .filter((f: any) => Boolean(f.id && f.name));

          setFamiliesList(mapped);
          if (mapped.length > 0 && !selectedFamilyId) {
            setSelectedFamilyId(initialMember?.familyId || mapped[0].id);
          }
        }
      } catch {}
    }

    void loadFamilies();
    return () => {
      active = false;
    };
  }, [isOpen, initialMember?.familyId, selectedFamilyId]);

  // Load current member's family tree to pre-populate Manage Family view
  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    async function loadFamilyTree() {
      const targetMemberId = initialMember?.id;
      if (!targetMemberId) return;

      setIsLoadingFamily(true);
      try {
        const tree: any = await mobileApiFetch(`/api/members/${targetMemberId}/family`).catch(async () => {
          const fb = await fetch(`/api/members/${targetMemberId}/family`).catch(() => null);
          return fb ? fb.json() : null;
        });

        if (!active) return;

        const famData = tree?.family || tree?.data?.family;
        if (famData?.id) {
          const isHead = famData.headMemberId === targetMemberId;
          setCurrentFamily({
            id: famData.id,
            name: famData.name,
            headMemberId: famData.headMemberId,
            isHead,
          });
          setSelectedFamilyId(famData.id);
          setFamilyMode("existing");

          const nodes = tree?.members || tree?.data?.members;
          if (Array.isArray(nodes)) {
            const mapped = nodes.map((node: any) => {
              const mem = node.member || node;
              const fName = mem.firstName || "";
              const lName = mem.lastName || "";
              const fullName = `${fName} ${lName}`.trim() || (isAr ? "فرد من الأسرة" : "Family Member");
              const rawRel = (node.relationshipToFocal || node.relationship || "").toLowerCase();
              let relKey: "son" | "daughter" | "wife" | "husband" | "father" | "mother" | "brother" | "sister" | "guardian" | "other" = "other";
              let relLabel = isAr ? "فرد من الأسرة" : "Family Member";

              if (rawRel.includes("daughter")) {
                relKey = "daughter";
                relLabel = isAr ? "ابنة" : "Daughter";
              } else if (rawRel.includes("son")) {
                relKey = "son";
                relLabel = isAr ? "ابن" : "Son";
              } else if (rawRel.includes("child")) {
                relKey = "son";
                relLabel = isAr ? "ابن / ابنة" : "Child";
              } else if (rawRel.includes("wife")) {
                relKey = "wife";
                relLabel = isAr ? "زوجة" : "Wife";
              } else if (rawRel.includes("husband")) {
                relKey = "husband";
                relLabel = isAr ? "زوج" : "Husband";
              } else if (rawRel.includes("spouse")) {
                relKey = "wife";
                relLabel = isAr ? "زوج / زوجة" : "Spouse";
              } else if (rawRel.includes("father")) {
                relKey = "father";
                relLabel = isAr ? "الوالد (الأب)" : "Father";
              } else if (rawRel.includes("mother")) {
                relKey = "mother";
                relLabel = isAr ? "الوالدة (الأم)" : "Mother";
              } else if (rawRel.includes("parent")) {
                relKey = "father";
                relLabel = isAr ? "أحد الوالدين" : "Parent";
              } else if (rawRel.includes("brother")) {
                relKey = "brother";
                relLabel = isAr ? "أخ" : "Brother";
              } else if (rawRel.includes("sister")) {
                relKey = "sister";
                relLabel = isAr ? "أخت" : "Sister";
              } else if (rawRel.includes("sibling")) {
                relKey = "brother";
                relLabel = isAr ? "أخ / أخت" : "Sibling";
              } else if (rawRel.includes("guardian")) {
                relKey = "guardian";
                relLabel = isAr ? "وصي / كفيل" : "Guardian";
              } else if (rawRel.includes("head") || (node.isFamilyHead && node.isFocal)) {
                relLabel = isAr ? "رئيس الأسرة" : "Family Head";
              } else if (node.relationshipToFocal) {
                relLabel = node.relationshipToFocal;
              }

              return {
                id: mem.id || node.id,
                name: fullName,
                firstName: fName,
                lastName: lName,
                phone: mem.phone || "",
                relationship: relLabel,
                relationshipKey: relKey,
                isHead: Boolean(node.isFamilyHead || famData.headMemberId === mem.id),
                isFocal: Boolean(node.isFocal || mem.id === targetMemberId),
                avatarUrl: node.avatarUrl || mem.avatarUrl || null,
              };
            });
            setCurrentFamilyMembers(mapped);
          }
        } else {
          setCurrentFamily(null);
          setCurrentFamilyMembers([]);
          setFamilyMode(initialMember?.familyId ? "existing" : "new");
        }
      } catch {
        if (active) {
          setCurrentFamily(null);
          setCurrentFamilyMembers([]);
          setFamilyMode(initialMember?.familyId ? "existing" : "new");
        }
      } finally {
        if (active) {
          setIsLoadingFamily(false);
        }
      }
    }

    void loadFamilyTree();
    return () => {
      active = false;
    };
  }, [isOpen, initialMember?.id, initialMember?.familyId, isAr]);

  if (!isOpen) return null;

  const isTalentSelected = (t: { id: string; nameAr: string; nameEn: string }) => {
    return selectedSkills.some(
      (s) => s === t.id || s === t.nameAr || s === t.nameEn
    );
  };

  const toggleTalent = (t: { id: string; nameAr: string; nameEn: string }) => {
    setSelectedSkills((prev) => {
      const isAlready = prev.some((s) => s === t.id || s === t.nameAr || s === t.nameEn);
      if (isAlready) {
        return prev.filter((s) => s !== t.id && s !== t.nameAr && s !== t.nameEn);
      } else {
        return [...prev, isAr ? t.nameAr : t.nameEn];
      }
    });
  };

  const toggleSkill = (skillName: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skillName) ? prev.filter((s) => s !== skillName) : [...prev, skillName]
    );
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setErrorMessage(
        isAr
          ? "الاسم الكامل ورقم الهاتف المحمول كلها حقول إلزامية لا يمكن تركها فارغة."
          : "Full name and mobile phone number are mandatory fields and cannot be empty."
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const payload: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        avatarUrl: avatarUrl.trim() || null,
        ministry: ministry || null,
        profession: profession.trim() || null,
        skills: selectedSkills,
      };

      if (familyMode === "new" && newFamilyName.trim()) {
        payload.createFamilyName = newFamilyName.trim();
        payload.familyRelationshipType = "head";
      } else if (familyMode === "existing" && selectedFamilyId) {
        payload.familyId = selectedFamilyId;
        payload.familyRelationshipType = relationshipType;
      } else if (currentFamily?.id) {
        payload.familyId = currentFamily.id;
      }

      if (familyMembersToAdd.length > 0) {
        payload.newFamilyMembers = familyMembersToAdd
          .filter((m) => m.firstName.trim().length > 0)
          .map((m) => ({
            firstName: m.firstName.trim(),
            lastName: m.lastName.trim() || lastName.trim() || (isAr ? "الأسرة" : "Family"),
            relationship: m.relationship,
            phone: m.phone.trim() || undefined,
          }));
      }

      // Add edited existing family members
      if (Object.keys(editedFamilyMembers).length > 0) {
        const updatedList = Object.entries(editedFamilyMembers)
          .filter(([id]) => !removedFamilyMemberIds.includes(id))
          .map(([id, d]) => ({
            memberId: id,
            relationship: d.relationship,
            firstName: d.firstName.trim() || undefined,
            lastName: d.lastName.trim() || undefined,
            phone: d.phone.trim() || undefined,
          }));
        if (updatedList.length > 0) {
          payload.updatedFamilyMembers = updatedList;
        }
      }

      // Add unlinked/removed family members
      if (removedFamilyMemberIds.length > 0) {
        payload.removedFamilyMemberIds = removedFamilyMemberIds;
      }

      const res: any = await mobileApiFetch("/api/members/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      const updated = res?.data || res;

      // Broadcast local realtime update so any open dashboard or mobile tab reflects immediately
      publishLocalRealtime({
        type: "member.profile_updated",
        data: {
          memberId: updated?.id || initialMember?.id,
          memberName: `${firstName} ${lastName}`.trim(),
          phone: payload.phone,
          ministry: payload.ministry,
          skills: selectedSkills,
          familyId: payload.familyId || updated?.familyId,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });

      setIsSuccess(true);
      setFamilyMembersToAdd([]);
      setEditedFamilyMembers({});
      setRemovedFamilyMemberIds([]);
      setEditingFamilyMemberId(null);
      setShowFamilySwitch(false);
      if (onSaved) onSaved(updated);

      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || (isAr ? "تعذر حفظ البيانات. حاول مرة أخرى." : "Could not save profile."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-none sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[92vh] animate-in slide-in-from-bottom duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs ${
              isOnboarding ? "bg-amber-50 text-amber-600" : "bg-[#F5EEDF] text-[#8A6A35]"
            }`}>
              {isOnboarding ? (
                <IconSparkles className="w-5 h-5 text-amber-600" />
              ) : (
                <IconUser className="w-5 h-5 text-[#8A6A35]" />
              )}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#132F4C] leading-tight">
                {isOnboarding
                  ? (isAr ? "مرحباً بك! استكمل بيانات عضويتك" : "Welcome! Complete Your Profile")
                  : (isAr ? "تحديث وتكملة بيانات الملف" : "Complete & Edit Profile")}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isOnboarding
                  ? (isAr
                      ? "خطوات بسيطة لتسهيل تواصل الرعاة والخدام ومجتمع الكنيسة معك"
                      : "Quick steps to help your shepherds and church community stay in touch")
                  : (isAr
                      ? "بياناتك تساعد رعاة وخدام الكنيسة في التواصل ورعايتك"
                      : "Keep your church record up-to-date and connected")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors"
            title={isAr ? "إغلاق" : "Close"}
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center border-b border-slate-100 px-3 py-2 bg-slate-50/70 gap-1 overflow-x-auto no-scrollbar text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("basic")}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "basic"
                ? "bg-white text-[#8A6A35] shadow-xs ring-1 ring-slate-200/80 font-bold"
                : "text-slate-600 hover:bg-white/60"
            }`}
          >
            <IconUser className="w-3.5 h-3.5" />
            <span>{isAr ? "البيانات الأساسية" : "Contact"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ministry")}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "ministry"
                ? "bg-white text-teal-700 shadow-xs ring-1 ring-slate-200/80 font-bold"
                : "text-slate-600 hover:bg-white/60"
            }`}
          >
            <IconChurch className="w-3.5 h-3.5" />
            <span>{isAr ? "الخدمة بالكنيسة" : "Ministry"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("talents")}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "talents"
                ? "bg-white text-purple-700 shadow-xs ring-1 ring-slate-200/80 font-bold"
                : "text-slate-600 hover:bg-white/60"
            }`}
          >
            <IconSparkles className="w-3.5 h-3.5" />
            <span>{isAr ? "المواهب والمهارات" : "Talents"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("family")}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "family"
                ? "bg-white text-rose-700 shadow-xs ring-1 ring-slate-200/80 font-bold"
                : "text-slate-600 hover:bg-white/60"
            }`}
          >
            <IconHeart className="w-3.5 h-3.5" />
            <span>{isAr ? "الأسرة والعائلة" : "Family"}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {errorMessage}
            </div>
          )}

          {isSuccess ? (
            <div className="py-10 text-center space-y-3 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <IconCheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {isAr ? "تم تحديث وحفظ بياناتك بنجاح!" : "Profile Updated Successfully!"}
              </h3>
              <p className="text-xs text-slate-500">
                {isAr ? "البيانات مسجلة الآن ومحدثة على نظام الكنيسة." : "Your changes are now live on church records."}
              </p>
            </div>
          ) : (
            <>
              {/* ─── TAB 1: BASIC INFO ──────────────────────────────────── */}
              {activeTab === "basic" && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {isAr ? "الاسم الأول *" : "First Name *"}
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {isAr ? "اسم العائلة *" : "Last Name *"}
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isAr ? "رقم الموبايل / واتساب (إلزامي للتواصل) *" : "Mobile Phone / WhatsApp (Mandatory) *"}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-slate-400 pointer-events-none">
                        <IconPhone className="w-4 h-4 text-[#8A6A35]" />
                      </span>
                      <input
                        type="tel"
                        required
                        dir="ltr"
                        placeholder="010XXXXXXXX or +2010..."
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full ps-9 pe-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] outline-none font-medium"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {isAr
                        ? "يُستخدم لربط العضوية وإرسال رسائل الافتقاد ومواعيد الاجتماعات والخدمات"
                        : "Mandatory: Used to uniquely identify member and for pastoral follow-ups"}
                    </p>
                  </div>

                  {/* Avatar Upload & Cropper Section */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                    <label className="block text-xs font-bold text-slate-700">
                      {isAr ? "الصورة الشخصية (الملف ومجتمع الكنيسة)" : "Profile Avatar & Photo"}
                    </label>

                    <div className="flex items-center gap-3.5">
                      {/* Avatar Preview */}
                      <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 ring-2 ring-[#B08D57]/30 shadow-sm bg-slate-200">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt="Avatar preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#132F4C] text-white flex items-center justify-center font-bold text-base">
                            {(firstName[0] || "M").toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Controls */}
                      <div className="flex-1 space-y-1.5">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileSelect}
                        />

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1.5 rounded-xl bg-[#132F4C] hover:bg-[#132F4C] text-white text-[11px] font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>{isAr ? "رفع وقص صورة" : "Upload & Crop"}</span>
                          </button>

                          {avatarUrl && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setRawImageToCrop(avatarUrl);
                                  setIsCropperOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-semibold transition-all cursor-pointer"
                              >
                                {isAr ? "إعادة القص" : "Re-crop"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setAvatarUrl("")}
                                className="px-2.5 py-1.5 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-[11px] font-semibold transition-all cursor-pointer"
                              >
                                {isAr ? "إزالة" : "Remove"}
                              </button>
                            </>
                          )}
                        </div>

                        <p className="text-[10px] text-slate-500 leading-tight">
                          {isAr
                            ? "اختر صورتك من جهازك لفتح أداة القص المباشرة وتوسيط الوجه داخل الدائرة."
                            : "Select a photo to crop and center your face inside the circle."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {onOpenDelete && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        {isAr ? "ترغب في حذف ملفك الشخصي نهائياً؟" : "Want to delete your profile?"}
                      </span>
                      <button
                        type="button"
                        onClick={onOpenDelete}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                      >
                        {isAr ? "حذف الحساب والملف" : "Delete Account"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB 2: MINISTRY & SERVICE ─────────────────────────── */}
              {activeTab === "ministry" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isAr ? "الخدمة التي تشارك بها أو ترغب في الانضمام إليها" : "Ministry or Service Interest"}
                    </label>
                    <select
                      value={ministry}
                      onChange={(e) => setMinistry(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none bg-white"
                    >
                      <option value="">{isAr ? "— اختر الخدمة —" : "— Select Ministry —"}</option>
                      {CHURCH_MINISTRIES.map((m) => (
                        <option key={m.id} value={m.nameAr}>
                          {isAr ? m.nameAr : m.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isAr ? "الوظيفة أو مجال العمل الحالي (اختياري)" : "Profession / Field of Work"}
                    </label>
                    <input
                      type="text"
                      placeholder={isAr ? "مثال: طبيب، مهندس، مدرس، طالب..." : "e.g. Engineer, Doctor, Teacher"}
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* ─── TAB 3: TALENTS & SKILLS ───────────────────────────── */}
              {activeTab === "talents" && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    {isAr
                      ? "اختر المواهب والمهارات التي وهبك الله إياها ويمكنك مساعدة الكنيسة وأخوتك بها:"
                      : "Select the talents and gifts you would like to share with the church:"}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {COMMON_TALENTS.map((t) => {
                      const isSelected = isTalentSelected(t);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleTalent(t)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-purple-600 text-white shadow-xs scale-[1.02]"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                          <span>{isAr ? t.nameAr : t.nameEn}</span>
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-slate-400 mt-2">
                    {isAr
                      ? `تم تحديد ${selectedSkills.length} موهبة.`
                      : `${selectedSkills.length} talents selected.`}
                  </p>
                </div>
              )}

              {/* ─── TAB 4: FAMILY & HOUSEHOLD ─────────────────────────── */}
              {activeTab === "family" && (
                <div className="space-y-4">
                  {/* Current Registered Family Card if member already has one */}
                  {currentFamily && (
                    <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 shadow-2xs space-y-2.5 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-white text-rose-600 flex items-center justify-center border border-rose-100 shadow-2xs">
                            <IconHeart className="w-4 h-4 fill-rose-500/20" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wide">
                              {isAr ? "الأسرة المسجلة بالكنيسة" : "Current Registered Family"}
                            </span>
                            <h4 className="text-sm font-bold text-slate-800 leading-tight">
                              {currentFamily.name}
                            </h4>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white text-rose-700 border border-rose-200 shadow-2xs">
                          {currentFamily.isHead
                            ? (isAr ? "أنت رئيس الأسرة 👑" : "Family Head 👑")
                            : (isAr ? "فرد من الأسرة" : "Family Member")}
                        </span>
                      </div>

                      {/* Display current registered members */}
                      {currentFamilyMembers.length > 0 && (
                        <div className="pt-2 border-t border-rose-100 space-y-1.5">
                          <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                            <span>{isAr ? "أفراد الأسرة الحاليين:" : "Registered Family Members:"}</span>
                            <span className="text-[10px] font-semibold text-rose-600">
                              {currentFamilyMembers.length} {isAr ? "أفراد" : "members"}
                            </span>
                          </div>
                          <div className="divide-y divide-rose-100/60 bg-white/95 rounded-xl border border-rose-100/70 overflow-hidden text-xs">
                            {currentFamilyMembers.map((m) => {
                              const isMarkedForRemoval = removedFamilyMemberIds.includes(m.id);
                              const edited = editedFamilyMembers[m.id];
                              const isEditing = editingFamilyMemberId === m.id;
                              const currentFirstName = edited ? edited.firstName : m.firstName || "";
                              const currentLastName = edited ? edited.lastName : m.lastName || "";
                              const currentPhone = edited ? edited.phone : m.phone || "";
                              const currentRelKey = edited ? edited.relationship : m.relationshipKey || "other";
                              const displayName = `${currentFirstName} ${currentLastName}`.trim() || m.name;

                              const getRelLabel = (relKey: string) => {
                                switch (relKey) {
                                  case "son": return isAr ? "ابن" : "Son";
                                  case "daughter": return isAr ? "ابنة" : "Daughter";
                                  case "wife": return isAr ? "زوجة" : "Wife";
                                  case "husband": return isAr ? "زوج" : "Husband";
                                  case "father": return isAr ? "الوالد (الأب)" : "Father";
                                  case "mother": return isAr ? "الوالدة (الأم)" : "Mother";
                                  case "brother": return isAr ? "أخ" : "Brother";
                                  case "sister": return isAr ? "أخت" : "Sister";
                                  case "guardian": return isAr ? "وصي" : "Guardian";
                                  default: return isAr ? "آخر" : "Other";
                                }
                              };

                              if (isMarkedForRemoval) {
                                return (
                                  <div key={m.id} className="px-3 py-2 bg-red-50/70 border-s-2 border-red-500 flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="line-through text-slate-500 font-medium truncate">{displayName}</span>
                                      <span className="text-[10px] text-red-600 font-bold bg-red-100 px-1.5 py-0.5 rounded-full shrink-0">
                                        {isAr ? "سيتم الحذف عند الحفظ" : "Will unlink on save"}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setRemovedFamilyMemberIds((prev) => prev.filter((id) => id !== m.id))}
                                      className="text-[11px] font-bold text-rose-700 hover:text-rose-900 bg-white border border-rose-200 px-2 py-0.5 rounded-lg shadow-2xs"
                                    >
                                      {isAr ? "تراجع" : "Undo"}
                                    </button>
                                  </div>
                                );
                              }

                              return (
                                <div key={m.id} className="space-y-0">
                                  <div className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-rose-50/30 transition-colors">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-6 h-6 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold flex items-center justify-center shrink-0 border border-rose-100">
                                        {displayName.charAt(0) || "👤"}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="font-semibold text-slate-800 truncate flex items-center gap-1">
                                          <span>{displayName}</span>
                                          {m.isFocal && (
                                            <span className="text-[10px] font-normal text-slate-400">
                                              ({isAr ? "أنت" : "You"})
                                            </span>
                                          )}
                                          {edited && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Edited" />
                                          )}
                                        </div>
                                        {currentPhone && (
                                          <div className="text-[10px] text-slate-400 truncate">
                                            {currentPhone}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        edited ? "bg-amber-100 text-amber-800" : "bg-rose-50 text-rose-700"
                                      }`}>
                                        {getRelLabel(currentRelKey)}
                                      </span>

                                      {!m.isFocal && (
                                        <div className="flex items-center gap-1 ms-1">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (isEditing) {
                                                setEditingFamilyMemberId(null);
                                              } else {
                                                if (!edited) {
                                                  setEditedFamilyMembers((prev) => ({
                                                    ...prev,
                                                    [m.id]: {
                                                      firstName: m.firstName || m.name.split(" ")[0] || "",
                                                      lastName: m.lastName || m.name.split(" ").slice(1).join(" ") || "",
                                                      relationship: m.relationshipKey || "other",
                                                      phone: m.phone || "",
                                                    },
                                                  }));
                                                }
                                                setEditingFamilyMemberId(m.id);
                                              }
                                            }}
                                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                            title={isAr ? "تعديل البيانات أو صلة القرابة" : "Edit Details or Relationship"}
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setRemovedFamilyMemberIds((prev) => [...prev, m.id]);
                                              if (isEditing) setEditingFamilyMemberId(null);
                                            }}
                                            className="p-1 rounded-md text-red-400 hover:text-red-700 hover:bg-red-50 transition-colors"
                                            title={isAr ? "إلغاء ربط الفرد من الأسرة" : "Unlink from Family"}
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Inline Edit Form for this member */}
                                  {isEditing && (
                                    <div className="p-3 bg-amber-50/50 border-t border-amber-100/70 space-y-2 animate-in fade-in duration-150">
                                      <div className="text-[11px] font-bold text-amber-900 flex items-center justify-between">
                                        <span>{isAr ? "تعديل صلة القرابة والبيانات:" : "Edit Relationship & Member Details:"}</span>
                                        <span className="text-[10px] text-amber-700 font-normal">
                                          {isAr ? "سيتم الحفظ عند الضغط على حفظ التغييرات بالأسفل" : "Applies on profile save"}
                                        </span>
                                      </div>

                                      <div className="space-y-1.5">
                                        <div>
                                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                            {isAr ? "صلة القرابة بالنسبة لك:" : "Relationship to You:"}
                                          </label>
                                          <select
                                            value={currentRelKey}
                                            onChange={(e) => {
                                              const newRel = e.target.value as any;
                                              setEditedFamilyMembers((prev) => ({
                                                ...prev,
                                                [m.id]: {
                                                  ...(prev[m.id] || {
                                                    firstName: currentFirstName,
                                                    lastName: currentLastName,
                                                    phone: currentPhone,
                                                  }),
                                                  relationship: newRel,
                                                },
                                              }));
                                            }}
                                            className="w-full px-2.5 py-1.5 text-xs bg-white rounded-lg border border-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                                          >
                                            <option value="son">{isAr ? "ابن (Son)" : "Son"}</option>
                                            <option value="daughter">{isAr ? "ابنة (Daughter)" : "Daughter"}</option>
                                            <option value="wife">{isAr ? "زوجة (Wife)" : "Wife"}</option>
                                            <option value="husband">{isAr ? "زوج (Husband)" : "Husband"}</option>
                                            <option value="father">{isAr ? "الوالد / أب (Father)" : "Father"}</option>
                                            <option value="mother">{isAr ? "الوالدة / أم (Mother)" : "Mother"}</option>
                                            <option value="brother">{isAr ? "أخ (Brother)" : "Brother"}</option>
                                            <option value="sister">{isAr ? "أخت (Sister)" : "Sister"}</option>
                                            <option value="guardian">{isAr ? "وصي / كفيل (Guardian)" : "Guardian"}</option>
                                            <option value="other">{isAr ? "آخر (Other)" : "Other"}</option>
                                          </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-1.5">
                                          <div>
                                            <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                              {isAr ? "الاسم الأول:" : "First Name:"}
                                            </label>
                                            <input
                                              type="text"
                                              value={currentFirstName}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                setEditedFamilyMembers((prev) => ({
                                                  ...prev,
                                                  [m.id]: {
                                                    ...(prev[m.id] || {
                                                      lastName: currentLastName,
                                                      relationship: currentRelKey,
                                                      phone: currentPhone,
                                                    }),
                                                    firstName: val,
                                                  },
                                                }));
                                              }}
                                              className="w-full px-2.5 py-1 text-xs bg-white rounded-lg border border-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                              {isAr ? "اسم العائلة:" : "Last Name:"}
                                            </label>
                                            <input
                                              type="text"
                                              value={currentLastName}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                setEditedFamilyMembers((prev) => ({
                                                  ...prev,
                                                  [m.id]: {
                                                    ...(prev[m.id] || {
                                                      firstName: currentFirstName,
                                                      relationship: currentRelKey,
                                                      phone: currentPhone,
                                                    }),
                                                    lastName: val,
                                                  },
                                                }));
                                              }}
                                              className="w-full px-2.5 py-1 text-xs bg-white rounded-lg border border-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                            />
                                          </div>
                                        </div>

                                        <div>
                                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                            {isAr ? "رقم الهاتف المحمول:" : "Mobile Phone:"}
                                          </label>
                                          <input
                                            type="tel"
                                            value={currentPhone}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              setEditedFamilyMembers((prev) => ({
                                                ...prev,
                                                [m.id]: {
                                                  ...(prev[m.id] || {
                                                    firstName: currentFirstName,
                                                    lastName: currentLastName,
                                                    relationship: currentRelKey,
                                                  }),
                                                  phone: val,
                                                },
                                              }));
                                            }}
                                            placeholder="012xxxxxxxx"
                                            className="w-full px-2.5 py-1 text-xs bg-white rounded-lg border border-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                          />
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-end gap-2 pt-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            // Revert edits
                                            setEditedFamilyMembers((prev) => {
                                              const copy = { ...prev };
                                              delete copy[m.id];
                                              return copy;
                                            });
                                            setEditingFamilyMemberId(null);
                                          }}
                                          className="px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                                        >
                                          {isAr ? "إلغاء" : "Cancel"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingFamilyMemberId(null)}
                                          className="px-2.5 py-1 text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-2xs"
                                        >
                                          {isAr ? "تم التعديل ✓" : "Done Editing ✓"}
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Toggle button to switch/change family */}
                      <div className="pt-1 text-center">
                        <button
                          type="button"
                          onClick={() => setShowFamilySwitch((prev) => !prev)}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                        >
                          {showFamilySwitch
                            ? (isAr ? "✕ إخفاء خيارات تغيير الأسرة" : "✕ Hide family switch options")
                            : (isAr ? "الانتقال لأسرة أخرى أو إنشاء أسرة جديدة ▾" : "Switch or create a different family ▾")}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Family Mode Selector (if not in family or clicked switch) */}
                  {(!currentFamily || showFamilySwitch) && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">
                        {isAr ? "ربط الأسرة الكنسية" : "Church Family Linkage"}
                      </label>

                      <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setFamilyMode("existing")}
                          className={`p-3 rounded-2xl border text-center transition-all ${
                            familyMode === "existing"
                              ? "bg-rose-50 border-rose-300 text-rose-700 ring-1 ring-rose-200"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {isAr ? "عائلتي مسجلة بالكنيسة" : "Join Existing Family"}
                        </button>

                        <button
                          type="button"
                          onClick={() => setFamilyMode("new")}
                          className={`p-3 rounded-2xl border text-center transition-all ${
                            familyMode === "new"
                              ? "bg-rose-50 border-rose-300 text-rose-700 ring-1 ring-rose-200"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {isAr ? "تسجيل أسرة جديدة" : "Create New Family"}
                        </button>
                      </div>
                    </div>
                  )}

                  {(!currentFamily || showFamilySwitch) && familyMode === "existing" && (
                    <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs animate-in fade-in duration-200">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          {isAr ? "اختر اسم الأسرة المسجلة" : "Select Registered Family"}
                        </label>
                        <select
                          value={selectedFamilyId}
                          onChange={(e) => setSelectedFamilyId(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white outline-none"
                        >
                          {familiesList.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          {isAr ? "صلة قرابتك برئيس الأسرة" : "Your Relationship"}
                        </label>
                        <select
                          value={relationshipType}
                          onChange={(e) => setRelationshipType(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white outline-none"
                        >
                          <option value="spouse">{isAr ? "زوج / زوجة" : "Spouse"}</option>
                          <option value="child">{isAr ? "ابن / ابنة" : "Child"}</option>
                          <option value="father">{isAr ? "الوالد" : "Father"}</option>
                          <option value="mother">{isAr ? "الوالدة" : "Mother"}</option>
                          <option value="sibling">{isAr ? "أخ / أخت" : "Sibling"}</option>
                          <option value="guardian">{isAr ? "وصي / كفيل" : "Guardian"}</option>
                          <option value="other">{isAr ? "صلة أخرى" : "Other"}</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {(!currentFamily || showFamilySwitch) && familyMode === "new" && (
                    <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs animate-in fade-in duration-200">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          {isAr ? "اسم الأسرة الجديدة" : "New Family Name"}
                        </label>
                        <input
                          type="text"
                          placeholder={isAr ? "مثال: أسرة حبيب" : "e.g. Habib Family"}
                          value={newFamilyName}
                          onChange={(e) => setNewFamilyName(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white outline-none"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">
                          {isAr
                            ? "سيتم تسجيلك كرئيس للأسرة، ويمكنك ضم بقية أفراد عائلتك إليها مباشرة."
                            : "You will be set as the Family Head, and can link family members below."}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ─── أفراد العائلة الإضافيون (الأبناء، الزوج/الزوجة، الوالدان) ─── */}
                  <div className="pt-2 border-t border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <IconUsers className="w-4 h-4 text-rose-600" />
                          <span>{isAr ? "إضافة أفراد الأسرة" : "Add Family Members"}</span>
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {isAr
                            ? "أضف أبناءك، زوجتك/زوجك، أو والديك ليتم ربطهم فوراً بك وبسجلات الكنيسة."
                            : "Add your children, spouse, or parents to link them live to your church profile."}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setFamilyMembersToAdd((prev) => [
                            ...prev,
                            {
                              id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                              firstName: "",
                              lastName: lastName || "",
                              relationship: "son",
                              phone: "",
                            },
                          ]);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 shrink-0"
                      >
                        <span>+</span>
                        <span>{isAr ? "إضافة فرد" : "Add Member"}</span>
                      </button>
                    </div>

                    {familyMembersToAdd.length === 0 ? (
                      <div className="p-3 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-[11px] text-slate-400">
                        {currentFamily
                          ? (isAr
                              ? "اضغط على \"إضافة فرد\" لإضافة ابنك، ابنتك، أو زوجتك وربطهم بأسرتك الحالية."
                              : "Click \"Add Member\" to add your child, spouse, or relative to this family.")
                          : (isAr
                              ? "لم تتم إضافة أفراد بعد. اضغط على \"إضافة فرد\" لإضافة ابنك، ابنتك، أو زوجتك."
                              : "No family members added yet. Click \"Add Member\" to add child, spouse, etc.")}
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {familyMembersToAdd.map((m, index) => (
                          <div
                            key={m.id}
                            className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2 relative"
                          >
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 border-b border-slate-100 pb-1.5">
                              <span className="flex items-center gap-1 text-slate-700">
                                <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 text-[10px] flex items-center justify-center font-bold">
                                  {index + 1}
                                </span>
                                <span>{isAr ? `فرد الأسرة #${index + 1}` : `Family Member #${index + 1}`}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setFamilyMembersToAdd((prev) => prev.filter((item) => item.id !== m.id));
                                }}
                                className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                                title={isAr ? "حذف" : "Remove"}
                              >
                                <IconX className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                  {isAr ? "الاسم الأول *" : "First Name *"}
                                </label>
                                <input
                                  type="text"
                                  placeholder={isAr ? "مثال: مارك" : "e.g. Mark"}
                                  value={m.firstName}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setFamilyMembersToAdd((prev) =>
                                      prev.map((item) => (item.id === m.id ? { ...item, firstName: val } : item))
                                    );
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-rose-400"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                  {isAr ? "اسم العائلة *" : "Last Name *"}
                                </label>
                                <input
                                  type="text"
                                  placeholder={isAr ? "اسم العائلة" : "Last Name"}
                                  value={m.lastName}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setFamilyMembersToAdd((prev) =>
                                      prev.map((item) => (item.id === m.id ? { ...item, lastName: val } : item))
                                    );
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-rose-400"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                  {isAr ? "صلة القرابة *" : "Relationship *"}
                                </label>
                                <select
                                  value={m.relationship}
                                  onChange={(e) => {
                                    const val = e.target.value as any;
                                    setFamilyMembersToAdd((prev) =>
                                      prev.map((item) => (item.id === m.id ? { ...item, relationship: val } : item))
                                    );
                                  }}
                                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-rose-400"
                                >
                                  <option value="son">{isAr ? "ابن (Son)" : "Son"}</option>
                                  <option value="daughter">{isAr ? "ابنة (Daughter)" : "Daughter"}</option>
                                  <option value="wife">{isAr ? "زوجة (Wife)" : "Wife"}</option>
                                  <option value="husband">{isAr ? "زوج (Husband)" : "Husband"}</option>
                                  <option value="father">{isAr ? "الوالد (Father)" : "Father"}</option>
                                  <option value="mother">{isAr ? "الوالدة (Mother)" : "Mother"}</option>
                                  <option value="brother">{isAr ? "أخ (Brother)" : "Brother"}</option>
                                  <option value="sister">{isAr ? "أخت (Sister)" : "Sister"}</option>
                                  <option value="guardian">{isAr ? "وصي (Guardian)" : "Guardian"}</option>
                                  <option value="other">{isAr ? "صلة أخرى (Other)" : "Other"}</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                  {isAr ? "رقم الهاتف (اختياري)" : "Phone (Optional)"}
                                </label>
                                <input
                                  type="tel"
                                  placeholder={isAr ? "01xxxxxxxxx" : "Phone number"}
                                  value={m.phone}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setFamilyMembersToAdd((prev) =>
                                      prev.map((item) => (item.id === m.id ? { ...item, phone: val } : item))
                                    );
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-rose-400"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!isSuccess && (
          <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors"
            >
              {isOnboarding
                ? (isAr ? "سأقوم بذلك لاحقاً" : "Do this later")
                : (isAr ? "إلغاء" : "Cancel")}
            </button>

            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#132F4C] to-[#132F4C] hover:from-[#132F4C] hover:to-[#0F2438] text-white font-extrabold text-xs shadow-md shadow-[#EBDDB9] flex items-center gap-2 transition-all active:scale-98 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <IconSend className="w-3.5 h-3.5 rtl:rotate-180" />
              )}
              <span>
                {isOnboarding
                  ? (isAr ? "حفظ واستكمال الملف" : "Save & Complete Profile")
                  : (isAr ? "حفظ التغييرات الآن" : "Save Changes")}
              </span>
            </button>
          </div>
        )}

        {/* Avatar Cropper Modal */}
        <AvatarCropperModal
          isOpen={isCropperOpen}
          onClose={() => setIsCropperOpen(false)}
          imageSrc={rawImageToCrop || ""}
          onCropComplete={(croppedDataUrl) => {
            setAvatarUrl(croppedDataUrl);
          }}
        />
      </div>
    </div>
  );
}
