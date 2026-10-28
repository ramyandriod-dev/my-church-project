"use client";

/**
 * Family Node Card
 *
 * One member inside a family tree. The card is a link to that member's own
 * Member 360 page, so the tree is navigable in both directions.
 *
 * The member whose profile is currently open is visually highlighted, and the
 * head of the family carries a distinct badge. The head badge comes only from
 * an explicit designation, never from being a father.
 */

import Link from "next/link";
import { Ltr } from "@/lib/i18n";
import type { FamilyTreeNode } from "@/lib/backend/types";

interface FamilyNodeCardProps {
  node: FamilyTreeNode;
  isAr: boolean;
  /** Renders the card as a spouse sitting next to its partner. */
  asSpouse?: boolean;
}

const RING_BY_RELATIONSHIP: Record<string, string> = {
  spouse: "ring-rose-200",
  sibling: "ring-violet-200",
  parent: "ring-amber-200",
  guardian: "ring-amber-200",
  grandparent: "ring-amber-100",
  "great-grandparent": "ring-amber-100",
  "aunt / uncle": "ring-amber-100",
  "great-aunt / great-uncle": "ring-amber-100",
  child: "ring-sky-200",
  grandchild: "ring-sky-100",
  "great-grandchild": "ring-sky-100",
  "niece / nephew": "ring-sky-100",
  cousin: "ring-sky-100",
  "second cousin": "ring-sky-100",
  "parent-in-law": "ring-rose-100",
  "sibling-in-law": "ring-rose-100",
  "child-in-law": "ring-rose-100",
  inlaw: "ring-rose-100",
};

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function FamilyNodeCard({ node, isAr, asSpouse = false }: FamilyNodeCardProps) {
  const { member } = node;
  const fullName = `${member.firstName} ${member.lastName}`;

  return (
    <Link
      href={`/people/${member.id}`}
      className={[
        "group relative flex items-center gap-3 rounded-xl border bg-white p-3 transition-all",
        "hover:shadow-md hover:border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        asSpouse ? "min-w-0 flex-1" : "w-56",
        node.isFocal
          ? "border-blue-500 ring-2 ring-blue-500/70 bg-blue-50/60 shadow-sm"
          : "border-gray-200 shadow-xs",
      ].join(" ")}
      aria-current={node.isFocal ? "true" : undefined}
    >
      {/* Avatar. The member's own photo; the family photo is shown on the
          section header rather than duplicated onto every card. */}
      <div className="relative shrink-0">
        {node.avatarUrl ? (
          <img
            src={node.avatarUrl}
            alt=""
            className={[
              "w-11 h-11 rounded-full object-cover ring-2",
              node.isFocal ? "ring-blue-500" : RING_BY_RELATIONSHIP[node.relationshipToFocal] ?? "ring-gray-200",
            ].join(" ")}
            loading="lazy"
          />
        ) : (
          <div
            className={[
              "w-11 h-11 rounded-full bg-gray-100 text-gray-500 ring-2 flex items-center justify-center text-xs font-semibold",
              node.isFocal ? "ring-blue-500" : RING_BY_RELATIONSHIP[node.relationshipToFocal] ?? "ring-gray-200",
            ].join(" ")}
            aria-hidden="true"
          >
            {initials(member.firstName, member.lastName)}
          </div>
        )}

        {node.isFocal && (
          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-500 ring-2 ring-white" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">{fullName}</p>
        <p className="truncate text-xs text-gray-500">
          {node.isFocal
            ? isAr
              ? "أنت تشاهد هذا الملف"
              : "Viewing this profile"
            : isAr
              ? tRelationshipAr(node.relationshipToFocal)
              : node.relationshipToFocal}
        </p>

        {node.isFamilyHead && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
            <svg className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M10 1l2.4 5.6 6.1.5-4.6 4 1.4 5.9L10 14.1 4.7 17l1.4-5.9-4.6-4 6.1-.5L10 1z" />
            </svg>
            {isAr ? "رئيس الأسرة" : "Family head"}
          </span>
        )}
      </div>
    </Link>
  );
}

/** Arabic labels for the relationship vocabulary. */
function tRelationshipAr(key: string): string {
  const map: Record<string, string> = {
    self: "أنت",
    spouse: "الزوج / الزوجة",
    sibling: "الأخ / الأخت",
    parent: "الوالد",
    guardian: "الوصي",
    child: "الابن / الابنة",
    grandparent: "الجد / الجدة",
    "great-grandparent": "الجد الأكبر / الجدة الكبرى",
    grandchild: "الحفيد / الحفيدة",
    "great-grandchild": "الحفيد الأكبر",
    "aunt / uncle": "العم / العمة",
    "great-aunt / great-uncle": "العم الأكبر / العمة الكبرى",
    "niece / nephew": "الابن الأخ / ابنة الأخت",
    cousin: "الابن العم / بنت العمة",
    "second cousin": "الابن العم الثاني",
    "parent-in-law": "الوالد بالزواج",
    "sibling-in-law": "الأخ بالزواج / الأخت بالزواج",
    "child-in-law": "الابن بالزواج / الابنة بالزواج",
    inlaw: "بالزواج",
    "family member": "فرد من الأسرة",
  };
  return map[key] ?? "فرد من الأسرة";
}

export { initials };
export { Ltr };
