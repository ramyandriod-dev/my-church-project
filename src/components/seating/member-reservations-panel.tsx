"use client";

/**
 * Usher view of member reservations: who is holding which row, with the time left,
 * and buttons to confirm "seated" or release. Holds that ran out disappear on their
 * own, so an usher never has to clean up.
 */

import * as React from "react";
import { useTranslation } from "@/lib/i18n";

interface Reservation {
  id: string;
  memberName: string;
  sectionId: string;
  row: string;
  seatCount: number;
  status: "held" | "seated";
  heldUntil: string;
}

const SECTION_NAMES: Record<string, { en: string; ar: string }> = {
  ground_left: { en: "Left Wing", ar: "الجناح الأيسر" },
  ground_center: { en: "Center", ar: "المنتصف" },
  ground_right: { en: "Right Wing", ar: "الجناح الأيمن" },
  gallery: { en: "Gallery", ar: "البلكون" },
};

function left(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function MemberReservationsPanel() {
  const { locale } = useTranslation();
  const ar = locale === "ar";
  const [items, setItems] = React.useState<Reservation[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [now, setNow] = React.useState(() => Date.now());

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/seating/reservations");
      const json = await res.json().catch(() => null);
      if (res.ok && json?.data?.reservations) {
        setItems(json.data.reservations);
        setError(null);
      } else if (res.status !== 404) {
        setError(json?.error?.message || (ar ? "تعذر تحميل الحجوزات" : "Could not load reservations"));
      } else {
        setItems([]);
      }
    } catch {
      setError(ar ? "تعذر تحميل الحجوزات" : "Could not load reservations");
    }
  }, [ar]);

  React.useEffect(() => {
    void load();
    const poll = setInterval(() => void load(), 8000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [load]);

  const act = async (id: string, status: "seated" | "released") => {
    await fetch(`/api/seating/reservations/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    void load();
  };

  const live = items.filter((r) => r.status === "seated" || new Date(r.heldUntil).getTime() > now);

  return (
    <section className="bg-slate-950/70 rounded-3xl p-4 border border-slate-800">
      <h2 className="text-sm font-bold text-slate-100 mb-3">
        {ar ? "حجوزات الأعضاء" : "Member reservations"}
        <span className="ms-2 text-xs font-medium text-slate-400">{live.length}</span>
      </h2>
      {error && <p className="text-xs text-rose-300 mb-2">{error}</p>}
      {live.length === 0 ? (
        <p className="text-xs text-slate-400">{ar ? "لا توجد حجوزات الآن." : "No reservations right now."}</p>
      ) : (
        <ul className="space-y-2">
          {live.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-900 border border-slate-800 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate">{r.memberName}</p>
                <p className="text-xs text-slate-400">
                  {(ar ? SECTION_NAMES[r.sectionId]?.ar : SECTION_NAMES[r.sectionId]?.en) ?? r.sectionId}
                  {" · "}
                  {ar ? `الصف ${r.row}` : `Row ${r.row}`}
                  {" · "}
                  {r.seatCount} {ar ? "مقاعد" : r.seatCount > 1 ? "seats" : "seat"}
                  {" · "}
                  {r.status === "seated" ? (
                    <span className="text-emerald-400">{ar ? "جالس" : "Seated"}</span>
                  ) : (
                    <span className="text-amber-300 tabular-nums">{left(new Date(r.heldUntil).getTime() - now)}</span>
                  )}
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                {r.status === "held" && (
                  <button onClick={() => act(r.id, "seated")} className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold">
                    {ar ? "جلس" : "Seated"}
                  </button>
                )}
                <button onClick={() => act(r.id, "released")} className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold">
                  {ar ? "إلغاء" : "Release"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
