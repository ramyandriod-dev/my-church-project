import { describe, it, expect } from "vitest";
import { validateEmailAddress } from "./email-validator";

describe("Email & Domain Validation Utility", () => {
  describe("Typo domain prevention (e.g. gmil.com -> gmail.com)", () => {
    it("rejects jane.doe@gmil.com and provides suggestion jane.doe@gmail.com", () => {
      const res = validateEmailAddress("jane.doe@gmil.com");
      expect(res.isValid).toBe(false);
      expect(res.suggestedEmail).toBe("jane.doe@gmail.com");
      expect(res.error).toContain("Did you mean '@gmail.com'?");
    });

    it("rejects various common Gmail misspellings", () => {
      const typos = [
        "john@gmaill.com",
        "john@gmai.com",
        "john@gamil.com",
        "john@gmial.com",
        "john@gmeil.com",
        "john@gmail.con",
        "john@gmail.co",
        "john@g-mail.com",
        "john@gmail.cmo",
      ];

      for (const email of typos) {
        const res = validateEmailAddress(email);
        expect(res.isValid).toBe(false);
        expect(res.suggestedEmail).toBe("john@gmail.com");
      }
    });

    it("rejects Hotmail and Yahoo domain typos", () => {
      const hotmailRes = validateEmailAddress("user@hotmial.com");
      expect(hotmailRes.isValid).toBe(false);
      expect(hotmailRes.suggestedEmail).toBe("user@hotmail.com");

      const yahooRes = validateEmailAddress("user@yaho.com");
      expect(yahooRes.isValid).toBe(false);
      expect(yahooRes.suggestedEmail).toBe("user@yahoo.com");
    });
  });

  describe("Disposable & Fake email prevention", () => {
    it("rejects disposable email domains", () => {
      const disposable = [
        "fake@mailinator.com",
        "temp@tempmail.com",
        "user@10minutemail.com",
        "test@yopmail.com",
        "anon@guerrillamail.com",
      ];

      for (const email of disposable) {
        const res = validateEmailAddress(email);
        expect(res.isValid).toBe(false);
        expect(res.error).toContain("disposable");
      }
    });

    it("rejects placeholder domains when allowTestDomains is false", () => {
      const res = validateEmailAddress("user@fake.com", { allowTestDomains: false });
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("Placeholder and fake email");
    });
  });

  describe("Legitimate email acceptance", () => {
    it("accepts valid Gmail and major domain addresses", () => {
      const validEmails = [
        "jane.doe@gmail.com",
        "john.doe@gmail.com",
        "pastor.john@grace.community",
        "member@hotmail.com",
        "service@yahoo.com",
        "believer@icloud.com",
      ];

      for (const email of validEmails) {
        const res = validateEmailAddress(email);
        expect(res.isValid).toBe(true);
        expect(res.error).toBeUndefined();
      }
    });
  });
});
