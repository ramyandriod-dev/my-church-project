/**
 * Message Service
 *
 * Business logic and the security boundary for staff↔member conversations.
 *
 * ─── Two audiences, one thread ──────────────────────────────
 *
 * A conversation has two readers with different rights. Staff may reach any
 * member's thread in their church; a member may reach only their own. That is
 * expressed as two separate permissions rather than one:
 *
 *   messages.read / messages.send   staff-wide, any thread in this church
 *   messages.self                   the caller's OWN thread and nothing else
 *
 * `messages.self` is never sufficient to read another member's conversation.
 * Every method that takes a `memberId` re-derives the caller's own member and
 * compares, so a hand-crafted request naming somebody else's id is rejected on
 * the server rather than relying on the UI to have hidden the field.
 *
 * ─── Who may send ───────────────────────────────────────────
 *
 * Staff send to a member. A member may only ever reply on their own thread, and
 * the target is resolved from the login rather than the request body, so a member
 * cannot start a conversation with another member, or with staff, by editing a
 * field. `senderKind` is derived from the permission that authorised the send —
 * never accepted from the client — because it decides who the message is
 * unread for.
 *
 * ─── WhatsApp is a request, not a receipt ───────────────────
 *
 * A `wa.me` link hands the text to WhatsApp on the sender's own device and
 * reports nothing back. Recording a `whatsapp` message therefore records that a
 * request was RAISED, and it is never marked read on the strength of having
 * generated a link. The service refuses to record one at all when the member has
 * no usable phone, because a logged "sent via WhatsApp" with no number behind it
 * is a false record.
 */

import { BaseService } from "./base-service";
import { messageRepository } from "../../db/repositories/message-repository";
import { prisma } from "../../db/prisma";
import { hasPermission, requirePermission } from "../authorization";
import { ForbiddenError, NotFoundError, ValidationError } from "../errors";
import { buildWhatsAppLink } from "../../community/whatsapp";
import { hasOwnMember, resolveOwnMember } from "./own-member";
import type {
  Message,
  MessageThreadSummary,
  TenantContext,
} from "../types";
import type { SendMessageInput, SendBulkMessageInput } from "../validation";
import { sendFcmPushToMembers } from "@/lib/push/fcm-service";


/** Staff may read any thread in the church. */
const canReadAnyThread = (ctx: TenantContext): boolean => hasPermission(ctx, "messages.read");

export class MessageService extends BaseService {
  // ─── Staff inbox ──────────────────────────────────────────

  /**
   * Every conversation in the church, newest activity first.
   *
   * Staff-only. A member calling this gets a permission error rather than an
   * empty list, because an empty list would be indistinguishable from "you have
   * no messages" and would hide the mistake.
   */
  async listInbox(ctx: TenantContext, limit?: number): Promise<MessageThreadSummary[]> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "messages.read");
    return messageRepository.listThreadSummaries(ctx.tenantId, {
      unreadSenderKind: "member",
      ...(limit !== undefined ? { limit } : {}),
    });
  }

  /** How many member replies are waiting for staff, for the inbox badge. */
  async getInboxUnreadCount(ctx: TenantContext): Promise<number> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "messages.read");
    return messageRepository.countUnreadInbox(ctx.tenantId);
  }

  // ─── Thread reads ─────────────────────────────────────────

  /**
   * One member's conversation.
   *
   * Staff reach any thread in their church. A member reaches only their own,
   * and the comparison is done here against the login rather than trusting the
   * requested id.
   */
  async getThread(ctx: TenantContext, memberId: string): Promise<Message[]> {
    this.ensureTenant(ctx);
    await this.assertMayReachThread(ctx, memberId);
    return messageRepository.listThread(ctx.tenantId, memberId);
  }

  /** Marks the other side's messages read. Returns how many changed. */
  async markThreadRead(ctx: TenantContext, memberId: string): Promise<number> {
    this.ensureTenant(ctx);
    const { kind } = await this.assertMayReachThread(ctx, memberId);
    return messageRepository.markRead(ctx.tenantId, memberId, kind);
  }

  /**
   * How many messages are waiting for the caller, whichever side they sit on.
   *
   * This is the one count behind the shared notification bell, so it has to serve
   * both audiences. Staff and members ask the same question in different ways:
   *
   *   - Staff read `messages.read`, so the number they want is how many *member*
   *     messages are unanswered. Counting their own sent mail as unread would
   *     leave a badge that never clears.
   *   - Members read `messages.self`, so the number they want is the staff
   *     messages waiting in their own single thread.
   *
   * Staff who also happen to be members (a pastor with a member row) are resolved
   * as staff first: they sit in the staff inbox, which is where their work is.
   *
   * Returns 0 rather than throwing when the login maps to neither side, so a
   * bell badge can never be the thing that breaks a page render.
   */
  async getMyUnreadCount(ctx: TenantContext, audience?: string): Promise<number> {
    this.ensureTenant(ctx);

    if (audience === "member" && (await hasOwnMember(ctx))) {
      const member = await resolveOwnMember(ctx);
      return messageRepository.countUnreadForMember(ctx.tenantId, member.id);
    }

    if (canReadAnyThread(ctx) && audience !== "member") {
      return messageRepository.countUnreadInbox(ctx.tenantId);
    }

    if ((hasPermission(ctx, "messages.self") || canReadAnyThread(ctx)) && (await hasOwnMember(ctx))) {
      const member = await resolveOwnMember(ctx);
      return messageRepository.countUnreadForMember(ctx.tenantId, member.id);
    }

    return 0;
  }

  /**
   * The caller's own thread, resolved entirely from the login.
   *
   * Takes no member id on purpose. A member reaches their conversation through
   * this rather than `/api/messages/:memberId`, so there is no identifier in the
   * request that could be swapped for somebody else's.
   */
  async getMyThread(ctx: TenantContext): Promise<Message[]> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "messages.self");
    const member = await resolveOwnMember(ctx);
    return messageRepository.listThread(ctx.tenantId, member.id);
  }

  /**
   * Mark the caller's own thread read.
   *
   * Passes `member` as the reader so the repository clears the *staff* messages
   * this member has just seen. Clearing the member's own sent mail would drain
   * the badge without anything new having arrived.
   */
  async markMyThreadRead(ctx: TenantContext): Promise<number> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "messages.self");
    const member = await resolveOwnMember(ctx);
    return messageRepository.markRead(ctx.tenantId, member.id, "member");
  }

  // ─── Sends ────────────────────────────────────────────────

  /**
   * Staff message a member.
   *
   * The member is verified to exist in this tenant before anything is written,
   * so a message cannot be filed against a stale or cross-tenant id and appear
   * later in somebody else's inbox.
   */
  async sendToMember(ctx: TenantContext, input: SendMessageInput): Promise<Message> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "messages.send");

    if (!input.memberId) {
      throw new ValidationError({ memberId: ["Choose who to message"] });
    }
    const member = await this.assertMemberInTenant(ctx, input.memberId);

    if (input.channel === "whatsapp") {
      const link = buildWhatsAppLink({
        phone: member.phone,
        message: input.body,
      });
      if (!link.ok) {
        // Refusing here is the point: a logged "sent on WhatsApp" for a member
        // with no phone number on file is a record of something that did not
        // happen, and it would sit in the thread looking like a real attempt.
        throw new ValidationError({
          memberId: [
            "This member has no phone number on file, so a WhatsApp message cannot be requested. Add their number, or send an in-app message instead.",
          ],
        });
      }
    }

    const sender = await this.getSenderName(ctx);

    const message = await messageRepository.create(ctx.tenantId, {
      memberId: member.id,
      senderKind: "staff",
      senderUserId: ctx.userId,
      senderName: sender,
      body: input.body,
      channel: input.channel,
    });

    await this.audit(ctx, "message.send", "message", message.id, undefined, {
      memberId: member.id,
      channel: input.channel,
    });

    // Dispatch FCM push notification to the member's registered devices
    try {
      await sendFcmPushToMembers({
        targetMemberIds: [member.id],
        title: sender || "رسالة من الكنيسة",
        body: input.body,
        type: "message",
        url: "/mobile?open=messages",
        data: {
          messageId: message.id,
          senderKind: "staff",
          memberId: member.id,
        },
      });
    } catch {}

    return message;
  }

  /**
   * Staff send a support message / notification to multiple members in bulk.
   */
  async sendBulkToMembers(
    ctx: TenantContext,
    input: SendBulkMessageInput,
  ): Promise<{ sentCount: number; messageIds: string[] }> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "messages.send");

    if (!input.memberIds || !Array.isArray(input.memberIds) || input.memberIds.length === 0) {
      throw new ValidationError({ memberIds: ["Select at least one member to message"] });
    }

    const trimmedBody = input.body.trim();
    if (!trimmedBody) {
      throw new ValidationError({ body: ["Write a message before sending"] });
    }

    // Verify members exist in tenant
    const members = await prisma.member.findMany({
      where: {
        tenantId: ctx.tenantId,
        id: { in: input.memberIds },
      },
      select: { id: true, firstName: true, phone: true },
    });

    if (members.length === 0) {
      throw new ValidationError({ memberIds: ["No valid members found in your church"] });
    }

    const sender = await this.getSenderName(ctx);
    const createdIds: string[] = [];

    for (const member of members) {
      const msg = await messageRepository.create(ctx.tenantId, {
        memberId: member.id,
        senderKind: "staff",
        senderUserId: ctx.userId,
        senderName: sender,
        body: trimmedBody,
        channel: input.channel,
      });
      createdIds.push(msg.id);
    }

    await this.audit(ctx, "message.send_bulk", "message", createdIds[0] ?? "", undefined, {
      memberCount: createdIds.length,
      channel: input.channel,
    });

    // Dispatch bulk FCM push notification
    try {
      await sendFcmPushToMembers({
        targetMemberIds: members.map((m) => m.id),
        title: sender || "كنيسة مصر الجديدة",
        body: trimmedBody,
        type: "announcement",
        url: "/mobile?open=messages",
        data: {
          type: "announcement",
        },
      });
    } catch {}

    return { sentCount: createdIds.length, messageIds: createdIds };
  }

  /**
   * The member replies on their own thread.
   *
   * `messages.self` is required and the target member is resolved from the login,
   * so the conversation cannot be aimed anywhere else. WhatsApp is not offered
   * here: a member reaching for their own phone is exactly the case where a
   * recorded "request" would be meaningless.
   */
  async replyAsMember(ctx: TenantContext, body: string): Promise<Message> {
    this.ensureTenant(ctx);
    requirePermission(ctx, "messages.self");
    const member = await resolveOwnMember(ctx);

    const message = await messageRepository.create(ctx.tenantId, {
      memberId: member.id,
      senderKind: "member",
      senderUserId: ctx.userId,
      senderName: await this.getSenderName(ctx),
      body,
      channel: "in_app",
    });

    await this.audit(ctx, "message.reply", "message", message.id, undefined, {
      memberId: member.id,
    });

    return message;
  }

  // ─── Internals ────────────────────────────────────────────

  /**
   * The single place thread access is decided.
   *
   * Returns which side the caller is, so read marking cannot disagree with read
   * access: the same branch that permits the read decides whose messages get
   * marked.
   */
  private async assertMayReachThread(
    ctx: TenantContext,
    memberId: string,
  ): Promise<{ kind: "staff" | "member" }> {
    if (canReadAnyThread(ctx)) {
      // Staff still need the target to be a real member of this church, so a
      // valid-looking id from another tenant resolves to nothing.
      await this.assertMemberInTenant(ctx, memberId);
      return { kind: "staff" };
    }

    if (hasPermission(ctx, "messages.self")) {
      const own = await resolveOwnMember(ctx);
      if (own.id !== memberId) {
        // Deliberately NotFound rather than Forbidden: a member probing for
        // other threads learns nothing about whether the id exists, because
        // both "not yours" and "not a member here" answer identically.
        throw new NotFoundError("No conversation found");
      }
      return { kind: "member" };
    }

    throw new ForbiddenError(
      "You do not have permission to read messages. Ask an administrator if you need access.",
    );
  }

  private async assertMemberInTenant(
    ctx: TenantContext,
    memberId: string,
  ): Promise<{ id: string; phone: string | null }> {
    const member = await prisma.member.findFirst({
      where: { id: memberId, tenantId: ctx.tenantId },
      select: { id: true, phone: true },
    });
    if (!member) throw new NotFoundError("That member is not in this church");
    return member;
  }

  /**
   * The display name snapshotted onto each message.
   *
   * Denormalised deliberately: the conversation has to stay attributable after
   * the sending login is removed, so this cannot be a live join at read time.
   */
  private async getSenderName(ctx: TenantContext): Promise<string> {
    const user = await prisma.user.findFirst({
      where: { id: ctx.userId, tenantId: ctx.tenantId },
      select: { name: true, email: true },
    });
    return user?.name?.trim() || user?.email || "Unknown sender";
  }
}

export const messageService = new MessageService();
