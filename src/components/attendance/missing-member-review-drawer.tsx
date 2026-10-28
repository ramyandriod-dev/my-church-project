"use client";

import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getMember360 } from "@/lib/mock-data/member360";
import { useTranslation } from "@/lib/i18n";
import type { FollowUp } from "@/lib/mock-data/follow-ups";
import type { MissingPerson, MissingTriageStatus } from "@/lib/attendance/friday-reconciliation";

interface AssignedFollowUp {
  assignedTo: string;
  notes: string;
}

interface MissingMemberReviewDrawerProps {
  person: MissingPerson;
  status: MissingTriageStatus;
  existingFollowUp?: FollowUp;
  assignedFollowUp?: AssignedFollowUp;
  fridayDateLabel: string;
  assignedToOptions: readonly string[];
  onClose: () => void;
  onMarkExcused: () => void;
  onMarkNotExpected: () => void;
  onUndo: () => void;
  onAssignFollowUp: (input: AssignedFollowUp) => void;
}

const STATUS_VARIANT: Record<MissingTriageStatus, "yellow" | "gray" | "blue"> = {
  missing: "yellow",
  excused: "gray",
  "not-expected": "gray",
  "follow-up": "blue",
};

export function MissingMemberReviewDrawer({
  person,
  status,
  existingFollowUp,
  assignedFollowUp,
  fridayDateLabel,
  assignedToOptions,
  onClose,
  onMarkExcused,
  onMarkNotExpected,
  onUndo,
  onAssignFollowUp,
}: MissingMemberReviewDrawerProps) {
  const { isRTL, attendanceReview, followUpsPage } = useTranslation();
  const member360 = person.memberId ? getMember360(person.memberId) : null;

  const [showForm, setShowForm] = React.useState(false);
  const [assignedTo, setAssignedTo] = React.useState(assignedToOptions[0] ?? "");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    setShowForm(false);
    setNotes("");
  }, [person.id]);

  const statusLabel: Record<MissingTriageStatus, string> = {
    missing: attendanceReview.statusMissing,
    excused: attendanceReview.statusExcused,
    "not-expected": attendanceReview.statusNotExpected,
    "follow-up": attendanceReview.statusFollowUp,
  };

  const recentAttendance = member360
    ? member360.attendance.records.slice(0, 5)
    : [
        { date: person.lastAttendance, service: attendanceReview.context, present: true },
      ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-xl overflow-y-auto animate-slide-in border-s border-gray-200">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{attendanceReview.reviewTitle}</h2>
          <button
            onClick={onClose}
            aria-label={attendanceReview.close}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6 text-start">
          {/* Identity */}
          <div className="flex items-center gap-4">
            <img
              src={person.avatar}
              alt={person.name}
              className="w-14 h-14 rounded-full object-cover ring-2 ring-white shadow-sm shrink-0"
            />
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-gray-900 truncate">{person.name}</h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge variant={STATUS_VARIANT[status]}>{statusLabel[status]}</Badge>
                <span className="text-xs text-gray-500">
                  {person.ministry}
                  {person.group !== "—" ? ` · ${person.group}` : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Attendance */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {attendanceReview.attendanceHistory}
            </h4>
            <div className="grid grid-cols-3 gap-px bg-gray-100 rounded-lg overflow-hidden border border-gray-100">
              <div className="bg-white px-3 py-3">
                <p className="text-[11px] text-gray-500">{attendanceReview.rate}</p>
                <p className="text-lg font-bold text-gray-900 tabular-nums">
                  <bdi dir="ltr">{person.attendanceRate}%</bdi>
                </p>
              </div>
              <div className="bg-white px-3 py-3">
                <p className="text-[11px] text-gray-500">{attendanceReview.absences}</p>
                <p className="text-lg font-bold text-amber-600 tabular-nums">
                  <bdi dir="ltr">{person.consecutiveAbsences}</bdi>
                </p>
              </div>
              <div className="bg-white px-3 py-3">
                <p className="text-[11px] text-gray-500">{attendanceReview.lastAttendance}</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  <bdi dir="ltr">{person.lastAttendance}</bdi>
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1.5">{attendanceReview.recentAttendance}</p>
              <ul className="divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden">
                {recentAttendance.map((record, index) => (
                  <li key={`${record.date}-${index}`} className="flex items-center justify-between px-3 py-2 text-sm bg-white">
                    <span className="text-gray-700">
                      <bdi dir="ltr">{record.date}</bdi>
                    </span>
                    <span className={record.present ? "text-emerald-600" : "text-gray-400"}>
                      {record.present ? "✓" : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Ministry & Groups */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                {attendanceReview.ministrySection}
              </h4>
              <p className="text-sm text-gray-900">{member360?.ministryGroups.currentMinistry ?? person.ministry}</p>
              {member360?.ministryGroups.ministryRole && member360.ministryGroups.ministryRole !== "—" && (
                <p className="text-xs text-gray-500 mt-0.5">{member360.ministryGroups.ministryRole}</p>
              )}
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                {attendanceReview.groupSection}
              </h4>
              {member360 && member360.ministryGroups.currentGroups.length > 0 ? (
                <ul className="space-y-0.5">
                  {member360.ministryGroups.currentGroups.map((group) => (
                    <li key={group.name} className="text-sm text-gray-900">
                      {group.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-900">{person.group}</p>
              )}
            </div>
          </div>

          {/* Follow-ups */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {attendanceReview.followUpsSection}
            </h4>
            {assignedFollowUp ? (
              <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2.5">
                <p className="text-sm font-semibold text-blue-800">{followUpsPage.title}</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  {attendanceReview.followUpReasonValue} · <bdi dir="ltr">{fridayDateLabel}</bdi>
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {attendanceReview.followUpAssignedTo}: {assignedFollowUp.assignedTo}
                </p>
              </div>
            ) : existingFollowUp ? (
              <div className="rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2.5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-amber-800">{attendanceReview.existingFollowUp}</p>
                  <p className="text-xs text-amber-700 mt-0.5">{existingFollowUp.reason}</p>
                </div>
                <Link
                  href={`/follow-ups?search=${encodeURIComponent(person.name)}`}
                  className="text-xs font-bold text-amber-700 hover:text-amber-800 whitespace-nowrap"
                >
                  {attendanceReview.viewFollowUp}
                </Link>
              </div>
            ) : (
              <p className="text-sm text-gray-500">{attendanceReview.noOpenFollowUp}</p>
            )}
          </div>

          {/* Activity */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {attendanceReview.activitySection}
            </h4>
            {member360 && member360.recentActivity.length > 0 ? (
              <ul className="space-y-2">
                {member360.recentActivity.slice(0, 3).map((activity) => (
                  <li key={activity.id} className="flex items-start gap-2 text-sm">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gray-300 shrink-0" />
                    <div>
                      <span className="text-gray-800">{activity.title}</span>
                      <span className="text-gray-400 mx-1">·</span>
                      <bdi dir="ltr" className="text-gray-500 text-xs">{activity.date}</bdi>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">{attendanceReview.noActivity}</p>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t border-gray-100">
            {!existingFollowUp && !assignedFollowUp && !showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm cursor-pointer"
              >
                {attendanceReview.assignFollowUp}
              </button>
            )}

            {showForm && !existingFollowUp && !assignedFollowUp && (
              <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-900">{attendanceReview.followUpFormTitle}</p>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">{attendanceReview.member}</label>
                  <p className="text-sm font-medium text-gray-900">{person.name}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">{attendanceReview.followUpReason}</label>
                  <p className="text-sm text-gray-900">{attendanceReview.followUpReasonValue}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">{attendanceReview.followUpDate}</label>
                  <p className="text-sm text-gray-900">
                    <bdi dir="ltr">{fridayDateLabel}</bdi>
                  </p>
                </div>
                <div className="space-y-1">
                  <label htmlFor="follow-up-assignee" className="text-xs text-gray-500">
                    {attendanceReview.followUpAssignedTo}
                  </label>
                  <select
                    id="follow-up-assignee"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="input w-full bg-white border border-gray-200 text-sm"
                  >
                    {assignedToOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="follow-up-notes" className="text-xs text-gray-500">
                    {attendanceReview.followUpNotes}
                  </label>
                  <textarea
                    id="follow-up-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={attendanceReview.followUpNotesPlaceholder}
                    rows={2}
                    className="input w-full bg-white border border-gray-200 text-sm resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm cursor-pointer"
                  >
                    {attendanceReview.followUpCancel}
                  </button>
                  <button
                    onClick={() => {
                      onAssignFollowUp({ assignedTo, notes });
                      setShowForm(false);
                    }}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm cursor-pointer"
                  >
                    {attendanceReview.followUpConfirm}
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={onMarkExcused}
                className="flex-1 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm cursor-pointer"
              >
                {attendanceReview.markExcused}
              </button>
              <button
                onClick={onMarkNotExpected}
                className="flex-1 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm cursor-pointer"
              >
                {attendanceReview.markNotExpected}
              </button>
            </div>

            {status !== "missing" && (
              <button
                onClick={onUndo}
                className="w-full px-3 py-2 text-gray-500 hover:text-gray-700 transition-colors font-medium text-xs cursor-pointer"
              >
                {attendanceReview.undo}
              </button>
            )}

            {person.memberId && (
              <Link
                href={`/people/${person.memberId}`}
                className="w-full inline-flex items-center justify-center gap-1 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors font-medium text-sm"
              >
                {attendanceReview.openMember}
                <span>{isRTL ? "←" : "→"}</span>
              </Link>
            )}

            <p className="text-[11px] text-gray-400 text-center pt-1">{attendanceReview.demoNote}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
