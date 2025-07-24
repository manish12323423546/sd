"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { generateProductionScheduleWithAI, ProductionScheduleOutput, ScriptAnalysisInput } from '@/lib/services/schedulingGeneratorService';
import DepthSchedulingAnalysisService, { DepthSchedulingResult, SchedulingScenario, TierProgress } from '@/lib/services/depthSchedulingAnalysisService';
import { 
  Plus, 
  Share2, 
  Download, 
  Calendar, 
  Clock, 
  Users, 
  DollarSign, 
  AlertTriangle, 
  MapPin, 
  Wand2, 
  Brain, 
  CheckCircle, 
  Loader2, 
  Wrench, 
  BarChart3, 
  Zap, 
  Edit3, 
  Save, 
  X, 
  RotateCcw, 
  Code, 
  Copy, 
  ChevronDown, 
  ChevronRight, 
  ChevronUp, 
  Target, 
  TrendingUp, 
  Shield
} from 'lucide-react';
import { useSelectedProject } from '@/hooks/useSelectedProject';
import { toast } from 'sonner';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Global scheduling service lock to prevent multiple simultaneous AI calls
const SCHEDULING_LOCK_KEY = 'scheduling_ai_service_running';
const SCHEDULING_LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes timeout
const AUTO_GENERATION_ATTEMPTED_KEY = 'scheduling_auto_generation_attempted';

// Check if scheduling service is currently running globally
const isSchedulingServiceRunning = () => {
  const lockData = localStorage.getItem(SCHEDULING_LOCK_KEY);
  if (!lockData) return false;
  
  try {
    const { timestamp } = JSON.parse(lockData);
    const now = Date.now();
    
    if (now - timestamp > SCHEDULING_LOCK_TIMEOUT) {
      localStorage.removeItem(SCHEDULING_LOCK_KEY);
      return false;
    }
    
    return true;
  } catch {
    localStorage.removeItem(SCHEDULING_LOCK_KEY);
    return false;
  }
};

// Set global scheduling service lock
const setSchedulingServiceLock = (projectId: string) => {
  const lockData = {
    projectId,
    timestamp: Date.now()
  };
  localStorage.setItem(SCHEDULING_LOCK_KEY, JSON.stringify(lockData));
  console.log('🔒 Scheduling AI service lock set for project:', projectId);
};

// Remove global scheduling service lock
const removeSchedulingServiceLock = () => {
  localStorage.removeItem(SCHEDULING_LOCK_KEY);
  console.log('🔓 Scheduling AI service lock removed');
};

// Sortable Scene Component for drag-and-drop
function SortableScene({ scene, index }: { scene: any, index: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: scene.id || `scene-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white border rounded-lg p-4 cursor-move hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="font-medium">Scene {scene.number || index + 1}</span>
          </div>
          <Badge variant="outline">{scene.location || 'Unknown Location'}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{scene.timeOfDay || 'Day'}</Badge>
          <div className="text-sm text-muted-foreground">
            {scene.estimatedDuration || '30'} min
          </div>
        </div>
      </div>
      
      <div className="mt-2">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {scene.description || scene.summary || 'No description available'}
        </p>
      </div>

      {scene.characters && scene.characters.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {scene.characters.slice(0, 3).map((character: string, i: number) => (
            <Badge key={i} variant="outline" className="text-xs">
              {character}
            </Badge>
          ))}
          {scene.characters.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{scene.characters.length - 3} more
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

export default function SchedulePage() {
  const { selectedProject } = useSelectedProject();
  
  const [activeView, setActiveView] = useState<'overview' | 'schedule' | 'cast' | 'locations' | 'equipment' | 'conflicts' | 'optimization' | 'depth-analysis'>('overview');
  const [productionSchedule, setProductionSchedule] = useState<ProductionScheduleOutput | null>(null);
  const [originalSchedule, setOriginalSchedule] = useState<ProductionScheduleOutput | null>(null);
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Depth Analysis State
  const [depthSchedulingResults, setDepthSchedulingResults] = useState<DepthSchedulingResult | null>(null);
  const [isDepthAnalyzing, setIsDepthAnalyzing] = useState(false);
  const [depthAnalysisError, setDepthAnalysisError] = useState('');
  const [tierProgress, setTierProgress] = useState<TierProgress[]>([]);
  const [currentTier, setCurrentTier] = useState('');
  const [optimizationScenarios, setOptimizationScenarios] = useState<SchedulingScenario[]>([]);

  // Scene management for drag-and-drop
  const [scenes, setScenes] = useState<any[]>([]);
  const [selectedScenes, setSelectedScenes] = useState<string[]>([]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load existing schedule on component mount
  useEffect(() => {
    if (selectedProject) {
      const storedSchedule = localStorage.getItem(`schedule_${selectedProject.id}`);
      if (storedSchedule) {
        try {
          const schedule = JSON.parse(storedSchedule);
          setProductionSchedule(schedule);
          setOriginalSchedule(schedule);
          
          // Extract scenes for drag-and-drop
          if (schedule.dailySchedule) {
            const allScenes = schedule.dailySchedule.flatMap((day: any) => 
              day.scenes || []
            );
            setScenes(allScenes);
          }
        } catch (error) {
          console.error('Error loading stored schedule:', error);
        }
      }

      const storedDepthResults = localStorage.getItem(`depth_schedule_${selectedProject.id}`);
      if (storedDepthResults) {
        try {
          const results = JSON.parse(storedDepthResults);
          setDepthSchedulingResults(results);
        } catch (error) {
          console.error('Error loading stored depth scheduling results:', error);
        }
      }
    }
  }, [selectedProject]);

  // Generate basic production schedule
  const handleGenerateSchedule = async () => {
    if (!selectedProject?.scriptContent) {
      toast.error("No script content available for scheduling");
      return;
    }

    if (isSchedulingServiceRunning()) {
      toast.warning("Schedule generation already in progress. Please wait...");
      return;
    }

    setIsGeneratingSchedule(true);
    setScheduleError('');
    setSchedulingServiceLock(selectedProject.id);

    try {
      console.log('📅 Starting schedule generation');

      // Get analysis data if available - check multiple key formats for compatibility
      let analysisData = localStorage.getItem(`pdf_analysis_${selectedProject.id}`);
      
      // If not found, try filmustage format
      if (!analysisData) {
        analysisData = localStorage.getItem(`filmustage_pdf_analysis_${selectedProject.name}`);
      }
      
      // If still not found, try think.ai format
      if (!analysisData) {
        analysisData = localStorage.getItem(`thinkAI_pdf_analysis_${selectedProject.name}`);
      }
      
      let parsedAnalysis = null;
      try {
        if (analysisData) {
          parsedAnalysis = JSON.parse(analysisData);
          console.log('📊 Found script analysis data:', parsedAnalysis);
        }
      } catch (e) {
        console.warn('Could not parse analysis data:', e);
      }

      // Extract the actual results data - handle different storage formats
      let analysisResults = null;
      if (parsedAnalysis) {
        // Handle filmustage/think.ai format: { scriptName, timestamp, results }
        if (parsedAnalysis.results) {
          analysisResults = parsedAnalysis.results;
        }
        // Handle direct format: { scenes, characters, etc. }
        else if (parsedAnalysis.scenes || parsedAnalysis.data?.scenes) {
          analysisResults = parsedAnalysis.data || parsedAnalysis;
        }
      }

      console.log('📊 Analysis results extracted:', analysisResults);
      const input: ScriptAnalysisInput = {
        sceneBreakdownOutput: {
          projectId: selectedProject.id,
          sceneAnalysisSummary: {
            totalScenesProcessed: analysisResults?.summary?.totalScenes || analysisResults?.scenes?.length || 0,
            totalCharactersIdentified: analysisResults?.summary?.totalCharacters || analysisResults?.movieCharacters?.length || 0, 
            totalLocationsIdentified: 0, // CJS API doesn't extract locations separately
            totalPropsIdentified: 0, // CJS API doesn't extract props separately
            averageSceneComplexity: 2.5 // Default medium complexity
          },
          detailedSceneBreakdowns: (analysisResults?.scenes || []).map((scene: any, index: number) => ({
            sceneNumber: index + 1,
            sceneHeader: scene.Scene_Names || `Scene ${index + 1}`,
            location: {
              type: scene.Scene_Names?.toUpperCase().includes('EXT') ? 'EXT' : 'INT',
              primaryLocation: scene.Scene_Names?.split('-')[0]?.trim() || 'Unknown Location',
              timeOfDay: scene.Scene_Names?.toUpperCase().includes('DAY') ? 'DAY' : 
                         scene.Scene_Names?.toUpperCase().includes('NIGHT') ? 'NIGHT' : 'DAY',
              complexityLevel: 'moderate' as const
            },
            characters: {
              speaking: (scene.Scene_Characters || []).map((char: string) => ({
                name: char,
                dialogueLines: scene.Scene_Dialogue?.length || 0,
                specialRequirements: []
              })),
              nonSpeaking: []
            },
            timeEstimates: {
              setupHours: 1,
              shootingHours: 4,
              wrapHours: 0.5,
              totalHours: 5.5
            },
            complexityScores: {
              technicalDifficulty: 2,
              castComplexity: scene.Scene_Characters?.length || 1,
              locationChallenges: 2,
              overallComplexity: 2.5
            },
            departmentRequirements: {
              makeup: {
                standardMakeup: scene.Scene_Characters?.length || 1,
                estimatedApplicationTime: 30
              },
              wardrobe: {
                standardCostumes: scene.Scene_Characters?.length || 1
              }
            },
            specialConsiderations: scene.Scene_action ? [scene.Scene_action.substring(0, 100)] : []
          }))
        }
      };

      const result = await generateProductionScheduleWithAI(input, selectedProject.id);

      if (result.status === 'completed' && result.result) {
        setProductionSchedule(result.result);
        setOriginalSchedule(result.result);

        // Extract scenes for drag-and-drop
        if (result.result.dailySchedule) {
          const allScenes = result.result.dailySchedule.flatMap((day: any) => 
            day.scenes || []
          );
          setScenes(allScenes);
        }

        // Store results
        localStorage.setItem(`schedule_${selectedProject.id}`, JSON.stringify(result.result));

        toast.success("Production Schedule Generated!", {
          description: `Created ${result.result.dailySchedule?.length || 0} shooting days`,
        });
      } else {
        throw new Error(result.error || 'Schedule generation failed');
      }
    } catch (error) {
      console.error('Schedule generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Schedule generation failed';
      setScheduleError(errorMessage);
      
      toast.error("Schedule Generation Failed", {
        description: errorMessage,
      });
    } finally {
      setIsGeneratingSchedule(false);
      removeSchedulingServiceLock();
    }
  };

  // Handle depth scheduling analysis
  const handleDepthAnalysis = async () => {
    if (!selectedProject?.scriptContent) {
      toast.error("No script content available for analysis");
      return;
    }

    setIsDepthAnalyzing(true);
    setDepthAnalysisError('');
    setTierProgress([]);
    setCurrentTier('');

    try {
      console.log('🧠 Starting depth scheduling analysis');

      const result = await DepthSchedulingAnalysisService.analyze(
        selectedProject.scriptContent,
        selectedProject.id,
        (tier, progress) => {
          setCurrentTier(tier);
          setTierProgress(prev => {
            const updated = [...prev];
            const existing = updated.find(p => p.tier === tier);
            if (existing) {
              existing.progress = progress;
            } else {
              updated.push({ tier, progress });
            }
            return updated;
          });
        }
      );

      if (result.success && result.data) {
        setDepthSchedulingResults(result.data);
        
        if (result.data.optimizationScenarios) {
          setOptimizationScenarios(result.data.optimizationScenarios);
        }

        // Store results
        localStorage.setItem(`depth_schedule_${selectedProject.id}`, JSON.stringify(result.data));

        toast.success("Depth Scheduling Analysis Complete!", {
          description: "4-tier scheduling analysis completed successfully",
        });
      } else {
        throw new Error(result.error || 'Depth analysis failed');
      }
    } catch (error) {
      console.error('Depth scheduling analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Depth analysis failed';
      setDepthAnalysisError(errorMessage);
      
      toast.error("Depth Analysis Failed", {
        description: errorMessage,
      });
    } finally {
      setIsDepthAnalyzing(false);
      setTierProgress([]);
      setCurrentTier('');
    }
  };

  // Handle drag end for scene reordering
  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setScenes((items) => {
        const oldIndex = items.findIndex(item => (item.id || `scene-${items.indexOf(item)}`) === active.id);
        const newIndex = items.findIndex(item => (item.id || `scene-${items.indexOf(item)}`) === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        setHasUnsavedChanges(true);
        return newItems;
      });
    }
  };

  // Save schedule changes
  const handleSaveSchedule = () => {
    if (!selectedProject || !productionSchedule) return;

    // Update schedule with reordered scenes
    const updatedSchedule = {
      ...productionSchedule,
      dailySchedule: productionSchedule.dailySchedule?.map((day: any, dayIndex: number) => ({
        ...day,
        scenes: scenes.filter((_, sceneIndex) => 
          Math.floor(sceneIndex / (scenes.length / (productionSchedule.dailySchedule?.length || 1))) === dayIndex
        )
      })) || []
    };

    setProductionSchedule(updatedSchedule);
    localStorage.setItem(`schedule_${selectedProject.id}`, JSON.stringify(updatedSchedule));
    setHasUnsavedChanges(false);

    toast.success("Schedule saved successfully!");
  };

  // Export schedule
  const exportSchedule = () => {
    if (!productionSchedule || !selectedProject) return;

    const exportData = {
      project: selectedProject.name,
      timestamp: new Date().toISOString(),
      schedule: productionSchedule,
      totalDays: productionSchedule.scheduleOverview?.totalShootDays || productionSchedule.dailySchedule?.length || 0,
      totalScenes: scenes.length
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production-schedule-${selectedProject.name || 'project'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Schedule exported successfully!");
  };

  if (!selectedProject) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">No Project Selected</h3>
            <p className="text-muted-foreground mb-4">Select a project to create its production schedule</p>
            <Button asChild>
              <a href="/dashboard/admin/upload-script">Create Project</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">📅 Production Scheduling</h1>
            <p className="text-muted-foreground mt-2">
              Project: {selectedProject.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <Button variant="outline" onClick={handleSaveSchedule}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            )}
            {productionSchedule && (
              <Button variant="outline" onClick={exportSchedule}>
                <Download className="w-4 h-4 mr-2" />
                Export Schedule
              </Button>
            )}
            <Button onClick={handleGenerateSchedule} disabled={isGeneratingSchedule}>
              {isGeneratingSchedule ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Schedule
                </>
              )}
            </Button>
          </div>
        </div>

        {/* View Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'schedule', label: 'Schedule', icon: Calendar },
              { id: 'cast', label: 'Cast', icon: Users },
              { id: 'locations', label: 'Locations', icon: MapPin },
              { id: 'equipment', label: 'Equipment', icon: Wrench },
              { id: 'conflicts', label: 'Conflicts', icon: AlertTriangle },
              { id: 'optimization', label: 'Optimization', icon: Target },
              { id: 'depth-analysis', label: 'Depth Analysis', icon: Brain },
            ].map((view) => {
              const Icon = view.icon;
              return (
                <button
                  key={view.id}
                  onClick={() => setActiveView(view.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeView === view.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2 inline" />
                  {view.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* View Content */}
        {activeView === 'overview' && (
          <div className="space-y-6">
            {!productionSchedule && (
              <Card>
                <CardHeader>
                  <CardTitle>Production Schedule Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Schedule Generated</h3>
                    <p className="text-muted-foreground mb-4">
                      Generate a production schedule to see the overview
                    </p>
                    <Button onClick={handleGenerateSchedule} disabled={isGeneratingSchedule}>
                      {isGeneratingSchedule ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating Schedule...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 mr-2" />
                          Generate Schedule
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {productionSchedule && (
              <div className="space-y-6">
                {/* Production Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-muted-foreground text-sm">Total Shoot Days</p>
                          <p className="text-2xl font-bold">{productionSchedule.scheduleOverview?.totalShootDays || productionSchedule.dailySchedule?.length || 0}</p>
                        </div>
                        <Calendar className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-muted-foreground text-sm">Budget Range</p>
                          <p className="text-lg font-bold text-green-600">
                            {productionSchedule.scheduleOverview?.estimatedBudgetRange ? 
                              `$${productionSchedule.scheduleOverview.estimatedBudgetRange.low}K-$${productionSchedule.scheduleOverview.estimatedBudgetRange.high}K` : 
                              productionSchedule.budgetBreakdown?.total ? 
                              `$${Math.round(productionSchedule.budgetBreakdown.total / 1000)}K` : 'N/A'}
                          </p>
                        </div>
                        <DollarSign className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-muted-foreground text-sm">Crew Size</p>
                          <p className="text-2xl font-bold">{productionSchedule.scheduleOverview?.recommendedCrewSize || 'N/A'}</p>
                        </div>
                        <Users className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-muted-foreground text-sm">Complex Scenes</p>
                          <p className="text-2xl font-bold">{productionSchedule.complexScenes?.length || 0}</p>
                        </div>
                        <AlertTriangle className="h-8 w-8 text-orange-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Production Timeline */}
                {productionSchedule.scheduleOverview?.productionTimeline && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Production Timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-gray-50 rounded-lg border">
                          <div className="text-2xl font-bold text-blue-600">{productionSchedule.scheduleOverview.productionTimeline.prepDays || 0}</div>
                          <div className="text-muted-foreground text-sm">Prep Days</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg border">
                          <div className="text-2xl font-bold text-green-600">{productionSchedule.scheduleOverview.productionTimeline.shootDays || productionSchedule.scheduleOverview.totalShootDays || 0}</div>
                          <div className="text-muted-foreground text-sm">Shoot Days</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg border">
                          <div className="text-2xl font-bold text-purple-600">{productionSchedule.scheduleOverview.productionTimeline.wrapDays || 0}</div>
                          <div className="text-muted-foreground text-sm">Wrap Days</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Complex Scenes Alert */}
                {productionSchedule.complexScenes && productionSchedule.complexScenes.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
                        High Priority Scenes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {productionSchedule.complexScenes.slice(0, 5).map((scene, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                            <div>
                              <div className="font-medium">Scene {scene.sceneNumber}</div>
                              <div className="text-muted-foreground text-sm">{scene.reason}</div>
                              <div className="text-sm mt-1">{scene.recommendation}</div>
                            </div>
                            <Badge variant={scene.priority === 'high' ? 'destructive' : scene.priority === 'medium' ? 'default' : 'secondary'}>
                              {scene.priority}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Budget Breakdown */}
                {productionSchedule.budgetBreakdown && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        Budget Breakdown
                        {hasUnsavedChanges && (
                          <Badge variant="outline" className="text-blue-600 border-blue-600">
                            Editable
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(productionSchedule.budgetBreakdown).map(([category, amount]) => (
                          <div key={category} className="flex items-center justify-between">
                            <span className="text-muted-foreground capitalize">{category.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <span className={`font-medium ${category === 'total' ? 'text-green-600 text-lg' : ''}`}>
                              ${typeof amount === 'number' ? new Intl.NumberFormat('en-US').format(amount) : amount}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {scheduleError && (
              <Card className="border-red-200">
                <CardContent className="p-6">
                  <div className="text-center text-red-600">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Schedule Generation Failed</h3>
                    <p>{scheduleError}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeView === 'schedule' && (
          <div className="space-y-6">
            {productionSchedule && productionSchedule.dailySchedule ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Daily Shooting Schedule
                    {hasUnsavedChanges && (
                      <Badge variant="outline" className="text-blue-600 border-blue-600">
                        Drag scenes to reorder
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="space-y-4">
                      {productionSchedule.dailySchedule.map((day, dayIndex) => (
                        <div key={dayIndex} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h3 className="text-lg font-semibold">Day {day.day}</h3>
                              <div className="flex items-center space-x-2">
                                <p className="text-muted-foreground text-sm">{day.location}</p>
                                <span className="text-muted-foreground text-sm">• {day.scenes?.length || 0} scenes</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">${typeof day.estimatedCost === 'number' ? new Intl.NumberFormat('en-US').format(day.estimatedCost) : day.estimatedCost}</div>
                              <div className="text-muted-foreground text-sm">{day.crewSize || 'N/A'} crew</div>
                            </div>
                          </div>
                          
                          <SortableContext 
                            items={day.scenes?.map((_, i) => `${dayIndex}-${i}`) || []}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-2">
                              {day.scenes?.map((scene, sceneIndex) => (
                                <div
                                  key={`${dayIndex}-${sceneIndex}`}
                                  className="flex items-center justify-between bg-gray-50 rounded p-2 border"
                                >
                                  <div className="flex items-center space-x-3">
                                    <div>
                                      <span className="font-medium">Scene {scene.sceneNumber}</span>
                                      <span className="text-muted-foreground ml-2">
                                        ({scene.duration || scene.estimatedDuration || 'N/A'}h)
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-sm">
                                    <span>{scene.startTime || 'N/A'} - {scene.endTime || 'N/A'}</span>
                                  </div>
                                </div>
                              )) || []}
                            </div>
                          </SortableContext>
                          
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-muted-foreground text-sm">
                              <span className="font-medium">Cast needed:</span>{' '}
                              {day.castNeeded?.join(', ') || 'N/A'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </DndContext>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Schedule Available</h3>
                    <p className="text-muted-foreground">Generate a production schedule to view scenes</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeView === 'cast' && (
          <div className="space-y-6">
            {productionSchedule && productionSchedule.castSchedule ? (
              <Card>
                <CardHeader>
                  <CardTitle>Cast Schedule (Day Out of Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {productionSchedule.castSchedule.map((cast, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-semibold">{cast.characterName}</h3>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{cast.totalDays} days</div>
                            <div className="text-muted-foreground text-sm">${typeof cast.estimatedCost === 'number' ? new Intl.NumberFormat('en-US').format(cast.estimatedCost) : cast.estimatedCost}</div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {Array.from({ length: productionSchedule.scheduleOverview?.totalShootDays || productionSchedule.dailySchedule?.length || 0 }, (_, dayIndex) => {
                            const dayNum = dayIndex + 1;
                            const isWorkDay = cast.workDays?.includes(dayNum);
                            return (
                              <div
                                key={dayNum}
                                className={`w-8 h-8 rounded flex items-center justify-center text-xs font-medium transition-colors ${
                                  isWorkDay 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-gray-100 text-muted-foreground border'
                                }`}
                              >
                                {dayNum}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Cast Schedule Available</h3>
                    <p className="text-muted-foreground">Generate a production schedule to view cast details</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeView === 'locations' && (
          <div className="space-y-6">
            {productionSchedule && productionSchedule.locationSchedule ? (
              <Card>
                <CardHeader>
                  <CardTitle>Location Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {productionSchedule.locationSchedule.map((location, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold">{location.location}</h3>
                          <div className="text-right">
                            <div className="font-medium">${typeof location.estimatedCost === 'number' ? new Intl.NumberFormat('en-US').format(location.estimatedCost) : location.estimatedCost}</div>
                            <div className="text-muted-foreground text-sm">{location.scenes?.length || 0} scenes</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <div className="text-muted-foreground text-sm font-medium mb-1">Scenes</div>
                            <div>{location.scenes?.join(', ') || 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-sm font-medium mb-1">Shoot Days</div>
                            <div>{location.days?.join(', ') || 'N/A'}</div>
                          </div>
                        </div>
                        
                        {location.setupRequirements && location.setupRequirements.length > 0 && (
                          <div>
                            <div className="text-muted-foreground text-sm font-medium mb-1">Setup Requirements</div>
                            <div className="text-sm">{location.setupRequirements.join(', ')}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Location Schedule Available</h3>
                    <p className="text-muted-foreground">Generate a production schedule to view location details</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeView === 'equipment' && (
          <div className="space-y-6">
            {productionSchedule && productionSchedule.equipmentSchedule ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Wrench className="h-5 w-5 text-blue-600 mr-2" />
                    Equipment Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {productionSchedule.equipmentSchedule.map((equipment, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold">{equipment.equipmentType || equipment.name}</h3>
                          <div className="text-right">
                            <div className="font-medium">${typeof equipment.estimatedCost === 'number' ? new Intl.NumberFormat('en-US').format(equipment.estimatedCost) : equipment.estimatedCost}</div>
                            <div className="text-muted-foreground text-sm">{equipment.rentalDays || 0} days</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-muted-foreground text-sm font-medium mb-1">Scenes Required</div>
                            <div>{equipment.scenesRequired?.join(', ') || 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-sm font-medium mb-1">Rental Days</div>
                            <div>{equipment.days?.join(', ') || equipment.rentalDays || 'N/A'}</div>
                          </div>
                        </div>
                        
                        {equipment.specifications && (
                          <div className="mt-3">
                            <div className="text-muted-foreground text-sm font-medium mb-1">Specifications</div>
                            <div className="text-sm">{equipment.specifications}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Equipment Schedule Available</h3>
                    <p className="text-muted-foreground">Generate a production schedule to view equipment details</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeView === 'conflicts' && (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Conflicts Analysis</h3>
                  <p className="text-muted-foreground">Schedule conflicts will be displayed here once generated</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeView === 'optimization' && (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Schedule Optimization</h3>
                  <p className="text-muted-foreground">Optimization suggestions will be displayed here once generated</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeView === 'depth-analysis' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Depth Scheduling Analysis</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Advanced 4-tier scheduling analysis with optimization scenarios
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    onClick={handleDepthAnalysis}
                    disabled={isDepthAnalyzing || !selectedProject?.scriptContent}
                    className="w-full"
                  >
                    {isDepthAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Running Depth Analysis...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Start Depth Analysis
                      </>
                    )}
                  </Button>

                  {isDepthAnalyzing && (
                    <div className="space-y-4">
                      <div className="text-sm font-medium">Current Tier: {currentTier}</div>
                      {tierProgress.map((tier) => (
                        <div key={tier.tier} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{tier.tier}</span>
                            <span>{tier.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${tier.progress}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {depthAnalysisError && (
                    <div className="text-red-600 text-sm">
                      <AlertTriangle className="w-4 h-4 mr-2 inline" />
                      {depthAnalysisError}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {depthSchedulingResults && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Depth Analysis Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {depthSchedulingResults.recommendedDays || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Recommended Days</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {depthSchedulingResults.efficiency || 0}%
                        </div>
                        <div className="text-sm text-muted-foreground">Efficiency</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {optimizationScenarios.length}
                        </div>
                        <div className="text-sm text-muted-foreground">Scenarios</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          4
                        </div>
                        <div className="text-sm text-muted-foreground">Analysis Tiers</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {optimizationScenarios.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Optimization Scenarios</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4">
                        {optimizationScenarios.map((scenario, index) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{scenario.name}</h4>
                              <Badge variant={scenario.priority === 'high' ? 'destructive' : scenario.priority === 'medium' ? 'default' : 'secondary'}>
                                {scenario.priority} priority
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {scenario.description}
                            </p>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <TrendingUp className="w-4 h-4 text-green-600" />
                                <span>Cost: {scenario.estimatedCost}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4 text-blue-600" />
                                <span>Time: {scenario.timeImpact}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

        {/* Other view placeholders */}
        {['cast', 'locations', 'equipment', 'conflicts', 'optimization'].includes(activeView) && (
          <Card>
            <CardHeader>
              <CardTitle className="capitalize">{activeView} Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-muted-foreground">
                  {activeView.charAt(0).toUpperCase() + activeView.slice(1)} management features will be available after schedule generation.
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}