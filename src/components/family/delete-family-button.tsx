"use client";

import * as React from "react";

/**
 * Delete a family, with a friendly confirmation.
 *
 * Only the family record and its relationship links are removed: every person in
 * the household stays in the members list. A 404 counts as success (the family is
 * already gone, or only ever existed in this browser session).
 */

interface DeleteFamilyButtonProps {
  familyId: string;
  familyName: string;
  isAr?: boolean;
  /** "icon" is a small trash button for table rows; "button" is the labelled one. */
  variant?: "icon" | "button";
  onDeleted: (familyId: string) => void;
}

export function DeleteFamilyButton({
  familyId,
  familyName,
  isAr = false,
  variant = "button",
  onDeleted,
}: DeleteFamilyButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setError(null);
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/families/${encodeURIComponent(familyId)}`, { method: "DELETE" });
      if (res.ok || res.status === 404) {
        setOpen(false);
        onDeleted(familyId);
        return;
      }
      if (res.status === 403) {
        setError(
          isAr
            ? "🔒 ليس لديك صلاحية حذف الأسر. تواصل مع مدير النظام."
            : "🔒 You don't have permission to delete families. Please ask an admin.",
        );
      } else {
        setError(isAr ? "تعذّر حذف الأسرة الآن. حاول مرة أخرى." : "We couldn't delete the family just now. Please try again.");
      }
    } catch {
      setError(isAr ? "تعذّر الاتصال. تحقق من الإنترنت وحاول مرة أخرى." : "Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const label = isAr ? "حذف الأسرة" : "Delete family";

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          aria-label={`${label}: ${familyName}`}
          title={label}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
        >
          <span aria-hidden="true">🗑️</span>
          {label}
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" dir={isAr ? "rtl" : "ltr"}>
            <p className="text-3xl" aria-hidden="true">🗑️</p>
            <h2 className="mt-2 text-lg font-bold text-gray-900">
              {isAr ? `حذف أسرة "${familyName}"؟` : `Delete the "${familyName}" family?`}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {isAr
                ? "سيتم حذف الأسرة وروابط القرابة فقط. جميع الأفراد يبقون في قائمة الأعضاء، ولن يتأثر سجل حضورهم. لا يمكن التراجع عن هذا الإجراء."
                : "This removes the family and its relationship links only. Everyone stays in the members list and their attendance is untouched. This can't be undone."}
            </p>
            {error && (
              <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={busy}
                className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {busy ? (isAr ? "جارٍ الحذف…" : "Deleting…") : isAr ? "نعم، احذف" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
