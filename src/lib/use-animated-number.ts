"use client";

import * as React from "react";

/**
 * Animates a number from its previous value to a new value over a given duration.
 * Respects prefers-reduced-motion by jumping to the final value immediately.
 *
 * Returns the currently displayed (interpolated) number.
 */
export function useAnimatedNumber(target: number, duration = 1400): number {
  const [displayed, setDisplayed] = React.useState(target);
  const prevRef = React.useRef(target);
  const rafRef = React.useRef<number | null>(null);

  // Check reduced motion preference
  const prefersReducedMotion = React.useRef(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotion.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  React.useEffect(() => {
    const from = prevRef.current;
    const to = target;

    // Skip animation if values are the same
    if (from === to) return;

    // If reduced motion, jump to final value
    if (prefersReducedMotion.current) {
      setDisplayed(to);
      prevRef.current = to;
      return;
    }

    // Cancel any in-progress animation
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    const startTime = performance.now();

    function easeOutCubic(t: number): number {
      return 1 - Math.pow(1 - t, 3);
    }

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const current = Math.round(from + (to - from) * eased);

      setDisplayed(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
        rafRef.current = null;
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [target, duration]);

  return displayed;
}
