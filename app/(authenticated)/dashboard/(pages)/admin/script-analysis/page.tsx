"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CategoryBadge } from '@/components/ui/CategoryBadge';
import { useSelectedProject } from '@/hooks/useSelectedProject';
import { toast } from 'sonner';
import { 
  Search, 
  FileText, 
  Share2, 
  Download, 
  Upload, 
  Edit3, 
  Save, 
  RotateCcw, 
  Eye, 
  FileEdit, 
  AlertCircle, 
  Loader2, 
  CheckCircle, 
  Brain, 
  BarChart3, 
  Clock, 
  Users, 
  MapPin, 
  DollarSign, 
  AlertTriangle, 
  Code, 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  Download as DownloadIcon 
} from 'lucide-react';
import { ProjectData } from '@/lib/types';
import { generateProductionScheduleWithAI, ScriptAnalysisInput } from '@/lib/services/schedulingGeneratorService';
import { generateBasicBudgetWithAI } from '@/lib/services/basicBudgetGeneratorService';
import { depthScriptAnalysisService, CoordinatorOutput } from '@/lib/services/depthScriptAnalysisService';
import { cjsApiService } from '@/lib/services/cjsApiService';

console.log('📄 Enhanced ScriptPage configured for comprehensive analysis');

export default function ScriptAnalysisPage() {
  const { selectedProject, selectProject } = useSelectedProject();
  const [activeTab, setActiveTab] = useState<'edit' | 'pdf' | 'depth'>('pdf');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScene, setSelectedScene] = useState(1);
  const [notes, setNotes] = useState('');
  
  // Script editing state
  const [editedScript, setEditedScript] = useState<string>('');
  const [originalScript, setOriginalScript] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [linesPerPage] = useState(50);

  // PDF analysis state
  const [pdfAnalysisResults, setPdfAnalysisResults] = useState<any | null>(null);
  const [isPdfAnalyzing, setIsPdfAnalyzing] = useState(false);
  const [pdfAnalysisError, setPdfAnalysisError] = useState('');
  const [uploadedPdfName, setUploadedPdfName] = useState('');
  const [showRawResponse, setShowRawResponse] = useState(false);
  const [showAllScenes, setShowAllScenes] = useState(false);

  // Background processing state
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const [isGeneratingBudget, setIsGeneratingBudget] = useState(false);
  const [backgroundProcessStatus, setBackgroundProcessStatus] = useState('');
  const [backgroundProcessComplete, setBackgroundProcessComplete] = useState(false);

  // Depth Analysis state
  const [depthAnalysisResults, setDepthAnalysisResults] = useState<CoordinatorOutput | null>(null);
  const [isDepthAnalyzing, setIsDepthAnalyzing] = useState(false);
  const [depthAnalysisError, setDepthAnalysisError] = useState('');
  const [depthAnalysisProgress, setDepthAnalysisProgress] = useState(0);
  const [currentDepthAgent, setCurrentDepthAgent] = useState('');
  const [showDepthResults, setShowDepthResults] = useState(false);
  
  // Raw JSON state for agent outputs
  const [rawAgentOutputs, setRawAgentOutputs] = useState<{
    eighthsAgent?: any;
    sceneBreakdownAgent?: any;
    departmentAgent?: any;
    coordinatorAgent?: any;
  }>({});
  const [expandedRawSections, setExpandedRawSections] = useState<{
    [key: string]: boolean;
  }>({});

  // Load script content on component mount
  useEffect(() => {
    if (selectedProject?.scriptContent) {
      setOriginalScript(selectedProject.scriptContent);
      setEditedScript(selectedProject.scriptContent);
    }
  }, [selectedProject]);

  // Check for existing analysis results
  useEffect(() => {
    if (selectedProject) {
      const storedResults = localStorage.getItem(`pdf_analysis_${selectedProject.id}`);
      if (storedResults) {
        try {
          const results = JSON.parse(storedResults);
          setPdfAnalysisResults(results);
        } catch (error) {
          console.error('Error loading stored analysis:', error);
        }
      }

      const storedDepthResults = localStorage.getItem(`depth_analysis_${selectedProject.id}`);
      if (storedDepthResults) {
        try {
          const results = JSON.parse(storedDepthResults);
          setDepthAnalysisResults(results);
        } catch (error) {
          console.error('Error loading stored depth analysis:', error);
        }
      }
    }
  }, [selectedProject]);

  // Background workflow: Auto-generate scheduling and budget when script analysis is available (FILMUSTAGE pattern)
  useEffect(() => {
    const startBackgroundWorkflow = async () => {
      console.log('');
      console.log('🚀 ===== BACKGROUND WORKFLOW: CHECKING FOR AUTO-GENERATION =====');
      console.log('📅 TIMESTAMP:', new Date().toISOString());
      console.log('🔍 PROJECT:', selectedProject?.name || 'No project');
      console.log('🚀 ================================================================');
      console.log('');

      if (!pdfAnalysisResults?.data || !selectedProject?.id) {
        console.log('⚠️ BACKGROUND: No script analysis or project ID available, skipping workflow');
        return;
      }

      console.log('✅ BACKGROUND: Script analysis found, checking existing data...');

      const schedulingKey = `schedule_${selectedProject.id}`;
      const budgetKey = `budget_${selectedProject.id}`;
      const existingScheduling = localStorage.getItem(schedulingKey);
      const existingBudget = localStorage.getItem(budgetKey);

      console.log('📋 BACKGROUND: Existing scheduling data:', !!existingScheduling);
      console.log('💰 BACKGROUND: Existing budget data:', !!existingBudget);

      // Both already exist, skip workflow
      if (existingScheduling && existingBudget) {
        console.log('✅ BACKGROUND: Both scheduling and budget exist, workflow complete');
        setBackgroundProcessStatus('Background workflow complete');
        setBackgroundProcessComplete(true);
        return;
      }

      // Start background processing
      setBackgroundProcessStatus('Starting automatic background processing...');
      setBackgroundProcessComplete(false);

      // Generate scheduling if it doesn't exist
      if (!existingScheduling) {
        console.log('🚀 BACKGROUND: Starting scheduling generation...');
        setIsGeneratingSchedule(true);
        setBackgroundProcessStatus('Generating production schedule in background...');

        try {
          // Transform PDF analysis data to scheduling input format
          const schedulingInput: ScriptAnalysisInput = {
            sceneBreakdownOutput: {
              projectId: selectedProject.id,
              sceneAnalysisSummary: {
                totalScenesProcessed: pdfAnalysisResults.data.totalScenes || pdfAnalysisResults.data.scenes?.length || 0,
                totalCharactersIdentified: pdfAnalysisResults.data.totalCharacters || pdfAnalysisResults.data.characters?.length || 0, 
                totalLocationsIdentified: 0,
                totalPropsIdentified: 0,
                averageSceneComplexity: 2.5
              },
              detailedSceneBreakdowns: (pdfAnalysisResults.data.scenes || []).map((scene: any, index: number) => ({
                sceneNumber: index + 1,
                sceneHeader: scene.Scene_Names || `Scene ${index + 1}`,
                location: {
                  type: scene.Scene_Names?.toUpperCase().includes('EXT') ? 'EXT' : 'INT' as 'INT' | 'EXT',
                  primaryLocation: scene.Scene_Names?.split('-')[0]?.trim() || 'Unknown Location',
                  timeOfDay: scene.Scene_Names?.toUpperCase().includes('DAY') ? 'DAY' : 
                             scene.Scene_Names?.toUpperCase().includes('NIGHT') ? 'NIGHT' : 'DAY',
                  complexityLevel: 'moderate' as 'simple' | 'moderate' | 'complex' | 'extreme'
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

          const schedulingResult = await generateProductionScheduleWithAI(
            schedulingInput,
            selectedProject.id,
            (status) => {
              console.log('📅 BACKGROUND SCHEDULING:', status);
              setBackgroundProcessStatus(`Scheduling: ${status}`);
            }
          );

          if (schedulingResult.status === 'completed' && schedulingResult.result) {
            localStorage.setItem(schedulingKey, JSON.stringify(schedulingResult.result));
            console.log('✅ BACKGROUND: Scheduling completed and saved');
            setIsGeneratingSchedule(false);

            // Now start budget generation
            if (!existingBudget) {
              console.log('🚀 BACKGROUND: Starting budget generation...');
              setIsGeneratingBudget(true);
              setBackgroundProcessStatus('Generating basic budget in background...');

              try {
                const budgetResult = await generateBasicBudgetWithAI(
                  pdfAnalysisResults.data,
                  schedulingResult.result,
                  selectedProject.id,
                  (status) => {
                    console.log('💰 BACKGROUND BUDGET:', status);
                    setBackgroundProcessStatus(`Budget: ${status}`);
                  }
                );

                if (budgetResult.status === 'completed' && budgetResult.result) {
                  localStorage.setItem(budgetKey, JSON.stringify(budgetResult.result));
                  console.log('✅ BACKGROUND: Budget completed and saved');
                  setIsGeneratingBudget(false);
                  setBackgroundProcessStatus('Background workflow complete');
                  setBackgroundProcessComplete(true);

                  toast.success("Background processing complete!", {
                    description: "Schedule and budget generated automatically while you review the script.",
                  });
                } else {
                  console.log('⚠️ BACKGROUND: Budget generation failed');
                  setIsGeneratingBudget(false);
                  setBackgroundProcessStatus('Budget generation failed');
                }
              } catch (budgetError) {
                console.error('❌ BACKGROUND: Budget generation error:', budgetError);
                setIsGeneratingBudget(false);
                setBackgroundProcessStatus('Budget generation error');
              }
            }
          } else {
            console.log('⚠️ BACKGROUND: Scheduling generation failed');
            setIsGeneratingSchedule(false);
            setBackgroundProcessStatus('Scheduling generation failed');
          }
        } catch (schedulingError) {
          console.error('❌ BACKGROUND: Scheduling generation error:', schedulingError);
          setIsGeneratingSchedule(false);
          setBackgroundProcessStatus('Scheduling generation error');
        }
      } else {
        // Scheduling exists, just check budget
        console.log('✅ BACKGROUND: Scheduling exists, checking budget...');
        if (!existingBudget) {
          console.log('🚀 BACKGROUND: Starting budget generation...');
          setIsGeneratingBudget(true);
          setBackgroundProcessStatus('Generating basic budget in background...');

          try {
            const storedScheduling = JSON.parse(existingScheduling);
            const budgetResult = await generateBasicBudgetWithAI(
              pdfAnalysisResults.data,
              storedScheduling,
              selectedProject.id,
              (status) => {
                console.log('💰 BACKGROUND BUDGET:', status);
                setBackgroundProcessStatus(`Budget: ${status}`);
              }
            );

            if (budgetResult.status === 'completed' && budgetResult.result) {
              localStorage.setItem(budgetKey, JSON.stringify(budgetResult.result));
              console.log('✅ BACKGROUND: Budget completed and saved');
              setIsGeneratingBudget(false);
              setBackgroundProcessStatus('Background workflow complete');
              setBackgroundProcessComplete(true);

              toast.success("Background processing complete!", {
                description: "Basic budget generated automatically while you review the script.",
              });
            } else {
              console.log('⚠️ BACKGROUND: Budget generation failed');
              setIsGeneratingBudget(false);
              setBackgroundProcessStatus('Budget generation failed');
            }
          } catch (budgetError) {
            console.error('❌ BACKGROUND: Budget generation error:', budgetError);
            setIsGeneratingBudget(false);
            setBackgroundProcessStatus('Budget generation error');
          }
        } else {
          console.log('✅ BACKGROUND: Both scheduling and budget exist, workflow complete');
          setBackgroundProcessStatus('Background workflow complete');
          setBackgroundProcessComplete(true);
        }
      }

      console.log('');
    };

    // Only run once per project when PDF analysis is available
    if (pdfAnalysisResults?.data && selectedProject?.id) {
      startBackgroundWorkflow();
    }
  }, [selectedProject?.id, pdfAnalysisResults?.data]);

  // PDF Analysis functions using CJS API with fallback
  const handlePdfUpload = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    setIsPdfAnalyzing(true);
    setPdfAnalysisError('');
    setUploadedPdfName(file.name);

    try {
      console.log('📄 Starting PDF analysis with CJS API:', file.name);
      
      // Check for cached analysis first
      const cached = cjsApiService.loadCachedAnalysis(file.name);
      if (cached) {
        console.log('⚡ Using cached analysis results');
        const cacheResults = {
          success: true,
          data: cached,
          source: cached.source || 'cache'
        };
        
        setPdfAnalysisResults(cacheResults);
        
        if (selectedProject) {
          localStorage.setItem(`pdf_analysis_${selectedProject.id}`, JSON.stringify(cacheResults));
        }

        toast.success("PDF Analysis Complete! (Cached)", {
          description: `Loaded ${cached.totalScenes || 0} scenes with ${cached.totalCharacters || 0} characters`,
        });

        triggerBackgroundProcessing(cached);
        return;
      }

      // Use CJS API with browser fallback
      const result = await cjsApiService.analyzePdfWithFallback(
        file, 
        selectedProject?.id || 'unknown'
      );
      
      console.log('✅ PDF analysis results:', result);
      
      if (result.success && result.data) {
        const formattedResults = {
          success: true,
          data: result.data,
          source: result.source
        };
        
        setPdfAnalysisResults(formattedResults);
        
        // Store results in localStorage
        if (selectedProject) {
          localStorage.setItem(`pdf_analysis_${selectedProject.id}`, JSON.stringify(formattedResults));
        }

        const analysisSource = result.source === 'cjs' ? 'CJS API' : 'Browser Analysis';
        toast.success(`PDF Analysis Complete! (${analysisSource})`, {
          description: `Analyzed ${result.data.totalScenes || 0} scenes with ${result.data.totalCharacters || 0} characters`,
        });

        // Trigger background generation of schedule and budget
        triggerBackgroundProcessing(result.data);
      } else {
        throw new Error(result.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('PDF analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze PDF';
      setPdfAnalysisError(errorMessage);
      
      toast.error("PDF Analysis Failed", {
        description: errorMessage,
      });
    } finally {
      setIsPdfAnalyzing(false);
    }
  };

  // Trigger background processing for schedule and budget
  const triggerBackgroundProcessing = async (analysisData: any) => {
    if (!selectedProject) return;

    setBackgroundProcessStatus('Starting background processing...');
    setBackgroundProcessComplete(false);

    try {
      // Generate schedule in background
      setIsGeneratingSchedule(true);
      setBackgroundProcessStatus('Generating production schedule...');

      // Transform CJS API data to the expected scheduling service format
      const scheduleInput: ScriptAnalysisInput = {
        sceneBreakdownOutput: {
          projectId: selectedProject.id,
          sceneAnalysisSummary: {
            totalScenesProcessed: analysisData.totalScenes || analysisData.scenes?.length || 0,
            totalCharactersIdentified: analysisData.totalCharacters || analysisData.characters?.length || 0, 
            totalLocationsIdentified: 0, // CJS API doesn't extract locations separately
            totalPropsIdentified: 0, // CJS API doesn't extract props separately
            averageSceneComplexity: 2.5 // Default medium complexity
          },
          detailedSceneBreakdowns: (analysisData.scenes || []).map((scene: any, index: number) => ({
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

      const scheduleResult = await generateProductionScheduleWithAI(scheduleInput, selectedProject.id);
      
      if (scheduleResult.status === 'completed' && scheduleResult.result) {
        localStorage.setItem(`schedule_${selectedProject.id}`, JSON.stringify(scheduleResult.result));
        setBackgroundProcessStatus('Schedule generated successfully. Generating budget...');
      } else {
        console.warn('Schedule generation failed:', scheduleResult.error);
      }

      // Generate budget in background
      setIsGeneratingBudget(true);
      setBackgroundProcessStatus('Generating production budget...');

      const budgetResult = await generateBasicBudgetWithAI(
        analysisData,
        scheduleResult.result,
        selectedProject.id,
        (status) => {
          console.log('💰 MANUAL BUDGET:', status);
          setBackgroundProcessStatus(`Budget: ${status}`);
        }
      );
      
      if (budgetResult.status === 'completed' && budgetResult.result) {
        localStorage.setItem(`budget_${selectedProject.id}`, JSON.stringify(budgetResult.result));
        setBackgroundProcessStatus('Budget generated successfully!');
      } else {
        console.warn('Budget generation failed:', budgetResult.error);
      }

      setBackgroundProcessComplete(true);
      toast.success("Background Processing Complete!", {
        description: "Schedule and budget have been generated automatically",
      });

    } catch (error) {
      console.error('Background processing error:', error);
      setBackgroundProcessStatus('Background processing completed with some errors');
    } finally {
      setIsGeneratingSchedule(false);
      setIsGeneratingBudget(false);
    }
  };

  // Depth Analysis using FILMUSTAGE service
  const handleDepthAnalysis = async () => {
    if (!selectedProject?.scriptContent) {
      toast.error("No script content available for analysis");
      return;
    }

    setIsDepthAnalyzing(true);
    setDepthAnalysisError('');
    setDepthAnalysisProgress(0);
    setCurrentDepthAgent('');
    setRawAgentOutputs({}); // Clear previous raw outputs

    try {
      console.log('🧠 Starting depth analysis with 4-agent pipeline');
      
      // Create mock PDF analysis data from script content for depth analysis
      const mockPdfAnalysisData = {
        data: {
          scenes: [],
          characters: [],
          totalScenes: 0,
          totalCharacters: 0,
          scriptContent: selectedProject.scriptContent
        }
      };

      const result = await depthScriptAnalysisService.executeFullAnalysis(
        mockPdfAnalysisData,
        selectedProject.id,
        (status: string, agent: string, progress: number) => {
          setDepthAnalysisProgress(progress);
          setCurrentDepthAgent(agent);
        },
        (agent: string, rawOutput: any, parsedOutput: any) => {
          setRawAgentOutputs(prev => ({
            ...prev,
            [agent]: { raw: rawOutput, parsed: parsedOutput }
          }));
        }
      );

      // The executeFullAnalysis method returns the CoordinatorOutput directly
      setDepthAnalysisResults(result);
      setShowDepthResults(true);

      // Store results
      localStorage.setItem(`depth_analysis_${selectedProject.id}`, JSON.stringify(result));

      toast.success("Depth Analysis Complete!", {
        description: "4-agent pipeline analysis completed successfully",
      });
    } catch (error) {
      console.error('Depth analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Depth analysis failed';
      setDepthAnalysisError(errorMessage);
      
      toast.error("Depth Analysis Failed", {
        description: errorMessage,
      });
    } finally {
      setIsDepthAnalyzing(false);
      setDepthAnalysisProgress(0);
      setCurrentDepthAgent('');
    }
  };

  // Save script edits
  const handleSaveScript = () => {
    if (!selectedProject) return;

    const updatedProject = {
      ...selectedProject,
      scriptContent: editedScript
    };

    // Update in localStorage
    const existingProjects = JSON.parse(localStorage.getItem('filmustage_projects') || '[]');
    const updatedProjects = existingProjects.map((p: ProjectData) => 
      p.id === selectedProject.id ? updatedProject : p
    );
    
    localStorage.setItem('filmustage_projects', JSON.stringify(updatedProjects));
    selectProject(updatedProject);
    
    setOriginalScript(editedScript);
    setHasUnsavedChanges(false);
    setIsEditMode(false);

    toast.success("Script saved successfully!");
  };

  // Reset script edits
  const handleResetScript = () => {
    setEditedScript(originalScript);
    setHasUnsavedChanges(false);
    setIsEditMode(false);
  };

  // Export functions
  const exportScriptAnalysis = () => {
    if (!pdfAnalysisResults) return;

    const exportData = {
      project: selectedProject?.name,
      timestamp: new Date().toISOString(),
      analysis: pdfAnalysisResults.data,
      scenes: pdfAnalysisResults.data?.scenes?.length || 0,
      characters: pdfAnalysisResults.data?.characters?.length || 0
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `script-analysis-${selectedProject?.name || 'project'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Analysis exported successfully!");
  };

  const exportDepthAnalysis = () => {
    if (!depthAnalysisResults) return;

    const exportData = {
      project: selectedProject?.name,
      timestamp: new Date().toISOString(),
      analysisType: "depth-analysis",
      depthAnalysis: depthAnalysisResults,
      workflowSummary: {
        totalProcessingTime: depthAnalysisResults.workflowExecutionSummary?.totalProcessingTimeMs,
        agentsCoordinated: depthAnalysisResults.workflowExecutionSummary?.agentsCoordinated,
        overallSuccessRate: depthAnalysisResults.workflowExecutionSummary?.overallSuccessRate,
        confidenceScore: depthAnalysisResults.qualityControlReport?.overallConfidenceScore
      },
      rawAgentOutputs: rawAgentOutputs // Include raw outputs for debugging
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `depth-analysis-${selectedProject?.name || 'project'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Depth analysis exported successfully!");
  };

  // Script editing handlers
  const handleScriptChange = (value: string) => {
    setEditedScript(value);
    setHasUnsavedChanges(value !== originalScript);
  };

  if (!selectedProject) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">No Project Selected</h3>
            <p className="text-muted-foreground mb-4">Select a project to analyze its script</p>
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
            <h1 className="text-3xl font-bold">🎬 Script Analysis</h1>
            <p className="text-muted-foreground mt-2">
              Project: {selectedProject.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {pdfAnalysisResults && (
              <Button variant="outline" onClick={exportScriptAnalysis}>
                <Download className="w-4 h-4 mr-2" />
                Export PDF Analysis
              </Button>
            )}
            {depthAnalysisResults && (
              <Button variant="outline" onClick={exportDepthAnalysis}>
                <Download className="w-4 h-4 mr-2" />
                Export Depth Analysis
              </Button>
            )}
            <Button asChild>
              <a href="/dashboard/admin/upload-script">
                <Upload className="w-4 h-4 mr-2" />
                New Project
              </a>
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('edit')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'edit'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileEdit className="w-4 h-4 mr-2 inline" />
              Script Editor
            </button>
            <button
              onClick={() => setActiveTab('pdf')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pdf'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="w-4 h-4 mr-2 inline" />
              PDF Analysis
            </button>
            <button
              onClick={() => setActiveTab('depth')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'depth'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Brain className="w-4 h-4 mr-2 inline" />
              Depth Analysis
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'edit' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Script Editor</CardTitle>
                  <div className="flex items-center gap-2">
                    {hasUnsavedChanges && (
                      <Badge variant="outline" className="text-orange-600">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Unsaved Changes
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditMode(!isEditMode)}
                    >
                      {isEditMode ? <Eye className="w-4 h-4 mr-2" /> : <Edit3 className="w-4 h-4 mr-2" />}
                      {isEditMode ? 'Preview' : 'Edit'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isEditMode ? (
                  <div className="space-y-4">
                    <Textarea
                      value={editedScript}
                      onChange={(e) => handleScriptChange(e.target.value)}
                      className="min-h-[500px] font-mono text-sm"
                      placeholder="Enter your script content here..."
                    />
                    <div className="flex items-center gap-2">
                      <Button onClick={handleSaveScript} disabled={!hasUnsavedChanges}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={handleResetScript} disabled={!hasUnsavedChanges}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="whitespace-pre-wrap font-mono text-sm">
                      {editedScript || 'No script content available'}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'pdf' && (
          <div className="space-y-6">
            {!pdfAnalysisResults && (
              <Card>
                <CardHeader>
                  <CardTitle>PDF Script Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Upload Script PDF</h3>
                    <p className="text-muted-foreground mb-4">
                      Upload a PDF script file for comprehensive AI analysis
                    </p>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handlePdfUpload(e as any)}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <Button
                      onClick={() => document.getElementById('pdf-upload')?.click()}
                      disabled={isPdfAnalyzing}
                    >
                      {isPdfAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Choose PDF File
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {isPdfAnalyzing && (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Analyzing PDF Script</h3>
                    <p className="text-muted-foreground">
                      {uploadedPdfName && `Processing: ${uploadedPdfName}`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {pdfAnalysisError && (
              <Card className="border-red-200">
                <CardContent className="p-6">
                  <div className="text-center text-red-600">
                    <AlertCircle className="w-8 h-8 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Analysis Failed</h3>
                    <p>{pdfAnalysisError}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {pdfAnalysisResults && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Analysis Complete
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {pdfAnalysisResults.data?.totalScenes || pdfAnalysisResults.data?.scenes?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Scenes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {pdfAnalysisResults.data?.totalCharacters || pdfAnalysisResults.data?.characters?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Characters</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {pdfAnalysisResults.data?.totalDialogues || pdfAnalysisResults.data?.dialogues?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Dialogues</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {pdfAnalysisResults.data?.interactions?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Interactions</div>
                      </div>
                    </div>
                    
                    {pdfAnalysisResults.source && (
                      <div className="mt-4 text-center">
                        <Badge variant={pdfAnalysisResults.source === 'cjs' ? 'default' : 'secondary'}>
                          Analysis Source: {pdfAnalysisResults.source === 'cjs' ? 'CJS API (Fast)' : 'Browser (Fallback)'}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Scene Breakdown */}
                {pdfAnalysisResults.data?.scenes && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Scene Breakdown ({pdfAnalysisResults.data.scenes.length} scenes)</CardTitle>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAllScenes(!showAllScenes)}
                          >
                            {showAllScenes ? (
                              <>
                                <ChevronDown className="w-4 h-4 mr-2" />
                                Show Less
                              </>
                            ) : (
                              <>
                                <ChevronRight className="w-4 h-4 mr-2" />
                                Show All Scenes
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const sceneText = pdfAnalysisResults.data.scenes
                                .map((scene: any, index: number) => 
                                  `SCENE ${index + 1}: ${scene.Scene_Names || `Scene ${index + 1}`}\n\n` +
                                  `CHARACTERS: ${scene.Scene_Characters ? scene.Scene_Characters.join(', ') : 'None'}\n\n` +
                                  `ACTION: ${scene.Scene_action || 'No action description'}\n\n` +
                                  `DIALOGUES: ${scene.Scene_Dialogue ? scene.Scene_Dialogue.join('\n') : 'No dialogues'}\n\n` +
                                  `CONTENT: ${scene.Contents || 'No content'}\n\n` +
                                  '='.repeat(80) + '\n\n'
                                ).join('');
                              
                              const blob = new Blob([sceneText], { type: 'text/plain' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${selectedProject?.name || 'script'}-all-scenes.txt`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                              
                              toast.success("All scenes exported successfully!");
                            }}
                          >
                            <DownloadIcon className="w-4 h-4 mr-2" />
                            Export Scenes
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {(showAllScenes ? pdfAnalysisResults.data.scenes : pdfAnalysisResults.data.scenes.slice(0, 5))
                          .map((scene: any, index: number) => (
                          <div key={index} className="border-l-4 border-blue-500 pl-4 pb-4 border-b border-gray-100 last:border-b-0">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium text-base">
                                <span className="text-sm text-gray-500 mr-2">Scene {showAllScenes ? index + 1 : index + 1}:</span>
                                {scene.Scene_Names || scene.header || `Scene ${index + 1}`}
                              </h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const sceneText = `SCENE ${index + 1}: ${scene.Scene_Names || `Scene ${index + 1}`}\n\n` +
                                    `CHARACTERS: ${scene.Scene_Characters ? scene.Scene_Characters.join(', ') : 'None'}\n\n` +
                                    `ACTION: ${scene.Scene_action || 'No action description'}\n\n` +
                                    `DIALOGUES: ${scene.Scene_Dialogue ? scene.Scene_Dialogue.join('\n') : 'No dialogues'}\n\n` +
                                    `CONTENT: ${scene.Contents || 'No content'}`;
                                  
                                  navigator.clipboard.writeText(sceneText);
                                  toast.success(`Scene ${index + 1} copied to clipboard!`);
                                }}
                                title="Copy scene to clipboard"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                            
                            {/* Characters */}
                            {scene.Scene_Characters && scene.Scene_Characters.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2 mb-3">
                                {scene.Scene_Characters.map((char: string, i: number) => (
                                  <CategoryBadge key={i} variant="cast">{char}</CategoryBadge>
                                ))}
                              </div>
                            )}
                            
                            {/* Scene Action */}
                            {scene.Scene_action && (
                              <div className="mt-2 mb-3">
                                <h5 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Action</h5>
                                <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-md leading-relaxed">
                                  {showAllScenes ? scene.Scene_action : (
                                    scene.Scene_action.length > 300 
                                      ? scene.Scene_action.substring(0, 300) + '...' 
                                      : scene.Scene_action
                                  )}
                                </p>
                              </div>
                            )}
                            
                            {/* Dialogues */}
                            {scene.Scene_Dialogue && scene.Scene_Dialogue.length > 0 && (
                              <div className="mt-2">
                                <h5 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
                                  Dialogues ({scene.Scene_Dialogue.length})
                                </h5>
                                <div className="bg-blue-50 p-3 rounded-md">
                                  {(showAllScenes ? scene.Scene_Dialogue : scene.Scene_Dialogue.slice(0, 3))
                                    .map((dialogue: string, i: number) => (
                                    <div key={i} className="text-sm text-blue-800 mb-1 last:mb-0">
                                      "{ dialogue.length > 100 && !showAllScenes 
                                          ? dialogue.substring(0, 100) + '...' 
                                          : dialogue }"
                                    </div>
                                  ))}
                                  {!showAllScenes && scene.Scene_Dialogue.length > 3 && (
                                    <div className="text-xs text-blue-600 mt-2">
                                      +{scene.Scene_Dialogue.length - 3} more dialogues...
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {!showAllScenes && pdfAnalysisResults.data.scenes.length > 5 && (
                          <div className="text-center py-4">
                            <Button
                              variant="outline"
                              onClick={() => setShowAllScenes(true)}
                            >
                              <ChevronRight className="w-4 h-4 mr-2" />
                              Show All {pdfAnalysisResults.data.scenes.length} Scenes
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Characters List */}
                {pdfAnalysisResults.data?.characters && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Characters</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {pdfAnalysisResults.data.characters.slice(0, 20).map((character: string, index: number) => (
                          <CategoryBadge key={index} variant="cast">{character}</CategoryBadge>
                        ))}
                        {pdfAnalysisResults.data.characters.length > 20 && (
                          <span className="text-sm text-muted-foreground">
                            +{pdfAnalysisResults.data.characters.length - 20} more
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Character Interactions */}
                {pdfAnalysisResults.data?.interactions && pdfAnalysisResults.data.interactions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Character Interactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {pdfAnalysisResults.data.interactions.slice(0, 10).map((interaction: any, index: number) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm">{interaction.pair}</span>
                            <Badge variant="outline">{interaction.count} scenes</Badge>
                          </div>
                        ))}
                        {pdfAnalysisResults.data.interactions.length > 10 && (
                          <p className="text-sm text-muted-foreground text-center mt-4">
                            And {pdfAnalysisResults.data.interactions.length - 10} more interactions...
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Background Processing Status */}
            {(isGeneratingSchedule || isGeneratingBudget || backgroundProcessStatus) && (
              <Card className="border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    Background Processing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {backgroundProcessStatus}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {isGeneratingSchedule ? (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                      <span className="text-sm">Schedule Generation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isGeneratingBudget ? (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      ) : backgroundProcessComplete ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="text-sm">Budget Generation</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'depth' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Depth Analysis</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Advanced 4-agent pipeline analysis for comprehensive script breakdown
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
                        Running Depth Analysis... ({depthAnalysisProgress}%)
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Start Depth Analysis
                      </>
                    )}
                  </Button>

                  {isDepthAnalyzing && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress: {currentDepthAgent}</span>
                        <span>{depthAnalysisProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${depthAnalysisProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {depthAnalysisError && (
                    <div className="text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-2 inline" />
                      {depthAnalysisError}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {depthAnalysisResults && showDepthResults && (
              <div className="space-y-6">
                {/* Executive Summary Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Depth Analysis Results - Executive Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* High-level Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {depthAnalysisResults.integratedProductionBreakdown?.projectOverview?.totalScenes || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">Scenes Analyzed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {depthAnalysisResults.integratedProductionBreakdown?.productionElementsSummary?.totalUniqueCharacters || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">Characters</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {depthAnalysisResults.integratedProductionBreakdown?.productionElementsSummary?.totalUniqueLocations || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">Locations</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {Math.ceil(depthAnalysisResults.integratedProductionBreakdown?.projectOverview?.estimatedShootingDays || 0)}
                          </div>
                          <div className="text-sm text-muted-foreground">Shoot Days</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-indigo-600">
                            {depthAnalysisResults.workflowExecutionSummary?.agentsCoordinated || 4}
                          </div>
                          <div className="text-sm text-muted-foreground">AI Agents</div>
                        </div>
                      </div>

                      {/* Project Overview */}
                      {depthAnalysisResults.integratedProductionBreakdown?.projectOverview && (
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-medium mb-3 text-blue-800">Project Overview</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Screen Time:</span>
                              <br />
                              {depthAnalysisResults.integratedProductionBreakdown.projectOverview.totalEstimatedScreenTime}
                            </div>
                            <div>
                              <span className="font-medium">Budget Estimate:</span>
                              <br />
                              ${depthAnalysisResults.integratedProductionBreakdown.projectOverview.totalEstimatedBudget?.toLocaleString()}
                            </div>
                            <div>
                              <span className="font-medium">Crew Size:</span>
                              <br />
                              {depthAnalysisResults.integratedProductionBreakdown.projectOverview.crewSizeRecommendation} people
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Timing Analysis Summary */}
                      {depthAnalysisResults.integratedProductionBreakdown?.timingAnalysisSummary && (
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h4 className="font-medium mb-3 text-green-800">Timing Analysis Summary</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Average Scene:</span>
                              <br />
                              {depthAnalysisResults.integratedProductionBreakdown.timingAnalysisSummary.averageSceneLength}
                            </div>
                            <div>
                              <span className="font-medium">Shortest Scene:</span>
                              <br />
                              #{depthAnalysisResults.integratedProductionBreakdown.timingAnalysisSummary.shortestScene?.sceneNumber} - {depthAnalysisResults.integratedProductionBreakdown.timingAnalysisSummary.shortestScene?.screenTime}
                            </div>
                            <div>
                              <span className="font-medium">Longest Scene:</span>
                              <br />
                              #{depthAnalysisResults.integratedProductionBreakdown.timingAnalysisSummary.longestScene?.sceneNumber} - {depthAnalysisResults.integratedProductionBreakdown.timingAnalysisSummary.longestScene?.screenTime}
                            </div>
                            <div>
                              <span className="font-medium">Complexity Distribution:</span>
                              <br />
                              S:{depthAnalysisResults.integratedProductionBreakdown.timingAnalysisSummary.complexityDistribution?.simpleScenes} / 
                              M:{depthAnalysisResults.integratedProductionBreakdown.timingAnalysisSummary.complexityDistribution?.standardScenes} / 
                              C:{depthAnalysisResults.integratedProductionBreakdown.timingAnalysisSummary.complexityDistribution?.complexScenes}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Department Budget Summary */}
                      {depthAnalysisResults.integratedProductionBreakdown?.departmentBudgetSummary && (
                        <div className="bg-orange-50 p-4 rounded-lg">
                          <h4 className="font-medium mb-3 text-orange-800">Department Budget Breakdown</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
                            {Object.entries(depthAnalysisResults.integratedProductionBreakdown.departmentBudgetSummary)
                              .filter(([key]) => key !== 'grandTotal' && key !== 'budgetByPhase')
                              .map(([dept, amount]) => (
                                <div key={dept} className="text-center">
                                  <div className="font-medium text-orange-900 capitalize">
                                    {dept.replace(/([A-Z])/g, ' $1').trim()}
                                  </div>
                                  <div className="text-lg font-bold text-orange-700">
                                    ${(amount as number)?.toLocaleString() || '0'}
                                  </div>
                                </div>
                              ))
                            }
                          </div>
                          <div className="mt-4 pt-4 border-t border-orange-200 text-center">
                            <div className="text-lg font-bold text-orange-900">
                              Total Budget: ${depthAnalysisResults.integratedProductionBreakdown.departmentBudgetSummary.grandTotal?.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Workflow Execution Summary */}
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-3 text-purple-800">Workflow Execution Summary</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Processing Time:</span>
                            <br />
                            {Math.round(depthAnalysisResults.workflowExecutionSummary.totalProcessingTimeMs / 1000)}s
                          </div>
                          <div>
                            <span className="font-medium">Success Rate:</span>
                            <br />
                            {depthAnalysisResults.workflowExecutionSummary.overallSuccessRate}
                          </div>
                          <div>
                            <span className="font-medium">Validation Checks:</span>
                            <br />
                            {depthAnalysisResults.workflowExecutionSummary.validationChecksPassed} passed
                          </div>
                          <div>
                            <span className="font-medium">Confidence Score:</span>
                            <br />
                            {depthAnalysisResults.qualityControlReport?.overallConfidenceScore || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Agent Coordination Results */}
                {depthAnalysisResults.agentCoordinationResults && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Agent Coordination Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(depthAnalysisResults.agentCoordinationResults).map(([agentName, results]) => (
                          <div key={agentName} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-medium capitalize">
                                {agentName.replace(/([A-Z])/g, ' $1').trim()} Agent
                              </h5>
                              <Badge variant={results.executionStatus === 'SUCCESS' ? 'default' : 'destructive'}>
                                {results.executionStatus}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Scenes Processed:</span>
                                <br />
                                {(results as any).scenesProcessed || 0}
                              </div>
                              <div>
                                <span className="font-medium">Processing Time:</span>
                                <br />
                                {Math.round(results.processingTimeMs / 1000)}s
                              </div>
                              <div>
                                <span className="font-medium">Validation:</span>
                                <br />
                                <Badge variant={results.validationStatus === 'PASS' ? 'default' : 'destructive'}>
                                  {results.validationStatus}
                                </Badge>
                              </div>
                              <div>
                                <span className="font-medium">Key Findings:</span>
                                <br />
                                {results.keyFindings?.length || 0} insights
                              </div>
                            </div>
                            {results.keyFindings && results.keyFindings.length > 0 && (
                              <div className="mt-3">
                                <h6 className="font-medium text-sm mb-2">Key Findings:</h6>
                                <div className="space-y-1">
                                  {results.keyFindings.slice(0, 3).map((finding, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm">
                                      <Badge variant={finding.impact === 'high' ? 'destructive' : finding.impact === 'medium' ? 'secondary' : 'outline'}>
                                        {finding.impact}
                                      </Badge>
                                      <span>{finding.finding}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Risk Assessment and Recommendations */}
                {depthAnalysisResults.riskAssessmentAndRecommendations && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Risk Assessment & Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* Identified Risks */}
                        {depthAnalysisResults.riskAssessmentAndRecommendations.identifiedRisks && 
                         depthAnalysisResults.riskAssessmentAndRecommendations.identifiedRisks.length > 0 && (
                          <div>
                            <h5 className="font-medium mb-3 text-red-700">Identified Risks</h5>
                            <div className="space-y-3">
                              {depthAnalysisResults.riskAssessmentAndRecommendations.identifiedRisks.slice(0, 5).map((risk, idx) => (
                                <div key={idx} className="border-l-4 border-red-400 pl-4 py-2 bg-red-50">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="destructive">{risk.category}</Badge>
                                    <Badge variant={risk.probability === 'high' ? 'destructive' : risk.probability === 'medium' ? 'secondary' : 'outline'}>
                                      {risk.probability} probability
                                    </Badge>
                                    <Badge variant={risk.impact === 'high' ? 'destructive' : risk.impact === 'medium' ? 'secondary' : 'outline'}>
                                      {risk.impact} impact
                                    </Badge>
                                  </div>
                                  <p className="text-sm font-medium text-red-800">{risk.description}</p>
                                  <p className="text-sm text-red-600 mt-1">Mitigation: {risk.mitigation}</p>
                                  <p className="text-sm text-red-600">Contingency Cost: ${risk.contingencyCost?.toLocaleString()}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Optimization Opportunities */}
                        {depthAnalysisResults.riskAssessmentAndRecommendations.optimizationOpportunities && 
                         depthAnalysisResults.riskAssessmentAndRecommendations.optimizationOpportunities.length > 0 && (
                          <div>
                            <h5 className="font-medium mb-3 text-green-700">Optimization Opportunities</h5>
                            <div className="space-y-3">
                              {depthAnalysisResults.riskAssessmentAndRecommendations.optimizationOpportunities.slice(0, 5).map((opp, idx) => (
                                <div key={idx} className="border-l-4 border-green-400 pl-4 py-2 bg-green-50">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="default">{opp.category}</Badge>
                                    <span className="text-sm text-green-600">
                                      Potential Savings: ${opp.potentialSavings?.toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-sm font-medium text-green-800">{opp.description}</p>
                                  <p className="text-sm text-green-600 mt-1">Action: {opp.recommendedAction}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Raw Agent Outputs (if available) */}
                {Object.keys(rawAgentOutputs).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Raw Agent Outputs (Debug View)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(rawAgentOutputs).map(([agentName, outputs]) => (
                          <div key={agentName}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setExpandedRawSections(prev => ({
                                ...prev,
                                [agentName]: !prev[agentName]
                              }))}
                              className="mb-2"
                            >
                              {expandedRawSections[agentName] ? <ChevronDown className="w-4 h-4 mr-2" /> : <ChevronRight className="w-4 h-4 mr-2" />}
                              {agentName} Agent Raw Output
                            </Button>
                            {expandedRawSections[agentName] && (
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <pre className="text-xs overflow-auto max-h-96">
                                  {JSON.stringify(outputs, null, 2)}
                                </pre>
                              </div>
                            )}
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
      </div>
    </div>
  );
}