"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CategoryBadge } from '@/components/ui/CategoryBadge';
import { 
  Plus, 
  Share2, 
  Download, 
  Settings, 
  Search, 
  FileText, 
  Loader2, 
  Wand2, 
  Brain, 
  BarChart3, 
  Clock, 
  Users, 
  MapPin, 
  DollarSign, 
  AlertTriangle, 
  Code, 
  CheckCircle, 
  RotateCcw, 
  ChevronDown, 
  ChevronRight, 
  Copy,
  Calculator,
  TrendingUp,
  Shield,
  Building,
  Zap
} from 'lucide-react';
import { analyzeBudgetCoordinatorWithAI, BudgetCoordinatorOutput } from '@/lib/services/budgetCoordinatorService';
import { analyzeLaborCostWithAI, LaborCostOutput } from '@/lib/services/laborCostService';
import { analyzeEquipmentPricingWithAI, EquipmentPricingOutput } from '@/lib/services/equipmentPricingService';
import { analyzeLocationCostWithAI, LocationCostOutput } from '@/lib/services/locationCostService';
import { analyzeScheduleOptimizerWithAI, ScheduleOptimizerOutput } from '@/lib/services/scheduleOptimizerService';
import { analyzeInsuranceCalculatorWithAI, InsuranceCalculatorOutput } from '@/lib/services/insuranceCalculatorService';
import { analyzePostProductionEstimatorWithAI, PostProductionEstimatorOutput } from '@/lib/services/postProductionEstimatorService';
import { analyzeTaxIncentiveAnalyzerWithAI, TaxIncentiveAnalyzerOutput } from '@/lib/services/taxIncentiveAnalyzerService';
import { analyzeBudgetAggregatorWithAI, BudgetAggregatorOutput } from '@/lib/services/budgetAggregatorService';
import { analyzeCashFlowProjectorWithAI, CashFlowProjectorOutput } from '@/lib/services/cashFlowProjectorService';
import { generateBasicBudgetWithAI, BasicBudgetOutput } from '@/lib/services/basicBudgetGeneratorService';
import { analyzeBudgetMasterWithAI, ComprehensiveBudgetMasterOutput } from '@/lib/services/aiBudgetMasterService';
import { useSelectedProject } from '@/hooks/useSelectedProject';
import { toast } from 'sonner';

export default function BudgetPage() {
  console.log('💰 ENHANCED BUDGETING PAGE: Component rendering at', new Date().toISOString());
  
  const { selectedProject } = useSelectedProject();
  const [activeTab, setActiveTab] = useState('basicBudget');
  const [showFringes, setShowFringes] = useState(false);
  const [fringeSearch, setFringeSearch] = useState('');
  
  // Budget 1 - Budget Coordinator state
  const [jsonInputBudgetCoordinator, setJsonInputBudgetCoordinator] = useState('');
  const [isAnalyzingBudgetCoordinator, setIsAnalyzingBudgetCoordinator] = useState(false);
  const [budgetCoordinatorResult, setBudgetCoordinatorResult] = useState<BudgetCoordinatorOutput | null>(null);
  const [budgetCoordinatorError, setBudgetCoordinatorError] = useState('');
  
  // Budget 2 - Labor Cost Calculator state
  const [jsonInputLaborCost, setJsonInputLaborCost] = useState('');
  const [isAnalyzingLaborCost, setIsAnalyzingLaborCost] = useState(false);
  const [laborCostResult, setLaborCostResult] = useState<LaborCostOutput | null>(null);
  const [laborCostError, setLaborCostError] = useState('');
  const [laborCostRawResponse, setLaborCostRawResponse] = useState<string>('');

  // Budget 3 - Equipment Pricing Engine state
  const [jsonInputEquipmentPricing, setJsonInputEquipmentPricing] = useState('');
  const [isAnalyzingEquipmentPricing, setIsAnalyzingEquipmentPricing] = useState(false);
  const [equipmentPricingResult, setEquipmentPricingResult] = useState<EquipmentPricingOutput | null>(null);
  const [equipmentPricingError, setEquipmentPricingError] = useState('');
  const [equipmentPricingRawResponse, setEquipmentPricingRawResponse] = useState<string>('');

  // Budget 4 - Location Cost Estimator state
  const [jsonInputLocationCost, setJsonInputLocationCost] = useState('');
  const [isAnalyzingLocationCost, setIsAnalyzingLocationCost] = useState(false);
  const [locationCostResult, setLocationCostResult] = useState<LocationCostOutput | null>(null);
  const [locationCostError, setLocationCostError] = useState('');
  const [locationCostRawResponse, setLocationCostRawResponse] = useState<string>('');

  // Budget 5 - Schedule Optimizer state
  const [jsonInputScheduleOptimizer, setJsonInputScheduleOptimizer] = useState('');
  const [isAnalyzingScheduleOptimizer, setIsAnalyzingScheduleOptimizer] = useState(false);
  const [scheduleOptimizerResult, setScheduleOptimizerResult] = useState<ScheduleOptimizerOutput | null>(null);
  const [scheduleOptimizerError, setScheduleOptimizerError] = useState('');
  const [scheduleOptimizerRawResponse, setScheduleOptimizerRawResponse] = useState<string>('');

  // Budget 6 - Insurance Calculator state
  const [jsonInputInsuranceCalculator, setJsonInputInsuranceCalculator] = useState('');
  const [isAnalyzingInsuranceCalculator, setIsAnalyzingInsuranceCalculator] = useState(false);
  const [insuranceCalculatorResult, setInsuranceCalculatorResult] = useState<InsuranceCalculatorOutput | null>(null);
  const [insuranceCalculatorError, setInsuranceCalculatorError] = useState('');
  const [insuranceCalculatorRawResponse, setInsuranceCalculatorRawResponse] = useState<string>('');

  // Budget 7 - Post-Production Estimator state
  const [jsonInputPostProductionEstimator, setJsonInputPostProductionEstimator] = useState('');
  const [isAnalyzingPostProductionEstimator, setIsAnalyzingPostProductionEstimator] = useState(false);
  const [postProductionEstimatorResult, setPostProductionEstimatorResult] = useState<PostProductionEstimatorOutput | null>(null);
  const [postProductionEstimatorError, setPostProductionEstimatorError] = useState('');
  const [postProductionEstimatorRawResponse, setPostProductionEstimatorRawResponse] = useState<string>('');

  // Budget 8 - Tax Incentive Analyzer state
  const [jsonInputTaxIncentiveAnalyzer, setJsonInputTaxIncentiveAnalyzer] = useState('');
  const [isAnalyzingTaxIncentiveAnalyzer, setIsAnalyzingTaxIncentiveAnalyzer] = useState(false);
  const [taxIncentiveAnalyzerResult, setTaxIncentiveAnalyzerResult] = useState<TaxIncentiveAnalyzerOutput | null>(null);
  const [taxIncentiveAnalyzerError, setTaxIncentiveAnalyzerError] = useState('');
  const [taxIncentiveAnalyzerRawResponse, setTaxIncentiveAnalyzerRawResponse] = useState<string>('');

  // Budget 9 - Budget Aggregator state
  const [jsonInputBudgetAggregator, setJsonInputBudgetAggregator] = useState('');
  const [isAnalyzingBudgetAggregator, setIsAnalyzingBudgetAggregator] = useState(false);
  const [budgetAggregatorResult, setBudgetAggregatorResult] = useState<BudgetAggregatorOutput | null>(null);
  const [budgetAggregatorError, setBudgetAggregatorError] = useState('');
  const [budgetAggregatorRawResponse, setBudgetAggregatorRawResponse] = useState<string>('');

  // Budget 10 - Cash Flow Projector state
  const [jsonInputCashFlowProjector, setJsonInputCashFlowProjector] = useState('');
  const [isAnalyzingCashFlowProjector, setIsAnalyzingCashFlowProjector] = useState(false);
  const [cashFlowProjectorResult, setCashFlowProjectorResult] = useState<CashFlowProjectorOutput | null>(null);
  const [cashFlowProjectorError, setCashFlowProjectorError] = useState('');
  const [cashFlowProjectorRawResponse, setCashFlowProjectorRawResponse] = useState<string>('');

  // Basic Budget Generator state
  const [isGeneratingBasicBudget, setIsGeneratingBasicBudget] = useState(false);
  const [basicBudgetResult, setBasicBudgetResult] = useState<BasicBudgetOutput | null>(null);
  const [basicBudgetError, setBasicBudgetError] = useState('');

  // Master Budget state
  const [isAnalyzingMasterBudget, setIsAnalyzingMasterBudget] = useState(false);
  const [masterBudgetResult, setMasterBudgetResult] = useState<ComprehensiveBudgetMasterOutput | null>(null);
  const [masterBudgetError, setMasterBudgetError] = useState('');

  // Raw response viewers
  const [expandedRawSections, setExpandedRawSections] = useState<{
    [key: string]: boolean;
  }>({});

  // Load existing budget data on component mount
  useEffect(() => {
    if (selectedProject) {
      // Load basic budget (check both keys for compatibility)
      let storedBasicBudget = localStorage.getItem(`basic_budget_${selectedProject.id}`);
      if (!storedBasicBudget) {
        // Check background processing key
        storedBasicBudget = localStorage.getItem(`budget_${selectedProject.id}`);
      }
      if (storedBasicBudget) {
        try {
          const budget = JSON.parse(storedBasicBudget);
          setBasicBudgetResult(budget);
          console.log('✅ Loaded basic budget data from localStorage');
        } catch (error) {
          console.error('Error loading stored basic budget:', error);
        }
      }

      // Load master budget
      const storedMasterBudget = localStorage.getItem(`master_budget_${selectedProject.id}`);
      if (storedMasterBudget) {
        try {
          const budget = JSON.parse(storedMasterBudget);
          setMasterBudgetResult(budget);
        } catch (error) {
          console.error('Error loading stored master budget:', error);
        }
      }

      // Load individual service results
      const services = [
        { key: 'coordinator', setter: setBudgetCoordinatorResult },
        { key: 'labor', setter: setLaborCostResult },
        { key: 'equipment', setter: setEquipmentPricingResult },
        { key: 'location', setter: setLocationCostResult },
        { key: 'schedule', setter: setScheduleOptimizerResult },
        { key: 'insurance', setter: setInsuranceCalculatorResult },
        { key: 'postprod', setter: setPostProductionEstimatorResult },
        { key: 'tax', setter: setTaxIncentiveAnalyzerResult },
        { key: 'aggregator', setter: setBudgetAggregatorResult },
        { key: 'cashflow', setter: setCashFlowProjectorResult }
      ];

      services.forEach(({ key, setter }) => {
        const stored = localStorage.getItem(`budget_${key}_${selectedProject.id}`);
        if (stored) {
          try {
            const result = JSON.parse(stored);
            setter(result);
          } catch (error) {
            console.error(`Error loading stored ${key} budget:`, error);
          }
        }
      });
    }
  }, [selectedProject]);

  // Generate basic budget - MATCHING FILMUSTAGE PATTERN
  const handleBasicBudgetGeneration = async () => {
    console.log('');
    console.log('💰 ===== BUDGETING PAGE: BASIC BUDGET GENERATION INITIATED =====');
    console.log('📅 TIMESTAMP:', new Date().toISOString());
    console.log('🖥️ COMPONENT: BudgetPage - Basic Budget Generator');
    console.log('💰 ===============================================================');
    console.log('');
    
    if (!selectedProject) {
      console.error('❌ PAGE: No project selected');
      setBasicBudgetError('No project selected');
      return;
    }

    console.log('🔍 PAGE: Validating project data...');
    console.log('📊 PAGE: Selected project ID:', selectedProject.id);
    console.log('📊 PAGE: Selected project name:', selectedProject.name);

    // Check for script analysis data with multiple key formats - MATCHING SCHEDULING PATTERN
    let analysisData = localStorage.getItem(`pdf_analysis_${selectedProject.id}`);
    
    // If not found, try filmustage format
    if (!analysisData) {
      analysisData = localStorage.getItem(`filmustage_pdf_analysis_${selectedProject.name}`);
    }
    
    // If still not found, try think.ai format
    if (!analysisData) {
      analysisData = localStorage.getItem(`thinkAI_pdf_analysis_${selectedProject.name}`);
    }

    if (!analysisData) {
      console.error('❌ PAGE: No script analysis results available');
      setBasicBudgetError('Script analysis results required. Please analyze your script first.');
      return;
    }

    console.log('✅ PAGE: Project validation passed');

    console.log('');
    console.log('🚀 PAGE: Starting basic budget generation process...');
    console.log('🔄 PAGE: Setting basic budget generation state...');
    
    setIsGeneratingBasicBudget(true);
    setBasicBudgetError('');
    setBasicBudgetResult(null);
    
    console.log('📊 PAGE: Basic budget state updated - isGenerating: true, error cleared, result cleared');

    try {
      // Get scheduling data from localStorage if available - MATCHING FILMUSTAGE PATTERN
      let schedulingData = null;
      try {
        const storedSchedule = localStorage.getItem(`schedule_${selectedProject.id}`);
        if (storedSchedule) {
          schedulingData = JSON.parse(storedSchedule);
          console.log('📅 PAGE: Found stored scheduling data for project');
        }
      } catch (error) {
        console.log('⚠️ PAGE: No scheduling data found, using basic estimates');
      }

      // Parse script analysis data
      let pdfAnalysisResults = null;
      try {
        const parsed = JSON.parse(analysisData);
        // Handle different storage formats
        if (parsed.results) {
          pdfAnalysisResults = { data: parsed.results };
        } else if (parsed.data) {
          pdfAnalysisResults = parsed;
        } else {
          pdfAnalysisResults = { data: parsed };
        }
        console.log('📊 PAGE: Successfully parsed script analysis data');
      } catch (error) {
        console.error('❌ PAGE: Failed to parse script analysis data:', error);
        setBasicBudgetError('Invalid script analysis data format');
        return;
      }

      // If no scheduling data, create basic scheduling info from script data - MATCHING FILMUSTAGE PATTERN
      if (!schedulingData) {
        const scriptData = pdfAnalysisResults.data;
        schedulingData = {
          scheduleOverview: {
            projectId: selectedProject.id,
            totalShootDays: Math.max(10, Math.ceil((scriptData.scenes?.length || scriptData.totalScenes || 20) * 0.5)),
            estimatedBudgetRange: { low: 100000, high: 500000 },
            recommendedCrewSize: 25
          },
          dailySchedule: [],
          castSchedule: [],
          locationSchedule: []
        };
        console.log('📅 PAGE: Created basic scheduling estimates from script data');
      }

      const projectId = selectedProject.id;
      console.log('📋 PAGE: Using project ID for basic budget:', projectId);
      console.log('📋 PAGE: Project name:', selectedProject.name);
      
      console.log('');
      console.log('🔄 PAGE: Calling generateBasicBudgetWithAI()...');
      console.log('📤 PAGE: Sending script and scheduling data for analysis');
      
      const result = await generateBasicBudgetWithAI(
        pdfAnalysisResults,
        schedulingData,
        projectId,
        (status) => {
          console.log('📢 PAGE: Basic budget progress callback received:', status);
        }
      );

      console.log('');
      console.log('📥 PAGE: Basic budget generation result received');
      console.log('📊 PAGE: Basic budget result status:', result.status);
      console.log('📊 PAGE: Basic budget result has data:', !!result.result);
      console.log('📊 PAGE: Basic budget result has error:', !!result.error);

      if (result.status === 'completed' && result.result) {
        console.log('✅ PAGE: Basic budget generation completed successfully');
        
        try {
          const budgetOutput = result.result.basicBudgetOutput;
          console.log('📊 PAGE: Generated budget total:', budgetOutput?.budgetSummary?.totalBudget || 'N/A');
          console.log('📊 PAGE: Budget categories count:', Object.keys(budgetOutput?.budgetCategories || {}).length);
        } catch (logError) {
          console.log('⚠️ PAGE: Could not log basic budget result summary:', logError.message);
        }

        setBasicBudgetResult(result.result);

        // Store results - MATCHING FILMUSTAGE PATTERN (save to both keys for compatibility)
        const storageKey = `basic_budget_${selectedProject.id}`;
        const backgroundKey = `budget_${selectedProject.id}`;
        localStorage.setItem(storageKey, JSON.stringify(result.result));
        localStorage.setItem(backgroundKey, JSON.stringify(result.result));
        console.log('💾 PAGE: Basic budget result stored in localStorage with keys:', storageKey, 'and', backgroundKey);

        toast.success("Basic Budget Generated!", {
          description: `Total budget: $${result.result.basicBudgetOutput?.budgetSummary?.totalBudget?.toLocaleString() || 'N/A'}`,
        });
      } else {
        throw new Error(result.error || 'Basic budget generation failed');
      }
    } catch (error) {
      console.error('❌ PAGE: Basic budget generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Basic budget generation failed';
      setBasicBudgetError(errorMessage);
      
      toast.error("Basic Budget Generation Failed", {
        description: errorMessage,
      });
    } finally {
      setIsGeneratingBasicBudget(false);
      console.log('🏁 PAGE: Basic budget generation process completed');
    }
  };

  // Generate comprehensive master budget
  const handleGenerateMasterBudget = async () => {
    if (!selectedProject?.scriptContent) {
      toast.error("No script content available for budget analysis");
      return;
    }

    setIsAnalyzingMasterBudget(true);
    setMasterBudgetError('');

    try {
      console.log('🎯 Starting comprehensive master budget analysis');

      // Get all available data
      const analysisData = localStorage.getItem(`pdf_analysis_${selectedProject.id}`);
      const scheduleData = localStorage.getItem(`schedule_${selectedProject.id}`);

      let parsedAnalysis = null;
      let parsedSchedule = null;
      
      try {
        parsedAnalysis = analysisData ? JSON.parse(analysisData) : null;
        parsedSchedule = scheduleData ? JSON.parse(scheduleData) : null;
      } catch (e) {
        console.warn('Could not parse existing data');
      }

      const input = {
        script: selectedProject.scriptContent,
        analysisResults: parsedAnalysis?.data,
        scheduleResults: parsedSchedule,
        budgetConstraints: {
          totalBudgetRange: { min: 100000, max: 5000000 },
          laborRates: { director: 2000, producer: 1500, dp: 1200 },
          equipmentBudget: 150000,
          locationBudget: 100000,
          contingencyPercentage: 15
        }
      };

      const result = await analyzeBudgetMasterWithAI(input);

      if (result.success && result.data) {
        setMasterBudgetResult(result.data);

        // Store results
        localStorage.setItem(`master_budget_${selectedProject.id}`, JSON.stringify(result.data));

        toast.success("Master Budget Analysis Complete!", {
          description: "Comprehensive budget breakdown generated with all 10 services",
        });
      } else {
        throw new Error(result.error || 'Master budget analysis failed');
      }
    } catch (error) {
      console.error('Master budget analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Master budget analysis failed';
      setMasterBudgetError(errorMessage);
      
      toast.error("Master Budget Analysis Failed", {
        description: errorMessage,
      });
    } finally {
      setIsAnalyzingMasterBudget(false);
    }
  };

  // Generate individual budget service analysis
  const handleBudgetServiceAnalysis = async (serviceType: string) => {
    if (!selectedProject?.scriptContent) {
      toast.error("No script content available for analysis");
      return;
    }

    const serviceConfig = {
      coordinator: {
        service: analyzeBudgetCoordinatorWithAI,
        setAnalyzing: setIsAnalyzingBudgetCoordinator,
        setResult: setBudgetCoordinatorResult,
        setError: setBudgetCoordinatorError,
        input: jsonInputBudgetCoordinator,
        name: 'Budget Coordinator'
      },
      labor: {
        service: analyzeLaborCostWithAI,
        setAnalyzing: setIsAnalyzingLaborCost,
        setResult: setLaborCostResult,
        setError: setLaborCostError,
        input: jsonInputLaborCost,
        name: 'Labor Cost Calculator'
      },
      equipment: {
        service: analyzeEquipmentPricingWithAI,
        setAnalyzing: setIsAnalyzingEquipmentPricing,
        setResult: setEquipmentPricingResult,
        setError: setEquipmentPricingError,
        input: jsonInputEquipmentPricing,
        name: 'Equipment Pricing Engine'
      },
      location: {
        service: analyzeLocationCostWithAI,
        setAnalyzing: setIsAnalyzingLocationCost,
        setResult: setLocationCostResult,
        setError: setLocationCostError,
        input: jsonInputLocationCost,
        name: 'Location Cost Estimator'
      },
      schedule: {
        service: analyzeScheduleOptimizerWithAI,
        setAnalyzing: setIsAnalyzingScheduleOptimizer,
        setResult: setScheduleOptimizerResult,
        setError: setScheduleOptimizerError,
        input: jsonInputScheduleOptimizer,
        name: 'Schedule Optimizer'
      },
      insurance: {
        service: analyzeInsuranceCalculatorWithAI,
        setAnalyzing: setIsAnalyzingInsuranceCalculator,
        setResult: setInsuranceCalculatorResult,
        setError: setInsuranceCalculatorError,
        input: jsonInputInsuranceCalculator,
        name: 'Insurance Calculator'
      },
      postprod: {
        service: analyzePostProductionEstimatorWithAI,
        setAnalyzing: setIsAnalyzingPostProductionEstimator,
        setResult: setPostProductionEstimatorResult,
        setError: setPostProductionEstimatorError,
        input: jsonInputPostProductionEstimator,
        name: 'Post-Production Estimator'
      },
      tax: {
        service: analyzeTaxIncentiveAnalyzerWithAI,
        setAnalyzing: setIsAnalyzingTaxIncentiveAnalyzer,
        setResult: setTaxIncentiveAnalyzerResult,
        setError: setTaxIncentiveAnalyzerError,
        input: jsonInputTaxIncentiveAnalyzer,
        name: 'Tax Incentive Analyzer'
      },
      aggregator: {
        service: analyzeBudgetAggregatorWithAI,
        setAnalyzing: setIsAnalyzingBudgetAggregator,
        setResult: setBudgetAggregatorResult,
        setError: setBudgetAggregatorError,
        input: jsonInputBudgetAggregator,
        name: 'Budget Aggregator'
      },
      cashflow: {
        service: analyzeCashFlowProjectorWithAI,
        setAnalyzing: setIsAnalyzingCashFlowProjector,
        setResult: setCashFlowProjectorResult,
        setError: setCashFlowProjectorError,
        input: jsonInputCashFlowProjector,
        name: 'Cash Flow Projector'
      }
    };

    const config = serviceConfig[serviceType as keyof typeof serviceConfig];
    if (!config) return;

    config.setAnalyzing(true);
    config.setError('');

    try {
      console.log(`💰 Starting ${config.name} analysis`);

      // Get existing data
      const analysisData = localStorage.getItem(`pdf_analysis_${selectedProject.id}`);
      const scheduleData = localStorage.getItem(`schedule_${selectedProject.id}`);

      let input = {};
      
      // Parse JSON input if provided, otherwise use project data
      if (config.input.trim()) {
        try {
          input = JSON.parse(config.input);
        } catch (e) {
          throw new Error('Invalid JSON input format');
        }
      } else {
        // Use project data as fallback
        let parsedAnalysis = null;
        let parsedSchedule = null;
        
        try {
          parsedAnalysis = analysisData ? JSON.parse(analysisData) : null;
          parsedSchedule = scheduleData ? JSON.parse(scheduleData) : null;
        } catch (e) {
          console.warn('Could not parse existing data');
        }

        input = {
          script: selectedProject.scriptContent,
          analysisResults: parsedAnalysis?.data,
          scheduleResults: parsedSchedule
        };
      }

      const result = await config.service(input);

      if (result.success && result.data) {
        config.setResult(result.data);

        // Store results
        localStorage.setItem(`budget_${serviceType}_${selectedProject.id}`, JSON.stringify(result.data));

        toast.success(`${config.name} Complete!`, {
          description: "Analysis completed successfully",
        });
      } else {
        throw new Error(result.error || `${config.name} analysis failed`);
      }
    } catch (error) {
      console.error(`${config.name} analysis error:`, error);
      const errorMessage = error instanceof Error ? error.message : `${config.name} analysis failed`;
      config.setError(errorMessage);
      
      toast.error(`${config.name} Failed`, {
        description: errorMessage,
      });
    } finally {
      config.setAnalyzing(false);
    }
  };

  // Export budget data
  const exportBudgetData = () => {
    if (!selectedProject) return;

    const exportData = {
      project: selectedProject.name,
      timestamp: new Date().toISOString(),
      basicBudget: basicBudgetResult,
      masterBudget: masterBudgetResult,
      budgetServices: {
        coordinator: budgetCoordinatorResult,
        laborCost: laborCostResult,
        equipmentPricing: equipmentPricingResult,
        locationCost: locationCostResult,
        scheduleOptimizer: scheduleOptimizerResult,
        insurance: insuranceCalculatorResult,
        postProduction: postProductionEstimatorResult,
        taxIncentive: taxIncentiveAnalyzerResult,
        aggregator: budgetAggregatorResult,
        cashFlow: cashFlowProjectorResult
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-analysis-${selectedProject.name || 'project'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Budget data exported successfully!");
  };

  // Toggle raw response visibility
  const toggleRawSection = (section: string) => {
    setExpandedRawSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (!selectedProject) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">No Project Selected</h3>
            <p className="text-muted-foreground mb-4">Select a project to create its budget analysis</p>
            <Button asChild>
              <a href="/dashboard/admin/upload-script">Create Project</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const budgetTabs = [
    { id: 'basicBudget', label: 'Basic Budget', icon: Calculator },
    { id: 'masterBudget', label: 'Master Budget', icon: TrendingUp },
    { id: 'coordinator', label: 'Coordinator', icon: Users },
    { id: 'labor', label: 'Labor Cost', icon: Users },
    { id: 'equipment', label: 'Equipment', icon: Settings },
    { id: 'location', label: 'Location', icon: MapPin },
    { id: 'schedule', label: 'Schedule Opt.', icon: Clock },
    { id: 'insurance', label: 'Insurance', icon: Shield },
    { id: 'postprod', label: 'Post-Prod', icon: FileText },
    { id: 'tax', label: 'Tax Incentive', icon: Building },
    { id: 'aggregator', label: 'Aggregator', icon: BarChart3 },
    { id: 'cashflow', label: 'Cash Flow', icon: Zap }
  ];

  return (
    <div className="w-full min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-full">
        <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">💰 Production Budgeting</h1>
            <p className="text-muted-foreground mt-2">
              Project: {selectedProject.name}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Button variant="outline" onClick={exportBudgetData} className="text-xs sm:text-sm">
              <Download className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Export All Data</span>
              <span className="sm:hidden">Export</span>
            </Button>
            <Button onClick={handleBasicBudgetGeneration} disabled={isGeneratingBasicBudget} className="text-xs sm:text-sm">
              {isGeneratingBasicBudget ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 sm:mr-2 animate-spin" />
                  <span className="hidden sm:inline">Generating...</span>
                  <span className="sm:hidden">Gen...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Quick Budget</span>
                  <span className="sm:hidden">Budget</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex flex-wrap gap-2 sm:gap-4">
            {budgetTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'basicBudget' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Budget Generator</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Quick budget estimation based on script analysis and production schedule
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button 
                    onClick={handleBasicBudgetGeneration} 
                    disabled={isGeneratingBasicBudget}
                    className="w-full"
                  >
                    {isGeneratingBasicBudget ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating Basic Budget...
                      </>
                    ) : (
                      <>
                        <Calculator className="w-4 h-4 mr-2" />
                        Generate Basic Budget
                      </>
                    )}
                  </Button>

                  {basicBudgetError && (
                    <div className="text-red-600 text-sm">
                      <AlertTriangle className="w-4 h-4 mr-2 inline" />
                      {basicBudgetError}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {basicBudgetResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Basic Budget Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        ${basicBudgetResult.basicBudgetOutput?.budgetSummary?.totalBudget?.toLocaleString() || 'N/A'}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Budget</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {basicBudgetResult.basicBudgetOutput?.budgetSummary?.shootDays || 'N/A'}
                      </div>
                      <div className="text-sm text-muted-foreground">Shoot Days</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600">
                        {basicBudgetResult.basicBudgetOutput?.budgetBreakdown?.length || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Categories</div>
                    </div>
                  </div>

                  {basicBudgetResult.basicBudgetOutput?.budgetBreakdown && (
                    <div className="mt-6">
                      <h4 className="font-medium mb-4">Budget Breakdown</h4>
                      <div className="space-y-3">
                        {basicBudgetResult.basicBudgetOutput.budgetBreakdown.map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <div className="font-medium">{item.category}</div>
                              <div className="text-sm text-muted-foreground">{item.description}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">${item.amount.toLocaleString()}</div>
                              <div className="text-sm text-muted-foreground">{item.percentage}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'masterBudget' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Comprehensive Master Budget</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Complete budget analysis using all 10 AI budget services
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button 
                    onClick={handleGenerateMasterBudget} 
                    disabled={isAnalyzingMasterBudget}
                    className="w-full"
                  >
                    {isAnalyzingMasterBudget ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing with 10 Services...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Generate Master Budget
                      </>
                    )}
                  </Button>

                  {masterBudgetError && (
                    <div className="text-red-600 text-sm">
                      <AlertTriangle className="w-4 h-4 mr-2 inline" />
                      {masterBudgetError}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {masterBudgetResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Master Budget Analysis Complete
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        ${masterBudgetResult.comprehensiveBudgetMasterOutput?.consolidatedBudget?.totalBudget?.toLocaleString() || 'N/A'}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Budget</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        10
                      </div>
                      <div className="text-sm text-muted-foreground">AI Services</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600">
                        {masterBudgetResult.comprehensiveBudgetMasterOutput?.budgetSummary?.categories?.length || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Categories</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">
                        {masterBudgetResult.comprehensiveBudgetMasterOutput?.recommendations?.length || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Recommendations</div>
                    </div>
                  </div>

                  {masterBudgetResult.comprehensiveBudgetMasterOutput?.recommendations && (
                    <div className="mt-6">
                      <h4 className="font-medium mb-4">Budget Recommendations</h4>
                      <div className="space-y-3">
                        {masterBudgetResult.comprehensiveBudgetMasterOutput.recommendations.map((rec, index) => (
                          <div key={index} className="border-l-4 border-blue-500 pl-4">
                            <div className="font-medium">{rec.category}</div>
                            <div className="text-sm text-muted-foreground mt-1">{rec.recommendation}</div>
                            <Badge 
                              variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}
                              className="mt-2"
                            >
                              {rec.priority} priority
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Individual Budget Service Tabs */}
        {['coordinator', 'labor', 'equipment', 'location', 'schedule', 'insurance', 'postprod', 'tax', 'aggregator', 'cashflow'].includes(activeTab) && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="capitalize">{activeTab.replace(/([A-Z])/g, ' $1')} Service</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Individual AI service for specialized budget analysis
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      JSON Input (optional - will use project data if empty)
                    </label>
                    <Textarea
                      placeholder="Enter JSON input for this service or leave empty to use project data"
                      value={(() => {
                        const inputs = {
                          coordinator: jsonInputBudgetCoordinator,
                          labor: jsonInputLaborCost,
                          equipment: jsonInputEquipmentPricing,
                          location: jsonInputLocationCost,
                          schedule: jsonInputScheduleOptimizer,
                          insurance: jsonInputInsuranceCalculator,
                          postprod: jsonInputPostProductionEstimator,
                          tax: jsonInputTaxIncentiveAnalyzer,
                          aggregator: jsonInputBudgetAggregator,
                          cashflow: jsonInputCashFlowProjector
                        };
                        return inputs[activeTab as keyof typeof inputs] || '';
                      })()}
                      onChange={(e) => {
                        const setters = {
                          coordinator: setJsonInputBudgetCoordinator,
                          labor: setJsonInputLaborCost,
                          equipment: setJsonInputEquipmentPricing,
                          location: setJsonInputLocationCost,
                          schedule: setJsonInputScheduleOptimizer,
                          insurance: setJsonInputInsuranceCalculator,
                          postprod: setJsonInputPostProductionEstimator,
                          tax: setJsonInputTaxIncentiveAnalyzer,
                          aggregator: setJsonInputBudgetAggregator,
                          cashflow: setJsonInputCashFlowProjector
                        };
                        const setter = setters[activeTab as keyof typeof setters];
                        if (setter) setter(e.target.value);
                      }}
                      className="min-h-[120px] font-mono text-sm"
                    />
                  </div>

                  <Button 
                    onClick={() => handleBudgetServiceAnalysis(activeTab)}
                    disabled={(() => {
                      const analyzing = {
                        coordinator: isAnalyzingBudgetCoordinator,
                        labor: isAnalyzingLaborCost,
                        equipment: isAnalyzingEquipmentPricing,
                        location: isAnalyzingLocationCost,
                        schedule: isAnalyzingScheduleOptimizer,
                        insurance: isAnalyzingInsuranceCalculator,
                        postprod: isAnalyzingPostProductionEstimator,
                        tax: isAnalyzingTaxIncentiveAnalyzer,
                        aggregator: isAnalyzingBudgetAggregator,
                        cashflow: isAnalyzingCashFlowProjector
                      };
                      return analyzing[activeTab as keyof typeof analyzing] || false;
                    })()}
                    className="w-full"
                  >
                    {(() => {
                      const analyzing = {
                        coordinator: isAnalyzingBudgetCoordinator,
                        labor: isAnalyzingLaborCost,
                        equipment: isAnalyzingEquipmentPricing,
                        location: isAnalyzingLocationCost,
                        schedule: isAnalyzingScheduleOptimizer,
                        insurance: isAnalyzingInsuranceCalculator,
                        postprod: isAnalyzingPostProductionEstimator,
                        tax: isAnalyzingTaxIncentiveAnalyzer,
                        aggregator: isAnalyzingBudgetAggregator,
                        cashflow: isAnalyzingCashFlowProjector
                      };
                      return analyzing[activeTab as keyof typeof analyzing];
                    })() ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Analyze with AI
                      </>
                    )}
                  </Button>

                  {(() => {
                    const errors = {
                      coordinator: budgetCoordinatorError,
                      labor: laborCostError,
                      equipment: equipmentPricingError,
                      location: locationCostError,
                      schedule: scheduleOptimizerError,
                      insurance: insuranceCalculatorError,
                      postprod: postProductionEstimatorError,
                      tax: taxIncentiveAnalyzerError,
                      aggregator: budgetAggregatorError,
                      cashflow: cashFlowProjectorError
                    };
                    const error = errors[activeTab as keyof typeof errors];
                    return error && (
                      <div className="text-red-600 text-sm">
                        <AlertTriangle className="w-4 h-4 mr-2 inline" />
                        {error}
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Service Results */}
            {(() => {
              const results = {
                coordinator: budgetCoordinatorResult,
                labor: laborCostResult,
                equipment: equipmentPricingResult,
                location: locationCostResult,
                schedule: scheduleOptimizerResult,
                insurance: insuranceCalculatorResult,
                postprod: postProductionEstimatorResult,
                tax: taxIncentiveAnalyzerResult,
                aggregator: budgetAggregatorResult,
                cashflow: cashFlowProjectorResult
              };
              const result = results[activeTab as keyof typeof results];
              
              return result && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Analysis Results</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleRawSection(activeTab)}
                        >
                          {expandedRawSections[activeTab] ? (
                            <>
                              <ChevronUp className="w-4 h-4 mr-2" />
                              Hide Details
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 mr-2" />
                              Show Details
                            </>
                          )}
                        </Button>
                      </div>
                      
                      {expandedRawSections[activeTab] && (
                        <pre className="text-sm bg-white p-3 rounded border overflow-auto max-h-96">
                          {JSON.stringify(result, null, 2)}
                        </pre>
                      )}
                      
                      {!expandedRawSections[activeTab] && (
                        <div className="text-sm text-muted-foreground">
                          Analysis completed successfully. Click "Show Details" to view full results.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}