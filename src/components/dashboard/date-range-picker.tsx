"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface DateRange {
  start: Date;
  end: Date;
}

export interface DateRangePreset {
  label: string;
  value: string;
  getRange: () => DateRange;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return startOfDay(d);
}

function endOfWeek(date: Date): Date {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  return endOfDay(d);
}

function startOfMonth(date: Date): Date {
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
}

function endOfMonth(date: Date): Date {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function startOfQuarter(date: Date): Date {
  const q = Math.floor(date.getMonth() / 3);
  return startOfDay(new Date(date.getFullYear(), q * 3, 1));
}

function endOfQuarter(date: Date): Date {
  const q = Math.floor(date.getMonth() / 3);
  return endOfDay(new Date(date.getFullYear(), q * 3 + 2 + 1, 0));
}

function startOfYear(date: Date): Date {
  return startOfDay(new Date(date.getFullYear(), 0, 1));
}

function endOfYear(date: Date): Date {
  return endOfDay(new Date(date.getFullYear(), 11, 31));
}

function subDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

function subWeeks(date: Date, weeks: number): Date {
  return subDays(date, weeks * 7);
}

function subMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() - months);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isWithinRange(date: Date, range: DateRange): boolean {
  const d = startOfDay(date).getTime();
  return d >= startOfDay(range.start).getTime() && d <= startOfDay(range.end).getTime();
}

function isBefore(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() < startOfDay(b).getTime();
}

const presets: DateRangePreset[] = [
  {
    label: "Today",
    value: "today",
    getRange: () => {
      const now = new Date();
      return { start: now, end: now };
    },
  },
  {
    label: "Yesterday",
    value: "yesterday",
    getRange: () => {
      const d = subDays(new Date(), 1);
      return { start: d, end: d };
    },
  },
  {
    label: "This Week",
    value: "this-week",
    getRange: () => ({
      start: startOfWeek(new Date()),
      end: endOfWeek(new Date()),
    }),
  },
  {
    label: "Last Week",
    value: "last-week",
    getRange: () => ({
      start: startOfWeek(subWeeks(new Date(), 1)),
      end: endOfWeek(subWeeks(new Date(), 1)),
    }),
  },
  {
    label: "This Month",
    value: "this-month",
    getRange: () => ({
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date()),
    }),
  },
  {
    label: "Last Month",
    value: "last-month",
    getRange: () => ({
      start: startOfMonth(subMonths(new Date(), 1)),
      end: endOfMonth(subMonths(new Date(), 1)),
    }),
  },
  {
    label: "This Quarter",
    value: "this-quarter",
    getRange: () => ({
      start: startOfQuarter(new Date()),
      end: endOfQuarter(new Date()),
    }),
  },
  {
    label: "This Year",
    value: "this-year",
    getRange: () => ({
      start: startOfYear(new Date()),
      end: endOfYear(new Date()),
    }),
  },
  {
    label: "Custom Range",
    value: "custom",
    getRange: () => ({
      start: new Date(),
      end: new Date(),
    }),
  },
];

function formatDateRange(range: DateRange): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const start = range.start;
  const end = range.end;

  if (isSameDay(start, end)) {
    return start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.getDate()}, ${end.getFullYear()}`;
  }

  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

// ─── Calendar ───────────────────────────────────────────────────

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  for (let i = 0; i < firstDay.getDay(); i++) {
    days.push(new Date(year, month, -i));
  }
  days.reverse();

  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  while (days.length < 42) {
    days.push(new Date(year, month + 1, days.length - firstDay.getDay() - lastDay.getDate() + 1));
  }

  return days;
}

interface CalendarMonthProps {
  year: number;
  month: number;
  selection: { start: Date | null; end: Date | null };
  hoverDate: Date | null;
  onDayClick: (date: Date) => void;
  onDayHover: (date: Date) => void;
}

function CalendarMonth({ year, month, selection, hoverDate, onDayClick, onDayHover }: CalendarMonthProps) {
  const days = getDaysInMonth(year, month);
  const today = startOfDay(new Date());
  const monthName = new Date(year, month).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  function getDayClasses(date: Date) {
    const isCurrentMonth = date.getMonth() === month;
    const isToday = isSameDay(date, today);
    const isSelectedStart = selection.start && isSameDay(date, selection.start);
    const isSelectedEnd = selection.end && isSameDay(date, selection.end);
    const isInRange =
      selection.start && selection.end
        ? isWithinRange(date, { start: selection.start, end: selection.end })
        : selection.start && hoverDate
        ? isWithinRange(date, {
            start: isBefore(selection.start, hoverDate) ? selection.start : hoverDate,
            end: isBefore(selection.start, hoverDate) ? hoverDate : selection.start,
          })
        : false;

    return cn(
      "w-9 h-9 flex items-center justify-center text-sm rounded-full transition-colors duration-100 relative",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
      !isCurrentMonth && "text-gray-300",
      isCurrentMonth && !isSelectedStart && !isSelectedEnd && !isInRange && "text-gray-700 hover:bg-gray-100",
      isToday && !isSelectedStart && !isSelectedEnd && "ring-1 ring-blue-500 font-semibold",
      isSelectedStart && "bg-blue-500 text-white font-semibold",
      isSelectedEnd && "bg-blue-500 text-white font-semibold",
      isInRange && !isSelectedStart && !isSelectedEnd && "bg-blue-50",
      isCurrentMonth && "cursor-pointer",
      !isCurrentMonth && "cursor-pointer"
    );
  }

  return (
    <div className="select-none">
      <p className="text-sm font-semibold text-gray-900 text-center mb-3">{monthName}</p>
      <div className="grid grid-cols-7 gap-0" role="grid" aria-label={monthName}>
        {WEEK_DAYS.map((d) => (
          <div key={d} className="w-9 h-7 flex items-center justify-center text-xs font-medium text-gray-400" role="columnheader" aria-label={d}>
            {d}
          </div>
        ))}
        {days.map((date, i) => (
          <button
            key={i}
            type="button"
            role="gridcell"
            aria-label={date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            aria-selected={!!(selection.start && isSameDay(date, selection.start)) || !!(selection.end && isSameDay(date, selection.end))}
            className={getDayClasses(date)}
            onClick={() => onDayClick(date)}
            onMouseEnter={() => onDayHover(date)}
            tabIndex={0}
          >
            {date.getDate()}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange, preset: string) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [showCustom, setShowCustom] = React.useState(false);
  const [customStart, setCustomStart] = React.useState<Date | null>(null);
  const [customEnd, setCustomEnd] = React.useState<Date | null>(null);
  const [calMonth, setCalMonth] = React.useState(value.end.getMonth());
  const [calYear, setCalYear] = React.useState(value.end.getFullYear());
  const [hoverDate, setHoverDate] = React.useState<Date | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  // Click outside + Escape (M18)
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCustom(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setShowCustom(false);
        triggerRef.current?.focus();
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  // Focus trap inside dropdown (M18)
  React.useEffect(() => {
    if (!open) return;
    function handleTab(e: KeyboardEvent) {
      if (e.key !== "Tab" || !ref.current) return;
      const focusable = ref.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [open]);

  function handlePresetClick(preset: DateRangePreset) {
    if (preset.value === "custom") {
      setShowCustom(true);
      setCustomStart(null);
      setCustomEnd(null);
      setCalMonth(value.end.getMonth());
      setCalYear(value.end.getFullYear());
      return;
    }
    const range = preset.getRange();
    onChange(range, preset.value);
    setOpen(false);
    setShowCustom(false);
  }

  function handleDayClick(date: Date) {
    if (!customStart || (customStart && customEnd)) {
      setCustomStart(date);
      setCustomEnd(null);
    } else {
      if (isBefore(date, customStart)) {
        setCustomEnd(customStart);
        setCustomStart(date);
      } else {
        setCustomEnd(date);
      }
    }
  }

  function handleApplyCustom() {
    if (customStart && customEnd) {
      onChange({ start: customStart, end: customEnd }, "custom");
      setOpen(false);
      setShowCustom(false);
    }
  }

  function handlePrevMonth() {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(calYear - 1);
    } else {
      setCalMonth(calMonth - 1);
    }
  }

  function handleNextMonth() {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(calYear + 1);
    } else {
      setCalMonth(calMonth + 1);
    }
  }

  const selection = { start: customStart, end: customEnd };
  const canApply = customStart && customEnd;

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className="btn btn-md btn-secondary gap-2"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Date range: ${formatDateRange(value)}. Click to change.`}
      >
        <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-sm">{formatDateRange(value)}</span>
        <svg className={cn("w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0", open && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            "absolute right-0 mt-2 bg-white rounded-xl border border-gray-100 shadow-dropdown z-50 animate-fade-in overflow-hidden",
            "w-56 sm:w-56",
            /* M17: Mobile — full-width below sm breakpoint */
            "max-sm:fixed max-sm:inset-x-3 max-sm:bottom-3 max-sm:top-auto max-sm:mt-0 max-sm:w-auto max-sm:rounded-xl max-sm:shadow-2xl"
          )}
          role="dialog"
          aria-label="Date range picker"
          aria-modal="true"
        >
          {!showCustom ? (
            /* Preset list */
            <div className="py-1" role="listbox" aria-label="Date range presets">
              {presets.map((preset) => (
                <button
                  key={preset.value}
                  role="option"
                  aria-selected={false}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-sm transition-colors duration-100",
                    "hover:bg-gray-50 focus-visible:outline-none focus-visible:bg-gray-50 flex items-center justify-between",
                    preset.value === "custom" && "border-t border-gray-100 mt-1 pt-3"
                  )}
                  onClick={() => handlePresetClick(preset)}
                >
                  <span className="text-gray-700">{preset.label}</span>
                  {preset.value === "custom" && (
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          ) : (
            /* Custom range calendar */
            <div className="p-4">
              {/* Calendar header */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors duration-100"
                  aria-label="Previous month"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => { setShowCustom(false); }}
                  className="text-sm font-semibold text-gray-900 hover:text-blue-600 focus-visible:outline-none focus-visible:text-blue-600 transition-colors"
                >
                  ← Back to presets
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors duration-100"
                  aria-label="Next month"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Selection summary */}
              <div className="flex items-center justify-center gap-2 mb-4 text-sm" aria-live="polite">
                <span className={cn(
                  "px-2.5 py-1 rounded-md",
                  customStart ? "bg-blue-50 text-blue-700 font-medium" : "bg-gray-100 text-gray-400"
                )}>
                  {customStart ? customStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Start date"}
                </span>
                <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                <span className={cn(
                  "px-2.5 py-1 rounded-md",
                  customEnd ? "bg-blue-50 text-blue-700 font-medium" : "bg-gray-100 text-gray-400"
                )}>
                  {customEnd ? customEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "End date"}
                </span>
              </div>

              {/* Calendar */}
              <CalendarMonth
                year={calYear}
                month={calMonth}
                selection={selection}
                hoverDate={hoverDate}
                onDayClick={handleDayClick}
                onDayHover={setHoverDate}
              />

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={() => { setShowCustom(false); }}
                  className="btn btn-sm btn-ghost text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyCustom}
                  disabled={!canApply}
                  className="btn btn-sm btn-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  aria-label={canApply ? `Apply date range ${customStart?.toLocaleDateString()} to ${customEnd?.toLocaleDateString()}` : "Select both dates to apply"}
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
