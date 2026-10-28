"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { IconX } from "../icons";

interface VerseShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  arabic: string;
  english: string;
  /** Reference in Arabic, e.g. "مزمور ١٢٦:٥-٦". */
  refAr: string;
  /** Reference in English, e.g. "Psalm 126:5-6". */
  refEn: string;
  /** Background photo path (same-origin), or null for the navy gradient. */
  image?: string | null;
  /** Accent colour for the church name and rule (seasons can recolour it). */
  accent?: string;
}

type ShareLang = "ar" | "en" | "both";

const CARD_W = 360;
const CARD_H = 450;
const PREVIEW_SCALE = 0.8;

const CHURCH_AR = "كنيسة مصر الجديدة الإنجيلية";
const CHURCH_EN = "Heliopolis Evangelical Church";

/** Pick a type size that keeps long verses inside the card. */
function sizeFor(total: number, both: boolean): number {
  const steps = both
    ? [
        [90, 22],
        [160, 19],
        [240, 16],
        [Infinity, 14],
      ]
    : [
        [70, 28],
        [120, 24],
        [190, 21],
        [Infinity, 18],
      ];
  for (const [limit, size] of steps) if (total <= limit) return size;
  return 18;
}

/**
 * Bottom sheet that turns today's verse into a picture to send on WhatsApp.
 *
 * The card is drawn with plain inline styles (no theme classes) so it looks the
 * same in light and dark mode and in the exported image. Sharing uses the
 * phone's share sheet when it can send files; otherwise the image can be
 * downloaded, or the verse text copied or sent straight to WhatsApp.
 */
export function VerseShareSheet({
  isOpen,
  onClose,
  arabic,
  english,
  refAr,
  refEn,
  image,
  accent = "#E3C98F",
}: VerseShareSheetProps) {
  const { locale } = useTranslation();
  const isAr = locale === "ar";
  const cardRef = useRef<HTMLDivElement>(null);
  const [lang, setLang] = useState<ShareLang>("ar");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLang("ar");
      setNote(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showAr = lang === "ar" || lang === "both";
  const showEn = lang === "en" || lang === "both";
  const both = lang === "both";
  const total = (showAr ? arabic.length : 0) + (showEn ? english.length : 0);
  const arSize = sizeFor(total, both);
  const enSize = both ? arSize - 3 : arSize - 2;

  const refLine = both ? `${refAr}  ·  ${refEn}` : showAr ? refAr : refEn;
  const churchLine = lang === "en" ? CHURCH_EN : lang === "ar" ? CHURCH_AR : `${CHURCH_AR} · ${CHURCH_EN}`;

  const caption = [
    showAr ? arabic : null,
    showEn ? english : null,
    `— ${both ? `${refAr} · ${refEn}` : showAr ? refAr : refEn}`,
    "",
    lang === "en" ? CHURCH_EN : CHURCH_AR,
  ]
    .filter((l) => l !== null)
    .join("\n");

  async function renderBlob(): Promise<Blob> {
    const node = cardRef.current;
    if (!node) throw new Error("Card not ready");
    const { toBlob } = await import("html-to-image");
    const blob = await toBlob(node, {
      pixelRatio: 3, // 1080 x 1350: crisp on WhatsApp
      cacheBust: true,
      skipFonts: true,
      width: CARD_W,
      height: CARD_H,
      style: { transform: "none" },
    });
    if (!blob) throw new Error("Could not create the image");
    return blob;
  }

  function download(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "verse-of-the-day.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  /** The Android app's native bridge, when running inside the APK. */
  function nativeBridge():
    | { shareImage?: (base64: string, text: string, pkg: string) => void }
    | undefined {
    return (window as unknown as { AndroidAuthBridge?: { shareImage?: (b: string, t: string, p: string) => void } })
      .AndroidAuthBridge;
  }

  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(String(r.result).split(",")[1] ?? "");
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  }

  /** Send the card through the native app. Returns false if this app has no bridge. */
  async function shareNatively(pkg: string): Promise<boolean> {
    const bridge = nativeBridge();
    if (!bridge?.shareImage) return false;
    const blob = await renderBlob();
    bridge.shareImage(await blobToBase64(blob), caption, pkg);
    return true;
  }

  async function handleWhatsApp() {
    setBusy(true);
    setNote(null);
    try {
      if (await shareNatively("com.whatsapp")) return;
      const blob = await renderBlob();
      const file = new File([blob], "verse-of-the-day.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], text: caption });
      } else {
        // No way to attach a picture here: send the text, and keep the image for saving.
        window.open(whatsappHref, "_blank", "noopener,noreferrer");
        setNote(
          isAr
            ? "تم فتح واتساب بالنص. لإرسال الصورة، حدّث التطبيق إلى أحدث نسخة."
            : "Opened WhatsApp with the text. To send the picture, update to the latest app version.",
        );
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setNote(isAr ? "تعذر مشاركة الصورة." : "Couldn't share the image.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    setBusy(true);
    setNote(null);
    try {
      if (await shareNatively("")) return;
      const blob = await renderBlob();
      const file = new File([blob], "verse-of-the-day.png", { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], text: caption });
      } else {
        download(blob);
        setNote(
          isAr
            ? "تم حفظ الصورة. أرفقها في واتساب أو أي تطبيق."
            : "Image saved. Attach it in WhatsApp or any app."
        );
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setNote(isAr ? "تعذر إنشاء الصورة. جرّب نسخ النص." : "Couldn't make the image. Try copying the text.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload() {
    setBusy(true);
    setNote(null);
    try {
      download(await renderBlob());
      setNote(isAr ? "تم حفظ الصورة." : "Image saved.");
    } catch {
      setNote(isAr ? "تعذر إنشاء الصورة." : "Couldn't make the image.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(caption);
      setNote(isAr ? "تم نسخ الآية." : "Verse copied.");
    } catch {
      setNote(isAr ? "تعذر النسخ." : "Couldn't copy.");
    }
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(caption)}`;

  const langOptions: Array<[ShareLang, string]> = [
    ["ar", "العربية"],
    ["en", "English"],
    ["both", isAr ? "الاثنان" : "Both"],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl overflow-y-auto max-h-[92vh] animate-in slide-in-from-bottom duration-300"
        role="dialog"
        aria-modal="true"
        aria-label={isAr ? "مشاركة الآية" : "Share the verse"}
        dir={isAr ? "rtl" : "ltr"}
      >
        <div className="px-5 pt-4 pb-3 flex items-center justify-between">
          <h2 className="font-serif text-lg text-[#132F4C]">
            {isAr ? "شارك آية اليوم" : "Share today's verse"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center active:scale-95"
            aria-label={isAr ? "إغلاق" : "Close"}
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        {/* Language choice */}
        <div role="radiogroup" className="px-5 grid grid-cols-3 gap-1.5" dir="ltr">
          {langOptions.map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={lang === value}
              onClick={() => setLang(value)}
              className={`py-2 rounded-xl text-[12px] font-semibold ring-1 ring-inset transition-all active:scale-95 ${
                lang === value
                  ? "bg-[#132F4C] text-[#F3E7CF] ring-[#132F4C]"
                  : "bg-[#FBF8F3] text-[#6F6650] ring-[#EAE3D6]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Preview (the real card is captured at full size) */}
        <div className="px-5 pt-4 flex justify-center" dir="ltr">
          <div style={{ width: CARD_W * PREVIEW_SCALE, height: CARD_H * PREVIEW_SCALE }}>
            <div style={{ transform: `scale(${PREVIEW_SCALE})`, transformOrigin: "top left", width: CARD_W, height: CARD_H }}>
              <div
                ref={cardRef}
                style={{
                  width: CARD_W,
                  height: CARD_H,
                  position: "relative",
                  overflow: "hidden",
                  background: "linear-gradient(140deg,#1B3A5C 0%,#2A5580 48%,#3E6B96 100%)",
                  fontFamily: 'Georgia, "Times New Roman", "Noto Naskh Arabic", serif',
                }}
              >
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image}
                    alt=""
                    crossOrigin="anonymous"
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : null}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(180deg,rgba(9,20,36,0.38) 0%,rgba(9,20,36,0.64) 45%,rgba(9,20,36,0.9) 100%)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    padding: "34px 30px 28px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      letterSpacing: lang === "ar" ? 0 : "0.18em",
                      textTransform: lang === "ar" ? "none" : "uppercase",
                      color: accent,
                      textAlign: "center",
                      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
                      fontWeight: 600,
                    }}
                  >
                    {churchLine}
                  </div>

                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 16 }}>
                    {showAr && (
                      <p
                        dir="rtl"
                        lang="ar"
                        style={{ margin: 0, color: "#FFFFFF", fontSize: arSize, lineHeight: 1.75, textAlign: "center" }}
                      >
                        {arabic}
                      </p>
                    )}
                    {showEn && (
                      <p
                        dir="ltr"
                        lang="en"
                        style={{
                          margin: 0,
                          color: showAr ? "#F3E7CF" : "#FFFFFF",
                          fontSize: enSize,
                          lineHeight: 1.4,
                          textAlign: "center",
                          fontStyle: "italic",
                        }}
                      >
                        {english}
                      </p>
                    )}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                      <span style={{ width: 28, height: 1, background: accent, display: "inline-block" }} />
                      <span
                        style={{
                          color: accent,
                          fontSize: 13,
                          fontWeight: 600,
                          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
                        }}
                      >
                        {refLine}
                      </span>
                      <span style={{ width: 28, height: 1, background: accent, display: "inline-block" }} />
                    </div>
                  </div>

                  <div
                    style={{
                      textAlign: "center",
                      fontSize: 10,
                      color: "#C9D3E0",
                      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
                    }}
                  >
                    {lang === "en" ? "Verse of the Day" : lang === "ar" ? "آية اليوم" : "آية اليوم · Verse of the Day"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-2.5">
          <button
            type="button"
            onClick={handleShare}
            disabled={busy}
            className="w-full py-3 rounded-xl bg-[#132F4C] text-[#F3E7CF] font-semibold text-sm disabled:opacity-60 active:scale-[0.99] transition-transform"
          >
            {busy ? (isAr ? "جارٍ التجهيز…" : "Preparing…") : isAr ? "مشاركة الصورة" : "Share image"}
          </button>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={busy}
              className="py-2.5 rounded-xl bg-[#FBF8F3] ring-1 ring-inset ring-[#EAE3D6] text-[12px] font-semibold text-[#6F6650] active:scale-95 transition-transform disabled:opacity-60"
            >
              {isAr ? "حفظ" : "Save"}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="py-2.5 rounded-xl bg-[#FBF8F3] ring-1 ring-inset ring-[#EAE3D6] text-[12px] font-semibold text-[#6F6650] active:scale-95 transition-transform"
            >
              {isAr ? "نسخ النص" : "Copy text"}
            </button>
            <button
              type="button"
              onClick={handleWhatsApp}
              disabled={busy}
              className="py-2.5 rounded-xl bg-[#FBF8F3] ring-1 ring-inset ring-[#EAE3D6] text-[12px] font-semibold text-[#6F6650] text-center active:scale-95 transition-transform disabled:opacity-60"
            >
              {isAr ? "واتساب (صورة)" : "WhatsApp (image)"}
            </button>
          </div>
          {note && (
            <p role="status" className="text-center text-[12px] font-medium text-[#8A6A35]">
              {note}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
