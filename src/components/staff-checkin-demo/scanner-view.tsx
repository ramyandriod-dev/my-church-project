"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { WindowBanner } from "@/components/staff-checkin-demo/window-banner";
import { CameraScan } from "@/components/staff-checkin-demo/camera-scan";
import type { CheckInResponse, WindowPresentation } from "@/lib/staff-checkin-demo/types";
import { readCarriedSession, clearCarriedSession } from "@/lib/staff-checkin-demo/carry";
import { CheckInDemoError, performCheckIn } from "@/lib/staff-checkin-demo/api";
type ScanStatus = "idle" | "scanning" | "success" | "duplicate" | "error";
type ScanMode = "simulate" | "camera";

interface ScannerViewProps {
  window: WindowPresentation;
  demoLabel?: string | null;
}

const INITIALS = (name: string) =>
  `${name.split(" ")[0]?.[0] ?? "?"}${name.split(" ")[1]?.[0] ?? ""}`;

/**
 * The "church scanner" — reads the member's QR (session token) and calls the
 * REAL check-in API with ONLY that token. There is no client-supplied memberId;
 * the member is resolved from the authenticated session server-side.
 */
export function ScannerView({ window, demoLabel }: ScannerViewProps) {
  const [token, setToken] = React.useState("");
  const [memberName, setMemberName] = React.useState("");
  const [memberEmail, setMemberEmail] = React.useState("");
  const [status, setStatus] = React.useState<ScanStatus>("idle");
  const [result, setResult] = React.useState<CheckInResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<ScanMode>("simulate");
  const [cameraNote, setCameraNote] = React.useState<string | null>(null);

  React.useEffect(() => {
    function syncCarry() {
      const carry = readCarriedSession();
      if (carry?.sessionToken) {
        setToken(carry.sessionToken);
        setMemberName(carry.memberName);
        setMemberEmail(carry.memberEmail);
      }
    }
    syncCarry();
    if (typeof globalThis !== "undefined" && globalThis.addEventListener) {
      globalThis.addEventListener("storage", syncCarry);
      return () => globalThis.removeEventListener("storage", syncCarry);
    }
  }, []);

  async function handleScan(scannedToken?: string) {
    const value = scannedToken ?? token;
    if (!value.trim()) return;
    setStatus("scanning");
    setError(null);
    setResult(null);

    // Simulated scan latency for a realistic device feel.
    if (!scannedToken) await new Promise((r) => setTimeout(r, 800));

    try {
      const res = await performCheckIn(value.trim());
      setResult(res);
      if (res.member?.name) {
        setMemberName(res.member.name);
      }
      setStatus(res.alreadyCheckedIn ? "duplicate" : "success");
      // Realtime fan-out (dev BroadcastChannel fallback) is handled centrally
      // inside performCheckIn() so every check-in path behaves identically.
    } catch (e) {
      setError(
        e instanceof CheckInDemoError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Scan failed unexpectedly"
      );
      setStatus("error");
    }
  }

  // Camera (Mode A) decoded a real QR -> run through the SAME real API path.
  function handleCameraToken(decoded: string) {
    if (decoded && decoded !== token) setToken(decoded);
    void handleScan(decoded);
  }

  const canScan = mode === "simulate" && window.checkInAvailable && !!token.trim() && status !== "scanning";

  // Mode A (camera) failure → tell the user to use Simulate scan (Mode B).
  const cameraOnUnavailable = React.useCallback(
    (message: string) => setCameraNote(message),
    []
  );

  return (
    <div className="flex flex-col min-h-full">
      <div className="p-4">
        <WindowBanner window={window} demoLabel={demoLabel} />
      </div>

      {/* Scan mode toggle */}
      <div className="px-5 pb-3 flex items-center justify-center gap-2">
        {(["simulate", "camera"] as const).map((m) => (
          <button
            key={m}
            type="button"
            data-testid={`scan-mode-${m}`}
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-colors ${
              mode === m ? "bg-navy-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {m === "simulate" ? "Simulate" : "Camera"}
          </button>
        ))}
      </div>

      {/* Scan viewport */}
      <div className="px-5 flex flex-col items-center">
        {mode === "camera" ? (
          <CameraScan
            onToken={handleCameraToken}
            onUnavailable={cameraOnUnavailable}
            disabled={!window.checkInAvailable}
          />
        ) : (
          <div
            data-testid="scanner-viewport"
            className="relative w-full aspect-square max-w-[260px] rounded-3xl overflow-hidden bg-navy-950"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.18),rgba(15,23,42,0.9)_70%)]" />
            {/* Corner brackets */}
            {["top-4 left-4 border-t-2 border-l-2", "top-4 right-4 border-t-2 border-r-2", "bottom-4 left-4 border-b-2 border-l-2", "bottom-4 right-4 border-b-2 border-r-2"].map(
              (pos) => (
                <div key={pos} className={`absolute ${pos} w-9 h-9 rounded-md border-mint-400`} />
              )
            )}
            {/* Scan line */}
            <div
              className={`absolute left-6 right-6 h-0.5 bg-mint-400 shadow-[0_0_20px_2px_rgba(45,212,191,0.8)] ${
                status === "scanning" ? "animate-[scanline_1.4s_ease-in-out_infinite]" : "top-1/2"
              }`}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              {status === "success" ? (
                <div className="text-center px-6">
                  <div className="w-14 h-14 mx-auto rounded-full bg-mint-500 flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="mt-3 text-white text-sm font-bold">Checked in</p>
                </div>
              ) : status === "duplicate" ? (
                <div className="text-center px-6">
                  <div className="w-14 h-14 mx-auto rounded-full bg-amber-500 flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="mt-3 text-white text-sm font-bold">Already checked in</p>
                </div>
              ) : (
                <p className="text-white/50 text-xs font-medium font-mono px-8 text-center">
                  {status === "scanning" ? "Scanning…" : token ? "Ready — tap Scan" : "Awaiting QR"}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Scan prompt / result */}
      <div className="px-5 pt-4 pb-6">
        {!window.checkInAvailable && (
          <div className="rounded-2xl bg-gray-100 border border-gray-200 p-4 text-xs text-gray-600 text-center leading-relaxed">
            Scanning is disabled while the attendance window is closed.
          </div>
        )}

        {status === "success" && result && memberName && (
          <div data-testid="scan-success" className="rounded-2xl bg-mint-50 border border-mint-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-mint-500 text-white flex items-center justify-center font-bold text-sm">
              {INITIALS(memberName)}
            </div>
            <div>
              <p className="text-sm font-bold text-mint-800">
                {memberName.split(" ")[0]} • checked in
              </p>
              <p className="text-xs text-mint-600">
                {new Date(result.record.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {memberEmail ? ` · ${memberEmail}` : ""}
              </p>
            </div>
          </div>
        )}

        {status === "duplicate" && (
          <div data-testid="scan-duplicate" className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-center">
            <p className="text-sm font-bold text-amber-800">
              {result?.member?.name || memberName || "Member"} is already checked in
            </p>
            <p className="text-xs text-amber-600 mt-0.5">Duplicate scan — no new record created.</p>
          </div>
        )}

        {status === "error" && (
          <div data-testid="scan-error" className="rounded-2xl bg-coral-50 border border-coral-200 p-4 text-center">
            <p className="text-sm font-bold text-coral-800">Scan rejected</p>
            <p className="text-xs text-coral-600 mt-0.5">{error}</p>
          </div>
        )}

        {/* Controls — Mode B simulated scan (deterministic, always available) */}
        <div className="mt-4 rounded-2xl bg-white border border-gray-200 p-3">
          {mode === "simulate" ? (
            <>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                QR payload (session token)
              </label>
              <textarea
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  setStatus("idle");
                }}
                rows={3}
                placeholder="Paste the QR token from the member simulator…"
                className="w-full text-[11px] font-mono text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                readOnly={!!readCarriedSession() && status !== "idle"}
              />
              {memberName && (
                <p className="text-[11px] text-gray-500 mt-1.5">
                  QR carried from the member simulator:{" "}
                  <span className="font-semibold text-gray-700">{memberName}</span>
                </p>
              )}
              <div className="flex gap-2 mt-3">
                <Button className="flex-1" onClick={() => handleScan()} disabled={!canScan} isLoading={status === "scanning"}>
                  {status === "scanning" ? "Scanning…" : "Simulate scan"}
                </Button>
                {status === "success" || status === "duplicate" ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setStatus("idle");
                      setResult(null);
                      clearCarriedSession();
                    }}
                  >
                    New scan
                  </Button>
                ) : null}
              </div>
            </>
          ) : (
            <div>
              {cameraNote && (
                <p data-testid="camera-unavailable-note" className="text-[11px] text-coral-600 text-center mb-2">
                  {cameraNote}
                </p>
              )}
              <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                Point the camera at a member QR. Camera scanning is best-effort — if no
                camera/permission is available, use <span className="font-semibold text-gray-600">Simulate scan</span>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}