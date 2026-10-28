import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");

const globalsCss = read("src/app/globals.css");
const primitivesSrc = read("src/components/mobile-app/primitives.tsx");
const homeScreenSrc = read("src/components/mobile-app/screens/home-screen.tsx");

describe("Check In attention flash", () => {
  it("defines the flash keyframes and applies them to an overlay", () => {
    expect(globalsCss).toContain(".action-flash {");
    expect(globalsCss).toContain("@keyframes action-flash {");
    expect(globalsCss).toContain(".action-flash-badge {");
    // Rendered on a dedicated overlay so the tile's Tailwind `ring`
    // (implemented with box-shadow) is not overwritten.
    expect(primitivesSrc).toContain('className={`action-flash pointer-events-none absolute inset-0');
  });

  it("flashes below the 3 Hz photosensitivity threshold", () => {
    const m = globalsCss.match(
      /\.action-flash\s*\{[^}]*animation:\s*action-flash\s+([\d.]+)s/,
    );
    expect(m, "action-flash animation duration not found").not.toBeNull();
    const seconds = Number(m![1]);
    // IEC 60601-1-10: no more than 3 flashes per second.
    expect(seconds).toBeGreaterThan(1 / 3);
    // Slow enough to feel deliberate rather than frantic.
    expect(seconds).toBeGreaterThanOrEqual(1);
  });

  it("is disabled under prefers-reduced-motion", () => {
    const at = globalsCss.indexOf("@media (prefers-reduced-motion: reduce)");
    expect(at, "reduced-motion media query missing").toBeGreaterThan(-1);
    const block = globalsCss.slice(at);
    // Guard must neutralise infinite animations, not just transitions.
    expect(block).toContain("animation-duration");
    expect(block).toContain("animation-iteration-count");
    expect(block).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
    expect(block).toMatch(/animation-iteration-count:\s*1\s*!important/);
  });

  it("is exposed as an ActionTile prop", () => {
    expect(primitivesSrc).toContain("attention?: boolean;");
    expect(primitivesSrc).toContain("attention = false,");
    expect(primitivesSrc).toContain("aria-hidden=\"true\"");
  });

  it("flashes only while the member has not checked in", () => {
    const match = homeScreenSrc.match(
      /title=\{locale === "ar" \? "تسجيل الحضور" : "Check In"\}[\s\S]{0,300}?attention=\{([^}]+)\}/,
    );
    expect(match, "Check In ActionTile attention prop not found").not.toBeNull();
    expect(match![1]).toBe("!isCheckedIn");
  });
});
