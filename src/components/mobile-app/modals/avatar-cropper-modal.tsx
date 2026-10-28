"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "@/lib/i18n";
import { IconX, IconCheckCircle2 } from "../icons";

interface AvatarCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedDataUrl: string) => void;
}

export function AvatarCropperModal({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete,
}: AvatarCropperModalProps) {
  const { locale } = useTranslation();
  const isAr = locale === "ar";

  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const initialOffset = useRef({ x: 0, y: 0 });
  const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number } | null>(null);

  // Reset state when opening a new image
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });

      const img = new Image();
      img.onload = () => {
        setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = imageSrc;
    }
  }, [isOpen, imageSrc]);

  // Mouse / Touch Dragging
  const handlePointerDown = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStart.current = { x: clientX, y: clientY };
    initialOffset.current = { ...offset };
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const dx = clientX - dragStart.current.x;
    const dy = clientY - dragStart.current.y;
    setOffset({
      x: initialOffset.current.x + dx,
      y: initialOffset.current.y + dy,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Perform crop to square/circle on HTML5 Canvas
  const handleApplyCrop = useCallback(() => {
    if (!imageSrc) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const outputSize = 400; // 400x400 high-res avatar
      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const viewportSize = 220; // viewport dimension in CSS px
      const scaleMultiplier = outputSize / viewportSize;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outputSize, outputSize);

      ctx.save();
      // Move origin to center of canvas
      ctx.translate(outputSize / 2, outputSize / 2);
      ctx.rotate((rotation * Math.PI) / 180);

      // Translate according to user pan (scaled to output canvas)
      ctx.translate(offset.x * scaleMultiplier, offset.y * scaleMultiplier);

      // Scale
      const baseScale = Math.max(
        viewportSize / img.naturalWidth,
        viewportSize / img.naturalHeight
      );
      const finalScale = baseScale * zoom * scaleMultiplier;

      ctx.scale(finalScale, finalScale);
      ctx.drawImage(
        img,
        -img.naturalWidth / 2,
        -img.naturalHeight / 2,
        img.naturalWidth,
        img.naturalHeight
      );
      ctx.restore();

      // Convert to compressed jpeg data URL (high quality, low byte weight)
      const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.88);
      onCropComplete(croppedDataUrl);
      onClose();
    };
    img.src = imageSrc;
  }, [imageSrc, offset, zoom, rotation, onCropComplete, onClose]);

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm bg-slate-900 text-white rounded-[28px] overflow-hidden shadow-2xl border border-slate-800 flex flex-col animate-in zoom-in-95 duration-200"
        dir={isAr ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#B08D57]/20 text-[#E3C98F] flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-white">
              {isAr ? "تعديل وقص الصورة الشخصية" : "Crop Your Profile Photo"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        {/* Crop Viewport */}
        <div className="relative p-6 flex flex-col items-center justify-center bg-slate-950 select-none">
          <div
            ref={containerRef}
            className="w-[220px] h-[220px] rounded-full overflow-hidden relative cursor-move ring-4 ring-[#B08D57]/70 shadow-[0_0_30px_rgba(37,99,235,0.3)] bg-slate-900 touch-none flex items-center justify-center"
            onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
            onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={(e) => {
              if (e.touches[0]) handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onTouchMove={(e) => {
              if (e.touches[0]) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onTouchEnd={handlePointerUp}
          >
            {/* Image being manipulated */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt="Crop preview"
              draggable={false}
              className="max-w-none pointer-events-none transition-transform duration-75 origin-center"
              style={{
                width: imageNaturalSize ? `${220 * zoom}px` : "auto",
                transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg)`,
              }}
            />

            {/* Circular guideline grid */}
            <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-40">
              <div className="border-b border-r border-white/20" />
              <div className="border-b border-r border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-b border-r border-white/20" />
              <div className="border-b border-r border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-white/20" />
              <div className="border-r border-white/20" />
              <div />
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-3 text-center">
            {isAr
              ? "اسحب الصورة لتحريك الوجه داخل الدائرة"
              : "Drag to center your face inside the circle"}
          </p>
        </div>

        {/* Controls: Zoom & Rotate */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3.5">
          {/* Zoom Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
              <span>{isAr ? "تكبير الصورة" : "Zoom"}</span>
              <span className="text-[#E3C98F] font-mono">{zoom.toFixed(1)}x</span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
              >
                -
              </button>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#B08D57]"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {/* Quick Actions: Rotate 90 & Reset */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>{isAr ? "تدوير 90°" : "Rotate 90°"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setRotation(0);
                setOffset({ x: 0, y: 0 });
              }}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              {isAr ? "إعادة ضبط" : "Reset Position"}
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800/80 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
          >
            {isAr ? "إلغاء" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            className="flex-1 py-2.5 rounded-xl bg-[#132F4C] hover:bg-[#B08D57] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
          >
            <IconCheckCircle2 className="w-4 h-4" />
            <span>{isAr ? "اعتماد وقص الصورة" : "Apply & Crop"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
