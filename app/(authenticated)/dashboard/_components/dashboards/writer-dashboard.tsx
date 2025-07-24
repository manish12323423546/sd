"use client"

import { motion } from "framer-motion"
import { 
  Edit3, 
  FileText, 
  Clock, 
  BookOpen,
  Plus,
  TrendingUp,
  CheckCircle,
  Calendar,
  Search,
  Brain
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Roles } from "@/types/globals"

interface WriterDashboardProps {
  userData: {
    name: string
    email: string
    avatar: string
    role: Roles
    permissions: string[]
    userId: string
  }
}

const writerStats = [
  { 
    label: "Active Scripts", 
    value: "5", 
    icon: FileText,
    change: "+2",
    changeType: "positive" as const
  },
  { 
    label: "Words Written", 
    value: "12,847", 
    icon: Edit3,
    change: "+2,340",
    changeType: "positive" as const
  },
  { 
    label: "Hours This Week", 
    value: "18", 
    icon: Clock,
    change: "+6",
    changeType: "positive" as const
  },
  { 
    label: "Completion Rate", 
    value: "87%", 
    icon: TrendingUp,
    change: "+12%",
    changeType: "positive" as const
  }
]

const recentScripts = [
  {
    title: "The Silent Echo - Act 1",
    status: "In Progress",
    progress: 75,
    lastUpdate: "2 hours ago",
    wordCount: "2,847"
  },
  {
    title: "City Lights - Revision",
    status: "Review",
    progress: 100,
    lastUpdate: "1 day ago",
    wordCount: "3,200"
  },
  {
    title: "Beyond Tomorrow - Pilot",
    status: "Draft",
    progress: 45,
    lastUpdate: "3 days ago",
    wordCount: "1,890"
  }
]

const quickActions = [
  {
    name: "New Script",
    description: "Start a new screenplay",
    icon: Plus,
    href: "/dashboard/scripts/create",
    color: "text-blue-500"
  },
  {
    name: "Writing Sessions",
    description: "Track your writing time",
    icon: Clock,
    href: "/dashboard/scripts/sessions",
    color: "text-green-500"
  },
  {
    name: "Story Notes",
    description: "Review character notes",
    icon: BookOpen,
    href: "/dashboard/scripts/notes",
    color: "text-purple-500"
  },
  {
    name: "Deadlines",
    description: "Check upcoming deadlines",
    icon: Calendar,
    href: "/dashboard/scripts/deadlines",
    color: "text-orange-500"
  }
]

const thinkAiActions = [
  {
    name: "Script Analysis",
    description: "AI-powered detailed scene breakdown and analysis",
    icon: Search,
    href: "/dashboard/writer/script-analysis",
    color: "text-blue-500"
  }
]

export function WriterDashboard({ userData }: WriterDashboardProps) {
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
          <div className="bg-blue-500 text-white p-2 rounded-lg">
            <Edit3 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Writer's Studio
            </h1>
            <p className="text-muted-foreground">
              Welcome back, {userData.name}! Ready to craft your next story?
            </p>
          </div>
        </motion.div>
      </div>

      {/* Stats Grid */}
      <motion.div 
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {writerStats.map((stat, index) => (
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
                        : 'text-red-600'
                    }`}>
                      {stat.change} this week
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
        {/* Recent Scripts */}
        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Scripts</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/scripts">View All</Link>
                </Button>
              </div>
              <CardDescription>
                Your latest writing projects and their progress
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentScripts.map((script, index) => (
                <motion.div
                  key={script.title}
                  className="rounded-lg border p-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-medium">{script.title}</h3>
                      <p className="text-sm text-muted-foreground">{script.wordCount} words</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">
                        {script.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">{script.lastUpdate}</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${script.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{script.progress}% complete</p>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions and Think AI */}
        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Jump into your writing workflow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.name}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                >
                  <Button 
                    variant="outline" 
                    className="w-full h-auto p-4 justify-start"
                    asChild
                  >
                    <Link href={action.href}>
                      <action.icon className={`h-5 w-5 mr-3 ${action.color}`} />
                      <div className="text-left">
                        <div className="font-medium">{action.name}</div>
                        <div className="text-sm text-muted-foreground">{action.description}</div>
                      </div>
                    </Link>
                  </Button>
                </motion.div>
              ))}
            </CardContent>
          </Card>

          {/* Think AI Tools */}
          <Card className="border-purple-200 bg-purple-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />
                Think AI Tools
              </CardTitle>
              <CardDescription>
                AI-powered script analysis and development
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {thinkAiActions.map((action, index) => (
                <motion.div
                  key={action.name}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.9 + index * 0.1 }}
                >
                  <Button 
                    variant="outline" 
                    className="w-full h-auto p-4 justify-start border-purple-200 hover:bg-purple-50"
                    asChild
                  >
                    <Link href={action.href}>
                      <action.icon className={`h-5 w-5 mr-3 ${action.color}`} />
                      <div className="text-left">
                        <div className="font-medium">{action.name}</div>
                        <div className="text-sm text-muted-foreground">{action.description}</div>
                      </div>
                    </Link>
                  </Button>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Writing Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Today's Writing Tip
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              "The first draft of anything is shit." - Ernest Hemingway. Don't worry about perfection 
              in your first draft. Focus on getting the story down, then polish it in revisions.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
} 