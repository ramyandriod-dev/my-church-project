"use client";

/**
 * Contact actions for one member in the Talent Directory.
 *
 * Two channels, and they are deliberately not treated as equivalent.
 *
 * **In-app** posts a message that is stored, appears in the recipient's inbox,
 * and can be replied to. The recipient actually sees it, so the staff member
 * knows it arrived.
 *
 * **WhatsApp** cannot be given that guarantee. `wa.me` hands the conversation to
 * whatever app the recipient happens to have, and nothing comes back. The one
 * thing that is knowable is that *this church tried*, so that is what gets
 * recorded: `channel: "whatsapp"` means "contact requested", not "sent". The UI
 * says so before the action, because "message sent" would be a lie the staff
 * member may later repeat to somebody.
 *
 * A member with no phone on file is told that plainly instead of being offered
 * a button that cannot work.
 */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { buildWhatsAppLink } from "@/lib/community/whatsapp";
import { useTranslation } from "@/lib/i18n";

type Channel = "in_app" | "whatsapp";

export function MemberContactActions({
  memberId,
  firstName,
  phone,
  skill,
  canMessage,
  onMessageSent,
}: {
  memberId: string;
  firstName: string;
  /** Free-form, as typed by the member. May be absent. */
  phone: string | null;
  /** Used to pre-write the request so it is not a blank chat. */
  skill?: string;
  /** False when the session lacks `messages.send`. */
  canMessage: boolean;
  /** Lets the page refresh its unread badge after a send. */
  onMessageSent?: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState<Channel | null>(null);
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const bodyRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (open) bodyRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(null);
    setBody("");
    setError(null);
  }

  async function sendInApp() {
    const trimmed = body.trim();
    if (!trimmed) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, body: trimmed, channel: "in_app" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message ?? "send failed");
      }
      close();
      onMessageSent?.();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t("messaging.sendFailed", "Could not send. Please try again."));
    } finally {
      setSending(false);
    }
  }

  /**
   * WhatsApp: record the request, then hand off to wa.me.
   *
   * The window is opened *before* awaiting the POST. Opening it afterwards
   * would be treated as a popup by most browsers and silently blocked, so the
   * staff member would be left thinking the request failed.
   */
  async function sendWhatsApp() {
    setError(null);

    const trimmed = body.trim();
    const prefill = trimmed || buildRequestText(firstName, skill, t);

    const link = buildWhatsAppLink({ phone, message: prefill });

    if (!link.ok) {
      // No phone on file. Nothing is recorded: a "request" with no destination
      // is not a request, it is a phantom entry in the thread.
      setOpen(null);
      setNotice(t("messaging.whatsappNoPhone", "No phone number is on file for this member."));
      return;
    }

    const win = typeof window !== "undefined" ? window.open(link.url, "_blank", "noopener") : null;

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, body: prefill, channel: "whatsapp" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        if (win) win.close();
        throw new Error(json?.error?.message ?? "send failed");
      }
      setNotice(t("messaging.sentAsRequest", "Request recorded, opening WhatsApp now."));
      onMessageSent?.();
    } catch (e) {
      if (win) win.close();
      setError(e instanceof Error && e.message ? e.message : t("messaging.sendFailed", "Could not send. Please try again."));
    } finally {
      setSending(false);
    }
  }

  if (!canMessage) {
    return (
      <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
        {t("messaging.noPermission", "You do not have permission to start a conversation.")}
      </p>
    );
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setOpen("in_app")}
        >
          {t("messaging.newMessage", "New message")}
        </Button>

        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setOpen("whatsapp")}
          disabled={!phone}
          title={
            phone
              ? undefined
              : t("messaging.whatsappNoPhone", "No phone number is on file for this member.")
          }
        >
          {t("communityPage.viaWhatsapp", "WhatsApp")}
        </Button>
      </div>

      {!phone ? (
        <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
          {t("messaging.whatsappNoPhone", "No phone number is on file for this member.")}
        </p>
      ) : null}

      {notice ? (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{notice}</p>
      ) : null}

      {open ? (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
          <label
            htmlFor={`msg-${memberId}`}
            className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-200"
          >
            {t("messaging.messagePlaceholder", "Write your message...")}
          </label>
          <textarea
            id={`msg-${memberId}`}
            ref={bodyRef}
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              open === "whatsapp"
                ? buildRequestText(firstName, skill, t)
                : t("messaging.messagePlaceholder", "Write your message...")
            }
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />

          {open === "whatsapp" ? (
            <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-300">
              {t(
                "messaging.whatsappIsRequest",
                "Opening a WhatsApp link does not confirm delivery. This is recorded as a contact request, which the other person may never see.",
              )}
            </p>
          ) : null}

          {error ? (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>
          ) : null}

          <div className="mt-2.5 flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={sending}
              onClick={open === "in_app" ? sendInApp : sendWhatsApp}
            >
              {sending
                ? t("messaging.sending", "Sending...")
                : t("messaging.send", "Send")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={close} disabled={sending}>
              {t("messaging.cancel", "Cancel")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Pre-written request text, so the WhatsApp chat is never a blank screen. */
function buildRequestText(
  firstName: string,
  skill: string | undefined,
  t: (key: string, fallback: string) => string,
): string {
  const hello = t("messaging.helloName", "Hello");
  const asking = t("messaging.askingAbout", "Would you be willing to help with");
  const from = t("messaging.fromChurch", "from our church team");
  return skill
    ? `${hello} ${firstName}, ${asking} ${skill}? — ${from}`
    : `${hello} ${firstName}, ${asking} a little of your time? — ${from}`;
}
