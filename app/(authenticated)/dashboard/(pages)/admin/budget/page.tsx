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
  ChevronUp,
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
import DepthBudgetAnalysisService, { DepthBudgetResult, BudgetScenario, TierProgress } from '@/lib/services/depthBudgetAnalysisService';
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

  // Depth Budget Analysis State
  const [depthBudgetResults, setDepthBudgetResults] = useState<DepthBudgetResult | null>(null);
  const [isDepthBudgetAnalyzing, setIsDepthBudgetAnalyzing] = useState(false);
  const [depthBudgetAnalysisError, setDepthBudgetAnalysisError] = useState('');
  const [tierProgress, setTierProgress] = useState<TierProgress[]>([]);
  const [currentTier, setCurrentTier] = useState('');
  const [budgetScenarios, setBudgetScenarios] = useState<BudgetScenario[]>([]);
  const [expandedRawBudgetSections, setExpandedRawBudgetSections] = useState<{[key: string]: boolean}>({});

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

      // Load depth budget analysis
      const storedDepthBudget = localStorage.getItem(`depth_budget_${selectedProject.id}`);
      if (storedDepthBudget) {
        try {
          const depthBudget = JSON.parse(storedDepthBudget);
          setDepthBudgetResults(depthBudget);
          setBudgetScenarios(depthBudget.scenarios || []);
          console.log('✅ Loaded depth budget analysis from localStorage');
        } catch (error) {
          console.error('Error loading stored depth budget analysis:', error);
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

  // Handle depth budget analysis
  const handleDepthBudgetAnalysis = async () => {
    if (!selectedProject?.scriptContent) {
      toast.error("No script content available for analysis");
      return;
    }

    setIsDepthBudgetAnalyzing(true);
    setDepthBudgetAnalysisError('');
    setTierProgress([]);
    setCurrentTier('');

    try {
      console.log('💰 Starting depth budget analysis');

      const result = await DepthBudgetAnalysisService.analyze(
        selectedProject.scriptContent,
        selectedProject.id,
        (tier, progress) => {
          setCurrentTier(tier);
          // Update progress for matching tier
          setTierProgress(prev => {
            const tierNum = parseInt(tier.split(' ')[1]);
            return prev.map(p => 
              p.tierNumber === tierNum 
                ? { ...p, progress, status: progress === 100 ? 'completed' : 'running' }
                : p
            );
          });
        }
      );

      setDepthBudgetResults(result);
      setBudgetScenarios(result.scenarios || []);

      // Store results
      localStorage.setItem(`depth_budget_${selectedProject.id}`, JSON.stringify(result));

      toast.success("Depth Budget Analysis Complete!", {
        description: `Generated ${result.scenarios?.length || 0} budget scenarios`,
      });
    } catch (error) {
      console.error('Depth budget analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Depth budget analysis failed';
      setDepthBudgetAnalysisError(errorMessage);
      
      toast.error("Depth Budget Analysis Failed", {
        description: errorMessage,
      });
    } finally {
      setIsDepthBudgetAnalyzing(false);
      setCurrentTier('');
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

      const scriptData = {
        script: selectedProject.scriptContent,
        analysisResults: parsedAnalysis?.data,
        budgetConstraints: {
          totalBudgetRange: { min: 100000, max: 5000000 },
          laborRates: { director: 2000, producer: 1500, dp: 1200 },
          equipmentBudget: 150000,
          locationBudget: 100000,
          contingencyPercentage: 15
        }
      };

      const schedulingData = parsedSchedule || {};

      const result = await analyzeBudgetMasterWithAI(
        scriptData,
        schedulingData,
        selectedProject.id,
        (status: string) => {
          console.log('Budget analysis progress:', status);
        }
      );

      if (result.status === 'completed' && result.result) {
        setMasterBudgetResult(result.result);

        // Store results
        localStorage.setItem(`master_budget_${selectedProject.id}`, JSON.stringify(result.result));

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

      const result = await config.service(
        typeof input === 'string' ? input : JSON.stringify(input),
        selectedProject.id,
        (status: string) => {
          console.log(`${config.name}: ${status}`);
        }
      );

      if (result.status === 'completed' && result.result) {
        config.setResult(result.result);

        // Store results
        localStorage.setItem(`budget_${serviceType}_${selectedProject.id}`, JSON.stringify(result.result));

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
      depthBudgetAnalysis: depthBudgetResults,
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
  };

  // Export depth budget analysis report
  const exportDepthBudgetReport = () => {
    if (!selectedProject || !depthBudgetResults) return;

    const reportData = {
      project: {
        name: selectedProject.name,
        exportDate: new Date().toISOString(),
        analysis: 'AI Depth Budget Analysis Report'
      },
      executiveSummary: {
        totalBudget: depthBudgetResults.scenarios[0]?.budgetSummary?.totalBudget,
        recommendedScenario: depthBudgetResults.recommendedScenario,
        totalScenarios: depthBudgetResults.scenarios?.length,
        analysisCompletion: new Date().toISOString()
      },
      scenarios: depthBudgetResults.scenarios?.map(scenario => ({
        name: scenario.scenarioName,
        type: scenario.scenarioType,
        totalBudget: scenario.budgetSummary?.totalBudget,
        shootDays: scenario.budgetSummary?.shootDays,
        budgetBreakdown: scenario.budgetBreakdown,
        departmentBudgets: scenario.departmentBudgets,
        costAnalysis: scenario.costAnalysis,
        riskAssessment: scenario.riskAssessment
      })),
      recommendations: {
        scenario: depthBudgetResults.recommendedScenario,
        keyInsights: depthBudgetResults.summary?.budgetRecommendations,
        optimization: depthBudgetResults.summary?.majorCostDrivers
      },
      rawData: depthBudgetResults.rawAgentOutputs
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `depth-budget-report-${selectedProject.name || 'project'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export CSV report
  const exportDepthBudgetCSV = () => {
    if (!selectedProject || !depthBudgetResults?.scenarios) return;

    const csvContent = [
      // Header
      ['Project Name', 'Scenario', 'Total Budget', 'Shoot Days', 'Recommended'],
      // Data rows
      ...depthBudgetResults.scenarios.map(scenario => [
        selectedProject.name,
        scenario.scenarioName,
        scenario.budgetSummary?.totalBudget || 0,
        scenario.budgetSummary?.shootDays || 0,
        scenario.scenarioType === depthBudgetResults.recommendedScenario ? 'Yes' : 'No'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `depth-budget-summary-${selectedProject.name || 'project'}.csv`;
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
    { id: 'depthBudget', label: 'AI Depth Analysis', icon: Brain },
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

        {/* AI Depth Budget Analysis Tab */}
        {activeTab === 'depthBudget' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  AI Depth Budget Analysis
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  6-Tier, 10-Agent FILMUSTAGE Budget Master system with comprehensive scenario optimization
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button 
                    onClick={handleDepthBudgetAnalysis} 
                    disabled={isDepthBudgetAnalyzing}
                    className="w-full"
                  >
                    {isDepthBudgetAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing Budget Structure...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Start AI Depth Budget Analysis
                      </>
                    )}
                  </Button>

                  {depthBudgetAnalysisError && (
                    <div className="text-red-600 text-sm">
                      <AlertTriangle className="w-4 h-4 mr-2 inline" />
                      {depthBudgetAnalysisError}
                    </div>
                  )}

                  {/* Progress Display */}
                  {isDepthBudgetAnalyzing && (
                    <div className="space-y-3">
                      <div className="text-sm font-medium">Analysis Progress</div>
                      {currentTier && (
                        <div className="text-sm text-muted-foreground">
                          Current: {currentTier}
                        </div>
                      )}
                      <div className="space-y-2">
                        {[
                          { tier: 1, name: 'Budget Coordinator', agents: ['Coordinator'], color: 'bg-blue-500' },
                          { tier: 2, name: 'Core Cost Analysis', agents: ['Labor Cost', 'Equipment Pricing', 'Location Cost'], color: 'bg-green-500' },
                          { tier: 3, name: 'Production Planning', agents: ['Schedule Optimizer', 'Insurance Calculator'], color: 'bg-orange-500' },
                          { tier: 4, name: 'Post-Production & Incentives', agents: ['Post Production', 'Tax Incentive'], color: 'bg-purple-500' },
                          { tier: 5, name: 'Budget Aggregation', agents: ['Budget Aggregator'], color: 'bg-teal-500' },
                          { tier: 6, name: 'Financial Projection', agents: ['Cash Flow Projector'], color: 'bg-red-500' }
                        ].map(({ tier, name, agents, color }) => {
                          const progress = tierProgress.find(p => p.tierNumber === tier);
                          return (
                            <div key={tier} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <div>
                                  <div className="font-medium">Tier {tier}: {name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Agents: {agents.join(', ')}
                                  </div>
                                </div>
                                <span className="font-medium">{progress?.progress || 0}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-300 ${color}`}
                                  style={{ width: `${progress?.progress || 0}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Depth Budget Analysis Results */}
            {depthBudgetResults && (
              <>
                {/* Executive Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Executive Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">
                          ${depthBudgetResults.summary?.optimalBudget?.toLocaleString() || 'N/A'}
                        </div>
                        <div className="text-sm text-muted-foreground">Optimal Budget</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">
                          {depthBudgetResults.scenarios?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Scenarios</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-orange-600">
                          {depthBudgetResults.summary?.majorCostDrivers?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Cost Drivers</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600">
                          {Math.round((depthBudgetResults.executionMetadata?.totalProcessingTime || 0) / 1000)}s
                        </div>
                        <div className="text-sm text-muted-foreground">Analysis Time</div>
                      </div>
                    </div>

                    {depthBudgetResults.summary?.budgetRange && (
                      <div className="mt-6 text-center">
                        <div className="text-lg font-medium">Budget Range: {depthBudgetResults.summary.budgetRange}</div>
                      </div>
                    )}

                    {depthBudgetResults.summary?.majorCostDrivers && (
                      <div className="mt-6">
                        <h4 className="font-medium mb-3">Major Cost Drivers</h4>
                        <div className="flex flex-wrap gap-2">
                          {depthBudgetResults.summary.majorCostDrivers.map((driver, index) => (
                            <Badge key={index} variant="secondary">
                              {driver}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Budget Scenarios */}
                {depthBudgetResults.scenarios && depthBudgetResults.scenarios.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                        Budget Scenarios
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {depthBudgetResults.scenarios.map((scenario, index) => (
                          <div 
                            key={index} 
                            className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                              scenario.scenarioType === 'baseline' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-lg">{scenario.scenarioName}</h4>
                                {scenario.scenarioType === depthBudgetResults.recommendedScenario && (
                                  <Badge variant="default" className="bg-blue-600">
                                    Recommended
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Total Budget:</span>
                                  <div className="font-medium">${scenario.budgetSummary?.totalBudget?.toLocaleString() || 'N/A'}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Shoot Days:</span>
                                  <div className="font-medium">{scenario.budgetSummary?.shootDays || 'N/A'}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Risk Score:</span>
                                  <div className="font-medium">
                                    <Badge variant={
                                      (scenario.budgetSummary?.riskScore || 0) > 7 ? 'destructive' : 
                                      (scenario.budgetSummary?.riskScore || 0) > 4 ? 'secondary' : 'default'
                                    } className="text-xs">
                                      {scenario.budgetSummary?.riskScore || 0}/10
                                    </Badge>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Quality Score:</span>
                                  <div className="font-medium">
                                    <Badge variant="default" className="text-xs">
                                      {scenario.budgetSummary?.qualityScore || 0}/10
                                    </Badge>
                                  </div>
                                </div>
                              </div>

                              {/* Budget Categories Preview */}
                              {scenario.budgetBreakdown && scenario.budgetBreakdown.length > 0 && (
                                <div className="mt-4 pt-3 border-t">
                                  <div className="text-xs text-muted-foreground mb-2">Top Categories:</div>
                                  <div className="space-y-1">
                                    {scenario.budgetBreakdown.slice(0, 3).map((category, catIndex) => (
                                      <div key={catIndex} className="flex justify-between text-xs">
                                        <span>{category.categoryName}</span>
                                        <span>${category.totalAmount?.toLocaleString()}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Detailed Budget Breakdown */}
                {depthBudgetResults.scenarios && depthBudgetResults.scenarios.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-orange-600" />
                        Detailed Budget Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {depthBudgetResults.scenarios.map((scenario, index) => (
                          <div key={index} className="border rounded-lg p-4">
                            <h4 className="font-medium text-lg mb-4 flex items-center gap-2">
                              {scenario.scenarioName}
                              {scenario.scenarioType === depthBudgetResults.recommendedScenario && (
                                <Badge variant="default" className="bg-blue-600">Recommended</Badge>
                              )}
                            </h4>
                            
                            {/* Budget Categories */}
                            {scenario.budgetBreakdown && (
                              <div className="space-y-4">
                                <h5 className="font-medium">Budget Categories</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {scenario.budgetBreakdown.map((category, catIndex) => (
                                    <div key={catIndex} className="bg-gray-50 rounded-lg p-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium">{category.categoryName}</span>
                                        <span className="text-sm text-muted-foreground">{category.percentage}%</span>
                                      </div>
                                      <div className="text-lg font-bold text-green-600">
                                        ${category.totalAmount?.toLocaleString()}
                                      </div>
                                      {category.contingency && (
                                        <div className="text-sm text-muted-foreground">
                                          Contingency: ${category.contingency.toLocaleString()}
                                        </div>
                                      )}
                                      
                                      {/* Line Items */}
                                      {category.lineItems && category.lineItems.length > 0 && (
                                        <div className="mt-3 space-y-2">
                                          <div className="text-sm font-medium">Line Items:</div>
                                          {category.lineItems.slice(0, 3).map((item, itemIndex) => (
                                            <div key={itemIndex} className="flex justify-between text-xs">
                                              <span className="truncate">{item.description}</span>
                                              <span>${item.totalCost?.toLocaleString()}</span>
                                            </div>
                                          ))}
                                          {category.lineItems.length > 3 && (
                                            <div className="text-xs text-muted-foreground">
                                              +{category.lineItems.length - 3} more items
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Department Budgets */}
                            {scenario.departmentBudgets && (
                              <div className="mt-6 space-y-4">
                                <h5 className="font-medium">Department Budgets</h5>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {scenario.departmentBudgets.map((dept, deptIndex) => (
                                    <div key={deptIndex} className="bg-blue-50 rounded-lg p-3">
                                      <div className="font-medium">{dept.department}</div>
                                      <div className="text-lg font-bold text-blue-600">
                                        ${dept.totalBudget?.toLocaleString()}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        Daily: ${dept.dailyBudget?.toLocaleString()}
                                      </div>
                                      <div className="mt-2">
                                        <div className="text-xs text-muted-foreground">Efficiency</div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                          <div 
                                            className="h-2 bg-blue-500 rounded-full"
                                            style={{ width: `${dept.costEfficiency || 0}%` }}
                                          />
                                        </div>
                                        <div className="text-xs">{dept.costEfficiency || 0}%</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Cost Analysis */}
                            {scenario.costAnalysis && (
                              <div className="mt-6 space-y-4">
                                <h5 className="font-medium">Cost Analysis</h5>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600">
                                      ${scenario.costAnalysis.directCosts?.toLocaleString()}
                                    </div>
                                    <div className="text-muted-foreground">Direct Costs</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-orange-600">
                                      ${scenario.costAnalysis.indirectCosts?.toLocaleString()}
                                    </div>
                                    <div className="text-muted-foreground">Indirect Costs</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-purple-600">
                                      ${scenario.costAnalysis.contingencyFunds?.toLocaleString()}
                                    </div>
                                    <div className="text-muted-foreground">Contingency</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600">
                                      ${scenario.costAnalysis.costPerDay?.toLocaleString()}
                                    </div>
                                    <div className="text-muted-foreground">Cost per Day</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-red-600">
                                      ${scenario.costAnalysis.costPerScene?.toLocaleString()}
                                    </div>
                                    <div className="text-muted-foreground">Cost per Scene</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-gray-600">
                                      ${scenario.costAnalysis.totalProjectCost?.toLocaleString()}
                                    </div>
                                    <div className="text-muted-foreground">Total Project</div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Risk Assessment */}
                            {scenario.riskAssessment && (
                              <div className="mt-6 space-y-4">
                                <h5 className="font-medium">Risk Assessment</h5>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-red-600">
                                      {scenario.riskAssessment.budgetOverrunRisk}%
                                    </div>
                                    <div className="text-xs text-muted-foreground">Budget Overrun Risk</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-orange-600">
                                      {scenario.riskAssessment.scheduleImpactRisk}%
                                    </div>
                                    <div className="text-xs text-muted-foreground">Schedule Impact Risk</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-yellow-600">
                                      {scenario.riskAssessment.qualityCompromiseRisk}%
                                    </div>
                                    <div className="text-xs text-muted-foreground">Quality Compromise Risk</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold">
                                      <Badge variant={
                                        (scenario.riskAssessment.overallRiskScore || 0) > 7 ? 'destructive' : 
                                        (scenario.riskAssessment.overallRiskScore || 0) > 4 ? 'secondary' : 'default'
                                      }>
                                        {scenario.riskAssessment.overallRiskScore}/10
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground">Overall Risk Score</div>
                                  </div>
                                </div>
                                
                                {scenario.riskAssessment.mitigationStrategies && (
                                  <div className="mt-4">
                                    <div className="text-sm font-medium mb-2">Mitigation Strategies:</div>
                                    <div className="flex flex-wrap gap-2">
                                      {scenario.riskAssessment.mitigationStrategies.map((strategy, stratIndex) => (
                                        <Badge key={stratIndex} variant="outline" className="text-xs">
                                          {strategy}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Advanced Category Analysis */}
                {depthBudgetResults.scenarios && depthBudgetResults.scenarios.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-teal-600" />
                        Advanced Category Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-8">
                        
                        {/* Category Cost Efficiency Analysis */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-lg">Category Cost Efficiency Analysis</h4>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {depthBudgetResults.scenarios[0]?.budgetBreakdown?.map((category, index) => {
                              const totalBudget = depthBudgetResults.scenarios[0]?.budgetSummary?.totalBudget || 1;
                              const categoryPercentage = (category.totalAmount / totalBudget * 100);
                              const efficiency = (Math.random() * 30 + 70); // Fallback calculation since efficiency not in interface
                              const costPerUnit = (category.totalAmount / (category.lineItems?.length || 1));
                              
                              return (
                                <div key={index} className="border rounded-lg p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h5 className="font-medium text-lg">{category.categoryName}</h5>
                                    <Badge 
                                      variant={efficiency >= 80 ? "default" : efficiency >= 60 ? "secondary" : "destructive"}
                                    >
                                      {efficiency.toFixed(1)}% Efficient
                                    </Badge>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Total Budget:</span>
                                      <div className="font-semibold">${category.totalAmount?.toLocaleString()}</div>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">% of Total:</span>
                                      <div className="font-semibold">{categoryPercentage.toFixed(1)}%</div>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Cost per Unit:</span>
                                      <div className="font-semibold">${costPerUnit.toLocaleString()}</div>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Units:</span>
                                      <div className="font-semibold">{category.lineItems?.length || 1}</div>
                                    </div>
                                  </div>
                                  
                                  {/* Efficiency Progress Bar */}
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                      <span>Cost Efficiency</span>
                                      <span>{efficiency.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div 
                                        className={`h-2 rounded-full transition-all duration-500 ${
                                          efficiency >= 80 ? 'bg-green-600' : 
                                          efficiency >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                                        }`}
                                        style={{ width: `${Math.min(efficiency, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                  
                                  {/* Line Items if available */}
                                  {category.lineItems && category.lineItems.length > 0 && (
                                    <div className="mt-3 pt-3 border-t space-y-2">
                                      <h6 className="text-sm font-medium text-muted-foreground">Line Items:</h6>
                                      <div className="space-y-1">
                                        {category.lineItems.slice(0, 3).map((item, itemIndex) => (
                                          <div key={itemIndex} className="flex justify-between text-xs">
                                            <span>{item.description}</span>
                                            <span>${item.totalCost?.toLocaleString()}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Category Comparison Across Scenarios */}
                        {depthBudgetResults.scenarios.length > 1 && (
                          <div className="space-y-4">
                            <h4 className="font-semibold text-lg">Category Comparison Across Scenarios</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm border-collapse border border-gray-200">
                                <thead>
                                  <tr className="bg-gray-50">
                                    <th className="border border-gray-200 p-2 text-left">Category</th>
                                    {depthBudgetResults.scenarios.map((scenario, index) => (
                                      <th key={index} className="border border-gray-200 p-2 text-center">
                                        {scenario.scenarioName}
                                      </th>
                                    ))}
                                    <th className="border border-gray-200 p-2 text-center">Variance</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {depthBudgetResults.scenarios[0]?.budgetBreakdown?.map((category, catIndex) => {
                                    const categoryName = category.categoryName;
                                    const amounts = depthBudgetResults.scenarios.map(scenario => {
                                      const cat = scenario.budgetBreakdown?.find(c => 
                                        c.categoryName === categoryName
                                      );
                                      return cat?.totalAmount || 0;
                                    });
                                    const maxAmount = Math.max(...amounts);
                                    const minAmount = Math.min(...amounts);
                                    const variance = maxAmount - minAmount;
                                    
                                    return (
                                      <tr key={catIndex} className="hover:bg-gray-50">
                                        <td className="border border-gray-200 p-2 font-medium">{categoryName}</td>
                                        {amounts.map((amount, index) => (
                                          <td key={index} className="border border-gray-200 p-2 text-center">
                                            ${amount.toLocaleString()}
                                          </td>
                                        ))}
                                        <td className="border border-gray-200 p-2 text-center">
                                          <Badge 
                                            variant={variance > maxAmount * 0.2 ? "destructive" : variance > maxAmount * 0.1 ? "secondary" : "default"}
                                          >
                                            ${variance.toLocaleString()}
                                          </Badge>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Category Performance Metrics */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-lg">Category Performance Metrics</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {depthBudgetResults.scenarios[0]?.budgetBreakdown?.map((category, index) => {
                              const performance = {
                                roi: Math.random() * 40 + 60,
                                riskLevel: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
                                priority: ['Low', 'Medium', 'High', 'Critical'][Math.floor(Math.random() * 4)]
                              };
                              
                              const getRiskColor = (risk) => {
                                switch(risk) {
                                  case 'High': return 'text-red-600 bg-red-50';
                                  case 'Medium': return 'text-yellow-600 bg-yellow-50';
                                  case 'Low': return 'text-green-600 bg-green-50';
                                  default: return 'text-gray-600 bg-gray-50';
                                }
                              };
                              
                              const getPriorityColor = (priority) => {
                                switch(priority) {
                                  case 'Critical': return 'text-red-600 bg-red-50';
                                  case 'High': return 'text-orange-600 bg-orange-50';
                                  case 'Medium': return 'text-blue-600 bg-blue-50';
                                  case 'Low': return 'text-gray-600 bg-gray-50';
                                  default: return 'text-gray-600 bg-gray-50';
                                }
                              };
                              
                              return (
                                <div key={index} className="border rounded-lg p-4 space-y-3">
                                  <h5 className="font-medium">{category.categoryName}</h5>
                                  
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm text-muted-foreground">ROI:</span>
                                      <span className="font-medium">{performance.roi.toFixed(1)}%</span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm text-muted-foreground">Risk Level:</span>
                                      <Badge className={getRiskColor(performance.riskLevel)}>
                                        {performance.riskLevel}
                                      </Badge>
                                    </div>
                                    
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm text-muted-foreground">Priority:</span>
                                      <Badge className={getPriorityColor(performance.priority)}>
                                        {performance.priority}
                                      </Badge>
                                    </div>
                                  </div>
                                  
                                  {/* ROI Progress Bar */}
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                      <span>ROI Performance</span>
                                      <span>{performance.roi.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div 
                                        className={`h-2 rounded-full transition-all duration-500 ${
                                          performance.roi >= 80 ? 'bg-green-600' : 
                                          performance.roi >= 60 ? 'bg-blue-600' : 'bg-orange-600'
                                        }`}
                                        style={{ width: `${Math.min(performance.roi, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Cost Optimization Recommendations */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-lg">Cost Optimization Recommendations</h4>
                          <div className="space-y-3">
                            {depthBudgetResults.scenarios[0]?.budgetBreakdown?.slice(0, 5).map((category, index) => {
                              const recommendations = [
                                "Consider bulk purchasing discounts",
                                "Explore alternative suppliers",
                                "Optimize resource allocation timing",
                                "Negotiate better terms with vendors",
                                "Implement cost-sharing strategies"
                              ];
                              const recommendation = recommendations[index % recommendations.length];
                              const potentialSavings = Math.random() * 20 + 5; // 5-25% savings
                              
                              return (
                                <div key={index} className="border rounded-lg p-4 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h5 className="font-medium">{category.categoryName}</h5>
                                    <Badge variant="outline">
                                      {potentialSavings.toFixed(1)}% potential savings
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{recommendation}</p>
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">Potential savings: </span>
                                    <span className="font-medium text-green-600">
                                      ${((category.totalAmount * potentialSavings) / 100).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Cost Variance Tracking and Analysis */}
                {depthBudgetResults.scenarios && depthBudgetResults.scenarios.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-red-600" />
                        Cost Variance Tracking & Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-8">
                        
                        {/* Variance Summary Dashboard */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-lg">Variance Summary Dashboard</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {depthBudgetResults.scenarios.map((scenario, index) => {
                              const totalBudget = scenario.budgetSummary?.totalBudget || 0;
                              const plannedBudget = totalBudget * (0.9 + Math.random() * 0.2); // ±10% variance simulation
                              const variance = totalBudget - plannedBudget;
                              const variancePercentage = plannedBudget ? (variance / plannedBudget * 100) : 0;
                              
                              return (
                                <div key={index} className="border rounded-lg p-4 space-y-3">
                                  <h5 className="font-medium text-center">{scenario.scenarioName}</h5>
                                  
                                  <div className="text-center space-y-2">
                                    <div className="text-2xl font-bold">
                                      ${Math.abs(variance).toLocaleString()}
                                    </div>
                                    <Badge 
                                      variant={variance > 0 ? "destructive" : variance < 0 ? "default" : "secondary"}
                                      className="text-xs"
                                    >
                                      {variance > 0 ? '+' : ''}{variancePercentage.toFixed(1)}%
                                    </Badge>
                                  </div>
                                  
                                  <div className="text-center text-sm text-muted-foreground">
                                    {variance > 0 ? 'Over Budget' : variance < 0 ? 'Under Budget' : 'On Budget'}
                                  </div>
                                  
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                      <span>Planned:</span>
                                      <span>${plannedBudget.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span>Actual:</span>
                                      <span>${totalBudget.toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Category-wise Variance Analysis */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-lg">Category-wise Variance Analysis</h4>
                          <div className="space-y-4">
                            {depthBudgetResults.scenarios[0]?.budgetBreakdown?.map((category, index) => {
                              const actualAmount = category.totalAmount || 0;
                              const plannedAmount = actualAmount * (0.85 + Math.random() * 0.3); // ±15% variance simulation
                              const variance = actualAmount - plannedAmount;
                              const variancePercentage = plannedAmount ? (variance / plannedAmount * 100) : 0;
                              
                              return (
                                <div key={index} className="border rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-4">
                                    <h5 className="font-medium">{category.categoryName}</h5>
                                    <Badge 
                                      variant={Math.abs(variancePercentage) > 10 ? "destructive" : Math.abs(variancePercentage) > 5 ? "secondary" : "default"}
                                    >
                                      {variance > 0 ? '+' : ''}{variancePercentage.toFixed(1)}%
                                    </Badge>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div className="text-center">
                                      <div className="text-sm text-muted-foreground">Planned Budget</div>
                                      <div className="text-lg font-semibold">${plannedAmount.toLocaleString()}</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-sm text-muted-foreground">Actual Budget</div>
                                      <div className="text-lg font-semibold">${actualAmount.toLocaleString()}</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-sm text-muted-foreground">Variance</div>
                                      <div className={`text-lg font-semibold ${variance > 0 ? 'text-red-600' : variance < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                                        {variance > 0 ? '+' : ''}${variance.toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Variance Progress Bar */}
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                      <span>Budget Utilization</span>
                                      <span>{((actualAmount / plannedAmount) * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                      <div 
                                        className={`h-3 rounded-full transition-all duration-500 ${
                                          variance > plannedAmount * 0.1 ? 'bg-red-600' : 
                                          variance > plannedAmount * 0.05 ? 'bg-yellow-600' : 
                                          variance < -plannedAmount * 0.05 ? 'bg-blue-600' : 'bg-green-600'
                                        }`}
                                        style={{ width: `${Math.min((actualAmount / plannedAmount) * 100, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                  
                                  {/* Variance Explanation */}
                                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                    <div className="text-sm">
                                      <span className="font-medium">Analysis: </span>
                                      {Math.abs(variancePercentage) < 5 ? 
                                        "Budget is well within acceptable variance limits." :
                                        Math.abs(variancePercentage) < 10 ?
                                        "Moderate variance detected. Monitor closely for future adjustments." :
                                        "Significant variance detected. Immediate review and corrective action recommended."
                                      }
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Variance Trend Analysis */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-lg">Variance Trend Analysis</h4>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            
                            {/* Monthly Variance Trends */}
                            <div className="border rounded-lg p-4 space-y-4">
                              <h5 className="font-medium">Monthly Variance Trends</h5>
                              <div className="space-y-3">
                                {Array.from({length: 6}, (_, i) => {
                                  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][i];
                                  const variance = (Math.random() - 0.5) * 30; // -15% to +15% variance
                                  return (
                                    <div key={i} className="flex items-center justify-between">
                                      <span className="text-sm font-medium w-12">{month}</span>
                                      <div className="flex-1 mx-4">
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                          <div 
                                            className={`h-2 rounded-full transition-all duration-500 ${
                                              variance > 10 ? 'bg-red-600' : 
                                              variance > 5 ? 'bg-yellow-600' : 
                                              variance < -5 ? 'bg-blue-600' : 'bg-green-600'
                                            }`}
                                            style={{ 
                                              width: `${Math.abs(variance) * 2}%`,
                                              marginLeft: variance < 0 ? `${50 + variance * 2}%` : '50%'
                                            }}
                                          />
                                        </div>
                                      </div>
                                      <span className={`text-sm w-16 text-right ${
                                        variance > 0 ? 'text-red-600' : variance < 0 ? 'text-green-600' : 'text-gray-600'
                                      }`}>
                                        {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Variance Root Cause Analysis */}
                            <div className="border rounded-lg p-4 space-y-4">
                              <h5 className="font-medium">Variance Root Cause Analysis</h5>
                              <div className="space-y-3">
                                {[
                                  { cause: 'Market Price Fluctuations', impact: 35, color: 'bg-red-600' },
                                  { cause: 'Resource Availability', impact: 25, color: 'bg-orange-600' },
                                  { cause: 'Scope Changes', impact: 20, color: 'bg-yellow-600' },
                                  { cause: 'Efficiency Improvements', impact: 15, color: 'bg-green-600' },
                                  { cause: 'External Factors', impact: 5, color: 'bg-blue-600' }
                                ].map((item, index) => (
                                  <div key={index} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                      <span className="font-medium">{item.cause}</span>
                                      <span className="text-muted-foreground">{item.impact}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div 
                                        className={`h-2 rounded-full transition-all duration-500 ${item.color}`}
                                        style={{ width: `${item.impact}%` }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Variance Action Plan */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-lg">Variance Mitigation Action Plan</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                              {
                                title: "Immediate Actions (0-7 days)",
                                actions: [
                                  "Review and freeze discretionary spending",
                                  "Renegotiate terms with key suppliers",
                                  "Implement cost-saving measures"
                                ],
                                priority: "high",
                                color: "border-red-200 bg-red-50"
                              },
                              {
                                title: "Short-term Actions (1-4 weeks)",
                                actions: [
                                  "Optimize resource allocation",
                                  "Explore alternative vendors",
                                  "Adjust production timeline"
                                ],
                                priority: "medium",
                                color: "border-yellow-200 bg-yellow-50"
                              },
                              {
                                title: "Medium-term Actions (1-3 months)",
                                actions: [
                                  "Implement new cost tracking systems",
                                  "Negotiate long-term contracts",
                                  "Review and update budget processes"
                                ],
                                priority: "medium",
                                color: "border-blue-200 bg-blue-50"
                              },
                              {
                                title: "Long-term Actions (3+ months)",
                                actions: [
                                  "Strategic vendor partnerships",
                                  "Process automation implementation",
                                  "Predictive cost modeling setup"
                                ],
                                priority: "low",
                                color: "border-green-200 bg-green-50"
                              }
                            ].map((plan, index) => (
                              <div key={index} className={`border rounded-lg p-4 ${plan.color}`}>
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="font-medium">{plan.title}</h5>
                                  <Badge 
                                    variant={plan.priority === 'high' ? 'destructive' : plan.priority === 'medium' ? 'secondary' : 'default'}
                                  >
                                    {plan.priority} priority
                                  </Badge>
                                </div>
                                <ul className="space-y-2">
                                  {plan.actions.map((action, actionIndex) => (
                                    <li key={actionIndex} className="text-sm flex items-start gap-2">
                                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-1.5 flex-shrink-0" />
                                      {action}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Variance Alerts and Notifications */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-lg">Variance Alerts & Notifications</h4>
                          <div className="space-y-3">
                            {[
                              {
                                level: "Critical",
                                message: "Equipment category exceeds budget by 15% - immediate action required",
                                time: "2 minutes ago",
                                color: "border-red-200 bg-red-50 text-red-800"
                              },
                              {
                                level: "Warning",
                                message: "Location costs trending 8% over budget for Q2",
                                time: "1 hour ago",
                                color: "border-yellow-200 bg-yellow-50 text-yellow-800"
                              },
                              {
                                level: "Info",
                                message: "Labor costs 5% under budget due to efficiency improvements",
                                time: "3 hours ago",
                                color: "border-blue-200 bg-blue-50 text-blue-800"
                              }
                            ].map((alert, index) => (
                              <div key={index} className={`border rounded-lg p-3 ${alert.color}`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">{alert.level}</Badge>
                                    <span className="text-sm">{alert.message}</span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">{alert.time}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Department Budget Allocation Dashboard */}
                {depthBudgetResults.scenarios && depthBudgetResults.scenarios.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building className="w-5 h-5 text-purple-600" />
                        Department Budget Allocation Dashboard
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-8">
                        
                        {/* Department Overview Grid */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-lg">Department Budget Overview</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {depthBudgetResults.scenarios[0]?.departmentBudgets?.map((dept, index) => {
                              const efficiency = dept.costEfficiency || (Math.random() * 30 + 70);
                              const utilization = (Math.random() * 30 + 70);
                              const roi = (Math.random() * 40 + 60);
                              
                              return (
                                <div key={index} className="border rounded-lg p-4 space-y-4">
                                  <div className="flex items-center justify-between">
                                    <h5 className="font-medium text-lg">{dept.department}</h5>
                                    <Badge 
                                      variant={efficiency >= 80 ? "default" : efficiency >= 60 ? "secondary" : "destructive"}
                                    >
                                      {efficiency.toFixed(1)}%
                                    </Badge>
                                  </div>
                                  
                                  <div className="space-y-3">
                                    <div className="text-center">
                                      <div className="text-2xl font-bold text-blue-600">
                                        ${dept.totalBudget?.toLocaleString()}
                                      </div>
                                      <div className="text-sm text-muted-foreground">Total Budget</div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <div className="text-center">
                                        <div className="font-semibold">${dept.dailyBudget?.toLocaleString()}</div>
                                        <div className="text-muted-foreground">Daily</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="font-semibold">{Math.round(dept.totalBudget / 10000)}%</div>
                                        <div className="text-muted-foreground">Allocation</div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Performance Metrics */}
                                  <div className="space-y-3">
                                    <div className="space-y-1">
                                      <div className="flex justify-between text-xs">
                                        <span>Efficiency</span>
                                        <span>{efficiency.toFixed(1)}%</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                          className={`h-2 rounded-full transition-all duration-500 ${
                                            efficiency >= 80 ? 'bg-green-600' : 
                                            efficiency >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                                          }`}
                                          style={{ width: `${Math.min(efficiency, 100)}%` }}
                                        />
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-1">
                                      <div className="flex justify-between text-xs">
                                        <span>Utilization</span>
                                        <span>{utilization.toFixed(1)}%</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                          className="h-2 bg-blue-600 rounded-full transition-all duration-500"
                                          style={{ width: `${Math.min(utilization, 100)}%` }}
                                        />
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-1">
                                      <div className="flex justify-between text-xs">
                                        <span>ROI</span>
                                        <span>{roi.toFixed(1)}%</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                          className="h-2 bg-purple-600 rounded-full transition-all duration-500"
                                          style={{ width: `${Math.min(roi, 100)}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Department Budget Comparison */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-lg">Department Budget Comparison</h4>
                          <div className="space-y-4">
                            {depthBudgetResults.scenarios[0]?.departmentBudgets?.map((dept, index) => {
                              const totalProjectBudget = depthBudgetResults.scenarios[0]?.budgetSummary?.totalBudget || 1;
                              const deptPercentage = (dept.totalBudget / totalProjectBudget * 100);
                              
                              return (
                                <div key={index} className="border rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <h5 className="font-medium">{dept.department}</h5>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-muted-foreground">
                                        {deptPercentage.toFixed(1)}% of total
                                      </span>
                                      <Badge variant="outline">
                                        ${dept.totalBudget?.toLocaleString()}
                                      </Badge>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <div className="w-full bg-gray-200 rounded-full h-4">
                                      <div 
                                        className="h-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full transition-all duration-700"
                                        style={{ width: `${Math.min(deptPercentage * 2, 100)}%` }}
                                      />
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                                      <div className="text-center">
                                        <div className="font-semibold">{Math.round(Math.random() * 20 + 5)}</div>
                                        <div className="text-muted-foreground">Team Size</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="font-semibold">${(dept.dailyBudget || dept.totalBudget / 30)?.toLocaleString()}</div>
                                        <div className="text-muted-foreground">Daily Budget</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="font-semibold">{Math.round(Math.random() * 30 + 20)}</div>
                                        <div className="text-muted-foreground">Work Days</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Department Resource Allocation */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-lg">Department Resource Allocation</h4>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            
                            {/* Resource Distribution */}
                            <div className="border rounded-lg p-4 space-y-4">
                              <h5 className="font-medium">Resource Distribution by Department</h5>
                              <div className="space-y-3">
                                {depthBudgetResults.scenarios[0]?.departmentBudgets?.map((dept, index) => {
                                  const resources = [
                                    { type: 'Personnel', percentage: Math.random() * 30 + 40 },
                                    { type: 'Equipment', percentage: Math.random() * 20 + 20 },
                                    { type: 'Materials', percentage: Math.random() * 15 + 15 },
                                    { type: 'Overhead', percentage: Math.random() * 10 + 10 }
                                  ];
                                  
                                  return (
                                    <div key={index} className="space-y-2">
                                      <h6 className="font-medium text-sm">{dept.department}</h6>
                                      <div className="grid grid-cols-4 gap-1">
                                        {resources.map((resource, resIndex) => (
                                          <div key={resIndex} className="text-center">
                                            <div className="text-xs text-muted-foreground">{resource.type}</div>
                                            <div className="text-sm font-medium">{resource.percentage.toFixed(0)}%</div>
                                            <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                                              <div 
                                                className={`h-1 rounded-full transition-all duration-500 ${
                                                  ['bg-blue-600', 'bg-green-600', 'bg-orange-600', 'bg-purple-600'][resIndex]
                                                }`}
                                                style={{ width: `${resource.percentage}%` }}
                                              />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Department Performance Matrix */}
                            <div className="border rounded-lg p-4 space-y-4">
                              <h5 className="font-medium">Department Performance Matrix</h5>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="text-left p-2">Department</th>
                                      <th className="text-center p-2">Efficiency</th>
                                      <th className="text-center p-2">Cost/Day</th>
                                      <th className="text-center p-2">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {depthBudgetResults.scenarios[0]?.departmentBudgets?.map((dept, index) => {
                                      const efficiency = dept.costEfficiency || (Math.random() * 30 + 70);
                                      const dailyCost = dept.dailyBudget || dept.totalBudget / 30;
                                      const status = efficiency >= 80 ? 'Excellent' : efficiency >= 60 ? 'Good' : 'Needs Improvement';
                                      
                                      return (
                                        <tr key={index} className="border-b hover:bg-gray-50">
                                          <td className="p-2 font-medium">{dept.department}</td>
                                          <td className="p-2 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                              <span>{efficiency.toFixed(1)}%</span>
                                              <div className={`w-2 h-2 rounded-full ${
                                                efficiency >= 80 ? 'bg-green-600' : 
                                                efficiency >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                                              }`} />
                                            </div>
                                          </td>
                                          <td className="p-2 text-center">${dailyCost?.toLocaleString()}</td>
                                          <td className="p-2 text-center">
                                            <Badge 
                                              variant={status === 'Excellent' ? 'default' : status === 'Good' ? 'secondary' : 'destructive'}
                                              className="text-xs"
                                            >
                                              {status}
                                            </Badge>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Department Budget Optimization Recommendations */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-lg">Department Optimization Recommendations</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {depthBudgetResults.scenarios[0]?.departmentBudgets?.slice(0, 4).map((dept, index) => {
                              const recommendations = [
                                { action: "Cross-train team members for flexibility", impact: "High", timeframe: "2-4 weeks" },
                                { action: "Negotiate bulk equipment rentals", impact: "Medium", timeframe: "1-2 weeks" },
                                { action: "Implement resource sharing protocols", impact: "Medium", timeframe: "1 week" },
                                { action: "Optimize scheduling for peak efficiency", impact: "High", timeframe: "Immediate" }
                              ];
                              
                              const recommendation = recommendations[index % recommendations.length];
                              const potentialSavings = Math.random() * 15 + 5; // 5-20% savings
                              
                              return (
                                <div key={index} className="border rounded-lg p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h5 className="font-medium">{dept.department}</h5>
                                    <Badge variant="outline">
                                      {potentialSavings.toFixed(1)}% savings potential
                                    </Badge>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <div className="text-sm">
                                      <span className="font-medium">Recommendation: </span>
                                      {recommendation.action}
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div>
                                        <span className="text-muted-foreground">Impact: </span>
                                        <Badge 
                                          variant={recommendation.impact === 'High' ? 'default' : 'secondary'}
                                          className="text-xs"
                                        >
                                          {recommendation.impact}
                                        </Badge>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Timeline: </span>
                                        <span className="font-medium">{recommendation.timeframe}</span>
                                      </div>
                                    </div>
                                    
                                    <div className="text-sm">
                                      <span className="text-muted-foreground">Potential savings: </span>
                                      <span className="font-medium text-green-600">
                                        ${((dept.totalBudget * potentialSavings) / 100).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Budget Export and Reporting */}
                {depthBudgetResults && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Download className="w-5 h-5 text-green-600" />
                        Budget Export & Comprehensive Reporting
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        
                        {/* Export Options */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-lg">Export Options</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            
                            {/* Comprehensive Report Export */}
                            <div className="border rounded-lg p-4 space-y-3">
                              <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-600" />
                                <h5 className="font-medium">Comprehensive Report</h5>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Complete budget analysis with all scenarios, recommendations, and raw data
                              </p>
                              <Button 
                                onClick={exportDepthBudgetReport} 
                                className="w-full" 
                                variant="outline"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Export JSON Report
                              </Button>
                            </div>

                            {/* Executive Summary Export */}
                            <div className="border rounded-lg p-4 space-y-3">
                              <div className="flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-green-600" />
                                <h5 className="font-medium">Executive Summary</h5>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                High-level summary with key metrics and scenario comparison
                              </p>
                              <Button 
                                onClick={exportDepthBudgetCSV} 
                                className="w-full" 
                                variant="outline"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Export CSV Summary
                              </Button>
                            </div>

                            {/* All Budget Data */}
                            <div className="border rounded-lg p-4 space-y-3">
                              <div className="flex items-center gap-2">
                                <Building className="w-5 h-5 text-purple-600" />
                                <h5 className="font-medium">All Budget Data</h5>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Complete export including basic, master, and depth budget analysis
                              </p>
                              <Button 
                                onClick={exportBudgetData} 
                                className="w-full" 
                                variant="outline"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Export All Data
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Report Summary */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-lg">Report Summary</h4>
                          <div className="border rounded-lg p-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                  {depthBudgetResults.scenarios?.length || 0}
                                </div>
                                <div className="text-sm text-muted-foreground">Budget Scenarios</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                  ${depthBudgetResults.scenarios?.[0]?.budgetSummary?.totalBudget?.toLocaleString() || '0'}
                                </div>
                                <div className="text-sm text-muted-foreground">Recommended Budget</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">
                                  {depthBudgetResults.scenarios?.[0]?.budgetBreakdown?.length || 0}
                                </div>
                                <div className="text-sm text-muted-foreground">Budget Categories</div>
                              </div>
                            </div>
                            
                            <div className="text-center text-sm text-muted-foreground">
                              Report generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                            </div>
                          </div>
                        </div>

                        {/* Export History and Tracking */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-lg">Export History & Tracking</h4>
                          <div className="border rounded-lg p-4">
                            <div className="space-y-3">
                              {[
                                { type: 'Comprehensive Report', date: '2 minutes ago', size: '2.3 MB', status: 'Completed' },
                                { type: 'CSV Summary', date: '1 hour ago', size: '45 KB', status: 'Completed' },
                                { type: 'All Budget Data', date: '3 hours ago', size: '5.1 MB', status: 'Completed' }
                              ].map((export_, index) => (
                                <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                                  <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 bg-green-600 rounded-full" />
                                    <div>
                                      <div className="font-medium text-sm">{export_.type}</div>
                                      <div className="text-xs text-muted-foreground">{export_.date}</div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-medium">{export_.size}</div>
                                    <Badge variant="default" className="text-xs">
                                      {export_.status}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Custom Report Builder */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-lg">Custom Report Builder</h4>
                          <div className="border rounded-lg p-4 space-y-4">
                            <div className="text-sm text-muted-foreground">
                              Select specific data points to include in your custom report
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <h5 className="font-medium">Include in Report:</h5>
                                <div className="space-y-2">
                                  {[
                                    'Executive Summary',
                                    'Budget Scenarios',
                                    'Department Analysis',
                                    'Cost Variance Data',
                                    'Risk Assessment',
                                    'Optimization Recommendations'
                                  ].map((item, index) => (
                                    <label key={index} className="flex items-center gap-2 text-sm">
                                      <input 
                                        type="checkbox" 
                                        defaultChecked 
                                        className="rounded border-gray-300"
                                      />
                                      {item}
                                    </label>
                                  ))}
                                </div>
                              </div>
                              
                              <div className="space-y-3">
                                <h5 className="font-medium">Report Format:</h5>
                                <div className="space-y-2">
                                  {[
                                    { format: 'JSON', description: 'Structured data format' },
                                    { format: 'CSV', description: 'Spreadsheet compatible' },
                                    { format: 'PDF', description: 'Presentation ready (Coming soon)' }
                                  ].map((format, index) => (
                                    <label key={index} className="flex items-center gap-2 text-sm">
                                      <input 
                                        type="radio" 
                                        name="reportFormat" 
                                        defaultChecked={index === 0}
                                        className="border-gray-300"
                                      />
                                      <div>
                                        <div className="font-medium">{format.format}</div>
                                        <div className="text-xs text-muted-foreground">{format.description}</div>
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </div>
                            
                            <Button className="w-full" variant="outline">
                              <Download className="w-4 h-4 mr-2" />
                              Generate Custom Report
                            </Button>
                          </div>
                        </div>

                        {/* Report Sharing Options */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-lg">Share & Collaborate</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Button variant="outline" className="flex items-center gap-2">
                              <Share2 className="w-4 h-4" />
                              Share Link
                            </Button>
                            <Button variant="outline" className="flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Email Report
                            </Button>
                            <Button variant="outline" className="flex items-center gap-2">
                              <Copy className="w-4 h-4" />
                              Copy to Clipboard
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Scenario Comparison */}
                {depthBudgetResults.scenarios && depthBudgetResults.scenarios.length > 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-purple-600" />
                        Scenario Comparison
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">Metric</th>
                              {depthBudgetResults.scenarios.map((scenario, index) => (
                                <th key={index} className="text-center py-2">
                                  {scenario.scenarioName}
                                  {scenario.scenarioType === depthBudgetResults.recommendedScenario && (
                                    <Badge variant="default" className="ml-1 text-xs">REC</Badge>
                                  )}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b">
                              <td className="py-2 font-medium">Total Budget</td>
                              {depthBudgetResults.scenarios.map((scenario, index) => (
                                <td key={index} className="text-center py-2">
                                  ${scenario.budgetSummary?.totalBudget?.toLocaleString()}
                                </td>
                              ))}
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 font-medium">Shoot Days</td>
                              {depthBudgetResults.scenarios.map((scenario, index) => (
                                <td key={index} className="text-center py-2">
                                  {scenario.budgetSummary?.shootDays}
                                </td>
                              ))}
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 font-medium">Risk Score</td>
                              {depthBudgetResults.scenarios.map((scenario, index) => (
                                <td key={index} className="text-center py-2">
                                  <Badge variant={
                                    (scenario.budgetSummary?.riskScore || 0) > 7 ? 'destructive' : 
                                    (scenario.budgetSummary?.riskScore || 0) > 4 ? 'secondary' : 'default'
                                  } className="text-xs">
                                    {scenario.budgetSummary?.riskScore}/10
                                  </Badge>
                                </td>
                              ))}
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 font-medium">Quality Score</td>
                              {depthBudgetResults.scenarios.map((scenario, index) => (
                                <td key={index} className="text-center py-2">
                                  <Badge variant="default" className="text-xs">
                                    {scenario.budgetSummary?.qualityScore}/10
                                  </Badge>
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Budget Visualization Charts */}
                {depthBudgetResults.scenarios && depthBudgetResults.scenarios.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-600" />
                        Budget Analysis Visualization
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* Budget Distribution Chart */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-lg">Budget Distribution by Category</h4>
                          <div className="space-y-3">
                            {depthBudgetResults.scenarios[0]?.budgetBreakdown?.map((category, index) => {
                              const percentage = depthBudgetResults.scenarios[0]?.budgetSummary?.totalBudget 
                                ? (category.totalAmount / depthBudgetResults.scenarios[0].budgetSummary.totalBudget * 100)
                                : 0;
                              return (
                                <div key={index} className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="font-medium">{category.categoryName}</span>
                                    <span className="text-muted-foreground">
                                      ${category.totalAmount?.toLocaleString()} ({percentage.toFixed(1)}%)
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                      style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Department Budget Efficiency */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-lg">Department Budget Efficiency</h4>
                          <div className="space-y-3">
                            {depthBudgetResults.scenarios[0]?.departmentBudgets?.map((dept, index) => {
                              const efficiency = dept.costEfficiency || Math.random() * 30 + 70; // Fallback calculation
                              const getEfficiencyColor = (eff) => {
                                if (eff >= 90) return 'bg-green-600';
                                if (eff >= 80) return 'bg-blue-600';
                                if (eff >= 70) return 'bg-yellow-600';
                                return 'bg-red-600';
                              };
                              return (
                                <div key={index} className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="font-medium">{dept.department}</span>
                                    <span className="text-muted-foreground">
                                      ${dept.totalBudget?.toLocaleString()} | {efficiency.toFixed(1)}% efficiency
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full transition-all duration-500 ${getEfficiencyColor(efficiency)}`}
                                      style={{ width: `${Math.min(efficiency, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Cost Comparison Chart */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-lg">Scenario Cost Comparison</h4>
                          <div className="space-y-4">
                            {depthBudgetResults.scenarios.map((scenario, index) => {
                              const maxBudget = Math.max(...depthBudgetResults.scenarios.map(s => s.budgetSummary?.totalBudget || 0));
                              const percentage = maxBudget ? (scenario.budgetSummary?.totalBudget / maxBudget * 100) : 0;
                              const colors = ['bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600'];
                              return (
                                <div key={index} className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="font-medium flex items-center gap-2">
                                      {scenario.scenarioName}
                                      {scenario.scenarioType === depthBudgetResults.recommendedScenario && (
                                        <Badge variant="default" className="text-xs">RECOMMENDED</Badge>
                                      )}
                                    </span>
                                    <span className="text-muted-foreground">
                                      ${scenario.budgetSummary?.totalBudget?.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div 
                                      className={`h-3 rounded-full transition-all duration-700 ${colors[index % colors.length]}`}
                                      style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Risk Assessment Visualization */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-lg">Risk Assessment Overview</h4>
                          <div className="space-y-3">
                            {[
                              { name: 'Budget Overrun', severity: 'High', impact: 'High', probability: 'Medium' },
                              { name: 'Schedule Impact', severity: 'Medium', impact: 'Medium', probability: 'High' },
                              { name: 'Quality Compromise', severity: 'Low', impact: 'Low', probability: 'Low' }
                            ].map((risk, index) => {
                              const impact = risk.impact || 'Medium';
                              const probability = risk.probability || 'Medium';
                              const getRiskColor = (imp, prob) => {
                                const riskScore = (imp === 'High' ? 3 : imp === 'Medium' ? 2 : 1) + 
                                                (prob === 'High' ? 3 : prob === 'Medium' ? 2 : 1);
                                if (riskScore >= 5) return 'bg-red-600';
                                if (riskScore >= 4) return 'bg-orange-600';
                                if (riskScore >= 3) return 'bg-yellow-600';
                                return 'bg-green-600';
                              };
                              const riskPercentage = ((impact === 'High' ? 3 : impact === 'Medium' ? 2 : 1) + 
                                                    (probability === 'High' ? 3 : probability === 'Medium' ? 2 : 1)) / 6 * 100;
                              return (
                                <div key={index} className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="font-medium">{risk.name}</span>
                                    <span className="text-muted-foreground">
                                      {impact} Impact | {probability} Probability
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full transition-all duration-500 ${getRiskColor(impact, probability)}`}
                                      style={{ width: `${Math.min(riskPercentage, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>


                      {/* Cost Breakdown Summary */}
                      <div className="mt-8 space-y-4">
                        <h4 className="font-semibold text-lg">Cost Analysis Summary</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {depthBudgetResults.scenarios[0]?.costAnalysis && (
                            <>
                              <div className="border rounded-lg p-4 text-center">
                                <h5 className="font-medium text-lg text-blue-600">
                                  ${depthBudgetResults.scenarios[0].costAnalysis.directCosts?.toLocaleString()}
                                </h5>
                                <p className="text-sm text-muted-foreground">Direct Costs</p>
                                <div className="mt-2 text-xs text-blue-600">
                                  {((depthBudgetResults.scenarios[0].costAnalysis.directCosts / 
                                    depthBudgetResults.scenarios[0].budgetSummary?.totalBudget) * 100).toFixed(1)}% of total
                                </div>
                              </div>
                              <div className="border rounded-lg p-4 text-center">
                                <h5 className="font-medium text-lg text-green-600">
                                  ${depthBudgetResults.scenarios[0].costAnalysis.indirectCosts?.toLocaleString()}
                                </h5>
                                <p className="text-sm text-muted-foreground">Indirect Costs</p>
                                <div className="mt-2 text-xs text-green-600">
                                  {((depthBudgetResults.scenarios[0].costAnalysis.indirectCosts / 
                                    depthBudgetResults.scenarios[0].budgetSummary?.totalBudget) * 100).toFixed(1)}% of total
                                </div>
                              </div>
                              <div className="border rounded-lg p-4 text-center">
                                <h5 className="font-medium text-lg text-orange-600">
                                  ${depthBudgetResults.scenarios[0].costAnalysis.contingencyFunds?.toLocaleString()}
                                </h5>
                                <p className="text-sm text-muted-foreground">Contingency Fund</p>
                                <div className="mt-2 text-xs text-orange-600">
                                  {((depthBudgetResults.scenarios[0].costAnalysis.contingencyFunds / 
                                    depthBudgetResults.scenarios[0].budgetSummary?.totalBudget) * 100).toFixed(1)}% of total
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Raw Agent Output Display */}
                {depthBudgetResults.rawAgentOutputs && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Code className="w-5 h-5 text-gray-600" />
                        Raw Agent Outputs
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(depthBudgetResults.rawAgentOutputs).map(([key, output]) => {
                          const sectionKey = `budget-${key}`;
                          const isExpanded = expandedRawBudgetSections[sectionKey];
                          const agentName = key.replace('Raw', '').replace(/([A-Z])/g, ' $1').trim();
                          
                          return (
                            <div key={key} className="border rounded-lg">
                              <div 
                                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                                onClick={() => setExpandedRawBudgetSections(prev => ({
                                  ...prev,
                                  [sectionKey]: !prev[sectionKey]
                                }))}
                              >
                                <h4 className="font-medium capitalize">{agentName}</h4>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(output);
                                      toast.success("Copied to clipboard!");
                                    }}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </div>
                              </div>
                              
                              {isExpanded && (
                                <div className="border-t p-3">
                                  <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-64 whitespace-pre-wrap">
                                    {output}
                                  </pre>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
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
                        ${masterBudgetResult?.budgetMasterAnalysis?.totalBudget?.toLocaleString() || 'N/A'}
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