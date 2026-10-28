import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");

const profileScreenSrc = read("src/components/mobile-app/screens/profile-screen.tsx");
const editProfileModalSrc = read("src/components/mobile-app/modals/edit-profile-modal.tsx");
const authProviderSrc = read("src/components/mobile-app/mobile-auth-provider.tsx");

describe("Phase 2 Mobile Self-Service Profile & Modal", () => {
  it("includes all 4 tabs in EditProfileModal", () => {
    expect(editProfileModalSrc).toContain('"basic"');
    expect(editProfileModalSrc).toContain('"ministry"');
    expect(editProfileModalSrc).toContain('"talents"');
    expect(editProfileModalSrc).toContain('"family"');
  });

  it("submits PATCH request to /api/members/me and publishes real-time broadcast", () => {
    expect(editProfileModalSrc).toContain('mobileApiFetch("/api/members/me",');
    expect(editProfileModalSrc).toContain('method: "PATCH"');
    expect(editProfileModalSrc).toContain("publishLocalRealtime");
    expect(editProfileModalSrc).toContain('"member.profile_updated"');
  });

  it("supports existing family selection and new family creation", () => {
    expect(editProfileModalSrc).toContain("fetch(\"/api/families?view=directory\")");
    expect(editProfileModalSrc).toContain("familyMode === \"existing\"");
    expect(editProfileModalSrc).toContain("familyMode === \"new\"");
    expect(editProfileModalSrc).toContain("newFamilyName");
  });

  it("enriches MobileMember interface with family and talent profiles", () => {
    expect(authProviderSrc).toContain("familyId?: string | null;");
    expect(authProviderSrc).toContain("familyName?: string | null;");
    expect(authProviderSrc).toContain("familyRelationship?: string | null;");
    expect(authProviderSrc).toContain("talentProfile?:");
    expect(authProviderSrc).toContain('mobileApiFetch<MobileMember>("/api/members/me")');
  });

  it("computes profile completion and renders progress card in ProfileScreen", () => {
    expect(profileScreenSrc).toContain("completionPercentage");
    expect(profileScreenSrc).toContain("completionPercentage < 100");
    expect(profileScreenSrc).toContain("handleOpenEdit(\"basic\")");
    expect(profileScreenSrc).toContain("handleOpenEdit(\"family\")");
    expect(profileScreenSrc).toContain("handleOpenEdit(\"talents\")");
    expect(profileScreenSrc).toContain("handleOpenEdit(\"ministry\")");
  });

  it("renders dedicated Talents & Skills section in ProfileScreen", () => {
    expect(profileScreenSrc).toContain("TALENT_LABELS");
    expect(profileScreenSrc).toContain("IconSparkles");
    expect(profileScreenSrc).toContain("IconBriefcase");
    expect(profileScreenSrc).toContain("talentSkills.length > 0");
  });

  it("mounts EditProfileModal with auto-refresh on save in ProfileScreen", () => {
    expect(profileScreenSrc).toContain("<EditProfileModal");
    expect(profileScreenSrc).toContain("isOpen={isEditModalOpen}");
    expect(profileScreenSrc).toContain("onSaved={async () => {");
    expect(profileScreenSrc).toContain("await refreshProfile();");
    expect(profileScreenSrc).toContain("void fetchMemberDetails();");
  });

  it("provides file upload and interactive AvatarCropperModal in EditProfileModal", () => {
    expect(editProfileModalSrc).toContain("AvatarCropperModal");
    expect(editProfileModalSrc).toContain("handleFileSelect");
    expect(editProfileModalSrc).toContain('accept="image/*"');
    expect(editProfileModalSrc).toContain("FileReader");
    expect(editProfileModalSrc).toContain("setRawImageToCrop");
    expect(editProfileModalSrc).toContain("setIsCropperOpen(true)");
    expect(editProfileModalSrc).toContain("<AvatarCropperModal");
  });

  it("makes ProfileScreen avatar interactive with camera badge linking to basic edit tab", () => {
    expect(profileScreenSrc).toContain('onClick={() => handleOpenEdit("basic")}');
    expect(profileScreenSrc).toContain("title={isAr ? \"تغيير الصورة الشخصية\" : \"Change Profile Photo\"}");
  });

  it("resolves nested FamilyTreeNode without undefined in ProfileScreen", () => {
    // Verifies node.member unwrap, filtering out focal member, and relationship mapping
    expect(profileScreenSrc).toContain("const mem = node.member || node;");
    expect(profileScreenSrc).toContain("mem.firstName");
    expect(profileScreenSrc).toContain("mem.lastName");
    expect(profileScreenSrc).toContain("node.relationshipToFocal");
    expect(profileScreenSrc).toContain("!node.isFocal");
  });

  it("pre-populates existing family and displays registered members in EditProfileModal", () => {
    expect(editProfileModalSrc).toContain("loadFamilyTree");
    expect(editProfileModalSrc).toContain("currentFamily");
    expect(editProfileModalSrc).toContain("currentFamilyMembers");
    expect(editProfileModalSrc).toContain("Registered Family Members");
    expect(editProfileModalSrc).toContain("Current Registered Family");
  });

  it("provides inline editing and unlinking of existing family members in EditProfileModal", () => {
    expect(editProfileModalSrc).toContain("editingFamilyMemberId");
    expect(editProfileModalSrc).toContain("editedFamilyMembers");
    expect(editProfileModalSrc).toContain("removedFamilyMemberIds");
    expect(editProfileModalSrc).toContain("payload.updatedFamilyMembers");
    expect(editProfileModalSrc).toContain("payload.removedFamilyMemberIds");
    expect(editProfileModalSrc).toContain("تعديل صلة القرابة والبيانات");
  });

  it("provides EditFamilyModal in Member 360 FamilySection for admins to edit relationships and members", () => {
    const familySectionSrc = read("src/components/member360/family-section.tsx");
    expect(familySectionSrc).toContain("EditFamilyModal");
    expect(familySectionSrc).toContain("isEditModalOpen");
    expect(familySectionSrc).toContain("handleUpdateRelType");
    expect(familySectionSrc).toContain("handleDeleteRel");
    expect(familySectionSrc).toContain("handleAddRelationship");
    expect(familySectionSrc).toContain("handleSaveMemberInfo");
    expect(familySectionSrc).toContain("handleSaveHead");
    expect(familySectionSrc).toContain("onRefresh");
  });
});
