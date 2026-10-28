"use client";

/**
 * Family Member Editor
 *
 * Adds a member to the household and edits the relationships already recorded,
 * on the Family 360 page.
 *
 * Relationship direction is the part that is easy to get wrong, so the form
 * makes it explicit rather than guessing:
 *
 *   - `father` / `mother` / `guardian` are stored parent-first, so the chosen
 *     person is the PARENT and the existing member is the child.
 *   - `child` is stored child-first, so the chosen person is the CHILD.
 *   - `spouse` / `sibling` / `other` have no direction, and the backend
 *     normalises them so a duplicate in the opposite order is still rejected.
 *
 * The labels above the inputs change with the selected type so the user is
 * never asked to reason about storage conventions.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { FamilyRelationshipType } from "@/lib/backend/types";

interface CandidateMember {
  id: string;
  firstName: string;
  lastName: string;
}

export interface AddMemberValues {
  memberId: string;
  type: FamilyRelationshipType;
  /** The member already in the family that the new relationship connects to. */
  relatedMemberId: string;
}

/** Types stored parent-first: the NEW member is the parent. */
const PARENT_FIRST: ReadonlySet<FamilyRelationshipType> = new Set([
  "father",
  "mother",
  "guardian",
]);

/** Types with no direction at all. */
const SYMMETRIC: ReadonlySet<FamilyRelationshipType> = new Set([
  "spouse",
  "sibling",
  "other",
]);

interface AddMemberFormProps {
  isAr: boolean;
  /** Members already in the family, excluding the one being added. */
  existingMembers: CandidateMember[];
  /** Members not yet in this family. */
  availableMembers: CandidateMember[];
  /**
   * Pre-selects a member, used when the user arrives from "Add to family" on
   * that person's Member 360 page.
   */
  initialMemberId?: string;
  onClose: () => void;
  onSubmit: (values: AddMemberValues) => void;
}

function typeLabel(type: FamilyRelationshipType, isAr: boolean): string {
  const map: Record<FamilyRelationshipType, [string, string]> = {
    father: ["Father of", "أب"],
    mother: ["Mother of", "أم"],
    guardian: ["Guardian of", "وصي على"],
    child: ["Child of", "ابن / ابنة"],
    spouse: ["Spouse of", "زوج / زوجة"],
    sibling: ["Sibling of", "أخ / أخت"],
    other: ["Other (e.g. non-blood relative)", "علاقة أخرى (مثل قريب غير دموي)"],
  };
  const pair = map[type];
  return isAr ? pair[1] : pair[0];
}

export function AddMemberForm({
  isAr,
  existingMembers,
  availableMembers,
  initialMemberId,
  onClose,
  onSubmit,
}: AddMemberFormProps) {
  const preselected = availableMembers.find((m) => m.id === initialMemberId);
  const [memberId, setMemberId] = useState(preselected?.id ?? availableMembers[0]?.id ?? "");
  const [type, setType] = useState<FamilyRelationshipType>("child");
  const [relatedMemberId, setRelatedMemberId] = useState(existingMembers[0]?.id ?? "");

  const newIsParent = PARENT_FIRST.has(type);
  const isSymmetric = SYMMETRIC.has(type);

  const newMemberLabel = isSymmetric
    ? isAr
      ? "الفرد المُضاف"
      : "Member being added"
    : newIsParent
      ? isAr
        ? "الفرد المُضاف (الوالد)"
        : "Member being added (the parent)"
      : isAr
        ? "الفرد المُضاف (الابن/الابنة)"
        : "Member being added (the child)";

  const existingMemberLabel = isSymmetric
    ? isAr
      ? "مرتبط بـ"
      : "Related to"
    : newIsParent
      ? isAr
        ? "الوالد / الوالدة"
        : "Parent of"
      : isAr
        ? "الوالد / الوالدة"
        : "Parent of";

  const canSubmit = Boolean(memberId && relatedMemberId && memberId !== relatedMemberId);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit({ memberId, type, relatedMemberId });
  }

  if (availableMembers.length === 0) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        role="dialog"
        aria-modal="true"
      >
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
          <h3 className="text-base font-bold text-gray-900">
            {isAr ? "إضافة فرد" : "Add a member"}
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {isAr
              ? "كل الأفراد المسجّلون في هذه الكنيسة هم بالفعل أعضاء في هذه الأسرة."
              : "Every person registered in this church is already in this family."}
          </p>
          <div className="mt-4 flex justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              {isAr ? "إغلاق" : "Close"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={isAr ? "إضافة فرد للأسرة" : "Add member to family"}
    >
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-base font-bold text-gray-900">
            {isAr ? "إضافة فرد للأسرة" : "Add member to family"}
          </h3>
          <button
            onClick={onClose}
            className="cursor-pointer text-gray-400 hover:text-gray-600"
            aria-label={isAr ? "إغلاق" : "Close"}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              {typeLabel(type, isAr)}
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as FamilyRelationshipType)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {(
                [
                  "child",
                  "father",
                  "mother",
                  "guardian",
                  "spouse",
                  "sibling",
                  "other",
                ] as FamilyRelationshipType[]
              ).map((t) => (
                <option key={t} value={t}>
                  {typeLabel(t, isAr)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              {newMemberLabel}
            </label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {availableMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              {existingMemberLabel}
            </label>
            <select
              value={relatedMemberId}
              onChange={(e) => setRelatedMemberId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {existingMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName}
                </option>
              ))}
            </select>
          </div>

          <p className="rounded-lg bg-gray-50 p-3 text-[11px] leading-relaxed text-gray-600">
            {isAr
              ? "يتم تخزين علاقة الأب/الأم/الوصي باتجاه الوالد أولًا، وعلاقة الابن باتجاه الابن أولًا. أما الزوج/الأخ/علاقة أخرى فلا اتجاه لها، وتُمنع التكرارات في الاتجاهين."
              : "Father, mother and guardian are stored parent-first; a child relationship is stored child-first. Spouse, sibling and other have no direction, and duplicates are rejected in either direction."}
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isAr ? "إضافة" : "Add member"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface RelationshipRowProps {
  isAr: boolean;
  fromName: string;
  toName: string;
  type: FamilyRelationshipType;
  onChangeType: (type: FamilyRelationshipType) => void;
  onRemove: () => void;
}

/**
 * One recorded relationship, with the two actions the spec requires:
 * change what the relationship is, and remove it.
 */
export function RelationshipRow({
  isAr,
  fromName,
  toName,
  type,
  onChangeType,
  onRemove,
}: RelationshipRowProps) {
  return (
    <li className="flex flex-wrap items-center gap-2 py-2 text-sm">
      <span className="font-medium text-gray-900">{fromName}</span>
      <span className="text-gray-400" aria-hidden="true">
        →
      </span>
      <span className="font-medium text-gray-900">{toName}</span>

      <select
        value={type}
        onChange={(e) => onChangeType(e.target.value as FamilyRelationshipType)}
        aria-label={isAr ? "نوع العلاقة" : "Relationship type"}
        className="ms-auto rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs"
      >
        {(
          [
            "father",
            "mother",
            "child",
            "spouse",
            "sibling",
            "guardian",
            "other",
          ] as FamilyRelationshipType[]
        ).map((t) => (
          <option key={t} value={t}>
            {typeLabel(t, isAr)}
          </option>
        ))}
      </select>

      <button
        onClick={onRemove}
        className="cursor-pointer rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
      >
        {isAr ? "إزالة" : "Remove"}
      </button>
    </li>
  );
}
