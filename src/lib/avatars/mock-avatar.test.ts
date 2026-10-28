import { describe, it, expect } from "vitest";
import { mockAvatar, mockPortrait } from "./mock-avatar";

const decode = (uri: string) => decodeURIComponent(uri.replace("data:image/svg+xml;utf8,", ""));

describe("mockAvatar", () => {
  it("is a valid SVG data URI", () => {
    const uri = mockAvatar("Mina Samir");
    expect(uri.startsWith("data:image/svg+xml;utf8,")).toBe(true);
    const svg = decode(uri);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("is deterministic for a seed and varies between seeds", () => {
    expect(mockAvatar("Mina Samir")).toBe(mockAvatar("Mina Samir"));
    const seeds = ["Mina Samir", "Sara Adel", "Peter Fawzy", "Mariam Nabil", "John Tadros", "Ruth Gamal"];
    const unique = new Set(seeds.map(mockAvatar));
    expect(unique.size).toBe(seeds.length);
  });

  it("copes with an empty seed", () => {
    expect(mockAvatar("   ")).toContain("data:image/svg+xml");
  });
});

describe("mockPortrait", () => {
  it("draws one person per seed, up to the maximum", () => {
    const svg = decode(mockPortrait("fam-1", ["a", "b", "c"]));
    expect((svg.match(/<ellipse/g) || []).length).toBe(3);
    const many = decode(mockPortrait("grp", ["a", "b", "c", "d", "e", "f", "g", "h"]));
    expect((many.match(/<ellipse/g) || []).length).toBe(6);
  });

  it("still produces a group photo when there are no members yet", () => {
    const svg = decode(mockPortrait("empty-group"));
    expect((svg.match(/<ellipse/g) || []).length).toBe(4);
  });

  it("is deterministic", () => {
    expect(mockPortrait("g", ["a", "b"])).toBe(mockPortrait("g", ["a", "b"]));
  });
});
