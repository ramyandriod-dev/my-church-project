"use client";

import * as React from "react";
import { Locale, Direction, I18nContextType } from "./types";
import { translations } from "./translations";

const I18nContext = React.createContext<I18nContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default to Arabic as requested for master Arabic localization
  const [locale, setLocaleState] = React.useState<Locale>("ar");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("church_app_locale") as Locale;
      if (saved === "ar" || saved === "en") {
        setLocaleState(saved);
      } else {
        setLocaleState("ar");
      }
    } catch {
      // Ignore localStorage access restrictions
    }
    setMounted(true);
  }, []);

  const direction: Direction = locale === "ar" ? "rtl" : "ltr";
  const isRTL = direction === "rtl";

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.documentElement.dir = direction;
    }
  }, [locale, direction]);

  const setLocale = React.useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem("church_app_locale", newLocale);
    } catch {
      // Ignore localStorage error
    }
  }, []);

  const t = React.useCallback((key: string, fallback?: string): string => {
    const parts = key.split(".");
    let current: any = translations[locale];
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        // Fallback to english if not found in active locale
        let enFallback: any = translations.en;
        for (const enPart of parts) {
          if (enFallback && typeof enFallback === "object" && enPart in enFallback) {
            enFallback = enFallback[enPart];
          } else {
            enFallback = undefined;
            break;
          }
        }
        return typeof enFallback === "string" ? enFallback : (fallback || key);
      }
    }
    return typeof current === "string" ? current : (fallback || key);
  }, [locale]);

    const contextValue: I18nContextType = {
      ...translations[locale],
      locale,
      direction,
      isRTL,
      isRtl: isRTL,
      setLocale,
      t,
    };

    return (
      <I18nContext.Provider value={contextValue}>
        {children}
      </I18nContext.Provider>
    );
  }

  export function useTranslation(): I18nContextType {
    const context = React.useContext(I18nContext);
    if (!context) {
      // Graceful fallback if called outside provider
      const fallbackT = (key: string, fallback?: string) => {
        const parts = key.split(".");
        let current: any = translations.ar;
        for (const part of parts) {
          if (current && typeof current === "object" && part in current) {
            current = current[part];
          } else {
            return fallback || key;
          }
        }
        return typeof current === "string" ? current : (fallback || key);
      };

      return {
        ...translations.ar,
        locale: "ar" as Locale,
        direction: "rtl" as Direction,
        isRTL: true,
        isRtl: true,
        setLocale: () => {},
        t: fallbackT,
      };
    }
    return context;
  }

export const useLanguage = useTranslation;

/**
 * Ltr helper component to safely isolate and display emails, phone numbers,
 * URLs, or English identifiers in RTL layouts without bidirectional glitches.
 */
export function Ltr({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <bdi dir="ltr" className={`inline-block [unicode-bidi:isolate] ${className}`}>
      {children}
    </bdi>
  );
}
