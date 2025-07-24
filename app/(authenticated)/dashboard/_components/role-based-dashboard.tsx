"use client"

import { Roles } from "@/types/globals"
import { AdminDashboard } from "./dashboards/admin-dashboard"
import { WriterDashboard } from "./dashboards/writer-dashboard"
import { ProducerDashboard } from "./dashboards/producer-dashboard"
import { DirectorDashboard } from "./dashboards/director-dashboard"
import { TeamMemberDashboard } from "./dashboards/team-member-dashboard"
import { redirect } from "next/navigation"

interface UserMetadata {
  role?: Roles
  permissions?: string[]
  projects?: string[]
}

interface UserData {
  name: string
  email: string
  avatar: string
  role: Roles | null
  permissions: string[]
  userId: string
  unsafeMetadata?: UserMetadata
  publicMetadata?: UserMetadata
}

interface RoleBasedDashboardProps {
  userData: UserData
}

export function RoleBasedDashboard({ userData }: RoleBasedDashboardProps) {
  // If no role is assigned, redirect to role selection
  if (!userData.role) {
    redirect("/role-selection")
  }

  // Create a user data object with guaranteed non-null role for dashboard components
  const dashboardUserData = {
    ...userData,
    role: userData.role as Roles // Safe to cast since we checked above
  }

  switch (userData.role) {
    case "admin":
      return <AdminDashboard userData={dashboardUserData} />
    case "writer":
      return <WriterDashboard userData={dashboardUserData} />
    case "producer":
      return <ProducerDashboard userData={dashboardUserData} />
    case "director":
      return <DirectorDashboard userData={dashboardUserData} />
    case "team_member":
      return <TeamMemberDashboard userData={dashboardUserData} />
    default:
      redirect("/role-selection")
  }
} 