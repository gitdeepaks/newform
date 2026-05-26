"use client";

import type { CSSProperties, ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthGate } from "@/components/auth/auth-gate";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

type DashboardShellStyle = CSSProperties & {
  "--sidebar-width": string;
  "--header-height": string;
};

const dashboardShellStyle: DashboardShellStyle = {
  "--sidebar-width": "calc(var(--spacing) * 72)",
  "--header-height": "calc(var(--spacing) * 12)",
};

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <AuthGate mode="auth">
      <SidebarProvider style={dashboardShellStyle}>
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </AuthGate>
  );
}
