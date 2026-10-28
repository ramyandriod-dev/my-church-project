"use client";

/**
 * Sign-in, review edition: email and password only. (The full product also offers
 * Google sign-in and sign-up; they are not part of this edition.)
 */

import React, { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { useMobileAuth } from "./mobile-auth-provider";
import { IconAlertTriangle, IconChurch, IconGlobe, IconLock, IconMail } from "./icons";

export function MobileLoginView() {
  const { locale, setLocale } = useTranslation();
  const { login, isLoading, error } = useMobileAuth();
  const ar = locale === "ar";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    await login(email.trim(), password);
  };

  const field =
    "w-full h-12 rounded-[14px] bg-[#F7F9FB] ring-1 ring-inset ring-[#E8ECF2] ps-11 pe-3 text-[15px] text-[#132F4C] placeholder:text-[#9AA8BC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]";

  return (
    <div className="min-h-full bg-gradient-to-b from-[#0B1F3A] to-[#132F4C] px-6 pt-16 pb-10 text-white">
      <div className="mx-auto mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 ring-1 ring-white/20">
          <IconChurch className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold">{ar ? "تطبيق الأعضاء" : "Member app"}</h1>
        <p className="mt-1 text-sm text-white/70">{ar ? "نسخة المراجعة" : "Review edition"}</p>
      </div>

      <form onSubmit={submit} className="space-y-3 rounded-3xl bg-white p-5 text-[#132F4C] shadow-2xl">
        <h2 className="text-lg font-bold">{ar ? "تسجيل الدخول" : "Sign in"}</h2>

        <label className="relative block">
          <span className="sr-only">{ar ? "البريد الإلكتروني" : "Email"}</span>
          <IconMail className="pointer-events-none absolute start-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9AA8BC]" />
          <input
            type="email"
            autoComplete="username"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={ar ? "البريد الإلكتروني" : "Email"}
            className={field}
            required
          />
        </label>

        <label className="relative block">
          <span className="sr-only">{ar ? "كلمة المرور" : "Password"}</span>
          <IconLock className="pointer-events-none absolute start-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9AA8BC]" />
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={ar ? "كلمة المرور" : "Password"}
            className={field}
            required
          />
        </label>

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading || !email.trim() || !password}
          className="h-12 w-full rounded-[14px] bg-[#2563EB] font-semibold text-white disabled:opacity-50"
        >
          {isLoading ? (ar ? "جارٍ الدخول…" : "Signing in…") : ar ? "دخول" : "Sign in"}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-center gap-2 text-sm text-white/80">
        <IconGlobe className="h-4 w-4" />
        <button type="button" onClick={() => setLocale("en")} className={!ar ? "font-bold underline" : ""}>
          English
        </button>
        <span aria-hidden="true">·</span>
        <button type="button" onClick={() => setLocale("ar")} className={ar ? "font-bold underline" : ""}>
          العربية
        </button>
      </div>
    </div>
  );
}
