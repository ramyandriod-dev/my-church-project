/**
 * Messages Repository
 *
 * Tenant-scoped data access for staff↔member conversations. The MessageService
 * calls this repository; the repository calls Prisma. Route handlers never touch
 * Prisma directly.
 *
 * CRITICAL SECURITY RULES:
 *
 * 1. Tenant isolation. Every query filters on tenantId, always the
 *    server-resolved tenant from TenantContext, never a client value.
 *
 * 2. The memberId filter is never optional. There is no "list all messages in
 *    the church" method here on purpose: a thread is always reached through a
 *    member, and the staff inbox is built from a per-member aggregate rather than
 *    from a flat scan. That way a bug can at worst return the wrong member's
 *    thread — never every conversation at once.
 *
 * 3. Read state is directional. A single `readAt` is only safe because
 *    `senderKind` fixes which side the recipient is on; the count methods encode
 *    that same rule so the badge and the thread can never disagree about who has
 *    read what.
 */

import prisma from "../prisma";
import type {
  Message,
  MessageChannel,
  MessageSenderKind,
  MessageThreadSummary,
} from "../../backend/types";

export interface CreateMessageRecordInput {
  memberId: string;
  senderKind: MessageSenderKind;
  senderUserId: string | null;
  senderName: string;
  body: string;
  channel: MessageChannel;
}

export interface ThreadSummaryOptions {
  /** Which side's messages count as unread. Staff inbox counts member messages. */
  unreadSenderKind: MessageSenderKind;
  limit?: number;
}

/**
 * The exact column set a message read may fetch.
 *
 * `select` rather than `include`, so the omission is structural: there is no
 * forgotten-field path by which a column the caller should not see could appear
 * in a payload. Every field here is safe for both sides of the conversation to
 * see — a message is not a private note, it is the conversation itself — so no
 * projection flag is needed.
 */
const messageSelect = {
  id: true,
  tenantId: true,
  memberId: true,
  senderKind: true,
  senderUserId: true,
  senderName: true,
  body: true,
  channel: true,
  readAt: true,
  createdAt: true,
} as const;

function mapMessage(raw: any): Message {
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    memberId: raw.memberId,
    senderKind: raw.senderKind as MessageSenderKind,
    senderUserId: raw.senderUserId ?? null,
    senderName: raw.senderName,
    body: raw.body,
    channel: raw.channel as MessageChannel,
    readAt: raw.readAt ? new Date(raw.readAt).toISOString() : null,
    createdAt: new Date(raw.createdAt).toISOString(),
  };
}

class MessageRepository {
  // ─── Thread reads ──────────────────────────────────────────

  /** One member's conversation, oldest first, so it reads top to bottom. */
  async listThread(tenantId: string, memberId: string, limit = 200): Promise<Message[]> {
    const rows = await prisma.message.findMany({
      where: { tenantId, memberId },
      select: messageSelect,
      orderBy: [{ createdAt: "asc" }],
      take: limit,
    });
    return rows.map(mapMessage);
  }

  /**
   * Mark the messages the given side has now read.
   *
   * Scoped by `senderKind` as well as by `readAt: null`, so marking a thread
   * read can never touch a message the reader did not receive — including the
   * reader's own messages, which are never "unread by" them.
   */
  async markRead(
    tenantId: string,
    memberId: string,
    readBy: MessageSenderKind,
    at: Date = new Date(),
  ): Promise<number> {
    const result = await prisma.message.updateMany({
      where: {
        tenantId,
        memberId,
        // The reader is the opposite side from the sender.
        senderKind: readBy === "staff" ? "member" : "staff",
        readAt: null,
      },
      data: { readAt: at },
    });
    return result.count;
  }

  async countUnread(
    tenantId: string,
    memberId: string,
    unreadSenderKind: MessageSenderKind,
  ): Promise<number> {
    return prisma.message.count({
      where: { tenantId, memberId, senderKind: unreadSenderKind, readAt: null },
    });
  }

  // ─── Staff inbox ──────────────────────────────────────────

  /**
   * Per-member thread summaries for the staff inbox, newest activity first.
   *
   * Built from the individual columns rather than `include`, so a thread with a
   * thousand messages still costs a fixed number of rows: the latest message and
   * the counts are each fetched once for the whole inbox, then zipped in memory.
   * That matters because the alternative — loading every message in the church
   * to build a list of conversations — gets steadily worse as the church grows,
   * and would drag message *bodies* across the wire to render a preview that
   * only needs the last one.
   */
  async listThreadSummaries(
    tenantId: string,
    options: ThreadSummaryOptions,
  ): Promise<MessageThreadSummary[]> {
    const limit = options.limit ?? 100;

    const members = await prisma.member.findMany({
      where: { tenantId, messages: { some: {} } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        messages: {
          select: messageSelect,
          orderBy: [{ createdAt: "desc" }],
          take: 1,
        },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    // One grouped count for the whole inbox rather than N+1 per member.
    const unreadRows = await prisma.message.groupBy({
      by: ["memberId"],
      where: { tenantId, senderKind: options.unreadSenderKind, readAt: null },
      _count: { _all: true },
    });
    const unreadByMember = new Map(
      (unreadRows as any[]).map((r: any) => [r.memberId, r._count._all]),
    );

    return members
      .filter((m: any) => m.messages.length > 0)
      .map((m: any) => {
        const latest = m.messages[0];
        return {
          memberId: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
          avatarUrl: m.avatarUrl ?? null,
          lastMessage: {
            body: latest.body,
            senderKind: latest.senderKind,
            channel: latest.channel,
            createdAt: new Date(latest.createdAt).toISOString(),
          },
          messageCount: m._count.messages,
          unreadCount: unreadByMember.get(m.id) ?? 0,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.lastMessage.createdAt).getTime() -
          new Date(a.lastMessage.createdAt).getTime(),
      );
  }

  /** How many messages are waiting for a member, for their unread badge. */
  async countUnreadForMember(tenantId: string, memberId: string): Promise<number> {
    return prisma.message.count({
      where: { tenantId, memberId, senderKind: "staff", readAt: null },
    });
  }

  /**
   * How many member replies are waiting for staff anywhere in the church, for the
   * inbox badge.
   *
   * Separate from `countUnread` because that one is thread-scoped, and a
   * thread-scoped count cannot be asked about "the whole inbox" without a member
   * to scope it to.
   */
  async countUnreadInbox(tenantId: string): Promise<number> {
    return prisma.message.count({
      where: { tenantId, senderKind: "member", readAt: null },
    });
  }

  // ─── Writes ───────────────────────────────────────────────

  /**
   * File a message.
   *
   * `readAt` is never set here. A message is unread by definition at the moment
   * it is sent, including the WhatsApp ones — a `wa.me` link cannot tell us the
   * recipient saw anything, so claiming otherwise would be a fiction.
   */
  async create(tenantId: string, input: CreateMessageRecordInput): Promise<Message> {
    const raw = await prisma.message.create({
      data: {
        tenantId,
        memberId: input.memberId,
        senderKind: input.senderKind,
        senderUserId: input.senderUserId,
        senderName: input.senderName,
        body: input.body,
        channel: input.channel,
      },
      select: messageSelect,
    });
    return mapMessage(raw);
  }
}

export const messageRepository = new MessageRepository();
export { mapMessage, messageSelect };
