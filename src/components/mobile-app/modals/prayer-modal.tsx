"use client";

import React, { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import {
  IconHeart,
  IconLock,
  IconUsers,
  IconX,
  IconCheckCircle2,
  IconSend,
} from "../icons";

import { mobileApiFetch } from "@/lib/mobile-app/api-client";

interface PrayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: () => void;
}

export function PrayerModal({ isOpen, onClose, onSubmitSuccess }: PrayerModalProps) {
  const { mobileApp } = useTranslation();
  const [requestText, setRequestText] = useState("");
  const [privacy, setPrivacy] = useState<"confidential" | "team">("confidential");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestText.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const category =
        privacy === "confidential" ? "Pastoral Care (Confidential)" : "Prayer Team";

      await mobileApiFetch("/api/prayers", {
        method: "POST",
        body: JSON.stringify({
          category,
          request: requestText.trim(),
        }),
      });

      setIsSuccess(true);
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to submit prayer request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setErrorMessage(null);
    setRequestText("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prayer-modal-title"
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-sm">
              <IconHeart className="w-5 h-5 fill-rose-500/20 text-rose-600" />
            </div>
            <div>
              <h2 id="prayer-modal-title" className="text-lg font-bold text-slate-900 leading-tight">
                {mobileApp.prayerModalTitle}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {mobileApp.prayerModalDesc}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors"
            aria-label={mobileApp.close}
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {isSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shadow-inner animate-in zoom-in-75 duration-300">
                <IconCheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {mobileApp.confirm}
                </h3>
                <p className="text-sm text-slate-600 mt-1.5 px-4 leading-relaxed">
                  {mobileApp.prayerSuccess}
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors shadow-sm"
              >
                {mobileApp.close}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Textarea */}
              <div>
                <textarea
                  value={requestText}
                  onChange={(e) => setRequestText(e.target.value)}
                  placeholder={mobileApp.prayerPlaceholder}
                  rows={4}
                  required
                  className="w-full p-4 rounded-2xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-sm text-slate-800 placeholder-slate-400 resize-none transition-all outline-none"
                />
              </div>

              {/* Privacy Radio */}
              <div className="space-y-2">
                <label
                  onClick={() => setPrivacy("confidential")}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    privacy === "confidential"
                      ? "border-rose-400 bg-rose-50/50 shadow-sm"
                      : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="prayerPrivacy"
                    checked={privacy === "confidential"}
                    onChange={() => setPrivacy("confidential")}
                    className="sr-only"
                  />
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      privacy === "confidential"
                        ? "bg-rose-500 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    <IconLock className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-900">
                      {mobileApp.prayerConfidential}
                    </p>
                  </div>
                </label>

                <label
                  onClick={() => setPrivacy("team")}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    privacy === "team"
                      ? "border-rose-400 bg-rose-50/50 shadow-sm"
                      : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="prayerPrivacy"
                    checked={privacy === "team"}
                    onChange={() => setPrivacy("team")}
                    className="sr-only"
                  />
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      privacy === "team"
                        ? "bg-rose-500 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    <IconUsers className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-900">
                      {mobileApp.prayerPublic}
                    </p>
                  </div>
                </label>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {errorMessage}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !requestText.trim()}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold flex items-center justify-center gap-2 shadow-md shadow-rose-500/25 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <IconSend className="w-4 h-4 rtl:rotate-180" />
                    <span>{mobileApp.prayerSubmit}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
