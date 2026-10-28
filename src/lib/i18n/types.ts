import type { translations } from "./translations";

type DeepString<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends object
    ? DeepString<T[K]>
    : T[K];
};

export type TranslationSchema = DeepString<typeof translations.ar>;
export type TranslationKeys = TranslationSchema;

export type Locale = "ar" | "en";
export type Direction = "rtl" | "ltr";

export type I18nContextType = TranslationSchema & {
  locale: Locale;
  direction: Direction;
  isRTL: boolean;
  isRtl: boolean;
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
};
