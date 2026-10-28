"use client";

/**
 * Family Section
 *
 * Renders the family tree for the member whose Member 360 page is open.
 *
 * Because the family is resolved from the relationship graph rather than from
 * a field on the member, opening the father, the mother or a child all render
 * the same family. The currently opened member is highlighted and labelled,
 * and every other node links to that person's own Member 360 page.
 *
 * Layout is generation-based: top generation first, children beneath their
 * parents, with connector lines. It collapses to a single column on mobile so
 * the tree stays readable on a phone.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FamilyNodeCard } from "@/components/family/family-node-card";
import { useLanguage } from "@/lib/i18n";
import { mockFamilies } from "@/lib/mock-data/families";
import type { FamilyTree, FamilyTreeNode, FamilyRelationship, FamilyRelationshipType } from "@/lib/backend/types";
import { publishLocalRealtime } from "@/lib/realtime/local-broadcast";

interface FamilySectionProps {
  tree: FamilyTree | null;
  /** The member whose profile is open, used by the "add to family" action. */
  memberId?: string;
  /** Callback to reload Member 360 data when relationships or family members are edited. */
  onRefresh?: () => void | Promise<void>;
  /**
   * Callback used after a member-info correction (name/phone), which still has
   * to refresh the member record that backs the Member 360 header, not just
   * the family tree. Falls back to `onRefresh` when omitted.
   */
  onMemberEditRefresh?: () => void | Promise<void>;
}

export function FamilySection({ tree, memberId, onRefresh, onMemberEditRefresh }: FamilySectionProps) {
  const { locale } = useLanguage();
  const isAr = locale === "ar";
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { displayPhotoUrl, isPhotoFallback } = tree ?? {};

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-50 rounded-lg">
              <svg className="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900">
              {isAr ? "الأسرة" : "Family"}
            </h3>
          </div>

          {tree && (
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors shadow-2xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>{isAr ? "تعديل العلاقات والأسرة" : "Edit Family & Relations"}</span>
            </button>
          )}
        </CardHeader>

        <CardContent>
          {!tree ? (
            <EmptyState isAr={isAr} memberId={memberId} onRefresh={onRefresh} />
          ) : (
            <div className="space-y-5">
              <FamilyHeader
                tree={tree}
                isAr={isAr}
                photoUrl={displayPhotoUrl ?? null}
                isPhotoFallback={isPhotoFallback ?? false}
                onOpenEdit={() => setIsEditModalOpen(true)}
              />

              {tree.roots.length === 0 ? (
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-center space-y-2">
                  <p className="text-sm text-gray-600">
                    {isAr
                      ? "لا توجد علاقات مسجلة لهذه الأسرة بعد."
                      : "No relationships have been recorded for this family yet."}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 inline-flex items-center gap-1"
                  >
                    <span>{isAr ? "+ إضافة علاقة جديدة" : "+ Add Relationship"}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {tree.roots.map((root) => (
                    <GenerationBranch key={root.member.id} root={root} isAr={isAr} depth={0} />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Family & Relationship Edit Modal */}
      {isEditModalOpen && tree && (
        <EditFamilyModal
          tree={tree}
          isAr={isAr}
          onClose={() => setIsEditModalOpen(false)}
          onRefresh={onRefresh}
          onMemberEditRefresh={onMemberEditRefresh}
        />
      )}
    </>
  );
}

// ─── Header ──────────────────────────────────────────────────

function FamilyHeader({
  tree,
  isAr,
  photoUrl,
  isPhotoFallback,
  onOpenEdit,
}: {
  tree: FamilyTree;
  isAr: boolean;
  photoUrl: string | null;
  isPhotoFallback: boolean;
  onOpenEdit: () => void;
}) {
  const head = tree.head;
  const memberCount = tree.members.length;

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-br from-rose-50 to-orange-50 ring-1 ring-rose-100">
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              className="w-14 h-14 rounded-xl object-cover ring-2 ring-white shadow-sm"
              loading="lazy"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-white/70 text-rose-400 ring-2 ring-white flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 truncate">{tree.family.name}</p>
          <p className="text-xs text-gray-600">
            {isAr
              ? `${memberCount} أفراد — ${head ? `رئيس الأسرة: ${head.member.firstName} ${head.member.lastName}` : "لم يتم تحديد رئيس الأسرة"}`
              : `${memberCount} member${memberCount === 1 ? "" : "s"} — ${
                  head
                    ? `Head: ${head.member.firstName} ${head.member.lastName}`
                    : "No family head designated"
                }`}
          </p>
          {isPhotoFallback && (
            <p className="mt-0.5 text-[11px] text-gray-500">
              {isAr
                ? "لا توجد صورة للأسرة — يتم عرض صورة رئيس الأسرة."
                : "No family photo on file — showing the family head's photo."}
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenEdit}
        className="shrink-0 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-100/70 border border-rose-200 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
        <span>{isAr ? "تعديل" : "Edit"}</span>
      </button>
    </div>
  );
}

// ─── Tree rendering ──────────────────────────────────────────

/**
 * One branch: the parent unit (plus its spouse when present) and the
 * generations below it. Connector lines are drawn with plain borders so the
 * layout works without any JS measurement.
 */
function GenerationBranch({
  root,
  isAr,
  depth,
}: {
  root: FamilyTreeNode;
  isAr: boolean;
  depth: number;
}) {
  const hasChildren = root.children.length > 0;

  return (
    <div className={depth > 0 ? "pl-4 sm:pl-8" : ""}>
      <div className="flex flex-wrap items-stretch gap-3">
        <div className="flex items-stretch gap-3">
          <FamilyNodeCard node={root} isAr={isAr} />
          {root.spouse && (
            <>
              {/* Connector between partners. */}
              <div
                className="hidden sm:flex items-center px-0.5 text-rose-300"
                aria-hidden="true"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeWidth={2} d="M8 12h8" />
                </svg>
              </div>
              <FamilyNodeCard node={root.spouse} isAr={isAr} asSpouse />
            </>
          )}
        </div>
      </div>

      {hasChildren && (
        <div className="mt-3 ml-5 sm:ml-6 pl-4 sm:pl-5 border-l-2 border-rose-100 space-y-4">
          {root.children.map((child) => (
            <GenerationBranch key={child.member.id} root={child} isAr={isAr} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────

/**
 * Shown when the member is not part of any family yet.
 *
 * The action deliberately routes to Family 360 rather than opening a second
 * relationship form here: Family 360 already owns the "add member" flow, and a
 * single form is the only way to guarantee the same relationship-orientation
 * and duplicate checks apply no matter which screen the action was started
 * from. The chooser only decides WHICH family to add the person to.
 */
function EmptyState({
  isAr,
  memberId,
  onRefresh,
}: {
  isAr: boolean;
  memberId?: string;
  onRefresh?: () => void | Promise<void>;
}) {
  const [isChoosing, setIsChoosing] = useState(false);
  const [familiesList, setFamiliesList] = useState(mockFamilies);

  useEffect(() => {
    let active = true;
    fetch("/api/families?view=directory")
      .then((res) => res.json())
      .then((json) => {
        if (json?.data && Array.isArray(json.data) && active) {
          const dbFams = json.data.map((f: any) => ({
            id: f.id,
            tenantId: f.tenantId || "church-paris",
            name: f.name,
            headMemberId: f.headMemberId || null,
            familyPhotoUrl: f.familyPhotoUrl || null,
            notes: f.notes || null,
            createdAt: f.createdAt || new Date().toISOString(),
            updatedAt: f.updatedAt || new Date().toISOString(),
          }));
          const merged = [...dbFams];
          for (const mf of mockFamilies) {
            if (!merged.some((m) => m.id === mf.id)) {
              merged.push(mf);
            }
          }
          setFamiliesList(merged);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-300">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a3 3 0 11-4 0 2 3 0 014 0zM7 10a3 3 0 11-4 0 2 3 0 014 0z"
          />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-700">
        {isAr ? "لا توجد أسرة مرتبطة" : "No family linked yet"}
      </p>
      <p className="mt-1 max-w-xs text-xs text-gray-500">
        {isAr
          ? "اربط هذا العضو بأسرة لعرض شجرة العائلة هنا."
          : "Link this member to a family to see the family tree here."}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => setIsChoosing((v) => !v)}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
        >
          {isAr ? "إضافة إلى أسرة" : "Add to family"}
        </button>
        <Link
          href="/families"
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          {isAr ? "إنشاء أسرة جديدة" : "Create new family"}
        </Link>
      </div>

      {isChoosing && (
        <ul className="mt-3 w-full max-w-xs space-y-1 text-start">
          {familiesList.map((f) => (
            <li key={f.id}>
              <Link
                href={memberId ? `/families/${f.id}?add=${memberId}` : `/families/${f.id}`}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-800 hover:bg-gray-50"
              >
                <span className="truncate">{f.name}</span>
                <span className="text-gray-400" aria-hidden="true">
                  {isAr ? "←" : "→"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Edit Family & Relationships Modal ────────────────────────

interface EditFamilyModalProps {
  tree: FamilyTree;
  isAr: boolean;
  onClose: () => void;
  onRefresh?: () => void | Promise<void>;
  onMemberEditRefresh?: () => void | Promise<void>;
}

function EditFamilyModal({
  tree,
  isAr,
  onClose,
  onRefresh,
  onMemberEditRefresh,
}: EditFamilyModalProps) {
  const familyId = tree.family.id;
  const [activeTab, setActiveTab] = useState<"relationships" | "members">("relationships");
  const [relationships, setRelationships] = useState<FamilyRelationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Designated head state
  const [currentHeadId, setCurrentHeadId] = useState<string>(tree.family.headMemberId || "");
  const [isUpdatingHead, setIsUpdatingHead] = useState(false);

  // Add relationship form state
  const [newFromId, setNewFromId] = useState<string>(tree.roots[0]?.member.id || tree.members[0]?.member.id || "");
  const [newToId, setNewToId] = useState<string>(tree.members[1]?.member.id || "");
  const [newType, setNewType] = useState<FamilyRelationshipType>("child");
  const [isAddingRel, setIsAddingRel] = useState(false);

  // Edit member info state
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState<{ firstName: string; lastName: string; phone: string }>({
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [isSavingMember, setIsSavingMember] = useState(false);

  // Load existing relationships
  const loadRelationships = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/families/${encodeURIComponent(familyId)}/relationships`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          setRelationships(json.data);
          return;
        }
      }
      // Fallback from tree
      const fromTree = tree.members.flatMap((m) => m.relationships || []);
      const unique = Array.from(new Map(fromTree.map((r) => [r.id, r])).values());
      setRelationships(unique);
    } catch {
      const fromTree = tree.members.flatMap((m) => m.relationships || []);
      const unique = Array.from(new Map(fromTree.map((r) => [r.id, r])).values());
      setRelationships(unique);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRelationships();
  }, [familyId]);

  const memberMap = new Map<string, { firstName: string; lastName: string; avatarUrl: string | null; phone: string | null }>();
  for (const node of tree.members) {
    memberMap.set(node.member.id, {
      firstName: node.member.firstName,
      lastName: node.member.lastName,
      avatarUrl: node.avatarUrl,
      phone: node.member.phone || null,
    });
  }

  const getMemberName = (id: string) => {
    const mem = memberMap.get(id);
    if (!mem) return id;
    return `${mem.firstName} ${mem.lastName}`.trim();
  };

  const getRelLabel = (type: string) => {
    switch (type) {
      case "father":
        return isAr ? "أب لـ" : "Father of";
      case "mother":
        return isAr ? "أم لـ" : "Mother of";
      case "child":
        return isAr ? "ابن / ابنة لـ" : "Child of";
      case "spouse":
        return isAr ? "زوج / زوجة لـ" : "Spouse of";
      case "sibling":
        return isAr ? "أخ / أخت لـ" : "Sibling of";
      case "guardian":
        return isAr ? "وصي على" : "Guardian of";
      default:
        return isAr ? "صلة قرابة أخرى لـ" : "Other relative of";
    }
  };

  // Change relationship type
  const handleUpdateRelType = async (relId: string, type: FamilyRelationshipType) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(
        `/api/families/${encodeURIComponent(familyId)}/relationships/${encodeURIComponent(relId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type }),
        }
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error?.message || "Failed to update relationship");
      }
      setRelationships((prev) =>
        prev.map((r) => (r.id === relId ? { ...r, type } : r))
      );
      setSuccessMsg(isAr ? "تم تحديث صلة القرابة بنجاح" : "Relationship updated successfully");
      await onRefresh?.();
      publishLocalRealtime({
        type: "member.profile_updated",
        data: { familyId, timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? "فشل تحديث صلة القرابة" : "Failed to update relationship"));
    }
  };

  // Delete relationship
  const handleDeleteRel = async (relId: string) => {
    if (!confirm(isAr ? "هل أنت متأكد من حذف هذه الصلة بين العضوين؟" : "Are you sure you want to remove this relationship?")) {
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(
        `/api/families/${encodeURIComponent(familyId)}/relationships/${encodeURIComponent(relId)}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error?.message || "Failed to delete relationship");
      }
      setRelationships((prev) => prev.filter((r) => r.id !== relId));
      setSuccessMsg(isAr ? "تم حذف صلة القرابة بنجاح" : "Relationship removed successfully");
      await onRefresh?.();
      publishLocalRealtime({
        type: "member.profile_updated",
        data: { familyId, timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? "فشل حذف صلة القرابة" : "Failed to delete relationship"));
    }
  };

  // Add new relationship
  const handleAddRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFromId || !newToId || newFromId === newToId) {
      setErrorMsg(isAr ? "يرجى اختيار عضوين مختلفين لربط العلاقة" : "Please select two different members");
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsAddingRel(true);
    try {
      const res = await fetch(
        `/api/families/${encodeURIComponent(familyId)}/relationships`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromMemberId: newFromId,
            toMemberId: newToId,
            type: newType,
          }),
        }
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error?.message || "Failed to create relationship");
      }
      const created = await res.json();
      if (created?.data) {
        setRelationships((prev) => [...prev, created.data]);
      } else {
        await loadRelationships();
      }
      setSuccessMsg(isAr ? "تمت إضافة صلة القرابة بنجاح" : "Relationship added successfully");
      await onRefresh?.();
      publishLocalRealtime({
        type: "member.profile_updated",
        data: { familyId, timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? "فشل إنشاء صلة القرابة" : "Failed to add relationship"));
    } finally {
      setIsAddingRel(false);
    }
  };

  // Set Head of Family
  const handleSaveHead = async () => {
    if (!currentHeadId) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsUpdatingHead(true);
    try {
      const res = await fetch(`/api/families/${encodeURIComponent(familyId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headMemberId: currentHeadId }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error?.message || "Failed to update family head");
      }
      setSuccessMsg(isAr ? "تم تعيين رئيس الأسرة بنجاح" : "Family head updated successfully");
      await onRefresh?.();
      publishLocalRealtime({
        type: "member.profile_updated",
        data: { familyId, timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? "فشل تعيين رئيس الأسرة" : "Failed to update family head"));
    } finally {
      setIsUpdatingHead(false);
    }
  };

  // Save Member Details (First/Last name & phone correction)
  const handleSaveMemberInfo = async (mId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSavingMember(true);
    try {
      const payload: any = {
        firstName: memberForm.firstName.trim(),
        lastName: memberForm.lastName.trim(),
        phone: memberForm.phone.trim() || null,
      };
      const res = await fetch(`/api/members/${encodeURIComponent(mId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error?.message || "Failed to update member information");
      }
      setSuccessMsg(isAr ? "تم تحديث بيانات العضو بنجاح" : "Member information updated successfully");
      setEditingMemberId(null);
      await (onMemberEditRefresh ?? onRefresh)?.();
      publishLocalRealtime({
        type: "member.profile_updated",
        data: { memberId: mId, familyId, timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? "فشل تحديث بيانات العضو" : "Failed to update member info"));
    } finally {
      setIsSavingMember(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-rose-50 to-orange-50 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white text-rose-600 rounded-xl shadow-2xs border border-rose-100">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">
                {isAr ? "إدارة علاقات وأفراد الأسرة" : "Manage Family & Relationships"}
              </h3>
              <p className="text-xs text-rose-700 font-medium">
                {tree.family.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white/80 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Status Messages */}
        {errorMsg && (
          <div className="mx-5 mt-3 p-3 text-xs bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg(null)} className="text-red-500 font-bold">✕</button>
          </div>
        )}
        {successMsg && (
          <div className="mx-5 mt-3 p-3 text-xs bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 flex items-center justify-between">
            <span>{successMsg}</span>
            <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-500 font-bold">✕</button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="px-5 pt-3 border-b border-gray-100 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("relationships")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === "relationships"
                ? "border-rose-600 text-rose-700"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            {isAr
              ? `العلاقات الأسرية (${relationships.length})`
              : `Relationships (${relationships.length})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("members")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === "members"
                ? "border-rose-600 text-rose-700"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            {isAr
              ? `أفراد الأسرة وتصحيح البيانات (${tree.members.length})`
              : `Members & Data Corrections (${tree.members.length})`}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {activeTab === "relationships" && (
            <div className="space-y-5">
              {/* Existing Relationships List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-gray-800">
                    {isAr ? "العلاقات المسجلة حالياً:" : "Current Family Relationships:"}
                  </h4>
                  <span className="text-[11px] text-gray-400">
                    {isAr ? "يمكنك تغيير صلة القرابة أو حذف العلاقة" : "Change relationship type or remove"}
                  </span>
                </div>

                {isLoading ? (
                  <div className="p-6 text-center text-xs text-gray-400">
                    {isAr ? "جاري تحميل العلاقات..." : "Loading relationships..."}
                  </div>
                ) : relationships.length === 0 ? (
                  <div className="p-4 rounded-xl bg-gray-50 text-center text-xs text-gray-500 border border-gray-200">
                    {isAr
                      ? "لا توجد علاقات مسجلة بعد. استخدم النموذج بالأسفل لربط أفراد الأسرة."
                      : "No relationships recorded yet. Use the form below to link family members."}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden text-xs bg-white shadow-2xs">
                    {relationships.map((rel) => {
                      const fromName = getMemberName(rel.fromMemberId);
                      const toName = getMemberName(rel.toMemberId);

                      return (
                        <div
                          key={rel.id}
                          className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="font-bold text-gray-900 truncate">{fromName}</span>
                            <span className="text-rose-500 font-bold shrink-0">→</span>
                            <span className="font-bold text-gray-900 truncate">{toName}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={rel.type}
                              onChange={(e) =>
                                void handleUpdateRelType(rel.id, e.target.value as FamilyRelationshipType)
                              }
                              className="px-2.5 py-1 text-xs font-semibold bg-rose-50/60 border border-rose-200 rounded-lg text-rose-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
                            >
                              <option value="father">{isAr ? "أب لـ" : "Father of"}</option>
                              <option value="mother">{isAr ? "أم لـ" : "Mother of"}</option>
                              <option value="child">{isAr ? "ابن / ابنة لـ" : "Child of"}</option>
                              <option value="spouse">{isAr ? "زوج / زوجة لـ" : "Spouse of"}</option>
                              <option value="sibling">{isAr ? "أخ / أخت لـ" : "Sibling of"}</option>
                              <option value="guardian">{isAr ? "وصي على" : "Guardian of"}</option>
                              <option value="other">{isAr ? "صلة أخرى لـ" : "Other relative of"}</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => void handleDeleteRel(rel.id)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title={isAr ? "حذف العلاقة" : "Delete Relationship"}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add New Relationship Form */}
              <form onSubmit={handleAddRelationship} className="p-4 rounded-xl bg-rose-50/50 border border-rose-200/80 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                  <span>+</span>
                  <span>{isAr ? "إضافة صلة قرابة جديدة بين فردين" : "Add New Relationship Link"}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      {isAr ? "الطرف الأول (من):" : "First Member (From):"}
                    </label>
                    <select
                      value={newFromId}
                      onChange={(e) => setNewFromId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-rose-200 rounded-lg font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    >
                      {tree.members.map((m) => (
                        <option key={m.member.id} value={m.member.id}>
                          {m.member.firstName} {m.member.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      {isAr ? "نوع الصلة:" : "Relationship Type:"}
                    </label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as FamilyRelationshipType)}
                      className="w-full px-2.5 py-1.5 bg-white border border-rose-200 rounded-lg font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    >
                      <option value="father">{isAr ? "أب لـ" : "Father of"}</option>
                      <option value="mother">{isAr ? "أم لـ" : "Mother of"}</option>
                      <option value="child">{isAr ? "ابن / ابنة لـ" : "Child of"}</option>
                      <option value="spouse">{isAr ? "زوج / زوجة لـ" : "Spouse of"}</option>
                      <option value="sibling">{isAr ? "أخ / أخت لـ" : "Sibling of"}</option>
                      <option value="guardian">{isAr ? "وصي على" : "Guardian of"}</option>
                      <option value="other">{isAr ? "صلة أخرى لـ" : "Other relative of"}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      {isAr ? "الطرف الثاني (إلى):" : "Second Member (To):"}
                    </label>
                    <select
                      value={newToId}
                      onChange={(e) => setNewToId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-rose-200 rounded-lg font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    >
                      <option value="">{isAr ? "-- اختر العضو --" : "-- Select Member --"}</option>
                      {tree.members.map((m) => (
                        <option key={m.member.id} value={m.member.id}>
                          {m.member.firstName} {m.member.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isAddingRel || !newFromId || !newToId || newFromId === newToId}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
                  >
                    {isAddingRel ? (
                      <span>{isAr ? "جاري الإضافة..." : "Adding..."}</span>
                    ) : (
                      <span>{isAr ? "إضافة العلاقة ✓" : "Add Relationship ✓"}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "members" && (
            <div className="space-y-5">
              {/* Head Member Selector Card */}
              <div className="p-4 rounded-xl bg-orange-50/60 border border-orange-200/80 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">👑</span>
                  <h4 className="text-xs font-bold text-orange-950">
                    {isAr ? "تعيين رئيس الأسرة (Family Head)" : "Designated Family Head"}
                  </h4>
                </div>
                <p className="text-[11px] text-orange-800">
                  {isAr
                    ? "رئيس الأسرة يظهر في أعلى الشجرة ويُمثل الأسرة في السجلات الرسمية للكنيسة."
                    : "The family head is anchored at the top of the tree and represents the household in church records."}
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <select
                    value={currentHeadId}
                    onChange={(e) => setCurrentHeadId(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs font-semibold bg-white border border-orange-200 rounded-lg text-gray-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="">{isAr ? "-- لم يتم التحديد --" : "-- None Designated --"}</option>
                    {tree.members.map((m) => (
                      <option key={m.member.id} value={m.member.id}>
                        {m.member.firstName} {m.member.lastName}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => void handleSaveHead()}
                    disabled={isUpdatingHead || currentHeadId === (tree.family.headMemberId || "")}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded-lg shadow-2xs transition-colors shrink-0"
                  >
                    {isUpdatingHead ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ رئيس الأسرة" : "Set as Head")}
                  </button>
                </div>
              </div>

              {/* Members List with Edit Option */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-gray-800">
                    {isAr ? "بيانات أفراد الأسرة وتصحيح الأخطاء:" : "Family Members & Data Corrections:"}
                  </h4>
                  <span className="text-[11px] text-gray-400">
                    {isAr ? "تصحيح الاسم أو رقم الهاتف المحمول" : "Correct typo in name or phone"}
                  </span>
                </div>

                <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden text-xs bg-white shadow-2xs">
                  {tree.members.map((node) => {
                    const m = node.member;
                    const isEditing = editingMemberId === m.id;
                    const isHead = tree.family.headMemberId === m.id;

                    return (
                      <div key={m.id} className="p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-rose-50 text-rose-700 font-bold flex items-center justify-center shrink-0 border border-rose-100">
                              {m.firstName.charAt(0) || "👤"}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-gray-900 truncate flex items-center gap-1.5">
                                <span>{m.firstName} {m.lastName}</span>
                                {isHead && (
                                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">
                                    👑 {isAr ? "رئيس الأسرة" : "Head"}
                                  </span>
                                )}
                                {node.isFocal && (
                                  <span className="text-[10px] text-gray-400 font-normal">
                                    ({isAr ? "الملف المفتوح" : "Active Profile"})
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-gray-500 truncate">
                                {m.phone || (isAr ? "بدون هاتف" : "No phone")} {node.relationshipToFocal ? `— ${node.relationshipToFocal}` : ""}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (isEditing) {
                                setEditingMemberId(null);
                              } else {
                                setEditingMemberId(m.id);
                                setMemberForm({
                                  firstName: m.firstName,
                                  lastName: m.lastName,
                                  phone: m.phone || "",
                                });
                              }
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors shrink-0"
                          >
                            {isEditing ? (isAr ? "إلغاء" : "Cancel") : (isAr ? "تعديل البيانات" : "Edit Details")}
                          </button>
                        </div>

                        {/* Inline Edit Form for this member */}
                        {isEditing && (
                          <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-200/70 space-y-2.5 animate-in fade-in duration-150">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">
                                  {isAr ? "الاسم الأول:" : "First Name:"}
                                </label>
                                <input
                                  type="text"
                                  value={memberForm.firstName}
                                  onChange={(e) => setMemberForm((prev) => ({ ...prev, firstName: e.target.value }))}
                                  className="w-full px-2.5 py-1 text-xs bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">
                                  {isAr ? "اسم العائلة:" : "Last Name:"}
                                </label>
                                <input
                                  type="text"
                                  value={memberForm.lastName}
                                  onChange={(e) => setMemberForm((prev) => ({ ...prev, lastName: e.target.value }))}
                                  className="w-full px-2.5 py-1 text-xs bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">
                                  {isAr ? "رقم الهاتف المحمول:" : "Mobile Phone:"}
                                </label>
                                <input
                                  type="tel"
                                  value={memberForm.phone}
                                  onChange={(e) => setMemberForm((prev) => ({ ...prev, phone: e.target.value }))}
                                  className="w-full px-2.5 py-1 text-xs bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                                  placeholder="012xxxxxxxx"
                                />
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingMemberId(null)}
                                className="px-2.5 py-1 text-xs font-semibold text-gray-600 hover:text-gray-900"
                              >
                                {isAr ? "إلغاء" : "Cancel"}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleSaveMemberInfo(m.id)}
                                disabled={isSavingMember || !memberForm.firstName.trim()}
                                className="px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg shadow-2xs transition-colors"
                              >
                                {isSavingMember ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ التغييرات ✓" : "Save Changes ✓")}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[11px] text-gray-500">
            {isAr
              ? "يتم تحديث شجرة العائلة فورياً عند حفظ أي تعديل."
              : "Family tree updates in real-time as changes are saved."}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 bg-gray-100 rounded-lg transition-colors"
          >
            {isAr ? "إغلاق" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
