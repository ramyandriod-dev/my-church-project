/**
 * The owner's private demo password: demo accounts accept only it when it is set,
 * and nothing changes for anyone else.
 */

import { describe, it, expect, afterEach } from "vitest";
import { demoAccessPassword, isPrivateDemoAccount, matchesDemoAccessPassword } from "./demo-access";
import { DEMO_ACCOUNTS } from "./demo-accounts";

const original = process.env.DEMO_ACCESS_PASSWORD;
afterEach(() => {
  if (original === undefined) delete process.env.DEMO_ACCESS_PASSWORD;
  else process.env.DEMO_ACCESS_PASSWORD = original;
});

describe("private demo access", () => {
  it("is off when no password is set, so development and tests behave as before", () => {
    delete process.env.DEMO_ACCESS_PASSWORD;
    expect(demoAccessPassword()).toBeNull();
    expect(isPrivateDemoAccount("admin@grace.community")).toBe(false);
  });

  it("ignores a password too short to protect anything", () => {
    process.env.DEMO_ACCESS_PASSWORD = "short";
    expect(demoAccessPassword()).toBeNull();
    expect(isPrivateDemoAccount("admin@grace.community")).toBe(false);
  });

  it("covers every demo account, and only them", () => {
    process.env.DEMO_ACCESS_PASSWORD = "owner-only-password";
    for (const a of DEMO_ACCOUNTS) expect(isPrivateDemoAccount(a.email)).toBe(true);
    expect(isPrivateDemoAccount("ADMIN@grace.community ")).toBe(true);
    expect(isPrivateDemoAccount("a.real.member@gmail.com")).toBe(false);
  });

  it("matches only the exact password", async () => {
    process.env.DEMO_ACCESS_PASSWORD = "owner-only-password";
    expect(await matchesDemoAccessPassword("owner-only-password")).toBe(true);
    expect(await matchesDemoAccessPassword("owner-only-password ")).toBe(false);
    expect(await matchesDemoAccessPassword("password")).toBe(false);
    expect(await matchesDemoAccessPassword("ChurchDemo!2026")).toBe(false);
    expect(await matchesDemoAccessPassword("")).toBe(false);
  });

  it("matches nothing when no password is set", async () => {
    delete process.env.DEMO_ACCESS_PASSWORD;
    expect(await matchesDemoAccessPassword("")).toBe(false);
    expect(await matchesDemoAccessPassword("anything")).toBe(false);
  });
});
