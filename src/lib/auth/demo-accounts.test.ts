import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { DEMO_ACCOUNTS } from "./demo-accounts";

describe("demo accounts", () => {

  it("lists each email once", () => {
    const emails = DEMO_ACCOUNTS.map((a) => a.email);
    expect(new Set(emails).size).toBe(emails.length);
  });
});
