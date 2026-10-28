"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import { followUps } from "@/lib/mock-data/follow-ups";
import {
  getMissingToday,
  getMissingPersonById,
  getOpenFollowUpForName,
  getTriageStatus,
  filterMissingPeople,
  getMinistryOptions,
  getGroupOptions,
  computeReconciliation,
  type MissingPerson,
  type MissingStatusFilter,
  type MissingTriageStatus,
} from "@/lib/attendance/friday-reconciliation";
import { MissingMemberReviewDrawer } from "@/components/attendance/missing-member-review-drawer";

interface AssignedFollowUp {
  assignedTo: string;
  notes: string;
}

interface AttendanceReviewPanelProps {
  effectiveNow: Date;
  /** When true (dashboard → ?view=missing) the Missing filter is preselected. */
  initialViewMissing?: boolean;
}

const STATUS_BADGE: Record<MissingTriageStatus, "yellow" | "gray" | "blue"> = {
  missing: "yellow",
  excused: "gray",
  "not-expected": "gray",
  "follow-up": "blue",
};

export function AttendanceReviewPanel({ effectiveNow, initialViewMissing = false }: AttendanceReviewPanelProps) {
  const { isRTL, locale, attendanceReview } = useTranslation();

  const roster = React.useMemo(() => getMissingToday(), []);
  const ministryOptions = React.useMemo(() => getMinistryOptions(roster), [roster]);
  const groupOptions = React.useMemo(() => getGroupOptions(roster), [roster]);
  const assignedToOptions = React.useMemo(
    () => Array.from(new Set(followUps.map((f) => f.assignedTo))),
    []
  );

  const [statuses, setStatuses] = React.useState<Record<string, MissingTriageStatus>>({});
  const [assignedFollowUps, setAssignedFollowUps] = React.useState<Record<string, AssignedFollowUp>>({});
  const [statusFilter, setStatusFilter] = React.useState<MissingStatusFilter>("all");
  const [ministryFilter, setMinistryFilter] = React.useState("all");
  const [groupFilter, setGroupFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  // Lightweight query-param handling (no new route). Read directly to avoid
  // pulling the page out of static rendering via useSearchParams.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const view = new URLSearchParams(window.location.search).get("view");
    if (view === "missing" || initialViewMissing) setStatusFilter("missing");
  }, [initialViewMissing]);

  React.useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const summary = React.useMemo(() => computeReconciliation(statuses), [statuses]);
  const filtered = React.useMemo(
    () =>
      filterMissingPeople(roster, statuses, {
        status: statusFilter,
        ministry: ministryFilter,
        group: groupFilter,
        search,
      }),
    [roster, statuses, statusFilter, ministryFilter, groupFilter, search]
  );

  const fridayDateLabel = React.useMemo(
    () =>
      effectiveNow.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    [effectiveNow, locale]
  );

  const statusLabel: Record<MissingTriageStatus, string> = {
    missing: attendanceReview.statusMissing,
    excused: attendanceReview.statusExcused,
    "not-expected": attendanceReview.statusNotExpected,
    "follow-up": attendanceReview.statusFollowUp,
  };

  const setStatus = (id: string, status: MissingTriageStatus) =>
    setStatuses((prev) => ({ ...prev, [id]: status }));

  const undoStatus = (id: string) =>
    setStatuses((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  const assignFollowUp = (person: MissingPerson, input: AssignedFollowUp) => {
    setAssignedFollowUps((prev) => ({ ...prev, [person.id]: input }));
    setStatus(person.id, "follow-up");
    setToast(attendanceReview.followUpCreated);
  };

  const selectedPerson = selectedId ? getMissingPersonById(selectedId) ?? null : null;

  const summaryTiles = [
    { key: "present", label: attendanceReview.present, value: summary.present, className: "text-gray-900" },
    { key: "expected", label: attendanceReview.expected, value: summary.expected, className: "text-gray-900" },
    { key: "missing", label: attendanceReview.missing, value: summary.missing, className: "text-amber-600" },
    { key: "attendance", label: attendanceReview.attendance, value: `${summary.attendanceRate}%`, className: "text-blue-600" },
    { key: "excused", label: attendanceReview.excused, value: summary.excused, className: "text-gray-500" },
    { key: "notExpected", label: attendanceReview.notExpected, value: summary.notExpected, className: "text-gray-500" },
    { key: "followUp", label: attendanceReview.followUpNeeded, value: summary.followUpNeeded, className: "text-blue-600" },
  ];

  return (
    <section className="space-y-6" data-testid="attendance-review-panel">
      {/* Review banner */}
      <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <div>
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">{attendanceReview.title}</p>
            <p className="text-sm text-gray-600 mt-0.5">
              {attendanceReview.context} · {attendanceReview.windowClosedAt}
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-gray-500">
          <bdi dir="ltr">{fridayDateLabel}</bdi>
        </span>
      </div>

      {/* Reconciliation summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-px bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
        {summaryTiles.map((tile) => (
          <div key={tile.key} className="bg-white px-4 py-3.5">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider truncate">{tile.label}</p>
            <p className={`mt-1 text-xl font-bold tabular-nums ${tile.className}`}>
              <bdi dir="ltr">{tile.value}</bdi>
            </p>
          </div>
        ))}
      </div>

      {/* Missing Today */}
      <Card data-testid="missing-today">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{attendanceReview.missingToday}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{attendanceReview.missingTodaySubtitle}</p>
            </div>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-3 py-1">
              {attendanceReview.showingCount}: <bdi dir="ltr">{filtered.length}</bdi> /{" "}
              <bdi dir="ltr">{roster.length}</bdi>
            </span>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as MissingStatusFilter)}
              aria-label={attendanceReview.filterStatus}
              className="input w-full bg-white border border-gray-200 text-sm"
            >
              <option value="all">{attendanceReview.all}</option>
              <option value="missing">{attendanceReview.statusMissing}</option>
              <option value="excused">{attendanceReview.statusExcused}</option>
              <option value="not-expected">{attendanceReview.statusNotExpected}</option>
              <option value="follow-up">{attendanceReview.statusFollowUp}</option>
            </select>
            <select
              value={ministryFilter}
              onChange={(e) => setMinistryFilter(e.target.value)}
              aria-label={attendanceReview.filterMinistry}
              className="input w-full bg-white border border-gray-200 text-sm"
            >
              <option value="all">{attendanceReview.allMinistries}</option>
              {ministryOptions.map((ministry) => (
                <option key={ministry} value={ministry}>
                  {ministry}
                </option>
              ))}
            </select>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              aria-label={attendanceReview.filterGroup}
              className="input w-full bg-white border border-gray-200 text-sm"
            >
              <option value="all">{attendanceReview.allGroups}</option>
              {groupOptions.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={attendanceReview.searchPlaceholder}
              aria-label={attendanceReview.searchPlaceholder}
              className="input w-full bg-white border border-gray-200 text-sm"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-sm font-medium text-gray-500">{attendanceReview.noMissing}</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-start text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">{attendanceReview.member}</th>
                      <th className="text-start text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">{attendanceReview.ministry}</th>
                      <th className="text-start text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">{attendanceReview.group}</th>
                      <th className="text-start text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">{attendanceReview.lastAttendance}</th>
                      <th className="text-end text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">{attendanceReview.attendanceRate}</th>
                      <th className="text-end text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">{attendanceReview.consecutiveAbsences}</th>
                      <th className="text-end text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">{attendanceReview.action}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((person) => {
                      const status = getTriageStatus(statuses, person.id);
                      return (
                        <tr key={person.id} className="hover:bg-gray-50 transition-colors duration-150" data-testid="missing-today-row">
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <img src={person.avatar} alt={person.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{person.name}</p>
                                <Badge variant={STATUS_BADGE[status]} className="mt-0.5">
                                  {statusLabel[status]}
                                </Badge>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-gray-600 whitespace-nowrap">{person.ministry}</td>
                          <td className="px-4 py-3.5 text-sm text-gray-600 whitespace-nowrap">{person.group}</td>
                          <td className="px-4 py-3.5 text-sm text-gray-600 whitespace-nowrap"><bdi dir="ltr">{person.lastAttendance}</bdi></td>
                          <td className="px-4 py-3.5 text-sm font-semibold text-gray-900 text-end tabular-nums"><bdi dir="ltr">{person.attendanceRate}%</bdi></td>
                          <td className="px-4 py-3.5 text-sm text-amber-600 font-semibold text-end tabular-nums"><bdi dir="ltr">{person.consecutiveAbsences}</bdi></td>
                          <td className="px-6 py-3.5 text-end">
                            <button
                              onClick={() => setSelectedId(person.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                              {attendanceReview.review}
                              <span>{isRTL ? "←" : "→"}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {filtered.map((person) => {
                  const status = getTriageStatus(statuses, person.id);
                  return (
                    <div key={person.id} className="p-4" data-testid="missing-today-card">
                      <div className="flex items-start gap-3">
                        <img src={person.avatar} alt={person.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900">{person.name}</p>
                            <Badge variant={STATUS_BADGE[status]}>{statusLabel[status]}</Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {person.ministry}
                            {person.group !== "—" ? ` · ${person.group}` : ""}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>
                              {attendanceReview.attendanceRate}:{" "}
                              <bdi dir="ltr" className="font-semibold text-gray-700">{person.attendanceRate}%</bdi>
                            </span>
                            <span>
                              {attendanceReview.consecutiveAbsences}:{" "}
                              <bdi dir="ltr" className="font-semibold text-amber-600">{person.consecutiveAbsences}</bdi>
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedId(person.id)}
                        className="mt-3 w-full inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        {attendanceReview.review}
                        <span>{isRTL ? "←" : "→"}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {selectedPerson && (
        <MissingMemberReviewDrawer
          person={selectedPerson}
          status={getTriageStatus(statuses, selectedPerson.id)}
          existingFollowUp={getOpenFollowUpForName(selectedPerson.name)}
          assignedFollowUp={assignedFollowUps[selectedPerson.id]}
          fridayDateLabel={fridayDateLabel}
          assignedToOptions={assignedToOptions}
          onClose={() => setSelectedId(null)}
          onMarkExcused={() => setStatus(selectedPerson.id, "excused")}
          onMarkNotExpected={() => setStatus(selectedPerson.id, "not-expected")}
          onUndo={() => undoStatus(selectedPerson.id)}
          onAssignFollowUp={(input) => assignFollowUp(selectedPerson, input)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 start-1/2 -translate-x-1/2 z-[60] rtl:translate-x-1/2">
          <div className="flex items-center gap-3 rounded-lg bg-gray-900 text-white text-sm px-4 py-2.5 shadow-lg">
            <span>{toast}</span>
            <button onClick={() => setToast(null)} className="text-gray-400 hover:text-white cursor-pointer">
              ✕
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
