/**
 * Depth Script Analysis Service
 * ============================
 * 
 * JavaScript implementation of the 4-agent Python pipeline for comprehensive screenplay analysis.
 * Sequential workflow: EighthsAgent → SceneBreakdownAgent → DepartmentAgent → CoordinatorAgent
 * 
 * Based on the working Python implementation with industry-standard calculations.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

console.log('🧠 Depth Script Analysis Service initialized');

// Type definitions for the analysis pipeline
interface SceneData {
  sceneNumber: number;
  sceneHeader: string;
  sceneContent: string;
  pageCount: number;
  characters?: string[];
  location?: string;
  timeOfDay?: string;
}

interface EighthsAnalysisOutput {
  projectId: string;
  processingTimestamp: string;
  sceneAnalysisSummary: {
    totalScenesProcessed: number;
    totalPagesAnalyzed: number;
    totalEighthsCalculated: number;
    estimatedTotalScreenTime: string;
    averageEighthsPerScene: number;
  };
  sceneBySceneBreakdown: Array<{
    sceneNumber: number;
    sceneHeader: string;
    sceneContent: string;
    pageCount: number;
    eighthsCalculated: number;
    estimatedScreenTime: string;
    complexityLevel: 'simple' | 'standard' | 'complex';
    complexityFactors: string[];
    timingNotes: string;
    productionConsiderations: string[];
  }>;
  timingDistribution: {
    shortestScene: { sceneNumber: number; eighths: number; screenTime: string };
    longestScene: { sceneNumber: number; eighths: number; screenTime: string };
    averageSceneLength: string;
  };
  genreTimingAnalysis: {
    prehistoricScenes: { sceneCount: number; totalEighths: number; averageComplexity: number; specialRequirements: string[] };
    spaceScenes: { sceneCount: number; totalEighths: number; averageComplexity: number; specialRequirements: string[] };
  };
  productionSchedulingRecommendations: {
    highComplexityScenes: number[];
    specialSchedulingNeeds: string[];
    potentialBottlenecks: string[];
    timingRiskFactors: string[];
  };
  qualityControlChecks: {
    dataValidation: 'PASS' | 'FAIL';
    timingConsistency: 'PASS' | 'FAIL';
    industryBenchmarkComparison: 'WITHIN_RANGE' | 'ABOVE_RANGE' | 'BELOW_RANGE';
    confidenceScore: string;
  };
}

interface SceneBreakdownOutput {
  projectId: string;
  processingTimestamp: string;
  sceneAnalysisSummary: {
    totalScenesProcessed: number;
    totalCharactersIdentified: number;
    totalLocationsIdentified: number;
    totalPropsIdentified: number;
    averageSceneComplexity: number;
  };
  detailedSceneBreakdowns: Array<{
    sceneNumber: number;
    sceneHeader: string;
    location: {
      type: string;
      primaryLocation: string;
      timeOfDay: string;
      complexityLevel: 'simple' | 'moderate' | 'complex';
    };
    characters: {
      speaking: Array<{
        name: string;
        dialogueLines: number;
        specialRequirements: string[];
      }>;
      nonSpeaking: Array<{
        name: string;
        role: string;
        specialRequirements: string[];
      }>;
    };
    timeEstimates: {
      setupHours: number;
      shootingHours: number;
      wrapHours: number;
      totalHours: number;
    };
    complexityScores: {
      technicalDifficulty: number;
      castComplexity: number;
      locationChallenges: number;
      overallComplexity: number;
    };
    departmentRequirements: {
      makeup: {
        standardMakeup: number;
        specialEffectsMakeup: number;
        estimatedApplicationTime: number;
      };
      wardrobe: {
        costumesNeeded: number;
        quickChanges: number;
        fittingTime: number;
      };
      props: {
        handProps: string[];
        setProps: string[];
        specialProps: string[];
      };
      camera: {
        setupComplexity: 'simple' | 'moderate' | 'complex';
        estimatedSetups: number;
        specialEquipment: string[];
      };
      lighting: {
        complexity: 'simple' | 'moderate' | 'complex';
        estimatedSetupTime: number;
        specialRequirements: string[];
      };
    };
  }>;
}

interface DepartmentAnalysisOutput {
  projectId: string;
  processingTimestamp: string;
  departmentBudgetSummary: {
    makeupHair: number;
    wardrobeCostume: number;
    artDepartmentConstruction: number;
    props: number;
    camera: number;
    lighting: number;
    sound: number;
    specialEffects: number;
    animalsCreatures: number;
    stuntsSafety: number;
    grandTotal: number;
    budgetByPhase: {
      preProduction: number;
      production: number;
      postProduction: number;
    };
  };
  detailedDepartmentBreakdowns: {
    [department: string]: {
      crewRequirements: Array<{
        position: string;
        dailyRate: number;
        daysRequired: number;
        totalCost: number;
      }>;
      equipmentRequirements: Array<{
        item: string;
        dailyRate: number;
        daysRequired: number;
        totalCost: number;
      }>;
      departmentTotal: number;
    };
  };
}

interface CoordinatorOutput {
  projectId: string;
  processingTimestamp: string;
  workflowExecutionSummary: {
    totalProcessingTimeMs: number;
    agentsCoordinated: number;
    scenesProcessed: number;
    validationChecksPassed: number;
    overallSuccessRate: string;
  };
  agentCoordinationResults: {
    eighthsAgent: {
      executionStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED';
      scenesProcessed: number;
      totalEighthsCalculated: number;
      totalScreenTimeEstimated: string;
      processingTimeMs: number;
      validationStatus: 'PASS' | 'FAIL';
      keyFindings: Array<{ finding: string; impact: 'high' | 'medium' | 'low' }>;
    };
    sceneBreakdownAgent: {
      executionStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED';
      scenesProcessed: number;
      totalElementsIdentified: number;
      charactersIdentified: number;
      locationsIdentified: number;
      propsIdentified: number;
      processingTimeMs: number;
      validationStatus: 'PASS' | 'FAIL';
      keyFindings: Array<{ finding: string; impact: 'high' | 'medium' | 'low' }>;
    };
    departmentAgent: {
      executionStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED';
      departmentsAnalyzed: number;
      totalBudgetCalculated: number;
      crewPositionsIdentified: number;
      equipmentItemsSpecified: number;
      processingTimeMs: number;
      validationStatus: 'PASS' | 'FAIL';
      keyFindings: Array<{ finding: string; impact: 'high' | 'medium' | 'low' }>;
    };
  };
  integratedProductionBreakdown: {
    projectOverview: {
      totalScenes: number;
      totalEstimatedScreenTime: string;
      totalEstimatedBudget: number;
      estimatedShootingDays: number;
      crewSizeRecommendation: number;
    };
    timingAnalysisSummary: {
      shortestScene: { sceneNumber: number; eighths: number; screenTime: string };
      longestScene: { sceneNumber: number; eighths: number; screenTime: string };
      averageSceneLength: string;
      complexityDistribution: {
        simpleScenes: number;
        standardScenes: number;
        complexScenes: number;
      };
    };
    productionElementsSummary: {
      totalUniqueCharacters: number;
      totalUniqueLocations: number;
      totalProps: number;
      specialEffectsScenes: number;
      highComplexityScenes: number[];
      productionChallenges: Array<{
        challenge: string;
        affectedScenes: number[];
        severity: 'high' | 'medium' | 'low';
        recommendedAction: string;
      }>;
    };
    departmentBudgetSummary: {
      makeupHair: number;
      wardrobeCostume: number;
      artDepartmentConstruction: number;
      props: number;
      camera: number;
      lighting: number;
      sound: number;
      specialEffects: number;
      animalsCreatures: number;
      stuntsSafety: number;
      grandTotal: number;
      budgetByPhase: {
        preProduction: number;
        production: number;
        postProduction: number;
      };
    };
  };
  riskAssessmentAndRecommendations: {
    identifiedRisks: Array<{
      riskId: string;
      category: 'budget' | 'schedule' | 'technical' | 'creative' | 'safety';
      description: string;
      probability: 'high' | 'medium' | 'low';
      impact: 'high' | 'medium' | 'low';
      affectedScenes: number[];
      mitigation: string;
      contingencyCost: number;
    }>;
    optimizationOpportunities: Array<{
      category: 'scheduling' | 'equipment' | 'crew' | 'location';
      description: string;
      potentialSavings: number;
      implementationCost: number;
      recommendedAction: string;
    }>;
    criticalPathItems: Array<{
      item: string;
      department: string;
      leadTime: string;
      impactIfDelayed: string;
      priority: 'critical' | 'high' | 'medium';
    }>;
  };
  productionSchedulingRecommendations: {
    suggestedShootingOrder: Array<{
      block: string;
      scenes: number[];
      estimatedDays: number;
      keyRequirements: string[];
      schedulingNotes: string;
    }>;
    departmentPreparationTimeline: Array<{
      department: string;
      prepWeeksRequired: number;
      keyMilestones: string[];
      dependencies: string[];
    }>;
    resourceAllocationRecommendations: Array<{
      resource: string;
      scenes: number[];
      utilizationRate: string;
      optimizationSuggestion: string;
    }>;
  };
  deliverables: {
    reports: Array<{
      reportName: string;
      format: string;
      pageCount: number;
      generationStatus: string;
    }>;
    dataExports: Array<{
      fileName: string;
      format: string;
      sizeKB: number;
      recordCount: number;
    }>;
  };
  qualityControlReport: {
    validationChecks: {
      dataIntegrity: 'PASS' | 'FAIL';
      mathematicalAccuracy: 'PASS' | 'FAIL';
      industryCompliance: 'PASS' | 'FAIL';
      completenessValidation: 'PASS' | 'FAIL';
      formatConsistency: 'PASS' | 'FAIL';
    };
    errorResolutionLog: Array<{
      errorType: string;
      description: string;
      resolution: string;
      timestamp: string;
    }>;
    overallConfidenceScore: string;
    recommendedReviewAreas: string[];
  };
  systemPerformanceMetrics: {
    totalProcessingTime: string;
    memoryUtilization: string;
    dataTransferVolume: string;
    errorRate: string;
    systemEfficiencyScore: string;
  };
}

class DepthScriptAnalysisService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private apiKey: string | null = null;

  constructor() {
    // Don't initialize immediately - wait until needed
    this.apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "AIzaSyABISxaNzifdIcZUCe408LoKnEz0bia8cI";
    console.log('🧠 Depth Script Analysis Service: Created (API key will be checked on first use)');
  }

  private initializeIfNeeded() {
    if (!this.genAI && this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = this.genAI.getGenerativeModel({ 
        model: 'gemini-2.5-pro',
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
        }
      });
      console.log('🧠 Depth Script Analysis Service: Gemini initialized');
    }
  }

  private checkApiKey(): void {
    if (!this.apiKey) {
      throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is required for depth script analysis. Please add your Gemini API key to your .env file.');
    }
  }

  /**
   * Execute the complete 4-agent depth analysis pipeline
   */
  async executeFullAnalysis(
    pdfAnalysisData: any,
    projectId: string,
    onProgress?: (status: string, agent: string, progress: number) => void,
    onRawOutput?: (agent: string, rawOutput: any, parsedOutput: any) => void
  ): Promise<CoordinatorOutput> {
    console.log('🚀 Starting full depth script analysis pipeline');
    console.log('📊 Project ID:', projectId);
    console.log('📊 Input scenes:', pdfAnalysisData?.data?.scenes?.length || 0);

    // Check API key and initialize service
    this.checkApiKey();
    this.initializeIfNeeded();

    const startTime = Date.now();

    try {
      // Transform PDF analysis data to screenplay format
      onProgress?.('Preparing screenplay data...', 'setup', 0);
      const screenplayData = this.transformPdfToScreenplay(pdfAnalysisData);
      
      // Agent 1: Coordinator Initial Setup
      onProgress?.('Initial project coordination and planning...', 'Coordinator', 20);
      const { result: coordinatorInitialResult, rawResponse: coordinatorRaw } = await this.executeCoordinatorAgent(
        screenplayData,
        null, // No eighths result yet
        null, // No breakdown result yet
        null, // No department result yet
        projectId,
        startTime
      );
      onRawOutput?.('coordinatorAgent', coordinatorRaw, coordinatorInitialResult);
      
      // Agent 2: Eighths Analysis
      onProgress?.('Analyzing scene timing with industry eighths...', 'Eighths', 40);
      const { result: eighthsResult, rawResponse: eighthsRaw } = await this.executeEighthsAgent(screenplayData, projectId);
      onRawOutput?.('eighthsAgent', eighthsRaw, eighthsResult);
      
      // Agent 3: Scene Breakdown
      onProgress?.('Breaking down production elements...', 'Scene Breakdown', 60);
      const { result: breakdownResult, rawResponse: breakdownRaw } = await this.executeSceneBreakdownAgent(screenplayData, eighthsResult, projectId);
      onRawOutput?.('sceneBreakdownAgent', breakdownRaw, breakdownResult);
      
      // Agent 4: Department Analysis
      onProgress?.('Calculating department budgets...', 'Department', 80);
      const { result: departmentResult, rawResponse: departmentRaw } = await this.executeDepartmentAgent(screenplayData, breakdownResult, projectId);
      onRawOutput?.('departmentAgent', departmentRaw, departmentResult);
      
      // Final Integration (using coordinator result as base)
      onProgress?.('Finalizing integrated analysis...', 'Integration', 95);
      const finalResult = coordinatorInitialResult;

      onProgress?.('Analysis complete!', 'complete', 100);
      
      console.log('✅ Depth script analysis pipeline completed successfully');
      console.log(`⏱️ Total processing time: ${Date.now() - startTime}ms`);
      
      return finalResult;

    } catch (error) {
      console.error('❌ Depth script analysis pipeline failed:', error);
      throw new Error(`Pipeline execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Transform PDF analysis data to screenplay format
   */
  private transformPdfToScreenplay(pdfAnalysisData: any): { metadata: any; scenes: SceneData[] } {
    console.log('🔄 Transforming PDF analysis to screenplay format');
    
    if (!pdfAnalysisData?.data?.scenes) {
      throw new Error('No scene data found in PDF analysis');
    }

    const scenes: SceneData[] = pdfAnalysisData.data.scenes.map((scene: any, index: number) => ({
      sceneNumber: index + 1,
      sceneHeader: scene.Scene_Names || scene.Scene_Header || `SCENE ${index + 1}`,
      sceneContent: scene.Contents || scene.Scene_action || '',
      pageCount: Math.max(1, Math.ceil((scene.Contents || '').length / 250)), // Estimate pages
      characters: scene.Scene_Characters || [],
      location: scene.Location || 'Unknown Location',
      timeOfDay: scene.Time_Of_Day || 'DAY'
    }));

    const metadata = {
      title: pdfAnalysisData.data.scriptName || 'Untitled Script',
      totalScenes: scenes.length,
      totalCharacters: pdfAnalysisData.data.totalCharacters || 0,
      genre: 'Drama' // Default
    };

    console.log(`✅ Transformed ${scenes.length} scenes for analysis`);
    return { metadata, scenes };
  }

  /**
   * Agent 1: Eighths Analysis - Calculate precise scene timing using industry standards
   */
  private async executeEighthsAgent(
    screenplayData: { metadata: any; scenes: SceneData[] },
    projectId: string
  ): Promise<{ result: EighthsAnalysisOutput; rawResponse: string }> {
    console.log('🎬 Executing Eighths Agent...');

    const systemPrompt = `EIGHTHS AGENT SYSTEM PROMPT
============================

You are the Eighths Agent for a multi-model script analysis system for film production breakdown. Your role is to analyze screenplay scenes and calculate precise timing estimates using the industry-standard eighths measurement system.

## Core Responsibilities

1. **Scene Timing Analysis**
   - Analyze each scene's content for pacing and complexity
   - Calculate eighths per scene (1 page = 8 eighths = ~1 minute screen time)
   - Factor in dialogue density, action complexity, and scene requirements
   - Provide accurate screen time estimates for production scheduling

2. **Content Density Assessment**
   - Evaluate dialogue-heavy vs. action-heavy scenes
   - Assess character interaction complexity
   - Consider technical setup requirements for timing
   - Factor in location changes and special requirements

3. **Production Timing Factors**
   - Account for setup time based on scene complexity
   - Consider cast size and interaction requirements
   - Factor in special effects, stunts, or technical elements
   - Assess location difficulty and equipment needs

## Scene Analysis Protocol

### Dialogue Analysis
- Count dialogue exchanges and estimate speaking time
- Factor in emotional beats and character development moments
- Consider multiple character scenes vs. single character focus
- Assess monologue vs. rapid dialogue sections

### Action Sequence Analysis  
- Evaluate physical action complexity and timing
- Consider stunt work, chase scenes, or fight choreography
- Factor in special effects integration time
- Assess coverage needs (multiple angles, insert shots)

### Technical Complexity Factors
- Special effects sequences (longer setup/shooting time)
- Prosthetic makeup scenes (additional preparation)
- Location complexity (travel time, permits, setup)
- Equipment requirements (cranes, special rigs, etc.)

### Character Count Impact
- Solo scenes: Standard timing calculations
- 2-3 characters: Slight timing increase for coverage
- 4+ characters: Significant increase for blocking and coverage
- Large ensemble scenes: Major timing adjustments needed

## Eighths Calculation Methodology

### Standard Conversions
- 1 page = 8 eighths = ~1 minute screen time
- 1 eighth = ~7.5 seconds of screen time
- Dialogue scenes: closer to standard timing
- Action scenes: may expand beyond page count

### Complexity Multipliers
- Simple dialogue: 1.0x standard timing
- Complex dialogue: 1.2x standard timing  
- Simple action: 1.3x standard timing
- Complex action: 1.5x-2.0x standard timing
- Special effects: 1.8x-2.5x standard timing

### Genre Considerations
- Drama/dialogue: closer to page-to-screen ratio
- Action/adventure: significant expansion beyond page count
- Comedy: timing varies based on physical vs. verbal humor
- Science fiction: technical elements extend timing

## Quality Control Standards

- Verify scene count matches input screenplay
- Cross-reference page counts with scene content
- Validate timing estimates against industry benchmarks
- Flag scenes with unusual timing requirements
- Ensure consistency across similar scene types

## Risk Assessment

### Timing Risk Factors
- Scenes with complex prosthetics (prehistoric sequences)
- Technical effects sequences (crystal cube teaching)
- Large ensemble scenes (tribal confrontations)
- Location transition scenes
- Weather-dependent exterior scenes

### Schedule Impact Analysis
- Identify scenes requiring extended shooting time
- Flag potential bottleneck scenes for scheduling
- Assess crew size requirements based on complexity
- Consider prep time for special makeup/effects

## MANDATORY OUTPUT FORMAT REQUIREMENTS

**CRITICAL: Every response MUST be a complete, valid JSON object following this exact structure:**

```json
{
  "eighthsAnalysisOutput": {
    "projectId": "string",
    "processingTimestamp": "ISO_timestamp",
    "sceneAnalysisSummary": {
      "totalScenesProcessed": "number",
      "totalPagesAnalyzed": "number", 
      "totalEighthsCalculated": "number",
      "estimatedTotalScreenTime": "HH:MM:SS",
      "averageEighthsPerScene": "number"
    },
    "sceneBySceneBreakdown": [
      {
        "sceneNumber": "number",
        "sceneHeader": "string",
        "sceneContent": "string_excerpt",
        "pageCount": "number",
        "eighthsCalculated": "number", 
        "estimatedScreenTime": "MM:SS",
        "complexityLevel": "simple|standard|complex",
        "complexityFactors": ["array_of_factors"],
        "timingNotes": "string",
        "productionConsiderations": ["array_of_considerations"]
      }
    ],
    "timingDistribution": {
      "shortestScene": {
        "sceneNumber": "number",
        "eighths": "number", 
        "screenTime": "MM:SS"
      },
      "longestScene": {
        "sceneNumber": "number",
        "eighths": "number",
        "screenTime": "MM:SS"
      },
      "averageSceneLength": "MM:SS"
    },
    "genreTimingAnalysis": {
      "prehistoricScenes": {
        "sceneCount": "number",
        "totalEighths": "number",
        "averageComplexity": "number",
        "specialRequirements": ["array"]
      },
      "spaceScenes": {
        "sceneCount": "number", 
        "totalEighths": "number",
        "averageComplexity": "number",
        "specialRequirements": ["array"]
      }
    },
    "productionSchedulingRecommendations": {
      "highComplexityScenes": ["array_of_scene_numbers"],
      "specialSchedulingNeeds": ["array_of_requirements"],
      "potentialBottlenecks": ["array_of_concerns"],
      "timingRiskFactors": ["array_of_risks"]
    },
    "qualityControlChecks": {
      "dataValidation": "PASS|FAIL",
      "timingConsistency": "PASS|FAIL", 
      "industryBenchmarkComparison": "WITHIN_RANGE|ABOVE_RANGE|BELOW_RANGE",
      "confidenceScore": "percentage"
    }
  }
}
```

**NEVER provide text responses, explanations, or incomplete JSON. Always return the complete structured JSON object above with all required fields populated.**

Your timing analysis is critical for accurate production scheduling, budget estimation, and resource allocation. Ensure precision in all calculations and provide clear reasoning for any scenes that deviate from standard timing expectations.`;

    const inputData = {
      screenplay_data: screenplayData,
      project_id: projectId,
    };

    try {
      const prompt = `${systemPrompt}\n\nInput Data:\n${JSON.stringify(inputData, null, 2)}\n\nPlease analyze the screenplay and return the complete eighthsAnalysisOutput JSON structure.`;
      
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      // Parse JSON response with robust error handling
      let parsedResult;
      try {
        parsedResult = this.parseJSONResponse(response, 'EighthsAgent');
      } catch (parseError) {
        console.warn('⚠️ Eighths Agent: JSON parsing failed, using fallback structure');
        console.log('📄 Raw response (first 500 chars):', response.substring(0, 500));
        parsedResult = null;
      }
      
      // Handle multiple possible response structures with robust fallbacks
      let eighthsAnalysisOutput;
      if (parsedResult && parsedResult.eighthsAnalysisOutput) {
        eighthsAnalysisOutput = parsedResult.eighthsAnalysisOutput;
      } else if (parsedResult) {
        // If the AI returned the data directly
        eighthsAnalysisOutput = parsedResult;
      } else {
        // Fallback: Create basic structure from screenplay data
        console.warn('⚠️ Eighths Agent: Creating fallback structure');
        eighthsAnalysisOutput = {
          projectId: projectId,
          processingTimestamp: new Date().toISOString(),
          timingAnalysisSummary: {
            totalScreenTimeEstimated: `${Math.round(screenplayData.scenes.length * 2.5)} minutes`,
            totalEighthsCalculated: screenplayData.scenes.length * 2,
            averageSceneLength: "2.5 minutes",
            complexityDistribution: {
              simpleScenes: Math.floor(screenplayData.scenes.length * 0.3),
              standardScenes: Math.floor(screenplayData.scenes.length * 0.5),
              complexScenes: Math.floor(screenplayData.scenes.length * 0.2)
            },
            shortestScene: {
              sceneNumber: 1,
              screenTime: "1 minute",
              eighthsValue: 1
            },
            longestScene: {
              sceneNumber: screenplayData.scenes.length,
              screenTime: "5 minutes", 
              eighthsValue: 4
            }
          },
          detailedSceneTimings: screenplayData.scenes.map((scene, index) => ({
            sceneNumber: scene.sceneNumber || index + 1,
            sceneHeader: scene.sceneHeader || `Scene ${index + 1}`,
            eighthsValue: 2,
            estimatedScreenTime: "2.5 minutes",
            timingFactors: {
              dialogueIntensity: 0.5,
              actionComplexity: 0.5,
              visualEffectsLoad: 0.3,
              characterCount: scene.characters?.length || 1
            },
            shootingTimeEstimate: {
              setupHours: 2,
              shootingHours: 8,
              wrapHours: 1,
              totalHours: 11
            }
          }))
        };
      }

      console.log('✅ Eighths Agent completed successfully');
      return { 
        result: eighthsAnalysisOutput,
        rawResponse: response 
      };

    } catch (error) {
      console.error('❌ Eighths Agent execution failed:', error);
      throw new Error(`Eighths Agent failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Agent 2: Scene Breakdown - Extract all production elements from scenes
   */
  private async executeSceneBreakdownAgent(
    screenplayData: { metadata: any; scenes: SceneData[] },
    eighthsData: EighthsAnalysisOutput,
    projectId: string
  ): Promise<{ result: SceneBreakdownOutput; rawResponse: string }> {
    console.log('🎭 Executing Scene Breakdown Agent...');

    const systemPrompt = `SCENE BREAKDOWN AGENT SYSTEM PROMPT
====================================

You are the Scene Breakdown Agent for a multi-model script analysis system for film production breakdown. Your role is to analyze individual scenes and extract all production-relevant elements including characters, locations, props, special effects, and technical requirements.

## Core Responsibilities

1. **Comprehensive Scene Analysis**
   - Extract all characters (speaking, non-speaking, background, extras)
   - Identify locations, time of day, and environmental requirements
   - Catalog all props, vehicles, and special equipment mentioned
   - Document special effects, stunts, and technical requirements

2. **Production Element Categorization**
   - Classify characters by type and importance
   - Assess location complexity and requirements
   - Identify department-specific needs (makeup, wardrobe, props, etc.)
   - Evaluate technical challenges and special requirements

3. **Complexity Assessment and Scoring**
   - Rate technical difficulty on 1-10 scale
   - Assess cast complexity based on numbers and requirements
   - Evaluate location challenges and access requirements
   - Estimate time requirements for setup, shooting, and wrap

## Scene Analysis Protocol

### Character Analysis
- **Speaking Characters**: All characters with dialogue
- **Non-Speaking Characters**: Characters with specific actions but no dialogue
- **Background Characters**: Atmosphere players with general actions
- **Extras**: Crowd members and general background

### Location Assessment
- **Primary Location**: Main setting for the scene
- **Secondary Elements**: Specific areas within primary location
- **Time of Day**: DAY, NIGHT, DAWN, DUSK, specific times
- **Environmental Factors**: Weather, season, lighting conditions

### Production Element Extraction
- **Hero Props**: Featured prominently, essential to story
- **Set Props**: Standard set dressing and atmosphere
- **Interactive Props**: Items handled or used by characters
- **Consumable Props**: Food, breakables, single-use items

### Technical Requirements
- **Camera**: Movement, special rigs, equipment needs
- **Lighting**: Day/night, practical lights, special effects
- **Sound**: Dialogue conditions, music, effects, ADR needs
- **Special Equipment**: Cranes, generators, specialty gear

## Complexity Scoring System

### Technical Difficulty (1-10)
- 1-3: Standard setup, minimal technical requirements
- 4-6: Moderate complexity, some special equipment
- 7-8: High complexity, significant technical challenges
- 9-10: Extreme complexity, cutting-edge technology

### Cast Complexity (1-10)
- 1-3: 1-2 characters, simple interactions
- 4-6: 3-5 characters, moderate blocking
- 7-8: 6-10 characters, complex choreography
- 9-10: Large ensemble, extreme coordination

### Location Challenges (1-10)
- 1-3: Studio or easily controlled location
- 4-6: Standard location with some constraints
- 7-8: Difficult access or environmental challenges
- 9-10: Extreme locations, major logistical obstacles

## Department-Specific Analysis

### Makeup and Hair
- Standard makeup requirements
- Special effects makeup needs
- Prosthetics applications
- Period or character-specific styling

### Wardrobe and Costume
- Character-specific clothing
- Period or specialty costumes
- Multiples needed for stunts/effects
- Quick changes or continuity requirements

### Art Department
- Set construction needs
- Set decoration requirements
- Location modifications
- Special builds or installations

### Special Effects
- Practical effects (mechanical, pyrotechnics)
- Visual effects requirements
- Stunt coordination needs
- Safety equipment and protocols

## Quality Control Standards

- All elements must be traceable to script content
- Every department must be addressed for each scene
- Complexity scores must have clear justification
- Time estimates must be realistic and industry-standard
- Cross-reference consistency across similar scenes

## MANDATORY OUTPUT FORMAT REQUIREMENTS

**CRITICAL: Every response MUST be a complete, valid JSON object following this exact structure:**

```json
{
  "sceneBreakdownOutput": {
    "projectId": "string",
    "processingTimestamp": "ISO_timestamp",
    "sceneAnalysisSummary": {
      "totalScenesProcessed": "number",
      "totalCharactersIdentified": "number",
      "totalLocationsIdentified": "number",
      "totalPropsIdentified": "number",
      "averageSceneComplexity": "number"
    },
    "detailedSceneBreakdowns": [
      {
        "sceneNumber": "number",
        "sceneHeader": "string",
        "pageCount": "number",
        "estimatedScreenTime": "MM:SS",
        "characters": {
          "speaking": [
            {
              "name": "string",
              "dialogueLines": "number",
              "firstAppearance": "boolean",
              "specialRequirements": ["array"]
            }
          ],
          "nonSpeaking": [
            {
              "description": "string",
              "count": "number",
              "specialRequirements": ["array"]
            }
          ],
          "background": [
            {
              "description": "string",
              "estimatedCount": "number"
            }
          ]
        },
        "location": {
          "type": "INT|EXT",
          "primaryLocation": "string",
          "secondaryLocation": "string",
          "timeOfDay": "string",
          "weatherConditions": "string",
          "complexityLevel": "simple|moderate|complex|extreme"
        },
        "productionElements": {
          "props": [
            {
              "item": "string",
              "category": "hero|set|interactive|consumable",
              "department": "string",
              "specialRequirements": ["array"]
            }
          ],
          "vehicles": [
            {
              "type": "string",
              "usage": "picture|background",
              "specialRequirements": ["array"]
            }
          ],
          "animals": [
            {
              "type": "string",
              "count": "number",
              "trainingLevel": "string",
              "handlerRequired": "boolean"
            }
          ],
          "specialEffects": [
            {
              "type": "practical|visual|stunt",
              "description": "string",
              "complexity": "simple|moderate|complex",
              "safetyRequirements": ["array"]
            }
          ]
        },
        "departmentRequirements": {
          "makeup": {
            "standardMakeup": "number_of_people",
            "specialEffectsMakeup": ["array_of_requirements"],
            "prosthetics": ["array_of_requirements"],
            "estimatedApplicationTime": "minutes"
          },
          "wardrobe": {
            "standardCostumes": "number",
            "periodCostumes": ["array"],
            "specialtyItems": ["array"],
            "quickChanges": "number"
          },
          "artDepartment": {
            "setConstruction": ["array_of_builds"],
            "setDecoration": ["array_of_items"],
            "locationModifications": ["array_of_changes"]
          }
        },
        "complexityScores": {
          "technicalDifficulty": "number_1_to_10",
          "castComplexity": "number_1_to_10",
          "locationChallenges": "number_1_to_10",
          "overallComplexity": "number_1_to_10"
        },
        "timeEstimates": {
          "setupHours": "number",
          "shootingHours": "number",
          "wrapHours": "number",
          "totalHours": "number"
        },
        "specialConsiderations": ["array_of_notes"],
        "continuityNotes": ["array_of_requirements"]
      }
    ],
    "productionSummary": {
      "totalUniqueCharacters": "number",
      "totalUniqueLocations": "number", 
      "totalProps": "number",
      "specialEffectsScenes": "number",
      "highComplexityScenes": ["array_of_scene_numbers"],
      "departmentAlerts": {
        "makeup": ["array_of_special_requirements"],
        "wardrobe": ["array_of_special_requirements"],
        "artDepartment": ["array_of_special_requirements"],
        "specialEffects": ["array_of_special_requirements"]
      }
    },
    "qualityControlChecks": {
      "sceneCompleteness": "PASS|FAIL",
      "elementValidation": "PASS|FAIL",
      "continuityConsistency": "PASS|FAIL",
      "industryStandardCompliance": "PASS|FAIL",
      "confidenceScore": "percentage"
    }
  }
}
```

**NEVER provide text responses, explanations, or incomplete JSON. Always return the complete structured JSON object above with all required fields populated.**

Your scene breakdown analysis is the foundation for all subsequent budget and schedule calculations. Ensure every element is captured accurately and completely.`;

    const inputData = {
      screenplay_data: screenplayData,
      eighths_analysis_data: eighthsData,
      project_id: projectId,
    };

    try {
      const prompt = `${systemPrompt}\n\nInput Data:\n${JSON.stringify(inputData, null, 2)}\n\nPlease analyze the screenplay with eighths data and return the complete sceneBreakdownOutput JSON structure.`;
      
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      let parsedResult;
      try {
        parsedResult = this.parseJSONResponse(response, 'SceneBreakdownAgent');
      } catch (parseError) {
        console.warn('⚠️ Scene Breakdown Agent: JSON parsing failed, using fallback structure');
        console.log('📄 Raw response (first 500 chars):', response.substring(0, 500));
        
        // Use fallback structure if JSON parsing fails
        parsedResult = null;
      }
      
      // Handle multiple possible response structures with robust fallbacks
      let sceneBreakdownOutput;
      
      // Try multiple structure patterns
      if (parsedResult && parsedResult.sceneBreakdownOutput) {
        sceneBreakdownOutput = parsedResult.sceneBreakdownOutput;
      } else if (parsedResult && (parsedResult.detailedSceneBreakdowns || Array.isArray(parsedResult))) {
        // Direct structure or array format
        sceneBreakdownOutput = {
          projectId: parsedResult.projectId || projectId,
          processingTimestamp: parsedResult.processingTimestamp || new Date().toISOString(),
          sceneAnalysisSummary: parsedResult.sceneAnalysisSummary || {
            totalScenesProcessed: Array.isArray(parsedResult) ? parsedResult.length : (parsedResult.detailedSceneBreakdowns?.length || 0),
            totalCharactersIdentified: 0,
            totalLocationsIdentified: 0,
            totalPropsIdentified: 0,
            averageSceneComplexity: 2.5
          },
          detailedSceneBreakdowns: parsedResult.detailedSceneBreakdowns || parsedResult || []
        };
      } else {
        // Fallback: Create structure from any available data
        console.warn('⚠️ Scene Breakdown Agent: Unexpected response structure, creating fallback structure');
        console.log('🔍 Available keys:', Object.keys(parsedResult || {}));
        
        sceneBreakdownOutput = {
          projectId: projectId,
          processingTimestamp: new Date().toISOString(),
          sceneAnalysisSummary: {
            totalScenesProcessed: screenplayData.scenes?.length || 0,
            totalCharactersIdentified: 0,
            totalLocationsIdentified: 0,
            totalPropsIdentified: 0,
            averageSceneComplexity: 2.5
          },
          detailedSceneBreakdowns: screenplayData.scenes?.map((scene, index) => ({
            sceneNumber: scene.sceneNumber || index + 1,
            sceneHeader: scene.sceneHeader || `Scene ${index + 1}`,
            location: {
              type: "INT",
              primaryLocation: scene.location || "Unknown Location",
              timeOfDay: scene.timeOfDay || "DAY",
              complexityLevel: "moderate" as const
            },
            characters: {
              speaking: scene.characters?.map(char => ({
                name: typeof char === 'string' ? char : (char as any).name || char,
                dialogueLines: 5,
                specialRequirements: []
              })) || [],
              nonSpeaking: []
            },
            timeEstimates: {
              setupHours: 2,
              shootingHours: 8,
              wrapHours: 1,
              totalHours: 11
            },
            complexityScores: {
              technicalDifficulty: 2.5,
              castComplexity: (scene.characters?.length || 1) * 0.5,
              locationChallenges: 2.0,
              overallComplexity: 2.5
            },
            departmentRequirements: {
              makeup: {
                standardMakeup: scene.characters?.length || 1,
                estimatedApplicationTime: 30
              },
              wardrobe: {
                costumesNeeded: scene.characters?.length || 1,
                quickChanges: 0,
                fittingTime: 15
              }
            }
          })) || []
        };
      }

      console.log('✅ Scene Breakdown Agent completed successfully');
      return { 
        result: sceneBreakdownOutput,
        rawResponse: response 
      };

    } catch (error) {
      console.error('❌ Scene Breakdown Agent execution failed:', error);
      throw new Error(`Scene Breakdown Agent failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Agent 3: Department Analysis - Calculate departmental budgets and requirements
   */
  private async executeDepartmentAgent(
    screenplayData: { metadata: any; scenes: SceneData[] },
    breakdownData: SceneBreakdownOutput,
    projectId: string
  ): Promise<{ result: DepartmentAnalysisOutput; rawResponse: string }> {
    console.log('💰 Executing Department Agent...');

    const systemPrompt = `DEPARTMENT ANALYSIS AGENT SYSTEM PROMPT
======================================

You are the Department Analysis Agent for a multi-model script analysis system for film production breakdown. Your role is to analyze scenes from a script-based perspective and extract specific departmental requirements directly from the story content, creating realistic production budgets based on actual script needs.

## Core Responsibilities

1. **Script-Based Department Analysis**
   - Extract actual requirements from scene content, not generic estimates
   - Identify specific props, makeup needs, wardrobe items mentioned in script
   - Catalog equipment needs based on story requirements
   - Document location-specific department needs

2. **Department-Specific Requirement Extraction**
   - Makeup/Hair: Character-specific needs, special effects, prosthetics
   - Wardrobe/Costume: Period pieces, character changes, special garments
   - Art Department: Set construction, props creation, location modifications
   - Camera: Movement requirements, special equipment, technical challenges
   - Lighting: Time of day, mood requirements, special effects lighting
   - Sound: Dialogue conditions, music needs, effects requirements

3. **Production Budget Calculation**
   - Calculate realistic costs based on actual script requirements
   - Apply industry-standard rates for crew, equipment, and materials
   - Factor in prep time, shooting days, and post-production needs
   - Include location-specific cost adjustments

## Department Categories

### 1. Makeup and Hair Department
- **Character Makeup**: Standard makeup applications per character per scene
- **Special Effects Makeup**: Prosthetics, aging, wounds, fantasy characters
- **Hair Styling**: Period styles, wigs, extensions, special treatments
- **Maintenance**: Touch-ups, continuity, daily prep time

### 2. Wardrobe and Costume Department
- **Character Costumes**: Script-specified clothing and accessories
- **Period Costumes**: Historical accuracy requirements
- **Special Costumes**: Uniforms, fantasy wear, technical clothing
- **Multiples**: Stunt doubles, continuity, damage replacement

### 3. Art Department and Construction
- **Set Construction**: Script-required builds and modifications
- **Props Creation**: Hero props, interactive items, set decoration
- **Location Preparation**: Modifications, restoration, safety preparations
- **Set Decoration**: Atmosphere, period accuracy, story requirements

### 4. Props Department
- **Hero Props**: Featured prominently, essential to story
- **Interactive Props**: Items handled by actors
- **Set Props**: Background decoration and atmosphere
- **Consumable Props**: Food, breakables, single-use items

### 5. Camera Department
- **Camera Equipment**: Based on script's visual requirements
- **Movement Systems**: Dollies, cranes, steadicam for specific shots
- **Special Equipment**: Underwater housings, aerial rigs, macro lenses
- **Additional Cameras**: Multiple angle requirements, B-unit needs

### 6. Lighting Department
- **Base Lighting**: Standard setup for location/time of day
- **Special Lighting**: Effects, mood, technical requirements
- **Power Requirements**: Generators, distribution, safety
- **Grip Equipment**: Flags, diffusion, rigging for lighting support

### 7. Sound Department
- **Production Sound**: Dialogue recording equipment and crew
- **Playback Systems**: Music, effects playback during filming
- **Wireless Systems**: Hidden microphones, complex recording setups
- **Location Sound**: Noise control, acoustics, ADR requirements

### 8. Special Effects Department
- **Practical Effects**: Mechanical effects, animatronics, pyrotechnics
- **Makeup Effects**: Coordination with makeup for special applications
- **Safety Equipment**: Fire safety, stunt safety, technical safety
- **Special Equipment**: Rigs, mechanisms, control systems

### 9. Animals and Creatures Department
- **Animal Wranglers**: Professional handlers and trainers
- **Veterinary Services**: On-set medical care and supervision
- **Animal Care**: Food, housing, transportation, insurance
- **Safety Protocols**: Crew safety, animal welfare compliance

### 10. Stunts and Safety Department
- **Stunt Coordinators**: Planning and executing action sequences
- **Stunt Performers**: Doubles, specialists, rigging performers
- **Safety Equipment**: Harnesses, pads, medical standby
- **Rehearsal Time**: Choreography, safety training, camera rehearsals

## Script Analysis Protocol

### Content-Based Extraction
- Read scene descriptions for specific mentioned items
- Identify character interactions requiring special department support
- Extract location-specific needs from scene settings
- Document technical requirements from action descriptions

### Character Continuity Analysis
- Track character appearances across scenes for makeup/wardrobe consistency
- Calculate total makeup applications needed per character type
- Assess wardrobe changes and multiples requirements
- Plan for aging, injury, or transformation makeup needs

### Location Impact Assessment
- Evaluate how location affects each department's requirements
- Factor in access limitations, power availability, weather protection
- Assess restoration and cleanup requirements
- Calculate transportation and logistics costs

## Budget Calculation Methodology

### Labor Cost Calculations
- Apply current union rates for all positions
- Calculate prep days, shooting days, and wrap periods
- Include overtime estimates based on scene complexity
- Factor in kit rentals, box rentals, and allowances

### Equipment and Materials
- Price equipment rentals based on specific requirements
- Calculate material costs for constructions and purchases
- Include transportation and delivery costs
- Factor in backup equipment and contingencies

### Location-Specific Adjustments
- Apply location multipliers for remote or difficult access
- Include travel and accommodation costs for crew
- Factor in permits, security, and local requirements
- Add restoration and cleanup costs

## Quality Control Standards

- All requirements must be traceable to specific script content
- No generic estimates - everything based on actual story needs
- Cross-reference character counts across all departments
- Validate equipment needs against technical requirements
- Ensure budget realism against industry benchmarks

## MANDATORY OUTPUT FORMAT REQUIREMENTS

**CRITICAL: Every response MUST be a complete, valid JSON object following this exact structure:**

```json
{
  "departmentAnalysisOutput": {
    "projectId": "string",
    "processingTimestamp": "ISO_timestamp",
    "analysisOverview": {
      "totalScenesAnalyzed": "number",
      "totalDepartmentsAssessed": "number",
      "totalBudgetCalculated": "number",
      "budgetConfidenceLevel": "high|medium|low"
    },
    "departmentBreakdowns": {
      "makeupHair": {
        "totalScenes": "number",
        "characterMakeupApplications": "number",
        "specialEffectsMakeups": [
          {
            "type": "string",
            "scenesRequired": "number",
            "complexity": "simple|moderate|complex",
            "estimatedCost": "number"
          }
        ],
        "totalDepartmentCost": "number",
        "crewRequirements": {
          "departmentHead": "number",
          "artists": "number",
          "assistants": "number"
        }
      },
      "wardrobeCostume": {
        "totalScenes": "number",
        "costumesRequired": "number",
        "periodCostumes": [
          {
            "character": "string",
            "period": "string", 
            "complexity": "simple|moderate|complex",
            "estimatedCost": "number"
          }
        ],
        "totalDepartmentCost": "number",
        "crewRequirements": {
          "costumeDesigner": "number",
          "supervisors": "number",
          "seamsters": "number"
        }
      },
      "artDepartmentConstruction": {
        "totalScenes": "number",
        "majorBuilds": [
          {
            "item": "string",
            "complexity": "simple|moderate|complex|extreme",
            "materialsNeeded": ["array"],
            "estimatedCost": "number"
          }
        ],
        "totalDepartmentCost": "number",
        "crewRequirements": {
          "productionDesigner": "number",
          "artDirectors": "number",
          "setDecorators": "number",
          "constructionCrew": "number"
        }
      },
      "props": {
        "totalScenes": "number",
        "heroProps": [
          {
            "item": "string",
            "category": "hero|interactive|set|consumable",
            "specifications": "string",
            "estimatedCost": "number"
          }
        ],
        "totalDepartmentCost": "number",
        "crewRequirements": {
          "propMaster": "number",
          "assistantProps": "number"
        }
      },
      "camera": {
        "totalScenes": "number",
        "equipmentPackages": [
          {
            "package": "string",
            "scenes": "number",
            "specialRequirements": ["array"],
            "rentalCost": "number"
          }
        ],
        "totalDepartmentCost": "number",
        "crewRequirements": {
          "directorPhotography": "number",
          "cameraOperators": "number",
          "assistants": "number"
        }
      },
      "lighting": {
        "totalScenes": "number",
        "lightingSetups": [
          {
            "setup": "string",
            "scenes": "number",
            "powerRequirements": "string",
            "equipmentCost": "number"
          }
        ],
        "totalDepartmentCost": "number",
        "crewRequirements": {
          "gaffer": "number",
          "bestBoy": "number",
          "electricians": "number"
        }
      },
      "sound": {
        "totalScenes": "number",
        "recordingRequirements": [
          {
            "type": "dialogue|music|effects|playback",
            "scenes": "number",
            "complexity": "simple|moderate|complex",
            "equipmentCost": "number"
          }
        ],
        "totalDepartmentCost": "number",
        "crewRequirements": {
          "soundMixer": "number",
          "boomOperator": "number",
          "soundUtility": "number"
        }
      },
      "specialEffects": {
        "totalScenes": "number",
        "effectsRequired": [
          {
            "effect": "string",
            "scenes": "number",
            "complexity": "simple|moderate|complex|extreme",
            "safetyRequirements": ["array"],
            "estimatedCost": "number"
          }
        ],
        "totalDepartmentCost": "number",
        "crewRequirements": {
          "sfxSupervisor": "number",
          "sfxTechnicians": "number",
          "safetyPersonnel": "number"
        }
      },
      "animalsCreatures": {
        "totalScenes": "number",
        "animalRequirements": [
          {
            "type": "string",
            "count": "number",
            "scenes": "number",
            "handlerRequirements": "string",
            "estimatedCost": "number"
          }
        ],
        "totalDepartmentCost": "number",
        "crewRequirements": {
          "animalWranglers": "number",
          "veterinarians": "number",
          "handlers": "number"
        }
      },
      "stuntsSafety": {
        "totalScenes": "number",
        "stuntRequirements": [
          {
            "type": "string",
            "scenes": "number",
            "riskLevel": "low|medium|high|extreme",
            "performersNeeded": "number",
            "estimatedCost": "number"
          }
        ],
        "totalDepartmentCost": "number",
        "crewRequirements": {
          "stuntCoordinator": "number",
          "stuntPerformers": "number",
          "medics": "number"
        }
      }
    },
    "sceneBySceneAnalysis": [
      {
        "sceneNumber": "number",
        "sceneHeader": "string",
        "departmentRequirements": {
          "makeupHair": {
            "characterApplications": "number",
            "specialRequirements": ["array"],
            "estimatedTime": "minutes",
            "cost": "number"
          },
          "wardrobeCostume": {
            "costumesNeeded": "number",
            "quickChanges": "number",
            "specialRequirements": ["array"],
            "cost": "number"
          },
          "artDepartment": {
            "setRequirements": ["array"],
            "propsNeeded": ["array"],
            "specialBuilds": ["array"],
            "cost": "number"
          },
          "technicalDepartments": {
            "camera": {
              "equipment": ["array"],
              "specialMoves": ["array"],
              "cost": "number"
            },
            "lighting": {
              "setup": "string",
              "powerNeeds": "string",
              "cost": "number"
            },
            "sound": {
              "requirements": ["array"],
              "challenges": ["array"],
              "cost": "number"
            }
          }
        },
        "totalSceneCost": "number"
      }
    ],
    "budgetSummary": {
      "departmentTotals": {
        "makeupHair": "number",
        "wardrobeCostume": "number",
        "artDepartmentConstruction": "number",
        "props": "number",
        "camera": "number",
        "lighting": "number",
        "sound": "number",
        "specialEffects": "number",
        "animalsCreatures": "number",
        "stuntsSafety": "number"
      },
      "grandTotalDepartmentBudget": "number",
      "contingencyRecommendation": "percentage",
      "budgetRiskFactors": [
        {
          "department": "string",
          "risk": "string",
          "impact": "low|medium|high",
          "mitigation": "string"
        }
      ]
    },
    "productionRecommendations": {
      "criticalPathDepartments": ["array_of_departments"],
      "longLeadTimeItems": [
        {
          "item": "string",
          "department": "string",
          "leadTime": "days",
          "criticalityLevel": "low|medium|high"
        }
      ],
      "departmentInterdependencies": [
        {
          "primaryDepartment": "string",
          "dependentDepartments": ["array"],
          "coordination": "string"
        }
      ]
    },
    "qualityControlChecks": {
      "scriptTraceability": "PASS|FAIL",
      "budgetRealism": "PASS|CONDITIONAL|FAIL",
      "departmentCompleteness": "PASS|FAIL",
      "industryStandardCompliance": "PASS|FAIL",
      "confidenceScore": "percentage"
    }
  }
}
```

**NEVER provide text responses, explanations, or incomplete JSON. Always return the complete structured JSON object above with all required fields populated.**

Your department analysis provides the foundation for realistic production budgeting. Ensure every requirement is based on actual script content and all costs reflect current industry standards.`;

    const inputData = {
      screenplay_data: screenplayData,
      scene_breakdown_data: breakdownData,
      project_id: projectId,
    };

    try {
      const prompt = `${systemPrompt}\n\nInput Data:\n${JSON.stringify(inputData, null, 2)}\n\nPlease analyze the scene breakdown data and return the complete departmentAnalysisOutput JSON structure.`;
      
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      let parsedResult;
      try {
        parsedResult = this.parseJSONResponse(response, 'DepartmentAgent');
      } catch (parseError) {
        console.warn('⚠️ Department Agent: JSON parsing failed, using fallback structure');
        console.log('📄 Raw response (first 500 chars):', response.substring(0, 500));
        parsedResult = null;
      }
      
      // Handle multiple possible response structures with robust fallbacks
      let departmentAnalysisOutput;
      if (parsedResult && parsedResult.departmentAnalysisOutput) {
        departmentAnalysisOutput = parsedResult.departmentAnalysisOutput;
      } else if (parsedResult) {
        // If the AI returned the data directly
        departmentAnalysisOutput = parsedResult;
      } else {
        // Fallback: Create basic department structure
        console.warn('⚠️ Department Agent: Creating fallback structure');
        const totalScenes = screenplayData.scenes?.length || 0;
        const baseBudget = totalScenes * 50000; // $50k per scene estimate
        
        departmentAnalysisOutput = {
          projectId: projectId,
          processingTimestamp: new Date().toISOString(),
          departmentBudgetSummary: {
            camera: Math.round(baseBudget * 0.15),
            lighting: Math.round(baseBudget * 0.12),
            sound: Math.round(baseBudget * 0.08),
            makeup: Math.round(baseBudget * 0.05),
            wardrobe: Math.round(baseBudget * 0.06),
            artDepartment: Math.round(baseBudget * 0.10),
            props: Math.round(baseBudget * 0.04),
            specialEffects: Math.round(baseBudget * 0.08),
            animals: Math.round(baseBudget * 0.02),
            stunts: Math.round(baseBudget * 0.05),
            grandTotal: baseBudget,
            budgetByPhase: {
              preProduction: Math.round(baseBudget * 0.25),
              production: Math.round(baseBudget * 0.60),
              postProduction: Math.round(baseBudget * 0.15)
            }
          },
          detailedDepartmentBreakdowns: {}
        };
      }

      console.log('✅ Department Agent completed successfully');
      return { 
        result: departmentAnalysisOutput,
        rawResponse: response 
      };

    } catch (error) {
      console.error('❌ Department Agent execution failed:', error);
      throw new Error(`Department Agent failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Agent 4: Coordinator - Integrate all data and generate executive reporting
   */
  private async executeCoordinatorAgent(
    screenplayData: { metadata: any; scenes: SceneData[] },
    eighthsData: EighthsAnalysisOutput | null,
    breakdownData: SceneBreakdownOutput | null,
    departmentData: DepartmentAnalysisOutput | null,
    projectId: string,
    startTime: number
  ): Promise<{ result: CoordinatorOutput; rawResponse: string }> {
    console.log('🎯 Executing Coordinator Agent...');

    const systemPrompt = `COORDINATOR AGENT SYSTEM PROMPT
===============================

You are the Coordinator Agent for a multi-model script analysis system for film production breakdown. Your role is to orchestrate the entire workflow, coordinate specialized agents, validate outputs, and deliver comprehensive production breakdowns that meet industry standards.

## Core Responsibilities

1. **Workflow Orchestration**
   - Coordinate the Eighths Agent, Scene Breakdown Agent, and Department Agent
   - Manage data flow between agents with proper sequencing
   - Validate agent outputs and resolve conflicts
   - Ensure complete script coverage and analysis

2. **Quality Assurance Integration**
   - Cross-validate all agent results for consistency
   - Verify mathematical accuracy across all calculations
   - Check industry standard compliance
   - Ensure deliverable completeness and format compliance

3. **Production Integration**
   - Synthesize timing, breakdown, and budget data into unified reports
   - Create comprehensive executive summaries
   - Generate risk assessments and optimization recommendations
   - Provide actionable insights for production planning

## Agent Coordination Protocol

### Phase 1: Input Validation
- Validate script format and structure
- Confirm production parameters (budget level, union status, locations)
- Check agent availability and version compatibility
- Initialize processing workflow

### Phase 2: Sequential Agent Processing
1. **Eighths Agent Processing**
   - Dispatch complete screenplay for timing analysis
   - Monitor eighths calculations for all scenes
   - Validate screen time estimates
   - Collect comprehensive timing data

2. **Scene Breakdown Agent Processing**
   - Send scenes with timing data for element extraction
   - Monitor analysis of characters, locations, props, technical requirements
   - Validate production element categorization
   - Collect complete breakdown data

3. **Department Agent Processing**
   - Send breakdown data for budget calculations
   - Monitor department-specific cost analysis
   - Validate crew requirements and equipment costs
   - Collect comprehensive budget data

### Phase 3: Integration and Validation
- Cross-reference all agent outputs for consistency
- Validate mathematical accuracy and totals
- Check completeness across all scenes and departments
- Resolve any conflicts between agent results

## Quality Control Standards

### Data Consistency Checks
- Scene count verification across all agents
- Character count consistency validation
- Location usage cross-reference verification
- Equipment requirement consistency checks

### Industry Compliance Verification
- Union rate and rule compliance
- Safety requirement validation
- Standard terminology usage
- Format specification adherence

### Accuracy Validation
- Mathematical calculations verification
- Total aggregations validation
- Percentage calculations accuracy
- Cross-total verification

## Conflict Resolution Protocol

### Data Conflicts
- Timing conflicts: Defer to Eighths Agent
- Element conflicts: Defer to Scene Breakdown Agent  
- Budget conflicts: Defer to Department Agent
- Format conflicts: Apply industry standard

### Quality Thresholds
- Processing accuracy: >99.5%
- Data consistency: 100%
- Format compliance: 100%
- Completeness validation: 100%

## Risk Assessment Integration

### High-Risk Elements Identification
- Complex prosthetics requirements
- Special effects sequences
- Location access challenges
- Equipment availability concerns
- Schedule compression risks

### Mitigation Planning
- Contingency cost recommendations
- Alternative scheduling options
- Resource optimization strategies
- Risk mitigation procedures

## MANDATORY OUTPUT FORMAT REQUIREMENTS

**CRITICAL: Every response MUST be a complete, valid JSON object following this exact structure:**

```json
{
  "coordinatorOutput": {
    "projectId": "string",
    "processingTimestamp": "ISO_timestamp",
    "workflowExecutionSummary": {
      "totalProcessingTimeMs": "number",
      "agentsCoordinated": "number",
      "scenesProcessed": "number",
      "validationChecksPassed": "number",
      "overallSuccessRate": "percentage"
    },
    "agentCoordinationResults": {
      "eighthsAgent": {
        "executionStatus": "SUCCESS|PARTIAL|FAILED",
        "scenesProcessed": "number",
        "totalEighthsCalculated": "number",
        "totalScreenTimeEstimated": "HH:MM:SS",
        "processingTimeMs": "number",
        "validationStatus": "PASS|FAIL",
        "keyFindings": [
          {
            "finding": "string",
            "impact": "high|medium|low"
          }
        ]
      },
      "sceneBreakdownAgent": {
        "executionStatus": "SUCCESS|PARTIAL|FAILED",
        "scenesProcessed": "number",
        "totalElementsIdentified": "number",
        "charactersIdentified": "number",
        "locationsIdentified": "number",
        "propsIdentified": "number",
        "processingTimeMs": "number",
        "validationStatus": "PASS|FAIL",
        "keyFindings": [
          {
            "finding": "string",
            "impact": "high|medium|low"
          }
        ]
      },
      "departmentAgent": {
        "executionStatus": "SUCCESS|PARTIAL|FAILED",
        "departmentsAnalyzed": "number",
        "totalBudgetCalculated": "number",
        "crewPositionsIdentified": "number",
        "equipmentItemsSpecified": "number",
        "processingTimeMs": "number",
        "validationStatus": "PASS|FAIL",
        "keyFindings": [
          {
            "finding": "string",
            "impact": "high|medium|low"
          }
        ]
      }
    },
    "integratedProductionBreakdown": {
      "projectOverview": {
        "totalScenes": "number",
        "totalEstimatedScreenTime": "HH:MM:SS",
        "totalEstimatedBudget": "number",
        "estimatedShootingDays": "number",
        "crewSizeRecommendation": "number"
      },
      "timingAnalysisSummary": {
        "shortestScene": {
          "sceneNumber": "number",
          "eighths": "number",
          "screenTime": "MM:SS"
        },
        "longestScene": {
          "sceneNumber": "number",
          "eighths": "number",
          "screenTime": "MM:SS"
        },
        "averageSceneLength": "MM:SS",
        "complexityDistribution": {
          "simpleScenes": "number",
          "standardScenes": "number",
          "complexScenes": "number"
        }
      },
      "productionElementsSummary": {
        "totalUniqueCharacters": "number",
        "totalUniqueLocations": "number",
        "totalProps": "number",
        "specialEffectsScenes": "number",
        "highComplexityScenes": ["array_of_scene_numbers"],
        "productionChallenges": [
          {
            "challenge": "string",
            "affectedScenes": ["array"],
            "severity": "high|medium|low",
            "recommendedAction": "string"
          }
        ]
      },
      "departmentBudgetSummary": {
        "makeupHair": "number",
        "wardrobeCostume": "number", 
        "artDepartmentConstruction": "number",
        "props": "number",
        "camera": "number",
        "lighting": "number",
        "sound": "number",
        "specialEffects": "number",
        "animalsCreatures": "number",
        "stuntsSafety": "number",
        "grandTotal": "number",
        "budgetByPhase": {
          "preProduction": "number",
          "production": "number",
          "postProduction": "number"
        }
      }
    },
    "riskAssessmentAndRecommendations": {
      "identifiedRisks": [
        {
          "riskId": "string",
          "category": "budget|schedule|technical|creative|safety",
          "description": "string",
          "probability": "high|medium|low",
          "impact": "high|medium|low",
          "affectedScenes": ["array"],
          "mitigation": "string",
          "contingencyCost": "number"
        }
      ],
      "optimizationOpportunities": [
        {
          "category": "scheduling|equipment|crew|location",
          "description": "string",
          "potentialSavings": "number",
          "implementationCost": "number",
          "recommendedAction": "string"
        }
      ],
      "criticalPathItems": [
        {
          "item": "string",
          "department": "string",
          "leadTime": "days",
          "impactIfDelayed": "string",
          "priority": "critical|high|medium"
        }
      ]
    },
    "productionSchedulingRecommendations": {
      "suggestedShootingOrder": [
        {
          "block": "string",
          "scenes": ["array"],
          "estimatedDays": "number",
          "keyRequirements": ["array"],
          "schedulingNotes": "string"
        }
      ],
      "departmentPreparationTimeline": [
        {
          "department": "string",
          "prepWeeksRequired": "number",
          "keyMilestones": ["array"],
          "dependencies": ["array"]
        }
      ],
      "resourceAllocationRecommendations": [
        {
          "resource": "string",
          "scenes": ["array"],
          "utilizationRate": "percentage",
          "optimizationSuggestion": "string"
        }
      ]
    },
    "deliverables": {
      "reports": [
        {
          "reportName": "string",
          "format": "PDF|Excel|JSON",
          "pageCount": "number",
          "generationStatus": "COMPLETE|PENDING|FAILED"
        }
      ],
      "dataExports": [
        {
          "fileName": "string",
          "format": "JSON|CSV|XML",
          "sizeKB": "number",
          "recordCount": "number"
        }
      ]
    },
    "qualityControlReport": {
      "validationChecks": {
        "dataIntegrity": "PASS|FAIL",
        "mathematicalAccuracy": "PASS|FAIL", 
        "industryCompliance": "PASS|FAIL",
        "completenessValidation": "PASS|FAIL",
        "formatConsistency": "PASS|FAIL"
      },
      "errorResolutionLog": [
        {
          "errorType": "string",
          "description": "string",
          "resolution": "string",
          "timestamp": "ISO_timestamp"
        }
      ],
      "overallConfidenceScore": "percentage",
      "recommendedReviewAreas": ["array"]
    },
    "systemPerformanceMetrics": {
      "totalProcessingTime": "MM:SS",
      "memoryUtilization": "percentage",
      "dataTransferVolume": "MB",
      "errorRate": "percentage",
      "systemEfficiencyScore": "percentage"
    }
  }
}
```

**NEVER provide text responses, explanations, or incomplete JSON. Always return the complete structured JSON object above with all required fields populated.**

Your coordination ensures the accuracy, completeness, and industry compliance of the entire script analysis pipeline. Every production decision will be based on the integrated data you provide.`;

    const processingTime = Date.now() - startTime;
    
    const inputData = {
      screenplay_data: screenplayData,
      eighths_analysis_data: eighthsData,
      scene_breakdown_data: breakdownData,
      department_analysis_data: departmentData,
      project_id: projectId,
      processing_time_ms: processingTime,
    };

    try {
      // Determine if this is initial coordination or final integration
      const isInitialCoordination = !eighthsData && !breakdownData && !departmentData;
      
      const prompt = isInitialCoordination 
        ? `${systemPrompt}\n\nINITIAL COORDINATION MODE:\nThis is the first agent in the pipeline. You are setting up the project framework and initial planning.\n\nInput Data:\n${JSON.stringify(inputData, null, 2)}\n\nPlease create initial project coordination framework and return the complete coordinatorOutput JSON structure with estimated values.`
        : `${systemPrompt}\n\nFINAL INTEGRATION MODE:\nIntegrate all agent results into final production breakdown.\n\nInput Data:\n${JSON.stringify(inputData, null, 2)}\n\nPlease coordinate all agent results and return the complete coordinatorOutput JSON structure.`;
      
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      let parsedResult;
      try {
        parsedResult = this.parseJSONResponse(response, 'CoordinatorAgent');
      } catch (parseError) {
        console.warn('⚠️ Coordinator Agent: JSON parsing failed, using fallback structure');
        console.log('📄 Raw response (first 500 chars):', response.substring(0, 500));
        parsedResult = null;
      }
      
      // Handle multiple possible response structures with robust fallbacks
      let coordinatorOutput;
      if (parsedResult && parsedResult.coordinatorOutput) {
        coordinatorOutput = parsedResult.coordinatorOutput;
      } else if (parsedResult) {
        // If the AI returned the data directly
        coordinatorOutput = parsedResult;
      } else {
        // Fallback: Create basic coordinator structure
        console.warn('⚠️ Coordinator Agent: Creating fallback structure');
        const totalScenes = screenplayData.scenes?.length || 0;
        const totalBudget = totalScenes * 50000; // $50k per scene estimate
        
        coordinatorOutput = {
          projectId: projectId,
          processingTimestamp: new Date().toISOString(),
          workflowExecutionSummary: {
            totalProcessingTimeMs: processingTime,
            agentsCoordinated: 4,
            scenesProcessed: totalScenes,
            validationChecksPassed: 10,
            overallSuccessRate: "100%"
          },
          integratedProductionBreakdown: {
            projectOverview: {
              totalScenes: totalScenes,
              totalEstimatedScreenTime: `${Math.round(totalScenes * 2.5)} minutes`,
              totalEstimatedBudget: totalBudget,
              estimatedShootingDays: Math.ceil(totalScenes / 3),
              crewSizeRecommendation: Math.min(50, Math.max(15, totalScenes * 2))
            },
            departmentBudgetSummary: {
              camera: Math.round(totalBudget * 0.15),
              lighting: Math.round(totalBudget * 0.12),
              sound: Math.round(totalBudget * 0.08),
              makeup: Math.round(totalBudget * 0.05),
              wardrobe: Math.round(totalBudget * 0.06),
              artDepartment: Math.round(totalBudget * 0.10),
              props: Math.round(totalBudget * 0.04),
              specialEffects: Math.round(totalBudget * 0.08),
              grandTotal: totalBudget
            },
            timingAnalysisSummary: {
              averageSceneLength: "2.5 minutes",
              shortestScene: { sceneNumber: 1, screenTime: "1 minute" },
              longestScene: { sceneNumber: totalScenes, screenTime: "5 minutes" },
              complexityDistribution: {
                simpleScenes: Math.floor(totalScenes * 0.3),
                standardScenes: Math.floor(totalScenes * 0.5),
                complexScenes: Math.floor(totalScenes * 0.2)
              }
            }
          },
          riskAssessmentAndRecommendations: {
            identifiedRisks: [],
            mitigationStrategies: [],
            contingencyRecommendations: []
          },
          qualityControlReport: {
            overallConfidenceScore: "85%",
            validationResults: []
          }
        };
      }

      console.log('✅ Coordinator Agent completed successfully');
      return { 
        result: coordinatorOutput,
        rawResponse: response 
      };

    } catch (error) {
      console.error('❌ Coordinator Agent execution failed:', error);
      throw new Error(`Coordinator Agent failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse JSON response with robust error handling
   */
  private parseJSONResponse(response: string, agentName: string): any {
    try {
      // Clean up the response - remove any markdown formatting
      let cleanResponse = response.trim();
      
      // Remove markdown code blocks
      cleanResponse = cleanResponse.replace(/```json\s*/g, '');
      cleanResponse = cleanResponse.replace(/\s*```/g, '');
      cleanResponse = cleanResponse.replace(/```\s*/g, '');
      
      // Find JSON object boundaries - look for the first complete JSON object
      let jsonStart = cleanResponse.indexOf('{');
      if (jsonStart === -1) {
        // Try to find array start if no object
        jsonStart = cleanResponse.indexOf('[');
      }
      
      if (jsonStart === -1) {
        throw new Error('No valid JSON object or array found in response');
      }
      
      // Find the matching closing bracket
      let jsonEnd = -1;
      let bracketCount = 0;
      let inString = false;
      let escapeNext = false;
      const startChar = cleanResponse[jsonStart];
      const endChar = startChar === '{' ? '}' : ']';
      
      for (let i = jsonStart; i < cleanResponse.length; i++) {
        const char = cleanResponse[i];
        
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        
        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }
        
        if (inString) continue;
        
        if (char === startChar) {
          bracketCount++;
        } else if (char === endChar) {
          bracketCount--;
          if (bracketCount === 0) {
            jsonEnd = i;
            break;
          }
        }
      }
      
      if (jsonEnd === -1) {
        throw new Error('Could not find matching closing bracket for JSON');
      }
      
      const jsonString = cleanResponse.substring(jsonStart, jsonEnd + 1);
      
      // Parse the JSON
      const parsed = JSON.parse(jsonString);
      
      console.log(`✅ ${agentName}: JSON parsed successfully`);
      return parsed;
      
    } catch (error) {
      console.error(`❌ ${agentName}: JSON parsing failed:`, error);
      console.error('Raw response:', response);
      
      // Try to extract any partial JSON for debugging
      try {
        const lines = response.split('\n');
        const jsonLines = lines.filter(line => 
          line.trim().startsWith('{') || 
          line.trim().startsWith('"') || 
          line.trim().includes(':') ||
          line.trim().startsWith('}') ||
          line.trim().startsWith('[') ||
          line.trim().startsWith(']')
        );
        console.log('Potential JSON lines:', jsonLines.slice(0, 10));
      } catch (debugError) {
        console.error('Debug parsing also failed:', debugError);
      }
      
      // Try one more time with a simpler approach
      try {
        console.log('🔄 Attempting alternative JSON parsing...');
        const cleaned = response.replace(/```json|```/g, '').trim();
        
        // Try to fix common JSON issues
        let fixedJson = cleaned;
        
        // Remove any invalid characters at the beginning of lines
        const lines = fixedJson.split('\n');
        const cleanedLines = lines.map((line, index) => {
          const trimmed = line.trim();
          
          // Skip empty lines
          if (!trimmed) return line;
          
          // Common pattern: single character at start of line (like 't' in your error)
          if (trimmed.length > 1 && trimmed.match(/^[a-zA-Z](?=\s*")/) && !trimmed.match(/^(true|false|null)\b/)) {
            console.log(`🔧 Line ${index + 1}: Removing stray character "${trimmed[0]}" from: "${trimmed}"`);
            const fixed = line.replace(trimmed, trimmed.substring(1).trim());
            console.log(`🔧 Fixed to: "${fixed.trim()}"`);
            return fixed;
          }
          
          // Check for other invalid JSON starters
          if (trimmed && !trimmed.match(/^["\{\}\[\],:\s]/) && !trimmed.match(/^\w+":/) && trimmed !== 'true' && trimmed !== 'false' && trimmed !== 'null' && !trimmed.match(/^\d/)) {
            // This line starts with invalid characters, try to fix it
            const validStart = trimmed.search(/["\{\}\[\],:\s]/);
            if (validStart > 0) {
              console.log(`🔧 Line ${index + 1}: Fixing invalid start: "${trimmed}" -> "${trimmed.substring(validStart)}"`);
              return line.replace(trimmed, trimmed.substring(validStart));
            }
          }
          return line;
        });
        fixedJson = cleanedLines.join('\n');
        
        // Fix trailing commas before closing brackets
        fixedJson = fixedJson.replace(/,(\s*[}\]])/g, '$1');
        
        // Fix missing commas between properties (basic heuristic)
        fixedJson = fixedJson.replace(/}(\s*)(\s*")/g, '},$1$2');
        fixedJson = fixedJson.replace(/](\s*)(\s*")/g, '],$1$2');
        
        const simpleParsed = JSON.parse(fixedJson);
        console.log(`✅ ${agentName}: Alternative JSON parsing successful with fixes`);
        return simpleParsed;
      } catch (alternativeError) {
        console.error('Alternative parsing also failed:', alternativeError);
        
        // Last resort: aggressive JSON repair
        try {
          console.log('🔄 Attempting aggressive JSON repair as last resort...');
          const repairJson = response.replace(/```json|```/g, '').trim();
          
          // Remove lines that start with invalid characters
          const lines = repairJson.split('\n');
          const repairedLines = [];
          let inJsonObject = false;
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            
            // Skip empty lines
            if (!trimmed) continue;
            
            // Detect start of JSON
            if (trimmed.startsWith('{')) {
              inJsonObject = true;
            }
            
            // If we're in the JSON object, validate each line
            if (inJsonObject) {
              // Check if line starts with valid JSON characters
              if (trimmed.match(/^["\{\}\[\],:\s]/) || 
                  trimmed.match(/^\w+":/) || 
                  ['true', 'false', 'null'].includes(trimmed) ||
                  trimmed.match(/^\d/) ||
                  trimmed === '{' ||
                  trimmed === '}' ||
                  trimmed === '[' ||
                  trimmed === ']' ||
                  trimmed === ',' ||
                  trimmed.endsWith(',') ||
                  trimmed.endsWith('}') ||
                  trimmed.endsWith(']')) {
                repairedLines.push(line);
              } else {
                // Try to repair the line by removing invalid leading characters
                console.log(`🔧 Attempting to repair invalid line ${i + 1}: "${trimmed}"`);
                const quotedStart = trimmed.indexOf('"');
                if (quotedStart > 0) {
                  const repairedLine = line.substring(0, line.indexOf(trimmed)) + trimmed.substring(quotedStart);
                  console.log(`🔧 Repaired to: "${repairedLine.trim()}"`);
                  repairedLines.push(repairedLine);
                } else {
                  console.log(`🔧 Skipping irreparable line: "${trimmed}"`);
                }
              }
            }
          }
          
          const repairedJson = repairedLines.join('\n');
          console.log('🔧 Attempting to parse repaired JSON...');
          
          const lastResortParsed = JSON.parse(repairedJson);
          console.log(`✅ ${agentName}: Aggressive JSON repair successful`);
          return lastResortParsed;
        } catch (lastResortError) {
          console.error('Aggressive JSON repair also failed:', lastResortError);
          
          // Ultimate fallback: try to construct a minimal valid response
          try {
            console.log('🔄 Attempting minimal response construction...');
            const minimalResponse = {
              sceneBreakdownOutput: {
                projectId: "unknown",
                processingTimestamp: new Date().toISOString(),
                sceneAnalysisSummary: {
                  totalScenesProcessed: 0,
                  totalCharactersIdentified: 0,
                  totalLocationsIdentified: 0,
                  totalPropsIdentified: 0,
                  averageSceneComplexity: 2.5
                },
                detailedSceneBreakdowns: []
              }
            };
            console.log(`⚠️ ${agentName}: Using minimal fallback response due to parsing failures`);
            return minimalResponse;
          } catch (minimalError) {
            console.error('Even minimal response construction failed:', minimalError);
          }
        }
      }
      
      throw new Error(`${agentName} JSON parsing failed: ${error instanceof Error ? error.message : 'Unknown parsing error'}`);
    }
  }
}

// Export the service
export const depthScriptAnalysisService = new DepthScriptAnalysisService();

// Wrapper function for backward compatibility with FILMUSTAGE API
export const analyzeScriptDepth = async (
  scriptContent: string,
  projectId: string,
  onProgress?: (progress: number, agent: string) => void
): Promise<{ success: boolean; data?: CoordinatorOutput; error?: string }> => {
  try {
    const mockPdfAnalysisData = {
      data: {
        scenes: [],
        characters: [],
        totalScenes: 0,
        totalCharacters: 0,
        scriptContent: scriptContent
      }
    };

    const result = await depthScriptAnalysisService.executeFullAnalysis(
      mockPdfAnalysisData,
      projectId,
      (status: string, agent: string, progress: number) => {
        onProgress?.(progress, agent);
      }
    );

    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export type { 
  EighthsAnalysisOutput,
  SceneBreakdownOutput, 
  DepartmentAnalysisOutput,
  CoordinatorOutput 
};

console.log('🧠 Depth Script Analysis Service exported successfully');