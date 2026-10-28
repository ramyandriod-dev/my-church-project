import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { GET as GET_ONE, PATCH as PATCH_ONE, DELETE as DELETE_ONE } from "./[id]/route";
import { GET as GET_MEMBER_FAMILY } from "@/app/api/members/[memberId]/family/route";
import { signSession } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { grantMemberPermissions } from "../../../../tests/member-grants";

const adminUser = {
  id: "u-admin",
  tenantId: "tenant-1",
  email: "admin@example.com",
  name: "Church Admin",
  role: "admin",
  isActive: true,
};

const memberUser = {
  id: "u-member",
  tenantId: "tenant-1",
  email: "member@example.com",
  name: "Regular Member",
  role: "member",
  isActive: true,
};

const TENANT = "tenant-1";

const now = new Date("2026-01-01T00:00:00.000Z");

// Member ids are UUIDs in the schema, so validation must reject anything else.
const CHILD_ID = "22222222-2222-4222-8222-222222222222";
const FATHER_ID = "11111111-1111-4111-8111-111111111111";
const FOREIGN_MEMBER_ID = "99999999-9999-4999-8999-999999999999";


const familyRow = {
  id: "fam-1",
  tenantId: TENANT,
  name: "Miller Family",
  familyPhotoUrl: null,
  headMemberId: FATHER_ID,
  notes: null,
  createdAt: now,
  updatedAt: now,
  relationships: [
    {
      id: "rel-1",
      tenantId: TENANT,
      familyId: "fam-1",
      fromMemberId: FATHER_ID,
      toMemberId: CHILD_ID,
      type: "father",
      createdAt: now,
    },
  ],
  headMember: null,
};

const fatherRow = {
  id: FATHER_ID,
  tenantId: TENANT,
  firstName: "Frank",
  lastName: "Miller",
  email: "frank@example.com",
  avatarUrl: "https://example.com/father.jpg",
  status: "active",
};

const childRow = {
  id: CHILD_ID,
  tenantId: TENANT,
  firstName: "Chris",
  lastName: "Miller",
  email: "chris@example.com",
  avatarUrl: "https://example.com/child.jpg",
  status: "active",
};

async function createReq(
  url: string,
  method: string,
  role: "admin" | "member" | "none",
  body?: unknown,
) {
  const headers: Record<string, string> = { "content-type": "application/json" };

  if (role !== "none") {
    const user = role === "admin" ? adminUser : memberUser;
    const token = await signSession({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    });
    headers["cookie"] = `church_session=${token}`;
  }

  return new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

const params = (p: Record<string, string>) => ({ params: Promise.resolve(p) });

describe("Family API Endpoints", () => {
  beforeEach(() => {
    // Members start with nothing; here the admin has ticked what this route needs.
    grantMemberPermissions(["families.read"]);
    vi.clearAllMocks();
    (prisma.user.findUnique as any).mockImplementation(({ where }: any) => {
      if (where.id === "u-admin") return Promise.resolve(adminUser);
      if (where.id === "u-member") return Promise.resolve(memberUser);
      return Promise.resolve(null);
    });
    (prisma.auditLog.create as any).mockResolvedValue({});
  });

  describe("GET /api/families", () => {
    it("rejects unauthenticated requests (401)", async () => {
      const req = await createReq("http://localhost/api/families", "GET", "none");
      const res = await GET(req, params({}));
      expect(res.status).toBe(401);
    });

    it("allows a member role to read families (200)", async () => {
      // `families.read` is granted to the member role by design.
      (prisma.family.findMany as any).mockResolvedValue([familyRow]);
      (prisma.family.count as any).mockResolvedValue(1);

      const req = await createReq("http://localhost/api/families", "GET", "member");
      const res = await GET(req, params({}));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.items).toHaveLength(1);
    });

    it("scopes the query to the caller's tenant", async () => {
      (prisma.family.findMany as any).mockResolvedValue([]);
      (prisma.family.count as any).mockResolvedValue(0);

      const req = await createReq("http://localhost/api/families", "GET", "admin");
      await GET(req, params({}));

      expect(prisma.family.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: TENANT } }),
      );
    });

    it("ignores any tenant supplied in the query string", async () => {
      (prisma.family.findMany as any).mockResolvedValue([]);
      (prisma.family.count as any).mockResolvedValue(0);

      const req = await createReq(
        "http://localhost/api/families?tenantId=tenant-999",
        "GET",
        "admin",
      );
      await GET(req, params({}));

      expect(prisma.family.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: TENANT } }),
      );
    });
  });

  describe("POST /api/families", () => {
    it("rejects a member role lacking families.create (403)", async () => {
      const req = await createReq("http://localhost/api/families", "POST", "member", {
        name: "New Family",
      });
      const res = await POST(req, params({}));
      expect(res.status).toBe(403);
    });

    it("creates a family for an admin (201)", async () => {
      (prisma.member.findFirst as any).mockResolvedValue(fatherRow);
      (prisma.family.create as any).mockResolvedValue({ ...familyRow, relationships: [] });

      const req = await createReq("http://localhost/api/families", "POST", "admin", {
        name: "Miller Family",
        headMemberId: FATHER_ID,
      });
      const res = await POST(req, params({}));
      expect(res.status).toBe(201);

      expect(prisma.family.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: TENANT, name: "Miller Family" }),
        }),
      );
    });

    it("rejects a body with a tenantId the caller does not own (400/403)", async () => {
      const req = await createReq("http://localhost/api/families", "POST", "admin", {
        name: "Sneaky Family",
        tenantId: "tenant-999",
      });
      const res = await POST(req, params({}));

      // The extra key is ignored rather than honoured.
      expect(res.status).toBe(201);
      expect(prisma.family.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: TENANT }),
        }),
      );
    });

    it("rejects a malformed body (400)", async () => {
      const req = await createReq("http://localhost/api/families", "POST", "admin", {
        name: "",
      });
      const res = await POST(req, params({}));
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/families/[id]", () => {
    it("returns the family for an authorized caller (200)", async () => {
      (prisma.family.findFirst as any).mockResolvedValue(familyRow);

      const req = await createReq("http://localhost/api/families/fam-1", "GET", "admin");
      const res = await GET_ONE(req, params({ id: "fam-1" }));
      expect(res.status).toBe(200);
    });

    it("returns 404 for a family outside the tenant", async () => {
      (prisma.family.findFirst as any).mockResolvedValue(null);

      const req = await createReq("http://localhost/api/families/faFOREIGN_MEMBER_ID", "GET", "admin");
      const res = await GET_ONE(req, params({ id: "faFOREIGN_MEMBER_ID" }));
      expect(res.status).toBe(404);
    });

    it("rejects unauthenticated requests (401)", async () => {
      const req = await createReq("http://localhost/api/families/fam-1", "GET", "none");
      const res = await GET_ONE(req, params({ id: "fam-1" }));
      expect(res.status).toBe(401);
    });
  });

  describe("PATCH /api/families/[id]", () => {
    it("rejects a member role lacking families.update (403)", async () => {
      const req = await createReq(
        "http://localhost/api/families/fam-1",
        "PATCH",
        "member",
        { name: "Renamed" },
      );
      const res = await PATCH_ONE(req, params({ id: "fam-1" }));
      expect(res.status).toBe(403);
    });

    it("allows an admin to rename the family (200)", async () => {
      (prisma.family.findFirst as any).mockResolvedValue(familyRow);
      (prisma.family.update as any).mockResolvedValue({ ...familyRow, name: "Renamed" });

      const req = await createReq(
        "http://localhost/api/families/fam-1",
        "PATCH",
        "admin",
        { name: "Renamed" },
      );
      const res = await PATCH_ONE(req, params({ id: "fam-1" }));
      expect(res.status).toBe(200);
    });

    it("rejects a head member from another tenant (400)", async () => {
      (prisma.family.findFirst as any).mockResolvedValue(familyRow);
      // The member lookup is tenant-scoped and misses for a foreign member.
      (prisma.member.findFirst as any).mockResolvedValue(null);

      const req = await createReq(
        "http://localhost/api/families/fam-1",
        "PATCH",
        "admin",
        { headMemberId: FOREIGN_MEMBER_ID },
      );
      const res = await PATCH_ONE(req, params({ id: "fam-1" }));
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/families/[id]", () => {
    it("rejects a member role lacking families.delete (403)", async () => {
      const req = await createReq("http://localhost/api/families/fam-1", "DELETE", "member");
      const res = await DELETE_ONE(req, params({ id: "fam-1" }));
      expect(res.status).toBe(403);
    });

    it("deletes for an admin (204)", async () => {
      (prisma.family.findFirst as any).mockResolvedValue(familyRow);
      (prisma.family.delete as any).mockResolvedValue(familyRow);

      const req = await createReq("http://localhost/api/families/fam-1", "DELETE", "admin");
      const res = await DELETE_ONE(req, params({ id: "fam-1" }));
      expect(res.status).toBe(204);
    });

    it("does not delete a family outside the tenant (404)", async () => {
      (prisma.family.findFirst as any).mockResolvedValue(null);

      const req = await createReq("http://localhost/api/families/faFOREIGN_MEMBER_ID", "DELETE", "admin");
      const res = await DELETE_ONE(req, params({ id: "faFOREIGN_MEMBER_ID" }));
      expect(res.status).toBe(404);
      expect(prisma.family.delete).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/members/[memberId]/family", () => {
    it("rejects unauthenticated requests (401)", async () => {
      const req = await createReq(
        "http://localhost/api/members/m-child/family",
        "GET",
        "none",
      );
      const res = await GET_MEMBER_FAMILY(req, params({ memberId: CHILD_ID }));
      expect(res.status).toBe(401);
    });

    it("returns the family tree for the member (200)", async () => {
      (prisma.member.findFirst as any).mockResolvedValue(childRow);
      (prisma.familyRelationship.findFirst as any).mockResolvedValue({
        id: "rel-1",
        familyId: "fam-1",
      });
      (prisma.family.findFirst as any).mockResolvedValue(familyRow);
      (prisma.member.findMany as any).mockResolvedValue([fatherRow, childRow]);

      const req = await createReq(
        "http://localhost/api/members/m-child/family",
        "GET",
        "admin",
      );
      const res = await GET_MEMBER_FAMILY(req, params({ memberId: CHILD_ID }));
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.family.id).toBe("fam-1");
      expect(json.data.focalMemberId).toBe(CHILD_ID);
      // The child is the one highlighted, and the father is labelled as such.
      const focal = json.data.members.find((n: any) => n.isFocal);
      expect(focal.member.id).toBe(CHILD_ID);
      const father = json.data.members.find((n: any) => n.member.id === FATHER_ID);
      expect(father.relationshipToFocal).toBe("father");
    });

    it("returns 404 when the member belongs to no family", async () => {
      (prisma.member.findFirst as any).mockResolvedValue(childRow);
      (prisma.familyRelationship.findFirst as any).mockResolvedValue(null);

      const req = await createReq(
        "http://localhost/api/members/m-child/family",
        "GET",
        "admin",
      );
      const res = await GET_MEMBER_FAMILY(req, params({ memberId: CHILD_ID }));
      expect(res.status).toBe(404);
    });

    it("returns 404 for a member outside the tenant", async () => {
      (prisma.member.findFirst as any).mockResolvedValue(null);

      const req = await createReq(
        "http://localhost/api/members/m-foreign/family",
        "GET",
        "admin",
      );
      const res = await GET_MEMBER_FAMILY(req, params({ memberId: FOREIGN_MEMBER_ID }));
      expect(res.status).toBe(404);
      expect(prisma.familyRelationship.findFirst).not.toHaveBeenCalled();
    });
  });
});
