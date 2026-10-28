"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  summary: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export function CollapsibleSection({
  title,
  summary,
  children,
  defaultExpanded = false,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = React.useState(0);

  React.useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [expanded]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Collapsed: summary bar with chevron */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className={cn(
            "w-full flex items-center justify-between px-6 py-4 text-left",
            "transition-colors duration-200",
            "hover:bg-gray-50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
          )}
          aria-expanded={false}
          aria-controls={`collapsible-${title.replace(/\s/g, "-").toLowerCase()}`}
        >
          <div className="min-w-0 flex-1">{summary}</div>
          <div className="ml-4 shrink-0">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
      )}

      {/* Expanded: collapse bar + child content */}
      {expanded && (
        <>
          <button
            onClick={() => setExpanded(false)}
            className={cn(
              "w-full flex items-center justify-end px-6 py-2.5 text-left",
              "transition-colors duration-200",
              "hover:bg-gray-50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
            )}
            aria-expanded={true}
            aria-controls={`collapsible-${title.replace(/\s/g, "-").toLowerCase()}`}
          >
            <span className="text-xs text-gray-400 mr-2">Collapse</span>
            <svg className="w-4 h-4 text-gray-400 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div
            id={`collapsible-${title.replace(/\s/g, "-").toLowerCase()}`}
            role="region"
            aria-label={title}
          >
            <div ref={contentRef}>{children}</div>
          </div>
        </>
      )}
    </div>
  );
}
