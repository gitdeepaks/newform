"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import {
  SidebarLogoutButton,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useLogout } from "@/hooks/api/auth"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
  }
}) {
  const router = useRouter()
  const { logoutAsync, logoutIsPending } = useLogout()
  const firstName = user.name.split(" ")[0] || user.name
  const fallbackInitials = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "NF"

  async function handleLogout() {
    try {
      await logoutAsync()
      toast.success("Logged out")
    } catch {
      toast.message("Signing out locally")
    } finally {
      router.replace("/login")
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-2">
          <div className="flex items-center gap-3 p-1">
            <Avatar className="h-9 w-9 rounded-lg">
              <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                {fallbackInitials}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            </div>
          </div>
          <SidebarLogoutButton
            className="mt-2"
            isPending={logoutIsPending}
            onClick={handleLogout}
          >
            {logoutIsPending ? "Logging out..." : `Log out ${firstName}`}
          </SidebarLogoutButton>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
