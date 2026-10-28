"use client";

import * as React from "react";
import { CHURCH_ROLES, CHURCH_ROLE_META, normalizeChurchRole, type ChurchRole } from "@/lib/members/church-role";
import { RoleBadge } from "@/components/people/role-badge";
import { mockAvatar, mockPortrait } from "@/lib/avatars/mock-avatar";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMemberStats, isMemberCommitted, getMembersByService, serviceLabel, serviceBadgeClasses, type Member, type ServiceAssignment } from "@/lib/mock-data/people";
import { useLanguage, useTranslation, Ltr, tMinistry, tStatus } from "@/lib/i18n";
import { FamilyChip } from "@/components/family/family-chip";
import { useAttendanceRealtime } from "@/lib/realtime/use-attendance-realtime";
import { validateEmailAddress } from "@/lib/validation/email-validator";

function formatDbMemberToUi(m: any): Member {
  const joined = m.joinedAt || m.createdAt;
  const joinedFormatted = joined
    ? new Date(joined).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";

  return {
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    email: m.email,
    phone: m.phone || "—",
    status: (m.status as "active" | "inactive" | "visitor" | "deletion_requested") || "active",
    ministry: m.ministry || "—",
    group: m.group?.name || "—",
    lastAttendance: m.lastAttendance ? new Date(m.lastAttendance).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—",
    joinedDate: joinedFormatted,
    avatar: m.avatarUrl || mockAvatar(m.firstName + " " + m.lastName),
    attendanceRate: m.attendanceRate ?? (m.status === "active" ? 92 : 50),
    isCommitted: m.isCommitted ?? (m.status === "active"),
    committedReason: m.committedReason ?? (m.status === "active" ? "Committed Member" : undefined),
    serviceAssignment: (m.serviceAssignment as ServiceAssignment) || "friday",
    churchRole: normalizeChurchRole(m.userAccount?.role),
  };
}

const ministryFilterKeys = ["All", "Worship", "Youth", "Children", "Outreach", "Admin"];
const statusFilterKeys = ["All", "Committed", "Active", "Inactive", "Visitor", "Deletion Requested"];

// Generated from the Prisma schema -- see scripts/generate-member-migration-template.mjs
const TEMPLATE_URL = "/templates/church-members-migration-template.xlsx";
const TEMPLATE_CSV_URL = "/templates/church-members-migration-template.csv";

const getEncourageTemplates = (isAr: boolean) => isAr ? [
  { label: "متابعة واطمئنان", message: "سلام ومحبة {name}، اشتقنا لك كثيرًا في الكنيسة! نرجو أن تكون بكل خير وسلام. نذكرك دائمًا في صلواتنا ونسعد برؤيتك قريبًا جدًا!" },
  { label: "دعوة للاجتماع", message: "سلام ومحبة {name}، أسرة الكنيسة لا تكتمل بدونك! ننتظرك بكل محبة في اجتماع يوم الأحد القادم لنشارك معًا بركة الصلاة والشركة." },
  { label: "صلاة ومساندة", message: "أهلاً {name}، نحب أن نؤكد لك أننا نصلي من أجلك دائمًا. لست وحدك، فأسرة الكنيسة معك دائمًا بالصلاة والمحبة. ربنا يباركك ويحفظك!" },
  { label: "رعاية وافتقاد", message: "سلام لك {name}، لاحظنا غيابك مؤخرًا ونحب أن نطمئن عليك. إذا كان بإمكاننا المساعدة أو الصلاة معك لأجل أي أمر، لا تتردد أبدًا في التواصل معنا. وجودك غالي علينا جدًا!" },
  { label: "لقاء وفعالية كنسية", message: "أهلاً {name}! لدينا لقاء روحي وفعالية مميزة قادمة في الكنيسة ويسعدنا جدًا حضورك ومشاركتنا البركة!" },
] : [
  { label: "General Check-in", message: "Hi {name}, we've missed you at church! We hope you're doing well. Just wanted you to know you're in our thoughts and prayers. We'd love to see you again soon!" },
  { label: "Return Invitation", message: "Hi {name}, our church family isn't the same without you! We have some exciting things coming up and would love for you to be part of them. Hope to see you this Sunday!" },
  { label: "Prayer Support", message: "Hi {name}, we want you to know that we're praying for you. Whatever you're going through, you're not alone. Our church family is here for you. God bless!" },
  { label: "Care & Concern", message: "Hi {name}, we noticed you haven't been around lately and we just want to check in. If there's anything we can do to help or support you, please don't hesitate to reach out. You matter to us!" },
  { label: "Community Event", message: "Hi {name}! We have a special community event coming up and we'd love to see you there. It's a great opportunity to reconnect with the church family. Hope you can make it!" },
];

const detailIcons: Record<string, React.ReactNode> = {
  Email: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  Phone: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>,
  Ministry: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  Group: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  Attendance: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
  "Last Visit": <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Joined: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
};

export default function PeoplePage() {
  return (
    <Suspense fallback={<div className="space-y-5 min-h-screen p-6 -m-6 bg-gray-50/50"><div className="flex items-center justify-center h-64"><div className="text-gray-400">جاري التحميل...</div></div></div>}>
      <PeopleContent />
    </Suspense>
  );
}

function PeopleContent() {
  const { locale, isRtl } = useLanguage();
  const t = useTranslation();
  const isAr = locale === "ar";
  const encourageTemplates = React.useMemo(() => getEncourageTemplates(isAr), [isAr]);

  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("filter") === "visitors" ? "Visitor" : "All";

  const [memberList, setMemberList] = React.useState<Member[]>([]);
  // Mirror of memberList for reads inside loadMembers. Reading the list via a
  // setState updater and calling setIsLoading from inside it can leave the
  // spinner stuck on (the updater runs after the final setIsLoading(false)).
  const memberListRef = React.useRef<Member[]>([]);
  React.useEffect(() => {
    memberListRef.current = memberList;
  }, [memberList]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [paginationMeta, setPaginationMeta] = React.useState({
    total: 0,
    totalPages: 1,
    page: 1,
    limit: 100,
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const loadMembers = React.useCallback(
    async (
      params?: { search?: string; status?: string; ministry?: string; page?: number },
      retryCount = 0
    ) => {
      try {
        if (memberListRef.current.length === 0) {
          setIsLoading(true);
          setLoadError(null);
        }

        const targetPage = params?.page ?? currentPage;
        const url = new URL("/api/members", window.location.origin);
        url.searchParams.set("limit", "100");
        url.searchParams.set("page", String(targetPage));
        if (params?.search?.trim()) url.searchParams.set("search", params.search.trim());
        if (params?.status && params.status !== "All" && params.status !== "Committed") {
          const queryStatus =
            params.status === "Deletion Requested"
              ? "deletion_requested"
              : params.status.toLowerCase();
          url.searchParams.set("status", queryStatus);
        }
        if (params?.ministry && params.ministry !== "All") {
          url.searchParams.set("ministry", params.ministry);
        }

        const res = await fetch(url.toString());
        if (!res.ok) {
          if (res.status >= 500 && retryCount < 2) {
            // Transient 500 / 503 / cold start - wait briefly and auto-retry
            await new Promise((resolve) => setTimeout(resolve, 800 * (retryCount + 1)));
            return await loadMembers(params, retryCount + 1);
          }
          if (res.status === 401 || res.status === 403) {
            throw new Error(isAr ? "غير مصرح لك بعرض الأعضاء" : "Unauthorized to view members");
          }
          throw new Error(isAr ? "فشل تحميل قائمة الأعضاء" : "Failed to load members list");
        }
        const json = await res.json();
        const rawMembers: any[] = json.data ?? [];
        const mapped: Member[] = rawMembers.map(formatDbMemberToUi);
        setMemberList(mapped);
        if (json.pagination) {
          setPaginationMeta({
            total: json.pagination.total ?? mapped.length,
            totalPages: json.pagination.totalPages ?? Math.max(1, Math.ceil((json.pagination.total ?? mapped.length) / 100)),
            page: json.pagination.page ?? targetPage,
            limit: json.pagination.limit ?? 100,
          });
          setCurrentPage(json.pagination.page ?? targetPage);
        }
        setLoadError(null);
      } catch (err: any) {
        if (retryCount < 2) {
          await new Promise((resolve) => setTimeout(resolve, 800 * (retryCount + 1)));
          return await loadMembers(params, retryCount + 1);
        }
        console.error("Failed to fetch members:", err);
        if (memberListRef.current.length === 0) {
          setLoadError(
            err.message ||
              (isAr ? "حدث خطأ أثناء تحميل البيانات" : "An error occurred while loading data")
          );
        }
      } finally {
        setIsLoading(false);
      }
    },
    [currentPage, isAr]
  );

  const [search, setSearch] = React.useState("");
  const [serviceFilter, setServiceFilter] = React.useState<ServiceAssignment | "all">("all");
  const [ministryFilter, setMinistryFilter] = React.useState("All");
  const [statusFilter, setStatusFilter] = React.useState(initialStatus);
  const [roleFilter, setRoleFilter] = React.useState<ChurchRole | "all">("all");

  // Debounced server query on search or filter change
  React.useEffect(() => {
    setCurrentPage(1);
    const handler = setTimeout(() => {
      loadMembers({ search, status: statusFilter, ministry: ministryFilter, page: 1 });
    }, 250);
    return () => clearTimeout(handler);
  }, [search, statusFilter, ministryFilter]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > paginationMeta.totalPages || newPage === currentPage) return;
    setCurrentPage(newPage);
    void loadMembers({ search, status: statusFilter, ministry: ministryFilter, page: newPage });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const [selectedMember, setSelectedMember] = React.useState<Member | null>(null);
  const [viewMode, setViewMode] = React.useState<"list" | "grid">("list");
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  // "+ New → Add member" in the top bar links here as /people?new=1.
  React.useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") === "1") setIsAddModalOpen(true);
  }, []);
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState(0);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [drawerTab, setDrawerTab] = React.useState<"details" | "encourage">("details");
  const shareRef = React.useRef<HTMLDivElement>(null);
  const drawerScrollRef = React.useRef<HTMLDivElement>(null);
  const [shareAvatar, setShareAvatar] = React.useState<string | null>(null);

  // Slow smooth auto-slide down for the member view card drawer
  React.useEffect(() => {
    if (!selectedMember || drawerTab !== "details") return;

    let rafId: number | null = null;
    let isActive = false;

    const stop = () => {
      isActive = false;
      if (rafId) cancelAnimationFrame(rafId);
    };

    const timer = setTimeout(() => {
      const el = drawerScrollRef.current;
      if (!el || el.scrollHeight <= el.clientHeight) return;

      isActive = true;
      let lastTime = performance.now();
      let currentPos = el.scrollTop;
      const speed = 0.04;

      const step = (time: number) => {
        if (!isActive || !el) return;
        const delta = Math.min(time - lastTime, 40);
        lastTime = time;

        if (Math.abs(el.scrollTop - currentPos) > 15) {
          stop();
          return;
        }

        currentPos += speed * delta;
        const maxScroll = el.scrollHeight - el.clientHeight;
        if (currentPos >= maxScroll - 4) {
          el.scrollTop = maxScroll;
          stop();
          return;
        }
        el.scrollTop = currentPos;
        rafId = requestAnimationFrame(step);
      };

      rafId = requestAnimationFrame(step);
    }, 650);

    const el = drawerScrollRef.current;
    if (el) {
      el.addEventListener("wheel", stop, { passive: true });
      el.addEventListener("touchmove", stop, { passive: true });
      el.addEventListener("pointerdown", stop, { passive: true });
    }

    return () => {
      clearTimeout(timer);
      stop();
      if (el) {
        el.removeEventListener("wheel", stop);
        el.removeEventListener("touchmove", stop);
        el.removeEventListener("pointerdown", stop);
      }
    };
  }, [selectedMember, drawerTab]);

  const [newFirstName, setNewFirstName] = React.useState("");
  const [newLastName, setNewLastName] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [newPhone, setNewPhone] = React.useState("");
  const [newStatus, setNewStatus] = React.useState<"active" | "inactive" | "visitor">("active");
  const [newMinistry, setNewMinistry] = React.useState("Worship");
  const [newGroup, setNewGroup] = React.useState("Small Group A");

  const [editFirstName, setEditFirstName] = React.useState("");
  const [editLastName, setEditLastName] = React.useState("");
  const [editEmail, setEditEmail] = React.useState("");
  const [editPhone, setEditPhone] = React.useState("");
  const [editStatus, setEditStatus] = React.useState<"active" | "inactive" | "visitor" | "deletion_requested">("active");
  const [editMinistry, setEditMinistry] = React.useState("Worship");
  const [editGroup, setEditGroup] = React.useState("Small Group A");

  const [importRows, setImportRows] = React.useState<any[]>([]);
  const [importFileName, setImportFileName] = React.useState<string | null>(null);
  const [importDuplicateStrategy, setImportDuplicateStrategy] = React.useState<"skip" | "update">("skip");
  const [isExporting, setIsExporting] = React.useState(false);

  const stats = React.useMemo(() => getMemberStats(memberList), [memberList]);

  const showToast = (msg: string) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 4000); };

  // Live WebSocket & BroadcastChannel subscription for member updates
  useAttendanceRealtime({
    onMemberUpdated: (event) => {
      void loadMembers();
      const memberName = (event.data?.memberName as string) || (isAr ? "أحد الأعضاء" : "A member");
      showToast(
        isAr
          ? `🔄 تم تحديث بيانات "${memberName}" مباشرة عبر التطبيق!`
          : `🔄 "${memberName}" updated their profile live via mobile app!`
      );
    },
  });

  React.useEffect(() => {
    setShareAvatar(null);
  }, [selectedMember]);

  const filtered = React.useMemo(() => {
    const byService = getMembersByService(memberList, serviceFilter);
    return byService.filter(m => {
      const matchesSearch = search === "" || `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase());
      const matchesMinistry = ministryFilter === "All" || m.ministry === ministryFilter;
      let matchesStatus = true;
      if (statusFilter === "Committed") matchesStatus = isMemberCommitted(m);
      else if (statusFilter === "Deletion Requested") matchesStatus = m.status === "deletion_requested";
      else if (statusFilter !== "All") matchesStatus = m.status === statusFilter.toLowerCase();
      const matchesRole = roleFilter === "all" || (m.churchRole ?? "member") === roleFilter;
      return matchesSearch && matchesMinistry && matchesStatus && matchesRole;
    });
  }, [memberList, search, serviceFilter, ministryFilter, statusFilter, roleFilter]);

  const captureShareCard = async (): Promise<string> => {
    if (!shareRef.current || !selectedMember) throw new Error("no card");
    let avatarDataUrl = "";
    try {
      const photo = new Image();
      photo.crossOrigin = "anonymous";
      const sep = selectedMember.avatar.includes("?") ? "&" : "?";
      photo.src = `${selectedMember.avatar}${sep}cb=${Date.now()}`;
      await photo.decode();
      const c = document.createElement("canvas");
      c.width = photo.naturalWidth || 64;
      c.height = photo.naturalHeight || 64;
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.drawImage(photo, 0, 0, c.width, c.height);
        avatarDataUrl = c.toDataURL("image/png");
      }
    } catch {
      avatarDataUrl = "";
    }
    if (!avatarDataUrl) {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const initials = `${selectedMember.firstName} ${selectedMember.lastName}`
          .split(" ")
          .map(w => w.charAt(0))
          .slice(0, 2)
          .join("")
          .toUpperCase();
        const grad = ctx.createLinearGradient(0, 0, 64, 64);
        grad.addColorStop(0, "#2563eb");
        grad.addColorStop(1, "#7c3aed");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 28px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(initials || "? ", 32, 34);
        avatarDataUrl = canvas.toDataURL("image/png");
      }
    }
    setShareAvatar(avatarDataUrl);
    await new Promise(r => setTimeout(r, 120));
    return toPng(shareRef.current, { quality: 0.95, pixelRatio: 2, cacheBust: true });
  };

  const buildMemberSummary = (m: Member): string => {
    const ttl = isAr ? "تفاصيل العضو" : "Member Details";
    const sep = "━━━━━━━━━━━━━━━━";
    const lines = [
      `*${ttl}: ${m.firstName} ${m.lastName}*`,
      sep,
      `${isAr ? "الحالة" : "Status"}: ${tStatus(m.status, locale).toUpperCase()}`,
      `${isAr ? "البريد الإلكتروني" : "Email"}: ${m.email}`,
      `${isAr ? "الهاتف" : "Phone"}: ${m.phone}`,
      `${isAr ? "الخدمة" : "Ministry"}: ${tMinistry(m.ministry, locale)}`,
      `${isAr ? "المجموعة" : "Group"}: ${m.group}`,
      `${isAr ? "نسبة الحضور" : "Attendance"}: ${m.attendanceRate || 85}%`,
      `${isAr ? "آخر حضور" : "Last Visit"}: ${m.lastAttendance}`,
      `${isAr ? "تاريخ الانضمام" : "Joined"}: ${m.joinedDate}`,
    ];
    return lines.join("\n");
  };

  const handleShareImage = async () => {
    if (!selectedMember) return;
    try {
      const dataUrl = await captureShareCard();
      const link = document.createElement("a");
      link.download = `${selectedMember.firstName}-${selectedMember.lastName}-details.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShareAvatar(null);
      showToast(isAr ? "تم حفظ بطاقة بيانات العضو بنجاح!" : "Member details saved as image!");
    } catch (err) {
      console.error("Share image failed:", err);
      setShareAvatar(null);
      showToast(isAr ? "تعذر إنشاء الصورة، يرجى المحاولة لاحقًا." : "Failed to generate image.");
    }
  };

  const handleShareWhatsApp = async () => {
    if (!selectedMember) return;
    try {
      const dataUrl = await captureShareCard();
      const summary = buildMemberSummary(selectedMember);
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${selectedMember.firstName}-${selectedMember.lastName}-details.png`, { type: "image/png" });
      const shareData = { files: [file], text: summary, title: "Member Details" };
      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
        } catch (shareErr) {
          if (shareErr instanceof DOMException && shareErr.name === "AbortError") return;
          window.open(`https://wa.me/?text=${encodeURIComponent(summary)}`, "_blank");
        }
      } else {
        const note = isAr ? " ── يمكنك إرفاق صورة البطاقة التي نزلت مع الرسالة" : " ── you can attach the downloaded card image with this message";
        window.open(`https://wa.me/?text=${encodeURIComponent(summary + note)}`, "_blank");
      }
      setShareAvatar(null);
    } catch (err) {
      console.error("WhatsApp share failed:", err);
      setShareAvatar(null);
      showToast(isAr ? "تعذر مشاركة العضو عبر واتساب." : "Failed to share on WhatsApp.");
    }
  };

  const handleResolveDeletion = async (memberId: string, action: "delete_permanently" | "keep_for_followup") => {
    try {
      const res = await fetch(`/api/members/${encodeURIComponent(memberId)}/resolve-deletion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || "Failed to resolve deletion");
      }
      showToast(
        action === "delete_permanently"
          ? (isAr ? "تم حذف العضو نهائياً من النظام." : "Member permanently deleted.")
          : (isAr ? "تم الاحتفاظ بالعضو للمتابعة الرعوية والافتقاد." : "Member kept for pastoral care.")
      );
      setSelectedMember(null);
      void loadMembers({ search, status: statusFilter, ministry: ministryFilter });
    } catch (err: any) {
      showToast(err.message || (isAr ? "حدث خطأ أثناء معالجة الطلب" : "Failed to resolve deletion"));
    }
  };

  const openEditModal = (m: Member) => {
    setEditFirstName(m.firstName); setEditLastName(m.lastName); setEditEmail(m.email);
    setEditPhone(m.phone); setEditStatus(m.status); setEditMinistry(m.ministry); setEditGroup(m.group);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedMember) return;
    if (!editFirstName.trim() || !editLastName.trim() || !editEmail.trim() || !editPhone.trim()) {
      showToast(isAr ? "الاسم الأول واسم العائلة والبريد الإلكتروني ورقم الهاتف كلها حقول إلزامية" : "First name, last name, email, and mobile phone are mandatory");
      return;
    }
    const editEmailCheck = validateEmailAddress(editEmail.trim(), { allowTestDomains: true });
    if (!editEmailCheck.isValid) {
      showToast(isAr ? editEmailCheck.errorAr || editEmailCheck.error! : editEmailCheck.error!);
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/members/${selectedMember.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          email: editEmail.trim().toLowerCase(),
          phone: editPhone.trim(),
          status: editStatus,
          ministry: editMinistry !== "All" && editMinistry !== "—" ? editMinistry : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          showToast(isAr ? "ليس لديك صلاحية لتعديل بيانات الأعضاء" : "You do not have permission to update members");
          return;
        }
        if (res.status === 409) {
          showToast(json.error?.message || (isAr ? "هذا البريد الإلكتروني أو رقم الهاتف مسجل بالفعل لعضو آخر" : "A member with this email or mobile number already exists"));
          return;
        }
        showToast(json.error?.message || (isAr ? "فشل تعديل العضو" : "Failed to update member"));
        return;
      }

      const updatedUi = formatDbMemberToUi(json.data);
      setSelectedMember(updatedUi);
      await loadMembers();
      setIsEditModalOpen(false);
      showToast(isAr ? `تم تحديث بيانات ${editFirstName} ${editLastName} بنجاح!` : `${editFirstName} ${editLastName} updated successfully!`);
    } catch (err: any) {
      showToast(err?.message || (isAr ? "حدث خطأ أثناء تعديل العضو" : "Error updating member"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivateMember = async (memberId: string) => {
    if (!confirm(isAr ? "هل أنت متأكد من إلغاء تفعيل هذا العضو؟" : "Are you sure you want to deactivate this member?")) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/members/${memberId}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          showToast(isAr ? "ليس لديك صلاحية لإلغاء تفعيل الأعضاء. مطلوب صلاحيات مسؤول (Admin) أو راعي (Pastor)." : "Missing permission: You need Admin or Pastor permissions to deactivate members.");
          return;
        }
        showToast(json.error?.message || (isAr ? "فشل إلغاء تفعيل العضو" : "Failed to deactivate member"));
        return;
      }

      showToast(isAr ? "تم إلغاء تفعيل العضو بنجاح" : "Member deactivated successfully");
      setSelectedMember(null);
      setIsEditModalOpen(false);
      await loadMembers();
    } catch (err: any) {
      showToast(err?.message || (isAr ? "حدث خطأ أثناء إلغاء التفعيل" : "Error deactivating member"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paginationMeta.total >= 1000) {
      showToast(isAr ? "تم الوصول للحد الأقصى المسموح به للأعضاء (1,000 عضو)." : "Maximum capacity of 1,000 members reached for this church.");
      return;
    }
    if (!newFirstName.trim() || !newLastName.trim() || !newEmail.trim() || !newPhone.trim()) {
      showToast(isAr ? "الاسم الأول واسم العائلة والبريد الإلكتروني ورقم الهاتف كلها حقول إلزامية" : "First name, last name, email, and mobile phone are mandatory");
      return;
    }
    const newEmailCheck = validateEmailAddress(newEmail.trim(), { allowTestDomains: true });
    if (!newEmailCheck.isValid) {
      showToast(isAr ? newEmailCheck.errorAr || newEmailCheck.error! : newEmailCheck.error!);
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: newFirstName.trim(),
          lastName: newLastName.trim(),
          email: newEmail.trim().toLowerCase(),
          phone: newPhone.trim(),
          status: newStatus,
          ministry: newMinistry !== "All" && newMinistry !== "—" ? newMinistry : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          showToast(isAr ? "ليس لديك صلاحية لإضافة أعضاء. مطلوب صلاحيات مسؤول (Admin) أو راعي (Pastor)." : "Missing permission: You need Admin or Pastor permissions to add members.");
          return;
        }
        if (res.status === 409) {
          showToast(json.error?.message || (isAr ? "هذا البريد الإلكتروني أو رقم الهاتف مسجل بالفعل لعضو آخر" : "A member with this email or mobile number already exists"));
          return;
        }
        showToast(json.error?.message || (isAr ? "فشل إنشاء العضو" : "Failed to create member"));
        return;
      }

      await loadMembers();
      setIsAddModalOpen(false);
      setNewFirstName("");
      setNewLastName("");
      setNewEmail("");
      setNewPhone("");
      showToast(isAr ? `تمت إضافة العضو ${newFirstName} ${newLastName} بنجاح!` : `Added ${newFirstName} ${newLastName} successfully!`);
    } catch (err: any) {
      showToast(err?.message || (isAr ? "حدث خطأ أثناء إضافة العضو" : "Error adding member"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadTemplate = () => {
    // Served from public/templates. The workbook is generated from the Prisma
    // schema by scripts/generate-member-migration-template.mjs -- regenerate
    // that script rather than hand-editing a copy of the file.
    const link = document.createElement("a");
    link.href = TEMPLATE_URL;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isAr ? "تم تنزيل نموذج الاستيراد!" : "Template downloaded!");
  };

  const parseCsvLine = (text: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (inQuotes && text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === "," && !inQuotes) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawText = event.target?.result as string;
      if (!rawText) return;
      const cleanText = rawText.startsWith("\uFEFF") ? rawText.slice(1) : rawText;
      const lines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) return;

      const headerParts = parseCsvLine(lines[0]).map((h) => h.toLowerCase());

      const colIdx = {
        firstName: headerParts.findIndex((h) => h.includes("first") || h.includes("الاسم الأول")),
        lastName: headerParts.findIndex((h) => h.includes("last") || h.includes("اسم العائلة")),
        email: headerParts.findIndex((h) => h.includes("email") || h.includes("البريد")),
        phone: headerParts.findIndex((h) => h.includes("phone") || h.includes("الهاتف")),
        status: headerParts.findIndex((h) => h.includes("status") || h.includes("الحالة")),
        ministry: headerParts.findIndex((h) => h.includes("ministry") || h.includes("الخدمة")),
        group: headerParts.findIndex((h) => h.includes("group") || h.includes("المجموعة")),
        joinedAt: headerParts.findIndex((h) => h.includes("joined") || h.includes("انضمام")),
        avatarUrl: headerParts.findIndex((h) => h.includes("photo") || h.includes("avatar") || h.includes("صورة")),
      };

      const fnIdx = colIdx.firstName !== -1 ? colIdx.firstName : 0;
      const lnIdx = colIdx.lastName !== -1 ? colIdx.lastName : 1;
      const emIdx = colIdx.email !== -1 ? colIdx.email : 2;
      const phIdx = colIdx.phone !== -1 ? colIdx.phone : 3;
      const stIdx = colIdx.status !== -1 ? colIdx.status : 4;
      const miIdx = colIdx.ministry !== -1 ? colIdx.ministry : 5;
      const grIdx = colIdx.group !== -1 ? colIdx.group : 6;
      const joIdx = colIdx.joinedAt !== -1 ? colIdx.joinedAt : 7;
      const avIdx = colIdx.avatarUrl !== -1 ? colIdx.avatarUrl : 8;

      const parsed: Array<{
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        status: "active" | "inactive" | "visitor";
        ministry?: string;
        groupName?: string;
        joinedAt?: string;
        avatarUrl?: string;
      }> = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = parseCsvLine(lines[i]);
        const firstName = parts[fnIdx]?.trim();
        const lastName = parts[lnIdx]?.trim();
        const email = parts[emIdx]?.trim().toLowerCase();

        if (firstName && lastName && email && email.includes("@")) {
          const statusRaw = parts[stIdx]?.toLowerCase().trim();
          const validStatus = statusRaw === "visitor" || statusRaw === "inactive" ? statusRaw : "active";
          const phone = parts[phIdx]?.trim();
          const ministry = parts[miIdx]?.trim();
          const groupName = parts[grIdx]?.trim();
          const joinedAt = parts[joIdx]?.trim();
          const avatarUrl = parts[avIdx]?.trim();

          parsed.push({
            firstName,
            lastName,
            email,
            phone: phone && phone !== "(555) 000-0000" && phone !== "—" ? phone : undefined,
            status: validStatus,
            ministry: ministry && ministry !== "All" && ministry !== "—" ? ministry : undefined,
            groupName: groupName && groupName !== "—" ? groupName : undefined,
            joinedAt: joinedAt || undefined,
            avatarUrl: avatarUrl?.startsWith("http") ? avatarUrl : undefined,
          });
        }
      }
      setImportRows(parsed);
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (importRows.length === 0) return;
    if (paginationMeta.total + importRows.length > 1000) {
      showToast(
        isAr
          ? `لا يمكن الاستيراد: إجمالي الأعضاء الحالي (${paginationMeta.total}) مع الملف المراد رفعه (${importRows.length}) سيتجاوز الحد الأقصى (1,000 عضو).`
          : `Cannot import: Current members (${paginationMeta.total}) plus file (${importRows.length}) exceeds the 1,000 member cap.`
      );
      return;
    }
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/members/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          members: importRows.map((r) => ({
            firstName: r.firstName.trim(),
            lastName: r.lastName.trim(),
            email: r.email.trim().toLowerCase(),
            phone: r.phone ? r.phone.trim() : undefined,
            avatarUrl: r.avatarUrl ? r.avatarUrl.trim() : undefined,
            status: r.status || "active",
            ministry: r.ministry && r.ministry !== "All" && r.ministry !== "—" ? r.ministry : undefined,
            groupName: r.groupName || undefined,
            joinedAt: r.joinedAt || undefined,
          })),
          onDuplicate: importDuplicateStrategy,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        showToast(json.error?.message || (isAr ? "فشل استيراد الأعضاء" : "Failed to import members"));
        return;
      }

      setIsImportModalOpen(false);
      setImportRows([]);
      setImportFileName(null);
      await loadMembers({ search, status: statusFilter, ministry: ministryFilter });

      const d = json.data;
      let msg = isAr
        ? `تم استيراد ${d.imported} عضوًا بنجاح!`
        : `Successfully imported ${d.imported} member(s)!`;
      if (d.updated > 0) {
        msg += isAr ? ` (${d.updated} تم تحديثهم)` : ` (${d.updated} updated)`;
      }
      if (d.skipped > 0) {
        msg += isAr ? ` (${d.skipped} تم تجاوزهم)` : ` (${d.skipped} skipped)`;
      }
      if (d.errors > 0) {
        msg += isAr ? ` (${d.errors} تعذر استيرادهم)` : ` (${d.errors} failed)`;
      }
      showToast(msg);
    } catch (err: any) {
      showToast(err?.message || (isAr ? "حدث خطأ أثناء استيراد الأعضاء" : "Error importing members"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportMembers = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "All" && statusFilter !== "Committed") {
        params.set("status", statusFilter.toLowerCase());
      }
      if (ministryFilter && ministryFilter !== "All") {
        params.set("ministry", ministryFilter);
      }
      if (search.trim()) {
        params.set("search", search.trim());
      }

      const queryString = params.toString();
      const url = `/api/members/export${queryString ? `?${queryString}` : ""}`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(isAr ? "فشل تصدير بيانات الأعضاء" : "Failed to export members");
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `church-members-export-${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      showToast(isAr ? "تم تصدير بيانات الأعضاء بنجاح!" : "Members exported successfully!");
    } catch (err: any) {
      showToast(err?.message || (isAr ? "حدث خطأ أثناء تصدير البيانات" : "Error exporting members"));
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendEncouragement = () => {
    if (!selectedMember) return;
    const msg = encourageTemplates[selectedTemplate].message.replace("{name}", selectedMember.firstName);
    showToast(isAr ? `تم إرسال الرسالة إلى ${selectedMember.firstName}: "${msg.substring(0, 40)}..."` : `Message sent to ${selectedMember.firstName}: "${msg.substring(0, 50)}..."`);
    setDrawerTab("details");
  };

  return (
    <div className="space-y-5 min-h-screen p-6 -m-6 bg-gray-50/50">
      {toastMessage && (
        <div className="fixed top-4 end-4 z-[60] p-3 bg-gray-900 text-white rounded-lg text-sm font-medium shadow-lg animate-fade-in max-w-sm">
          <div className="flex items-center justify-between gap-3">
            <span>{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-white shrink-0">✕</button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">{t.people.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t.people.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleExportMembers}
            disabled={isExporting}
            className="flex items-center gap-1.5 cursor-pointer bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-sm"
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            {isAr ? "تصدير CSV" : "Export CSV"}
          </Button>
          <Button variant="secondary" onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-1.5 cursor-pointer bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            {isAr ? "استيراد CSV" : "Import CSV"}
          </Button>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            disabled={paginationMeta.total >= 1000}
            className="flex items-center gap-1.5 cursor-pointer bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {t.people.addMember}
          </Button>
        </div>
      </div>

      {paginationMeta.total >= 1000 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-semibold flex items-center justify-between">
          <span>{isAr ? "⚠️ لقد تم الوصول إلى الحد الأقصى لعدد الأعضاء (1,000 عضو). لا يمكن إضافة أعضاء جدد حالياً." : "⚠️ The maximum church capacity of 1,000 members has been reached. Adding new members is paused."}</span>
          <span className="font-bold">{paginationMeta.total} / 1,000</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { key: "All", label: isAr ? "إجمالي الأعضاء" : "Total", value: paginationMeta.total || stats.total, numColor: "text-blue-600", bg: "bg-blue-50/60", border: "border-blue-200", iconBg: "bg-blue-100", icon: <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
          { key: "Committed", label: isAr ? "الأعضاء الملتزمون ⭐" : "Committed", value: stats.committed, numColor: "text-amber-600", bg: "bg-amber-50/60", border: "border-amber-200", iconBg: "bg-amber-100", badge: "90%+", icon: <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg> },
          { key: "Active", label: isAr ? "الأعضاء النشطون" : "Active", value: stats.active, numColor: "text-emerald-600", bg: "bg-emerald-50/60", border: "border-emerald-200", iconBg: "bg-emerald-100", icon: <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
          { key: "Visitor", label: isAr ? "الزوار الجدد" : "Visitors", value: stats.visitors, numColor: "text-purple-600", bg: "bg-purple-50/60", border: "border-purple-200", iconBg: "bg-purple-100", icon: <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg> },
          { key: "Inactive", label: isAr ? "غير النشطين" : "Inactive", value: stats.inactive, numColor: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200", iconBg: "bg-gray-100", icon: <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg> },
        ].map((card) => {
          const isActive = statusFilter === card.key || (card.key === "All" && statusFilter === "All");
          return (
            <button key={card.key} onClick={() => setStatusFilter(card.key === "All" ? "All" : card.key)} className={`text-start p-4 rounded-xl border transition-all cursor-pointer ${isActive ? `${card.bg} ${card.border} shadow-sm` : "bg-white border-gray-200 hover:border-gray-300"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${card.iconBg} flex items-center justify-center shrink-0`}>{card.icon}</div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">{card.label}</p>
                    {card.badge && <span className="text-[9px] px-1 py-0.5 bg-amber-100 text-amber-700 font-semibold rounded">{card.badge}</span>}
                  </div>
                  <p className={`text-2xl font-bold ${card.numColor} leading-none mt-0.5`}><Ltr>{card.value}</Ltr></p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="w-full md:w-72 relative">
          <svg className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <Input placeholder={t.people.searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-10 text-sm border-gray-200 bg-gray-50/50" />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto">
          {statusFilterKeys.map((tab) => {
            const isSelected = statusFilter === tab;
            const isCommittedTab = tab === "Committed";
            const isDeletionTab = tab === "Deletion Requested";
            const pendingDeletionsCount = memberList.filter((m) => m.status === "deletion_requested").length;
            const tabLabel = isAr ? (
              tab === "All" ? "الكل" :
              tab === "Committed" ? "الملتزمون 90%+" :
              tab === "Active" ? "نشط" :
              tab === "Inactive" ? "غير نشط" :
              tab === "Visitor" ? "زائر" :
              "⚠️ طلب حذف"
            ) : (
              tab === "All" ? "All" :
              tab === "Committed" ? "Committed 90%+" :
              tab === "Deletion Requested" ? "⚠️ Deletion Requested" :
              tab
            );
            return (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5 ${
                  isSelected
                    ? isDeletionTab
                      ? "bg-rose-100 text-rose-800 border-rose-400 font-bold shadow-sm"
                      : isCommittedTab
                      ? "bg-amber-50 text-amber-700 border-amber-300 shadow-sm"
                      : "bg-blue-50 text-blue-700 border-blue-300 shadow-sm"
                    : isDeletionTab
                    ? "text-rose-700 bg-rose-50/70 hover:bg-rose-100 border-rose-200"
                    : "text-gray-500 hover:text-gray-700 bg-white border-gray-200 hover:border-gray-300 shadow-xs"
                }`}
              >
                <span>{tabLabel}</span>
                {isDeletionTab && pendingDeletionsCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {pendingDeletionsCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Service Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0">
            {isAr ? "الاجتماع" : "Service"}
          </span>
          {(["all", "friday", "sunday", "both"] as const).map((key) => {
            const isActive = serviceFilter === key;
            const labels: Record<string, string> = {
              all: isAr ? "الكل" : "All",
              friday: isAr ? "الجمعة" : "Friday",
              sunday: isAr ? "الأحد" : "Sunday",
              both: isAr ? "كليهما" : "Both",
            };
            return (
              <button
                key={key}
                type="button"
                onClick={() => setServiceFilter(key)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                  isActive
                    ? key === "friday"
                      ? "bg-blue-50 text-blue-700 border-blue-300 shadow-sm"
                      : key === "sunday"
                      ? "bg-purple-50 text-purple-700 border-purple-300 shadow-sm"
                      : key === "both"
                      ? "bg-amber-50 text-amber-700 border-amber-300 shadow-sm"
                      : "bg-gray-100 text-gray-700 border-gray-300 shadow-sm"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                }`}
              >
                {labels[key]}
              </button>
            );
          })}
          {serviceFilter !== "all" && (
            <span className="text-[11px] text-gray-400">
              {isAr ? `${filtered.length} عضو` : `${filtered.length} members`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as ChurchRole | "all")} aria-label={isAr ? "الدور في الكنيسة" : "Church role"} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400">
            <option value="all">{isAr ? "كل الأدوار" : "All roles"}</option>
            {CHURCH_ROLES.map((r) => (
              <option key={r} value={r}>{CHURCH_ROLE_META[r].emoji} {isAr ? CHURCH_ROLE_META[r].ar : CHURCH_ROLE_META[r].en}</option>
            ))}
          </select>
          <select value={ministryFilter} onChange={(e) => setMinistryFilter(e.target.value)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400">
            {ministryFilterKeys.map(m => (
              <option key={m} value={m}>
                {m === "All" ? (isAr ? "كل الخدمات" : "All Ministries") : tMinistry(m, locale)}
              </option>
            ))}
          </select>
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === "list" ? "bg-white shadow-xs text-blue-600" : "text-gray-400 hover:text-gray-600"}`} aria-label="List view"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>
            <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === "grid" ? "bg-white shadow-xs text-blue-600" : "text-gray-400 hover:text-gray-600"}`} aria-label="Grid view"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg></button>
          </div>
        </div>
      </div>

      {statusFilter === "Committed" && (
        <div className="px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
          <span className="text-xs font-medium text-amber-800">
            {isAr ? `عرض ${filtered.length} من الأعضاء الملتزمين ركائز الكنيسة (نسبة الحضور ≥ 90%)` : `Showing ${filtered.length} Committed Pillar Members (Attendance ≥ 90%)`}
          </span>
          <button onClick={() => setStatusFilter("All")} className="text-xs font-medium text-amber-700 hover:text-amber-900 cursor-pointer">{isAr ? "إلغاء التصفية" : "Clear"}</button>
        </div>
      )}

      {/* LOADING STATE */}
      {isLoading && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3" />
          <p className="text-sm text-gray-500">{isAr ? "جاري تحميل بيانات الأعضاء من قاعدة البيانات..." : "Loading members from database..."}</p>
        </div>
      )}

      {/* ERROR STATE */}
      {!isLoading && loadError && (
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center shadow-sm">
          <div className="text-red-500 mb-2">
            <svg className="w-8 h-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-900 mb-1">{loadError}</p>
          <Button variant="secondary" className="mt-3 text-xs" onClick={() => loadMembers()}>
            {isAr ? "إعادة المحاولة" : "Retry"}
          </Button>
        </div>
      )}

      {/* EMPTY STATE */}
      {!isLoading && !loadError && filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <p className="text-sm text-gray-500 mb-2">{isAr ? "لم يتم العثور على أعضاء تطابق معايير البحث" : "No members found matching the criteria"}</p>
          {(search || statusFilter !== "All" || ministryFilter !== "All" || serviceFilter !== "all" || roleFilter !== "all") && (
            <Button variant="secondary" className="text-xs" onClick={() => { setSearch(""); setStatusFilter("All"); setMinistryFilter("All"); setServiceFilter("all"); setRoleFilter("all"); }}>
              {isAr ? "مسح التصفية" : "Clear Filters"}
            </Button>
          )}
        </div>
      )}

      {/* LIST VIEW */}
      {!isLoading && !loadError && filtered.length > 0 && viewMode === "list" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  {[
                    t.people.tableHeaderMember,
                    t.people.tableHeaderStatus,
                    t.people.tableHeaderAttendanceRate,
                    t.people.tableHeaderMinistry,
                    t.people.tableHeaderGroup,
                    t.people.tableHeaderLastVisit,
                    t.people.tableHeaderActions
                  ].map((h, i) => (
                    <th key={i} className={`text-start text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-5 py-3 ${i < 6 ? "border-e border-gray-100" : ""} ${i === 6 ? "text-end" : ""} ${[2, 3, 4, 5].includes(i) ? `hidden ${i === 2 ? "md" : [3, 4].includes(i) ? "lg" : "xl"}:table-cell` : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((member) => {
                  const isNeg = member.status === "inactive" || member.status === "visitor";
                  const committed = isMemberCommitted(member);
                  return (
                    <tr key={member.id} className={`transition-colors cursor-pointer ${committed ? "hover:bg-amber-50/30" : isNeg ? "bg-red-50/20 hover:bg-red-50/30" : "hover:bg-gray-50/80"}`} onClick={() => { setSelectedMember(member); setDrawerTab("details"); }}>
                      <td className="px-5 py-3.5 border-e border-gray-100">
                        <div className="flex items-center gap-3">
                          <img src={member.avatar} alt="" className={`w-9 h-9 rounded-full object-cover ring-1 ${committed ? "ring-amber-300" : isNeg ? "ring-red-200 opacity-80" : "ring-gray-200"}`} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-sm font-semibold ${isNeg ? "text-red-700" : "text-gray-900"}`}>{member.firstName} {member.lastName}</span>
                              {committed && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"><svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>{isAr ? "ملتزم" : "Gold"}</span>}
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${serviceBadgeClasses(member.serviceAssignment)}`}>{serviceLabel(member.serviceAssignment, true)}</span>
                              <RoleBadge role={member.churchRole} isAr={isAr} />
                              <FamilyChip memberId={member.id} isAr={isAr} />
                            </div>
                            <p className="text-xs text-gray-400 truncate"><Ltr>{member.email}</Ltr></p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 border-e border-gray-100">
                        {member.status === "deletion_requested" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-300 animate-pulse">
                            <span>⚠️</span>
                            <span>{isAr ? "طلب حذف" : "Deletion Requested"}</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${isNeg ? "bg-red-400" : member.status === "active" ? "bg-green-500" : "bg-gray-400"}`} />
                            <span className={`text-xs font-medium ${isNeg ? "text-red-600" : "text-gray-700"}`}>{tStatus(member.status, locale)}</span>
                            {committed && <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100"><Ltr>{member.attendanceRate}%</Ltr></span>}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 border-e border-gray-100 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-14 bg-gray-100 rounded-full h-1 overflow-hidden"><div className={`h-full rounded-full ${committed ? "bg-amber-500" : isNeg ? "bg-red-300" : "bg-blue-500"}`} style={{ width: `${member.attendanceRate || 80}%` }} /></div>
                          <span className="text-xs font-medium text-gray-600 tabular-nums"><Ltr>{member.attendanceRate || 80}%</Ltr></span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-600 border-e border-gray-100 hidden lg:table-cell">{tMinistry(member.ministry, locale)}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-600 border-e border-gray-100 hidden lg:table-cell">{member.group}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-500 border-e border-gray-100 hidden xl:table-cell"><Ltr>{member.lastAttendance}</Ltr></td>
                      <td className="px-5 py-3.5 text-end">
                        <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer px-2.5 py-1 bg-blue-50 rounded-md hover:bg-blue-100" onClick={(e) => { e.stopPropagation(); setSelectedMember(member); setDrawerTab("details"); }}>{t.people.viewAction}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 bg-gray-50/40">
            <div className="flex items-center gap-2.5">
              <span>
                {isAr
                  ? `عرض ${(currentPage - 1) * 100 + (filtered.length > 0 ? 1 : 0)}–${(currentPage - 1) * 100 + filtered.length} من أصل ${paginationMeta.total || memberList.length} عضوًا`
                  : `Showing ${(currentPage - 1) * 100 + (filtered.length > 0 ? 1 : 0)}–${(currentPage - 1) * 100 + filtered.length} of ${paginationMeta.total || memberList.length} members`}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {isAr ? `${paginationMeta.total || memberList.length} / 1,000 عضو (الحد الأقصى)` : `${paginationMeta.total || memberList.length} / 1,000 (Max Capacity)`}
              </span>
            </div>

            {paginationMeta.totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1 || isLoading}
                  className="px-2.5 py-1 rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-1 cursor-pointer"
                >
                  <span>{isAr ? "السابق" : "Previous"}</span>
                </button>
                {Array.from({ length: paginationMeta.totalPages }, (_, i) => i + 1).map((pNum) => (
                  <button
                    key={pNum}
                    type="button"
                    onClick={() => handlePageChange(pNum)}
                    disabled={isLoading}
                    className={`w-7 h-7 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                      pNum === currentPage
                        ? "bg-blue-600 text-white shadow-xs"
                        : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {pNum}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= paginationMeta.totalPages || isLoading}
                  className="px-2.5 py-1 rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-1 cursor-pointer"
                >
                  <span>{isAr ? "التالي" : "Next"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GRID VIEW */}
      {!isLoading && !loadError && filtered.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((member) => {
            const isNeg = member.status === "inactive" || member.status === "visitor";
            const committed = isMemberCommitted(member);
            return (
              <div key={member.id} className={`bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md transition-all ${committed ? "border-amber-200" : isNeg ? "border-red-200 bg-red-50/20" : "border-gray-200"}`} onClick={() => { setSelectedMember(member); setDrawerTab("details"); }}>
                <div className="flex items-center gap-3 mb-3">
                  <img src={member.avatar} alt="" className={`w-11 h-11 rounded-full object-cover ring-1 ${committed ? "ring-amber-300" : isNeg ? "ring-red-200" : "ring-gray-200"}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold truncate ${isNeg ? "text-red-700" : "text-gray-900"}`}>{member.firstName} {member.lastName}</p>
                    <p className="text-xs text-gray-400 truncate"><Ltr>{member.email}</Ltr></p>
                    <FamilyChip memberId={member.id} isAr={isAr} size="md" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  {member.status === "deletion_requested" ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-300 animate-pulse">
                      <span>⚠️</span>
                      <span>{isAr ? "طلب حذف" : "Deletion Requested"}</span>
                    </span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${isNeg ? "bg-red-400" : member.status === "active" ? "bg-green-500" : "bg-gray-400"}`} />
                      <span className="text-xs font-medium text-gray-600">{tStatus(member.status, locale)}</span>
                    </div>
                  )}
                  {committed && <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">{isAr ? "ملتزم" : "Gold"} <Ltr>{member.attendanceRate}%</Ltr></span>}
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 bg-gray-100 rounded-full h-1 overflow-hidden"><div className={`h-full rounded-full ${committed ? "bg-amber-500" : "bg-blue-500"}`} style={{ width: `${member.attendanceRate || 80}%` }} /></div>
                  <span className="text-[11px] font-medium text-gray-500 tabular-nums"><Ltr>{member.attendanceRate || 80}%</Ltr></span>
                </div>
                <div className="text-xs text-gray-500 space-y-1 mb-3">
                  <div className="flex justify-between"><span>{t.people.tableHeaderMinistry}</span><span className="font-medium text-gray-700">{tMinistry(member.ministry, locale)}</span></div>
                  <div className="flex justify-between"><span>{t.people.tableHeaderGroup}</span><span className="font-medium text-gray-700">{member.group}</span></div>
                  <div className="flex justify-between"><span>{t.people.tableHeaderLastVisit}</span><span className="font-medium text-gray-700"><Ltr>{member.lastAttendance}</Ltr></span></div>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 text-center py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors" onClick={(e) => { e.stopPropagation(); setSelectedMember(member); setDrawerTab("details"); }}>{t.people.viewAction}</button>
                  {isNeg && <button className="px-2 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200" onClick={(e) => { e.stopPropagation(); setSelectedMember(member); setDrawerTab("encourage"); }} title={isAr ? "إرسال تشجيع وافتقاد" : "Send encouragement"}>♥</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Grid View Pagination Bar */}
      {!isLoading && !loadError && filtered.length > 0 && viewMode === "grid" && (
        <div className="px-5 py-3 border border-gray-200 rounded-xl bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span>
              {isAr
                ? `عرض ${(currentPage - 1) * 100 + (filtered.length > 0 ? 1 : 0)}–${(currentPage - 1) * 100 + filtered.length} من أصل ${paginationMeta.total || memberList.length} عضوًا`
                : `Showing ${(currentPage - 1) * 100 + (filtered.length > 0 ? 1 : 0)}–${(currentPage - 1) * 100 + filtered.length} of ${paginationMeta.total || memberList.length} members`}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {isAr ? `${paginationMeta.total || memberList.length} / 1,000 عضو (الحد الأقصى)` : `${paginationMeta.total || memberList.length} / 1,000 (Max Capacity)`}
            </span>
          </div>

          {paginationMeta.totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isLoading}
                className="px-2.5 py-1 rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-1 cursor-pointer"
              >
                <span>{isAr ? "السابق" : "Previous"}</span>
              </button>
              {Array.from({ length: paginationMeta.totalPages }, (_, i) => i + 1).map((pNum) => (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => handlePageChange(pNum)}
                  disabled={isLoading}
                  className={`w-7 h-7 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                    pNum === currentPage
                      ? "bg-blue-600 text-white shadow-xs"
                      : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {pNum}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= paginationMeta.totalPages || isLoading}
                className="px-2.5 py-1 rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-1 cursor-pointer"
              >
                <span>{isAr ? "التالي" : "Next"}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* MEMBER DETAIL DRAWER */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedMember(null)} />
          <div ref={drawerScrollRef} className="relative w-full max-w-md bg-white shadow-xl overflow-y-auto animate-slide-in border-s border-gray-200">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between z-10">
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                <button onClick={() => setDrawerTab("details")} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${drawerTab === "details" ? "bg-white shadow-xs text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>{isAr ? "التفاصيل" : "Details"}</button>
                {(selectedMember.status === "inactive" || selectedMember.status === "visitor") && <button onClick={() => setDrawerTab("encourage")} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${drawerTab === "encourage" ? "bg-white shadow-xs text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>{isAr ? "تشجيع وافتقاد" : "Encourage"}</button>}
              </div>
              <button onClick={() => setSelectedMember(null)} className="p-1 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600 cursor-pointer"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            {/* DETAILS TAB */}
            {drawerTab === "details" && (
              <div className="p-6 space-y-5">
                {/* Shareable card */}
                <div ref={shareRef} className="space-y-4 bg-white p-1">
                  {selectedMember.status === "deletion_requested" && (
                    <div className="p-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white rounded-xl shadow-md border-2 border-red-300 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl animate-bounce">⚠️</span>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-white">
                            {isAr ? "إنذار عاجل: العضو طلب حذف حسابه" : "Urgent Alert: Deletion Requested"}
                          </p>
                          <p className="text-[11px] text-rose-100 mt-0.5">
                            {isAr
                              ? "طلب العضو حذف حسابه عبر تطبيق الموبايل وتم إنهاء جلسته."
                              : "Member requested self-deletion on mobile."}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => void handleResolveDeletion(selectedMember.id, "keep_for_followup")}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-white text-emerald-800 font-bold text-[11px] shadow-xs hover:bg-emerald-50 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>🛡️</span>
                          <span>{isAr ? "احتفاظ ورعاية" : "Keep & Care"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleResolveDeletion(selectedMember.id, "delete_permanently")}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-red-950 text-white font-bold text-[11px] shadow-xs hover:bg-black transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>🗑️</span>
                          <span>{isAr ? "حذف نهائي" : "Purge"}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {isMemberCommitted(selectedMember) && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                        <div>
                          <p className="text-xs font-semibold text-amber-800">{isAr ? "عضو ملتزم - ركيزة كنسية" : "Committed Gold Pillar"}</p>
                          <p className="text-[11px] text-amber-600">{isAr ? `نسبة الحضور: ${selectedMember.attendanceRate || 92}%` : `${selectedMember.attendanceRate || 92}% attendance`}</p>
                        </div>
                      </div>
                      <a href={`/people/${selectedMember.id}?autoscroll=true`} className="text-[11px] font-medium text-amber-700 hover:text-amber-900">{isAr ? "الملف الشامل ←" : "View 360 →"}</a>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <img src={shareAvatar || selectedMember.avatar} alt="" className={`w-16 h-16 rounded-full object-cover ring-2 ${isMemberCommitted(selectedMember) ? "ring-amber-300" : "ring-gray-200"}`} />
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{selectedMember.firstName} {selectedMember.lastName} <RoleBadge role={selectedMember.churchRole} isAr={isAr} showMember /></h3>
                      <div className="flex items-center gap-2 mt-1">
                        {selectedMember.status === "deletion_requested" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-300 animate-pulse">
                            <span>⚠️</span>
                            <span>{isAr ? "طلب حذف من الموبايل" : "Deletion Requested"}</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${selectedMember.status === "inactive" ? "bg-red-400" : selectedMember.status === "active" ? "bg-green-500" : "bg-gray-400"}`} /><span className="text-xs font-medium text-gray-600">{tStatus(selectedMember.status, locale)}</span></div>
                        )}
                        {isMemberCommitted(selectedMember) && <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">{isAr ? "ملتزم" : "Gold"}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-0">
                    {([
                      { label: isAr ? "البريد" : "Email", iconKey: "Email", value: <Ltr>{selectedMember.email}</Ltr>, bg: "bg-blue-50", iconColor: "text-blue-500" },
                      { label: isAr ? "الهاتف" : "Phone", iconKey: "Phone", value: <Ltr>{selectedMember.phone}</Ltr>, bg: "bg-emerald-50", iconColor: "text-emerald-500" },
                      { label: isAr ? "الخدمة" : "Ministry", iconKey: "Ministry", value: tMinistry(selectedMember.ministry, locale), bg: "bg-purple-50", iconColor: "text-purple-500" },
                      { label: isAr ? "المجموعة" : "Group", iconKey: "Group", value: selectedMember.group, bg: "bg-amber-50", iconColor: "text-amber-500" },
                      { label: isAr ? "الحضور" : "Attendance", iconKey: "Attendance", value: <Ltr>{`${selectedMember.attendanceRate || 85}%`}</Ltr>, bg: "bg-sky-50", iconColor: "text-sky-500" },
                      { label: isAr ? "آخر حضور" : "Last Visit", iconKey: "Last Visit", value: <Ltr>{selectedMember.lastAttendance}</Ltr>, bg: "bg-rose-50", iconColor: "text-rose-500" },
                      { label: isAr ? "الانضمام" : "Joined", iconKey: "Joined", value: <Ltr>{selectedMember.joinedDate}</Ltr>, bg: "bg-gray-100", iconColor: "text-gray-500" },
                    ]).map((item) => (
                      <div key={item.iconKey} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                        <div className={`w-7 h-7 rounded-md ${item.bg} flex items-center justify-center ${item.iconColor} shrink-0`}>{detailIcons[item.iconKey]}</div>
                        <span className="text-xs text-gray-400 w-20 shrink-0">{item.label}</span>
                        <span className="text-sm text-gray-700 font-medium truncate">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <Button variant="secondary" className="flex-1 text-sm" onClick={() => showToast(isAr ? `تم إرسال رسالة إلى ${selectedMember.firstName}` : `Message sent to ${selectedMember.firstName}`)}>{t.people.sendMessage}</Button>
                  <Button className="flex-1 text-sm bg-blue-600 hover:bg-blue-700" onClick={() => openEditModal(selectedMember)}>{t.people.editMember}</Button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(isAr ? `هل أنت متأكد من رغبتك في حذف العضو "${selectedMember.firstName} ${selectedMember.lastName}" نهائياً من النظام؟` : `Are you sure you want to delete "${selectedMember.firstName} ${selectedMember.lastName}" permanently?`)) {
                      void handleResolveDeletion(selectedMember.id, "delete_permanently");
                    }
                  }}
                  className="w-full py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {isAr ? "حذف العضو نهائياً" : "Delete Member"}
                </button>
                <button onClick={handleShareImage} className="w-full py-2 text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 flex items-center justify-center gap-1.5 cursor-pointer">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  {isAr ? "حفظ كصورة للبطاقة" : "Download as Image"}
                </button>
                <button onClick={handleShareWhatsApp} className="w-full py-2 text-xs font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200 flex items-center justify-center gap-1.5 cursor-pointer">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                  {isAr ? "مشاركة عبر واتساب" : "Share on WhatsApp"}
                </button>
                <Link href={`/people/${selectedMember.id}?autoscroll=true`} className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  {t.people.view360Action}
                </Link>
              </div>
            )}

            {/* ENCOURAGE TAB */}
            {drawerTab === "encourage" && (
              <div className="p-6 space-y-4">
                <div className="text-center py-2">
                  <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">{isAr ? "إرسال تشجيع وافتقاد" : "Send Encouragement"}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{isAr ? `اختر نموذج رسالة لإرسالها إلى ${selectedMember.firstName}` : `Choose a message template to send to ${selectedMember.firstName}`}</p>
                </div>
                <div className="space-y-2">
                  {encourageTemplates.map((templateItem, i) => (
                    <button key={i} onClick={() => setSelectedTemplate(i)} className={`w-full text-start p-3 rounded-lg border transition-all cursor-pointer ${selectedTemplate === i ? "border-amber-300 bg-amber-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                      <p className="text-xs font-semibold text-gray-900 mb-1">{templateItem.label}</p>
                      <p className="text-[11px] text-gray-500 line-clamp-2">{templateItem.message.replace("{name}", selectedMember.firstName)}</p>
                    </button>
                  ))}
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-[11px] font-medium text-gray-500 mb-1">{isAr ? "معاينة الرسالة" : "Preview"}</p>
                  <p className="text-xs text-gray-700">{encourageTemplates[selectedTemplate].message.replace("{name}", selectedMember.firstName)}</p>
                </div>
                <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white text-sm" onClick={handleSendEncouragement}>
                  <svg className={`w-4 h-4 ${isRtl ? "ms-1.5" : "mr-1.5"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  {isAr ? "إرسال الرسالة الآن" : "Send Message"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT MEMBER MODAL */}
      {isEditModalOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-gray-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">{isAr ? "تعديل بيانات العضو" : "Edit Member"}</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-600 mb-1">{t.people.firstName}</label><input type="text" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400" /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">{t.people.lastName}</label><input type="text" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-600 mb-1">{isAr ? "البريد الإلكتروني *" : "Email *"}</label><input type="email" required value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 ltr-input" dir="ltr" /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">{t.people.phone} *</label><input type="tel" required value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 ltr-input" dir="ltr" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{isAr ? "الحالة" : "Status"}</label>
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as any)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400">
                    <option value="active">{isAr ? "نشط" : "Active"}</option>
                    <option value="visitor">{isAr ? "زائر" : "Visitor"}</option>
                    <option value="inactive">{isAr ? "غير نشط" : "Inactive"}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{isAr ? "الخدمة" : "Ministry"}</label>
                  <select value={editMinistry} onChange={(e) => setEditMinistry(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400">
                    <option value="Worship">{tMinistry("Worship", locale)}</option>
                    <option value="Youth">{tMinistry("Youth", locale)}</option>
                    <option value="Children">{tMinistry("Children", locale)}</option>
                    <option value="Outreach">{tMinistry("Outreach", locale)}</option>
                    <option value="Admin">{tMinistry("Admin", locale)}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{isAr ? "المجموعة" : "Group"}</label>
                  <select value={editGroup} onChange={(e) => setEditGroup(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400">
                    <option>Small Group A</option>
                    <option>Small Group B</option>
                    <option>Choir</option>
                    <option>Youth Mentors</option>
                    <option>Community Service</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4">
              <button
                type="button"
                className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors cursor-pointer"
                onClick={() => handleDeactivateMember(selectedMember.id)}
                disabled={isSubmitting}
              >
                {isAr ? "إلغاء تفعيل العضو" : "Deactivate Member"}
              </button>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setIsEditModalOpen(false)} disabled={isSubmitting}>{t.common.cancel}</Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveEdit} disabled={isSubmitting}>
                  {isSubmitting ? (isAr ? "جاري الحفظ..." : "Saving...") : t.common.saveChanges}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD MEMBER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-gray-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">{t.people.addModalTitle}</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleAddMember} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-600 mb-1">{t.people.firstName} *</label><input type="text" required value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400" /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">{t.people.lastName} *</label><input type="text" required value={newLastName} onChange={(e) => setNewLastName(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-600 mb-1">{isAr ? "البريد الإلكتروني *" : "Email *"}</label><input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 ltr-input" dir="ltr" /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">{t.people.phone} *</label><input type="tel" required value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 ltr-input" dir="ltr" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{isAr ? "الحالة" : "Status"}</label>
                  <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as any)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                    <option value="active">{isAr ? "نشط" : "Active"}</option>
                    <option value="visitor">{isAr ? "زائر" : "Visitor"}</option>
                    <option value="inactive">{isAr ? "غير نشط" : "Inactive"}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{isAr ? "الخدمة" : "Ministry"}</label>
                  <select value={newMinistry} onChange={(e) => setNewMinistry(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                    <option value="Worship">{tMinistry("Worship", locale)}</option>
                    <option value="Youth">{tMinistry("Youth", locale)}</option>
                    <option value="Children">{tMinistry("Children", locale)}</option>
                    <option value="Outreach">{tMinistry("Outreach", locale)}</option>
                    <option value="Admin">{tMinistry("Admin", locale)}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{isAr ? "المجموعة" : "Group"}</label>
                  <select value={newGroup} onChange={(e) => setNewGroup(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                    <option>Small Group A</option>
                    <option>Small Group B</option>
                    <option>Choir</option>
                    <option>Youth Mentors</option>
                    <option>Community Service</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 mt-3">
                <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>{t.common.cancel}</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                  {isSubmitting ? (isAr ? "جاري الإضافة..." : "Adding...") : t.people.addMember}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">{isAr ? "استيراد الأعضاء من ملف CSV" : "Import Members from CSV"}</h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
            </div>
            <div className="mt-4 space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-900">{isAr ? "1. تنزيل نموذج الاستيراد" : "1. Download Template"}</p>
                  <p className="text-[11px] text-blue-700">{isAr ? "مصنّف بالأعمدة والحقول المطلوبة مع دليل الحقول" : "Excel workbook with every column documented"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <a href={TEMPLATE_CSV_URL} download className="text-[11px] font-medium text-blue-700 underline hover:text-blue-900">{isAr ? "CSV" : "CSV"}</a>
                  <Button size="sm" variant="secondary" onClick={handleDownloadTemplate} className="bg-white text-blue-700 border border-blue-300 text-xs">{isAr ? "تنزيل Excel" : "Excel"}</Button>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900 mb-2">{isAr ? "2. رفع ملف الأعضاء" : "2. Upload File"}</p>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors bg-gray-50/50">
                  <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  <p className="text-xs text-gray-600">{isAr ? "اختر ملف CSV من جهازك" : "Choose a CSV file"}</p>
                  <p className="text-[11px] text-gray-500 mt-1">{isAr ? "يملأ ملف Excel على جهازك ثم احفظه كـ CSV" : "Open the .xlsx in Excel, then Save As → CSV to upload it"}</p>
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="mt-2 block mx-auto text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />

                  {importFileName && <p className="text-xs text-emerald-600 mt-2 font-medium">✓ {importFileName} ({importRows.length} {isAr ? "أعضاء" : "rows"})</p>}
                </div>
              </div>
              {importRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-700">
                      {isAr ? "معاينة البيانات المراد استيرادها:" : "Preview of members to import:"}
                    </span>
                    <span className="text-gray-500">
                      {isAr ? `${importRows.length} عضو` : `${importRows.length} rows`}
                    </span>
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                        <tr>
                          <th className="p-2 text-start">{isAr ? "الاسم" : "Name"}</th>
                          <th className="p-2 text-start">{isAr ? "البريد الإلكتروني" : "Email"}</th>
                          <th className="p-2 text-start">{isAr ? "الخدمة" : "Ministry"}</th>
                          <th className="p-2 text-start">{isAr ? "الحالة" : "Status"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.slice(0, 10).map((r, i) => (
                          <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                            <td className="p-2 font-medium">{r.firstName} {r.lastName}</td>
                            <td className="p-2 text-gray-600"><Ltr>{r.email}</Ltr></td>
                            <td className="p-2 text-gray-600">{r.ministry || "—"}</td>
                            <td className="p-2 text-gray-600">{tStatus(r.status || "active", locale)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Duplicate Strategy Option */}
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1.5">
                    <p className="text-xs font-semibold text-gray-800">
                      {isAr ? "التعامل مع البريد الإلكتروني المكرر:" : "Duplicate Email Handling:"}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-700">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="duplicateStrategy"
                          value="skip"
                          checked={importDuplicateStrategy === "skip"}
                          onChange={() => setImportDuplicateStrategy("skip")}
                          className="text-blue-600"
                        />
                        <span>{isAr ? "تجاوز المكرر (تخطي)" : "Skip existing duplicates"}</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="duplicateStrategy"
                          value="update"
                          checked={importDuplicateStrategy === "update"}
                          onChange={() => setImportDuplicateStrategy("update")}
                          className="text-blue-600"
                        />
                        <span>{isAr ? "تحديث بيانات العضو الموجود" : "Update existing members"}</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <Button variant="secondary" onClick={() => setIsImportModalOpen(false)}>{t.common.cancel}</Button>
                <Button
                  disabled={importRows.length === 0 || isSubmitting}
                  onClick={handleExecuteImport}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSubmitting
                    ? isAr
                      ? "جاري الاستيراد..."
                      : "Importing..."
                    : isAr
                    ? `استيراد ${importRows.length > 0 ? `${importRows.length} عضوًا` : ""}`
                    : `Import ${importRows.length > 0 ? `${importRows.length} Members` : ""}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
