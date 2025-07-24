import { useState, useEffect } from 'react';
import { ProjectData } from '@/lib/types';

export const useSelectedProject = () => {
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProject = () => {
      // Check if this is a fresh app load (not just a component mount)
      const isAppStartup = !sessionStorage.getItem('app_loaded');
      
      console.log('useSelectedProject loadProject:', { isAppStartup });
      
      if (isAppStartup) {
        // On app startup, clear any selected project to show project list first
        console.log('App startup - clearing project');
        localStorage.removeItem('selected_project');
        sessionStorage.setItem('app_loaded', 'true');
        setSelectedProject(null);
      } else {
        // On subsequent component mounts, load from localStorage
        const stored = localStorage.getItem('selected_project');
        console.log('Loading from localStorage:', stored);
        if (stored) {
          try {
            const project = JSON.parse(stored);
            console.log('Loaded project:', project.name);
            setSelectedProject(project);
          } catch (error) {
            console.error('Error parsing selected project:', error);
            localStorage.removeItem('selected_project');
            setSelectedProject(null);
          }
        } else {
          setSelectedProject(null);
        }
      }
      setIsLoading(false);
    };

    // Load initially
    loadProject();

    // Listen for storage changes (from other tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'selected_project') {
        loadProject();
      }
    };

    // Listen for custom events (for same-tab updates)
    const handleProjectChange = () => {
      loadProject();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('projectChanged', handleProjectChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('projectChanged', handleProjectChange);
    };
  }, []);

  const selectProject = (project: ProjectData) => {
    localStorage.setItem('selected_project', JSON.stringify(project));
    setSelectedProject(project);
    
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('projectChanged'));
  };

  const clearProject = () => {
    localStorage.removeItem('selected_project');
    setSelectedProject(null);
    
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('projectChanged'));
  };

  return {
    selectedProject,
    isLoading,
    selectProject,
    clearProject
  };
};