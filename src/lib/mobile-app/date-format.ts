/**
 * Mobile Date Formatting Utilities
 *
 * Provides localized date/time formatting and human-readable relative time strings
 * compliant with Arabic (RTL) and English (LTR).
 */

export function formatRelativeTime(dateInput: string | Date, locale: string = "ar"): string {
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 5) {
      return locale === "ar" ? "منذ قليل" : "Just now";
    }
    if (diffMins < 60) {
      return locale === "ar" ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
    }
    if (diffHours < 24) {
      return locale === "ar" ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
    }
    if (diffDays === 1) {
      return locale === "ar" ? "أمس" : "Yesterday";
    }
    if (diffDays < 7) {
      return locale === "ar" ? `منذ ${diffDays} أيام` : `${diffDays} days ago`;
    }
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 4) {
      return locale === "ar" ? `منذ ${diffWeeks} أسبوع` : `${diffWeeks}w ago`;
    }

    return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
      month: "short",
      day: "numeric",
    }).format(d);
  } catch {
    return "";
  }
}

export function formatServiceWindow(
  startStr?: string,
  endStr?: string,
  locale: string = "ar"
): string {
  if (!startStr && !endStr) {
    return locale === "ar" ? "١٠:٠٠ ص – ١٢:٣٠ م" : "10:00 AM – 12:30 PM";
  }

  const formatTimePart = (time?: string) => {
    if (!time) return "";
    const [h, m] = time.split(":").map(Number);
    if (Number.isNaN(h)) return time;
    const period = h >= 12 ? (locale === "ar" ? "م" : "PM") : (locale === "ar" ? "ص" : "AM");
    const h12 = h % 12 || 12;
    return `${h12}:${String(m || 0).padStart(2, "0")} ${period}`;
  };

  const start = formatTimePart(startStr);
  const end = formatTimePart(endStr);
  return `${start} – ${end}`;
}
