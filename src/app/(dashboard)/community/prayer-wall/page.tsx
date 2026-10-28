"use client";

/**
 * /community/prayer-wall — approve prayers before they reach the wall.
 *
 * Members share prayers from the app; nothing is visible to anyone else until a
 * pastor, leader or admin approves it here. This screen shows who wrote each
 * prayer so staff can follow up; the wall shows a name only when its author
 * chose to show it.
 */

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

type Status = "pending" | "approved" | "rejected" | "archived";

interface ModerationItem {
  id: string;
  body: string;
  kind: "prayer" | "answered";
  status: Status;
  showName: boolean;
  authorName: string;
  prayedCount: number;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

const TABS: { status: Status; emoji: string; en: string; ar: string }[] = [
  { status: "pending", emoji: "⏳", en: "Waiting", ar: "بانتظار الموافقة" },
  { status: "approved", emoji: "🙏", en: "On the wall", ar: "على الحائط" },
  { status: "rejected", emoji: "🚫", en: "Not published", ar: "لم تُنشر" },
  { status: "archived", emoji: "🗄️", en: "Archived", ar: "مؤرشفة" },
];

/** What each tab lets a moderator do next. Mirrors PRAYER_WALL_TRANSITIONS. */
const ACTIONS: Record<Status, { to: Status; en: string; ar: string; primary?: boolean }[]> = {
  pending: [
    { to: "approved", en: "Approve", ar: "موافقة", primary: true },
    { to: "rejected", en: "Don't publish", ar: "عدم النشر" },
  ],
  approved: [{ to: "archived", en: "Take down", ar: "إزالة من الحائط" }],
  rejected: [{ to: "approved", en: "Approve after all", ar: "موافقة" }],
  archived: [{ to: "approved", en: "Put back", ar: "إعادة للحائط" }],
};

export default function PrayerWallModerationPage() {
  const { locale } = useLanguage();
  const isAr = locale === "ar";
  const tr = (en: string, ar: string) => (isAr ? ar : en);

  const [status, setStatus] = React.useState<Status>("pending");
  const [items, setItems] = React.useState<ModerationItem[] | null>(null);
  const [counts, setCounts] = React.useState<Record<string, number>>({});
  const [denied, setDenied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async (s: Status) => {
    setError(null);
    try {
      const res = await fetch(`/api/prayer-wall/moderation?status=${s}`);
      if (res.status === 403 || res.status === 401) return setDenied(true);
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      setItems(json.data?.items ?? []);
      setCounts(json.data?.counts ?? {});
    } catch {
      setItems([]);
      setError(isAr ? "تعذّر تحميل الصلوات. يرجى تحديث الصفحة." : "Couldn't load the prayers. Please refresh.");
    }
  }, [isAr]);

  React.useEffect(() => {
    setItems(null);
    void load(status);
  }, [status, load]);

  const decide = async (id: string, to: Status) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/prayer-wall/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: to }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message || String(res.status));
      }
      // Drop it from this tab straight away, then refresh the counts.
      setItems((list) => list?.filter((i) => i.id !== id) ?? null);
      void load(status);
    } catch {
      setError(tr("That didn't save. Please try again.", "لم يتم الحفظ. حاول مرة أخرى."));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm(tr("Delete this prayer for good?", "حذف هذه الصلاة نهائيًا؟"))) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/prayer-wall/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      setItems((list) => list?.filter((i) => i.id !== id) ?? null);
      void load(status);
    } catch {
      setError(tr("Couldn't delete it. Please try again.", "تعذّر الحذف. حاول مرة أخرى."));
    } finally {
      setBusyId(null);
    }
  };

  if (denied) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <p className="text-4xl" aria-hidden="true">🔒</p>
          <p className="mt-2 font-semibold text-gray-900">
            {tr("Prayer approvals are for pastors, leaders and admins.", "مراجعة الصلوات متاحة للرعاة والقادة والإداريين.")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(isAr ? "ar-EG" : "en-GB", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🙏 {tr("Prayer wall", "حائط الصلاة")}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {tr(
            "Members share prayer requests and answered prayers from the app. Approve them here before they appear on the wall. Each member chooses whether their name is shown; you can always see who wrote each one.",
            "يشارك الأعضاء طلبات الصلاة واستجاباتها من التطبيق. وافق عليها هنا قبل ظهورها على الحائط. كل عضو يختار إظهار اسمه أو إخفاءه، وأنت ترى دائمًا صاحب كل صلاة.",
          )}
        </p>
      </div>

      <div role="tablist" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.status}
            role="tab"
            type="button"
            aria-selected={status === t.status}
            onClick={() => setStatus(t.status)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
              status === t.status
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            {t.emoji} {isAr ? t.ar : t.en}
            <span className="ms-1.5 text-xs opacity-70">{counts[t.status] ?? 0}</span>
          </button>
        ))}
      </div>

      {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      {items === null ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-gray-400">{tr("Loading…", "جارٍ التحميل…")}</CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-gray-500">
            {status === "pending"
              ? tr("🎉 All caught up. No prayers are waiting.", "🎉 لا توجد صلوات بانتظار الموافقة.")
              : tr("Nothing here yet.", "لا يوجد شيء هنا بعد.")}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((p) => (
            <li key={p.id}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">
                      ✍️ {p.authorName}
                      {p.kind === "answered" && (
                        <span className="ms-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          {tr("🙌 Answered prayer", "🙌 استجابة صلاة")}
                        </span>
                      )}
                      <span
                        className={`ms-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.showName ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {p.showName ? tr("👤 Name shown on the wall", "👤 الاسم ظاهر على الحائط") : tr("🙈 Anonymous on the wall", "🙈 بدون اسم على الحائط")}
                      </span>
                    </p>
                    <time className="text-xs text-gray-400" dateTime={p.createdAt}>{fmt(p.createdAt)}</time>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-700">{p.body}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-gray-500">
                      🙏 {tr(`${p.prayedCount} prayed`, `صلّى ${p.prayedCount}`)}
                      {p.reviewedByName && p.reviewedAt
                        ? ` · ${tr("reviewed by", "راجعها")} ${p.reviewedByName}, ${fmt(p.reviewedAt)}`
                        : ""}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {status !== "pending" && (
                        <button
                          type="button"
                          onClick={() => remove(p.id)}
                          disabled={busyId === p.id}
                          className="rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        >
                          {tr("Delete", "حذف")}
                        </button>
                      )}
                      {ACTIONS[status].map((a) =>
                        a.primary ? (
                          <Button key={a.to} onClick={() => decide(p.id, a.to)} disabled={busyId === p.id}>
                            {isAr ? a.ar : a.en}
                          </Button>
                        ) : (
                          <button
                            key={a.to}
                            type="button"
                            onClick={() => decide(p.id, a.to)}
                            disabled={busyId === p.id}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            {isAr ? a.ar : a.en}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
