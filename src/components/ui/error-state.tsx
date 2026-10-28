"use client";

import * as React from "react";
import { useLanguage } from "@/lib/i18n";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title,
  message,
  onRetry,
}: ErrorStateProps) {
  const { locale } = useLanguage();
  const isAr = locale === "ar";
  const displayTitle = title || (isAr ? "حدث خطأ ما" : "Something went wrong");
  const retryLabel = isAr ? "إعادة المحاولة" : "Try Again";

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 mb-4">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{displayTitle}</h3>
      <p className="text-sm text-gray-500 text-center max-w-sm mb-6">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-md btn-secondary gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{retryLabel}</span>
        </button>
      )}
    </div>
  );
}
