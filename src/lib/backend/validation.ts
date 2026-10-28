/**
 * Validation Utilities
 *
 * Zod-based validation for API request bodies, query params, and path params.
 * Used by API routes before passing data to services.
 */

import { z } from "zod";
import { ValidationError } from "./errors";
import { validateEmailAddress } from "@/lib/validation/email-validator";

export const churchEmailSchema = z
  .string()
  .min(1, "Email address is required")
  .superRefine((val, ctx) => {
    const res = validateEmailAddress(val, { allowTestDomains: true });
    if (!res.isValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: res.error || "Invalid email address",
      });
    }
  });

// ─── Common Schemas ──────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const idParamSchema = z.object({
  id: z.string().uuid("Invalid identifier format"),
});

export const tenantIdSchema = z.object({
  tenantId: z.string().uuid("Invalid tenant identifier"),
});

// ─── User Schemas ────────────────────────────────────────────

export const createUserSchema = z.object({
  email: churchEmailSchema,
  name: z.string().min(1, "Name is required").max(100),
  role: z.enum(["super_admin", "admin", "pastor", "leader", "member"]).default("member"),
  avatarUrl: z.string().max(2000000).optional(),
});

export const updateUserSchema = createUserSchema.partial();

// ─── Member Schemas ──────────────────────────────────────────

export const createMemberSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: churchEmailSchema,
  phone: z.string().max(20).optional().nullable().or(z.literal("")),
  avatarUrl: z.string().max(2000000).optional().nullable().or(z.literal("")),
  status: z.enum(["active", "inactive", "visitor", "deletion_requested"]).default("active"),
  ministry: z.string().max(100).optional().nullable().or(z.literal("")),
  groupId: z.string().uuid().optional().nullable().or(z.literal("")),
  joinedAt: z.string().datetime().optional().nullable().or(z.literal("")),
});

export const updateMemberSchema = createMemberSchema.partial();

export const updateMyProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().max(30).optional().nullable().or(z.literal("")),
  avatarUrl: z.string().max(2000000).optional().nullable().or(z.literal("")),
  ministry: z.string().max(100).optional().nullable().or(z.literal("")),
  groupId: z.string().uuid().optional().nullable().or(z.literal("")),
  // Talents / Skills
  skills: z.array(z.string().min(1).max(100)).optional(),
  profession: z.string().max(100).optional().nullable().or(z.literal("")),
  professionCategory: z.string().max(50).optional().nullable().or(z.literal("")),
  willingAreas: z.string().max(255).optional().nullable().or(z.literal("")),
  // Family Linkage
  familyId: z.string().optional().nullable().or(z.literal("")),
  createFamilyName: z.string().min(2).max(100).optional().nullable().or(z.literal("")),
  familyRelationshipType: z.enum([
    "head",
    "father",
    "mother",
    "child",
    "spouse",
    "sibling",
    "guardian",
    "other",
  ]).optional(),
  relatedMemberId: z.string().uuid().optional().nullable().or(z.literal("")),
  newFamilyMembers: z.array(
    z.object({
      firstName: z.string().min(1).max(50),
      lastName: z.string().min(1).max(50),
      relationship: z.enum([
        "son",
        "daughter",
        "child",
        "wife",
        "husband",
        "spouse",
        "father",
        "mother",
        "brother",
        "sister",
        "sibling",
        "guardian",
        "other",
      ]),
      phone: z.string().max(20).optional().nullable().or(z.literal("")),
      email: z.string().max(255).optional().nullable().or(z.literal("")),
    })
  ).optional(),
  updatedFamilyMembers: z.array(
    z.object({
      memberId: z.string().uuid(),
      relationship: z.enum([
        "son",
        "daughter",
        "child",
        "wife",
        "husband",
        "spouse",
        "father",
        "mother",
        "brother",
        "sister",
        "sibling",
        "guardian",
        "other",
      ]),
      firstName: z.string().min(1).max(50).optional(),
      lastName: z.string().min(1).max(50).optional(),
      phone: z.string().max(30).optional().nullable().or(z.literal("")),
    })
  ).optional(),
  removedFamilyMemberIds: z.array(z.string().uuid()).optional(),
});

export type UpdateMyProfileInput = z.infer<typeof updateMyProfileSchema>;

export const requestProfileDeletionSchema = z.object({
  reason: z.string().max(500).optional().nullable().or(z.literal("")),
});
export type RequestProfileDeletionInput = z.infer<typeof requestProfileDeletionSchema>;

export const resolveMemberDeletionSchema = z.object({
  action: z.enum(["delete_permanently", "keep_for_followup"]),
  reason: z.string().max(500).optional().nullable().or(z.literal("")),
  notes: z.string().max(2000).optional().nullable().or(z.literal("")),
});
export type ResolveMemberDeletionInput = z.infer<typeof resolveMemberDeletionSchema>;

export const memberQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  status: z.string().optional(),
  ministry: z.string().optional(),
});

export const importMemberRowSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: churchEmailSchema,
  phone: z.string().max(20).optional().nullable().or(z.literal("")),
  avatarUrl: z.string().max(2000000).optional().nullable().or(z.literal("")),
  status: z.enum(["active", "inactive", "visitor", "deletion_requested"]).default("active"),
  ministry: z.string().max(100).optional().nullable().or(z.literal("")),
  groupId: z.string().uuid().optional().nullable().or(z.literal("")),
  groupName: z.string().max(100).optional().nullable().or(z.literal("")),
  joinedAt: z.string().optional().nullable().or(z.literal("")),
});

export const importMembersSchema = z.object({
  members: z.array(importMemberRowSchema).min(1, "At least one member row is required").max(1000),
  onDuplicate: z.enum(["skip", "update"]).default("skip"),
});

export const exportMembersQuerySchema = z.object({
  status: z.string().optional(),
  ministry: z.string().optional(),
  search: z.string().optional(),
});

export type CreateMemberInput = z.input<typeof createMemberSchema>;
export type UpdateMemberInput = z.input<typeof updateMemberSchema>;
export type MemberQuery = z.input<typeof memberQuerySchema>;
export type ImportMemberRowInput = z.infer<typeof importMemberRowSchema>;
export type ImportMembersInput = z.infer<typeof importMembersSchema>;
export type ExportMembersQuery = z.infer<typeof exportMembersQuerySchema>;

// ─── Attendance Schemas ──────────────────────────────────────

/**
 * QR check-in payload (Mobile QR Check-in).
 *
 * SECURITY: The payload ONLY carries session context (the QR content).
 * It MUST NOT and CANNOT carry member identity — the authenticated
 * member is always resolved server-side from the session.
 * `.strict()` rejects any client-supplied identity (e.g. memberId).
 */
export const checkInSchema = z
  .object({
    sessionToken: z.string().min(1, "Attendance session token is required"),
    familyMemberIds: z.array(z.string()).optional(),
  })
  .strict();

/**
 * Explicit excuse / not-expected recording (authorized users only).
 * An excuse is NEVER inferred — a reason is explicitly required for
 * "excused". status "not_expected" must NOT carry a reason.
 */
export const recordExcuseSchema = z
  .object({
    memberId: z.string().uuid("Invalid member identifier"),
    serviceId: z.string().uuid("Invalid service identifier"),
    status: z.enum(["excused", "not_expected"]),
    reason: z.string().min(1, "Excuse reason is required").max(100).optional(),
    note: z.string().max(2000).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.status === "excused" && !data.reason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "An explicit excuse reason is required (e.g. sick, travel, other)",
      });
    }
    if (data.status === "not_expected" && data.reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "A reason is not allowed for a not_expected status",
      });
    }
  });

export const checkOutSchema = z.object({
  memberId: z.string().uuid("Invalid member identifier"),
  serviceId: z.string().uuid("Invalid service identifier"),
});

// ─── Group Schemas ───────────────────────────────────────────

export const createGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(100),
  description: z.string().max(500).optional(),
  leaderId: z.string().uuid().optional(),
  ministryId: z.string().uuid().optional(),
  maxCapacity: z.number().int().min(1).optional(),
  meetingSchedule: z.string().max(200).optional(),
});

export const updateGroupSchema = createGroupSchema.partial();

// ─── Ministry Schemas ────────────────────────────────────────

export const createMinistrySchema = z.object({
  name: z.string().min(1, "Ministry name is required").max(100),
  description: z.string().max(500).optional(),
  leaderId: z.string().uuid().optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(20).optional(),
  meetingSchedule: z.string().max(200).optional(),
});

export const updateMinistrySchema = createMinistrySchema.partial();

// ─── Event Schemas ───────────────────────────────────────────

export const createEventSchema = z.object({
  title: z.string().min(1, "Event title is required").max(200),
  description: z.string().max(2000).optional(),
  startTime: z.string().datetime("Invalid start time"),
  endTime: z.string().datetime("Invalid end time").optional(),
  location: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  maxAttendees: z.number().int().min(1).optional(),
});

export const updateEventSchema = createEventSchema.partial();

export type CreateGroupInput = z.input<typeof createGroupSchema>;
export type UpdateGroupInput = z.input<typeof updateGroupSchema>;
export type CreateMinistryInput = z.input<typeof createMinistrySchema>;
export type UpdateMinistryInput = z.input<typeof updateMinistrySchema>;
export type CreateEventInput = z.input<typeof createEventSchema>;
export type UpdateEventInput = z.input<typeof updateEventSchema>;

// ─── Follow-Up Schemas ───────────────────────────────────────

export const createFollowUpSchema = z.object({
  memberId: z.string().min(1, "Member is required"),
  assignedTo: z.string().min(1, "Assignee is required").optional(),
  type: z.enum(["absenteeism", "welcome_back", "visitor", "pastoral_care", "general"]).default("general"),
  reason: z.string().min(1, "Reason is required").max(500),
  notes: z.string().max(2000).optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.enum(["open", "in_progress", "completed", "cancelled", "pending"]).default("open"),
  dueDate: z.string().optional(),
  nextAction: z.string().max(500).optional(),
});

export const createFamilySchema = z.object({
  name: z.string().min(1, "Family name is required").max(200),
  // Optional family-level photo. Never required: consumers fall back to avatars.
  familyPhotoUrl: z.string().url("Family photo must be a valid URL").max(500).nullable().optional(),
  // Explicit designation only. Never inferred from a `father` relationship.
  headMemberId: z.string().uuid("Invalid member id").nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const updateFamilySchema = createFamilySchema.partial();

export const familyRelationshipTypeSchema = z.enum([
  "father",
  "mother",
  "child",
  "spouse",
  "sibling",
  "guardian",
  "other",
]);

export const createFamilyRelationshipSchema = z.object({
  fromMemberId: z.string().uuid("Invalid member id"),
  toMemberId: z.string().uuid("Invalid member id"),
  type: familyRelationshipTypeSchema,
});

export const updateFamilyRelationshipSchema = createFamilyRelationshipSchema.partial();

/**
 * A boolean that arrives as a query string.
 *
 * `z.coerce.boolean()` cannot be used here: it applies JavaScript truthiness, so
 * the string "false" coerces to `true` and the directory would return exactly the
 * opposite of what was asked for. Only the explicit spellings are accepted, and
 * anything else is a validation error rather than a silent `true`.
 */
const booleanQueryParam = z
  .enum(["true", "false", "1", "0"])
  .transform((v) => v === "true" || v === "1");

export const familyQuerySchema = paginationSchema
  .extend({
    search: z.string().max(200).optional(),
    headMemberId: z.string().uuid().optional(),
    // Directory filters. All optional and all validated here so the route never
    // has to reason about the shape of a filter value.
    hasPhoto: booleanQueryParam.optional(),
    hasChildren: booleanQueryParam.optional(),
    minSize: z.coerce.number().int().min(1).max(100).optional(),
    maxSize: z.coerce.number().int().min(1).max(100).optional(),
    relationshipType: familyRelationshipTypeSchema.optional(),
  })
  .refine(
    (q) =>
      q.minSize === undefined ||
      q.maxSize === undefined ||
      q.minSize <= q.maxSize,
    {
      message: "minSize cannot be greater than maxSize",
      path: ["minSize"],
    },
  );

export const updateFollowUpSchema = createFollowUpSchema.partial().extend({
  completedAt: z.string().optional(),
  lastContact: z.string().optional(),
});

export const createFollowUpActivitySchema = z.object({
  contactType: z.enum(["phone", "whatsapp", "visit", "in_person", "other"]),
  notes: z.string().min(1, "Notes are required").max(2000),
  contactDate: z.string().optional(),
});

export const followUpQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  priority: z.string().optional(),
  type: z.string().optional(),
  assignedTo: z.string().optional(),
  memberId: z.string().optional(),
  search: z.string().optional(),
});

// ─── Shepherding Schemas ─────────────────────────────────────

export const createShepherdingSchema = z.object({
  memberId: z.string().uuid("Invalid member identifier"),
  assignedTo: z.string().uuid().optional(),
  status: z.enum(["attention_needed", "stable", "thriving"]).default("stable"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  notes: z.string().max(2000).optional(),
});

export const updateShepherdingSchema = createShepherdingSchema.partial();

// ─── Prayer Request Schemas ──────────────────────────────────

export const createPrayerRequestSchema = z.object({
  memberId: z.string().uuid("Invalid member identifier").optional(),
  category: z.string().min(1, "Category is required").max(100),
  request: z.string().min(1, "Prayer request text is required").max(2000),
  assignedShepherd: z.string().uuid().optional(),
});

export const updatePrayerRequestSchema = createPrayerRequestSchema.partial().extend({
  status: z.enum(["new", "in_prayer", "prayed", "follow_up_needed"]).optional(),
});

export type CreatePrayerRequestInput = z.input<typeof createPrayerRequestSchema>;
export type UpdatePrayerRequestInput = z.input<typeof updatePrayerRequestSchema>;

// ─── Validation Helper ───────────────────────────────────────

/**
 * Parse `data` with `schema`, turning any failure into a `ValidationError`
 * keyed by field path.
 *
 * Typed as `z.ZodTypeAny` -> `z.output<S>` rather than a single `T` for input
 * and output, because a schema may legitimately transform or refine: the
 * family directory query, for example, takes `hasChildren` as the string
 * `"true"`/`"false"` and outputs a real boolean. The old `z.ZodSchema<T>`
 * signature forced those two types to be identical, so any schema with a
 * transform could not be passed here at all.
 */
export function validate<S extends z.ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    result.error.errors.forEach((err) => {
      const path = err.path.join(".");
      if (!fieldErrors[path]) fieldErrors[path] = [];
      fieldErrors[path].push(err.message);
    });
    throw new ValidationError(fieldErrors);
  }
  return result.data as z.output<S>;
}

// ─── Community: Talent Schemas ────────────────────────────────

export const professionCategorySchema = z.enum([
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
]);

export const talentWillingnessSchema = z.enum(["yes", "maybe", "not_currently"]);

/**
 * A skill name as typed by a member.
 *
 * Bounded and normalised, because these strings become rows in the tenant's
 * Skill table: an unbounded or whitespace-only list would let one member create
 * hundreds of junk skills that then appear as search suggestions to everybody.
 */
const skillNameSchema = z
  .string()
  .trim()
  .min(1, "Skill cannot be empty")
  .max(100, "Skill cannot exceed 100 characters");

/** Trim, then drop case-insensitive duplicates while keeping the first spelling. */
const dedupeStrings = (values: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
};

export const upsertTalentProfileSchema = z
  .object({
    professionCategory: professionCategorySchema.nullable().optional(),
    // Free text on purpose: a real job title is never forced into the nearest
    // wrong category. `professionCategory` is what the directory filters on.
    // 150 matches the VarChar(150) column, so an over-long title is rejected at
    // the edge instead of becoming a database error.
    profession: z.string().trim().max(150).nullable().optional(),
    experience: z.string().trim().max(2000).nullable().optional(),
    yearsExperience: z
      .number({ invalid_type_error: "Years of experience must be a number" })
      .int()
      .min(0)
      .max(80)
      .nullable()
      .optional(),
    willingness: talentWillingnessSchema.optional(),
    willingAreas: z.string().trim().max(500).nullable().optional(),
    isDiscoverable: z.boolean().optional(),
    skills: z
      .array(skillNameSchema)
      .max(50, "A profile can hold at most 50 skills")
      .transform(dedupeStrings)
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Provide at least one field to update",
  })
  .refine(
    (v) =>
      v.professionCategory !== "other" ||
      v.profession === undefined ||
      (v.profession?.trim().length ?? 0) > 0,
    {
      message: "Enter your profession when the category is 'other'",
      path: ["profession"],
    },
  );

/** A structured filter the directory can render, for callers that skip the NL box. */
export const talentDirectoryQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(200).optional(),
  professionCategory: professionCategorySchema.optional(),
  skill: z.string().trim().max(100).optional(),
  ministry: z.string().trim().max(200).optional(),
  group: z.string().trim().max(200).optional(),
  willingness: z.union([talentWillingnessSchema, z.literal("any")]).optional(),
  /**
   * Staff may widen the search to members who have not opted in. Off by default
   * because discoverability is the member's decision, and the default reflects it.
   */
  includeNotDiscoverable: booleanQueryParam.optional(),
  /**
   * Multi-skill filter, as repeated `skills=` params or one comma-separated list.
   *
   * Skill IDs rather than names, because names are free text typed by members and
   * two members can spell the same skill differently. Filtering on the row id is
   * what makes "Guitar" and "guitar " the same facet instead of two near-miss
   * buckets that each return almost nobody.
   */
  skills: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v.split(",")))
    .transform((ids) =>
      ids.map((s) => s.trim()).filter((s) => s.length > 0),
    )
    .pipe(z.array(z.string().uuid("Each skill must be a valid id")).max(25))
    .optional(),
  /**
   * How multiple selected skills combine. "any" (the default) returns members
   * holding at least one; "all" requires every one.
   *
   * Defaulting to "any" is a deliberate choice for a small church: asking for
   * three skills and silently returning nobody teaches the user nothing, whereas
   * "any" shows them the pool and the per-skill counts let them narrow.
   */
  skillMode: z.enum(["any", "all"]).default("any"),
});

/**
 * How a message is raised.
 *
 * `memberId` is required for staff sends and ignored for member replies — the
 * service resolves the reply target from the login and rejects a body that tries
 * to name somebody else, so this field can never redirect a reply.
 */
export const sendMessageSchema = z.object({
  memberId: z
    .string()
    .uuid("A member id is required")
    .optional()
    .describe("Target member. Ignored when replying as a member."),
  body: z
    .string()
    .trim()
    .min(1, "Write a message before sending")
    .max(4000, "Keep the message under 4000 characters"),
  channel: z.enum(["in_app", "whatsapp"]).default("in_app"),
});

export const messageReplySchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write a reply before sending")
    .max(4000, "Keep the reply under 4000 characters"),
});

export const sendBulkMessageSchema = z.object({
  memberIds: z.array(z.string().uuid("Invalid member id")).min(1, "Select at least one member"),
  body: z
    .string()
    .trim()
    .min(1, "Write a message before sending")
    .max(4000, "Keep the message under 4000 characters"),
  channel: z.enum(["in_app", "whatsapp"]).default("in_app"),
});

export const announcementAudienceSchema = z.object({
  everyone: z.boolean().optional(),
  roles: z.array(z.enum(["admin", "pastor", "leader", "usher", "member"])).max(5).optional(),
  groupIds: z.array(z.string().uuid("Invalid group id")).max(100).optional(),
  ministries: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  statuses: z.array(z.enum(["active", "inactive", "visitor"])).max(3).optional(),
});

export const previewAnnouncementSchema = z.object({
  audience: announcementAudienceSchema,
});

export const sendAnnouncementSchema = z.object({
  title: z.string().trim().min(1, "Give the announcement a title").max(160, "Keep the title under 160 characters"),
  body: z
    .string()
    .trim()
    .min(1, "Write the announcement before sending")
    .max(4000, "Keep the announcement under 4000 characters"),
  audience: announcementAudienceSchema,
});

export const reserveSeatsSchema = z.object({
  sectionId: z.enum(["ground_left", "ground_center", "ground_right", "gallery"]),
  row: z.string().trim().min(1).max(4),
  count: z.number().int().min(1).max(6),
});

export const usherSeatActionSchema = z.object({
  status: z.enum(["seated", "released"]),
});

export const sharePrayerWallSchema = z.object({
  body: z
    .string()
    .trim()
    .min(5, "Write a few words for your prayer")
    .max(1000, "Keep the prayer under 1000 characters"),
  kind: z.enum(["prayer", "answered"]).default("prayer"),
  /** Show the author's name on the wall. Anonymous unless asked. */
  showName: z.boolean().default(false),
});

export const prayerWallQuerySchema = z.object({
  kind: z.enum(["prayer", "answered"]).default("prayer"),
});

export const moderatePrayerWallSchema = z.object({
  status: z.enum(["approved", "rejected", "archived"]),
});

export const prayerWallModerationQuerySchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "archived"]).default("pending"),
});

export const saveRolePermissionsSchema = z.object({
  role: z.string().trim().min(1).max(50),
  permissions: z.array(z.string().trim().min(1).max(60)).max(200),
});

export const setUserRoleSchema = z.object({
  role: z.string().trim().min(1).max(50),
});

export const roleRequestSchema = z.object({
  requestedRole: z.enum(["usher", "leader", "pastor", "admin"]),
  note: z.string().trim().max(500).nullable().optional(),
});

export const decideRoleRequestSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  role: z.string().trim().min(1).max(50).optional(),
});

export const talentSearchRequestSchema = z.object({
  question: z
    .string()
    .trim()
    .min(3, "Ask a question of at least 3 characters")
    .max(300, "Keep the question under 300 characters"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/**
 * Validator for whatever the AI interpreter returns.
 *
 * This is the trust boundary: a language model is untrusted input, so its
 * structured output is parsed, bounded, and trimmed here exactly as a request
 * body is. Anything that fails falls back to the deterministic parser rather
 * than reaching the repository.
 */
export const talentSearchCriteriaSchema = z.object({
  name: z.string().trim().max(100).optional(),
  profession: z.string().trim().max(200).optional(),
  skills: z.array(z.string().trim().min(1).max(100)).max(15).default([]),
  experience: z.array(z.string().trim().min(1).max(200)).max(10).default([]),
  ministry: z.string().trim().max(200).optional(),
  group: z.string().trim().max(200).optional(),
  willingness: z.union([talentWillingnessSchema, z.literal("any")]).default("any"),
  discoverableOnly: z.boolean().default(true),
});

// ─── Community: Ideas Schemas ─────────────────────────────────

export const ideaCategorySchema = z.enum([
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
]);

export const ideaStatusSchema = z.enum([
  "new",
  "under_review",
  "planned",
  "implemented",
  "declined",
]);

export const createIdeaSchema = z
  .object({
    title: z.string().trim().min(5, "Give the idea a title of at least 5 characters").max(200),
    description: z
      .string()
      .trim()
      .min(20, "Describe the idea in at least 20 characters")
      .max(4000),
    category: ideaCategorySchema,
    // 100 matches the VarChar(100) column.
    categoryOther: z.string().trim().max(100).nullable().optional(),
  })
  .refine((v) => v.category !== "other" || (v.categoryOther?.trim().length ?? 0) > 0, {
    message: "Name your idea category when the category is 'other'",
    path: ["categoryOther"],
  });

export const updateIdeaSchema = z
  .object({
    title: z.string().trim().min(5).max(200).optional(),
    description: z.string().trim().min(20).max(4000).optional(),
    category: ideaCategorySchema.optional(),
    categoryOther: z.string().trim().max(100).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Provide at least one field to update",
  });

/**
 * The staff workflow update.
 *
 * Only the shape is validated here. Whether a given transition is legal depends
 * on the idea's current status, which lives in the database, so the service
 * checks IDEA_STATUS_TRANSITIONS after loading it.
 */
export const updateIdeaWorkflowSchema = z
  .object({
    status: ideaStatusSchema.optional(),
    internalNotes: z.string().trim().max(4000).nullable().optional(),
    ownerId: z.string().uuid().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Provide at least one field to update",
  });

export const ideaQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(200).optional(),
  category: ideaCategorySchema.optional(),
  status: z.union([ideaStatusSchema, z.array(ideaStatusSchema).max(5)]).optional(),
  submittedByMemberId: z.string().uuid().optional(),
});

export const ideaSearchRequestSchema = z.object({
  question: z
    .string()
    .trim()
    .min(3, "Ask a question of at least 3 characters")
    .max(300, "Keep the question under 300 characters"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/** Validator for the idea interpreter's structured output. */
export const ideaSearchCriteriaSchema = z.object({
  text: z.string().trim().max(300).optional(),
  category: ideaCategorySchema.optional(),
  status: z.union([ideaStatusSchema, z.array(ideaStatusSchema).max(5)]).optional(),
  submittedByMemberId: z.string().uuid().optional(),
});

export type UpsertTalentProfileInput = z.infer<typeof upsertTalentProfileSchema>;
export type TalentDirectoryQuery = z.infer<typeof talentDirectoryQuerySchema>;
export type TalentSearchRequest = z.infer<typeof talentSearchRequestSchema>;
export type TalentSearchCriteriaInput = z.infer<typeof talentSearchCriteriaSchema>;
export type CreateIdeaInput = z.infer<typeof createIdeaSchema>;
export type UpdateIdeaInput = z.infer<typeof updateIdeaSchema>;
export type UpdateIdeaWorkflowInput = z.infer<typeof updateIdeaWorkflowSchema>;
export type IdeaQuery = z.infer<typeof ideaQuerySchema>;
export type IdeaSearchRequest = z.infer<typeof ideaSearchRequestSchema>;
export type IdeaSearchCriteriaInput = z.infer<typeof ideaSearchCriteriaSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type SendBulkMessageInput = z.infer<typeof sendBulkMessageSchema>;
export type SendAnnouncementInput = z.infer<typeof sendAnnouncementSchema>;
export type MessageReplyInput = z.infer<typeof messageReplySchema>;
export type SharePrayerWallInput = z.infer<typeof sharePrayerWallSchema>;
export type ModeratePrayerWallInput = z.infer<typeof moderatePrayerWallSchema>;
