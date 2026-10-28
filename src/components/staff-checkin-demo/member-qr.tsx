"use client";

import * as React from "react";
import QRCode from "qrcode";
import { Avatar } from "@/components/ui/avatar";
import type { AttendanceSessionInfo, SignInUser } from "@/lib/staff-checkin-demo/types";

interface MemberQrProps {
  user: SignInUser;
  session: AttendanceSessionInfo;
}

/**
 * "My QR" — renders the real attendance session token as a QR code.
 *
 * The token payload is ONLY the service + tenant (see encodeAttendanceSessionToken):
 * no member identity, no PII. A member's identity is never embedded in the QR.
 */
export function MemberQr({ user, session }: MemberQrProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, session.qrToken, {
      width: 176,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0F172A", light: "#FFFFFF" },
    }).catch(() => {
      /* QR render failure is non-fatal for the demo */
    });
  }, [session.qrToken, session.window]);

  return (
    <div className="p-5">
      <div className="rounded-3xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        {/* Member header */}
        <div className="bg-navy-950 px-5 py-4 flex items-center gap-3">
          <Avatar
            size="sm"
            initials={`${user.name.split(" ")[0]?.[0] ?? "?"}${user.name.split(" ")[1]?.[0] ?? ""}`}
            status="online"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">{user.name}</p>
            <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
          </div>
          <span className="px-2 py-1 rounded-md bg-mint-500/20 text-mint-300 text-[10px] font-bold uppercase tracking-wider">
            Member
          </span>
        </div>

        {/* QR area */}
        <div className="px-5 py-5 flex flex-col items-center">
          <div className="rounded-2xl border-4 border-gray-100 p-3">
            <canvas
              ref={canvasRef}
              data-testid="member-qr-canvas"
              className="rounded-lg"
              aria-label="Member check-in QR code"
            />
          </div>
          <p className="mt-3 text-xs text-gray-500 text-center leading-relaxed">
            Show this code to the church scanner between{" "}
            <span className="font-semibold text-gray-700">{session.window.start}</span> and{" "}
            <span className="font-semibold text-gray-700">{session.window.end}</span>.
          </p>
          <div data-testid="qr-token" className="mt-3 w-full rounded-lg bg-gray-100 px-3 py-2 text-center text-[10px] font-mono text-gray-500 truncate">
            {session.qrToken}
          </div>
        </div>

        {/* Session footer */}
        <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">Service</p>
            <p className="text-sm font-semibold text-gray-800">{session.serviceName}</p>
          </div>
          <div className="text-end">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">Window</p>
            <p className="text-sm font-semibold text-gray-800">
              {session.window.start} – {session.window.end}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}