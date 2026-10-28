// ─── Talent & Ideas Mock Data ───────────────────────────────────────────────
//
// The Community screens are client components backed by mock data, matching how
// ./people.ts and ./families.ts work. The shapes below are the exact payloads
// the production endpoints return, so switching a screen to live data is a
// change of loader rather than a change of shape.
//
// The mock is built to make the privacy behaviour visible, not to look tidy:
//
//   - Ray_hidden is `isDiscoverable: false`. The directory and search screens
//     must NOT show him by default. He is in the data so that a screen which
//     ignores the opt-out is visibly wrong, and so the admin-only "show opted
//     out" filter has something real to reveal.
//   - Priya_Shah has no contact details at all, so the "no contact on file"
//     case is exercised without a fake address.
//   - Ideas carry `internalNotes` on some rows. The member-facing view must
//     drop them; the staff view shows them. This mirrors the repository
//     projection, which is where the real boundary lives.
//
// Contact fields are included here because the demo runs as staff. The screens
// still gate the contact action on `canContact` rather than on field presence,
// because that is the flag a member's response actually carries.

import type {
  CommunityStats,
  Idea,
  IdeaStatus,
  TalentDirectoryEntry,
  TalentSkill,
} from "@/lib/backend/types";

const TENANT = "tenant-demo";
const EPOCH = "2026-01-15T09:00:00.000Z";

function skill(name: string, category: string | null = null): TalentSkill {
  return { id: `skill-${name.toLowerCase().replace(/\s+/g, "-")}`, name, category };
}

function entry(
  memberId: string,
  firstName: string,
  lastName: string,
  overrides: Partial<TalentDirectoryEntry> = {},
): TalentDirectoryEntry {
  return {
    memberId,
    firstName,
    lastName,
    avatarUrl: null,
    status: "active",
    professionCategory: null,
    profession: null,
    experience: null,
    yearsExperience: null,
    willingness: "maybe",
    willingAreas: null,
    skills: [],
    ministry: null,
    groupName: null,
    canContact: true,
    updatedAt: EPOCH,
    ...overrides,
  };
}

export const mockTalentDirectory: TalentDirectoryEntry[] = [
  entry("js", "John", "Smith", {
    professionCategory: "technology",
    profession: "Software Engineer",
    experience: "Builds and maintains the church's internal tools and website.",
    yearsExperience: 12,
    willingness: "yes",
    willingAreas: "Website, giving forms, anything that runs on a computer.",
    skills: [skill("Web Development", "Technology")],
    ministry: "Media Team",
    groupName: "Young Adults",
    email: "john.smith@example.com",
    phone: "+1 555 0101",
  }),
  entry("1", "Sarah", "Johnson", {
    professionCategory: "creative",
    profession: "Graphic Designer",
    experience: "Designs service slides, bulletins and event materials.",
    yearsExperience: 8,
    willingness: "yes",
    willingAreas: "Design and print, including Arabic and English layouts.",
    skills: [skill("Graphic Design", "Creative"), skill("Translation", "Communications")],
    ministry: "Communications",
    groupName: "Choir",
    email: "sarah.johnson@example.com",
    phone: "+1 555 0102",
  }),
  entry("mw", "Michael", "Williams", {
    professionCategory: "trades",
    profession: "Electrician",
    experience: "Certified for residential and commercial work.",
    yearsExperience: 15,
    willingness: "maybe",
    willingAreas: "Emergency repairs and planned maintenance weeks.",
    skills: [skill("Electrician", "Trades")],
    ministry: "Facilities",
    email: "michael.williams@example.com",
  }),
  entry("dd", "David", "Davis", {
    professionCategory: "creative",
    profession: "Photographer",
    experience: "Shoots services and community events.",
    yearsExperience: 4,
    willingness: "yes",
    willingAreas: "Baptisms, weddings, outreach photos.",
    skills: [skill("Photography", "Creative"), skill("Graphic Design", "Creative")],
    ministry: "Media Team",
    canContact: false,
  }),
  entry("9", "Amanda", "Garcia", {
    professionCategory: "media",
    profession: "Sound Engineer",
    experience: "Runs the live sound desk on Sunday mornings.",
    yearsExperience: 9,
    willingness: "yes",
    willingAreas: "Live sound and recording for special services.",
    skills: [skill("Sound Engineering", "Media")],
    ministry: "Media Team",
    canContact: false,
  }),
  entry("7", "Rachel", "Taylor", {
    professionCategory: "trades",
    profession: "Plumber",
    experience: "Family business, 20 years in the trade.",
    yearsExperience: 20,
    willingness: "yes",
    willingAreas: "Urgent leaks and the monthly inspection.",
    skills: [skill("Plumbing", "Trades"), skill("Carpentry", "Trades")],
    email: "rachel.parker@example.com",
    phone: "+1 555 0103",
  }),
  // No contact details on file: exercises the "cannot offer contact" path.
  entry("5", "Lisa", "Martinez", {
    professionCategory: "education",
    profession: "Primary School Teacher",
    experience: "Teaches Year 3 and runs the children's holiday club.",
    yearsExperience: 7,
    willingness: "yes",
    willingAreas: "Children's Sunday school.",
    skills: [skill("Teaching", "Education"), skill("First Aid", "Healthcare")],
    ministry: "Children",
    groupName: "Young Parents",
    // No email or phone on file, so no contact action can be offered.
    canContact: false,
  }),
  // Opted out. Must not appear in the directory or search unless a caller with
  // talent.update explicitly asks for it.
  entry("16", "Andrew", "Young", {
    professionCategory: "education",
    profession: "Teacher",
    experience: "Teaches at the local school.",
    yearsExperience: 11,
    willingness: "maybe",
    willingAreas: "Children's Sunday school support.",
    skills: [skill("Teaching", "Education")],
    ministry: "Children",
    canContact: false,
  }),
];

const IDEA_TRANSITIONS: Record<IdeaStatus, IdeaStatus[]> = {
  new: ["under_review", "planned", "declined"],
  under_review: ["planned", "declined"],
  planned: ["under_review", "implemented", "declined"],
  implemented: [],
  declined: ["under_review"],
};

function idea(
  id: string,
  submittedByMemberId: string,
  submitter: { firstName: string; lastName: string },
  title: string,
  description: string,
  category: string,
  status: IdeaStatus,
  internalNotes: string | null = null,
  categoryOther: string | null = null,
): Idea {
  return {
    id,
    tenantId: TENANT,
    submittedByMemberId,
    title,
    description,
    category,
    categoryOther,
    status,
    internalNotes,
    ownerId: null,
    ownerName: null,
    statusChangedAt: status === "new" ? null : EPOCH,
    statusChangedById: null,
    implementedAt: status === "implemented" ? EPOCH : null,
    createdAt: EPOCH,
    updatedAt: EPOCH,
    submitter: { id: submittedByMemberId, ...submitter, avatarUrl: null },
    allowedTransitions: IDEA_TRANSITIONS[status],
  };
}

export const mockIdeas: Idea[] = [
  idea(
    "idea-projector",
    "js",
    { firstName: "John", lastName: "Smith" },
    "Projector in the main hall",
    "The text on the back wall is hard to read from the middle rows. A second projector would help.",
    "facilities",
    "new",
    "Quote from AV supplier requested.",
  ),
  idea(
    "idea-bilingual-booklet",
    "1",
    { firstName: "Sarah", lastName: "Johnson" },
    "Bilingual welcome booklet",
    "Newcomers are asking for something they can take home explaining services and groups.",
    "outreach",
    "under_review",
    "Translation mostly done; needs a second reader.",
  ),
  idea(
    "idea-photo-display",
    "dd",
    { firstName: "David", lastName: "Davis" },
    "Photo display in the foyer",
    "We have three years of outreach photos with nowhere to show them. A simple display would help newcomers see themselves here.",
    "facilities",
    "planned",
    "Frames ordered, wall fixings pending a free Saturday.",
  ),
  idea(
    "idea-nursery-tap",
    "7",
    { firstName: "Rachel", lastName: "Taylor" },
    "Repair the leaking tap in the nursery",
    "The nursery tap drips constantly and the floor gets slippery.",
    "facilities",
    "implemented",
    "Fixed on the 14th at no cost.",
  ),
  idea(
    "idea-nursing-room",
    "5",
    { firstName: "Lisa", lastName: "Martinez" },
    "A quiet room for nursing mothers",
    "There is nowhere private to feed or change a baby during service.",
    "families",
    "new",
  ),
];

/**
 * Strip staff-only fields. The member-facing view calls this, mirroring the
 * repository projection that keeps `internalNotes` out of unauthorised
 * responses. Anything a member may see must survive this.
 */
export function toMemberVisibleIdea(source: Idea): Idea {
  const { internalNotes: _internalNotes, ...rest } = source;
  return rest;
}

export const mockCommunityStats: CommunityStats = {
  membersWithSkills: 7,
  membersWillingToHelp: 6,
  discoverableMembers: 7,
  ideasSubmitted: 5,
  ideasUnderReview: 1,
  ideasImplemented: 1,
  topSkills: [
    { name: "Graphic Design", count: 2 },
    { name: "Teaching", count: 2 },
    { name: "Electrician", count: 1 },
    { name: "Plumbing", count: 1 },
    { name: "Web Development", count: 1 },
  ],
  topCategories: [
    { category: "facilities", count: 3 },
    { category: "outreach", count: 1 },
    { category: "families", count: 1 },
  ],
};

/** The skill vocabulary offered when editing a profile. */
export const mockSuggestedSkills: string[] = [
  "Graphic Design",
  "Photography",
  "Electrician",
  "Plumbing",
  "Carpentry",
  "Accounting",
  "Web Development",
  "Sound Engineering",
  "Teaching",
  "First Aid",
  "Event Planning",
  "Translation",
];

/** One member's own profile, for the "my talent" screen. */
export const mockMyTalent = {
  memberId: "js",
  professionCategory: "technology",
  profession: "Software Engineer",
  experience: "Builds and maintains the church's internal tools and website.",
  yearsExperience: 12,
  willingness: "yes" as const,
  willingAreas: "Website, giving forms, anything that runs on a computer.",
  isDiscoverable: true,
  skills: [skill("Web Development", "Technology")],
  updatedAt: EPOCH,
};
