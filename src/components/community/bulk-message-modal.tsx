"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import type { TalentDirectoryEntry } from "@/lib/backend/types";

interface BulkMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMembers: TalentDirectoryEntry[];
  onSent: () => void;
}

export function BulkMessageModal({
  isOpen,
  onClose,
  selectedMembers,
  onSent,
}: BulkMessageModalProps) {
  const { t, locale } = useTranslation();
  const isAr = locale === "ar";

  const [body, setBody] = React.useState("");
  const [channel, setChannel] = React.useState<"in_app" | "whatsapp">("in_app");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  // Quick message presets tailored for church talent support & ministry engagement
  const presets = [
    {
      title: isAr ? "دعوة للخدمة والمشاركة" : "Ministry Opportunity",
      text: isAr
        ? "سلام ونعمة من ربنا يسوع المسيح. نثمن جداً موهبتك وعطاءك في كنيستنا، ونود دعوتك للمشاركة في خدمة قادمة تتناسب مع مواهبك. يسعدنا تواصلك معنا."
        : "Grace and peace! We truly appreciate your gifts and presence in our church family. We would love to connect with you about an upcoming ministry opportunity that aligns with your talents. Looking forward to hearing from you!",
    },
    {
      title: isAr ? "تشجيع ودعم روحي" : "Encouragement & Support",
      text: isAr
        ? "أحباءنا في المسيح، قيادة الكنيسة تصلي من أجلكم وتبارك المواهب التي وضعها الله في حياتكم. نحن هنا لدعمكم وتشجيعكم في كل خطوة."
        : "Dear brothers and sisters, our pastoral team is praying for you and blessing the God-given talents in your life. We are here to support and encourage you in every step of your journey.",
    },
    {
      title: isAr ? "اجتماع فريق المواهب" : "Talent Team Gathering",
      text: isAr
        ? "ندعوكم لحضور لقاء خاص بأصحاب المواهب في الكنيسة للتعارف والتنسيق وتبادل الأفكار لخدمة الملكوت."
        : "You are warmly invited to an upcoming gathering for talented members in our church community to connect, fellowship, and explore ways to serve together.",
    },
  ];

  if (!isOpen) return null;

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed) {
      setError(isAr ? "يرجى كتابة نص الرسالة قبل الإرسال" : "Please write a message before sending");
      return;
    }

    if (selectedMembers.length === 0) {
      setError(isAr ? "لم يتم تحديد أي عضو" : "No members selected");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/messages/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberIds: selectedMembers.map((m) => m.memberId),
          body: trimmed,
          channel,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message || "Failed to send messages");
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setBody("");
        onSent();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || (isAr ? "فشل إرسال الرسائل. يرجى المحاولة ثانية." : "Failed to send messages. Please try again."));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div
        className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900"
        dir={isAr ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {isAr ? "إرسال رسالة دعم لأصحاب المواهب" : "Send Talent Support Message"}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {isAr
                ? `سيتم إرسال الرسالة إلى ${selectedMembers.length} من أصحاب المواهب وستصل إلى مركز إشعارات التطبيق لديهم.`
                : `Sending to ${selectedMembers.length} selected talent member(s). Delivered directly to their mobile app notification center.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Selected Recipients Preview */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {isAr ? "المستلمون المختارون:" : "Selected Recipients:"}
          </label>
          <div className="mt-1.5 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950">
            {selectedMembers.map((m) => (
              <span
                key={m.memberId}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800 dark:bg-blue-950 dark:text-blue-200"
              >
                <span>{m.firstName} {m.lastName}</span>
                {m.profession ? (
                  <span className="opacity-70 text-[10px]">({m.profession})</span>
                ) : null}
              </span>
            ))}
          </div>
        </div>

        {/* Channel Selector */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {isAr ? "قناة الإرسال:" : "Delivery Channel:"}
          </label>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setChannel("in_app")}
              className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                channel === "in_app"
                  ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300 ring-2 ring-blue-500/20"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              }`}
            >
              <span>📱</span>
              <span>{isAr ? "مركز إشعارات التطبيق (موصى به)" : "Mobile Notification Center (Recommended)"}</span>
            </button>
            <button
              type="button"
              onClick={() => setChannel("whatsapp")}
              className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                channel === "whatsapp"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              }`}
            >
              <span>💬</span>
              <span>WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {isAr ? "قوالب سريعة:" : "Quick Templates:"}
          </label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {presets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setBody(preset.text)}
                className="rounded-lg border border-slate-200 bg-slate-100/70 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {preset.title}
              </button>
            ))}
          </div>
        </div>

        {/* Message Body */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {isAr ? "نص الرسالة:" : "Message Body:"}
          </label>
          <textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              isAr
                ? "اكتب رسالة الدعم أو الفرصة المقترحة لأصحاب المواهب..."
                : "Type the support message or ministry opportunity for the selected talents..."
            }
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>

        {/* Error / Success Feedback */}
        {error && (
          <div className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-3 rounded-lg bg-emerald-50 p-2.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            {isAr ? "✓ تم إرسال الرسالة بنجاح إلى مركز الإشعارات!" : "✓ Messages sent successfully to Notification Center!"}
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={sending}
          >
            {isAr ? "إلغاء" : "Cancel"}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSend}
            disabled={sending || !body.trim() || success}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            {sending
              ? isAr ? "جارٍ الإرسال..." : "Sending..."
              : isAr ? `إرسال إلى (${selectedMembers.length})` : `Send to (${selectedMembers.length})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
