import { describe, it, expect } from "vitest";
import { deriveMemberAttendanceStatus } from "./attendance-domain";

describe("Attendance Domain — Derived Status", () => {
  it("never derives missing for someone who was not expected", () => {
    const status = deriveMemberAttendanceStatus({
      wasExpected: false,
      hasPresentRecord: false,
      exception: null,
      windowClosed: true,
    });
    expect(status).toBe("not_expected");
  });

  it("derives present when a present record exists", () => {
    const status = deriveMemberAttendanceStatus({
      wasExpected: true,
      hasPresentRecord: true,
      exception: null,
      windowClosed: true,
    });
    expect(status).toBe("present");
  });

  it("derives excused only from an explicit excused exception", () => {
    const status = deriveMemberAttendanceStatus({
      wasExpected: true,
      hasPresentRecord: false,
      exception: "excused",
      windowClosed: true,
    });
    expect(status).toBe("excused");
  });

  it("derives not_expected from an explicit not_expected exception", () => {
    const status = deriveMemberAttendanceStatus({
      wasExpected: true,
      hasPresentRecord: false,
      exception: "not_expected",
      windowClosed: true,
    });
    expect(status).toBe("not_expected");
  });

  it("derives missing ONLY after the window closes", () => {
    const status = deriveMemberAttendanceStatus({
      wasExpected: true,
      hasPresentRecord: false,
      exception: null,
      windowClosed: true,
    });
    expect(status).toBe("missing");
  });

  it("does not call someone missing while the window is still open", () => {
    const status = deriveMemberAttendanceStatus({
      wasExpected: true,
      hasPresentRecord: false,
      exception: null,
      windowClosed: false,
    });
    expect(status).toBe("not_yet_checked_in");
  });
});