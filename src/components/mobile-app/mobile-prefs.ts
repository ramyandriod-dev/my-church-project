"use client";

import { useSyncExternalStore } from "react";

/**
 * Per-device display preferences for the member app: colour theme and text size.
 *
 * Kept in localStorage (it is a convenience for this phone, not account data) and
 * exposed through a tiny external store so the shell, which applies the settings,
 * and the Profile screen, which changes them, always agree without prop drilling.
 * Every read and write is wrapped in try/catch because storage can be blocked or
 * empty inside a WebView.
 */

export type ThemeChoice = "light" | "dark" | "system";
export type TextScale = 100 | 115 | 130;

export interface MobilePrefs {
  theme: ThemeChoice;
  textScale: TextScale;
}

const STORAGE_KEY = "cmp:mobile-prefs:v1";
const DEFAULTS: MobilePrefs = { theme: "light", textScale: 100 };

let current: MobilePrefs = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

function sanitize(raw: unknown): MobilePrefs {
  const r = (raw ?? {}) as Partial<MobilePrefs>;
  const theme: ThemeChoice =
    r.theme === "dark" || r.theme === "system" || r.theme === "light" ? r.theme : DEFAULTS.theme;
  const textScale: TextScale =
    r.textScale === 115 || r.textScale === 130 || r.textScale === 100
      ? r.textScale
      : DEFAULTS.textScale;
  return { theme, textScale };
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) current = sanitize(JSON.parse(raw));
  } catch {
    current = DEFAULTS;
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export function setMobilePrefs(patch: Partial<MobilePrefs>) {
  load();
  current = sanitize({ ...current, ...patch });
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Storage unavailable: the choice still applies for this session.
  }
  emit();
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  // Re-read once after mount so server-rendered defaults hydrate cleanly.
  queueMicrotask(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): MobilePrefs {
  load();
  return current;
}

function getServerSnapshot(): MobilePrefs {
  return DEFAULTS;
}

function subscribeSystemDark(listener: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", listener);
  return () => mq.removeEventListener("change", listener);
}

function getSystemDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Current preferences plus the theme that is actually in effect. */
export function useMobilePrefs() {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const systemDark = useSyncExternalStore(subscribeSystemDark, getSystemDark, () => false);
  const resolvedTheme: "light" | "dark" =
    prefs.theme === "system" ? (systemDark ? "dark" : "light") : prefs.theme;

  return {
    theme: prefs.theme,
    textScale: prefs.textScale,
    resolvedTheme,
    setTheme: (theme: ThemeChoice) => setMobilePrefs({ theme }),
    setTextScale: (textScale: TextScale) => setMobilePrefs({ textScale }),
  };
}
