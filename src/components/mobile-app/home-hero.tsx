"use client";

/**
 * Home photo hero: the church doors (the same photo as the CRM dashboard
 * banner, carved sign included) under a navy shade, with a large serif
 * greeting. It sits behind the header, which is see-through while the hero is
 * on screen and turns back into the slim cream bar once you scroll past it
 * (see `heroMode` in MobileHeader and the scroll watcher in the shell).
 *
 * It bleeds to the screen edges (cancelling <main>'s padding) and leaves room
 * at the bottom for the verse card, which overlaps its lower edge.
 */

import React from "react";
import { useTranslation } from "@/lib/i18n";
import { useMobileAuth } from "./mobile-auth-provider";

/** How far the hero reaches; the shell switches the header back to solid past this. */
export const HOME_HERO_SOLID_AFTER = 110;

export function HomeHero() {
  const { mobileApp, locale } = useTranslation();
  const { member, user } = useMobileAuth();
  const isAr = locale === "ar";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? mobileApp.greetingMorning : hour < 17 ? mobileApp.greetingAfternoon : mobileApp.greetingEvening;
  const firstName = member?.firstName || user?.name?.split(" ")[0] || "";
  const today = new Date().toLocaleDateString(isAr ? "ar-EG" : "en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <section className="relative -mx-4 -mt-4 h-[226px] overflow-hidden bg-[#0B1F3A]" aria-label={greeting}>
      <div
        // Slightly enlarged and anchored low, so the carved sign sits just under the
        // header bar and the greeting below it has room to breathe.
        className="absolute inset-0 bg-[length:auto_125%] bg-[position:center_100%] bg-no-repeat"
        style={{ backgroundImage: "url('/church-banner.jpg')" }}
        aria-hidden="true"
      />
      {/* Light at the top so the doors and sign show, deep navy where the text sits. */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#0B1F3A]/55 via-[#0B1F3A]/35 via-40% to-[#0B1F3A]"
        aria-hidden="true"
      />

      {/* No church-name line here: the photo's own carved sign already says it. */}
      <div className="absolute inset-x-0 bottom-12 px-5">
        <h1 className="font-serif text-[24px] leading-tight text-white drop-shadow-sm">
          {greeting}
          {firstName ? `${isAr ? "، " : ", "}${firstName}` : ""}
        </h1>
        <p className="mt-0.5 text-[11px] text-white/70">{today}</p>
      </div>
    </section>
  );
}
