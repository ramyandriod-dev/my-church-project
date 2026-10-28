"use client";

import * as React from "react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";

/**
 * Mode A — REAL device camera scan (M5.1).
 *
 * Reads a QR in front of the camera with jsQR and hands the decoded session
 * token to the same `performCheckIn` path the simulated scan uses. It is an
 * OPTIONAL, best-effort convenience: permission/sensor failures degrade
 * gracefully to the deterministic "Simulate scan" mode and never break the
 * demo (M5.1 camera support is explicitly non-blocking).
 */
export function CameraScan({
  onToken,
  onUnavailable,
  disabled,
}: {
  onToken: (token: string) => void;
  onUnavailable?: (reason: string) => void;
  disabled: boolean;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [active, setActive] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const lastDecodeRef = React.useRef<number>(0);
  const onTokenRef = React.useRef(onToken);
  onTokenRef.current = onToken;
  const onUnavailableRef = React.useRef(onUnavailable);
  onUnavailableRef.current = onUnavailable;

  const stop = React.useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  React.useEffect(() => {
    if (disabled) stop();
  }, [disabled, stop]);

  // Cleanup the stream on unmount.
  React.useEffect(() => stop, [stop]);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setActive(true);

      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      const tick = () => {
        if (!active) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA && canvas.width > 0) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(image.data, image.width, image.height, {
            inversionAttempts: "dontInvert",
          });
          const now = Date.now();
          if (code?.data && now - lastDecodeRef.current > 800) {
            lastDecodeRef.current = now;
            onTokenRef.current(code.data.trim());
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      const message =
        e instanceof Error && e.name === "NotAllowedError"
          ? "Camera permission denied — use Simulate scan instead."
          : "Camera unavailable — use Simulate scan instead.";
      setError(message);
      onUnavailableRef.current?.(message);
    }
  }

  return (
    <div data-testid="camera-scan">
      <div className="relative overflow-hidden rounded-xl bg-gray-900">
        {active ? (
          <>
            <video ref={videoRef} playsInline muted className="w-full aspect-video object-cover" />
            <canvas ref={canvasRef} width={640} height={480} className="hidden" />
            <span className="absolute inset-0 m-auto w-56 h-32 rounded-lg border-2 border-mint-400 pointer-events-none" />
          </>
        ) : (
          <div className="w-full aspect-video flex items-center justify-center text-xs text-gray-400">
            {error ?? "Camera off"}
          </div>
        )}
      </div>
      {error && <p className="text-[11px] text-coral-600 mt-1.5">{error}</p>}
      <div className="flex gap-2 mt-3">
        {!active ? (
          <Button className="flex-1" size="sm" variant="secondary" onClick={start} disabled={disabled}>
            Start camera
          </Button>
        ) : (
          <Button className="flex-1" size="sm" variant="secondary" onClick={stop}>
            Stop camera
          </Button>
        )}
      </div>
    </div>
  );
}