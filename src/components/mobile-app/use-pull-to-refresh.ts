"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

const THRESHOLD = 64; // px of (eased) pull needed to trigger a refresh
const MAX_PULL = 96;
const REFRESH_HOLD_MS = 900;

/**
 * How far this element, or any scrolling ancestor, is scrolled down. The member
 * app nests two scroll containers; checking only the inner one made the hook think
 * the page was always at the top and swallow every upward swipe.
 */
function scrolledAmount(el: HTMLElement | null): number {
  let total = 0;
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    total += node.scrollTop;
  }
  return total + (typeof window !== "undefined" ? window.scrollY : 0);
}

/**
 * Touch pull-to-refresh for a scroll container.
 *
 * Only starts when the container is scrolled to the very top, eases the pull so
 * it feels elastic, and calls `onRefresh` once the threshold is passed. The
 * screens fetch their own data, so this just signals "reload" and holds the
 * spinner briefly. `enabled` must be false while the container is not mounted
 * or on screens that should not refresh.
 */
export function usePullToRefresh(
  ref: RefObject<HTMLElement | null>,
  onRefresh: () => void,
  enabled: boolean
) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  const busy = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let startY = 0;
    let tracking = false;
    let current = 0;

    const onStart = (e: TouchEvent) => {
      if (busy.current || scrolledAmount(el) > 0) return;
      startY = e.touches[0].clientY;
      tracking = true;
      current = 0;
    };

    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      if (scrolledAmount(el) > 0) {
        tracking = false;
        setDragging(false);
        setPull(0);
        return;
      }
      const dy = e.touches[0].clientY - startY;
      if (dy < 8) {
        // Finger moving up (normal scrolling) or barely moving: never interfere.
        if (dy < 0) tracking = false;
        return;
      }
      if (e.cancelable) e.preventDefault();
      current = Math.min(MAX_PULL, (dy - 8) * 0.5);
      setDragging(true);
      setPull(current);
    };

    const onEnd = () => {
      if (!tracking) return;
      tracking = false;
      setDragging(false);
      if (current >= THRESHOLD) {
        busy.current = true;
        setRefreshing(true);
        setPull(0);
        onRefreshRef.current();
        setTimeout(() => {
          busy.current = false;
          setRefreshing(false);
        }, REFRESH_HOLD_MS);
      } else {
        setPull(0);
      }
      current = 0;
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [ref, enabled]);

  return { pull, refreshing, dragging, threshold: THRESHOLD };
}
