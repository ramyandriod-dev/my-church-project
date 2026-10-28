import { describe, it, expect } from "vitest";
import { translations } from "@/lib/i18n/translations";
import {
  MOCK_MEMBER_PROFILE,
  MOCK_NEXT_SERVICE,
  MOCK_EVENTS,
} from "@/lib/mobile-app/mock-data";

describe("Mobile UI Refinement - Evangelical Church Content & Data Integrity", () => {
  it("provides symmetrical mobileApp translations with Evangelical church identity", () => {
    const arKeys = Object.keys(translations.ar.mobileApp).sort();
    const enKeys = Object.keys(translations.en.mobileApp).sort();

    expect(arKeys).toEqual(enKeys);
    expect(arKeys.length).toBeGreaterThan(30);

    // Church Name
    expect(translations.ar.mobileApp.churchDefaultName).toBe("كنيسة مصر الجديدة الإنجيلية");
    expect(translations.en.mobileApp.churchDefaultName).toBe("New Heliopolis Evangelical Church");

    // Evangelical Meeting Terminology
    expect(translations.ar.mobileApp.nextService).toBe("الاجتماع القادم");
    expect(translations.en.mobileApp.nextService).toBe("Next Meeting");

    // Check-in Methods
    expect(translations.ar.mobileApp.checkinMethodScan).toBe("مسح رمز القاعة (QR)");
    expect(translations.ar.mobileApp.checkinMethodDirect).toBe("تأكيد مباشر بضغطة واحدة");
    expect(translations.en.mobileApp.checkinMethodScan).toBe("Scan Auditorium QR");
    expect(translations.en.mobileApp.checkinMethodDirect).toBe("One-Tap Check-in");
  });

  it("verifies mock data complies strictly with Evangelical church meetings and persona", () => {
    // Member & Church identity
    expect(MOCK_MEMBER_PROFILE.churchName.ar).toBe("كنيسة مصر الجديدة الإنجيلية");
    expect(MOCK_MEMBER_PROFILE.churchName.en).toBe("New Heliopolis Evangelical Church");
    expect(MOCK_MEMBER_PROFILE.name.en).toBe("Sam Youssef");

    // Next Meeting
    expect(MOCK_NEXT_SERVICE.title.ar).toBe("اجتماع صباح الجمعة");
    expect(MOCK_NEXT_SERVICE.title.en).toBe("Friday Morning Meeting");

    // Factual attendance records (no scores)
    for (const record of MOCK_MEMBER_PROFILE.attendanceHistory) {
      expect(record.status).toBe("attended");
      expect(record.serviceName.ar).toMatch(/(صباح الجمعة|صباح الأحد|مساء الأحد)/);
    }

    // Events match Evangelical weekly schedule
    const eventTitles = MOCK_EVENTS.map((e) => e.title.ar).join(" ");
    expect(eventTitles).toContain("اجتماع صباح الجمعة");
    expect(eventTitles).toContain("اجتماع الشباب");
    expect(eventTitles).toContain("اجتماع صباح الأحد");
    expect(eventTitles).toContain("اجتماع مساء الأحد");

    // Strictly NO Orthodox terms in mobile mock data
    const allMockText = JSON.stringify(MOCK_MEMBER_PROFILE) + JSON.stringify(MOCK_NEXT_SERVICE) + JSON.stringify(MOCK_EVENTS);
    expect(allMockText).not.toContain("Liturgy");
    expect(allMockText).not.toContain("قداس");
    expect(allMockText).not.toContain("Mass");
  });
});
