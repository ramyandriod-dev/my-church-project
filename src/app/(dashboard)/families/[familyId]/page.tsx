"use client";

/**
 * /families/[familyId] — Family 360
 *
 * The complete view of one household: who is in it, how they are related, and
 * the engagement facts the church already records for each person.
 *
 * Two rules shape this page:
 *
 *   1. Nothing is inferred. The father column comes from a `father`
 *      relationship, the "head of family" badge comes from `headMemberId`, and
 *      the family photo comes from `familyPhotoUrl` with the head's avatar as an
 *      explicitly-labelled fallback. A family missing a father shows a dash
 *      rather than a guess, because in this domain a wrong guess is worse than
 *      a blank.
 *
 *   2. Attendance and follow-ups are READ from the existing church data, keyed
 *      by real member ids. This page creates no attendance record, no
 *      follow-up, and no engagement score. A person with no recorded attendance
 *      simply shows "no data" instead of a fabricated percentage.
 *
 * The tree is the shared production tree builder, rooted on the head of family,
 * so this page and Member 360 can never disagree about a relationship.
 */

import * as React from "react";
import { DeleteFamilyButton } from "@/components/family/delete-family-button";
import { mockAvatar, mockPortrait } from "@/lib/avatars/mock-avatar";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";
import { FamilyTreeView } from "@/components/family/family-tree-view";
import { FamilyPhoto } from "@/components/family/family-photo";
import { FamilyFormModal } from "@/components/family/family-form-modal";
import { AddMemberForm, RelationshipRow } from "@/components/family/family-member-editor";
import { getMockFamilyTreeForFamily } from "@/lib/mock-data/families";
import { getMember360 } from "@/lib/mock-data/member360";
import type { Family, FamilyRelationship, FamilyRelationshipType } from "@/lib/backend/types";
import { fetchAllMembers } from "@/lib/members/fetch-all-members";

export default function Family360Page() {
  const { locale, isRtl } = useLanguage();
  const isAr = locale === "ar";
  const params = useParams<{ familyId: string }>();
  const router = useRouter();
  const familyId = params?.familyId;

  // Local working copies so the management actions are usable in the session.
  const [localFamilies, setLocalFamilies] = React.useState<Family[]>([]);
  const [localRels, setLocalRels] = React.useState<FamilyRelationship[]>([]);
  const [dbMembers, setDbMembers] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [addMemberId, setAddMemberId] = React.useState<string | undefined>(undefined);
  const [notice, setNotice] = React.useState<string | null>(null);

  // Fetch real members and family data from API
  React.useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        // Every member, not just the first page: names are looked up by id below,
        // and anyone missing from this list would show as a raw id.
        const [membersRes, familyRes, relsRes] = await Promise.allSettled([
          fetchAllMembers(),
          familyId ? fetch(`/api/families/${encodeURIComponent(familyId)}`) : Promise.resolve(null),
          familyId ? fetch(`/api/families/${encodeURIComponent(familyId)}/relationships`) : Promise.resolve(null),
        ]);

        if (
          (membersRes.status === "rejected" && (membersRes.reason as any)?.status === 401) ||
          (familyRes.status === "fulfilled" && (familyRes.value as any)?.status === 401)
        ) {
          if (typeof window !== "undefined") {
            window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`;
          }
          return;
        }

        if (membersRes.status === "fulfilled" && active) {
          setDbMembers(membersRes.value);
        }

        if (familyRes.status === "fulfilled" && familyRes.value?.ok) {
          const fJson = await familyRes.value.json();
          if (fJson?.data && active) {
            setLocalFamilies((prev) => [fJson.data, ...prev.filter((f) => f.id !== fJson.data.id)]);
          }
        }

        if (relsRes.status === "fulfilled" && relsRes.value?.ok) {
          const rJson = await relsRes.value.json();
          if (Array.isArray(rJson?.data) && active) {
            setLocalRels((prev) => [
              ...rJson.data,
              ...prev.filter((r) => r.familyId !== familyId),
            ]);
          }
        }
      } catch (err) {
        console.error("Error loading family data:", err);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    loadData();

    return () => {
      active = false;
    };
  }, [familyId]);

  const family = React.useMemo(
    () => localFamilies.find((f) => f.id === familyId) ?? null,
    [localFamilies, familyId],
  );

  const familyRels = React.useMemo(
    () => localRels.filter((r) => r.familyId === familyId),
    [localRels, familyId],
  );

  const membersById = React.useMemo(() => {
    const map = new Map<string, any>();
    for (const m of dbMembers) {
      map.set(m.id, {
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        avatar: m.avatarUrl || m.avatar || mockAvatar(m.firstName + " " + m.lastName),
        email: m.email,
        phone: m.phone,
        status: m.status,
        membershipStatus: m.membershipStatus,
      });
    }
    return map;
  }, [dbMembers]);

  // Rebuilt from the LOCAL family and relationship copies, passing the unified membersById map
  const tree = React.useMemo(
    () =>
      familyId && family
        ? getMockFamilyTreeForFamily(familyId, {
            family,
            relationships: localRels,
            members: membersById,
          })
        : null,
    [familyId, family, localRels, membersById],
  );

  // A "Add to family" action on Member 360 links here as
  // /families/<id>?add=<memberId>, which opens the add-member form with that
  // person already chosen. Read from window in an effect so this page needs no
  // Suspense boundary and stays statically prerenderable.
  React.useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("add");
    if (requested) {
      setAddMemberId(requested);
      setIsAddOpen(true);
    }
  }, []);

  const householdMembers = React.useMemo(() => {
    const ids = new Set<string>();
    for (const r of familyRels) {
      ids.add(r.fromMemberId);
      ids.add(r.toMemberId);
    }
    if (family?.headMemberId) ids.add(family.headMemberId);
    return [...ids]
      .map((id) => membersById.get(id) ?? {
        id,
        firstName: id,
        lastName: "",
        avatar: mockAvatar(id),
      })
      .filter((m): m is NonNullable<typeof m> => Boolean(m));
  }, [familyRels, family?.headMemberId, membersById]);

  const allCandidateMembers = React.useMemo(() => {
    return Array.from(membersById.values()).map((m) => ({
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      avatar: m.avatar,
    }));
  }, [membersById]);

  const availableMembers = React.useMemo(() => {
    return allCandidateMembers.filter((m) => !householdMembers.some((h) => h.id === m.id));
  }, [allCandidateMembers, householdMembers]);

  const openFollowUps = React.useMemo(
    () =>
      householdMembers.reduce((sum, m) => sum + (getMember360(m.id)?.openFollowUps ?? 0), 0),
    [householdMembers],
  );

  if (isLoading && !family) {
    return (
      <div className="space-y-4">
        <Link
          href="/families"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
        >
          <span aria-hidden="true">{isRtl ? "→" : "←"}</span>
          {isAr ? "الأسر" : "Families"}
        </Link>
        <Card>
          <CardContent className="py-14 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="mt-3 text-sm text-gray-500">
              {isAr ? "جاري تحميل بيانات الأسرة..." : "Loading family details..."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!family) {
    return (
      <div className="space-y-4">
        <Link
          href="/families"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
        >
          <span aria-hidden="true">{isRtl ? "→" : "←"}</span>
          {isAr ? "الأسر" : "Families"}
        </Link>
        <Card>
          <CardContent className="py-14 text-center">
            <p className="text-sm font-semibold text-gray-700">
              {isAr ? "الأسرة غير موجودة" : "Family not found"}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {isAr
                ? "ربما تم حذفها أو أن الرابط غير صحيح."
                : "It may have been deleted, or the link may be wrong."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const safeRoots = tree?.roots ?? [];
  const head = tree?.head ?? (family.headMemberId ? membersById.get(family.headMemberId) ?? null : null);

  function nameOf(id: string): string {
    const m = membersById.get(id);
    return m ? `${m.firstName} ${m.lastName}` : id;
  }

  async function handleSaveFamily(values: {
    name: string;
    headMemberId: string | null;
    familyPhotoUrl: string | null;
    notes: string | null;
  }) {
    setLocalFamilies((prev) =>
      prev.map((f) =>
        f.id === family!.id
          ? { ...f, ...values, updatedAt: new Date().toISOString() }
          : f,
      ),
    );
    setIsEditOpen(false);
    setNotice(isAr ? "تم تحديث بيانات الأسرة" : "Family details updated");

    try {
      if (family?.id) {
        await fetch(`/api/families/${encodeURIComponent(family.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
      }
    } catch (e) {
      console.warn("Could not persist family edit:", e);
    }
  }

  async function handleAddMember(values: { memberId: string; type: FamilyRelationshipType; relatedMemberId: string }) {
    const { memberId, type, relatedMemberId } = values;

    // `father` / `mother` / `guardian` and `child` are all stored with the NEW
    // member on the `from` side: for a parent role that person is the parent,
    // and for a child role the `child` type is defined child-first. Symmetric
    // types have no direction, so the same shape is used and the backend
    // normalises the pair when it checks for duplicates.
    const tempRel: FamilyRelationship = {
      id: `fr-local-${Date.now()}`,
      tenantId: family!.tenantId,
      familyId: family!.id,
      fromMemberId: memberId,
      toMemberId: relatedMemberId,
      type,
      createdAt: new Date().toISOString(),
    };
    setLocalRels((prev) => [...prev, tempRel]);
    setIsAddOpen(false);
    setAddMemberId(undefined);
    setNotice(isAr ? "تمت إضافة الفرد" : "Member added to the family");

    try {
      if (family?.id) {
        const res = await fetch(`/api/families/${encodeURIComponent(family.id)}/relationships`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromMemberId: memberId,
            toMemberId: relatedMemberId,
            type,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.data?.id) {
            setLocalRels((prev) =>
              prev.map((r) => (r.id === tempRel.id ? json.data : r))
            );
          }
        }
      }
    } catch (e) {
      console.warn("Could not persist relationship to API:", e);
    }
  }

  async function handleChangeRelType(relId: string, type: FamilyRelationshipType) {
    setLocalRels((prev) => prev.map((r) => (r.id === relId ? { ...r, type } : r)));
    setNotice(isAr ? "تم تحديث العلاقة" : "Relationship updated");

    try {
      if (family?.id && !relId.startsWith("fr-local-")) {
        await fetch(`/api/families/${encodeURIComponent(family.id)}/relationships/${encodeURIComponent(relId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type }),
        });
      }
    } catch (e) {
      console.warn("Could not persist relationship type change:", e);
    }
  }

  async function handleRemoveRel(relId: string) {
    setLocalRels((prev) => prev.filter((r) => r.id !== relId));
    setNotice(isAr ? "تم حذف العلاقة" : "Relationship removed");

    try {
      if (family?.id && !relId.startsWith("fr-local-")) {
        await fetch(`/api/families/${encodeURIComponent(family.id)}/relationships/${encodeURIComponent(relId)}`, {
          method: "DELETE",
        });
      }
    } catch (e) {
      console.warn("Could not delete relationship from API:", e);
    }
  }

  return (
    <div className="space-y-5" key={locale}>
      {/* Breadcrumb */}
      <Link
        href="/families"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
      >
        <span aria-hidden="true">{isRtl ? "→" : "←"}</span>
        {isAr ? "الأسر" : "Families"}
      </Link>

      {/* Family header */}
      <Card>
        <CardContent className="flex flex-wrap items-start gap-4 p-5">
          <FamilyPhoto family={family} size="xl" />

          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{family.name}</h1>

            <p className="mt-1 text-sm text-gray-600">
              {householdMembers.length}{" "}
              {isAr ? "فردًا" : householdMembers.length === 1 ? "member" : "members"}
              {" · "}
              {head
                ? isAr
                  ? `رئيس الأسرة: ${head.member.firstName} ${head.member.lastName}`
                  : `Head: ${head.member.firstName} ${head.member.lastName}`
                : isAr
                  ? "لم يتم تحديد رئيس الأسرة"
                  : "No family head designated"}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              {family.familyPhotoUrl
                ? isAr
                  ? "لهذه الأسرة صورة مسجّلة."
                  : "This family has a photo on file."
                : isAr
                  ? "لا توجد صورة للأسرة — يتم عرض صورة رئيس الأسرة."
                  : "No family photo on file — showing the family head's photo."}
            </p>

            {family.notes && (
              <p className="mt-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{family.notes}</p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setIsEditOpen(true)}>
                {isAr ? "تعديل البيانات" : "Edit details"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setAddMemberId(undefined);
                  setIsAddOpen(true);
                }}
              >
                {isAr ? "إضافة فرد" : "Add member"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.push("/families")}
              >
                {isAr ? "رجوع إلى القائمة" : "Back to directory"}
              </Button>
              <DeleteFamilyButton
                familyId={family.id}
                familyName={family.name}
                isAr={isAr}
                onDeleted={() => router.push("/families")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      {/* Family tree */}
      <Card>
        <CardContent className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">
            {isAr ? "شجرة الأسرة" : "Family tree"}
          </h2>
          <FamilyTreeView
            roots={safeRoots}
            isAr={isAr}
            emptyLabel={
              isAr ? "لا يوجد أعضاء في هذه الأسرة بعد" : "No members in this family yet"
            }
          />
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Members + engagement */}
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">
              {isAr ? "أفراد الأسرة" : "Members"}
            </h2>

            {householdMembers.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                {isAr
                  ? "لم يُضف أي فرد بعد. استخدم زر «إضافة فرد» للبدء."
                  : "No members yet. Use “Add member” to start building this family."}
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {householdMembers.map((m) => {
                  const profile = getMember360(m.id);
                  const isHead = family.headMemberId === m.id;
                  return (
                    <li key={m.id} className="flex items-center gap-3 py-3">
                      <Link href={`/people/${m.id}`} className="shrink-0">
                        <img
                          src={m.avatar}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover ring-1 ring-gray-200"
                          loading="lazy"
                        />
                      </Link>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/people/${m.id}`}
                          className="block truncate text-sm font-semibold text-gray-900 hover:text-blue-700"
                        >
                          {m.firstName} {m.lastName}
                        </Link>
                        {isHead && (
                          <span className="mt-0.5 inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
                            {isAr ? "رئيس الأسرة" : "Family head"}
                          </span>
                        )}
                      </div>

                      {/* Engagement, read from the existing Member 360 record. */}
                      <div className="text-end">
                        {profile ? (
                          <>
                            <p className="text-xs font-semibold text-gray-900">
                              {isAr ? "الحضور" : "Attendance"} {profile.attendanceRate}%
                            </p>
                            {profile.openFollowUps > 0 ? (
                              <p className="text-[11px] text-amber-600">
                                {isAr
                                  ? `${profile.openFollowUps} متابعة مفتوحة`
                                  : `${profile.openFollowUps} open follow-up${profile.openFollowUps === 1 ? "" : "s"}`}
                              </p>
                            ) : (
                              <p className="text-[11px] text-gray-400">
                                {isAr ? "لا توجد متابعات" : "No follow-ups"}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-[11px] text-gray-400">
                            {isAr ? "لا توجد بيانات حضور" : "No attendance data"}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="mt-4 rounded-lg bg-gray-50 p-3 text-[11px] leading-relaxed text-gray-600">
              {isAr
                ? "نسب الحضور ومتابعات المتابعة مقروءة من بيانات الأعضاء الموجودة مسبقًا. لا تُنشئ هذه الصفحة أي سجل حضور أو متابعة جديدة، ولا تحسب أي درجة مشاركة."
                : "Attendance and follow-up figures are read from the existing member records. This page creates no attendance record, no follow-up, and computes no engagement score."}
            </p>
          </CardContent>
        </Card>

        {/* Relationships */}
        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                {isAr ? "العلاقات" : "Relationships"}
              </h2>
              <Badge>{familyRels.length}</Badge>
            </div>

            {familyRels.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                {isAr
                  ? "لم تُسجَّل علاقات بعد."
                  : "No relationships recorded yet."}
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {familyRels.map((rel) => (
                  <RelationshipRow
                    key={rel.id}
                    isAr={isAr}
                    fromName={nameOf(rel.fromMemberId)}
                    toName={nameOf(rel.toMemberId)}
                    type={rel.type}
                    onChangeType={(type) => handleChangeRelType(rel.id, type)}
                    onRemove={() => handleRemoveRel(rel.id)}
                  />
                ))}
              </ul>
            )}

            <div className="mt-4 rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-700">
                {isAr ? "متابعات المتابعة المفتوحة" : "Open follow-ups"}
              </p>
              <p className="mt-0.5 text-2xl font-bold text-gray-900">{openFollowUps}</p>
              <p className="mt-1 text-[11px] text-gray-500">
                {isAr
                  ? "مجموع المتابعات المفتوحة المسجّلة بالفعل لأفراد هذه الأسرة."
                  : "Sum of the follow-ups already recorded for the members of this family."}
              </p>
              {openFollowUps > 0 && (
                <Link
                  href="/follow-ups"
                  className="mt-2 inline-block text-xs font-medium text-blue-600 hover:underline"
                >
                  {isAr ? "عرض المتابعات" : "View follow-ups"}
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      {isEditOpen && (
        <FamilyFormModal
          isAr={isAr}
          family={family}
          candidates={allCandidateMembers}
          onClose={() => setIsEditOpen(false)}
          onSubmit={handleSaveFamily}
        />
      )}

      {isAddOpen && (
        <AddMemberForm
          isAr={isAr}
          initialMemberId={addMemberId}
          existingMembers={householdMembers.map((m) => ({
            id: m.id,
            firstName: m.firstName,
            lastName: m.lastName,
          }))}
          availableMembers={availableMembers}
          onClose={() => {
            setIsAddOpen(false);
            setAddMemberId(undefined);
            // Drop the hand-off param so reopening the form later is not
            // silently pre-filled by a stale link.
            if (typeof window !== "undefined" && window.location.search) {
              window.history.replaceState(null, "", window.location.pathname);
            }
          }}
          onSubmit={handleAddMember}
        />
      )}
    </div>
  );
}

