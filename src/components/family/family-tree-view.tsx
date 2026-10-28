"use client";

/**
 * Family Tree View
 *
 * Renders a whole family as a household diagram: partners side by side, one
 * generation below the other, with connector lines.
 *
 * Two rendering modes, because a diagram is the right answer only when there is
 * room for it:
 *
 *   - `md` and up: the classic tree. Couples are laid out as a unit so a
 *     spouse never drifts away from their partner, and CSS pseudo-elements
 *     draw the parent/child connectors.
 *   - below `md`: the same data as an indented vertical list. On a narrow
 *     screen a four-generation tree is unreadable and horizontally scrollable
 *     diagrams are worse, so the generation label carries the structure
 *     instead of the geometry.
 *
 * The component only lays out nodes it is given. Who is a parent, who is a
 * child, and which member is the head are all decided by the shared tree
 * builder, so this file can never disagree with the API about a relationship.
 */

import { Ltr } from "@/lib/i18n";
import { FamilyNodeCard } from "./family-node-card";
import type { FamilyTreeNode } from "@/lib/backend/types";

interface FamilyTreeViewProps {
  roots: FamilyTreeNode[];
  isAr: boolean;
  /** Shown when the family has nobody to draw. */
  emptyLabel?: string;
}

/** A node plus its spouse, kept together as one layout unit. */
interface Unit {
  node: FamilyTreeNode;
  spouse: FamilyTreeNode | null;
}

export function FamilyTreeView({ roots, isAr, emptyLabel }: FamilyTreeViewProps) {
  const units: Unit[] = roots.map((node) => ({ node, spouse: node.spouse }));

  if (units.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
        {emptyLabel ?? (isAr ? "لا يوجد أعضاء في هذه الأسرة بعد" : "No members in this family yet")}
      </p>
    );
  }

  return (
    <div>
      {/* Desktop: connected tree */}
      <div className="hidden md:block">
        <ul className="space-y-10">
          {units.map((unit) => (
            <FamilyUnit key={unit.node.member.id} unit={unit} isAr={isAr} />
          ))}
        </ul>
      </div>

      {/* Mobile: indented list, one member per row */}
      <ul className="space-y-6 md:hidden">
        {roots.map((node) => (
          <MobileBranch key={node.member.id} node={node} isAr={isAr} depth={0} />
        ))}
      </ul>
    </div>
  );
}

/**
 * One parent (with their partner) and the generation beneath them.
 *
 * The connector is drawn with a border on an absolutely positioned wrapper
 * rather than an SVG, so it inherits the current text colour and direction
 * without a second set of RTL rules.
 */
function FamilyUnit({ unit, isAr }: { unit: Unit; isAr: boolean }) {
  const { node, spouse } = unit;
  const couple = [node, spouse].filter((n): n is FamilyTreeNode => n !== null);

  return (
    <li className="flex flex-col items-center">
      <div className="flex flex-wrap items-stretch justify-center gap-4">
        {couple.map((member) => (
          <div key={member.member.id} className="relative flex-1">
            {/* A partner other than the root is a spouse, not a second parent,
                so the connector is only drawn under the root of the unit. */}
            {member === node && couple.length > 1 && (
              <span
                aria-hidden="true"
                className="absolute -bottom-10 left-1/2 hidden h-10 w-px -translate-x-1/2 bg-gray-300 md:block"
              />
            )}
            <FamilyNodeCard node={member} isAr={isAr} asSpouse={couple.length > 1} />
          </div>
        ))}
      </div>

      {node.children.length > 0 && (
        <div className="relative mt-10 w-full">
          {/* Horizontal rail tying the sibling group together */}
          <span
            aria-hidden="true"
            className="absolute -top-10 left-1/2 hidden h-px w-[calc(100%-6rem)] -translate-x-1/2 bg-gray-300 md:block"
          />
          <ul className="flex flex-wrap justify-center gap-4">
            {node.children.map((child) => (
              <li key={child.member.id} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute -top-10 left-1/2 hidden h-10 w-px -translate-x-1/2 bg-gray-300 md:block"
                />
                <FamilyNodeCard node={child} isAr={isAr} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

/** Mobile rendering: a depth-first list where depth stands in for generation. */
function MobileBranch({
  node,
  isAr,
  depth,
}: {
  node: FamilyTreeNode;
  isAr: boolean;
  depth: number;
}) {
  const spouse = node.spouse;
  return (
    <li style={{ marginInlineStart: depth === 0 ? undefined : `${depth * 16}px` }}>
      <div className="flex flex-col gap-2">
        <FamilyNodeCard node={node} isAr={isAr} />
        {spouse && <FamilyNodeCard node={spouse} isAr={isAr} />}
      </div>

      {node.children.length > 0 && (
        <ul className="mt-4 space-y-4 border-s-2 border-gray-200 ps-4">
          {node.children.map((child) => (
            <MobileBranch key={child.member.id} node={child} isAr={isAr} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export { Ltr };
