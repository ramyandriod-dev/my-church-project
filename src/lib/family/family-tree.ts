/**
 * Family Tree Builder
 *
 * Pure, dependency-free logic that turns a flat set of family relationships
 * into a renderable tree, oriented around whichever member the user opened.
 *
 * This module deliberately performs NO I/O and touches no database. The
 * service layer is responsible for tenant scoping and integrity; everything
 * here is a pure function of the data it is handed, which keeps the tricky
 * part of this feature (orienting the same graph correctly from a father, a
 * mother or a child) directly unit-testable.
 *
 * Label vocabulary is intentionally gender-neutral ("child", "sibling",
 * "grandparent") because the Member model carries no gender field. The only
 * gendered words that appear are the ones stored as data by the church
 * itself: father, mother, guardian.
 */

import type {
  Family,
  FamilyMember,
  FamilyRelationship,
  FamilyRelationshipType,
  FamilyTree,
  FamilyTreeNode,
} from "../backend/types";

/** Relationship types that express a parent pointing at a child. */
const PARENT_ROLES: ReadonlySet<FamilyRelationshipType> = new Set([
  "father",
  "mother",
  "guardian",
]);

/** Generic label used whenever a specific role cannot be determined. */
const UNKNOWN_RELATIONSHIP = "family member";

type Step = {
  dir: "up" | "down" | "spouse" | "lateral" | "other";
  role?: FamilyRelationshipType;
};

// ─── Internal helpers ────────────────────────────────────────

/**
 * Normalise a stored row into a parent -> child edge.
 *
 * `child` is stored child-first by some callers, so it is inverted here. This
 * lets the rest of the module treat every parent-child fact the same way
 * regardless of which direction the church recorded it in.
 */
function toParentEdge(rel: FamilyRelationship): ParentChildEdge | null {
  if (rel.type === "child") {
    return { parentId: rel.toMemberId, childId: rel.fromMemberId, role: "child" };
  }
  if (PARENT_ROLES.has(rel.type)) {
    return { parentId: rel.fromMemberId, childId: rel.toMemberId, role: rel.type };
  }
  return null;
}

interface ParentChildEdge {
  parentId: string;
  childId: string;
  role: FamilyRelationshipType;
}

/** Minimal disjoint-set union structure used to group spouses and co-parents. */
class DisjointSet {
  private readonly parent = new Map<string, string>();

  find(key: string): string {
    const current = this.parent.get(key);
    if (current === undefined) {
      this.parent.set(key, key);
      return key;
    }
    if (current === key) return key;
    const root = this.find(current);
    this.parent.set(key, root);
    return root;
  }

  /** Merge with a deterministic direction so output is stable across runs. */
  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) return;
    if (rootA < rootB) this.parent.set(rootB, rootA);
    else this.parent.set(rootA, rootB);
  }
}

interface Group {
  id: string;
  members: string[];
  children: Set<string>;
  parentGroupId: string | null;
}

/** Sort key giving stable ordering regardless of database return order. */
function sortKey(members: Map<string, FamilyMember>, id: string): string {
  const member = members.get(id);
  if (!member) return id;
  return `${member.lastName}\u0000${member.firstName}\u0000${id}`;
}

function sortIds(ids: Iterable<string>, members: Map<string, FamilyMember>): string[] {
  return [...ids].sort((a, b) => (sortKey(members, a) < sortKey(members, b) ? -1 : 1));
}

// ─── Relationship labelling ──────────────────────────────────

/**
 * Collapse a BFS route from the focal member into a human-readable label.
 *
 * "up" means towards a parent, "down" means towards a child, so ["up","down"]
 * is a sibling and ["up","up","down"] is an aunt or uncle.
 */
function labelForRoute(route: Step[]): string {
  if (route.length === 0) return "self";

  // A direct stored relationship always wins over anything inferred.
  if (route.length === 1) {
    const step = route[0];
    if (step.dir === "spouse") return "spouse";
    if (step.dir === "lateral") return "sibling";
    // An "other" link is deliberately not dressed up as a blood relation. The
    // member is genuinely part of the household; the relationship simply is
    // not one of the named ones.
    if (step.dir === "other") return "household member";
    if (step.dir === "down") return "child";
    // Stepping "up" lands on a parent, so the stored role is the right label.
    if (step.role && step.role !== "child") return step.role;
    return "parent";
  }

  const ups = route.filter((s) => s.dir === "up").length;
  const downs = route.filter((s) => s.dir === "down").length;

  if (route.some((s) => s.dir === "spouse")) {
    if (ups > 0 && downs === 0) return "parent-in-law";
    if (ups > 0 && downs > 0) return "sibling-in-law";
    if (ups === 0 && downs > 0) return "child-in-law";
    return "in-law";
  }

  if (ups === 0) {
    return downs === 1 ? "child" : downs === 2 ? "grandchild" : "great-grandchild";
  }
  if (downs === 0) {
    return ups === 1 ? "parent" : ups === 2 ? "grandparent" : "great-grandparent";
  }
  if (ups === 1 && downs === 1) return "sibling";
  if (ups === 2 && downs === 1) return "aunt / uncle";
  if (ups === 1 && downs === 2) return "niece / nephew";
  if (ups === 2 && downs === 2) return "cousin";
  if (ups === 3 && downs === 1) return "great-aunt / great-uncle";
  if (ups === 3 && downs === 2) return "second cousin";
  return UNKNOWN_RELATIONSHIP;
}

/** Breadth-first search from the focal member, tracking the route to each node. */
function computeLabels(
  focalMemberId: string,
  adjacency: Map<string, Adjacent[]>,
): Map<string, string> {
  const labels = new Map<string, string>();
  if (!adjacency.has(focalMemberId)) return labels;

  labels.set(focalMemberId, "self");
  // `seen` also guards against a member recorded as their own ancestor.
  const seen = new Set<string>([focalMemberId]);
  const queue: Array<{ id: string; route: Step[] }> = [{ id: focalMemberId, route: [] }];

  while (queue.length > 0) {
    const { id, route } = queue.shift()!;
    for (const edge of adjacency.get(id) ?? []) {
      if (seen.has(edge.to)) continue;
      seen.add(edge.to);
      const step: Step = { dir: edge.dir, role: edge.role };
      labels.set(edge.to, labelForRoute([...route, step]));
      queue.push({ id: edge.to, route: [...route, step] });
    }
  }

  return labels;
}

type Adjacent = { to: string; dir: Step["dir"]; role?: FamilyRelationshipType };

// ─── Public API ──────────────────────────────────────────────

export interface BuildFamilyTreeInput {
  family: Family;
  focalMemberId: string;
  members: FamilyMember[];
  relationships: FamilyRelationship[];
}

/**
 * Build the renderable family tree for one family, oriented around
 * `focalMemberId`.
 *
 * The same `family` + `members` + `relationships` always yields the same
 * structure regardless of which member is focal — only `isFocal` and the
 * `relationshipToFocal` labels differ. That is what makes "open the father,
 * the mother or a child and see the same family" true.
 */
export function buildFamilyTree(input: BuildFamilyTreeInput): FamilyTree {
  const { family, focalMemberId, members, relationships } = input;

  const memberById = new Map<string, FamilyMember>(members.map((m) => [m.id, m]));
  const memberIds = [...memberById.keys()];

  // Only relationships that belong to THIS family and connect two members that
  // actually exist are considered. Anything else is dropped rather than
  // rendered as a broken node.
  const validRelationships = relationships.filter(
    (rel) =>
      rel.familyId === family.id &&
      memberById.has(rel.fromMemberId) &&
      memberById.has(rel.toMemberId),
  );

  const relationshipsByMember = new Map<string, FamilyRelationship[]>();
  for (const rel of validRelationships) {
    for (const id of [rel.fromMemberId, rel.toMemberId]) {
      const list = relationshipsByMember.get(id);
      if (list) list.push(rel);
      else relationshipsByMember.set(id, [rel]);
    }
  }

  // 1. Group spouses together.
  const dsu = new DisjointSet();
  for (const id of memberIds) dsu.find(id);

  const spousePairs: Array<[string, string]> = [];
  for (const rel of validRelationships) {
    if (rel.type === "spouse") {
      spousePairs.push([rel.fromMemberId, rel.toMemberId]);
      dsu.union(rel.fromMemberId, rel.toMemberId);
    }
  }

  const siblingPairs: Array<[string, string]> = [];
  for (const rel of validRelationships) {
    if (rel.type === "sibling") {
      siblingPairs.push([rel.fromMemberId, rel.toMemberId]);
    }
  }

  const otherPairs: Array<[string, string]> = [];
  for (const rel of validRelationships) {
    if (rel.type === "other") {
      otherPairs.push([rel.fromMemberId, rel.toMemberId]);
    }
  }

  // 2. Normalise parent -> child edges.
  const parentEdges: ParentChildEdge[] = [];
  for (const rel of validRelationships) {
    const edge = toParentEdge(rel);
    if (edge) parentEdges.push(edge);
  }

  // 3. Co-parents who share a child belong to the same display group even when
  //    the church never recorded them as spouses. Without this, a child would
  //    be rendered twice — once under each parent.
  const groupOf = new Map<string, string>();
  for (const id of memberIds) groupOf.set(id, dsu.find(id));

  const firstGroupByChild = new Map<string, string>();
  for (const edge of parentEdges) {
    const parentGroup = groupOf.get(edge.parentId)!;
    const existing = firstGroupByChild.get(edge.childId);
    if (existing === undefined) {
      firstGroupByChild.set(edge.childId, parentGroup);
    } else if (existing !== parentGroup) {
      const keep = existing < parentGroup ? existing : parentGroup;
      const drop = existing < parentGroup ? parentGroup : existing;
      for (const id of memberIds) {
        if (groupOf.get(id) === drop) groupOf.set(id, keep);
      }
      firstGroupByChild.set(edge.childId, keep);
    }
  }

  // 4. Materialise groups.
  const groups = new Map<string, Group>();
  for (const id of memberIds) {
    const gid = groupOf.get(id)!;
    const group = groups.get(gid);
    if (group) group.members.push(id);
    else groups.set(gid, { id: gid, members: [id], children: new Set(), parentGroupId: null });
  }
  for (const group of groups.values()) {
    group.members = sortIds(group.members, memberById);
  }

  for (const edge of parentEdges) {
    groups.get(groupOf.get(edge.parentId)!)!.children.add(edge.childId);
  }
  for (const group of groups.values()) {
    group.children = new Set(sortIds(group.children, memberById));
  }

  // 5. Link groups into a forest: a group is a child group when one of its
  //    members is recorded as a child of a member in another group.
  for (const edge of parentEdges) {
    const childGroup = groups.get(groupOf.get(edge.childId)!)!;
    const parentGroupId = groupOf.get(edge.parentId)!;
    if (childGroup.id !== parentGroupId && childGroup.parentGroupId === null) {
      childGroup.parentGroupId = parentGroupId;
    }
  }

  // 7. Labels relative to the focal member.
  const adjacency = buildAdjacency(memberIds, parentEdges, spousePairs, siblingPairs, otherPairs, groups);
  const labels = computeLabels(focalMemberId, adjacency);

  // 8. Determine which groups are roots.
  //
  // Normally a group with no parent group is a root. If the data contains a
  // cycle (A recorded as the parent of B while B is the parent of A) every
  // group would claim a parent and the tree would render empty, hiding real
  // data. So any group that cannot be reached from a root is promoted to a
  // root as well, which guarantees every member stays visible.
  const isRootGroup = (group: Group) => group.parentGroupId === null;
  const reachable = new Set<string>();
  const queue = [...groups.values()].filter(isRootGroup).map((g) => g.id);
  for (const gid of queue) reachable.add(gid);
  let grew = true;
  while (grew) {
    grew = false;
    for (const group of groups.values()) {
      if (group.parentGroupId && reachable.has(group.parentGroupId) && !reachable.has(group.id)) {
        reachable.add(group.id);
        grew = true;
      }
    }
  }
  const rootGroups = [...groups.values()]
    .filter((g) => isRootGroup(g) || !reachable.has(g.id))
    .sort((a, b) => (a.id < b.id ? -1 : 1));

  const nodeCache = new Map<string, FamilyTreeNode>();
  const building = new Set<string>();

  const makeBase = (memberId: string): FamilyTreeNode => {
    const member = memberById.get(memberId)!;
    return {
      member,
      relationshipToFocal: labels.get(memberId) ?? UNKNOWN_RELATIONSHIP,
      isFocal: memberId === focalMemberId,
      // Only an explicit designation counts. Being a father never implicitly
      // makes someone the head of the family.
      isFamilyHead: family.headMemberId != null && family.headMemberId === memberId,
      avatarUrl: member.avatarUrl ?? null,
      spouse: null,
      children: [],
      relationships: relationshipsByMember.get(memberId) ?? [],
    };
  };

  const buildNode = (memberId: string): FamilyTreeNode => {
    const cached = nodeCache.get(memberId);
    if (cached) return cached;
    // Defensive: a cyclic parent chain would otherwise recurse forever.
    if (building.has(memberId)) return makeBase(memberId);

    building.add(memberId);
    const node = makeBase(memberId);

    const spouseId = spousePairs
      .map(([a, b]) => (a === memberId ? b : b === memberId ? a : null))
      .find((candidate): candidate is string => candidate !== null);
    if (spouseId) {
      node.spouse = buildNode(spouseId);
      // Deliberately NOT assigned back onto spouseNode. Both nodes come from
      // nodeCache, so `spouseNode.spouse = node` would make A.spouse and B.spouse
      // point at the same objects and close the circle — and this tree is served
      // as JSON, where JSON.stringify throws on a cycle. The partner still knows
      // its spouse: the spouse pair's own build sets it to a shallow copy of this
      // node (spouse: null, children: []) before the cache stores it. Renderers
      // only ever read a node's spouse one level deep, never spouse.spouse.
    }

    const group = groups.get(groupOf.get(memberId)!)!;
    for (const childId of group.children) {
      node.children.push(buildNode(childId));
    }

    building.delete(memberId);
    nodeCache.set(memberId, node);
    return node;
  };

  // 9. Roots are the top generation. Two co-parents who are not recorded as
  //    spouses both surface here, which is correct; a recorded spouse is only
  //    emitted once because the other is reachable through the spouse link.
  //    The designated head leads its own unit so it is read first.
  const roots: FamilyTreeNode[] = [];
  for (const group of rootGroups) {
    const ordered = [...group.members].sort((a, b) => {
      if (a === family.headMemberId) return -1;
      if (b === family.headMemberId) return 1;
      return 0;
    });
    const emitted: string[] = [];
    for (const memberId of ordered) {
      const spouseIds = spousePairs
        .filter(([a, b]) => a === memberId || b === memberId)
        .map(([a, b]) => (a === memberId ? b : a));
      if (emitted.some((id) => spouseIds.includes(id))) continue;
      emitted.push(memberId);
      roots.push(buildNode(memberId));
    }
  }

  const headMemberId = family.headMemberId ?? null;
  const head = headMemberId && memberById.has(headMemberId) ? buildNode(headMemberId) : null;

  const familyPhoto = family.familyPhotoUrl ?? null;
  const headPhoto = headMemberId ? memberById.get(headMemberId)?.avatarUrl ?? null : null;
  const displayPhotoUrl = familyPhoto ?? headPhoto;

  const flat = [...nodeCache.values()].sort((a, b) =>
    sortKey(memberById, a.member.id) < sortKey(memberById, b.member.id) ? -1 : 1,
  );

  return {
    family,
    focalMemberId,
    roots,
    members: flat,
    head,
    displayPhotoUrl,
    isPhotoFallback: familyPhoto === null && headPhoto !== null,
  };
}

/** Build the undirected adjacency used for relationship labelling. */
function buildAdjacency(
  memberIds: string[],
  parentEdges: ParentChildEdge[],
  spousePairs: Array<[string, string]>,
  siblingPairs: Array<[string, string]>,
  otherPairs: Array<[string, string]>,
  groups: Map<string, Group>,
): Map<string, Adjacent[]> {
  const adjacency = new Map<string, Adjacent[]>();
  for (const id of memberIds) adjacency.set(id, []);
  const link = (from: string, to: string, edge: Omit<Adjacent, "to">) => {
    adjacency.get(from)?.push({ ...edge, to });
  };

  for (const edge of parentEdges) {
    // From the child's point of view a parent is "up".
    link(edge.childId, edge.parentId, { dir: "up", role: edge.role });
    link(edge.parentId, edge.childId, { dir: "down", role: "child" });
  }

  const isSpouse = (a: string, b: string) =>
    spousePairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

  for (const [a, b] of spousePairs) {
    link(a, b, { dir: "spouse" });
    link(b, a, { dir: "spouse" });
  }

  // Explicit sibling relationships
  for (const [a, b] of siblingPairs) {
    link(a, b, { dir: "lateral", role: "sibling" });
    link(b, a, { dir: "lateral", role: "sibling" });
  }

  // "Other" connections. They carry no generational structure, so they are not
  // drawn as tree edges, but they are linked here so the person is reachable
  // from the focal member and is labelled as a household member rather than
  // falling back to an unknown relationship.
  for (const [a, b] of otherPairs) {
    link(a, b, { dir: "other", role: "other" });
    link(b, a, { dir: "other", role: "other" });
  }

  // Siblings: members of a group that is itself someone's child. Top-generation
  // co-parents are deliberately not linked laterally, which would mislabel them.
  for (const group of groups.values()) {
    if (group.parentGroupId === null) continue;
    for (let i = 0; i < group.members.length; i++) {
      for (let j = i + 1; j < group.members.length; j++) {
        const a = group.members[i];
        const b = group.members[j];
        if (isSpouse(a, b)) continue;
        link(a, b, { dir: "lateral" });
        link(b, a, { dir: "lateral" });
      }
    }
  }

  return adjacency;
}

/** Flatten a tree into depth-first order, which is what the UI renders. */
export function flattenFamilyTree(nodes: FamilyTreeNode[]): FamilyTreeNode[] {
  const out: FamilyTreeNode[] = [];
  const visit = (node: FamilyTreeNode) => {
    out.push(node);
    if (node.spouse) out.push(node.spouse);
    for (const child of node.children) visit(child);
  };
  for (const node of nodes) visit(node);
  return out;
}
