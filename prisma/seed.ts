/**
 * Database Seed Strategy
 *
 * Seeds initial data for development and testing.
 * Run with: npx prisma db seed
 *
 * Creates:
 * - Tenant A (Grace Community Church) with admin, normal user, and members
 * - Tenant B (Hope Fellowship Church) with admin and members
 * - This enables cross-tenant isolation testing
 */

import { PrismaClient } from "@prisma/client";

try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local is optional (CI / remote databases may inject env directly)
}

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // ─── Tenant A: Grace Community Church ────────────────────────

  const tenantA = await prisma.tenant.upsert({
    where: { slug: "grace-community" },
    update: {},
    create: {
      name: "Grace Community Church",
      slug: "grace-community",
      domain: "grace.example.com",
      settings: JSON.stringify({
        timezone: "America/New_York",
        defaultServiceName: "Sunday Worship",
      }),
    },
  });
  console.log(`✅ Tenant A: ${tenantA.name} (${tenantA.id})`);

  // Tenant A - Admin User & Member
  const adminMember = await prisma.member.upsert({
    where: { tenantId_email: { tenantId: tenantA.id, email: "admin@grace.community" } },
    update: {},
    create: {
      tenantId: tenantA.id,
      firstName: "David",
      lastName: "Admin",
      email: "admin@grace.community",
      status: "active",
      ministry: "Leadership",
    },
  });
  const tenantAAdmin = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenantA.id,
        email: "admin@grace.community",
      },
    },
    update: { memberId: adminMember.id },
    create: {
      tenantId: tenantA.id,
      email: "admin@grace.community",
      name: "Grace Admin",
      role: "admin",
      memberId: adminMember.id,
    },
  });
  console.log(`  └─ Admin: ${tenantAAdmin.email} (${tenantAAdmin.role})`);

  // Tenant A - Normal User (Leader) & Member
  const leaderMember = await prisma.member.upsert({
    where: { tenantId_email: { tenantId: tenantA.id, email: "leader@grace.community" } },
    update: {},
    create: {
      tenantId: tenantA.id,
      firstName: "Sarah",
      lastName: "Leader",
      email: "leader@grace.community",
      status: "active",
      ministry: "Worship",
    },
  });
  const tenantALeader = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenantA.id,
        email: "leader@grace.community",
      },
    },
    update: { memberId: leaderMember.id },
    create: {
      tenantId: tenantA.id,
      email: "leader@grace.community",
      name: "Grace Leader",
      role: "leader",
      memberId: leaderMember.id,
    },
  });
  console.log(`  └─ Leader: ${tenantALeader.email} (${tenantALeader.role})`);

  // Tenant A - Member User & Member
  const memberMember = await prisma.member.upsert({
    where: { tenantId_email: { tenantId: tenantA.id, email: "member@grace.community" } },
    update: {},
    create: {
      tenantId: tenantA.id,
      firstName: "Grace",
      lastName: "Member",
      email: "member@grace.community",
      status: "active",
      ministry: "General",
    },
  });
  const tenantAMember = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenantA.id,
        email: "member@grace.community",
      },
    },
    update: { memberId: memberMember.id },
    create: {
      tenantId: tenantA.id,
      email: "member@grace.community",
      name: "Grace Member",
      role: "member",
      memberId: memberMember.id,
    },
  });
  console.log(`  └─ Member: ${tenantAMember.email} (${tenantAMember.role})`);

  // Tenant A - Members
  // Phone numbers are demo-only and deliberately fictional.
  //
  // The Talent Directory can open a real `wa.me` chat, so a number that belongs
  // to an actual person would mean a stray click in a demo reaches a stranger.
  // These sit in 07700 900xxx, the block Ofcom reserves for fiction and
  // documentation, so they are not assignable to a real subscriber and
  // WhatsApp will simply report the number is not on WhatsApp.
  //
  // The other members are left without a phone on purpose, which is also what
  // gives the "no phone on file" path something honest to render.
  const membersA = [
    { firstName: "John", lastName: "Smith", email: "john.smith@example.com", status: "active", phone: "+44 7700 900101" },
    { firstName: "Sarah", lastName: "Johnson", email: "sarah.johnson@example.com", status: "active", phone: "+44 7700 900102" },
    { firstName: "Michael", lastName: "Williams", email: "michael.williams@example.com", status: "active", phone: "+44 7700 900103" },
    { firstName: "Emily", lastName: "Brown", email: "emily.brown@example.com", status: "active", phone: "+44 7700 900104" },
    { firstName: "David", lastName: "Davis", email: "david.davis@example.com", status: "visitor", phone: "+44 7700 900105" },
    { firstName: "Angela", lastName: "Davis", email: "angela.davis@example.com", status: "active" },
    { firstName: "Noah", lastName: "Davis", email: "noah.davis@example.com", status: "active" },
    { firstName: "Rachel", lastName: "Parker", email: "rachel.parker@example.com", status: "active" },
    { firstName: "Isaac", lastName: "Parker", email: "isaac.parker@example.com", status: "visitor" },
  ];

  for (const member of membersA) {
    const created = await prisma.member.upsert({
      where: {
        tenantId_email: {
          tenantId: tenantA.id,
          email: member.email,
        },
      },
      update: {},
      create: {
        tenantId: tenantA.id,
        ...member,
      },
    });
    console.log(`  └─ Member: ${created.firstName} ${created.lastName}`);
  }

  // Tenant A - Member User Accounts for the Mobile Check-in demo (M5)
  // Each demo member gets a matching user account so the mobile simulator
  // can sign in as them and resolve their identity via the session (email).
  // Every demo member in the mobile check-in demo must have a matching user
  // account so the simulator can sign in as them. This list is deliberately
  // the first five members of `membersA` (John, Sarah, Michael, Emily, David);
  // the additional members seeded for the family demos below do not need
  // sign-in accounts.
  const memberUserEmails = [
    "john.smith@example.com",
    "sarah.johnson@example.com",
    "michael.williams@example.com",
    "emily.brown@example.com",
    "david.davis@example.com",
  ];
  for (const email of memberUserEmails) {
    const member = await prisma.member.findUnique({
      where: { tenantId_email: { tenantId: tenantA.id, email } },
    });
    if (!member) {
      console.log(`  ⚠ Skipping demo user for unknown member: ${email}`);
      continue;
    }
    const created = await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenantA.id, email } },
      // Link the login to its Member row. Talent self-service resolves the
      // member from the session's userId, so without this the member's own
      // profile screens are unreachable for exactly the people they are for.
      update: { memberId: member.id },
      create: {
        tenantId: tenantA.id,
        email,
        name: `${member.firstName} ${member.lastName}`,
        avatarUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${member.firstName}${member.lastName}`,
        role: "member",
        memberId: member.id,
      },
    });
    console.log(`  └─ Demo Member Account: ${created.email} (${created.role})`);
  }

  // Tenant A - Talent & Ideas demo data
  // Gives the directory, the idea bank and the search demo something real to
  // show. Everything is keyed off the members seeded above, so re-running the
  // seed updates these rows in place instead of duplicating them.
  console.log("  └─ Seeding talent directory and idea bank");

  const communitySkills: { name: string; category: string }[] = [
    { name: "Graphic Design", category: "Creative" },
    { name: "Photography", category: "Creative" },
    { name: "Electrician", category: "Trades" },
    { name: "Plumbing", category: "Trades" },
    { name: "Carpentry", category: "Trades" },
    { name: "Accounting", category: "Finance" },
    { name: "Web Development", category: "Technology" },
    { name: "Sound Engineering", category: "Media" },
    { name: "Teaching", category: "Education" },
    { name: "First Aid", category: "Healthcare" },
    { name: "Event Planning", category: "Ministry" },
    { name: "Translation", category: "Communications" },
  ];

  const skillIds = new Map<string, string>();
  for (const skill of communitySkills) {
    const row = await prisma.skill.upsert({
      where: { tenantId_name: { tenantId: tenantA.id, name: skill.name } },
      update: { category: skill.category },
      create: {
        tenantId: tenantA.id,
        name: skill.name,
        category: skill.category,
        isSuggested: true,
      },
    });
    skillIds.set(skill.name, row.id);
  }

  type TalentDemo = {
    email: string;
    professionCategory: string;
    profession: string;
    experience: string;
    yearsExperience: number | null;
    willingness: string;
    willingAreas: string | null;
    isDiscoverable: boolean;
    skills: string[];
  };

  const talentDemos: TalentDemo[] = [
    {
      email: "john.smith@example.com",
      professionCategory: "technology",
      profession: "Software Engineer",
      experience: "Builds and maintains the church's internal tools and website.",
      yearsExperience: 12,
      willingness: "yes",
      willingAreas: "Website, giving forms, anything that runs on a computer.",
      isDiscoverable: true,
      skills: ["Web Development"],
    },
    {
      email: "sarah.johnson@example.com",
      professionCategory: "creative",
      profession: "Graphic Designer",
      experience: "Designs service slides, bulletins and event materials.",
      yearsExperience: 8,
      willingness: "yes",
      willingAreas: "Design and print, including Arabic and English layouts.",
      isDiscoverable: true,
      skills: ["Graphic Design", "Translation"],
    },
    {
      email: "michael.williams@example.com",
      professionCategory: "trades",
      profession: "Electrician",
      experience: "Certified for residential and commercial work.",
      yearsExperience: 15,
      willingness: "maybe",
      willingAreas: "Emergency repairs and planned maintenance weeks.",
      isDiscoverable: true,
      skills: ["Electrician"],
    },
    {
      email: "emily.brown@example.com",
      professionCategory: "finance",
      profession: "Accountant",
      experience: "Handles the church's books and the annual accounts.",
      yearsExperience: 6,
      willingness: "not_currently",
      willingAreas: null,
      isDiscoverable: true,
      skills: ["Accounting"],
    },
    {
      email: "david.davis@example.com",
      professionCategory: "creative",
      profession: "Photographer",
      experience: "Shoots services and community events.",
      yearsExperience: 4,
      willingness: "yes",
      willingAreas: "Baptisms, weddings, outreach photos.",
      isDiscoverable: true,
      skills: ["Photography", "Graphic Design"],
    },
    {
      email: "angela.davis@example.com",
      professionCategory: "media",
      profession: "Sound Engineer",
      experience: "Runs the live sound desk on Sunday mornings.",
      yearsExperience: 9,
      willingness: "yes",
      willingAreas: "Live sound and recording for special services.",
      isDiscoverable: true,
      skills: ["Sound Engineering"],
    },
    {
      email: "rachel.parker@example.com",
      professionCategory: "trades",
      profession: "Plumber",
      experience: "Family business, 20 years in the trade.",
      yearsExperience: 20,
      willingness: "yes",
      willingAreas: "Urgent leaks and the monthly inspection.",
      isDiscoverable: true,
      skills: ["Plumbing", "Carpentry"],
    },
    {
      // Opted out. Present so the directory demonstrably honours the opt-out:
      // this row must never appear in search or in the default listing.
      email: "noah.davis@example.com",
      professionCategory: "education",
      profession: "Teacher",
      experience: "Teaches at the local school.",
      yearsExperience: 11,
      willingness: "maybe",
      willingAreas: "Children's Sunday school support.",
      isDiscoverable: false,
      skills: ["Teaching", "First Aid"],
    },
  ];

  for (const demo of talentDemos) {
    const member = await prisma.member.findUnique({
      where: { tenantId_email: { tenantId: tenantA.id, email: demo.email } },
    });
    if (!member) {
      console.log(`  ⚠ Skipping talent demo for unknown member: ${demo.email}`);
      continue;
    }

    await prisma.talentProfile.upsert({
      where: { memberId: member.id },
      update: {
        professionCategory: demo.professionCategory,
        profession: demo.profession,
        experience: demo.experience,
        yearsExperience: demo.yearsExperience,
        willingness: demo.willingness,
        willingAreas: demo.willingAreas,
        isDiscoverable: demo.isDiscoverable,
      },
      create: {
        tenantId: tenantA.id,
        memberId: member.id,
        professionCategory: demo.professionCategory,
        profession: demo.profession,
        experience: demo.experience,
        yearsExperience: demo.yearsExperience,
        willingness: demo.willingness,
        willingAreas: demo.willingAreas,
        isDiscoverable: demo.isDiscoverable,
      },
    });

    // Replace the skill list wholesale so a changed demo is reflected exactly.
    await prisma.memberSkill.deleteMany({ where: { memberId: member.id } });
    for (const name of demo.skills) {
      const skillId = skillIds.get(name);
      if (!skillId) continue;
      await prisma.memberSkill.upsert({
        where: { memberId_skillId: { memberId: member.id, skillId } },
        update: {},
        create: { tenantId: tenantA.id, memberId: member.id, skillId },
      });
    }
  }

  const ideaDemos: {
    email: string;
    title: string;
    description: string;
    category: string;
    status: string;
    internalNotes: string | null;
  }[] = [
    {
      email: "john.smith@example.com",
      title: "Projector in the main hall",
      description:
        "The text on the back wall is hard to read from the middle rows. A second projector would help.",
      category: "facilities",
      status: "new",
      internalNotes: "Quote from AV supplier requested.",
    },
    {
      email: "sarah.johnson@example.com",
      title: "Bilingual welcome booklet",
      description:
        "Newcomers are asking for something they can take home explaining services and groups.",
      category: "outreach",
      status: "under_review",
      internalNotes: "Translation mostly done; needs a second reader.",
    },
    {
      email: "david.davis@example.com",
      title: "Photo display in the foyer",
      description:
        "We have three years of outreach photos with nowhere to show them. A simple display would help newcomers see themselves here.",
      category: "facilities",
      status: "planned",
      internalNotes: "Frames ordered, wall fixings pending a free Saturday.",
    },
    {
      email: "rachel.parker@example.com",
      title: "Repair the leaking tap in the nursery",
      description:
        "The nursery tap drips constantly and the floor gets slippery.",
      category: "facilities",
      status: "implemented",
      internalNotes: "Fixed on the 14th at no cost.",
    },
    {
      email: "emily.brown@example.com",
      title: "A quiet room for nursing mothers",
      description:
        "There is nowhere private to feed or change a baby during service.",
      category: "families",
      status: "new",
      internalNotes: null,
    },
  ];

  for (const idea of ideaDemos) {
    const member = await prisma.member.findUnique({
      where: { tenantId_email: { tenantId: tenantA.id, email: idea.email } },
    });
    if (!member) {
      console.log(`  ⚠ Skipping idea demo for unknown member: ${idea.email}`);
      continue;
    }

    // Ideas are not unique on any field, so match the seeded row on its title
    // within the tenant to stay idempotent.
    const existing = await prisma.idea.findFirst({
      where: { tenantId: tenantA.id, title: idea.title },
    });
    const data = {
      title: idea.title,
      description: idea.description,
      category: idea.category,
      status: idea.status,
      internalNotes: idea.internalNotes,
      submittedByMemberId: member.id,
    };
    if (existing) {
      await prisma.idea.update({ where: { id: existing.id }, data });
    } else {
      await prisma.idea.create({ data: { ...data, tenantId: tenantA.id } });
    }
  }

  // Tenant A - Services (idempotent: reuse an existing Friday service if present)
  const serviceA =
    (await prisma.service.findFirst({
      where: { tenantId: tenantA.id, name: "Friday Main Service" },
    })) ??
    (await prisma.service.create({
      data: {
        tenantId: tenantA.id,
        name: "Friday Main Service",
        startTime: new Date(),
        expectedAttendance: 150,
        status: "scheduled",
      },
    }));
  console.log(`  └─ Service: ${serviceA.name}`);

  // Tenant A - Groups
  const groupsA = [
    { name: "Youth Group", description: "For ages 13-18", maxCapacity: 30 },
    { name: "Small Group - East", description: "East side neighborhood group", maxCapacity: 12 },
  ];

  for (const group of groupsA) {
    await prisma.group.create({
      data: {
        tenantId: tenantA.id,
        ...group,
      },
    });
    console.log(`  └─ Group: ${group.name}`);
  }

  // Tenant A - Ministries
  const ministriesA = [
    { name: "Worship Ministry", description: "Leading worship services", icon: "music", color: "#8B5CF6" },
    { name: "Children's Ministry", description: "Sunday school and nursery", icon: "baby", color: "#F59E0B" },
  ];

  for (const ministry of ministriesA) {
    await prisma.ministry.create({
      data: {
        tenantId: tenantA.id,
        ...ministry,
      },
    });
    console.log(`  └─ Ministry: ${ministry.name}`);
  }

  // ─── Tenant A - Demo families ──────────────────────────────────
  // Families are idempotent: they are resolved by their unique (tenant, name)
  // key and their relationships are only created when missing, so re-running
  // the seed never duplicates a relationship.
  //
  // Membership is never stored on the member. Each family is reachable from
  // every member through its relationships, so opening the father, the mother
  // or a child all resolve to the same family record.
  const familyMember = async (email: string) => {
    const member = await prisma.member.findUnique({
      where: { tenantId_email: { tenantId: tenantA.id, email } },
    });
    if (!member) throw new Error(`Seed family member not found: ${email}`);
    return member;
  };

  // Family A has a real family photo, and a father who IS the designated head.
  // Family B has NO family photo, so the UI falls back to the head's avatar.
  // Family C is deliberately incomplete: a single mother and a child, with no
  // father and no spouse recorded. Its head is the mother, which is what
  // proves head-of-family is an explicit designation and never inferred from
  // a `father` relationship.
  const familySpecs = [
    {
      name: "Williams Family",
      photoUrl: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&q=80",
      headEmail: "michael.williams@example.com",
      relationships: [
        { from: "michael.williams@example.com", to: "sarah.johnson@example.com", type: "spouse" },
        { from: "michael.williams@example.com", to: "john.smith@example.com", type: "father" },
        { from: "sarah.johnson@example.com", to: "john.smith@example.com", type: "mother" },
        { from: "michael.williams@example.com", to: "emily.brown@example.com", type: "father" },
        { from: "sarah.johnson@example.com", to: "emily.brown@example.com", type: "mother" },
      ],
    },
    {
      // No familyPhotoUrl -> exercises the avatar fallback path.
      name: "Davis Family",
      photoUrl: null as string | null,
      headEmail: "david.davis@example.com",
      relationships: [
        { from: "david.davis@example.com", to: "angela.davis@example.com", type: "spouse" },
        { from: "david.davis@example.com", to: "noah.davis@example.com", type: "father" },
        { from: "angela.davis@example.com", to: "noah.davis@example.com", type: "mother" },
      ],
    },
    {
      // Incomplete household: mother + child only, no father, no spouse.
      name: "Parker Household",
      photoUrl: null as string | null,
      headEmail: "rachel.parker@example.com",
      relationships: [
        { from: "rachel.parker@example.com", to: "isaac.parker@example.com", type: "mother" },
      ],
    },
  ];

  for (const spec of familySpecs) {
    const head = await familyMember(spec.headEmail);

    const family = await prisma.family.upsert({
      where: { tenantId_name: { tenantId: tenantA.id, name: spec.name } },
      update: {},
      create: {
        tenantId: tenantA.id,
        name: spec.name,
        familyPhotoUrl: spec.photoUrl,
        headMemberId: head.id,
      },
    });

    for (const rel of spec.relationships) {
      const from = await familyMember(rel.from);
      const to = await familyMember(rel.to);
      // Symmetric relationships are stored in a canonical order so the same
      // pair can never be inserted twice.
      const [fromId, toId] =
        rel.type === "spouse" || rel.type === "sibling"
          ? from.id < to.id
            ? [from.id, to.id]
            : [to.id, from.id]
          : [from.id, to.id];

      const existing = await prisma.familyRelationship.findFirst({
        where: {
          tenantId: tenantA.id,
          familyId: family.id,
          fromMemberId: fromId,
          toMemberId: toId,
          type: rel.type,
        },
      });
      if (existing) continue;

      await prisma.familyRelationship.create({
        data: {
          tenantId: tenantA.id,
          familyId: family.id,
          fromMemberId: fromId,
          toMemberId: toId,
          type: rel.type,
        },
      });
    }

    console.log(`  └─ Family: ${family.name} (head: ${head.firstName} ${head.lastName})`);
  }

  console.log("");

  // ─── Tenant B: Hope Fellowship Church ────────────────────────

  const tenantB = await prisma.tenant.upsert({
    where: { slug: "hope-fellowship" },
    update: {},
    create: {
      name: "Hope Fellowship Church",
      slug: "hope-fellowship",
      domain: "hope.example.com",
      settings: JSON.stringify({
        timezone: "America/Chicago",
        defaultServiceName: "Sunday Celebration",
      }),
    },
  });
  console.log(`✅ Tenant B: ${tenantB.name} (${tenantB.id})`);

  // Tenant B - Admin User
  const tenantBAdmin = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenantB.id,
        email: "admin@hope.fellowship",
      },
    },
    update: {},
    create: {
      tenantId: tenantB.id,
      email: "admin@hope.fellowship",
      name: "Hope Admin",
      role: "admin",
    },
  });
  console.log(`  └─ Admin: ${tenantBAdmin.email} (${tenantBAdmin.role})`);

  // Tenant B - Members (different emails from Tenant A)
  const membersB = [
    { firstName: "Lisa", lastName: "Anderson", email: "lisa.anderson@example.com", status: "active" },
    { firstName: "Robert", lastName: "Martinez", email: "robert.martinez@example.com", status: "active" },
    { firstName: "Jennifer", lastName: "Taylor", email: "jennifer.taylor@example.com", status: "active" },
  ];

  for (const member of membersB) {
    const created = await prisma.member.upsert({
      where: {
        tenantId_email: {
          tenantId: tenantB.id,
          email: member.email,
        },
      },
      update: {},
      create: {
        tenantId: tenantB.id,
        ...member,
      },
    });
    console.log(`  └─ Member: ${created.firstName} ${created.lastName}`);
  }

  // Tenant B - Demo family
  // Exists so the seeded data itself demonstrates tenant isolation: the same
  // relationship types appear under a completely separate tenant, and a
  // Tenant A session can never reach these rows.
  const tenantBMember = async (email: string) => {
    const member = await prisma.member.findUnique({
      where: { tenantId_email: { tenantId: tenantB.id, email } },
    });
    if (!member) throw new Error(`Seed family member not found: ${email}`);
    return member;
  };

  {
    const head = await tenantBMember("robert.martinez@example.com");
    const mother = await tenantBMember("lisa.anderson@example.com");
    const child = await tenantBMember("jennifer.taylor@example.com");

    const family = await prisma.family.upsert({
      where: { tenantId_name: { tenantId: tenantB.id, name: "Martinez Family" } },
      update: {},
      create: {
        tenantId: tenantB.id,
        name: "Martinez Family",
        familyPhotoUrl: null,
        headMemberId: head.id,
      },
    });

    const rels = [
      { fromMemberId: head.id, toMemberId: mother.id, type: "spouse" },
      { fromMemberId: head.id, toMemberId: child.id, type: "father" },
      { fromMemberId: mother.id, toMemberId: child.id, type: "mother" },
    ];

    for (const rel of rels) {
      const existing = await prisma.familyRelationship.findFirst({
        where: { tenantId: tenantB.id, familyId: family.id, ...rel },
      });
      if (existing) continue;
      await prisma.familyRelationship.create({
        data: { tenantId: tenantB.id, familyId: family.id, ...rel },
      });
    }
    console.log(`  └─ Family: ${family.name} (head: ${head.firstName} ${head.lastName})`);
  }

  // Tenant B - Service (idempotent)
  const serviceB =
    (await prisma.service.findFirst({
      where: { tenantId: tenantB.id, name: "Sunday Celebration" },
    })) ??
    (await prisma.service.create({
      data: {
        tenantId: tenantB.id,
        name: "Sunday Celebration",
        startTime: new Date(),
        expectedAttendance: 80,
        status: "scheduled",
      },
    }));
  console.log(`  └─ Service: ${serviceB.name}`);

  // Tenant B - Ministry
  await prisma.ministry.create({
    data: {
      tenantId: tenantB.id,
      name: "Outreach Ministry",
      description: "Community service and missions",
      icon: "heart",
      color: "#10B981",
    },
  });
  console.log(`  └─ Ministry: Outreach Ministry`);

  // ─── Passwords ──────────────────────────────────────────────
  //
  // Password verification is live now, so every seeded account needs a real hash
  // or it simply cannot log in. Passwords are not part of the individual user
  // blocks above because they would have to be repeated nine times, and because
  // `update: {}` on those upserts means an existing row is never touched — adding
  // the hash to `create` would only ever help brand-new databases, leaving the
  // accounts that already exist exactly as passwordless as before.
  //
  // A single backfill at the end covers both cases: rows created by this run and
  // rows that were already there. It only touches accounts with no password, so
  // running the seed again cannot silently reset a password someone has since
  // changed.
  const seedPassword = process.env.SEED_USER_PASSWORD || "ChurchDemo!2026";
  const { hashPassword } = await import("../src/lib/auth/password");
  const seedHash = await hashPassword(seedPassword);

  const passwordless = await prisma.user.findMany({
    where: { passwordHash: null },
    select: { id: true, email: true },
  });

  if (passwordless.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: passwordless.map((u) => u.id) } },
      data: { passwordHash: seedHash },
    });
    console.log(`🔑 Set passwords on ${passwordless.length} passwordless account(s)`);
  } else {
    console.log("🔑 All accounts already have a password — left untouched");
  }

  console.log("\n🎉 Seeding complete!\n");
  console.log("Test credentials:");
  console.log("─────────────────────────────────────────────────");
  if (process.env.SEED_USER_PASSWORD) {
    console.log(`  Password: (from SEED_USER_PASSWORD)`);
  } else {
    console.log(`  Password: ${seedPassword}   ← seed default, change before any real use`);
  }
  console.log("");
  console.log("Tenant A (Grace Community):");
  console.log("  Admin:  admin@grace.community");
  console.log("  Leader: leader@grace.community");
  console.log("  Member: member@grace.community");
  console.log("");
  console.log("Member logins linked to a Member row (needed for talent self-service):");
  console.log("  john.smith@example.com      Software Engineer, Web Development");
  console.log("  sarah.johnson@example.com    Graphic Designer, Translation");
  console.log("  michael.williams@example.com Electrician");
  console.log("  emily.brown@example.com      Accountant");
  console.log("  david.davis@example.com      Photographer");
  console.log("");
  console.log("  Admin and leader logins have no Member row, so the talent");
  console.log("  self-service screens return 404 for them by design. Staff use the");
  console.log("  directory instead.");
  console.log("");
  console.log("Tenant B (Hope Fellowship):");
  console.log("  Admin:  admin@hope.fellowship");
  console.log("─────────────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
