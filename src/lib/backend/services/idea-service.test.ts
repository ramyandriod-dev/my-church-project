/**
 * Idea Service
 *
 * Two things are worth proving here.
 *
 * The workflow: a transition is checked against the status read from the
 * database, so a hand-written request cannot skip the review the workflow exists
 * to require. Getting this wrong would let an idea read as "Implemented" when
 * nobody ever looked at it.
 *
 * The notes: `internalNotes` are the church's working notes on an idea, and the
 * member who submitted it must never receive them. The privacy boundary is the
 * repository projection, and these tests assert the service asks for the right
 * one.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { IdeaService, ideaService } from "./idea-service";
import { ideaRepository } from "../../db/repositories/idea-repository";
import prisma from "../../db/prisma";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../errors";
import type { Idea, IdeaStatus, TenantContext } from "../types";

vi.mock("../../db/repositories/idea-repository", () => ({
  ideaRepository: {
    listForTenant: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    applyWorkflowChange: vi.fn(),
    getStats: vi.fn(),
    countByMember: vi.fn(),
  },
}));

/** Pagination fields are defaulted by the schema, so a parsed query always has them. */
const PAGE = { page: 1, limit: 20, sortOrder: "desc" as const };

const TENANT = "t-1";
const MEMBER = "m-1";
const IDEA = "idea-1";

function ctx(overrides: Partial<TenantContext> = {}): TenantContext {
  return {
    tenantId: TENANT,
    userId: "u-1",
    role: "admin",
    email: "admin@example.com",
    permissions: ["ideas.read", "ideas.create", "ideas.manage", "members.read", "ai.use"],
    ...overrides,
  };
}

/** Staff who can run the workflow. */
const staffCtx = ctx();

/** A leader: manages the bank but has no member-directory permission. */
const leaderCtx = ctx({ role: "leader", permissions: ["ideas.read", "ideas.create", "ideas.manage"] });

/** An ordinary member: reads the shared bank, submits ideas, manages nothing. */
const memberCtx = ctx({ role: "member", permissions: ["ideas.read", "ideas.create"] });

function idea(overrides: Partial<Idea> = {}): Idea {
  return {
    id: IDEA,
    tenantId: TENANT,
    submittedByMemberId: MEMBER,
    title: "A bench for the courtyard",
    description: "The courtyard has no seating at all right now.",
    category: "facilities",
    categoryOther: null,
    status: "new",
    ownerId: null,
    ownerName: null,
    statusChangedAt: null,
    statusChangedById: null,
    implementedAt: null,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    submitter: { id: MEMBER, firstName: "Amina", lastName: "Haddad", avatarUrl: null },
    allowedTransitions: ["under_review", "planned", "declined"],
    ...overrides,
  };
}

/** The login's linked member. */
function mockLinkedMember(memberId: string | null = MEMBER) {
  vi.mocked(prisma.user.findFirst).mockResolvedValue({ memberId } as never);
  vi.mocked(prisma.member.findFirst).mockResolvedValue(
    memberId ? ({ id: memberId } as never) : (null as never),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("reading the bank", () => {
  it("asks for notes only when the caller can manage ideas", async () => {
    vi.mocked(ideaRepository.listForTenant).mockResolvedValue({ items: [], total: 0 });

    await ideaService.listIdeas(staffCtx, PAGE);
    expect(vi.mocked(ideaRepository.listForTenant).mock.calls[0][2]).toBe(true);

    await ideaService.listIdeas(leaderCtx, PAGE);
    expect(vi.mocked(ideaRepository.listForTenant).mock.calls[1][2]).toBe(true);

    await ideaService.listIdeas(memberCtx, PAGE);
    // A member gets a projection that has no notes column in it at all.
    expect(vi.mocked(ideaRepository.listForTenant).mock.calls[2][2]).toBe(false);
  });

  it("does not return a member's internal notes", async () => {
    vi.mocked(ideaRepository.getById).mockResolvedValue(idea());
    const result = await ideaService.getIdea(memberCtx, IDEA);
    expect(result.internalNotes).toBeUndefined();
  });

  it("refuses a caller with no ideas.read", async () => {
    const none = ctx({ permissions: [] });
    await expect(ideaService.listIdeas(none, PAGE)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("submitting an idea", () => {
  it("takes the submitter from the login, not the body", async () => {
    mockLinkedMember();
    vi.mocked(ideaRepository.create).mockResolvedValue(idea());

    await ideaService.createIdea(memberCtx, {
      title: "A bench for the courtyard",
      description: "The courtyard has no seating at all right now.",
      category: "facilities",
    });

    expect(ideaRepository.create).toHaveBeenCalledWith(
      TENANT,
      expect.objectContaining({ submittedByMemberId: MEMBER }),
    );
  });

  it("refuses a login with no linked member", async () => {
    mockLinkedMember(null);
    await expect(
      ideaService.createIdea(memberCtx, {
        title: "A bench for the courtyard",
        description: "The courtyard has no seating at all right now.",
        category: "facilities",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(ideaRepository.create).not.toHaveBeenCalled();
  });
});

describe("editing an idea", () => {
  it("lets the submitter edit their own new idea", async () => {
    mockLinkedMember();
    vi.mocked(ideaRepository.getById).mockResolvedValue(idea());
    vi.mocked(ideaRepository.update).mockResolvedValue(idea());

    await ideaService.updateIdea(memberCtx, IDEA, { title: "Benches for the courtyard" });
    expect(ideaRepository.update).toHaveBeenCalled();
  });

  it("stops the submitter editing once the idea is planned", async () => {
    mockLinkedMember();
    vi.mocked(ideaRepository.getById).mockResolvedValue(idea({ status: "planned" }));

    // Past this point the idea belongs to the church's plan rather than to its
    // author, and only ideas.manage holders may change it.
    await expect(
      ideaService.updateIdea(memberCtx, IDEA, { title: "Something else" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(ideaRepository.update).not.toHaveBeenCalled();
  });

  it("stops a member editing somebody else's idea", async () => {
    mockLinkedMember("m-other");
    vi.mocked(ideaRepository.getById).mockResolvedValue(idea());

    await expect(
      ideaService.updateIdea(memberCtx, IDEA, { title: "Something else" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("lets a staff manager edit any idea at any stage", async () => {
    mockLinkedMember();
    vi.mocked(ideaRepository.getById).mockResolvedValue(idea({ status: "implemented" }));
    vi.mocked(ideaRepository.update).mockResolvedValue(idea({ status: "implemented" }));

    await expect(
      ideaService.updateIdea(staffCtx, IDEA, { title: "Benches for the courtyard" }),
    ).resolves.toBeDefined();
  });

  it("lets a manager whose login has no linked member still edit", async () => {
    // A staff login does not have to be backed by a Member row. Requiring one
    // here would stop any such admin or leader from ever managing the bank,
    // which is the opposite of what ideas.manage is for.
    mockLinkedMember(null);
    vi.mocked(ideaRepository.getById).mockResolvedValue(idea({ status: "new" }));
    vi.mocked(ideaRepository.update).mockResolvedValue(idea());

    await expect(
      ideaService.updateIdea(staffCtx, IDEA, { title: "Benches for the courtyard" }),
    ).resolves.toBeDefined();
    expect(ideaRepository.update).toHaveBeenCalled();
  });
});

describe("the workflow", () => {
  it("needs ideas.manage", async () => {
    vi.mocked(ideaRepository.getById).mockResolvedValue(idea());
    await expect(
      ideaService.updateWorkflow(memberCtx, IDEA, { status: "under_review" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("allows a legal step", async () => {
    vi.mocked(ideaRepository.getById).mockResolvedValue(idea({ status: "new" }));
    vi.mocked(ideaRepository.applyWorkflowChange).mockResolvedValue(
      idea({ status: "under_review" }),
    );

    await expect(
      ideaService.updateWorkflow(staffCtx, IDEA, { status: "under_review" }),
    ).resolves.toBeDefined();
    expect(ideaRepository.applyWorkflowChange).toHaveBeenCalledWith(
      TENANT,
      IDEA,
      { status: "under_review" },
      "u-1",
    );
  });

  it("refuses to skip the review", async () => {
    // new -> implemented must not be possible. This is the guarantee the whole
    // status column exists to provide.
    vi.mocked(ideaRepository.getById).mockResolvedValue(idea({ status: "new" }));

    await expect(
      ideaService.updateWorkflow(staffCtx, IDEA, { status: "implemented" }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(ideaRepository.applyWorkflowChange).not.toHaveBeenCalled();
  });

  it("refuses to move out of a terminal status", async () => {
    vi.mocked(ideaRepository.getById).mockResolvedValue(idea({ status: "implemented" }));
    await expect(
      ideaService.updateWorkflow(staffCtx, IDEA, { status: "under_review" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("allows a no-op write of internal notes without a status change", async () => {
    vi.mocked(ideaRepository.getById).mockResolvedValue(idea({ status: "new" }));
    vi.mocked(ideaRepository.applyWorkflowChange).mockResolvedValue(idea());

    await ideaService.updateWorkflow(staffCtx, IDEA, { internalNotes: "Cost about 400." });
    expect(ideaRepository.applyWorkflowChange).toHaveBeenCalled();
  });

  it("refuses an owner who is not a login in this church", async () => {
    vi.mocked(ideaRepository.getById).mockResolvedValue(idea());
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null as never);

    await expect(
      ideaService.updateWorkflow(staffCtx, IDEA, { ownerId: "u-from-another-church" }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(ideaRepository.applyWorkflowChange).not.toHaveBeenCalled();
  });

  it("accepts every status the workflow allows, from every stage", () => {
    const expected: Record<IdeaStatus, IdeaStatus[]> = {
      new: ["under_review", "planned", "declined"],
      under_review: ["planned", "declined"],
      planned: ["under_review", "implemented", "declined"],
      implemented: [],
      declined: ["under_review"],
    };
    for (const [from, allowed] of Object.entries(expected)) {
      expect(IdeaService.allowedTransitions(from as IdeaStatus).sort()).toEqual(
        [...allowed].sort(),
      );
    }
  });
});
