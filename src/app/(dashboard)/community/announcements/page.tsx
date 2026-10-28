"use client";

/**
 * /community/announcements — send one announcement to a chosen audience.
 *
 * Staff pick who should get it (everyone, church roles, groups, ministries), see
 * how many people that reaches *before* sending, then confirm. Each recipient gets
 * it in their in-app inbox plus a push notification when they have the app.
 *
 * Group leaders see only their own groups; the server enforces that too.
 */

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { CHURCH_ROLES, CHURCH_ROLE_META, type ChurchRole } from "@/lib/members/church-role";
import type { AudienceSpec, AudienceStatus } from "@/lib/announcements/audience";

interface Options {
  groups: { id: string; name: string }[];
  ministries: string[];
  restrictedToGroups: boolean;
}

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  audienceSummary: string;
  recipientCount: number;
  pushDelivered: number;
  senderName: string;
  createdAt: string;
}

const STATUS_LABEL: Record<AudienceStatus, { en: string; ar: string }> = {
  active: { en: "Active", ar: "نشط" },
  inactive: { en: "Inactive", ar: "غير نشط" },
  visitor: { en: "Visitors", ar: "زوار" },
};

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
        selected
          ? "border-blue-500 bg-blue-50 text-blue-700"
          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
      }`}
    >
      {children}
    </button>
  );
}

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export default function AnnouncementsPage() {
  const { locale } = useLanguage();
  const isAr = locale === "ar";
  const tr = (en: string, ar: string) => (isAr ? ar : en);

  const [options, setOptions] = React.useState<Options | null>(null);
  const [history, setHistory] = React.useState<AnnouncementRow[]>([]);
  const [denied, setDenied] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [everyone, setEveryone] = React.useState(false);
  const [roles, setRoles] = React.useState<ChurchRole[]>([]);
  const [groupIds, setGroupIds] = React.useState<string[]>([]);
  const [ministries, setMinistries] = React.useState<string[]>([]);
  const [statuses, setStatuses] = React.useState<AudienceStatus[]>(["active"]);

  const [reach, setReach] = React.useState<number | null>(null);
  const [confirming, setConfirming] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const audience: AudienceSpec = React.useMemo(
    () => ({ everyone, roles, groupIds, ministries, statuses }),
    [everyone, roles, groupIds, ministries, statuses],
  );
  const hasSelector = everyone || roles.length > 0 || groupIds.length > 0 || ministries.length > 0;

  const loadHistory = React.useCallback(async () => {
    try {
      const res = await fetch("/api/announcements");
      if (res.status === 403) return setDenied(true);
      if (!res.ok) return;
      const json = await res.json();
      setHistory(json.data?.announcements ?? []);
    } catch {
      /* history is a convenience; the compose form still works */
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/announcements/options");
        if (res.status === 403 || res.status === 401) {
          if (active) setDenied(true);
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        const json = await res.json();
        if (active) setOptions(json.data);
        void loadHistory();
      } catch {
        if (active) setLoadError(tr("Couldn't load the announcement options. Please refresh.", "تعذّر تحميل خيارات الإعلان. يرجى تحديث الصفحة."));
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadHistory]);

  // Live "this reaches N people" count, debounced.
  React.useEffect(() => {
    if (!hasSelector) {
      setReach(0);
      return;
    }
    let active = true;
    const handle = setTimeout(async () => {
      try {
        const res = await fetch("/api/announcements/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audience }),
        });
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (active) setReach(json.data?.recipientCount ?? 0);
      } catch {
        if (active) setReach(null);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [audience, hasSelector]);

  const canSend = title.trim().length > 0 && body.trim().length > 0 && hasSelector && (reach ?? 1) > 0;

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, audience }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setConfirming(false);
        const detail = json?.error?.details
          ? (Object.values(json.error.details).flat()[0] as string | undefined)
          : undefined;
        setError(
          detail ||
            (res.status === 403 && json?.error?.message) ||
            tr("We couldn't send the announcement. Please try again.", "تعذّر إرسال الإعلان. حاول مرة أخرى."),
        );
        return;
      }
      const n = json.data?.announcement?.recipientCount ?? reach ?? 0;
      setNotice(tr(`🎉 Sent to ${n} ${n === 1 ? "person" : "people"}!`, `🎉 تم الإرسال إلى ${n} شخص!`));
      setTitle("");
      setBody("");
      setEveryone(false);
      setRoles([]);
      setGroupIds([]);
      setMinistries([]);
      setStatuses(["active"]);
      setConfirming(false);
      void loadHistory();
      setTimeout(() => setNotice(null), 6000);
    } catch {
      setConfirming(false);
      setError(tr("Couldn't reach the server. Check your connection and try again.", "تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى."));
    } finally {
      setSending(false);
    }
  };

  if (denied) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <p className="text-4xl" aria-hidden="true">🔒</p>
          <p className="mt-2 font-semibold text-gray-900">
            {tr("Announcements are for pastors, admins and group leaders.", "الإعلانات متاحة للرعاة والإداريين وقادة المجموعات.")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const restricted = options?.restrictedToGroups ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📢 {tr("Announcements", "الإعلانات")}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {restricted
            ? tr("Send a message to the groups you lead.", "أرسل رسالة إلى المجموعات التي تقودها.")
            : tr(
                "Send one message to everyone, or only to the people you choose: pastors, ushers, admins, groups and more.",
                "أرسل رسالة واحدة للجميع أو لمن تختارهم فقط: الرعاة، خدام الاستقبال، الإداريون، المجموعات وغيرهم.",
              )}
        </p>
      </div>

      {loadError && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{loadError}</p>}
      {notice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{notice}</p>}

      <Card>
        <CardContent className="space-y-5 p-5">
          <div>
            <label htmlFor="ann-title" className="mb-1 block text-sm font-medium text-gray-700">
              {tr("Title", "العنوان")}
            </label>
            <input
              id="ann-title"
              value={title}
              maxLength={160}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={tr("e.g. Sunday service starts at 9am", "مثال: اجتماع الأحد يبدأ الساعة ٩ صباحًا")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label htmlFor="ann-body" className="mb-1 block text-sm font-medium text-gray-700">
              {tr("Message", "الرسالة")}
            </label>
            <textarea
              id="ann-body"
              value={body}
              rows={5}
              maxLength={4000}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <p className="mt-1 text-end text-xs text-gray-400">{body.length}/4000</p>
          </div>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-gray-900">🎯 {tr("Who should get it?", "من يجب أن يتلقاها؟")}</legend>

            {!restricted && (
              <div>
                <Chip selected={everyone} onClick={() => setEveryone((v) => !v)}>
                  🌍 {tr("Everyone", "الجميع")}
                </Chip>
              </div>
            )}

            {!restricted && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  {tr("By role in the church", "حسب الدور في الكنيسة")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {CHURCH_ROLES.map((r) => (
                    <Chip key={r} selected={roles.includes(r)} onClick={() => setRoles((l) => toggle(l, r))}>
                      {CHURCH_ROLE_META[r].emoji} {isAr ? CHURCH_ROLE_META[r].ar : CHURCH_ROLE_META[r].en}
                      {r === "member" ? tr(" (non-staff)", " (بدون دور)") : ""}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                {restricted ? tr("Your groups", "مجموعاتك") : tr("By group", "حسب المجموعة")}
              </p>
              {options && options.groups.length === 0 ? (
                <p className="text-sm text-gray-400">
                  {restricted
                    ? tr("You don't lead any groups yet.", "أنت لا تقود أي مجموعة بعد.")
                    : tr("No groups yet.", "لا توجد مجموعات بعد.")}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {options?.groups.map((g) => (
                    <Chip key={g.id} selected={groupIds.includes(g.id)} onClick={() => setGroupIds((l) => toggle(l, g.id))}>
                      👥 {g.name}
                    </Chip>
                  ))}
                </div>
              )}
            </div>

            {!restricted && (options?.ministries.length ?? 0) > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  {tr("By ministry", "حسب الخدمة")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {options?.ministries.map((m) => (
                    <Chip key={m} selected={ministries.includes(m)} onClick={() => setMinistries((l) => toggle(l, m))}>
                      🕊️ {m}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                {tr("Include people who are", "تضمين الأشخاص الذين حالتهم")}
              </p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(STATUS_LABEL) as AudienceStatus[]).map((s) => (
                  <Chip
                    key={s}
                    selected={statuses.includes(s)}
                    onClick={() => setStatuses((l) => (l.includes(s) && l.length === 1 ? l : toggle(l, s)))}
                  >
                    {isAr ? STATUS_LABEL[s].ar : STATUS_LABEL[s].en}
                  </Chip>
                ))}
              </div>
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
            <p className="text-sm text-gray-700" aria-live="polite">
              {!hasSelector
                ? tr("Pick at least one audience above.", "اختر جمهورًا واحدًا على الأقل.")
                : reach === null
                  ? tr("Counting…", "جارٍ العدّ…")
                  : reach === 0
                    ? tr("😕 No one matches these filters.", "😕 لا أحد يطابق هذه الفلاتر.")
                    : tr(`📣 This reaches ${reach} ${reach === 1 ? "person" : "people"}.`, `📣 سيصل إلى ${reach} شخص.`)}
            </p>
            <Button onClick={() => { setError(null); setConfirming(true); }} disabled={!canSend || sending}>
              {tr("Review & send", "مراجعة وإرسال")}
            </Button>
          </div>

          {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        </CardContent>
      </Card>

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={tr("Confirm announcement", "تأكيد الإعلان")}
          onClick={(e) => { if (e.target === e.currentTarget && !sending) setConfirming(false); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <p className="text-3xl" aria-hidden="true">📢</p>
            <h2 className="mt-2 text-lg font-bold text-gray-900">
              {tr(`Send to ${reach ?? 0} ${reach === 1 ? "person" : "people"}?`, `إرسال إلى ${reach ?? 0} شخص؟`)}
            </h2>
            <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
              <p className="font-semibold text-gray-900">{title}</p>
              <p className="mt-1 line-clamp-4 whitespace-pre-line text-gray-600">{body}</p>
            </div>
            <p className="mt-2 text-xs text-gray-500">{tr("This can't be unsent.", "لا يمكن التراجع بعد الإرسال.")}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirming(false)} disabled={sending} className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50">
                {tr("Back", "رجوع")}
              </button>
              <Button onClick={send} disabled={sending}>
                {sending ? tr("Sending…", "جارٍ الإرسال…") : tr("Send now", "أرسل الآن")}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">🗂️ {tr("Sent announcements", "الإعلانات المرسلة")}</h2>
        {history.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-gray-500">
              {tr("Nothing sent yet. Your announcements will appear here.", "لم يتم إرسال شيء بعد. ستظهر إعلاناتك هنا.")}
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {history.map((a) => (
              <li key={a.id}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-semibold text-gray-900">📢 {a.title}</p>
                      <time className="text-xs text-gray-400" dateTime={a.createdAt}>
                        {new Date(a.createdAt).toLocaleString(isAr ? "ar-EG" : "en-GB", { dateStyle: "medium", timeStyle: "short" })}
                      </time>
                    </div>
                    <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-gray-600">{a.body}</p>
                    <p className="mt-2 text-xs text-gray-500">
                      🎯 {a.audienceSummary} · 👥 {a.recipientCount}
                      {a.pushDelivered > 0 ? ` · 📱 ${a.pushDelivered}` : ""} · ✍️ {a.senderName}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
