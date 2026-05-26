"use client";

import * as React from "react";
import {
  IconClipboardText,
  IconDashboard,
  IconLayoutCards,
  IconReceipt,
  IconShieldLock,
} from "@tabler/icons-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useUser } from "@/hooks/api/auth";

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Forms",
      url: "/dashboard/forms",
      icon: IconClipboardText,
    },
    {
      title: "Templates",
      url: "/templates",
      icon: IconLayoutCards,
    },
    {
      title: "Pricing",
      url: "/pricing",
      icon: IconReceipt,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useUser();
  const sidebarUser = {
    name: user?.fullName ?? "Newform Creator",
    email: user?.email ?? "",
  };
  const navMain = user?.role === "admin"
    ? [...data.navMain, { title: "Admin", url: "/admin", icon: IconShieldLock }]
    : data.navMain;

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
              <a href="/dashboard">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                  N
                </span>
                <span className="text-base font-semibold">Newform</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sidebarUser} />
      </SidebarFooter>
    </Sidebar>
  );
}
