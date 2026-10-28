"use client";

/**
 * Family Chip
 *
 * A deliberately small, non-interactive indicator shown on the People page so
 * staff can see at a glance that a member belongs to a family.
 *
 * It shows the family's own photo when one exists, and the designated family
 * head's photo otherwise — the same fallback rule the Member 360 family
 * section uses, so the two never disagree.
 *
 * It is an indicator, not a control: the surrounding row or card keeps its
 * existing click behaviour, which is why this renders no link or button.
 */

import { getMockFamilyDisplayPhoto, getMockFamilyForMember } from "@/lib/mock-data/families";

interface FamilyChipProps {
  memberId: string;
  isAr: boolean;
  /** `sm` for dense table rows, `md` for grid cards. */
  size?: "sm" | "md";
}

export function FamilyChip({ memberId, isAr, size = "sm" }: FamilyChipProps) {
  const family = getMockFamilyForMember(memberId);
  if (!family) return null;

  const { url, isFallback } = getMockFamilyDisplayPhoto(family);
  const dimension = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const photoTitle = isFallback
    ? isAr
      ? "لا توجد صورة للأسرة — يتم عرض صورة رئيس الأسرة"
      : "No family photo — showing the family head"
    : isAr
      ? "صورة الأسرة"
      : "Family photo";

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-rose-50 ring-1 ring-rose-100 pl-0.5 pr-1.5 py-0.5 align-middle"
      title={`${family.name}${url ? ` — ${photoTitle}` : ""}`}
    >
      {url ? (
        <img src={url} alt="" className={`${dimension} rounded-full object-cover`} loading="lazy" />
      ) : (
        <span
          className={`${dimension} rounded-full bg-rose-100 text-rose-500 flex items-center justify-center`}
          aria-hidden="true"
        >
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </span>
      )}
      <span className="text-[10px] font-medium text-rose-700 max-w-[7rem] truncate">
        {family.name}
      </span>
    </span>
  );
}
