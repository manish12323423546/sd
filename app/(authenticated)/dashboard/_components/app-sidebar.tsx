"use client"

import { NavMain } from "@/app/(authenticated)/dashboard/_components/nav-main"
import { NavUser } from "@/app/(authenticated)/dashboard/_components/nav-user"
import { TeamSwitcher } from "@/app/(authenticated)/dashboard/_components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail
} from "@/components/ui/sidebar"
import { Roles } from "@/types/globals"
import { 
  Film, 
  BarChart3, 
  FileText,
  Calendar,
  DollarSign,
  FolderOpen
} from "lucide-react"

// Define navigation items based on roles
const getNavigationItems = (role: Roles, permissions: string[]) => {
  const items = []

  // Dashboard - available to all
  items.push({
    title: "Dashboard",
    url: "/dashboard",
    icon: BarChart3,
    isActive: false
  })


  // Project Management - admin only
  if (role === 'admin') {
    items.push({
      title: "Projects",
      url: "/dashboard/admin/projects",
      icon: FolderOpen,
      items: [
        {
          title: "All Projects",
          url: "/dashboard/admin/projects",
          icon: FolderOpen
        }
      ]
    })
  }

  // Think AI Features - admin only
  if (role === 'admin') {
    items.push({
      title: "Think AI",
      url: "/dashboard/admin/script-analysis",
      icon: Film,
      items: [
        {
          title: "Script Analysis",
          url: "/dashboard/admin/script-analysis",
          icon: FileText
        },
        {
          title: "Schedule",
          url: "/dashboard/admin/schedule",
          icon: Calendar
        },
        {
          title: "Budget",
          url: "/dashboard/admin/budget",
          icon: DollarSign
        }
      ]
    })
  }


  return items
}

export function AppSidebar({ 
  userData,
  ...props 
}: React.ComponentProps<typeof Sidebar> & {
  userData: {
    name: string
    email: string
    avatar: string
    membership: string
    role: Roles
    permissions: string[]
    userId: string
  }
}) {
  const navigationItems = getNavigationItems(userData.role, userData.permissions)

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher role={userData.role} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navigationItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
