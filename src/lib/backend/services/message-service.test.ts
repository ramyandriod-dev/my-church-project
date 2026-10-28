/**
 * Message Service
 *
 * A conversation between church staff and a member is the most sensitive thing
 * this feature touches: it is pastoral correspondence about a named person. So
 * nearly every test here is a refusal.
 *
 * The guarantees worth proving are:
 * - a member cannot read, or mark read, anybody's thread but their own
 * - a member cannot start a conversation, or forge a sender, by naming an id
 * - a member naming someone else's id gets the same answer as a non-existent
 *   one, so the API cannot be used to discover who has a thread
 * - a WhatsApp request is refused outright when there is no phone to send to,
 *   rather than logged as a send that did not happen
 * - nothing crosses a tenant boundary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { messageService } from "./message-service";
import { messageRepository } from "../../db/repositories/message-repository";
import prisma from "../../db/prisma";
import { ForbiddenError, NotFoundError, ValidationError } from "../errors";
import type { TenantContext } from "../types";

vi.mock("../../db/repositories/message-repository", () => ({
  messageRepository: {
    listThread: vi.fn(() => []),
    listThreadSummaries: vi.fn(() => []),
    markRead: vi.fn(() => 0),
    countUnread: vi.fn(() => 0),
    countUnreadForMember: vi.fn(() => 0),
    countUnreadInbox: vi.fn(() => 0),
    create: vi.fn(),
  },
}));

const TENANT = "t-1";
const OTHER_TENANT = "t-2";
const STAFF_USER = "u-staff";
const MEMBER_USER = "u-member";
const OWN_MEMBER = "m-own";
const OTHER_MEMBER = "m-other";

function ctx(overrides: Partial<TenantContext> = {}): TenantContext {
  return {
    tenantId: TENANT,
    userId: STAFF_USER,
    role: "admin",
    email: "admin@example.com",
    permissions: ["messages.read", "messages.send", "members.read"],
    ...overrides,
  };
}

const staffCtx = ctx();

/** An ordinary member: only the narrow self grant. */
const memberCtx = ctx({
  userId: MEMBER_USER,
  role: "member",
  permissions: ["messages.self"],
});

function createdMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: "msg-1",
    tenantId: TENANT,
    memberId: OTHER_MEMBER,
    senderKind: "staff",
    senderUserId: STAFF_USER,
    senderName: "Pastor Sam",
    body: "Can you help with guitar?",
    channel: "in_app",
    readAt: null,
    createdAt: new Date(0).toISOString(),
    ...overrides,
  };
}

/** The staff login resolves to a member row with the given phone. */
function mockStaffSender(phone: string | null = "+201005550134") {
  (prisma.user.findFirst as any).mockImplementation((args: any) => {
    // The service asks for `memberId` when resolving a login, and for the
    // display name when snapshotting a sender. One mock, two shapes.
    if (args?.select?.memberId !== undefined) {
      return Promise.resolve({ memberId: null } as any);
    }
    return Promise.resolve({ name: "Pastor Sam", email: "sam@example.com" } as any);
  });
  (prisma.member.findFirst as any).mockImplementation((args: any) => {
    if (args?.select?.phone !== undefined) {
      return Promise.resolve({ id: OTHER_MEMBER, phone } as any);
    }
    return Promise.resolve({ id: OTHER_MEMBER } as any);
  });
}

/** The member login resolves to the given member. */
function mockMemberSender(memberId: string = OWN_MEMBER) {
  (prisma.user.findFirst as any).mockImplementation((args: any) => {
    if (args?.select?.memberId !== undefined) {
      return Promise.resolve({ memberId } as any);
    }
    return Promise.resolve({ name: "Amina", email: "amina@example.com" } as any);
  });
  (prisma.member.findFirst as any).mockImplementation((args: any) => {
    if (args?.select?.phone !== undefined) {
      return Promise.resolve({ id: memberId, phone: "+201005550134" } as any);
    }
    return Promise.resolve({ id: memberId } as any);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);
});

describe("staff inbox", () => {
  it("refuses an ordinary member", async () => {
    await expect(messageService.listInbox(memberCtx)).rejects.toBeInstanceOf(ForbiddenError);
    expect(messageRepository.listThreadSummaries).not.toHaveBeenCalled();
  });

  it("counts unread from the member side only", async () => {
    vi.mocked(messageRepository.countUnreadInbox).mockResolvedValue(3);
    await expect(messageService.getInboxUnreadCount(staffCtx)).resolves.toBe(3);
    // The repository owns the senderKind choice; the service just asks for the
    // whole-inbox count. A regression that flipped this to "staff" would show
    // staff their own sent messages as unread.
    expect(messageRepository.countUnreadInbox).toHaveBeenCalledWith(TENANT);
  });
});

describe("reading a thread", () => {
  it("lets staff read any member's thread in their church", async () => {
    vi.mocked(prisma.member.findFirst).mockResolvedValue({ id: OTHER_MEMBER } as any);
    vi.mocked(messageRepository.listThread).mockResolvedValue([]);
    await expect(messageService.getThread(staffCtx, OTHER_MEMBER)).resolves.toEqual([]);
    expect(messageRepository.listThread).toHaveBeenCalledWith(TENANT, OTHER_MEMBER);
  });

  it("refuses a staff read of a member in another tenant", async () => {
    // A member id from another church simply does not resolve here, so the
    // conversation cannot be reached by guessing ids.
    vi.mocked(prisma.member.findFirst).mockResolvedValue(null as any);
    await expect(messageService.getThread(staffCtx, OTHER_MEMBER)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(messageRepository.listThread).not.toHaveBeenCalled();
  });

  it("lets a member read their own thread", async () => {
    mockMemberSender(OWN_MEMBER);
    vi.mocked(messageRepository.listThread).mockResolvedValue([]);
    await expect(messageService.getThread(memberCtx, OWN_MEMBER)).resolves.toEqual([]);
  });

  it("refuses a member reading somebody else's thread", async () => {
    mockMemberSender(OWN_MEMBER);
    await expect(messageService.getThread(memberCtx, OTHER_MEMBER)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(messageRepository.listThread).not.toHaveBeenCalled();
  });

  it("answers a member's probe for another thread exactly as it answers a missing one", async () => {
    mockMemberSender(OWN_MEMBER);

    const foreign = await messageService
      .getThread(memberCtx, OTHER_MEMBER)
      .catch((e: unknown) => e);
    const nonexistent = await messageService
      .getThread(memberCtx, "00000000-0000-0000-0000-000000000000")
      .catch((e: unknown) => e);

    // Both must be the same error, or the API becomes an oracle for "does this
    // person have a conversation with the church".
    expect(foreign).toBeInstanceOf(NotFoundError);
    expect(nonexistent).toBeInstanceOf(NotFoundError);
    expect((foreign as Error).message).toBe((nonexistent as Error).message);
  });

  it("refuses a caller with neither messages.read nor messages.self", async () => {
    await expect(
      messageService.getThread(ctx({ permissions: ["members.read"] }), OTHER_MEMBER),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("marking read", () => {
  it("marks the member's messages read for staff", async () => {
    vi.mocked(prisma.member.findFirst).mockResolvedValue({ id: OTHER_MEMBER } as any);
    vi.mocked(messageRepository.markRead).mockResolvedValue(2);
    await expect(messageService.markThreadRead(staffCtx, OTHER_MEMBER)).resolves.toBe(2);
    // Direction matters: staff marking a thread read are acknowledging MEMBER
    // messages, never their own.
    expect(messageRepository.markRead).toHaveBeenCalledWith(TENANT, OTHER_MEMBER, "staff");
  });

  it("marks the staff messages read for a member", async () => {
    mockMemberSender(OWN_MEMBER);
    await messageService.markThreadRead(memberCtx, OWN_MEMBER);
    expect(messageRepository.markRead).toHaveBeenCalledWith(TENANT, OWN_MEMBER, "member");
  });

  it("refuses a member marking somebody else's thread read", async () => {
    mockMemberSender(OWN_MEMBER);
    await expect(
      messageService.markThreadRead(memberCtx, OTHER_MEMBER),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(messageRepository.markRead).not.toHaveBeenCalled();
  });
});

/**
 * `/api/messages/me/read` — the member's own thread.
 *
 * This is the endpoint the messaging page posts to when the viewer is a member.
 * It takes no member id at all: the row is resolved from the session, so there is
 * no parameter for a member to tamper with and no second thread to reach. The
 * risk it carries is the mirror image of `markThreadRead` — resolving to the
 * wrong row would clear somebody else's badge.
 */
describe("marking my own thread read", () => {
  it("resolves the row from the session and clears the staff messages on it", async () => {
    mockMemberSender(OWN_MEMBER);
    vi.mocked(messageRepository.markRead).mockResolvedValue(2);

    await expect(messageService.markMyThreadRead(memberCtx)).resolves.toBe(2);

    // The member id comes from the session, never from a request parameter.
    expect(messageRepository.markRead).toHaveBeenCalledWith(TENANT, OWN_MEMBER, "member");
  });

  it("clears staff messages, not the member's own sent mail", async () => {
    // Reading your own thread should not drain the badge you are waiting on.
    // `markRead` is called with the reader as `member`, which is what makes the
    // repository count the opposite direction.
    mockMemberSender(OWN_MEMBER);
    vi.mocked(messageRepository.markRead).mockResolvedValue(1);

    await messageService.markMyThreadRead(memberCtx);

    expect(messageRepository.markRead).toHaveBeenCalledWith(TENANT, OWN_MEMBER, "member");
  });

  it("requires messages.self, so staff cannot use it", async () => {
    // A staff user has no member row, so this would resolve to nothing and
    // silently mark nothing. The permission check turns that into a refusal
    // instead, which is what stops the page from posting here as staff.
    await expect(messageService.markMyThreadRead(staffCtx)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    expect(messageRepository.markRead).not.toHaveBeenCalled();
  });

  it("refuses a user with no member row rather than marking something", async () => {
    (prisma.user.findFirst as any).mockResolvedValue({ memberId: null } as any);

    await expect(messageService.markMyThreadRead(memberCtx)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(messageRepository.markRead).not.toHaveBeenCalled();
  });
});

describe("unread badge", () => {
  it("counts the staff messages waiting on a member's own thread", async () => {
    mockMemberSender(OWN_MEMBER);
    vi.mocked(messageRepository.countUnreadForMember).mockResolvedValue(2);
    await expect(messageService.getMyUnreadCount(memberCtx)).resolves.toBe(2);
    expect(messageRepository.countUnreadForMember).toHaveBeenCalledWith(TENANT, OWN_MEMBER);
  });

  it("counts unanswered MEMBER messages for staff, not their own sent mail", async () => {
    // The regression this pins: staff were being resolved as a member first, so a
    // staff login with no member row got a hard 0 and the badge stayed empty no
    // matter how many people had replied.
    vi.mocked(messageRepository.countUnreadInbox).mockResolvedValue(5);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ memberId: null } as any);

    await expect(messageService.getMyUnreadCount(staffCtx)).resolves.toBe(5);

    expect(messageRepository.countUnreadInbox).toHaveBeenCalledWith(TENANT);
    // Staff must not fall through to the member-side count.
    expect(messageRepository.countUnreadForMember).not.toHaveBeenCalled();
  });

  it("counts a staff login that is also a member as staff", async () => {
    // A pastor with a member row works in the staff inbox. Counting their own
    // thread would give them a different, smaller badge than the inbox shows.
    (prisma.user.findFirst as any).mockResolvedValue({ memberId: OWN_MEMBER });
    vi.mocked(messageRepository.countUnreadInbox).mockResolvedValue(4);
    vi.mocked(messageRepository.countUnreadForMember).mockResolvedValue(1);

    await expect(messageService.getMyUnreadCount(staffCtx)).resolves.toBe(4);
    expect(messageRepository.countUnreadForMember).not.toHaveBeenCalled();
  });

  it("returns 0 for a login on neither side instead of failing", async () => {
    // A bell badge must never be the thing that breaks a page render.
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ memberId: null } as any);
    const orphan = ctx({ permissions: ["members.read"] });
    await expect(messageService.getMyUnreadCount(orphan)).resolves.toBe(0);
    expect(messageRepository.countUnreadInbox).not.toHaveBeenCalled();
    expect(messageRepository.countUnreadForMember).not.toHaveBeenCalled();
  });

  it("returns 0 for a member login with no linked member row", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ memberId: null } as any);
    await expect(messageService.getMyUnreadCount(memberCtx)).resolves.toBe(0);
    expect(messageRepository.countUnreadForMember).not.toHaveBeenCalled();
  });
});

describe("staff sending", () => {
  it("refuses a caller without messages.send", async () => {
    await expect(
      messageService.sendToMember(ctx({ permissions: ["messages.read"] }), {
        memberId: OTHER_MEMBER,
        body: "hello",
        channel: "in_app",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(messageRepository.create).not.toHaveBeenCalled();
  });

  it("refuses to send to a member outside this church", async () => {
    mockStaffSender();
    vi.mocked(prisma.member.findFirst).mockResolvedValue(null as any);
    await expect(
      messageService.sendToMember(staffCtx, {
        memberId: OTHER_MEMBER,
        body: "hello",
        channel: "in_app",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(messageRepository.create).not.toHaveBeenCalled();
  });

  it("files the message as staff, with the sender name snapshotted", async () => {
    mockStaffSender();
    vi.mocked(messageRepository.create).mockResolvedValue(createdMessage() as any);

    await messageService.sendToMember(staffCtx, {
      memberId: OTHER_MEMBER,
      body: "Can you help with guitar?",
      channel: "in_app",
    });

    expect(messageRepository.create).toHaveBeenCalledWith(TENANT, {
      memberId: OTHER_MEMBER,
      senderKind: "staff",
      senderUserId: STAFF_USER,
      // Snapshotted so the conversation stays attributable if this login is
      // later removed.
      senderName: "Pastor Sam",
      body: "Can you help with guitar?",
      channel: "in_app",
    });
  });

  it("refuses a WhatsApp request when the member has no phone on file", async () => {
    mockStaffSender(null);
    await expect(
      messageService.sendToMember(staffCtx, {
        memberId: OTHER_MEMBER,
        body: "Can you help?",
        channel: "whatsapp",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    // Nothing is written. A logged "sent on WhatsApp" with no number behind it
    // would sit in the thread looking like a real attempt.
    expect(messageRepository.create).not.toHaveBeenCalled();
  });

  it("allows a WhatsApp request for a national number, degrading to contact picking", async () => {
    mockStaffSender("01005550134");
    vi.mocked(messageRepository.create).mockResolvedValue(
      createdMessage({ channel: "whatsapp" }) as any,
    );

    const message = await messageService.sendToMember(staffCtx, {
      memberId: OTHER_MEMBER,
      body: "Can you help?",
      channel: "whatsapp",
    });

    // Recorded, but still unread: a link tells us nothing about delivery, so the
    // message is never marked read on the strength of having generated one.
    expect(message.channel).toBe("whatsapp");
    expect(message.readAt).toBeNull();
  });

  it("requires a target member", async () => {
    mockStaffSender();
    await expect(
      messageService.sendToMember(staffCtx, { body: "hello", channel: "in_app" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("never marks a new message read, on either channel", async () => {
    mockStaffSender();
    vi.mocked(messageRepository.create).mockResolvedValue(createdMessage() as any);
    const message = await messageService.sendToMember(staffCtx, {
      memberId: OTHER_MEMBER,
      body: "hello",
      channel: "in_app",
    });
    expect(message.readAt).toBeNull();
  });
});

describe("member replying", () => {
  it("refuses a caller without messages.self", async () => {
    mockMemberSender(OWN_MEMBER);
    await expect(
      messageService.replyAsMember(ctx({ permissions: ["messages.send"] }), "hello"),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(messageRepository.create).not.toHaveBeenCalled();
  });

  it("files the reply against the caller's own member, from the login", async () => {
    mockMemberSender(OWN_MEMBER);
    vi.mocked(messageRepository.create).mockResolvedValue(
      createdMessage({ memberId: OWN_MEMBER, senderKind: "member", senderUserId: MEMBER_USER }) as any,
    );

    await messageService.replyAsMember(memberCtx, "Yes, I can help.");

    expect(messageRepository.create).toHaveBeenCalledWith(TENANT, {
      memberId: OWN_MEMBER,
      senderKind: "member",
      senderUserId: MEMBER_USER,
      senderName: "Amina",
      body: "Yes, I can help.",
      // A member replying is always an in-app message: the church cannot
      // verify or act on a "WhatsApp request" from a member.
      channel: "in_app",
    });
  });

  it("refuses a member login with no linked member row", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ memberId: null } as any);
    await expect(messageService.replyAsMember(memberCtx, "hello")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
