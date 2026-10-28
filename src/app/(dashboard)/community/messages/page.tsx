"use client";

/**
 * /community/messages — the messaging surface.
 *
 * One route serves two audiences, because the permission model already decides
 * which one you are:
 *
 *   - Staff (`messages.read`) get the inbox: a list of conversations, each
 *     selectable, plus the ability to start a new one.
 *   - A member (`messages.self`) gets their single thread and nothing else. There
 *     is no thread picker for them, so there is no control that could even be
 *     pointed at somebody else's conversation.
 *
 * Opening a thread marks it read. That is a side effect of *reading*, not a
 * separate "mark as read" button, which is the behaviour people expect from an
 * inbox and avoids a badge that needs clearing by hand.
 *
 * The direction of the count is the easy thing to get backwards: staff are
 * waiting on member replies, members are waiting on staff messages. Neither ever
 * sees their own sent mail counted as unread.
 */

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import type { Message, MessageThreadSummary } from "@/lib/backend/types";

type Audience = "staff" | "member";

export default function MessagesPage() {
  const { t } = useTranslation();

  const [audience, setAudience] = React.useState<Audience | null>(null);
  const [threads, setThreads] = React.useState<MessageThreadSummary[]>([]);
  const [inboxUnread, setInboxUnread] = React.useState(0);

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loadingThread, setLoadingThread] = React.useState(false);

  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Resolve who this is before rendering, so a member is never briefly shown a
  // staff inbox skeleton and an empty state they are not allowed to fill.
  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json().catch(() => null);
        const permissions: string[] = json?.data?.user?.permissions ?? [];
        if (!active) return;
        setAudience(permissions.includes("messages.read") ? "staff" : "member");
      } catch {
        if (active) setAudience("member");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Staff: load the inbox. Members have no list to load.
  React.useEffect(() => {
    if (audience !== "staff") return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/messages");
        const json = await res.json().catch(() => null);
        if (!active) return;
        if (res.ok && json?.success) {
          setThreads(json.data.threads ?? []);
          setInboxUnread(json.data.unread ?? 0);
        } else {
          setError(t("messaging.sendFailed", "Could not load messages."));
        }
      } catch {
        if (active) setError(t("messaging.sendFailed", "Could not load messages."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [audience, t]);

  const activeThread = React.useMemo(
    () => threads.find((x) => x.memberId === activeId) ?? null,
    [threads, activeId],
  );
  const activeThreadName = activeThread
    ? `${activeThread.firstName} ${activeThread.lastName}`.trim()
    : t("messaging.threadWith", "Conversation");

  const { totalMessages, totalUnread, totalRead } = React.useMemo(() => {
    let totalMsg = 0;
    let totalUnr = 0;
    for (const th of threads) {
      totalMsg += th.messageCount || 0;
      totalUnr += th.unreadCount || 0;
    }
    return {
      totalMessages: totalMsg,
      totalUnread: totalUnr,
      totalRead: Math.max(0, totalMsg - totalUnr),
    };
  }, [threads]);

  /**
   * Open a thread and mark it read.
   *
   * For a member there is no id to pass: the endpoint scopes to the caller's own
   * member row, so the client never has to know — or be trusted with — which
   * member it is.
   *
   * Both URLs come from one condition on purpose. They used to be written as two
   * separate expressions, and the read one was left hardcoded to the member
   * endpoint — so a staff member opening somebody's thread posted to their *own*
   * read endpoint, which resolved to the staff user's own member row (or none at
   * all) and quietly marked the wrong conversation. The local counter still
   * dropped, so it looked like it worked. Deriving both from `audience` means
   * there is only one decision to get right.
   */
  async function openThread(memberId: string) {
    setActiveId(memberId);
    setLoadingThread(true);
    setError(null);
    try {
      const threadUrl =
        audience === "staff" ? `/api/messages/${memberId}` : "/api/messages/me";
      const res = await fetch(threadUrl);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message ?? "failed");
      }
      setMessages(json.data.messages ?? []);

      // Reading is what clears the badge. Done after the thread renders so the
      // count does not flicker up before it drops.
      const readUrl =
        audience === "staff"
          ? `/api/messages/${memberId}/read`
          : "/api/messages/me/read";
      await fetch(readUrl, { method: "POST" });
      setThreads((prev) => {
        const next = prev.map((th) =>
          th.memberId === memberId ? { ...th, unreadCount: 0 } : th,
        );
        const newUnread = next.reduce((sum, th) => sum + (th.unreadCount || 0), 0);
        setInboxUnread(newUnread);
        window.dispatchEvent(
          new CustomEvent("cmp:unread-count-changed", { detail: { unread: newUnread } }),
        );
        return next;
      });
    } catch {
      setError(t("messaging.sendFailed", "Could not load messages."));
      setMessages([]);
    } finally {
      setLoadingThread(false);
    }
  }

  async function sendReply() {
    const trimmed = draft.trim();
    if (!trimmed || !activeId) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/messages/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message ?? "failed");
      }
      setDraft("");
      setMessages((prev) => [...prev, json.data.message]);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t("messaging.sendFailed", "Could not send. Please try again."));
    } finally {
      setSending(false);
    }
  }

  if (audience === null) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t("messaging.loading", "Loading messages...")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {audience === "staff"
            ? t("messaging.inbox", "Inbox")
            : t("messaging.myThread", "My messages")}
        </h1>

        {audience === "staff" && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Unread badge pill */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all shadow-2xs ${
                totalUnread > 0
                  ? "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                  : "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  totalUnread > 0 ? "bg-blue-600 animate-pulse" : "bg-slate-400"
                }`}
              />
              <span>
                {totalUnread} {t("messaging.unreadBadge", "unread")}
              </span>
            </div>

            {/* Read messages pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold text-xs shadow-2xs dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
              <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>
                {totalRead} {t("messaging.readBadge", "read")}
              </span>
            </div>

            {/* Total messages pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100/90 text-slate-600 border border-slate-200 font-semibold text-xs dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
              <span>
                {totalMessages} {t("messaging.totalMessages", "total messages")}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        {audience === "staff" ? (
          <aside className="space-y-2">
            {loading ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-slate-500">
                  {t("messaging.loading", "Loading messages...")}
                </CardContent>
              </Card>
            ) : threads.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {t("messaging.emptyInbox", "No conversations yet.")}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {t("messaging.emptyInboxHint", "Start one from the Talent Directory.")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              threads.map((th) => {
                const isUnread = th.unreadCount > 0;
                const isActive = activeId === th.memberId;

                return (
                  <button
                    key={th.memberId}
                    type="button"
                    onClick={() => openThread(th.memberId)}
                    className={`w-full rounded-xl border p-3 text-start transition-all cursor-pointer ${
                      isActive && isUnread
                        ? "border-blue-400 bg-blue-100/80 border-s-4 border-s-blue-600 shadow-xs dark:border-blue-700 dark:bg-blue-950/70"
                        : isActive && !isUnread
                        ? "border-blue-300 bg-blue-50/80 border-s-4 border-s-blue-500 shadow-2xs dark:border-blue-800 dark:bg-blue-950/40"
                        : isUnread
                        ? "border-blue-300/90 bg-gradient-to-r from-blue-50 via-sky-50/60 to-white border-s-4 border-s-blue-600 shadow-2xs hover:shadow-xs hover:border-blue-400 dark:from-blue-950/50 dark:via-slate-900 dark:to-slate-900 dark:border-blue-700"
                        : "border-slate-200 bg-white hover:bg-slate-50/90 border-s-4 border-s-transparent dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {isUnread && (
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-sm shadow-blue-500/50 animate-pulse shrink-0" />
                        )}
                        <span
                          className={`truncate text-sm ${
                            isUnread
                              ? "font-extrabold text-blue-950 dark:text-blue-100"
                              : "font-semibold text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          {th.firstName} {th.lastName}
                        </span>
                      </div>
                      {isUnread ? (
                        <span className="shrink-0 rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-xs">
                          {th.unreadCount} {t("messaging.unreadBadge", "unread")}
                        </span>
                      ) : (
                        <span className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>{t("messaging.readBadge", "read")}</span>
                        </span>
                      )}
                    </div>
                    {th.lastMessage ? (
                      <p
                        className={`mt-1.5 truncate text-xs ${
                          isUnread
                            ? "font-semibold text-blue-900/90 dark:text-blue-200"
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {th.lastMessage.body}
                      </p>
                    ) : null}
                  </button>
                );
              })
            )}
          </aside>
        ) : null}

        <section>
          {audience === "member" && !loading ? (
            <MemberThread
              messages={messages}
              draft={draft}
              setDraft={setDraft}
              sending={sending}
              onSend={sendReply}
              error={error}
              onLoad={() => openThread("me")}
            />
          ) : audience === "staff" ? (
            !activeId ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t("messaging.selectThread", "Choose a conversation to read it.")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ThreadView
                title={activeThreadName}
                messages={messages}
                loading={loadingThread}
                replySlot={
                  <p className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    {t(
                      "messaging.staffCannotReply",
                      "Members reply from their own account. Starting a new message is done from the Talent Directory.",
                    )}
                  </p>
                }
              />
            )
          ) : null}
        </section>
      </div>
    </div>
  );
}

function ThreadView({
  title,
  messages,
  loading,
  replySlot,
}: {
  title: string;
  messages: Message[];
  loading: boolean;
  replySlot?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <Card>
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <h2 className="font-medium text-slate-900 dark:text-slate-100">{title}</h2>
      </div>
      <CardContent className="space-y-3 p-4">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">
            {t("messaging.loading", "Loading messages...")}
          </p>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            {t("messaging.emptyThread", "No messages in this conversation yet.")}
          </p>
        ) : (
          messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))
        )}
        {replySlot}
      </CardContent>
    </Card>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const { t } = useTranslation();
  const fromStaff = message.senderKind === "staff";
  const isWhatsapp = message.channel === "whatsapp";
  const isUnread = !message.readAt && !fromStaff;

  return (
    <div className={`flex ${fromStaff ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm transition-all shadow-2xs ${
          fromStaff
            ? "bg-blue-600 text-white rounded-br-xs"
            : isUnread
            ? "bg-sky-50 border-2 border-blue-400 text-slate-900 rounded-bl-xs ring-2 ring-blue-400/20 dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-100"
            : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 rounded-bl-xs"
        }`}
      >
        {isUnread && (
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-300">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <span>{t("messaging.unreadBadge", "unread")}</span>
          </div>
        )}
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <p
          className={`mt-1.5 text-[11px] flex items-center gap-1.5 ${
            fromStaff ? "text-blue-100" : isUnread ? "text-blue-800/80 dark:text-blue-300" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <span>{message.senderName}</span>
          {isWhatsapp ? <span>· {t("messaging.viaWhatsapp", "via WhatsApp")}</span> : null}
          <span>·</span>
          <span>{new Date(message.createdAt).toLocaleString()}</span>
        </p>
        {isWhatsapp && !message.readAt ? (
          <p
            className={`mt-1 text-[11px] ${
              fromStaff ? "text-amber-100" : "text-amber-700 dark:text-amber-300"
            }`}
          >
            {t("messaging.requestedAt", "Contact requested")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function MemberThread({
  messages,
  draft,
  setDraft,
  sending,
  onSend,
  onLoad,
  error,
}: {
  messages: Message[];
  draft: string;
  setDraft: (v: string) => void;
  sending: boolean;
  onSend: () => void;
  onLoad: () => void;
  error: string | null;
}) {
  const { t } = useTranslation();
  const [attempted, setAttempted] = React.useState(false);

  React.useEffect(() => {
    if (!attempted) {
      setAttempted(true);
      onLoad();
    }
  }, [attempted, onLoad]);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            {t("messaging.emptyThread", "No messages in this conversation yet.")}
          </p>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}

        {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}

        <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
          <label htmlFor="reply" className="sr-only">
            {t("messaging.replyPlaceholder", "Write your reply...")}
          </label>
          <textarea
            id="reply"
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("messaging.replyPlaceholder", "Write your reply...")}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <div className="mt-2 flex justify-end">
            <Button type="button" size="sm" onClick={onSend} disabled={sending || !draft.trim()}>
              {sending ? t("messaging.sending", "Sending...") : t("messaging.send", "Send")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
