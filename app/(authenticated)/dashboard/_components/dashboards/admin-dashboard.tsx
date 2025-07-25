"use client"

import { motion } from "framer-motion"
import { 
  Crown, 
  Users, 
  BarChart3,
  Database,
  Activity,
  AlertCircle,
  Calendar,
  FileText,
  TrendingUp,
  FolderOpen,
  Plus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Roles } from "@/types/globals"
import { CJSApiStatus } from "@/components/ui/CJSApiStatus"

interface AdminDashboardProps {
  userData: {
    name: string
    email: string
    avatar: string
    role: Roles
    permissions: string[]
    userId: string
  }
}

const adminStats = [
  { 
    label: "Total Users", 
    value: "127", 
    icon: Users,
    change: "+8",
    changeType: "positive" as const
  },
  { 
    label: "Film Projects", 
    value: "24", 
    icon: FolderOpen,
    change: "+3",
    changeType: "positive" as const
  },
  { 
    label: "Scripts Analyzed", 
    value: "156", 
    icon: FileText,
    change: "+12",
    changeType: "positive" as const
  },
  { 
    label: "System Health", 
    value: "99.9%", 
    icon: Activity,
    change: "stable",
    changeType: "neutral" as const
  }
]

const recentActivity = [
  {
    action: "New film project created",
    user: "Sarah Chen",
    time: "2 minutes ago",
    type: "project"
  },
  {
    action: "Script analysis completed",
    user: "Mike Rodriguez",
    time: "15 minutes ago",
    type: "analysis"
  },
  {
    action: "Budget generated successfully",
    user: "Emily Davis",
    time: "1 hour ago",
    type: "budget"
  },
  {
    action: "Production schedule updated",
    user: "James Wilson",
    time: "2 hours ago",
    type: "schedule"
  }
]

const quickActions = [
  {
    name: "Create New Project",
    description: "Start a new film production project",
    icon: Plus,
    href: "/dashboard/admin/projects/create",
    color: "text-blue-500"
  },
  {
    name: "Manage Projects",
    description: "View and organize all projects",
    icon: FolderOpen,
    href: "/dashboard/admin/projects",
    color: "text-green-500"
  },
  {
    name: "Script Analysis",
    description: "Detailed AI-powered script breakdown",
    icon: FileText,
    href: "/dashboard/admin/script-analysis",
    color: "text-purple-500"
  },
  {
    name: "Production Schedule",
    description: "Generate and manage shooting schedules",
    icon: Calendar,
    href: "/dashboard/admin/schedule",
    color: "text-orange-500"
  }
]

const systemAlerts = [
  {
    type: "warning",
    message: "Storage approaching 70% capacity",
    action: "Manage Storage"
  },
  {
    type: "info",
    message: "Weekly backup scheduled for tonight",
    action: "View Schedule"
  }
]

export function AdminDashboard({ userData }: AdminDashboardProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-purple-500 text-white p-2 rounded-lg">
            <Crown className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Admin Control Center
            </h1>
            <p className="text-muted-foreground">
              Complete system oversight and management - Welcome, {userData.name}
            </p>
          </div>
        </motion.div>
        
        <Badge variant="secondary" className="w-fit">
          Administrator Access
        </Badge>
      </div>

      {/* System Alerts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* CJS API Status */}
            <div className="p-3 rounded-lg border bg-muted/50">
              <CJSApiStatus showDetails={false} />
            </div>
            
            {/* System Alerts */}
            {systemAlerts.map((alert, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-sm">{alert.message}</span>
                <Button variant="outline" size="sm">
                  {alert.action}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <motion.div 
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {adminStats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className={`text-xs ${
                      stat.changeType === 'positive' 
                        ? 'text-green-600' 
                        : (stat.changeType as any) === 'warning'
                        ? 'text-yellow-600'
                        : 'text-muted-foreground'
                    }`}>
                      {stat.change !== 'stable' ? `${stat.change} this week` : 'Stable'}
                    </p>
                  </div>
                  <stat.icon className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Recent Activity */}
        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Activity</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/admin/activity">View All</Link>
                </Button>
              </div>
              <CardDescription>
                Latest system and user activities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivity.map((activity, index) => (
                <motion.div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                >
                  <div>
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">by {activity.user}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common administrative tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                >
                  <Button variant="outline" className="w-full justify-start h-auto p-4" asChild>
                    <Link href={action.href}>
                      <action.icon className={`mr-3 h-5 w-5 ${action.color}`} />
                      <div className="text-left">
                        <div className="font-medium">{action.name}</div>
                        <div className="text-xs text-muted-foreground">{action.description}</div>
                      </div>
                    </Link>
                  </Button>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
} 