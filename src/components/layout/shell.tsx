"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { TopNav } from "./top-nav";

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-200"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar: permanently visible on desktop (lg+), responsive slide-over drawer on mobile (<lg) */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out shrink-0",
          // Mobile layout (<1024px): fixed drawer overlay
          "fixed inset-y-0 start-0 z-50",
          // Desktop layout (>=1024px): static in-flow sidebar, never translated off-screen
          "lg:static lg:z-0 lg:translate-x-0 lg:transform-none lg:ltr:translate-x-0 lg:rtl:translate-x-0",
          // Mobile state: slide in when open, slide off-screen when closed
          mobileMenuOpen
            ? "translate-x-0"
            : "max-lg:-translate-x-full max-lg:rtl:translate-x-full"
        )}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onNavigate={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav
          onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
