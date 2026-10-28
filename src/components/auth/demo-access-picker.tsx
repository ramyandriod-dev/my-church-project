"use client";

/**
 * The owner's demo accounts in one dropdown, for both login screens.
 *
 * It only fills in the email. The password is typed by hand: it is the owner's
 * private one (see lib/auth/demo-access.ts), and nothing on screen reveals it.
 * Collapsed by default, so people who are only testing the app see a small
 * "Owner demo access" line instead of a list of accounts.
 */

import * as React from "react";
import { DEMO_ACCOUNTS } from "@/lib/auth/demo-accounts";

interface DemoAccessPickerProps {
  isAr: boolean;
  /** "mobile" is light (member app); "crm" is dark (staff login). */
  variant: "mobile" | "crm";
  onPick: (email: string) => void;
}

export function DemoAccessPicker({ isAr, variant, onPick }: DemoAccessPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const crm = variant === "crm";

  const toggleClass = crm
    ? "text-xs font-semibold text-slate-400 hover:text-slate-200"
    : "text-[11px] font-semibold text-[#9AA8BC] hover:text-[#4A5568]";
  const selectClass = crm
    ? "w-full h-10 rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
    : "w-full h-11 rounded-[12px] bg-[#F7F9FB] ring-1 ring-inset ring-[#E8ECF2] px-3 text-[13px] text-[#132F4C] focus:outline-none focus:ring-2 focus:ring-[#2563EB]";
  const noteClass = crm ? "mt-2 text-[11px] text-slate-400" : "mt-2 text-[11px] text-[#9AA8BC]";

  const core = DEMO_ACCOUNTS.filter((a) => a.group === "core");
  const away = DEMO_ACCOUNTS.filter((a) => a.group === "away");

  return (
    <div className={crm ? "mt-5 pt-4 border-t border-slate-800 text-start" : "mt-5 pt-4 border-t border-[#EEF1F5] text-center"}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={toggleClass}>
        {isAr ? "دخول تجريبي للمالك" : "Owner demo access"} {open ? "▴" : "▾"}
      </button>

      {open && (
        <div className="mt-2 text-start">
          <select
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (e.target.value) onPick(e.target.value);
            }}
            className={selectClass}
            aria-label={isAr ? "اختر حسابًا تجريبيًا" : "Choose a demo account"}
          >
            <option value="">{isAr ? "اختر حسابًا…" : "Choose an account…"}</option>
            <optgroup label={isAr ? "حسابات تجريبية" : "Demo accounts"}>
              {core.map((a) => (
                <option key={a.email} value={a.email}>
                  {isAr ? a.ar : a.en}
                </option>
              ))}
            </optgroup>
            <optgroup label={isAr ? "غائبون منذ أسابيع (تظهر لهم الشارة الذهبية)" : "Away for weeks (golden banner on check-in)"}>
              {away.map((a) => (
                <option key={a.email} value={a.email}>
                  {isAr ? a.ar : a.en}
                </option>
              ))}
            </optgroup>
          </select>
          <p className={noteClass}>
            {isAr
              ? "اكتب كلمة المرور الخاصة بالمالك ثم سجّل الدخول."
              : "Type the owner's private demo password, then sign in."}
          </p>
        </div>
      )}
    </div>
  );
}
