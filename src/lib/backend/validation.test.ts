/**
 * Family Query Validation Tests
 *
 * The Families directory sends its filters as query-string parameters, so every
 * value arrives as a string. These tests cover the parsing rules that the
 * directory depends on, in particular the boolean filters where a naive coercion
 * silently inverts the user's choice.
 */

import { describe, it, expect } from "vitest";
import { familyQuerySchema, familyRelationshipTypeSchema } from "./validation";

/** Mimics how the route reads a URLSearchParams value: a string or undefined. */
function parse(params: Record<string, string | undefined>) {
  return familyQuerySchema.parse(params);
}

describe("familyQuerySchema", () => {
  it("parses hasChildren=false as false, not true", () => {
    // Regression guard. `z.coerce.boolean()` would turn the string "false" into
    // `true`, so the directory would return the childless families when the user
    // asked for the ones that have children.
    expect(parse({ hasChildren: "false" }).hasChildren).toBe(false);
    expect(parse({ hasPhoto: "false" }).hasPhoto).toBe(false);
  });

  it("parses the affirmative spellings as true", () => {
    expect(parse({ hasChildren: "true" }).hasChildren).toBe(true);
    expect(parse({ hasChildren: "1" }).hasChildren).toBe(true);
    expect(parse({ hasPhoto: "true" }).hasPhoto).toBe(true);
  });

  it("rejects a boolean that is not an explicit spelling", () => {
    // Better to reject than to guess: "yes" should not quietly mean true.
    expect(() => parse({ hasChildren: "yes" })).toThrow();
    expect(() => parse({ hasChildren: "" })).toThrow();
  });

  it("leaves an absent boolean undefined so the filter is not applied", () => {
    const result = parse({});
    expect(result.hasChildren).toBeUndefined();
    expect(result.hasPhoto).toBeUndefined();
  });

  it("parses numeric family size bounds", () => {
    const result = parse({ minSize: "2", maxSize: "6" });
    expect(result.minSize).toBe(2);
    expect(result.maxSize).toBe(6);
  });

  it("rejects a non-numeric or out-of-range size bound", () => {
    expect(() => parse({ minSize: "many" })).toThrow();
    expect(() => parse({ minSize: "0" })).toThrow();
    expect(() => parse({ maxSize: "1000" })).toThrow();
  });

  it("rejects a range where the minimum exceeds the maximum", () => {
    // Without this the user could type 5-2 and simply get an empty table with no
    // explanation.
    expect(() => parse({ minSize: "5", maxSize: "2" })).toThrow();
    expect(() => parse({ minSize: "3", maxSize: "3" })).not.toThrow();
  });

  it("accepts `other` as a relationship filter", () => {
    expect(parse({ relationshipType: "other" }).relationshipType).toBe("other");
  });

  it("rejects an unknown relationship filter", () => {
    expect(() => parse({ relationshipType: "cousin" })).toThrow();
  });

  it("accepts `other` in the relationship type enum", () => {
    expect(familyRelationshipTypeSchema.parse("other")).toBe("other");
  });
});
