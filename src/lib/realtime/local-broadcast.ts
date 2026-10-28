/**
 * Browser-to-browser BroadcastChannel for local development.
 *
 * Allows events emitted by the Mobile Demo in one browser tab to reach
 * the Dashboard tab instantly without needing a local Cloudflare Worker daemon.
 * In production, the WebSocket connection to AttendanceHub handles this.
 */

import type { AttendanceRealtimeEvent } from "./use-attendance-realtime";

const CHANNEL_NAME = "cmp-local-realtime";

export function publishLocalRealtime(event: AttendanceRealtimeEvent): void {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return;
  }
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(event);
    channel.close();
  } catch {
    // Non-blocking fallback
  }
}

export function subscribeLocalRealtime(
  callback: (event: AttendanceRealtimeEvent) => void
): () => void {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return () => {};
  }
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    const handler = (ev: MessageEvent) => {
      if (ev.data && typeof ev.data === "object" && ev.data.type) {
        callback(ev.data as AttendanceRealtimeEvent);
      }
    };
    channel.addEventListener("message", handler);
    return () => {
      channel.removeEventListener("message", handler);
      channel.close();
    };
  } catch {
    return () => {};
  }
}
