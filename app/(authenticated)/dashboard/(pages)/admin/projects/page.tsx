"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelectedProject } from '@/hooks/useSelectedProject';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, MoreVertical, Calendar, FileText, Users, MapPin } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProjectData } from '@/lib/types';

export default function ProjectsPage() {
  const router = useRouter();
  const { selectProject } = useSelectedProject();
  const [projects, setProjects] = useState<ProjectData[]>([]);

  useEffect(() => {
    const storedProjects = JSON.parse(localStorage.getItem('filmustage_projects') || '[]');
    setProjects(storedProjects);
  }, []);

  const handleDeleteProject = (projectId: string) => {
    const updatedProjects = projects.filter(project => project.id !== projectId);
    setProjects(updatedProjects);
    localStorage.setItem('filmustage_projects', JSON.stringify(updatedProjects));
  };

  const handleSelectProject = (project: ProjectData) => {
    selectProject(project);
    // Navigate to script analysis after selecting project
    router.push('/dashboard/admin/script-analysis');
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">🎬 Project Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage your film production projects
            </p>
          </div>
          <Button
            onClick={() => router.push('/dashboard/admin/projects/create')}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create New Project ({projects.length})
          </Button>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-medium mb-2">No Projects Yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first film production project to get started with AI-powered analysis
              </p>
              <Button
                onClick={() => router.push('/dashboard/admin/projects/create')}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Your First Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.filter(project => project && project.id).map((project) => (
              <Card 
                key={project.id} 
                className="hover:shadow-lg transition-all cursor-pointer relative group"
                onClick={() => handleSelectProject(project)}
              >
                <div className="absolute top-3 right-3 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project.id);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete Project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <CardContent className="p-0">
                  {/* Project Thumbnail */}
                  <div className="relative h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-t-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white mb-1">
                        {project.name?.charAt(0)?.toUpperCase() || 'P'}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Active
                      </Badge>
                    </div>
                  </div>

                  {/* Project Details */}
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-1">
                      {project.name || 'Untitled Project'}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                      {project.description || "AI-powered film production project with script analysis, scheduling, and budget planning capabilities."}
                    </p>
                    
                    {/* Project Stats */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        <span>Script</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>Analysis</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>Locations</span>
                      </div>
                    </div>

                    <div className="flex items-center text-muted-foreground text-sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Created {formatDate(project.created)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}