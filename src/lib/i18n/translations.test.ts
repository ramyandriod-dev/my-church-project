/**
 * Navigation Translation Tests
 *
 * The sidebar renders a label purely by looking up a `nav.*` key in the
 * dictionary for the active locale. A key that exists in one language but not
 * the other is therefore invisible in development (the sidebar just shows a
 * fallback) and shows up in production as a blank or English label in the
 * other language.
 *
 * These tests check the Families key in both dictionaries, and that the two
 * `nav` blocks stay in step.
 */

import { describe, it, expect } from "vitest";
import { translations } from "@/lib/i18n/translations";

describe("navigation translations", () => {
  it("defines nav.families in both locales", () => {
    expect(translations.ar.nav.families).toBe("الأسر");
    expect(translations.en.nav.families).toBe("Families");
  });

  it("keeps the ar and en nav blocks in step", () => {
    const arKeys = Object.keys(translations.ar.nav).sort();
    const enKeys = Object.keys(translations.en.nav).sort();
    expect(enKeys).toEqual(arKeys);
  });

  it("does not leave a blank label in either locale", () => {
    for (const [locale, dict] of Object.entries(translations)) {
      for (const [key, value] of Object.entries(dict.nav)) {
        expect(
          typeof value === "string" && value.trim().length > 0,
          `nav.${key} is empty in ${locale}`,
        ).toBe(true);
      }
    }
  });
});
