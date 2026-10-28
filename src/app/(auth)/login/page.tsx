"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation, Ltr } from "@/lib/i18n";
import { MovingBibleVerse } from "@/components/dashboard/moving-bible-verse";
import { DemoAccessPicker } from "@/components/auth/demo-access-picker";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <div className="text-gray-400">Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";
  const { t, locale, setLocale, isRTL } = useTranslation();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        // Only a 401 is actually about the credentials. Telling someone their
        // password is wrong when the server returned 500 — an unmigrated
        // database, say — sends them off to reset a password that was fine and
        // hides the real fault.
        if (response.status === 401) {
          // Deliberately identical for unknown email, wrong password, disabled
          // account, and lockout, so the response cannot be used to discover
          // which addresses are registered.
          setError(t("auth.loginFailed"));
        } else if (response.status >= 500) {
          // A server fault is neither the user's fault nor about their
          // password. The server's own message is not surfaced here: in
          // development `errorResponse` places the raw exception string in
          // `error.message`, so a database or compile fault would be presented
          // to the user as though it were a login problem — which is exactly
          // the misdiagnosis this branch exists to prevent.
          setError(t("common.errorOccurred"));
        } else {
          // A 4xx the client can act on, such as 429 throttling, carries a
          // message that is safe and useful to show.
          setError(data?.error?.message || t("common.errorOccurred"));
        }
        return;
      }

      router.push(from);
      router.refresh();
    } catch {
      setError(t("common.errorOccurred"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-amber-50/60 via-sky-50/70 to-blue-100/60">
      {/* Background Image Layer: Brighter, colorful, and clearly visible */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none scale-[1.02] transform transition-transform duration-1000"
        style={{
          backgroundImage: "url('/login-bg.jpg')",
          opacity: 0.65,
          filter: "saturate(1.2) brightness(1.04)",
        }}
        aria-hidden="true"
      />

      {/* Soft light diffusion overlay that lets warm colors shine while ensuring text clarity */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-white/35 via-white/15 to-white/45 backdrop-blur-[0.5px] pointer-events-none"
        aria-hidden="true"
      />

      {/* Quick Language Toggle */}
      <div className="absolute top-4 end-4 z-20">
        <button
          type="button"
          onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
          className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white/90 hover:bg-white text-gray-800 shadow-sm backdrop-blur-md border border-white/80 transition-all cursor-pointer"
        >
          {locale === "ar" ? "English" : "العربية"}
        </button>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900/85 backdrop-blur-md rounded-2xl mb-3 shadow-xl border border-slate-700/50">
            <span className="text-3xl text-blue-400 font-bold">✝</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 drop-shadow-sm">{t("auth.title")}</h1>
          <p className="text-slate-800 font-semibold mt-1 text-sm">{t("auth.subtitle")}</p>
        </div>

        {/* Dark Login Card with high contrast & sleek glassmorphism */}
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/70 p-6 sm:p-7 text-white">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-lg text-sm text-red-200 text-start" role="alert">
                {error}
              </div>
            )}

            <div className="space-y-1.5 text-start">
              <label className="block text-sm font-semibold text-slate-200">
                {t("auth.emailLabel")}
              </label>
              <input
                type="email"
                placeholder="pastor@church.com"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={isLoading}
                className="w-full h-11 px-3.5 rounded-lg bg-slate-800/90 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-start transition-all"
              />
            </div>

            <div className="space-y-1.5 text-start">
              <label className="block text-sm font-semibold text-slate-200">
                {t("auth.passwordLabel")}
              </label>
              <input
                type="password"
                placeholder="••••••••"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={isLoading}
                className="w-full h-11 px-3.5 rounded-lg bg-slate-800/90 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-start transition-all"
              />
            </div>

            <Button
              type="submit"
              className="w-full font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-950/40 border-0"
              size="lg"
              isLoading={isLoading}
            >
              {isLoading ? t("auth.signingIn") : t("auth.signIn")}
            </Button>
          </form>

          {/* Owner demo access: one dropdown; the private password is typed by hand */}
          <DemoAccessPicker
            isAr={isRTL}
            variant="crm"
            onPick={(demoEmail) => {
              setEmail(demoEmail);
              setPassword("");
            }}
          />
        </div>

        {/* Moving Bible Verse Banner */}
        <div className="mt-6 flex justify-center">
          <MovingBibleVerse />
        </div>

        <p className="text-center text-xs text-slate-800 font-bold mt-6 drop-shadow-2xs">
          {t("auth.footer")}
        </p>
      </div>
    </div>
  );
}

