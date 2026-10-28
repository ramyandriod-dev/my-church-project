"use client";

/**
 * /families — the Families Directory
 *
 * The church-wide list of families. Each row is a household summary: who the
 * father and mother are, how many children, the household size, and whether a
 * real family photo exists. The split is NOT recomputed in this file: it comes
 * from the shared household summariser the API uses, so the directory can never
 * present a different family structure than the Family 360 page behind it.
 *
 * A family that is missing a father, a mother, or a photo is still listed and
 * still navigable. Incomplete data is normal here, so the table reports it
 * rather than hiding the family, and the "needs review" stat makes it easy to
 * find the gaps to clean up.
 *
 * The rows are loaded through `getMockFamilyDirectory`, which returns the exact
 * `FamilyDirectoryEntry` payload the production endpoint
 * `GET /api/families?view=directory` returns, so switching this page to live
 * data is a change of loader rather than a change of shape.
 */

import * as React from "react";
import { DeleteFamilyButton } from "@/components/family/delete-family-button";
import { mockAvatar, mockPortrait } from "@/lib/avatars/mock-avatar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";
import { FamilyFormModal, type FamilyFormValues } from "@/components/family/family-form-modal";
import { FamilyPhoto } from "@/components/family/family-photo";
import { useAttendanceRealtime } from "@/lib/realtime/use-attendance-realtime";
import type { Family, FamilyDirectoryEntry } from "@/lib/backend/types";
import { fetchAllMembers } from "@/lib/members/fetch-all-members";

/** Local, additive view state. The backend owns the truth; this owns the view. */
interface DirectoryFilters {
  search: string;
  hasPhoto: "all" | "yes" | "no";
  hasChildren: "all" | "yes" | "no";
  minSize: string;
  maxSize: string;
  relationshipType: string;
}

const EMPTY_FILTERS: DirectoryFilters = {
  search: "",
  hasPhoto: "all",
  hasChildren: "all",
  minSize: "",
  maxSize: "",
  relationshipType: "all",
};

const RELATIONSHIP_OPTIONS = [
  "all",
  "father",
  "mother",
  "child",
  "spouse",
  "sibling",
  "guardian",
  "other",
] as const;

function labelRelationship(type: string, isAr: boolean): string {
  const map: Record<string, [string, string]> = {
    all: ["All relationships", "كل العلاقات"],
    father: ["Father", "الأب"],
    mother: ["Mother", "الأم"],
    child: ["Child", "الابن / الابنة"],
    spouse: ["Spouse", "الزوج / الزوجة"],
    sibling: ["Sibling", "الأخ / الأخت"],
    guardian: ["Guardian", "الوصي"],
    other: ["Other", "علاقة أخرى"],
  };
  const pair = map[type];
  return pair ? (isAr ? pair[1] : pair[0]) : type;
}

function fullName(member: { firstName: string; lastName: string }): string {
  return `${member.firstName} ${member.lastName}`;
}

export default function FamiliesPage() {
  const { locale, isRtl } = useLanguage();
  const isAr = locale === "ar";
  const router = useRouter();

  const [filters, setFilters] = React.useState<DirectoryFilters>(EMPTY_FILTERS);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [dbMembers, setDbMembers] = React.useState<any[]>([]);
  const [dbFamiliesDirectory, setDbFamiliesDirectory] = React.useState<FamilyDirectoryEntry[] | null>(null);

  // Local working copy for newly created families in current session (no mock data fallback)
  const [localFamilies, setLocalFamilies] = React.useState<Family[]>([]);
  const [removedFamilyIds, setRemovedFamilyIds] = React.useState<string[]>([]);
  const handleFamilyDeleted = React.useCallback((id: string) => {
    setRemovedFamilyIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setLocalFamilies((prev) => prev.filter((f) => f.id !== id));
  }, []);
  const [realtimeToast, setRealtimeToast] = React.useState<string | null>(null);

  const loadFamiliesData = React.useCallback(async (retryCount = 0) => {
    try {
      if (retryCount === 0) setLoadError(null);
      const famRes = await fetch("/api/families?view=directory");
      if (famRes.status === 401) {
        if (typeof window !== "undefined") {
          window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`;
        }
        return;
      }
      if (famRes.status >= 500 && retryCount < 2) {
        await new Promise((resolve) => setTimeout(resolve, 800 * (retryCount + 1)));
        return await loadFamiliesData(retryCount + 1);
      }
      if (famRes.ok) {
        const famJson = await famRes.json();
        if (famJson.data?.items) setDbFamiliesDirectory(famJson.data.items);
      } else if (!famRes.ok && retryCount >= 2) {
        setLoadError(isAr ? "فشل تحميل بيانات الأسر" : "Failed to load families list");
      }

      // Fetch member candidates for creation modal non-blockingly
      fetchAllMembers()
        .then((members) => setDbMembers(members))
        .catch(() => {
          // Non-blocking modal options
        });
    } catch (err) {
      if (retryCount < 2) {
        await new Promise((resolve) => setTimeout(resolve, 800 * (retryCount + 1)));
        return await loadFamiliesData(retryCount + 1);
      }
      console.warn("Could not load database families", err);
      setLoadError(isAr ? "فشل تحميل بيانات الأسر" : "Failed to load families list");
    } finally {
      setIsLoading(false);
    }
  }, [isAr]);

  React.useEffect(() => {
    void loadFamiliesData();
  }, [loadFamiliesData]);

  useAttendanceRealtime({
    onMemberUpdated: (event) => {
      void loadFamiliesData();
      const memberName = (event.data?.memberName as string) || (isAr ? "عضو" : "A member");
      const famName = (event.data?.familyName as string) || "";
      const text = isAr
        ? famName
          ? `🔄 تم ربط "${memberName}" بعائلة "${famName}" مباشرة!`
          : `🔄 تم تحديث بيانات الأسرة للعضو "${memberName}" مباشرة!`
        : famName
          ? `🔄 "${memberName}" linked to "${famName}" family live!`
          : `🔄 Family details updated for "${memberName}" live!`;
      setRealtimeToast(text);
      setTimeout(() => setRealtimeToast(null), 4500);
    },
  });

  const memberCandidates = React.useMemo(() => {
    const list: { id: string; firstName: string; lastName: string; avatar?: string }[] = [];
    const seen = new Set<string>();

    for (const m of dbMembers) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        list.push({
          id: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
          avatar: m.avatarUrl || mockAvatar(m.firstName + " " + m.lastName),
        });
      }
    }

    return list;
  }, [dbMembers]);

  const directory: FamilyDirectoryEntry[] = React.useMemo(() => {
    if (!dbFamiliesDirectory) {
      return [];
    }

    const base = dbFamiliesDirectory;
    const seenIds = new Set(base.map((e) => e.family.id));

    // Overlay locally created/edited families so the table reflects the form.
    return base
      .filter((entry) => !removedFamilyIds.includes(entry.family.id))
      .map((entry) => {
        const override = localFamilies.find((f) => f.id === entry.family.id);
        return override ? { ...entry, family: override } : entry;
      })
      .concat(
        localFamilies
          .filter((f) => !seenIds.has(f.id))
          .map((family) => ({
            family,
            members: [],
            fathers: [],
            mothers: [],
            children: [],
            familySize: 0,
            hasChildren: false,
            hasFamilyPhoto: Boolean(family.familyPhotoUrl),
          })),
      );
  }, [dbFamiliesDirectory, localFamilies, removedFamilyIds]);

  const stats = React.useMemo(() => {
    const total = directory.length;
    const withPhoto = directory.filter((e) => e.hasFamilyPhoto).length;
    const withChildren = directory.filter((e) => e.hasChildren).length;
    const members_ = directory.reduce((sum, e) => sum + e.familySize, 0);
    // "Needs review" is a data-quality signal, not a verdict on the family: a
    // household missing a father or a photo is normal and still fully usable.
    const needsReview = directory.filter(
      (e) => !e.hasFamilyPhoto || (!e.fathers.length && !e.mothers.length),
    ).length;
    return { total, withPhoto, withChildren, members: members_, needsReview };
  }, [directory]);

  const filtered = React.useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const min = filters.minSize ? Number(filters.minSize) : undefined;
    const max = filters.maxSize ? Number(filters.maxSize) : undefined;

    return directory.filter((entry) => {
      if (filters.hasPhoto === "yes" && !entry.hasFamilyPhoto) return false;
      if (filters.hasPhoto === "no" && entry.hasFamilyPhoto) return false;
      if (filters.hasChildren === "yes" && !entry.hasChildren) return false;
      if (filters.hasChildren === "no" && entry.hasChildren) return false;
      if (min !== undefined && !Number.isNaN(min) && entry.familySize < min) return false;
      if (max !== undefined && !Number.isNaN(max) && entry.familySize > max) return false;

      if (filters.relationshipType !== "all") {
        const hit =
          (filters.relationshipType === "father" && entry.fathers.length > 0) ||
          (filters.relationshipType === "mother" && entry.mothers.length > 0) ||
          (filters.relationshipType === "child" && entry.children.length > 0) ||
          (entry.members.length > 0);
        if (!hit) return false;
      }

      if (q) {
        const inName = entry.family.name.toLowerCase().includes(q);
        const inMember = entry.members.some((m) => fullName(m).toLowerCase().includes(q));
        if (!inName && !inMember) return false;
      }
      return true;
    });
  }, [directory, filters]);

  const activeFilterCount =
    (filters.search.trim() ? 1 : 0) +
    (filters.hasPhoto !== "all" ? 1 : 0) +
    (filters.hasChildren !== "all" ? 1 : 0) +
    (filters.minSize ? 1 : 0) +
    (filters.maxSize ? 1 : 0) +
    (filters.relationshipType !== "all" ? 1 : 0);

  function setFilter<K extends keyof DirectoryFilters>(key: K, value: DirectoryFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreateFamily(values: FamilyFormValues) {
    const isUuid = (str?: string | null) =>
      Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

    try {
      const res = await fetch("/api/families", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          headMemberId: isUuid(values.headMemberId) ? values.headMemberId : undefined,
          familyPhotoUrl: values.familyPhotoUrl || undefined,
          notes: values.notes || undefined,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (res.status === 401) {
        if (typeof window !== "undefined") {
          window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`;
        }
        return;
      }

      if (res.ok && json.data?.id) {
        setIsFormOpen(false);
        void loadFamiliesData();
        router.push(`/families/${json.data.id}`);
        return;
      }

      const errMsg = json?.error?.message || (isAr ? "فشل حفظ الأسرة. حاول مرة أخرى." : "Failed to create family.");
      setRealtimeToast(errMsg);
    } catch (e: any) {
      console.error("POST /api/families failed:", e);
      setRealtimeToast(e?.message || (isAr ? "حدث خطأ أثناء حفظ الأسرة" : "An error occurred while creating family"));
    }
  }

  return (
    <div className="space-y-5" key={locale}>
      {realtimeToast && (
        <div className="fixed top-4 end-4 z-[60] p-3 bg-emerald-700 text-white rounded-lg text-sm font-medium shadow-lg flex items-center justify-between gap-3 animate-fade-in max-w-sm">
          <span>{realtimeToast}</span>
          <button onClick={() => setRealtimeToast(null)} className="text-emerald-200 hover:text-white shrink-0">✕</button>
        </div>
      )}

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
            {isAr ? "الأسر" : "Families"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isAr
              ? "استعرض كل أسرة في الكنيسة، وافتح ملف الأسرة الكامل."
              : "Browse every household in the church and open a full family profile."}
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <svg className="me-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {isAr ? "أسرة جديدة" : "New family"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={isAr ? "إجمالي الأسر" : "Total families"}
          value={isLoading ? "..." : stats.total}
          tone="text-gray-900"
        />
        <StatCard
          label={isAr ? "الأفراد" : "People in families"}
          value={isLoading ? "..." : stats.members}
          tone="text-gray-900"
        />
        <StatCard
          label={isAr ? "أسر بها أطفال" : "Families with children"}
          value={isLoading ? "..." : stats.withChildren}
          tone="text-gray-900"
        />
        <StatCard
          label={isAr ? "تحتاج مراجعة" : "Need data review"}
          value={isLoading ? "..." : stats.needsReview}
          tone={stats.needsReview > 0 ? "text-amber-600" : "text-gray-900"}
          hint={
            isAr
              ? "أسر بدون صورة، أو بدون أب أو أم مسجّل"
              : "No family photo, or no father or mother recorded"
          }
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                {isAr ? "بحث" : "Search"}
              </label>
              <Input
                value={filters.search}
                onChange={(e) => setFilter("search", e.target.value)}
                placeholder={
                  isAr ? "اسم الأسرة أو اسم أحد أفرادها" : "Family name or a member name"
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                {isAr ? "صورة الأسرة" : "Family photo"}
              </label>
              <select
                value={filters.hasPhoto}
                onChange={(e) => setFilter("hasPhoto", e.target.value as DirectoryFilters["hasPhoto"])}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="all">{isAr ? "الكل" : "All"}</option>
                <option value="yes">{isAr ? "نعم" : "Yes"}</option>
                <option value="no">{isAr ? "لا" : "No"}</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                {isAr ? "لديها أطفال" : "Has children"}
              </label>
              <select
                value={filters.hasChildren}
                onChange={(e) =>
                  setFilter("hasChildren", e.target.value as DirectoryFilters["hasChildren"])
                }
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="all">{isAr ? "الكل" : "All"}</option>
                <option value="yes">{isAr ? "نعم" : "Yes"}</option>
                <option value="no">{isAr ? "لا" : "No"}</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                {isAr ? "العلاقة" : "Relationship"}
              </label>
              <select
                value={filters.relationshipType}
                onChange={(e) => setFilter("relationshipType", e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                {RELATIONSHIP_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {labelRelationship(opt, isAr)}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                {isAr ? "حجم الأسرة" : "Family size"}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={filters.minSize}
                  onChange={(e) => setFilter("minSize", e.target.value)}
                  placeholder={isAr ? "من" : "Min"}
                  aria-label={isAr ? "أقل حجم" : "Minimum family size"}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
                <span className="text-gray-400">–</span>
                <input
                  type="number"
                  min={1}
                  value={filters.maxSize}
                  onChange={(e) => setFilter("maxSize", e.target.value)}
                  placeholder={isAr ? "إلى" : "Max"}
                  aria-label={isAr ? "أكبر حجم" : "Maximum family size"}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>
                {isAr
                  ? `${filtered.length} من ${directory.length} أسرة`
                  : `${filtered.length} of ${directory.length} families`}
              </span>
              <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="cursor-pointer font-medium text-blue-600 hover:underline"
              >
                {isAr ? "مسح عوامل التصفية" : "Clear filters"}
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="px-6 py-14 text-center">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <p className="mt-3 text-sm text-gray-500">
                {isAr ? "جاري تحميل بيانات الأسر..." : "Loading families..."}
              </p>
            </div>
          ) : loadError ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="mt-3 text-sm font-semibold text-gray-700">{loadError}</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setIsLoading(true);
                  void loadFamiliesData();
                }}
              >
                {isAr ? "إعادة المحاولة" : "Retry"}
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm font-semibold text-gray-700">
                {isAr ? "لا توجد أسر مطابقة" : "No families match these filters"}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {isAr
                  ? "جرّب تعديل البحث أو عوامل التصفية."
                  : "Try adjusting the search or clearing the filters."}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80">
                      {[
                        isAr ? "الأسرة" : "Family",
                        isAr ? "الأب" : "Father",
                        isAr ? "الأم" : "Mother",
                        isAr ? "الأبناء" : "Children",
                        isAr ? "الحجم" : "Size",
                        isAr ? "" : "",
                      ].map((h, i) => (
                        <th
                          key={i}
                          className="px-5 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-gray-500"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((entry) => (
                      <FamilyRow key={entry.family.id} entry={entry} isAr={isAr} onDeleted={handleFamilyDeleted} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards: the same data without horizontal scrolling */}
              <ul className="divide-y divide-gray-100 md:hidden">
                {filtered.map((entry) => (
                  <FamilyCard key={entry.family.id} entry={entry} isAr={isAr} onDeleted={handleFamilyDeleted} />
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      {isFormOpen && (
        <FamilyFormModal
          isAr={isAr}
          candidates={memberCandidates}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleCreateFamily}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number | string;
  tone: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] leading-tight text-gray-400">{hint}</p>}
    </div>
  );
}

/** Desktop row. An empty father/mother cell is shown as a dash, never blank. */
function FamilyRow({ entry, isAr, onDeleted }: { entry: FamilyDirectoryEntry; isAr: boolean; onDeleted: (id: string) => void }) {
  return (
    <tr className="cursor-pointer transition-colors hover:bg-gray-50/80">
      <td className="px-5 py-3.5">
        <Link
          href={`/families/${entry.family.id}`}
          className="group flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <FamilyPhoto family={entry.family} size="md" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-gray-900 group-hover:text-blue-700">
              {entry.family.name}
            </span>
            <span className="block text-xs text-gray-500">
              {entry.hasFamilyPhoto ? (
                isAr ? "لديها صورة" : "Has photo"
              ) : (
                <span className="text-amber-600">
                  {isAr ? "بدون صورة" : "No photo"}
                </span>
              )}
            </span>
          </span>
        </Link>
      </td>
      <td className="px-5 py-3.5 text-sm text-gray-700">
        {entry.fathers.length > 0 ? fullName(entry.fathers[0]) : <Dash isAr={isAr} />}
      </td>
      <td className="px-5 py-3.5 text-sm text-gray-700">
        {entry.mothers.length > 0 ? fullName(entry.mothers[0]) : <Dash isAr={isAr} />}
      </td>
      <td className="px-5 py-3.5 text-sm text-gray-700">
        {entry.children.length > 0 ? (
          <span className="flex flex-wrap gap-1">
            {entry.children.map((c) => (
              <span
                key={c.id}
                className="rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-700 ring-1 ring-sky-100"
              >
                {c.firstName} {c.lastName}
              </span>
            ))}
          </span>
        ) : (
          <Dash isAr={isAr} />
        )}
      </td>
      <td className="px-5 py-3.5">
        <Badge>{entry.familySize}</Badge>
      </td>
      <td className="px-3 py-3.5 text-end">
        <DeleteFamilyButton familyId={entry.family.id} familyName={entry.family.name} isAr={isAr} variant="icon" onDeleted={onDeleted} />
      </td>
    </tr>
  );
}

function FamilyCard({ entry, isAr, onDeleted }: { entry: FamilyDirectoryEntry; isAr: boolean; onDeleted: (id: string) => void }) {
  return (
    <li className="relative">
      <Link href={`/families/${entry.family.id}`} className="block p-4 active:bg-gray-50">
        <div className="flex items-center gap-3">
          <FamilyPhoto family={entry.family} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">{entry.family.name}</p>
            <p className="text-xs text-gray-500">
              {isAr ? `${entry.familySize} أفراد` : `${entry.familySize} members`}
              {entry.hasFamilyPhoto ? "" : isAr ? " • بدون صورة" : " • no photo"}
            </p>
          </div>
        </div>
        <dl className="mt-3 space-y-1 text-xs">
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-gray-500">{isAr ? "الأب" : "Father"}</dt>
            <dd className="text-gray-800">
              {entry.fathers.length > 0 ? fullName(entry.fathers[0]) : <Dash isAr={isAr} />}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-gray-500">{isAr ? "الأم" : "Mother"}</dt>
            <dd className="text-gray-800">
              {entry.mothers.length > 0 ? fullName(entry.mothers[0]) : <Dash isAr={isAr} />}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-gray-500">{isAr ? "الأبناء" : "Children"}</dt>
            <dd className="text-gray-800">
              {entry.children.length > 0
                ? entry.children.map((c) => `${c.firstName} ${c.lastName}`).join("، ")
                : <Dash isAr={isAr} />}
            </dd>
          </div>
        </dl>
      </Link>
      <div className="absolute end-2 top-2">
        <DeleteFamilyButton familyId={entry.family.id} familyName={entry.family.name} isAr={isAr} variant="icon" onDeleted={onDeleted} />
      </div>
    </li>
  );
}

function Dash({ isAr }: { isAr: boolean }) {
  return (
    <span className="text-xs text-gray-400" title={isAr ? "غير مسجّل" : "Not recorded"}>
      {isAr ? "غير مسجّل" : "Not recorded"}
    </span>
  );
}

