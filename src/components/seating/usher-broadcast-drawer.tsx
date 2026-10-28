"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useSanctuarySeating } from "@/lib/seating/use-seating";
import { SectionId } from "@/lib/seating/seating-types";
import { useTranslation } from "@/lib/i18n";

interface UsherBroadcastDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSection?: SectionId;
  usherName?: string;
  className?: string;
}

export function UsherBroadcastDrawer({
  isOpen,
  onClose,
  defaultSection = "ground_left",
  usherName = "Usher",
  className,
}: UsherBroadcastDrawerProps) {
  const { locale, isRTL } = useTranslation();
  const isAr = locale === "ar";
  const { sectionsList, broadcastAlert } = useSanctuarySeating();

  const [sectionId, setSectionId] = React.useState<SectionId>(defaultSection);
  const [row, setRow] = React.useState("Row 1");
  const [availableSeats, setAvailableSeats] = React.useState<number>(3);
  const [isTotallyOccupied, setIsTotallyOccupied] = React.useState(false);
  const [customNote, setCustomNote] = React.useState("");
  const [sentSuccess, setSentSuccess] = React.useState(false);

  React.useEffect(() => {
    setSectionId(defaultSection);
  }, [defaultSection]);

  if (!isOpen) return null;

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();

    const currentSection = sectionsList.find((s) => s.id === sectionId)!;
    const finalSeats = isTotallyOccupied ? 0 : availableSeats;

    let msgEn = customNote.trim();
    let msgAr = customNote.trim();

    if (!msgEn) {
      if (isTotallyOccupied) {
        msgEn = `${currentSection.nameEn} ${row ? `${row} ` : ""}is totally occupied`;
        msgAr = `${currentSection.nameAr} ${row ? `الصف ${row} ` : ""}مكتمل بالكامل`;
      } else {
        msgEn = `${finalSeats} seats available in ${currentSection.nameEn} ${row ? `(${row})` : ""}`.trim();
        msgAr = `${finalSeats} مقاعد شاغرة في ${currentSection.nameAr} ${row ? `(${row})` : ""}`.trim();
      }
    }

    broadcastAlert({
      sectionId,
      row,
      availableSeats: finalSeats,
      noteEn: msgEn,
      noteAr: msgAr,
      usherName: usherName || "Usher (فريق الاستقبال)",
    });

    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
      onClose();
    }, 1200);
  };

  const quickPillOptions = [0, 1, 2, 3, 4, 5, 8, 10];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={cn(
          "w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-200 overflow-hidden text-start",
          "animate-in slide-in-from-bottom duration-200",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-900 to-indigo-950 text-white">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-blue-800 rounded-lg text-amber-300 text-lg">📢</span>
            <div>
              <h3 className="text-base font-bold">
                {isAr ? "إرسال إشعار توفر مقاعد (تحديث المنظمين)" : "Broadcast Seating Availability"}
              </h3>
              <p className="text-xs text-blue-200">
                {isAr ? "يظهر فوراً على شاشات المنسق وأبواب الكنيسة" : "Instantly appears on coordinator dashboard & doors"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleBroadcast} className="p-5 space-y-4">
          {/* 1. Section Picker */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              {isAr ? "١. اختر المنطقة / الجناح:" : "1. Select Section / Wing:"}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {sectionsList.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setSectionId(sec.id)}
                  className={cn(
                    "p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-start",
                    sectionId === sec.id
                      ? "bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-500/20 shadow-xs"
                      : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <p className="truncate">{isAr ? sec.nameAr : sec.nameEn}</p>
                  <p className="text-[10px] text-gray-400 font-normal mt-0.5">{sec.totalSeats} seats</p>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Row Specification */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              {isAr ? "٢. تحديد الصف (اختياري):" : "2. Specific Row (Optional):"}
            </label>
            <div className="flex gap-2">
              {["First Row (A)", "Row 1-3", "Row 4-7", "Back Rows", "Any Row"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRow(r)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all",
                    row === r
                      ? "bg-blue-600 border-blue-600 text-white shadow-2xs"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Available Seats Count & Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-700">
                {isAr ? "٣. عدد المقاعد الشاغرة:" : "3. Number of Available Seats:"}
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsTotallyOccupied(!isTotallyOccupied);
                  if (!isTotallyOccupied) setAvailableSeats(0);
                }}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer border",
                  isTotallyOccupied
                    ? "bg-rose-600 border-rose-700 text-white shadow-xs"
                    : "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                )}
              >
                {isAr ? "🔴 مكتمل تماماً (0 مقاعد)" : "🔴 Totally Full (0 Seats)"}
              </button>
            </div>

            {!isTotallyOccupied && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {quickPillOptions.map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setAvailableSeats(cnt)}
                      className={cn(
                        "w-10 h-10 rounded-xl border text-sm font-bold flex items-center justify-center transition-all cursor-pointer shadow-2xs",
                        availableSeats === cnt
                          ? "bg-emerald-600 border-emerald-700 text-white ring-2 ring-emerald-500/20"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      {cnt === 0 ? "0" : cnt}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-gray-500">{isAr ? "أو اكتب العدد:" : "Or custom count:"}</span>
                  <input
                    type="number"
                    min="0"
                    max="200"
                    value={availableSeats}
                    onChange={(e) => setAvailableSeats(parseInt(e.target.value || "0", 10))}
                    className="w-24 px-3 py-1.5 text-xs font-bold border border-gray-300 rounded-lg text-center"
                  />
                  <span className="text-xs text-gray-500">{isAr ? "مقعد شاغر" : "seats"}</span>
                </div>
              </div>
            )}
          </div>

          {/* 4. Custom Message / Tag */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              {isAr ? "٤. ملاحظة إضافية (اختياري):" : "4. Custom Note (Optional):"}
            </label>
            <input
              type="text"
              placeholder={
                isAr
                  ? "مثال: 3 مقاعد متوفرة في الصف الأول بالجناح الأيسر"
                  : "e.g., 3 seats available in first row left wing"
              }
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={sentSuccess}
              className={cn(
                "w-full py-3 rounded-xl text-sm font-bold text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2",
                sentSuccess
                  ? "bg-emerald-600"
                  : isTotallyOccupied
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-[0.99]"
              )}
            >
              {sentSuccess ? (
                <>
                  <span>✓</span>
                  <span>{isAr ? "تم إرسال التحديث بنجاح!" : "Update Broadcasted Successfully!"}</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>{isAr ? "إرسال التحديث الآن للوحة التحكم" : "Broadcast Update Now"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
