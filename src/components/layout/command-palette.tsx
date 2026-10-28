"use client";

/**
 * Ctrl+K / Cmd+K (or "/") search across pages, people and families.
 *
 * Pages are matched locally from the sidebar's own list; people and families
 * come from the existing `?search=` endpoints, debounced, so the palette shows
 * only what the signed-in user is already allowed to read. Arrow keys move,
 * Enter opens, Escape closes.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { NAV_PAGES } from "./sidebar";

type Result = { id: string; kind: "page" | "person" | "family"; label: string; hint?: string; href: string };

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const tr = (en: string, ar: string) => (isRTL ? ar : en);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState("");
  const [remote, setRemote] = React.useState<Result[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setRemote([]);
    setActive(0);
    const id = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(id);
  }, [open]);

  const pages: Result[] = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return NAV_PAGES.map((p) => ({ id: p.href, kind: "page" as const, label: t(p.key), href: p.href }))
      .filter((p) => !q || p.label.toLowerCase().includes(q) || p.href.includes(q))
      .slice(0, q ? 5 : 8);
  }, [query, t]);

  // People and families, debounced. A later keystroke cancels the earlier search.
  React.useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2) {
      setRemote([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const enc = encodeURIComponent(q);
      const [people, families] = await Promise.all([
        fetch(`/api/members?search=${enc}&limit=6`, { signal: controller.signal })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch(`/api/families?search=${enc}`, { signal: controller.signal })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);
      if (controller.signal.aborted) return;
      const personRows: any[] = Array.isArray(people?.data) ? people.data : [];
      const familyRows: any[] = Array.isArray(families?.data) ? families.data : families?.data?.items ?? [];
      setRemote([
        ...personRows.slice(0, 6).map((m) => ({
          id: `p-${m.id}`,
          kind: "person" as const,
          label: `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || m.email || m.id,
          hint: m.email || m.phone || undefined,
          href: `/people/${m.id}`,
        })),
        ...familyRows.slice(0, 4).map((f) => ({
          id: `f-${f.id}`,
          kind: "family" as const,
          label: f.name,
          href: `/families/${f.id}`,
        })),
      ]);
      setSearching(false);
    }, 220);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, open]);

  const results = React.useMemo(() => [...remote, ...pages], [remote, pages]);
  React.useEffect(() => setActive(0), [results.length]);

  const go = (r: Result | undefined) => {
    if (!r) return;
    onClose();
    router.push(r.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!open) return null;

  const icon = (kind: Result["kind"]) =>
    kind === "person" ? (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    ) : kind === "family" ? (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
    );

  const kindLabel = (kind: Result["kind"]) =>
    kind === "person" ? tr("Person", "شخص") : kind === "family" ? tr("Family", "أسرة") : tr("Page", "صفحة");

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/40 px-4 pt-[12vh] backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={tr("Search", "بحث")}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-gray-100 px-4">
          <svg className="h-5 w-5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={tr("Search people, families or pages", "ابحث عن شخص أو أسرة أو صفحة")}
            autoFocus
            className="h-14 flex-1 bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-400"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-results"
            aria-activedescendant={results[active] ? `cmd-${results[active].id}` : undefined}
          />
          <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">Esc</kbd>
        </div>

        <ul id="command-results" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-gray-500">
              {searching ? tr("Searching…", "جارٍ البحث…") : tr("No matches. Try a first name or a family name.", "لا نتائج. جرّب الاسم الأول أو اسم العائلة.")}
            </li>
          ) : (
            results.map((r, i) => (
              <li
                key={r.id}
                id={`cmd-${r.id}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r)}
                className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ${i === active ? "bg-blue-50" : ""}`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${i === active ? "bg-white text-blue-600" : "bg-gray-100 text-gray-500"}`}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    {icon(r.kind)}
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-900">{r.label}</span>
                  {r.hint && <span className="block truncate text-xs text-gray-500">{r.hint}</span>}
                </span>
                <span className="text-[11px] text-gray-400">{kindLabel(r.kind)}</span>
              </li>
            ))
          )}
        </ul>
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2 text-[11px] text-gray-400">
          <span>↑ ↓ {tr("to move", "للتنقل")} · Enter {tr("to open", "للفتح")}</span>
          {searching && results.length > 0 && <span>{tr("Searching…", "جارٍ البحث…")}</span>}
        </div>
      </div>
    </div>
  );
}
