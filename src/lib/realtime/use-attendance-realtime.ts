"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { subscribeLocalRealtime } from "./local-broadcast";

export interface AttendanceRealtimeEvent {
  type: string;
  tenantId?: string;
  data: {
    recordId?: string;
    memberId?: string;
    memberName?: string;
    serviceId?: string;
    method?: string;
    checkInTime?: string;
    [key: string]: unknown;
  };
  timestamp: string;
  /** Monotonic per-tenant position assigned by the hub, used as replay cursor. */
  sequence?: number;
}

export type RealtimeEventHandler = (event: AttendanceRealtimeEvent) => void;

/**
 * Resolve the real-time WebSocket URL for the current environment.
 *
 * Precedence:
 *   1. NEXT_PUBLIC_REALTIME_WS_URL — explicit override (used in production).
 *   2. Same-origin `/api/realtime/ws` — local development and any deployment
 *      that proxies the real-time worker through the app origin.
 *
 * No production hostname is hardcoded; the endpoint always follows the
 * environment the app is actually served from.
 */
export function resolveRealtimeWsUrl(
  location: { protocol: string; host: string } | undefined,
  envUrl: string | undefined = process.env.NEXT_PUBLIC_REALTIME_WS_URL
): string {
  if (envUrl) return envUrl;
  if (!location) return "/api/realtime/ws";
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${location.host}/api/realtime/ws`;
}

interface UseAttendanceRealtimeOptions {
  enabled?: boolean;
  onCheckIn?: (event: AttendanceRealtimeEvent) => void;
  onReset?: (event: AttendanceRealtimeEvent) => void;
  onMemberUpdated?: (event: AttendanceRealtimeEvent) => void;
  onEvent?: (event: AttendanceRealtimeEvent) => void;
}

/**
 * useAttendanceRealtime — React hook subscribing to live attendance events.
 *
 * Connects to /api/realtime/ws via native browser WebSocket and falls back
 * to multi-device polling when the route cannot complete an upgrade.
 */
let lastGlobalPollTimestamp = 0;
const MIN_POLL_INTERVAL_MS = 12000;

export function useAttendanceRealtime(options: UseAttendanceRealtimeOptions = {}) {
  const { enabled = true, onCheckIn, onReset, onMemberUpdated, onEvent } = options;
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const processedRecordIdsRef = useRef<Set<string>>(new Set());
  // Highest event sequence we have seen, sent on reconnect to replay gaps.
  // A sequence (not a timestamp) is used so events sharing a millisecond are
  // never lost.
  const lastSequenceRef = useRef<number | null>(null);

  // Stable callback refs
  const onCheckInRef = useRef(onCheckIn);
  onCheckInRef.current = onCheckIn;
  const onResetRef = useRef(onReset);
  onResetRef.current = onReset;
  const onMemberUpdatedRef = useRef(onMemberUpdated);
  onMemberUpdatedRef.current = onMemberUpdated;
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  // Subscribe to browser-to-browser BroadcastChannel for local development
  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = subscribeLocalRealtime((payload) => {
      const recordId = (payload.data?.recordId as string) || (payload as any).id;
      if (recordId) {
        if (processedRecordIdsRef.current.has(recordId)) return;
        processedRecordIdsRef.current.add(recordId);
      }

      onEventRef.current?.(payload);
      if (payload.type === "attendance.check_in") {
        onCheckInRef.current?.(payload);
      } else if (payload.type === "attendance.reset") {
        onResetRef.current?.(payload);
      } else if (
        payload.type === "member.profile_updated" ||
        payload.type === "member.deletion_requested" ||
        payload.type === "member.deletion_resolved" ||
        payload.type === "member.deleted"
      ) {
        onMemberUpdatedRef.current?.(payload);
      }
    });
    return unsubscribe;
  }, [enabled]);

  const connect = useCallback(() => {
    if (typeof window === "undefined" || !enabled) return;

    try {
      const url = resolveRealtimeWsUrl(window.location);

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);

        // On a reconnect, ask the hub to replay anything missed while offline.
        // On a first connection there is nothing to catch up on.
        if (lastSequenceRef.current !== null) {
          ws.send(
            JSON.stringify({
              type: "replay",
              sinceSequence: lastSequenceRef.current,
            })
          );
        }

        // Start heartbeat ping every 30 seconds
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 30000);
      };

      ws.onmessage = (messageEvent) => {
        try {
          const payload = JSON.parse(messageEvent.data) as AttendanceRealtimeEvent;
          if (payload.type === "pong") return;
          if (payload.type === "replay.complete") return;

          if (typeof payload.sequence === "number") {
            const current = lastSequenceRef.current;
            if (current === null || payload.sequence > current) {
              lastSequenceRef.current = payload.sequence;
            }
          }

          const recordId = (payload.data?.recordId as string) || (payload as any).id;
          if (recordId) {
            if (processedRecordIdsRef.current.has(recordId)) return;
            processedRecordIdsRef.current.add(recordId);
          }

          onEventRef.current?.(payload);

          if (payload.type === "attendance.check_in") {
            onCheckInRef.current?.(payload);
          } else if (payload.type === "attendance.reset") {
            onResetRef.current?.(payload);
          } else if (
            payload.type === "member.profile_updated" ||
            payload.type === "member.deletion_requested" ||
            payload.type === "member.deletion_resolved" ||
            payload.type === "member.deleted"
          ) {
            onMemberUpdatedRef.current?.(payload);
          }
        } catch {
          // Ignored malformed message
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // WebSocket creation failed (e.g. invalid host or restricted environment)
      setConnected(false);
    }
  }, [enabled]);

  // ─── Multi-Device Poll Fallback & Window Focus Sync ───────────────
  const lastPollTimeRef = useRef<string>(new Date(Date.now() - 30000).toISOString());

  const pollEvents = useCallback(async () => {
    if (!enabled || typeof window === "undefined") return;
    const now = Date.now();
    if (now - lastGlobalPollTimestamp < MIN_POLL_INTERVAL_MS) return;
    lastGlobalPollTimestamp = now;

    try {
      const since = lastPollTimeRef.current;
      const res = await fetch(`/api/realtime/poll?since=${encodeURIComponent(since)}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.data?.serverTime) {
        lastPollTimeRef.current = json.data.serverTime;
      }
      if (Array.isArray(json.data?.events)) {
        for (const event of json.data.events) {
          const dedupeKey = `${event.type}:${event.data?.memberId}:${event.timestamp}`;
          if (processedRecordIdsRef.current.has(dedupeKey)) continue;
          processedRecordIdsRef.current.add(dedupeKey);

          onEventRef.current?.(event);
          if (event.type === "member.profile_updated") {
            onMemberUpdatedRef.current?.(event);
          } else if (event.type === "attendance.check_in") {
            onCheckInRef.current?.(event);
          } else if (event.type === "attendance.reset") {
            onResetRef.current?.(event);
          }
        }
      }
    } catch {
      // Quiet fail on network hiccup
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    // Sane poll interval every 10 seconds ensures multi-device sync without DB strain
    const pollInterval = setInterval(() => {
      void pollEvents();
    }, 10000);

    // Instant sync on tab/window focus (e.g. when user looks back at laptop screen)
    const handleFocus = () => {
      void pollEvents();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void pollEvents();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enabled, pollEvents]);

  useEffect(() => {
    if (!enabled) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnected(false);
      return;
    }

    connect();

    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled, connect]);

  return { connected };
}
