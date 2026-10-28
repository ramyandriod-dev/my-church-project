"use client";

/**
 * Family Photo
 *
 * Shows the photo for a family, applying the one rule that matters here:
 *
 *   the family's own photo if it has one, otherwise the explicitly designated
 *   head member's avatar, otherwise a neutral placeholder.
 *
 * The fallback is taken from `headMemberId` and nothing else. It is never
 * guessed from a surname, from who happens to be first in the list, or from
 * who is a father — a family with no head simply gets the placeholder, which
 * is honest about the missing data.
 *
 * `isFallback` is exposed so callers can tell the user which photo they are
 * actually looking at, rather than presenting a member's face as if it were a
 * family portrait.
 */

import { getMockFamilyDisplayPhoto } from "@/lib/mock-data/families";
import type { Family } from "@/lib/backend/types";
import { mockPortrait } from "@/lib/avatars/mock-avatar";

interface FamilyPhotoProps {
  family: Family;
  size?: "sm" | "md" | "lg" | "xl";
  /** Renders the "no family photo on file" note beneath the image. */
  showFallbackNote?: boolean;
  isAr?: boolean;
  className?: string;
}

const SIZE_CLASSES = {
  sm: "w-9 h-9 rounded-lg",
  md: "w-10 h-10 rounded-xl",
  lg: "w-16 h-16 rounded-xl",
  xl: "w-24 h-24 rounded-2xl",
} as const;

const ICON_CLASSES = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
  xl: "w-10 h-10",
} as const;

export function FamilyPhoto({
  family,
  size = "md",
  showFallbackNote = false,
  isAr = false,
  className = "",
}: FamilyPhotoProps) {
  const { url: realUrl, isFallback } = getMockFamilyDisplayPhoto(family);
  // Demo data: with no photo on file, show a generated family portrait.
  const url = realUrl || mockPortrait(`family-${family.id}`, [family.name ?? family.id, `${family.id}-a`, `${family.id}-b`, `${family.id}-c`], 4);
  const frame = SIZE_CLASSES[size];

  return (
    <div className={className}>
      {url ? (
        <img
          src={url}
          alt=""
          className={`${frame} shrink-0 object-cover ring-1 ring-gray-200`}
          loading="lazy"
        />
      ) : (
        <div
          className={`${frame} flex shrink-0 items-center justify-center bg-gray-100 text-gray-400 ring-1 ring-gray-200`}
          aria-hidden="true"
        >
          <svg className={ICON_CLASSES[size]} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
      )}

      {showFallbackNote && isFallback && (
        <p className="mt-1 text-[11px] text-gray-500">
          {isAr
            ? "لا توجد صورة للأسرة — يتم عرض صورة رئيس الأسرة."
            : "No family photo on file — showing the family head's photo."}
        </p>
      )}
    </div>
  );
}
