import { auth } from "@clerk/nextjs/server"
import { clerkClient } from "@clerk/nextjs/server"
import { currentUser } from "@clerk/nextjs/server"
import { Roles } from "@/types/globals"
import { ROLE_PERMISSIONS, type Permission } from "./roles"
import { createComponentLogger } from "@/lib/logger"

// Server-side role checking
export async function checkRole(role: Roles) {
  const { sessionClaims } = await auth()
  const userRole = ((sessionClaims?.unsafeMetadata as any)?.role || (sessionClaims?.metadata as any)?.role) as Roles
  return userRole === role
}

export async function checkPermission(permission: string) {
  const { sessionClaims } = await auth()
  const userRole = ((sessionClaims?.unsafeMetadata as any)?.role || (sessionClaims?.metadata as any)?.role) as Roles
  if (!userRole) return false
  
  const userPermissions = ROLE_PERMISSIONS[userRole] || []
  return (userPermissions as readonly string[]).includes(permission)
}

export async function getCurrentUserRole(): Promise<Roles | null> {
  try {
    // Get current user data directly instead of relying on session claims
    const user = await currentUser()
    if (!user) return null
    
    // Check user metadata directly
    const role = user.unsafeMetadata?.role || user.publicMetadata?.role || user.privateMetadata?.role
    
    return role as Roles || null
  } catch (error) {
    const logger = createComponentLogger('roles-server')
    logger.error('Failed to get current user role', error instanceof Error ? error : new Error('Unknown error'))
    return null
  }
}

export async function getCurrentUserPermissions(): Promise<string[]> {
  const { sessionClaims } = await auth()
  const userRole = ((sessionClaims?.unsafeMetadata as any)?.role || (sessionClaims?.metadata as any)?.role) as Roles
  if (!userRole) return []
  
  return [...ROLE_PERMISSIONS[userRole]]
}

// Set user role (for admin use)
export async function setUserRole(userId: string, role: Roles) {
  try {
    const client = await clerkClient()
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: role,
        permissions: [...ROLE_PERMISSIONS[role]]
      }
    })
    return { success: true }
  } catch (error) {
    const logger = createComponentLogger('roles-server')
    logger.error('Failed to set user role', error instanceof Error ? error : new Error('Unknown error'), { 
      component: 'roles-server',
      metadata: { userId, role }
    })
    return { success: false, error: 'Failed to set user role' }
  }
}

// Check if user has access to specific project
export async function hasProjectAccess(projectId: string): Promise<boolean> {
  const { sessionClaims } = await auth()
  const userRole = ((sessionClaims?.unsafeMetadata as any)?.role || (sessionClaims?.metadata as any)?.role) as Roles
  const projectAccess = (sessionClaims?.unsafeMetadata as any)?.projects || (sessionClaims?.metadata as any)?.projects || []
  
  // Admins and producers have access to all projects
  if (userRole === 'admin' || userRole === 'producer') {
    return true
  }
  
  // Check if user has specific project access
  return projectAccess.includes(projectId)
} 