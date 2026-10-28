/**
 * Shared Backend Types
 *
 * Single source of truth for all backend types.
 * Used by services, repositories, and API routes.
 * Both web dashboard and future mobile app consume these types.
 */

// ─── Multi-Tenant Foundation ─────────────────────────────────

export interface TenantContext {
  userId: string;
  tenantId: string;
  role: string;
  permissions: string[];
  email?: string;
}

// ─── API Response Types ──────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Pagination ──────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Audit ───────────────────────────────────────────────────

export interface AuditContext {
  tenantId: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

// ─── Realtime Events ─────────────────────────────────────────

export interface RealtimeEvent<T = unknown> {
  type: string;
  tenantId: string;
  data: T;
  timestamp: string;
}

// ─── AI Abstraction ──────────────────────────────────────────

export interface AiContext {
  tenantId: string;
  userId: string;
  feature: string;
}

export interface AiProviderAdapter {
  name: string;
  complete(prompt: string, context: AiContext): Promise<string>;
  isAvailable(): Promise<boolean>;
}

// ─── Module Entity Types ─────────────────────────────────────

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = "super_admin" | "admin" | "pastor" | "leader" | "usher" | "member";

export type Permission =
  | "members.read" | "members.create" | "members.update" | "members.delete"
  | "groups.read" | "groups.create" | "groups.update" | "groups.delete"
  | "ministries.read" | "ministries.create" | "ministries.update" | "ministries.delete"
  | "attendance.read" | "attendance.checkin" | "attendance.create" | "attendance.update" | "attendance.delete"
  | "events.read" | "events.create" | "events.update" | "events.delete"
  | "followups.read" | "followups.create" | "followups.update" | "followups.delete"
  | "families.read" | "families.create" | "families.update" | "families.delete"
  | "talent.read" | "talent.update"
  | "ideas.read" | "ideas.create" | "ideas.manage"
  // Messaging is split in two on purpose. `messages.read` / `messages.send` are
  // STAFF-WIDE: they reach any member's conversation in the church.
  // `messages.self` is the narrow member grant — it covers reading and replying
  // on the caller's own thread and nothing else. Folding the two together would
  // mean a member holding `messages.read`, which would hand every ordinary
  // member the ability to read everybody else's pastoral conversations.
  | "messages.read" | "messages.send" | "messages.self"
  | "announcements.send"
  // The prayer wall: everyone reads approved prayers and shares their own;
  // `prayer_wall.moderate` approves them before anyone else can see them.
  | "prayer_wall.read" | "prayer_wall.post" | "prayer_wall.moderate"
  // Seating: `seating.reserve` lets a checked-in member hold seats in a row for 5
  // minutes; `seating.manage` lets an usher see, confirm and release reservations.
  | "seating.reserve" | "seating.manage"
  | "shepherding.read" | "shepherding.create" | "shepherding.update" | "shepherding.delete"
  | "prayers.read" | "prayers.create" | "prayers.update" | "prayers.delete"
  | "reports.read" | "reports.generate"
  | "settings.read" | "settings.update"
  | "users.read" | "users.create" | "users.update" | "users.delete"
  | "audit.read"
  // Settings → Access & roles: edit what each role can do, approve role requests.
  | "roles.manage"
  | "ai.use";

export interface Member {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  status: MemberStatus;
  ministry?: string;
  groupId?: string;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type MemberStatus = "active" | "inactive" | "visitor";

export interface AttendanceRecord {
  id: string;
  tenantId: string;
  memberId: string;
  serviceId: string;
  checkInTime: string;
  checkOutTime?: string;
  method: AttendanceMethod;
  createdAt: string;
}

export type AttendanceMethod = "qr" | "manual" | "mobile" | "kiosk";

// ─── Attendance Domain States ─────────────────────────────────
// A member's attendance state for a session is always DERIVED:
//   present      → an AttendanceRecord exists (checked in)
//   excused      → an AttendanceException(status=excused) exists
//   not_expected → an AttendanceException(status=not_expected) exists
//   missing      → expected, window closed, AND none of the above
// MISSING is never stored as an independent fact.

export type AttendanceStatus = "present" | "excused" | "not_expected" | "missing";

export type AttendanceExceptionStatus = "excused" | "not_expected";

export interface AttendanceException {
  id: string;
  tenantId: string;
  memberId: string;
  serviceId: string;
  status: AttendanceExceptionStatus;
  reason?: string;
  note?: string;
  recordedBy: string;
  recordedAt: string;
  createdAt: string;
}

export interface CheckInResult {
  record: AttendanceRecord;
  alreadyCheckedIn: boolean;
  member?: {
    id: string;
    name: string;
    avatar?: string;
    ministry?: string;
  };
  familyResults?: Array<{
    memberId: string;
    name: string;
    recordId?: string;
    alreadyCheckedIn?: boolean;
    success: boolean;
  }>;
}

export interface Service {
  id: string;
  tenantId: string;
  name: string;
  startTime: string;
  endTime?: string;
  expectedAttendance?: number;
  status: ServiceStatus;
  createdAt: string;
}

export type ServiceStatus = "scheduled" | "live" | "ended";

export interface Group {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  leaderId?: string;
  ministryId?: string;
  memberCount: number;
  maxCapacity?: number;
  meetingSchedule?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface Ministry {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  leaderId?: string;
  icon?: string;
  color?: string;
  memberCount: number;
  meetingSchedule?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  category?: string;
  maxAttendees?: number;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export type FollowUpStatus = "open" | "in_progress" | "completed" | "cancelled" | "pending";
export type FollowUpPriority = "low" | "medium" | "high";
export type FollowUpType = "absenteeism" | "welcome_back" | "visitor" | "pastoral_care" | "general";
export type FollowUpContactType = "phone" | "whatsapp" | "visit" | "in_person" | "other";

export interface FollowUpActivity {
  id: string;
  tenantId: string;
  followUpId: string;
  contactType: FollowUpContactType;
  notes: string;
  contactDate: string;
  createdById: string;
  createdByName?: string;
  createdAt: string;
}

export interface FollowUp {
  id: string;
  tenantId: string;
  memberId: string;
  memberName?: string;
  memberAvatar?: string;
  assignedTo?: string;
  assignedToName?: string;
  type: FollowUpType;
  reason: string;
  notes?: string;
  priority: FollowUpPriority;
  status: FollowUpStatus;
  dueDate?: string;
  completedAt?: string;
  lastContact?: string;
  nextAction?: string;
  activities?: FollowUpActivity[];
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpStats {
  open: number;
  dueToday: number;
  overdue: number;
  inProgress: number;
  completedThisWeek: number;
  total: number;
}

export interface ShepherdingRecord {
  id: string;
  tenantId: string;
  memberId: string;
  assignedTo?: string;
  status: "attention_needed" | "stable" | "thriving";
  priority: "low" | "medium" | "high";
  notes?: string;
  lastContact?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrayerRequest {
  id: string;
  tenantId: string;
  memberId: string;
  category: string;
  request: string;
  status: "new" | "in_prayer" | "prayed" | "follow_up_needed";
  assignedShepherd?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Family ───────────────────────────────────────────────────

/**
 * The complete set of explicit relationship types.
 *
 * `father` / `mother` / `guardian` are PARENT → CHILD roles and are stored
 * directionally. `spouse` and `sibling` are SYMMETRIC and are normalised by
 * the service so a pair can only ever be stored once. `child` is the inverse
 * of the parent roles and is accepted for callers that think in that direction.
 */
export const FAMILY_RELATIONSHIP_TYPES = [
  "father",
  "mother",
  "child",
  "spouse",
  "sibling",
  "guardian",
  /**
   * A recorded connection that is none of the above — a godparent, a foster
   * placement, a household member who is not a blood relation. Kept as a
   * first-class type so real families are never forced into a wrong label
   * rather than being left out of the household.
   */
  "other",
] as const;

export type FamilyRelationshipType = (typeof FAMILY_RELATIONSHIP_TYPES)[number];

/** Types that describe a parent pointing at a child. */
export const FAMILY_PARENT_TYPES: readonly FamilyRelationshipType[] = [
  "father",
  "mother",
  "guardian",
];

/** Types that mean the same thing in both directions. */
export const FAMILY_SYMMETRIC_TYPES: readonly FamilyRelationshipType[] = [
  "spouse",
  "sibling",
  /**
   * `other` carries no direction marker, so it is treated as a two-way
   * household connection. Without this, the same link could be recorded twice
   * in opposite orders and appear as two separate relationships.
   */
  "other",
];

export function isParentRelationship(type: FamilyRelationshipType): boolean {
  return FAMILY_PARENT_TYPES.includes(type);
}

export function isSymmetricRelationship(type: FamilyRelationshipType): boolean {
  return FAMILY_SYMMETRIC_TYPES.includes(type);
}

export interface Family {
  id: string;
  tenantId: string;
  name: string;
  /** Family-level photo. Falls back to the head member's avatar when absent. */
  familyPhotoUrl?: string | null;
  /**
   * The explicitly designated family representative.
   * `null` means no head has been designated. It is never inferred from a
   * `father` relationship — being a father does not make someone the head.
   */
  headMemberId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  relationships?: FamilyRelationship[];
}

export interface FamilyRelationship {
  id: string;
  tenantId: string;
  familyId: string;
  fromMemberId: string;
  toMemberId: string;
  type: FamilyRelationshipType;
  createdAt: string;
}

/** Minimal member projection needed to render a family node. */
export interface FamilyMember {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  status?: string | null;
}

/**
 * One node in a rendered family tree.
 *
 * `relationshipToFocal` is expressed from the perspective of the member whose
 * profile was opened, which is what makes the same underlying data read
 * correctly whether you opened the father, the mother or a child.
 */
export interface FamilyTreeNode {
  member: FamilyMember;
  /** How this member relates to the member whose profile is open. */
  relationshipToFocal: string;
  isFocal: boolean;
  /** True only when this member is the family's explicitly designated head. */
  isFamilyHead: boolean;
  /** The photo to render: the member's own avatar. */
  avatarUrl: string | null;
  /** Spouses rendered alongside this node, when present. */
  spouse: FamilyTreeNode | null;
  children: FamilyTreeNode[];
  /** Raw relationships recorded for this member inside this family. */
  relationships: FamilyRelationship[];
}

/** The full graph for one family, as seen from one focal member. */
export interface FamilyTree {
  family: Family;
  focalMemberId: string;
  /** Top-level nodes, ordered deterministically for stable rendering. */
  roots: FamilyTreeNode[];
  /** Every node in the family, flattened and deterministically ordered. */
  members: FamilyTreeNode[];
  /** The designated head node, or null when no head has been designated. */
  head: FamilyTreeNode | null;
  /** The photo to show for the family: its own, else the head's avatar. */
  displayPhotoUrl: string | null;
  /** True when displayPhotoUrl is a fallback rather than a real family photo. */
  isPhotoFallback: boolean;
}

/**
 * One row of the Families directory.
 *
 * Everything the administrative table needs is precomputed here so the page
 * does not have to re-derive it, and so the counts always come from stored
 * relationships rather than from a guess about who the "main" parent is.
 */
export interface FamilyDirectoryEntry {
  family: Family;
  /** Every member of the household, in stable order. */
  members: FamilyMember[];
  /** Recorded father(s). Empty when the family has none. */
  fathers: FamilyMember[];
  /** Recorded mother(s). Empty when the family has none. */
  mothers: FamilyMember[];
  /** Recorded children. Empty for a couple with no children yet. */
  children: FamilyMember[];
  /** Distinct members involved in any relationship in this family. */
  familySize: number;
  /** True when at least one child relationship exists. */
  hasChildren: boolean;
  /** True when a real family photo is stored, as opposed to an avatar fallback. */
  hasFamilyPhoto: boolean;
}

export interface CreateFamilyInput {
  name: string;
  familyPhotoUrl?: string | null;
  headMemberId?: string | null;
  notes?: string | null;
}

export interface UpdateFamilyInput {
  name?: string;
  familyPhotoUrl?: string | null;
  headMemberId?: string | null;
  notes?: string | null;
}

export interface CreateFamilyRelationshipInput {
  familyId: string;
  fromMemberId: string;
  toMemberId: string;
  type: FamilyRelationshipType;
}

export interface UpdateFamilyRelationshipInput {
  fromMemberId?: string;
  toMemberId?: string;
  type?: FamilyRelationshipType;
}

// ─── Community: Talent & Expertise ────────────────────────────
//
// "Discover what our people can do."
//
// Nothing in this section is pastoral. Talent data is community-discovery data
// that a member chose to submit, and it is only ever read through
// `TalentProfile.isDiscoverable`.

/** How willing a member is to be asked for help. */
export const TALENT_WILLINGNESS_LEVELS = ["yes", "maybe", "not_currently"] as const;
export type TalentWillingness = (typeof TALENT_WILLINGNESS_LEVELS)[number];

/**
 * Controlled grouping for a free-text profession.
 *
 * The category exists so the directory can group and filter; the profession
 * itself stays free text so a real job title is never forced into the nearest
 * wrong label. "other" is a first-class choice.
 */
export const PROFESSION_CATEGORIES = [
  "technology",
  "healthcare",
  "legal",
  "finance",
  "education",
  "business",
  "trades",
  "creative",
  "communications",
  "ministry",
  "other",
] as const;
export type ProfessionCategory = (typeof PROFESSION_CATEGORIES)[number];

export interface TalentSkill {
  id: string;
  name: string;
  category?: string | null;
}

export interface TalentProfile {
  id: string;
  tenantId: string;
  memberId: string;
  professionCategory?: string | null;
  profession?: string | null;
  experience?: string | null;
  yearsExperience?: number | null;
  willingness: TalentWillingness;
  willingAreas?: string | null;
  /** The member's opt-in to the staff directory. */
  isDiscoverable: boolean;
  updatedByUserId?: string | null;
  skills: TalentSkill[];
  createdAt: string;
  updatedAt: string;
}

export interface UpsertTalentProfileInput {
  professionCategory?: ProfessionCategory | null;
  profession?: string | null;
  experience?: string | null;
  yearsExperience?: number | null;
  willingness?: TalentWillingness;
  willingAreas?: string | null;
  isDiscoverable?: boolean;
  /**
   * Skill names as typed by the member. Names are resolved to the tenant's
   * Skill rows, creating a new row for anything not yet known, so a member can
   * always enter a skill the church has never heard of.
   */
  skills?: string[];
}

/**
 * One row of the Talent Directory.
 *
 * `email` and `phone` are present only when the caller holds the permission that
 * already governs member contact details. They are omitted entirely otherwise,
 * rather than sent and hidden in the UI.
 */
export interface TalentDirectoryEntry {
  memberId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  status: string;
  professionCategory: string | null;
  profession: string | null;
  experience: string | null;
  yearsExperience: number | null;
  willingness: TalentWillingness;
  willingAreas: string | null;
  skills: TalentSkill[];
  /** Existing member context, reused rather than duplicated. */
  ministry: string | null;
  groupName: string | null;
  /** Present only when the caller may see member contact details. */
  email?: string;
  phone?: string;
  /** Whether the UI should offer a contact action for this row. */
  canContact: boolean;
  updatedAt: string;
}

/**
 * Structured search criteria.
 *
 * This is the contract between question interpretation and the search itself.
 * Whatever produces it — an AI provider or the deterministic parser — the
 * repository only ever receives this shape, never free text and never a
 * client-supplied query.
 */
export interface TalentSearchCriteria {
  /** Matched against member name. */
  name?: string;
  /** Matched against the member's free-text profession. */
  profession?: string;
  /** Matched against normalized skill names. */
  skills: string[];
  /** Matched against the member's own experience description. */
  experience: string[];
  ministry?: string;
  group?: string;
  /**
   * Willingness filter. `any` matches every member including those who said
   * they are not currently available, which is the correct default for
   * "what does this person know" questions.
   */
  willingness?: TalentWillingness | "any";
  /**
   * Restrict to members who opted in. Always true for the staff directory; the
   * repository refuses to return a non-discoverable profile through this path.
   */
  discoverableOnly: boolean;
}

/** Where an interpretation came from, and whether AI was involved at all. */
export interface TalentSearchInterpretation {
  criteria: TalentSearchCriteria;
  source: "ai" | "deterministic";
  /** Echo of what the system understood, shown to the user. */
  summary: string;
  /** Set when AI was attempted but could not be used. */
  fallbackReason?: string;
  /** True when the AI provider was used, for the UI's disclosure badge. */
  aiUsed: boolean;
}

/** A single, factual reason a member matched. */
export interface TalentMatchReason {
  /** Which stored field produced the match. */
  field: "name" | "profession" | "skill" | "experience" | "willingness" | "ministry" | "group";
  /** The stored value that matched, shown verbatim. */
  value: string;
}

export interface TalentSearchResult extends TalentDirectoryEntry {
  /**
   * Why this member matched, derived only from stored data. Never generated or
   * inferred beyond what the database actually contains.
   */
  reasons: TalentMatchReason[];
}

export interface TalentSearchResponse {
  interpretation: TalentSearchInterpretation;
  results: TalentSearchResult[];
  total: number;
}

export interface TalentStats {
  profilesWithSkills: number;
  willingToHelp: number;
  discoverable: number;
  professionBreakdown: { category: string; count: number }[];
  skillCount: number;
}

// ─── Community: Ideas Bank ────────────────────────────────────
//
// "Discover what our people are thinking."

export const IDEA_CATEGORIES = [
  "ministry",
  "youth",
  "children",
  "worship",
  "events",
  "community_outreach",
  "technology",
  "education",
  "facilities",
  "fundraising",
  "communications",
  "families",
  "other",
] as const;
export type IdeaCategory = (typeof IDEA_CATEGORIES)[number];

/**
 * New -> Under Review -> Planned -> Implemented, with Declined as the
 * alternative terminal state. Deliberately not project management.
 */
export const IDEA_STATUSES = [
  "new",
  "under_review",
  "planned",
  "implemented",
  "declined",
] as const;
export type IdeaStatus = (typeof IDEA_STATUSES)[number];

/**
 * The statuses a caller is allowed to move an idea to.
 *
 * Encoded rather than left to the UI so a hand-written request cannot jump an
 * idea straight from New to Implemented and skip the review that the workflow
 * exists to make happen.
 */
export const IDEA_STATUS_TRANSITIONS: Record<IdeaStatus, readonly IdeaStatus[]> = {
  new: ["under_review", "planned", "declined"],
  under_review: ["planned", "declined"],
  planned: ["under_review", "implemented", "declined"],
  implemented: [],
  declined: ["under_review"],
};

export function isValidIdeaTransition(from: IdeaStatus, to: IdeaStatus): boolean {
  return IDEA_STATUS_TRANSITIONS[from].includes(to);
}

export function isTerminalIdeaStatus(status: IdeaStatus): boolean {
  return status === "implemented" || status === "declined";
}

/** Minimal member projection shown next to an idea. */
export interface IdeaSubmitter {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface Idea {
  id: string;
  tenantId: string;
  submittedByMemberId: string;
  title: string;
  description: string;
  category: string;
  categoryOther: string | null;
  status: IdeaStatus;
  /**
   * Staff-only working notes. Always undefined in a response the caller is not
   * authorised to manage — the projection is the privacy boundary, not the UI.
   */
  internalNotes?: string | null;
  ownerId: string | null;
  ownerName: string | null;
  statusChangedAt: string | null;
  statusChangedById: string | null;
  implementedAt: string | null;
  createdAt: string;
  updatedAt: string;
  submitter: IdeaSubmitter | null;
  /** Statuses the caller may move this idea to right now. */
  allowedTransitions: IdeaStatus[];
}

export interface CreateIdeaInput {
  title: string;
  description: string;
  category: IdeaCategory;
  /** Required when category is "other", and ignored otherwise. */
  categoryOther?: string | null;
}

export interface UpdateIdeaInput {
  title?: string;
  description?: string;
  category?: IdeaCategory;
  categoryOther?: string | null;
}

export interface UpdateIdeaWorkflowInput {
  status?: IdeaStatus;
  internalNotes?: string | null;
  ownerId?: string | null;
}

export interface IdeaSearchCriteria {
  /** Matched against title and description. */
  text?: string;
  category?: IdeaCategory;
  status?: IdeaStatus | IdeaStatus[];
  submittedByMemberId?: string;
}

export interface IdeaSearchInterpretation {
  criteria: IdeaSearchCriteria;
  source: "ai" | "deterministic";
  summary: string;
  fallbackReason?: string;
  aiUsed: boolean;
}

export interface IdeaSearchResponse {
  interpretation: IdeaSearchInterpretation;
  results: Idea[];
  total: number;
}

export interface IdeaStats {
  total: number;
  byStatus: Record<IdeaStatus, number>;
  byCategory: { category: string; count: number }[];
  submittedThisMonth: number;
}

/** Aggregate counts for the Community dashboard. */
export interface CommunityStats {
  membersWithSkills: number;
  membersWillingToHelp: number;
  discoverableMembers: number;
  ideasSubmitted: number;
  ideasUnderReview: number;
  ideasImplemented: number;
  topSkills: { name: string; count: number }[];
  topCategories: { category: string; count: number }[];
}

/**
 * A member's talent profile plus their idea activity, as rendered by the
 * compact Member 360 section. Deliberately a summary: the full profile stays
 * the single source of truth and is never duplicated here.
 */
export interface MemberCommunitySummary {
  memberId: string;
  profession: string | null;
  professionCategory: string | null;
  skills: TalentSkill[];
  experience: string | null;
  yearsExperience: number | null;
  willingness: TalentWillingness;
  willingAreas: string | null;
  isDiscoverable: boolean;
  ideasSubmitted: number;
}

// ─── Messaging ───────────────────────────────────────────────

/**
 * Which side of the conversation wrote a message.
 *
 * Stored rather than derived, because read state is only meaningful against a
 * side. See the `Message` model for the full reasoning.
 */
export type MessageSenderKind = "staff" | "member";

/**
 * How a message was raised.
 *
 * `whatsapp` is NOT a delivery receipt. A `wa.me` link hands the text to
 * WhatsApp on the sender's own device and reports nothing back, so a row in
 * this channel records that a request was made and by whom. The distinction is
 * kept in the type so a UI cannot present it as confirmed delivery.
 */
export type MessageChannel = "in_app" | "whatsapp";

export interface Message {
  id: string;
  tenantId: string;
  memberId: string;
  senderKind: MessageSenderKind;
  senderUserId: string | null;
  senderName: string;
  body: string;
  channel: MessageChannel;
  readAt: string | null;
  createdAt: string;
}

/**
 * One conversation in the staff inbox: the member, the latest message, and how
 * much of it is still unread by staff.
 *
 * `unreadCount` counts member messages awaiting staff. Staff messages awaiting a
 * member are counted separately by `getMyUnreadCount` because they are a
 * different reader's badge, and merging them would make one number mean two
 * different things.
 */
export interface MessageThreadSummary {
  memberId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  lastMessage: {
    body: string;
    senderKind: MessageSenderKind;
    channel: MessageChannel;
    createdAt: string;
  };
  messageCount: number;
  unreadCount: number;
}

/**
 * The outcome of preparing a WhatsApp link for a member.
 *
 * Two working modes, because the member's saved phone is free-form and often
 * local rather than international:
 *
 * - `direct` — the number carried a country code, so the link opens the chat
 *   with that specific member and the message is already typed.
 * - `choose_contact` — the number was a local format we cannot safely turn into
 *   an international one, so the link opens WhatsApp's contact picker and the
 *   staff member chooses who to send to. Degrading to this is deliberate: a
 *   confidently wrong `wa.me` link would open a stranger's chat.
 *
 * Failing outright is reserved for having no phone at all, which the UI shows
 * as a missing detail rather than a broken button.
 */
export type WhatsAppLinkResult =
  | {
      ok: true;
      url: string;
      mode: "direct" | "choose_contact";
      /** International digits, or null when the number could not be resolved to one. */
      digits: string | null;
    }
  | { ok: false; reason: "no_phone" };

/** A skill plus how many members in the current filter hold it. */
export interface SkillFacet {
  skill: TalentSkill;
  count: number;
}
