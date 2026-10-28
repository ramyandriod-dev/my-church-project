import { describe, it, expect, beforeEach } from "vitest";
import {
  registerDeviceToken,
  getTokensForMember,
  getTokensForMembers,
  removeDeviceToken,
} from "@/lib/push/fcm-store";
import { sendFcmPushToMembers } from "@/lib/push/fcm-service";

describe("Firebase Cloud Messaging (FCM) Push Service & Store", () => {
  beforeEach(() => {
    // Reset registrations
    removeDeviceToken("test_token_1");
    removeDeviceToken("test_token_2");
    removeDeviceToken("test_token_3");
  });

  it("registers and retrieves device tokens per member", () => {
    registerDeviceToken({
      userId: "user-123",
      memberId: "member-abc",
      token: "test_token_1",
      platform: "android",
      updatedAt: new Date().toISOString(),
    });

    const tokens = getTokensForMember("member-abc");
    expect(tokens).toContain("test_token_1");
  });

  it("handles multi-device tokens for a single member", () => {
    registerDeviceToken({
      userId: "user-123",
      memberId: "member-abc",
      token: "test_token_1",
      platform: "android",
      updatedAt: new Date().toISOString(),
    });
    registerDeviceToken({
      userId: "user-123",
      memberId: "member-abc",
      token: "test_token_2",
      platform: "android",
      deviceModel: "Pixel 8 Pro",
      updatedAt: new Date().toISOString(),
    });

    const tokens = getTokensForMember("member-abc");
    expect(tokens).toHaveLength(2);
    expect(tokens).toContain("test_token_1");
    expect(tokens).toContain("test_token_2");
  });

  it("aggregates tokens for multiple members in bulk messaging", () => {
    registerDeviceToken({
      userId: "user-1",
      memberId: "member-1",
      token: "test_token_1",
      platform: "android",
      updatedAt: new Date().toISOString(),
    });
    registerDeviceToken({
      userId: "user-2",
      memberId: "member-2",
      token: "test_token_2",
      platform: "android",
      updatedAt: new Date().toISOString(),
    });

    const allTokens = getTokensForMembers(["member-1", "member-2", "member-nonexistent"]);
    expect(allTokens).toHaveLength(2);
    expect(allTokens).toContain("test_token_1");
    expect(allTokens).toContain("test_token_2");
  });

  it("removes invalid or deregistered tokens cleanly", () => {
    registerDeviceToken({
      userId: "user-1",
      memberId: "member-1",
      token: "test_token_1",
      platform: "android",
      updatedAt: new Date().toISOString(),
    });

    removeDeviceToken("test_token_1");
    const tokens = getTokensForMember("member-1");
    expect(tokens).toHaveLength(0);
  });

  it("gracefully handles push dispatch when no members or no tokens registered", async () => {
    const res = await sendFcmPushToMembers({
      targetMemberIds: ["member-without-token"],
      title: "Church Message",
      body: "Hello from the pastor",
    });

    expect(res.success).toBe(true);
    expect(res.tokensCount).toBe(0);
    expect(res.deliveredCount).toBe(0);
  });

  it("handles push dispatch safely when FCM_SERVER_KEY is absent from environment", async () => {
    registerDeviceToken({
      userId: "user-1",
      memberId: "member-with-token",
      token: "test_token_3",
      platform: "android",
      updatedAt: new Date().toISOString(),
    });

    const res = await sendFcmPushToMembers({
      targetMemberIds: ["member-with-token"],
      title: "Church Alert",
      body: "Special Prayer Meeting Tonight",
    });

    expect(res.success).toBe(true);
    expect(res.tokensCount).toBe(1);
    expect(res.deliveredCount).toBe(0);
    expect(res.error).toContain("FCM_SERVER_KEY not configured");
  });

  it("supports async token lookup across isolates", async () => {
    registerDeviceToken({
      userId: "user-async",
      memberId: "member-async",
      token: "test_token_async",
      platform: "android",
      updatedAt: new Date().toISOString(),
    });

    const tokens = await getTokensForMember("member-async");
    expect(tokens).toContain("test_token_async");
    removeDeviceToken("test_token_async");
  });
});
