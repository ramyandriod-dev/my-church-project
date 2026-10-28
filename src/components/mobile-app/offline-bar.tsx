"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { useOnlineStatus } from "@/lib/mobile-app/use-online-status";

/**
 * Slim status strip under the header. Appears when the phone loses its
 * connection ("showing your last saved information") and briefly confirms when
 * it comes back. Renders nothing at all while everything is normal.
 */
export function OfflineBar() {
  const { locale } = useTranslation();
  const isAr = locale === "ar";
  const online = useOnlineStatus();
  const [showBack, setShowBack] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setShowBack(false);
      return;
    }
    if (wasOffline.current) {
      wasOffline.current = false;
      setShowBack(true);
      const t = setTimeout(() => setShowBack(false), 2500);
      return () => clearTimeout(t);
    }
  }, [online]);

  if (online && !showBack) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mobile-screen-enter px-4 py-2 text-center text-[12px] font-medium border-b ${
        online
          ? "bg-[#E7F6EC] text-[#1A7F45] border-[#BEEACF]"
          : "bg-[#F5EEDF] text-[#6F5428] border-[#E8DCC0]"
      }`}
    >
      {online
        ? isAr
          ? "عاد الاتصال ✓"
          : "Back online ✓"
        : isAr
        ? "لا يوجد اتصال بالإنترنت — نعرض آخر معلومات محفوظة"
        : "You're offline — showing your last saved information"}
    </div>
  );
}
