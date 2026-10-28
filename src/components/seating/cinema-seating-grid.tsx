"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useSanctuarySeating } from "@/lib/seating/use-seating";
import { SectionId, SanctuarySectionDef } from "@/lib/seating/seating-types";
import { useTranslation } from "@/lib/i18n";

interface CinemaSeatingGridProps {
  selectedSection: SectionId | "all";
  onSeatClick?: (seatId: string) => void;
  className?: string;
}

export function CinemaSeatingGrid({
  selectedSection,
  onSeatClick,
  className,
}: CinemaSeatingGridProps) {
  const { isRTL, locale } = useTranslation();
  const isAr = locale === "ar";
  const { sectionsList, seats, toggleSeat, toggleRow } = useSanctuarySeating();

  const displayedSections = React.useMemo(() => {
    if (selectedSection === "all") return sectionsList;
    return sectionsList.filter((s) => s.id === selectedSection);
  }, [selectedSection, sectionsList]);

  return (
    <div className={cn("space-y-8 select-none", className)}>
      {/* ─── Cinema / Church Altar & Chancel Indicator ─── */}
      <div className="relative mx-auto max-w-2xl text-center">
        <div className="relative py-2.5 px-6 rounded-2xl bg-gradient-to-b from-blue-900 to-indigo-950 text-white shadow-md border border-blue-800/60 overflow-hidden">
          {/* Subtle curved glow simulating church apse */}
          <div className="absolute inset-x-0 -top-6 h-12 bg-blue-400/25 blur-lg rounded-full pointer-events-none" />
          <div className="relative z-10 flex items-center justify-center gap-3 text-xs sm:text-sm font-bold tracking-wider uppercase">
            <span className="text-amber-300 text-base">✟</span>
            <span>{isAr ? "المنبر — الشاشات ومنصة الوعظ" : "Altar & Chancel — Pulpit & Sanctuary Front"}</span>
            <span className="text-amber-300 text-base">✟</span>
          </div>
        </div>
        <div className="w-48 h-1 mx-auto bg-gradient-to-r from-transparent via-amber-400/80 to-transparent mt-1" />
      </div>

      {/* ─── Legend / Status Indicator ─── */}
      <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-gray-600 bg-white/80 backdrop-blur-xs py-2 px-4 rounded-xl border border-gray-200/80 shadow-2xs max-w-fit mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-emerald-50 border-2 border-emerald-500 shadow-2xs flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
          <span className="font-semibold text-emerald-800">{isAr ? "شاغر / متاح" : "Available"}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-rose-600 border-2 border-rose-700 shadow-2xs flex items-center justify-center text-white text-[9px] font-bold">
            ✓
          </div>
          <span className="font-semibold text-rose-800">{isAr ? "مشغول / ممتلئ" : "Occupied"}</span>
        </div>

        <div className="text-[11px] text-gray-500 hidden sm:inline">
          {isAr ? "💡 اضغط على المقعد للتبديل بين متاح ومشغول" : "💡 Tap any seat to toggle between available & occupied"}
        </div>
      </div>

      {/* ─── Sections Rendering ─── */}
      <div className="space-y-8">
        {displayedSections.map((section) => (
          <SectionSeatCluster
            key={section.id}
            section={section}
            seats={seats}
            onToggleSeat={(seatId) => {
              toggleSeat(seatId);
              onSeatClick?.(seatId);
            }}
            onToggleRow={toggleRow}
            isAr={isAr}
          />
        ))}
      </div>
    </div>
  );
}

interface SectionSeatClusterProps {
  section: SanctuarySectionDef;
  seats: Record<string, boolean>;
  onToggleSeat: (seatId: string) => void;
  onToggleRow: (sectionId: SectionId, row: string, occupied: boolean) => void;
  isAr: boolean;
}

function SectionSeatCluster({
  section,
  seats,
  onToggleSeat,
  onToggleRow,
  isAr,
}: SectionSeatClusterProps) {
  let sectionOccupied = 0;
  for (const row of section.rows) {
    for (let num = 1; num <= section.seatsPerRow; num++) {
      if (seats[`${section.id}-${row}-${num}`]) {
        sectionOccupied++;
      }
    }
  }
  const sectionAvailable = Math.max(0, section.totalSeats - sectionOccupied);
  const occupancyPct = Math.round((sectionOccupied / section.totalSeats) * 100);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-4 sm:p-5 text-start overflow-hidden">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-4 border-b border-gray-100">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
            <span>{isAr ? section.nameAr : section.nameEn}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-600">
              {section.totalSeats} {isAr ? "مقعد" : "seats"}
            </span>
          </h3>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-semibold">
            <span className="text-gray-500">{isAr ? "المتاح:" : "Available:"}</span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-bold tabular-nums">
              {sectionAvailable}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-semibold">
            <span className="text-gray-500">{isAr ? "المشغول:" : "Occupied:"}</span>
            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 font-bold tabular-nums">
              {sectionOccupied}
            </span>
          </div>

          <div className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 tabular-nums">
            {occupancyPct}%
          </div>
        </div>
      </div>

      {/* Cinema Seat Rows Grid (Scrollable on small mobile screens) */}
      <div className="pt-4 overflow-x-auto pb-2">
        <div className="min-w-fit space-y-2.5 mx-auto">
          {section.rows.map((row) => {
            // Count occupied in this row
            let rowOccupiedCount = 0;
            for (let i = 1; i <= section.seatsPerRow; i++) {
              if (seats[`${section.id}-${row}-${i}`]) rowOccupiedCount++;
            }
            const isRowFullyOccupied = rowOccupiedCount === section.seatsPerRow;

            return (
              <div key={row} className="flex items-center gap-2 sm:gap-3 group">
                {/* Row Label / Quick Action Button */}
                <button
                  type="button"
                  onClick={() => onToggleRow(section.id, row, !isRowFullyOccupied)}
                  title={
                    isRowFullyOccupied
                      ? (isAr ? `تفريغ الصف ${row}` : `Mark Row ${row} Available`)
                      : (isAr ? `ملء الصف ${row} بالكامل` : `Mark Row ${row} Full`)
                  }
                  className={cn(
                    "w-12 sm:w-14 h-7 text-[11px] font-bold rounded-md flex items-center justify-center gap-1 transition-all cursor-pointer border shrink-0",
                    isRowFullyOccupied
                      ? "bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200"
                      : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
                  )}
                >
                  <span>{isAr ? `صف ${row}` : `Row ${row}`}</span>
                </button>

                {/* Seats in this row */}
                <div className="flex items-center gap-1 sm:gap-1.5">
                  {Array.from({ length: section.seatsPerRow }, (_, i) => i + 1).map((seatNum) => {
                    const seatId = `${section.id}-${row}-${seatNum}`;
                    const isOccupied = !!seats[seatId];

                    // Visual aisle break in the middle for realism
                    const hasAisleBreak =
                      section.seatsPerRow === 20 && seatNum === 10 ||
                      section.seatsPerRow === 16 && seatNum === 8;

                    return (
                      <React.Fragment key={seatNum}>
                        <button
                          type="button"
                          onClick={() => onToggleSeat(seatId)}
                          aria-label={`${section.nameEn} Row ${row} Seat ${seatNum}: ${isOccupied ? "Occupied" : "Available"}`}
                          title={`${row}${seatNum}: ${isOccupied ? (isAr ? "مشغول" : "Occupied") : (isAr ? "شاغر" : "Available")}`}
                          className={cn(
                            "relative w-6 h-7 sm:w-7 sm:h-8 rounded-t-md rounded-b-xs transition-all duration-150 cursor-pointer flex flex-col items-center justify-end pb-1 border shadow-2xs group/seat",
                            "hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-400",
                            isOccupied
                              ? "bg-rose-600 border-rose-700 text-white shadow-rose-200/50"
                              : "bg-emerald-50 border-emerald-400/80 text-emerald-800 hover:bg-emerald-100 shadow-emerald-100/50"
                          )}
                        >
                          {/* Seat Headrest / Cushion lines (Cinema Style) */}
                          <div
                            className={cn(
                              "w-3/4 h-1 rounded-full mb-auto mt-0.5",
                              isOccupied ? "bg-rose-400/80" : "bg-emerald-300/80"
                            )}
                          />
                          <span className="text-[9px] sm:text-[10px] font-bold tabular-nums leading-none">
                            {seatNum}
                          </span>
                        </button>
                        {hasAisleBreak && (
                          <div
                            className="w-4 sm:w-6 flex items-center justify-center text-[10px] text-gray-300 select-none"
                            aria-hidden="true"
                          >
                            ·
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Quick Row Count Pill */}
                <span className="text-[10px] font-semibold text-gray-400 tabular-nums ps-1 shrink-0">
                  {section.seatsPerRow - rowOccupiedCount} {isAr ? "متاح" : "free"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
