/**
 * WhatsApp link builder
 *
 * The behaviour worth pinning down here is mostly about refusing to guess.
 *
 * `wa.me` needs a bare international number, and `Member.phone` is a free-form
 * column a church member typed themselves. The dangerous failure mode is not a
 * broken link — it is a *working* link that opens a conversation with the wrong
 * human, because a national number was completed with a guessed country code. So
 * the tests below are weighted towards the cases where the builder must decline
 * to produce a direct link.
 */

import { describe, it, expect } from "vitest";
import {
  buildWhatsAppLink,
  defaultWhatsAppAsk,
  resolveInternationalNumber,
} from "./whatsapp";

describe("resolveInternationalNumber", () => {
  it("keeps a formatted international number, stripped to digits", () => {
    expect(resolveInternationalNumber("+20 100 555 0134")).toBe("201005550134");
    expect(resolveInternationalNumber("+1 (415) 555-0134")).toBe("14155550134");
  });

  it("drops the 00 international access prefix", () => {
    // "0020..." and "+20..." are the same number; WhatsApp wants it without either.
    expect(resolveInternationalNumber("00201005550134")).toBe("201005550134");
  });

  it("declines a national number with a trunk zero rather than guessing a country", () => {
    // The digits after the zero are meaningless on their own: they resolve to a
    // different person in every country. Returning null is the whole point.
    expect(resolveInternationalNumber("01005550134")).toBeNull();
    expect(resolveInternationalNumber("+0 100 555 0134")).toBeNull();
  });

  it("accepts a national-format number that already carries a country code", () => {
    // No leading zero, so the first digits are the country code.
    expect(resolveInternationalNumber("201005550134")).toBe("201005550134");
  });

  it("rejects lengths that cannot be a real phone number", () => {
    expect(resolveInternationalNumber("12345")).toBeNull(); // too short
    expect(resolveInternationalNumber("1234567890123456")).toBeNull(); // beyond E.164
  });

  it("rejects empty and non-numeric input", () => {
    expect(resolveInternationalNumber("")).toBeNull();
    expect(resolveInternationalNumber(null)).toBeNull();
    expect(resolveInternationalNumber(undefined)).toBeNull();
    expect(resolveInternationalNumber("not a phone")).toBeNull();
    expect(resolveInternationalNumber("+")).toBeNull();
  });
});

describe("buildWhatsAppLink", () => {
  it("opens the chat directly when the number is international", () => {
    const result = buildWhatsAppLink({ phone: "+20 100 555 0134", message: "Hello" });
    expect(result).toEqual({
      ok: true,
      url: "https://wa.me/201005550134?text=Hello",
      mode: "direct",
      digits: "201005550134",
    });
  });

  it("falls back to contact picking for a national number", () => {
    const result = buildWhatsAppLink({ phone: "01005550134", message: "Hello" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected a usable result");
    // No chat is opened, because we cannot know whose it is. The text is still
    // handed over so the staff member only has to pick the contact.
    expect(result.mode).toBe("choose_contact");
    expect(result.digits).toBeNull();
    expect(result.url).toBe("https://wa.me/?text=Hello");
  });

  it("reports a missing phone distinctly from an unusable one", () => {
    // The UI shows a missing phone as a missing detail and an unusable one as
    // "pick the contact", so collapsing them would lose that distinction.
    expect(buildWhatsAppLink({ phone: null, message: "Hi" })).toEqual({
      ok: false,
      reason: "no_phone",
    });
    expect(buildWhatsAppLink({ phone: "   ", message: "Hi" })).toEqual({
      ok: false,
      reason: "no_phone",
    });
    expect(buildWhatsAppLink({ message: "Hi" })).toEqual({ ok: false, reason: "no_phone" });
  });

  it("encodes the message rather than concatenating it", () => {
    const result = buildWhatsAppLink({
      phone: "+201005550134",
      message: "Can you help with guitar? Yes & maybe 100%",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected a usable result");
    // A raw space or ampersand here would truncate the text or inject a
    // parameter into the URL.
    expect(result.url).toContain("Can%20you%20help%20with%20guitar%3F%20Yes%20%26%20maybe");
    expect(result.url).not.toContain(" ");
  });

  it("omits the text parameter when there is nothing to pre-write", () => {
    const result = buildWhatsAppLink({ phone: "+201005550134", message: "   " });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected a usable result");
    expect(result.url).toBe("https://wa.me/201005550134");
  });
});

describe("defaultWhatsAppAsk", () => {
  it("names the person and the skill being asked about", () => {
    const text = defaultWhatsAppAsk({ firstName: "Amina", skill: "Guitar" });
    expect(text).toContain("Hello Amina");
    expect(text).toContain("Guitar");
    expect(text).toMatch(/willing to help/i);
  });

  it("omits the skill clause cleanly when there is no specific skill", () => {
    const text = defaultWhatsAppAsk({ firstName: "Amina" });
    expect(text).toContain("Hello Amina");
    expect(text).not.toContain("undefined");
  });

  it("names the church when one is given", () => {
    expect(defaultWhatsAppAsk({ firstName: "A", churchName: "Grace Church" })).toContain(
      "Grace Church",
    );
  });
});
