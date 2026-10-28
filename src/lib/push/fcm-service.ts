/**
 * Firebase Cloud Messaging (FCM) Push Notification Dispatcher
 *
 * Dispatches high-priority push notifications to Android devices when the app is minimized,
 * ensuring members immediately receive messages from pastoral care and church staff with
 * system heads-up alert, sound, and vibration.
 *
 * Supports modern Firebase HTTP v1 API (`/v1/projects/{projectId}/messages:send`) with
 * Web Crypto OAuth2 token generation, as well as legacy fallback.
 */

import { getTokensForMembersAsync, getTokensForMembers, removeDeviceTokenAsync } from "./fcm-store";
import { publishLocalRealtime } from "@/lib/realtime/local-broadcast";

export interface SendPushNotificationOptions {
  targetMemberIds: string[];
  title: string;
  body: string;
  type?: "message" | "announcement" | "attendance";
  url?: string;
  data?: Record<string, string>;
}

export interface PushDispatchResult {
  success: boolean;
  targetCount: number;
  tokensCount: number;
  deliveredCount: number;
  error?: string;
}

interface ServiceAccountCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

// In-memory cache for short-lived Google OAuth2 Access Token (per worker isolate)
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function base64UrlEncode(data: string | Uint8Array): string {
  const binary = typeof data === "string" ? new TextEncoder().encode(data) : data;
  let str = "";
  for (let i = 0; i < binary.length; i++) {
    str += String.fromCharCode(binary[i]);
  }
  const b64 = typeof btoa === "function" ? btoa(str) : Buffer.from(binary).toString("base64");
  return b64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToDer(pem: string): ArrayBuffer {
  const cleanB64 = pem
    .replace(/-----BEGIN [A-Z ]+-----/g, "")
    .replace(/-----END [A-Z ]+-----/g, "")
    .replace(/\\n/g, "")
    .replace(/\s+/g, "");

  const binary = typeof atob === "function" ? atob(cleanB64) : Buffer.from(cleanB64, "base64").toString("binary");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getGoogleOAuth2AccessToken(creds: ServiceAccountCredentials): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.expiresAt > nowSec + 120) {
    return cachedAccessToken.token;
  }

  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: creds.clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: nowSec + 3600,
    iat: nowSec,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaims = base64UrlEncode(JSON.stringify(claims));
  const unsignedToken = `${encodedHeader}.${encodedClaims}`;

  const cryptoObj = typeof globalThis.crypto !== "undefined" ? globalThis.crypto : require("node:crypto").webcrypto;
  const der = pemToDer(creds.privateKey);

  const subtleKey = await cryptoObj.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await cryptoObj.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    subtleKey,
    new TextEncoder().encode(unsignedToken)
  );

  const encodedSignature = base64UrlEncode(new Uint8Array(signatureBuffer));
  const jwtAssertion = `${unsignedToken}.${encodedSignature}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwtAssertion,
    }).toString(),
  });

  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text().catch(() => "");
    throw new Error(`Google OAuth2 token exchange failed (${tokenResponse.status}): ${errText}`);
  }

  const tokenData: any = await tokenResponse.json();
  const accessToken = tokenData?.access_token;
  const expiresIn = tokenData?.expires_in || 3600;

  if (!accessToken) {
    throw new Error("No access_token returned by Google OAuth2 token endpoint");
  }

  cachedAccessToken = {
    token: accessToken,
    expiresAt: nowSec + expiresIn,
  };

  return accessToken;
}

function resolveServiceAccount(): ServiceAccountCredentials | null {
  const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FCM_SERVER_KEY;
  if (saEnv && saEnv.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(saEnv);
      if (parsed.client_email && parsed.private_key) {
        return {
          projectId: parsed.project_id || process.env.FIREBASE_PROJECT_ID || "your-firebase-project",
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key,
        };
      }
    } catch {}
  }

  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID || "your-firebase-project",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY,
    };
  }

  return null;
}

export async function sendFcmPushToMembers(
  options: SendPushNotificationOptions
): Promise<PushDispatchResult> {
  const { targetMemberIds, title, body, type = "message", url = "/mobile?open=messages", data = {} } = options;

  if (!targetMemberIds || targetMemberIds.length === 0) {
    return { success: true, targetCount: 0, tokensCount: 0, deliveredCount: 0 };
  }

  // Cross-isolate lookup from PostgreSQL with in-memory fallback
  let tokens: string[] = [];
  try {
    tokens = await getTokensForMembersAsync(targetMemberIds);
  } catch {
    tokens = getTokensForMembers(targetMemberIds);
  }

  // In-app realtime event for when app is currently foregrounded
  try {
    publishLocalRealtime({
      type: "push.notification",
      data: {
        title,
        body,
        targetMemberIds,
        type,
        tokensCount: tokens.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch {}

  if (tokens.length === 0) {
    console.warn(`[FCM] no registered devices for ${targetMemberIds.length} recipients`);
    return {
      success: true,
      targetCount: targetMemberIds.length,
      tokensCount: 0,
      deliveredCount: 0,
    };
  }

  const serviceAccount = resolveServiceAccount();
  const rawServerKey = process.env.FCM_SERVER_KEY;

  if (!serviceAccount && !rawServerKey) {
    return {
      success: true,
      targetCount: targetMemberIds.length,
      tokensCount: tokens.length,
      deliveredCount: 0,
      error: "FCM_SERVER_KEY not configured in environment",
    };
  }

  // 1. Prefer Modern FCM HTTP v1 API
  if (serviceAccount) {
    try {
      const accessToken = await getGoogleOAuth2AccessToken(serviceAccount);
      let deliveredCount = 0;

      for (const token of tokens) {
        try {
          const res = await fetch(
            `https://fcm.googleapis.com/v1/projects/${serviceAccount.projectId}/messages:send`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                message: {
                  token,
                  notification: {
                    title,
                    body,
                  },
                  android: {
                    priority: "HIGH",
                    notification: {
                      channel_id: "church_direct_messages",
                      sound: "default",
                      default_sound: true,
                      default_vibrate_timings: true,
                      notification_priority: "PRIORITY_HIGH",
                      icon: "ic_stat_church",
                    },
                  },
                  data: {
                    ...data,
                    title,
                    body,
                    type,
                    url,
                  },
                },
              }),
            }
          );

          if (res.ok) {
            deliveredCount++;
          } else {
            const errJson: any = await res.json().catch(() => ({}));
            const errCode = errJson?.error?.details?.[0]?.errorCode || errJson?.error?.status;
            console.warn(`[FCM v1] send rejected (${res.status}) ${errCode ?? ""} ${errJson?.error?.message ?? ""}`.trim());
            if (errCode === "UNREGISTERED" || errCode === "INVALID_ARGUMENT") {
              void removeDeviceTokenAsync(token).catch(() => {});
            }
          }
        } catch (err: any) {
          console.warn("[FCM v1] send failed:", err?.message || err);
        }
      }

      return {
        success: true,
        targetCount: targetMemberIds.length,
        tokensCount: tokens.length,
        deliveredCount,
      };
    } catch (err: any) {
      console.warn("[FCM v1] Dispatch error:", err?.message || err);
    }
  }

  // 2. Fallback to Legacy endpoint (or mock test support)
  if (rawServerKey) {
    try {
      const response = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${rawServerKey}`,
        },
        body: JSON.stringify({
          registration_ids: tokens,
          priority: "high",
          notification: {
            title,
            body,
            sound: "default",
            color: "#0B1528",
            icon: "ic_stat_church",
          },
          data: {
            ...data,
            title,
            body,
            type,
            url,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        return {
          success: false,
          targetCount: targetMemberIds.length,
          tokensCount: tokens.length,
          deliveredCount: 0,
          error: `FCM endpoint returned ${response.status}: ${errText}`,
        };
      }

      const json: any = await response.json();
      return {
        success: true,
        targetCount: targetMemberIds.length,
        tokensCount: tokens.length,
        deliveredCount: json?.success || 0,
      };
    } catch (err: any) {
      return {
        success: false,
        targetCount: targetMemberIds.length,
        tokensCount: tokens.length,
        deliveredCount: 0,
        error: err?.message || "Failed to dispatch push to FCM",
      };
    }
  }

  return {
    success: false,
    targetCount: targetMemberIds.length,
    tokensCount: tokens.length,
    deliveredCount: 0,
    error: "No valid FCM credentials configured",
  };
}
