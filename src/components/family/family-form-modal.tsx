"use client";

/**
 * Family Form Modal
 *
 * Create or edit a family: name, designated head, family photo URL and notes.
 *
 * The head is a required, explicit choice for a new family. It is never
 * inferred from the household contents, because "head of family" is a
 * designation rather than a fact that can be read off a relationship graph —
 * a single mother is a perfectly valid head.
 *
 * A real deployment would upload the photo through the church media library
 * and pass the resulting URL here. Until that upload pipeline exists this form
 * accepts a URL, which is the same field the `Family.familyPhotoUrl` column
 * stores; nothing about the family record changes when the uploader arrives.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Ltr } from "@/lib/i18n";
import type { Family } from "@/lib/backend/types";

export interface FamilyFormValues {
  name: string;
  headMemberId: string | null;
  familyPhotoUrl: string | null;
  notes: string | null;
}

interface CandidateMember {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

interface FamilyFormModalProps {
  isAr: boolean;
  /** Absent when creating, present when editing. */
  family?: Family;
  /** Members who can be chosen as head. */
  candidates: CandidateMember[];
  onClose: () => void;
  onSubmit: (values: FamilyFormValues) => void;
}

export function FamilyFormModal({
  isAr,
  family,
  candidates,
  onClose,
  onSubmit,
}: FamilyFormModalProps) {
  const [name, setName] = useState(family?.name ?? "");
  const [headMemberId, setHeadMemberId] = useState<string>(family?.headMemberId ?? "");
  const [familyPhotoUrl, setFamilyPhotoUrl] = useState(family?.familyPhotoUrl ?? "");
  const [notes, setNotes] = useState(family?.notes ?? "");

  const trimmedName = name.trim();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!trimmedName) return;
    onSubmit({
      name: trimmedName,
      headMemberId: headMemberId || null,
      familyPhotoUrl: familyPhotoUrl.trim() || null,
      notes: notes.trim() || null,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={isAr ? "بيانات الأسرة" : "Family details"}
    >
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-base font-bold text-gray-900">
            {family
              ? isAr
                ? "تعديل بيانات الأسرة"
                : "Edit family"
              : isAr
                ? "أسرة جديدة"
                : "New family"}
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
              {isAr ? "اسم الأسرة" : "Family name"} *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isAr ? "مثال: أسرة ويليامز" : "e.g. Williams Family"}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              {isAr ? "رئيس الأسرة" : "Head of family"}
            </label>
            <select
              value={headMemberId}
              onChange={(e) => setHeadMemberId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="">{isAr ? "— غير محدد —" : "— Not set —"}</option>
              {candidates.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-gray-500">
              {isAr
                ? "رئيس الأسرة تعيين صريح، ولا يُستنتج من كونه الأب."
                : "The head is an explicit designation. It is never inferred from being a father."}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              {isAr ? "رابط صورة الأسرة" : "Family photo URL"}
            </label>
            <Ltr className="w-full">
              <input
                type="url"
                dir="ltr"
                value={familyPhotoUrl ?? ""}
                onChange={(e) => setFamilyPhotoUrl(e.target.value)}
                placeholder="https://…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 ltr-input"
              />
            </Ltr>
            <p className="mt-1 text-[11px] text-gray-500">
              {isAr
                ? "عند تركه فارغًا يتم استخدام صورة رئيس الأسرة كبديل."
                : "Leave empty to fall back to the head member's avatar."}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              {isAr ? "ملاحظات" : "Notes"}
            </label>
            <textarea
              value={notes ?? ""}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button type="submit" disabled={!trimmedName}>
              {family ? (isAr ? "حفظ" : "Save changes") : isAr ? "إنشاء" : "Create family"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
