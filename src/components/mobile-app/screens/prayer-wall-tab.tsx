"use client";

/**
 * Prayer wall tab (Community screen).
 *
 * Members read approved prayers, tap "I prayed for this", and share their own.
 * The "answered" tab holds stories of prayers God answered ("Praise God"), shared
 * the same way and approved on the same screen.
 * A shared prayer waits for a pastor or leader before anyone else sees it, and
 * it is anonymous unless the author chooses to show their name. The server enforces both; this screen just
 * says so, so members know what to expect before they write.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { IconHeart, IconLock, IconSend, IconTrash2, IconClock, IconCheckCircle2, IconUser } from "../icons";
import { mobileApiFetch, mobileApiFetchCached, MobileApiError } from "@/lib/mobile-app/api-client";
import { SectionHeader, SkeletonRows, EmptyState } from "../primitives";

type Kind = "prayer" | "answered";
type View = "wall" | "answered" | "mine";

interface WallPost {
  id: string;
  kind: Kind;
  body: string;
  displayName: string | null;
  showName?: boolean;
  prayedCount: number;
  prayedByMe: boolean;
  mine: boolean;
  createdAt: string;
  status?: "pending" | "approved" | "rejected" | "archived";
}

interface PrayerWallTabProps {
  isAr: boolean;
  refreshSignal?: number;
}

function firstDetail(err: unknown): string | null {
  if (!(err instanceof MobileApiError)) return null;
  const details = err.details as Record<string, string[]> | undefined;
  const first = details ? Object.values(details).flat()[0] : undefined;
  return typeof first === "string" ? first : err.message || null;
}

export function PrayerWallTab({ isAr, refreshSignal = 0 }: PrayerWallTabProps) {
  const [view, setView] = useState<View>("wall");
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isComposing, setIsComposing] = useState(false);
  const [kind, setKind] = useState<Kind>("prayer");
  const [draft, setDraft] = useState("");
  const [showName, setShowName] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [justShared, setJustShared] = useState(false);

  // Switching tabs quickly can leave an older request finishing last; only the
  // newest one may update the list.
  const latestLoad = useRef(0);

  const load = useCallback(async (mode: View) => {
    const requestId = ++latestLoad.current;
    setIsLoading(true);
    setLoadError(null);
    try {
      const endpoint =
        mode === "mine" ? "/api/prayer-wall/mine" : mode === "answered" ? "/api/prayer-wall?kind=answered" : "/api/prayer-wall";
      const { data } = await mobileApiFetchCached<{ posts: WallPost[] }>(endpoint);
      if (requestId !== latestLoad.current) return;
      setPosts(data?.posts ?? []);
    } catch {
      if (requestId !== latestLoad.current) return;
      setLoadError(isAr ? "تعذر تحميل حائط الصلاة" : "Couldn't load the prayer wall");
    } finally {
      if (requestId === latestLoad.current) setIsLoading(false);
    }
  }, [isAr]);

  useEffect(() => {
    void load(view);
  }, [view, load, refreshSignal]);

  const openComposer = (k: Kind) => {
    setKind(k);
    setIsComposing(true);
    setJustShared(false);
  };

  const share = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || isSending) return;
    setIsSending(true);
    setSendError(null);
    try {
      await mobileApiFetch("/api/prayer-wall", { method: "POST", body: JSON.stringify({ body, kind, showName }) });
      setDraft("");
      setShowName(false);
      setIsComposing(false);
      setJustShared(true);
      if (view === "mine") void load("mine");
    } catch (err) {
      setSendError(firstDetail(err) || (isAr ? "تعذر إرسال الصلاة، حاول مرة أخرى" : "Couldn't share your prayer. Please try again."));
    } finally {
      setIsSending(false);
    }
  };

  const togglePrayed = async (post: WallPost) => {
    const next = !post.prayedByMe;
    // Optimistic: the tap should feel instant; the server's count replaces it.
    setPosts((list) =>
      list.map((p) =>
        p.id === post.id ? { ...p, prayedByMe: next, prayedCount: Math.max(0, p.prayedCount + (next ? 1 : -1)) } : p,
      ),
    );
    try {
      const res = await mobileApiFetch<{ prayedCount: number; prayedByMe: boolean }>(
        `/api/prayer-wall/${post.id}/pray`,
        { method: next ? "POST" : "DELETE" },
      );
      setPosts((list) => list.map((p) => (p.id === post.id ? { ...p, ...res } : p)));
    } catch {
      setPosts((list) => list.map((p) => (p.id === post.id ? post : p)));
    }
  };

  const withdraw = async (post: WallPost) => {
    if (!window.confirm(isAr ? "هل تريد حذف هذه الصلاة؟" : "Remove this prayer?")) return;
    try {
      await mobileApiFetch(`/api/prayer-wall/${post.id}`, { method: "DELETE" });
      setPosts((list) => list.filter((p) => p.id !== post.id));
    } catch {
      alert(isAr ? "تعذر الحذف، حاول مرة أخرى" : "Couldn't remove it. Please try again.");
    }
  };

  const statusBadge = (status: WallPost["status"]) => {
    if (status === "pending")
      return { label: isAr ? "بانتظار موافقة الراعي" : "Waiting for a pastor", cls: "bg-amber-50 text-amber-700 border-amber-200/60", Icon: IconClock };
    if (status === "approved")
      return { label: isAr ? "على الحائط" : "On the wall", cls: "bg-emerald-50 text-emerald-700 border-emerald-200/60", Icon: IconCheckCircle2 };
    return { label: isAr ? "لم تُنشر" : "Not published", cls: "bg-slate-100 text-[#4B463A] border-slate-200/60", Icon: IconLock };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionHeader
          title={isAr ? "حائط الصلاة" : "Prayer Wall"}
          subtitle={isAr ? "نحمل أثقال بعضنا بعضًا" : "Carry each other's burdens"}
          icon={IconHeart}
          accent="rose"
        />
        {!isComposing && (
          <button
            type="button"
            onClick={() => openComposer(view === "answered" ? "answered" : "prayer")}
            className="px-3 py-1.5 rounded-xl bg-[#132F4C] hover:bg-[#0F2438] text-white font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 mb-2"
          >
            <IconHeart className="w-3.5 h-3.5" />
            <span>{isAr ? "شارك صلاة" : "Share"}</span>
          </button>
        )}
      </div>

      {justShared && (
        <div role="status" className="p-3.5 rounded-[20px] bg-emerald-50 border border-emerald-200/60 text-xs text-emerald-700 font-medium leading-relaxed">
          {isAr
            ? "🙏 شكرًا لمشاركتك. ستظهر على الحائط بعد موافقة الراعي."
            : "🙏 Thank you. It will appear on the wall once a pastor approves it."}
        </div>
      )}

      {isComposing && (
        <form
          onSubmit={share}
          className="p-4 rounded-[20px] bg-white ring-1 ring-inset ring-[#EAE3D6] shadow-[0_2px_8px_rgba(19,47,76,0.04)] space-y-3"
        >
          <div role="radiogroup" aria-label={isAr ? "نوع المشاركة" : "What are you sharing?"} className="flex p-1 bg-[#F1ECE0] rounded-[14px]">
            {(["prayer", "answered"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => setKind(k)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  kind === k ? "bg-white text-[#8A6A35] shadow-[0_1px_4px_rgba(19,47,76,0.08)]" : "text-[#8F8670]"
                }`}
              >
                {k === "prayer" ? (isAr ? "🙏 طلب صلاة" : "🙏 Prayer request") : isAr ? "🙌 استجابة صلاة" : "🙌 Answered prayer"}
              </button>
            ))}
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              kind === "answered"
                ? isAr ? "احكِ كيف استجاب الرب صلاتك…" : "Tell how God answered your prayer…"
                : isAr ? "اكتب طلب الصلاة هنا…" : "Write your prayer request…"
            }
            rows={4}
            maxLength={1000}
            autoFocus
            className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-[#132F4C] focus:outline-hidden focus:border-rose-400 placeholder:text-[#8F8670] resize-none"
          />
          <div role="radiogroup" aria-label={isAr ? "كيف تظهر صلاتك" : "How your prayer appears"} className="grid grid-cols-2 gap-2">
            {([false, true] as const).map((named) => (
              <button
                key={String(named)}
                type="button"
                role="radio"
                aria-checked={showName === named}
                onClick={() => setShowName(named)}
                className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  showName === named
                    ? "bg-rose-50 text-rose-700 border-rose-300"
                    : "bg-slate-50 text-[#4B463A] border-slate-200"
                }`}
              >
                {named ? <IconUser className="w-3.5 h-3.5" /> : <IconLock className="w-3.5 h-3.5" />}
                <span>{named ? (isAr ? "أظهر اسمي" : "Show my name") : isAr ? "بدون اسم" : "Anonymous"}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[#6F6650] font-medium leading-relaxed">
            {showName
              ? isAr
                ? "سيظهر اسمك مع الصلاة. يراجع الراعي الصلاة أولًا قبل نشرها."
                : "Your name will appear with the prayer. A pastor reviews each prayer before it's shared."
              : isAr
                ? "لن يظهر اسمك على الحائط. يراجع الراعي الصلاة أولًا قبل نشرها."
                : "Your name won't appear on the wall. A pastor reviews each prayer before it's shared."}
          </p>
          {sendError && (
            <p role="alert" className="p-2.5 rounded-2xl bg-rose-50 border border-rose-100 text-xs text-rose-600 font-medium">
              {sendError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setIsComposing(false);
                setSendError(null);
              }}
              className="px-4 py-2.5 rounded-2xl bg-slate-50 text-[#4B463A] border border-slate-200 font-bold text-xs"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={draft.trim().length < 5 || isSending}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <IconSend className="w-3.5 h-3.5 rtl:rotate-180" />
                  <span>{isAr ? "أرسل للمراجعة" : "Send for review"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      <div className="flex gap-2">
        {(["wall", "answered", "mine"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setView(mode)}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              view === mode
                ? "bg-[#132F4C] text-white"
                : "bg-white text-[#6F6650] ring-1 ring-inset ring-[#EAE3D6] hover:text-[#132F4C]"
            }`}
          >
            {mode === "wall"
              ? isAr ? "الحائط" : "The wall"
              : mode === "answered"
                ? isAr ? "🙌 استجابات" : "🙌 Answered"
                : isAr ? "صلواتي" : "My prayers"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonRows count={3} />
      ) : loadError ? (
        <div className="p-4 rounded-[20px] bg-rose-50 border border-rose-100 text-center text-xs text-rose-600 font-medium">
          {loadError}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={IconHeart}
          title={
            view === "mine"
              ? isAr ? "لم تشارك صلاة بعد" : "You haven't shared a prayer yet"
              : view === "answered"
                ? isAr ? "لا توجد استجابات بعد" : "No answered prayers yet"
                : isAr ? "لا توجد صلوات على الحائط بعد" : "No prayers on the wall yet"
          }
          description={
            view === "answered"
              ? isAr ? "هل استجاب الرب صلاتك؟ شارك القصة ليتمجد اسمه." : "Did God answer your prayer? Share the story and give Him glory."
              : isAr ? "شارك ما في قلبك، وستصلي الكنيسة معك." : "Share what's on your heart, and the church will pray with you."
          }
          actionLabel={
            view === "answered" ? (isAr ? "شارك استجابة" : "Share an answered prayer") : isAr ? "شارك صلاة" : "Share a prayer"
          }
          onAction={() => openComposer(view === "answered" ? "answered" : "prayer")}
        />
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const badge = view === "mine" ? statusBadge(post.status) : null;
            const canPray = view !== "mine" || post.status === "approved";
            const isAnswered = post.kind === "answered";
            return (
              <div
                key={post.id}
                className="p-4 rounded-[20px] bg-white ring-1 ring-inset ring-[#EAE3D6] shadow-[0_2px_8px_rgba(19,47,76,0.04)] space-y-3"
              >
                {(badge || post.mine || isAnswered) && (
                  <div className="flex items-center justify-between gap-2">
                    {isAnswered && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                        {isAr ? "🙌 استجاب الرب" : "🙌 Answered"}
                      </span>
                    )}
                    {badge ? (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.cls}`}>
                        <badge.Icon className="w-3 h-3" />
                        {badge.label}
                      </span>
                    ) : post.mine ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F5EEDF] text-[#8A6A35] border border-[#E8DCC0]/60">
                        {isAr ? "مشاركتك" : "Yours"}
                      </span>
                    ) : null}
                    {view === "mine" && (
                      <button
                        type="button"
                        onClick={() => withdraw(post)}
                        aria-label={isAr ? "حذف" : "Remove"}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[#8F8670] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <IconTrash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                <p className="text-sm text-[#132F4C] leading-relaxed whitespace-pre-line">{post.body}</p>

                {post.displayName ? (
                  <p className="text-xs font-bold text-[#8A6A35]">— {post.displayName}</p>
                ) : view === "mine" ? (
                  <p className="text-[11px] font-medium text-[#8F8670] flex items-center gap-1">
                    <IconLock className="w-3 h-3" />
                    {isAr ? "بدون اسم" : "Anonymous"}
                  </p>
                ) : null}

                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <span className="text-[11px] text-[#8F8670] font-medium">
                    {new Date(post.createdAt).toLocaleDateString(isAr ? "ar-EG" : "en-US", { month: "short", day: "numeric" })}
                  </span>
                  {canPray ? (
                    <button
                      type="button"
                      onClick={() => togglePrayed(post)}
                      aria-pressed={post.prayedByMe}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
                        isAnswered
                          ? post.prayedByMe
                            ? "bg-amber-500 text-white"
                            : "bg-amber-50 text-amber-700 border border-amber-200/60 hover:bg-amber-100"
                          : post.prayedByMe
                            ? "bg-rose-600 text-white"
                            : "bg-rose-50 text-rose-700 border border-rose-200/60 hover:bg-rose-100"
                      }`}
                    >
                      <span aria-hidden="true">{isAnswered ? "🙌" : "🙏"}</span>
                      <span>
                        {isAnswered
                          ? post.prayedByMe ? (isAr ? "مجّدت الرب" : "Praised") : isAr ? "مجدًا للرب" : "Praise God"
                          : post.prayedByMe ? (isAr ? "صليت لأجلها" : "I prayed") : isAr ? "صليت لأجل هذا" : "I prayed for this"}
                      </span>
                      <span className={post.prayedByMe ? "text-white/80" : isAnswered ? "text-amber-600" : "text-rose-500"}>
                        {post.prayedCount}
                      </span>
                    </button>
                  ) : null}
                </div>

                {view === "mine" && !isAnswered && post.status === "approved" && (
                  <button
                    type="button"
                    onClick={() => openComposer("answered")}
                    className="w-full py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/60 hover:bg-amber-100 transition-colors"
                  >
                    {isAr ? "🙌 استجاب الرب؟ شارك القصة" : "🙌 Did God answer? Share the story"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
