import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as mobileLogin } from "./route";
import prisma from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";

const testTenant = {
  id: "tenant-1",
  name: "Grace Community Church",
  slug: "grace-community",
  isActive: true,
};

const testMember = {
  id: "m-mobile-user",
  tenantId: "tenant-1",
  firstName: "Sarah",
  lastName: "Johnson",
  email: "sarah@example.com",
  phone: "+1 555 777",
  status: "active",
  avatarUrl: null,
  ministry: "Worship",
  tenantId_email: { tenantId: "tenant-1", email: "sarah@example.com" },
  group: { id: "g-1", name: "Worship Band" },
};

describe("POST /api/auth/mobile/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.authThrottle.findUnique as any).mockResolvedValue(null);
    (prisma.authThrottle.create as any).mockResolvedValue({ failures: 1 });
    (prisma.authThrottle.update as any).mockResolvedValue({ failures: 1 });
    (prisma.authThrottle.deleteMany as any).mockResolvedValue({ count: 0 });
  });

  it("authenticates and returns bearer token, user, and linked member summary", async () => {
    const passwordHash = await hashPassword("password123");

    (prisma.user.findFirst as any).mockResolvedValue({
      id: "u-1",
      email: "sarah@example.com",
      name: "Sarah Johnson",
      role: "member",
      tenantId: "tenant-1",
      passwordHash,
      isActive: true,
      memberId: "m-mobile-user",
      tenant: testTenant,
      member: testMember,
    });
    (prisma.user.update as any).mockResolvedValue({});
    (prisma.session.create as any).mockResolvedValue({});

    const req = new NextRequest("http://localhost/api/auth/mobile/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "sarah@example.com",
        password: "password123",
      }),
    });

    const res = await mobileLogin(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.accessToken).toBeDefined();
    expect(json.data.tokenType).toBe("Bearer");
    expect(json.data.user.memberId).toBe("m-mobile-user");
    expect(json.data.user.member).toBeDefined();
    expect(json.data.user.member.firstName).toBe("Sarah");
    expect(json.data.user.member.ministry).toBe("Worship");
    expect(json.data.user.member.group.name).toBe("Worship Band");
  });

  it("rejects invalid password with 401", async () => {
    const passwordHash = await hashPassword("correctpassword");

    (prisma.user.findFirst as any).mockResolvedValue({
      id: "u-1",
      email: "sarah@example.com",
      name: "Sarah Johnson",
      role: "member",
      tenantId: "tenant-1",
      passwordHash,
      isActive: true,
      memberId: "m-mobile-user",
      tenant: testTenant,
      member: testMember,
    });

    const req = new NextRequest("http://localhost/api/auth/mobile/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "sarah@example.com",
        password: "wrongpassword",
      }),
    });

    const res = await mobileLogin(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  describe("private demo password (the app that testers receive)", () => {
    const original = process.env.DEMO_ACCESS_PASSWORD;
    afterEach(() => {
      if (original === undefined) delete process.env.DEMO_ACCESS_PASSWORD;
      else process.env.DEMO_ACCESS_PASSWORD = original;
    });

    async function loginAs(email: string, password: string, storedPassword: string) {
      (prisma.user.findFirst as any).mockResolvedValue({
        id: "u-demo",
        email,
        name: "Demo",
        role: email.startsWith("admin") ? "admin" : "member",
        tenantId: "tenant-1",
        passwordHash: await hashPassword(storedPassword),
        isActive: true,
        memberId: null,
        tenant: testTenant,
        member: null,
      });
      (prisma.user.update as any).mockResolvedValue({});
      (prisma.session.create as any).mockResolvedValue({});
      const req = new NextRequest("http://localhost/api/auth/mobile/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      return mobileLogin(req, { params: Promise.resolve({}) });
    }

    it("signs a demo account in with the owner's password", async () => {
      process.env.DEMO_ACCESS_PASSWORD = "owner-only-password";
      expect((await loginAs("mina.samir@grace.community", "owner-only-password", "ChurchDemo!2026")).status).toBe(200);
    });

    it("refuses the public demo passwords, even though they match what is stored", async () => {
      process.env.DEMO_ACCESS_PASSWORD = "owner-only-password";
      for (const password of ["ChurchDemo!2026", "password"]) {
        expect((await loginAs("admin@grace.community", password, "ChurchDemo!2026")).status, password).toBe(401);
      }
    });
  });
});
