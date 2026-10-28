/**
 * WhatsApp link preparation
 *
 * Turns a member's saved phone number into a link that opens WhatsApp with the
 * message already written.
 *
 * ─── Why this is a module and not a template string ─────────
 *
 * `wa.me` needs a bare international number: digits only, no `+`, no spaces, no
 * dashes. `Member.phone` is a free-form `VarChar(20)` that a church member typed
 * themselves, so in practice it is one of:
 *
 *   "+20 100 555 0134"   international, formatted
 *   "00201005550134"     international, 00 prefix
 *   "01005550134"        national, leading trunk zero
 *   "100 555 0134"       national, no trunk zero
 *
 * Only the first two can be turned into a direct chat link with confidence. A
 * national number is ambiguous — the same digits mean different people in
 * different countries, and guessing the country code would open a stranger's
 * chat. So a national number deliberately falls back to WhatsApp's contact
 * picker, and the UI says so.
 *
 * ─── No secrets, by design ───────────────────────────────────
 *
 * This is a `wa.me` deep link: the text is handed to WhatsApp on the *sender's
 * own device* and WhatsApp reports nothing back. There is no API key, no
 * account, no cost, and no delivery receipt. That also means we cannot record
 * that a message was delivered — only that a request was raised, which is why
 * `channel: "whatsapp"` rows are labelled as requests and not as receipts.
 *
 * `WhatsAppLinkBuilder` is an interface so a real provider (WhatsApp Business
 * Cloud API) can be introduced later without the UI having to change. See
 * `LinkResult.mode` for the one behavioural difference the UI must keep
 * respecting.
 */

import type { WhatsAppLinkResult } from "../backend/types";

/** E.164 allows at most 15 digits. Longer input is a typo, not a phone number. */
const MAX_INTERNATIONAL_DIGITS = 15;

/**
 * Below this a number cannot be a real phone number in any country we support.
 * 7 is the shortest plausible international number; treating a shorter value as
 * valid would produce a `wa.me` link that WhatsApp simply cannot resolve.
 */
const MIN_PLAUSIBLE_DIGITS = 7;

/**
 * Only digits survive.
 *
 * This is deliberately aggressive: WhatsApp rejects a malformed link outright,
 * so stripping punctuation is strictly better than passing it through and
 * letting the user hit an error screen. Anything non-numeric is a separator as
 * far as this module is concerned.
 */
function toDigits(raw: string): string {
  return raw.replace(/\D+/g, "");
}

/**
 * Interpret a stored phone value as an international number, if we safely can.
 *
 * Returns null when the value cannot be resolved with confidence — see the
 * module header for the cases. The check is conservative on purpose: a false
 * negative costs the user one extra tap in a contact picker, whereas a false
 * positive opens a conversation with the wrong human.
 */
export function resolveInternationalNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let digits = toDigits(raw);
  if (digits.length === 0) return null;

  // "0020..." is the international access prefix. WhatsApp wants it as "+20...",
  // so the `00` is dropped here rather than becoming part of the number.
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    // A leading zero is a national trunk prefix, which means the number does NOT
    // carry its own country code. We cannot know which country to prepend, so we
    // decline rather than guess.
    return null;
  }

  if (digits.length < MIN_PLAUSIBLE_DIGITS) return null;
  if (digits.length > MAX_INTERNATIONAL_DIGITS) return null;

  return digits;
}

/** Shared text hand-off used by both modes. */
function shareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Build a WhatsApp link for a member.
 *
 * @param phone  The member's stored phone value, as typed by whoever entered it.
 * @param message  The text to pre-write. Encoded, never interpolated raw.
 */
export function buildWhatsAppLink(params: {
  phone?: string | null;
  message: string;
}): WhatsAppLinkResult {
  const { phone, message } = params;

  if (phone === null || phone === undefined || phone.trim() === "") {
    return { ok: false, reason: "no_phone" };
  }

  const digits = resolveInternationalNumber(phone);
  const text = message.trim();

  if (digits === null) {
    // The number exists but is national, or too short/long to be trustworthy.
    // Hand over the text and let a human pick the right contact.
    return { ok: true, url: shareUrl(text), mode: "choose_contact", digits: null };
  }

  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return { ok: true, url: `https://wa.me/${digits}${query}`, mode: "direct", digits };
}

/**
 * The default text for asking a member about a skill they have listed.
 *
 * Kept next to the link builder because the phrasing is part of the contract
 * with the person receiving it, and because it is the one string both the
 * directory card and the message composer must agree on.
 */
export function defaultWhatsAppAsk(params: {
  firstName: string;
  skill?: string | null;
  churchName?: string | null;
}): string {
  const who = params.firstName?.trim() || "there";
  const about = params.skill?.trim();

  const parts = [
    `Hello ${who},`,
    about
      ? `we are looking for someone who can help with ${about} and saw that you listed it.`
      : "we are looking for someone who can help with a church need and saw your profile.",
  ];

  if (params.churchName?.trim()) {
    parts.push(`This is from ${params.churchName.trim()}.`);
  }

  parts.push("Would you be willing to help? Please let us know. Thank you!");
  return parts.join(" ");
}

/**
 * The interface a future real provider would implement.
 *
 * Not used by any current code path beyond documentation of intent — it exists
 * so the choice of a deep link is recorded as a decision rather than an
 * accident, and so swapping in the Cloud API is a contained change.
 */
export interface WhatsAppLinkBuilder {
  prepare(params: { phone?: string | null; message: string }): Promise<WhatsAppLinkResult>;
}

export const waMeLinkBuilder: WhatsAppLinkBuilder = {
  async prepare(params) {
    return buildWhatsAppLink(params);
  },
};
