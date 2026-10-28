"use client";

import React from "react";

import {
  ACCENTS,
  elevation,
  shape,
  type,
  type AccentColor,
  type AccentStyle,
} from "./theme";

export type { AccentColor, AccentStyle };
export { ACCENTS };

// ─── 1. IconBadge ──────────────────────────────────────────────────
export interface IconBadgeProps {
  icon: React.ComponentType<{ className?: string }>;
  accent?: AccentColor;
  size?: "sm" | "md" | "lg";
  className?: string;
  iconClassName?: string;
}

export function IconBadge({
  icon: Icon,
  accent = "blue",
  size = "md",
  className = "",
  iconClassName = "",
}: IconBadgeProps) {
  const styles = ACCENTS[accent];
  const sizeClasses = {
    sm: "w-9 h-9 rounded-[13px]",
    md: "w-11 h-11 rounded-[15px]",
    lg: "w-12 h-12 rounded-2xl",
  }[size];

  const iconSizes = {
    sm: "w-[18px] h-[18px]",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  }[size];

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 ${styles.bg} ${styles.text} ring-1 ring-inset ${styles.ring} ${sizeClasses} ${className}`}
    >
      <Icon className={`${iconSizes} stroke-[1.9] ${iconClassName}`} />
    </div>
  );
}

// ─── 2. SectionHeader ──────────────────────────────────────────────
export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: AccentColor;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  action,
  className = "",
}: SectionHeaderProps) {
  return (
    <div className={`flex items-end justify-between gap-3 mb-3 ${className}`}>
      <div className="min-w-0">
        <h3 className={`${type.section} text-[#132F4C] truncate`}>{title}</h3>
        {subtitle && (
          <p className={`${type.caption} text-[#6F6650] truncate mt-0.5`}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0 pb-0.5">{action}</div>}
    </div>
  );
}

// ─── 3. MobileSection ──────────────────────────────────────────────
export interface MobileSectionProps {
  children: React.ReactNode;
  variant?: "plain" | "grouped" | "elevated" | "tinted";
  accent?: AccentColor;
  className?: string;
}

export function MobileSection({
  children,
  variant = "grouped",
  accent = "blue",
  className = "",
}: MobileSectionProps) {
  const styles = ACCENTS[accent];
  const variantStyles = {
    plain: "space-y-3",
    grouped: `rounded-[20px] bg-white ring-1 ring-inset ring-[#EAE3D6] ${elevation.soft} p-4 space-y-3`,
    elevated: `rounded-[20px] bg-white ring-1 ring-inset ring-[#EAE3D6] ${elevation.card} p-5 space-y-3`,
    tinted: `rounded-[20px] ${styles.bg} ring-1 ring-inset ${styles.ring} p-4 space-y-3`,
  }[variant];

  return <section className={`${variantStyles} ${className}`}>{children}</section>;
}

// ─── 4. ActionTile ─────────────────────────────────────────────────
export interface ActionTileProps {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: AccentColor;
  onClick: () => void;
  /**
   * Draws persistent attention with a pulsing flash + icon bounce until the
   * action is completed. Disabled automatically for assistive technologies
   * via the global `prefers-reduced-motion` rule in globals.css.
   */
  attention?: boolean;
  className?: string;
}

/**
 * Quick-action tile. The whole tile carries the pastel fill (not a white card
 * with a pastel chip), matching the reference showcase. The glyph sits in a
 * deeper tint of the same accent so it reads as one object.
 */
export function ActionTile({
  title,
  icon: Icon,
  accent = "blue",
  onClick,
  attention = false,
  className = "",
}: ActionTileProps) {
  const styles = ACCENTS[accent];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative group flex flex-col items-center justify-center gap-2.5 ${shape.tile} ${styles.bg} backdrop-blur-md ring-1 ring-inset ${styles.ring} px-2 py-4 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.96] transition-all duration-200 cursor-pointer ${className}`}
    >
      {attention && (
        <span
          aria-hidden="true"
          className={`action-flash pointer-events-none absolute inset-0 ${shape.tile}`}
        />
      )}
      <div
        className={`relative w-11 h-11 ${styles.deep} ring-1 ring-inset ${styles.ring} rounded-[14px] flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-active:scale-95 shadow-xs ${
          attention ? "action-flash-badge" : ""
        }`}
      >
        <Icon className="w-[22px] h-[22px] stroke-[1.9]" />
      </div>
      <span className={`${type.caption} font-semibold text-[#132F4C] leading-tight text-center px-1`}>
        {title}
      </span>
    </button>
  );
}

// ─── 5. PhotoCard ───────────────────────────────────────────────────
export interface PhotoCardProps {
  /** Absolute path to a bundled image, or undefined to use the gradient. */
  src?: string | null;
  alt?: string;
  /** Scrim gradient overlay for legible white type. */
  scrim?: boolean;
  children?: React.ReactNode;
  className?: string;
  /** Aspect ratio utility class, e.g. "aspect-[4/3]". */
  ratio?: string;
  /** Optional CSS background laid over the scrim (used for seasonal tints). */
  tint?: string;
}

/**
 * Hero / event image container. Renders a bundled photo when `src` is given,
 * otherwise a premium gradient placeholder — so the app always looks finished
 * even with no photography on disk. Never issues a network request for the
 * fallback, which keeps it working offline inside the Android WebView.
 */
export function PhotoCard({
  src,
  alt = "",
  scrim = true,
  children,
  className = "",
  ratio = "aspect-[4/3]",
  tint,
}: PhotoCardProps) {
  return (
    <div
      className={`relative overflow-hidden ${shape.card} bg-[linear-gradient(140deg,#1B3A5C_0%,#2A5580_48%,#3E6B96_100%)] ${ratio} ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : null}
      {scrim && (
        <div
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,20,36,0.12)_0%,rgba(9,20,36,0.52)_50%,rgba(9,20,36,0.85)_100%)]"
          aria-hidden="true"
        />
      )}
      {tint && (
        <div className="absolute inset-0" style={{ background: tint }} aria-hidden="true" />
      )}
      {children && <div className="absolute inset-0 flex flex-col justify-end p-4">{children}</div>}
    </div>
  );
}

// ─── 6. Skeleton loaders ────────────────────────────────────────────
/** A single shimmering placeholder block (cream by day, navy by night). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`mobile-skeleton rounded-[12px] ${className}`} />;
}

/**
 * Placeholder rows shown while a list loads, in place of "Loading…" text.
 * `compact` drops the card chrome for use inside an existing card.
 */
export function SkeletonRows({
  count = 3,
  compact = false,
}: {
  count?: number;
  compact?: boolean;
}) {
  return (
    <div role="status" aria-busy="true" className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`flex items-center gap-3 ${
            compact
              ? ""
              : "p-3 rounded-[20px] bg-white ring-1 ring-inset ring-[#EAE3D6]"
          }`}
        >
          <Skeleton className="w-12 h-12 shrink-0 !rounded-[14px]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 7. EmptyState ──────────────────────────────────────────────────
/**
 * Friendly "nothing here yet" block: an icon, a warm line, one sentence of
 * what to expect, and optionally one button that does something useful.
 * `bare` drops the card chrome for use inside an existing card.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  bare = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  bare?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2.5 text-center px-6 ${
        bare ? "py-6" : "py-8 rounded-[20px] bg-white ring-1 ring-inset ring-[#EAE3D6]"
      }`}
    >
      <div className="w-12 h-12 rounded-2xl bg-[#F5EEDF] text-[#8A6A35] flex items-center justify-center">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="font-serif text-[15px] text-[#132F4C] leading-snug">{title}</h4>
      {description && (
        <p className="text-[12px] text-[#6F6650] max-w-[270px] leading-relaxed">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-1 px-4 py-2 rounded-full bg-[#132F4C] text-[#F3E7CF] text-[12px] font-semibold active:scale-95 transition-transform"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
