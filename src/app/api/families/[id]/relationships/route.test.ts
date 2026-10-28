/**
 * /api/families/[id]/relationships/[relationshipId] route tests
 *
 * These cover the nested-resource contract and the write authorisation of the
 * two relationship endpoints, which the family collection route tests do not
 * reach.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  PATCH,
  DELETE,
} from "@/app/api/families/[id]/relationships/[relationshipId]/route";
import { POST } from "@/app/api/families/[id]/relationships/route";
import { signSession } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

const TENANT = "tenant-1";
const FAMILY = "fam-1";
const OTHER_FAMILY = "fam-2";

const FATHER_ID = "11111111-1111-4111-8111-111111111111";
const CHILD_ID = "22222222-2222-4222-8222-222222222222";

const now = new Date("2026-01-01T00:00:00.000Z");

const adminUser = {
  id: "u-admin",
  tenantId: TENANT,
  email: "admin@example.com",
  name: "Church Admin",
  role: "admin",
  isActive: true,
};

const memberUser = {
  id: "u-member",
  tenantId: TENANT,
  email: "member@example.com",
  name: "Regular Member",
  role: "member",
  isActive: true,
};

const familyRow = {
  id: FAMILY,
  tenantId: TENANT,
  name: "Miller Family",
  familyPhotoUrl: null,
  headMemberId: FATHER_ID,
  notes: null,
  createdAt: now,
  updatedAt: now,
  relationships: [],
  headMember: null,
};

const RELATIONSHIP_ID = "33333333-3333-4333-8333-333333333333";

const relationshipRow = {
  id: RELATIONSHIP_ID,
  tenantId: TENANT,
  familyId: FAMILY,
  fromMemberId: FATHER_ID,
  toMemberId: CHILD_ID,
  type: "father",
  createdAt: now,
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

describe("Family relationship API endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findUnique as any).mockImplementation(({ where }: any) => {
      if (where.id === "u-admin") return Promise.resolve(adminUser);
      if (where.id === "u-member") return Promise.resolve(memberUser);
      return Promise.resolve(null);
    });
    (prisma.auditLog.create as any).mockResolvedValue({});
    (prisma.member.findFirst as any).mockResolvedValue({ id: FATHER_ID });
    (prisma.family.findFirst as any).mockResolvedValue(familyRow);
    (prisma.familyRelationship.findFirst as any).mockResolvedValue(null);
    (prisma.familyRelationship.findMany as any).mockResolvedValue([]);
  });

  describe("POST /api/families/[id]/relationships", () => {
    it("rejects unauthenticated requests (401)", async () => {
      const req = await createReq(
        `http://localhost/api/families/${FAMILY}/relationships`,
        "POST",
        "none",
        { fromMemberId: FATHER_ID, toMemberId: CHILD_ID, type: "father" },
      );
      const res = await POST(req, params({ id: FAMILY }));
      expect(res.status).toBe(401);
    });

    it("refuses to add a relationship for a member role (403)", async () => {
      // `member` may read families but must not change them.
      const req = await createReq(
        `http://localhost/api/families/${FAMILY}/relationships`,
        "POST",
        "member",
        { fromMemberId: FATHER_ID, toMemberId: CHILD_ID, type: "father" },
      );
      const res = await POST(req, params({ id: FAMILY }));
      expect(res.status).toBe(403);
      expect(prisma.familyRelationship.create).not.toHaveBeenCalled();
    });

    it("rejects a non-UUID member id (400)", async () => {
      const req = await createReq(
        `http://localhost/api/families/${FAMILY}/relationships`,
        "POST",
        "admin",
        { fromMemberId: "not-a-uuid", toMemberId: CHILD_ID, type: "father" },
      );
      const res = await POST(req, params({ id: FAMILY }));
      expect(res.status).toBe(400);
    });

    it("creates a relationship for an admin (201)", async () => {
      (prisma.familyRelationship.create as any).mockResolvedValue(relationshipRow);

      const req = await createReq(
        `http://localhost/api/families/${FAMILY}/relationships`,
        "POST",
        "admin",
        { fromMemberId: FATHER_ID, toMemberId: CHILD_ID, type: "father" },
      );
      const res = await POST(req, params({ id: FAMILY }));
      expect(res.status).toBe(201);

      expect(prisma.familyRelationship.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT,
          familyId: FAMILY,
          fromMemberId: FATHER_ID,
          toMemberId: CHILD_ID,
          type: "father",
        }),
      });
    });

    it("never writes a client-supplied tenant (201)", async () => {
      (prisma.familyRelationship.create as any).mockResolvedValue(relationshipRow);

      const req = await createReq(
        `http://localhost/api/families/${FAMILY}/relationships`,
        "POST",
        "admin",
        {
          fromMemberId: FATHER_ID,
          toMemberId: CHILD_ID,
          type: "father",
          tenantId: "tenant-999",
        },
      );
      const res = await POST(req, params({ id: FAMILY }));
      expect(res.status).toBe(201);

      const arg = (prisma.familyRelationship.create as any).mock.calls[0][0];
      expect(arg.data.tenantId).toBe(TENANT);
    });

    it("rejects a relationship that would close an ancestry loop (409)", async () => {
      // A -> B is already stored, so making B the parent of A is impossible.
      (prisma.familyRelationship.findMany as any).mockResolvedValue([
        {
          id: "rel-existing",
          fromMemberId: FATHER_ID,
          toMemberId: CHILD_ID,
          type: "father",
        },
      ]);

      const req = await createReq(
        `http://localhost/api/families/${FAMILY}/relationships`,
        "POST",
        "admin",
        { fromMemberId: CHILD_ID, toMemberId: FATHER_ID, type: "father" },
      );
      const res = await POST(req, params({ id: FAMILY }));
      expect(res.status).toBe(409);
      expect(prisma.familyRelationship.create).not.toHaveBeenCalled();
    });

    it("returns 404 when the family is not in the caller's tenant", async () => {
      (prisma.family.findFirst as any).mockResolvedValue(null);

      const req = await createReq(
        `http://localhost/api/families/fam-foreign/relationships`,
        "POST",
        "admin",
        { fromMemberId: FATHER_ID, toMemberId: CHILD_ID, type: "father" },
      );
      const res = await POST(req, params({ id: "fam-foreign" }));
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/families/[id]/relationships/[relationshipId]", () => {
    it("rejects unauthenticated requests (401)", async () => {
      const req = await createReq(
        `http://localhost/api/families/${FAMILY}/relationships/${RELATIONSHIP_ID}`,
        "PATCH",
        "none",
        { type: "guardian" },
      );
      const res = await PATCH(req, params({ id: FAMILY, relationshipId: RELATIONSHIP_ID }));
      expect(res.status).toBe(401);
    });

    it("refuses to update a relationship for a member role (403)", async () => {
      const req = await createReq(
        `http://localhost/api/families/${FAMILY}/relationships/${RELATIONSHIP_ID}`,
        "PATCH",
        "member",
        { type: "guardian" },
      );
      const res = await PATCH(req, params({ id: FAMILY, relationshipId: RELATIONSHIP_ID }));
      expect(res.status).toBe(403);
      expect(prisma.familyRelationship.update).not.toHaveBeenCalled();
    });

    it("updates a relationship for an admin (200)", async () => {
      (prisma.familyRelationship.findFirst as any).mockResolvedValue(relationshipRow);
      (prisma.familyRelationship.update as any).mockResolvedValue({
        ...relationshipRow,
        type: "guardian",
      });

      const req = await createReq(
        `http://localhost/api/families/${FAMILY}/relationships/${RELATIONSHIP_ID}`,
        "PATCH",
        "admin",
        { type: "guardian" },
      );
      const res = await PATCH(req, params({ id: FAMILY, relationshipId: RELATIONSHIP_ID }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.type).toBe("guardian");
    });

    it("returns 404 when the relationship belongs to a different family", async () => {
      // The relationship exists, but not under the family named in the URL.
      // Honouring the nested path is what stops one family's URL from editing
      // another family's link.
      (prisma.familyRelationship.findFirst as any).mockResolvedValue(relationshipRow);

      const req = await createReq(
        `http://localhost/api/families/${OTHER_FAMILY}/relationships/${RELATIONSHIP_ID}`,
        "PATCH",
        "admin",
        { type: "guardian" },
      );
      const res = await PATCH(req, params({ id: OTHER_FAMILY, relationshipId: RELATIONSHIP_ID }));
      expect(res.status).toBe(404);
      expect(prisma.familyRelationship.update).not.toHaveBeenCalled();
    });

    it("returns 404 for a relationship in another tenant", async () => {
      (prisma.familyRelationship.findFirst as any).mockResolvedValue(null);

      const req = await createReq(
        `http://localhost/api/families/${FAMILY}/relationships/rel-foreign`,
        "PATCH",
        "admin",
        { type: "guardian" },
      );
      const res = await PATCH(req, params({ id: FAMILY, relationshipId: "rel-foreign" }));
      expect(res.status).toBe(404);
    });

    it("rejects an unknown relationship type (400)", async () => {
      const req = await createReq(
        `http://localhost/api/families/${FAMILY}/relationships/${RELATIONSHIP_ID}`,
        "PATCH",
        "admin",
        { type: "cousin" },
      );
      const res = await PATCH(req, params({ id: FAMILY, relationshipId: RELATIONSHIP_ID }));
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/families/[id]/relationships/[relationshipId]", () => {
    it("rejects unauthenticated requests (401)", async () => {
      const req = await createReq(
        `http://localhost/api/families/${FAMILY}/relationships/${RELATIONSHIP_ID}`,
        "DELETE",
        "none",
      );
      const res = await DELETE(req, params({ id: FAMILY, relationshipId: RELATIONSHIP_ID }));
      expect(res.status).toBe(401);
    });

    it("refuses to delete a relationship for a member role (403)", async () => {
      const req = await createReq(
        `http://localhost/api/families/${FAMILY}/relationships/${RELATIONSHIP_ID}`,
        "DELETE",
        "member",
      );
      const res = await DELETE(req, params({ id: FAMILY, relationshipId: RELATIONSHIP_ID }));
      expect(res.status).toBe(403);
      expect(prisma.familyRelationship.delete).not.toHaveBeenCalled();
    });

    it("deletes a relationship for an admin (204)", async () => {
      (prisma.familyRelationship.findFirst as any).mockResolvedValue(relationshipRow);
      (prisma.familyRelationship.delete as any).mockResolvedValue(relationshipRow);

      const req = await createReq(
        `http://localhost/api/families/${FAMILY}/relationships/${RELATIONSHIP_ID}`,
        "DELETE",
        "admin",
      );
      const res = await DELETE(req, params({ id: FAMILY, relationshipId: RELATIONSHIP_ID }));
      expect(res.status).toBe(204);
    });

    it("returns 404 when the relationship belongs to a different family", async () => {
      (prisma.familyRelationship.findFirst as any).mockResolvedValue(relationshipRow);

      const req = await createReq(
        `http://localhost/api/families/${OTHER_FAMILY}/relationships/${RELATIONSHIP_ID}`,
        "DELETE",
        "admin",
      );
      const res = await DELETE(req, params({ id: OTHER_FAMILY, relationshipId: RELATIONSHIP_ID }));
      expect(res.status).toBe(404);
      expect(prisma.familyRelationship.delete).not.toHaveBeenCalled();
    });

    it("returns 404 for a relationship in another tenant", async () => {
      (prisma.familyRelationship.findFirst as any).mockResolvedValue(null);

      const req = await createReq(
        `http://localhost/api/families/${FAMILY}/relationships/rel-foreign`,
        "DELETE",
        "admin",
      );
      const res = await DELETE(req, params({ id: FAMILY, relationshipId: "rel-foreign" }));
      expect(res.status).toBe(404);
      expect(prisma.familyRelationship.delete).not.toHaveBeenCalled();
    });

    it("audits the deletion against the caller's tenant", async () => {
      (prisma.familyRelationship.findFirst as any).mockResolvedValue(relationshipRow);
      (prisma.familyRelationship.delete as any).mockResolvedValue(relationshipRow);

      const req = await createReq(
        `http://localhost/api/families/${FAMILY}/relationships/${RELATIONSHIP_ID}`,
        "DELETE",
        "admin",
      );
      await DELETE(req, params({ id: FAMILY, relationshipId: RELATIONSHIP_ID }));

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT,
          action: "family.relationship.delete",
          resource: "family_relationship",
          resourceId: RELATIONSHIP_ID,
        }),
      });
    });
  });
});
