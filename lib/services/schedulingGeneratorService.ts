import { GoogleGenAI } from "@google/genai";

// Input Types (from Script Analysis)
export interface ScriptAnalysisInput {
  sceneBreakdownOutput: {
    projectId: string;
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
        type: "INT" | "EXT";
        primaryLocation: string;
        timeOfDay: string;
        complexityLevel: "simple" | "moderate" | "complex" | "extreme";
      };
      characters: {
        speaking: Array<{
          name: string;
          dialogueLines: number;
          specialRequirements: string[];
        }>;
        nonSpeaking: Array<{
          description: string;
          count: number;
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
          estimatedApplicationTime: number;
        };
        wardrobe: {
          standardCostumes: number;
        };
      };
      specialConsiderations: string[];
    }>;
  };
}

// Output Types (Generated Scheduling Data)
export interface ProductionScheduleOutput {
  scheduleOverview: {
    projectId: string;
    totalShootDays: number;
    estimatedBudgetRange: {
      low: number;
      high: number;
    };
    recommendedCrewSize: number;
    productionTimeline: {
      prepDays: number;
      shootDays: number;
      wrapDays: number;
    };
  };
  dailySchedule: Array<{
    day: number;
    date: string;
    location: string;
    scenes: Array<{
      sceneNumber: number;
      startTime: string;
      endTime: string;
      duration: number;
    }>;
    castNeeded: string[];
    crewSize: number;
    estimatedCost: number;
  }>;
  castSchedule: Array<{
    characterName: string;
    workDays: number[];
    totalDays: number;
    estimatedCost: number;
  }>;
  locationSchedule: Array<{
    location: string;
    scenes: number[];
    days: number[];
    setupRequirements: string[];
    estimatedCost: number;
  }>;
  complexScenes: Array<{
    sceneNumber: number;
    reason: string;
    recommendation: string;
    priority: "high" | "medium" | "low";
  }>;
  departmentNeeds: {
    makeup: {
      dailyRequirements: Array<{
        day: number;
        artistsNeeded: number;
        setupTime: number;
      }>;
    };
    wardrobe: {
      dailyRequirements: Array<{
        day: number;
        costumesNeeded: number;
      }>;
    };
  };
  budgetBreakdown: {
    cast: number;
    crew: number;
    equipment: number;
    locations: number;
    postProduction: number;
    contingency: number;
    total: number;
  };
  riskAssessment: Array<{
    type: "weather" | "cast" | "location" | "equipment" | "budget";
    description: string;
    impact: "high" | "medium" | "low";
    mitigation: string;
  }>;
  // Phase 2 Enhanced Features
  equipmentSchedule: Array<{
    equipmentType: string;
    scenes: number[];
    days: number[];
    rentalCost: number;
    setupTime: number;
    conflicts: string[];
  }>;
  departmentWorkload: {
    makeup: Array<{
      day: number;
      artistsNeeded: number;
      complexity: "standard" | "complex" | "extreme";
      setupHours: number;
      specialRequirements: string[];
    }>;
    wardrobe: Array<{
      day: number;
      costumesNeeded: number;
      quickChanges: number;
      fittingTime: number;
      specialRequirements: string[];
    }>;
    props: Array<{
      day: number;
      propsNeeded: string[];
      setupTime: number;
      specialHandling: string[];
    }>;
  };
  conflictAnalysis: {
    castConflicts: Array<{
      characterName: string;
      conflictDays: number[];
      severity: "high" | "medium" | "low";
      resolution: string;
    }>;
    equipmentConflicts: Array<{
      equipmentType: string;
      conflictDays: number[];
      affectedScenes: number[];
      resolution: string;
    }>;
    locationConflicts: Array<{
      location: string;
      conflictDays: number[];
      issue: string;
      resolution: string;
    }>;
  };
  optimizationMetrics: {
    locationEfficiency: number; // 0-100%
    castUtilization: number; // 0-100%
    equipmentUtilization: number; // 0-100%
    overallEfficiency: number; // 0-100%
    estimatedSavings: number; // Dollar amount saved vs basic schedule
  };
}

// System Prompt for Scheduling Generation
const SCHEDULING_GENERATOR_SYSTEM_PROMPT = `
FILM PRODUCTION SCHEDULING GENERATOR
====================================

You are an AI Production Scheduler that converts detailed script analysis data into practical filming schedules. Your role is to create realistic, budget-conscious shooting schedules that optimize efficiency while maintaining quality.

## Core Responsibilities

1. **Schedule Optimization**
   - Group scenes by location to minimize moves and setup time
   - Sequence scenes to maximize cast and crew efficiency
   - Balance daily workload to maintain quality while meeting deadlines
   - Account for setup, shooting, and wrap time for each scene

2. **Budget Estimation**
   - Calculate realistic cost estimates based on scene complexity and requirements
   - Factor in cast days, crew size, equipment rental, and location costs
   - Provide low/high budget ranges with contingency planning
   - Break down costs by department and production phase

3. **Resource Planning**
   - Generate cast Day-Out-of-Days (DOOD) schedules
   - Calculate optimal crew size based on scene requirements
   - Plan equipment and department resource allocation
   - Identify potential conflicts and bottlenecks

4. **Risk Management**
   - Flag high-complexity scenes requiring special attention
   - Identify weather-dependent scenes needing backup plans
   - Highlight potential scheduling conflicts
   - Provide mitigation strategies for identified risks

## Scheduling Principles

### Location Grouping Strategy (Phase 2 Enhanced)
- **Smart Location Clustering**: Group scenes by location proximity and type
- **Company Move Optimization**: Calculate travel time and minimize expensive moves
- **Weather Contingency Planning**: Schedule interior scenes as backup for weather-dependent exteriors
- **Location Access Windows**: Account for permit restrictions and availability
- **Setup Cost Amortization**: Maximize location usage to spread setup costs

### Cast Efficiency Optimization (Phase 2 Enhanced)
- **Day-Out-of-Days Optimization**: Minimize actor holding days and maximize continuity
- **Character Arc Scheduling**: Group scenes by character development flow when possible
- **Union Compliance**: Automatic turnaround time and rest period calculations
- **Makeup/Wardrobe Efficiency**: Schedule cast changes to minimize department workload
- **Conflict Detection**: Identify and resolve cast availability conflicts

### Equipment & Department Scheduling (Phase 2)
- **Equipment Rental Optimization**: Group scenes requiring specialized equipment
- **Department Resource Planning**: Calculate daily needs for makeup, wardrobe, props
- **Equipment Conflict Detection**: Identify double-bookings and resource bottlenecks  
- **Crew Size Optimization**: Adjust crew size based on daily requirements
- **Department Setup Time**: Account for prep time needed by each department

### Daily Schedule Structure (Enhanced)
- **Flexible Day Length**: Optimize between 8-12 hour days based on content
- **Complexity-Based Scheduling**: Schedule demanding scenes when crew is fresh
- **Meal Break Optimization**: Strategic meal timing to maximize momentum
- **Setup/Strike Efficiency**: Minimize daily setup and breakdown time
- **Contingency Time Allocation**: Build in buffer time for complex scenes

### Budget Calculation Guidelines (Phase 2 Enhanced)
- **Cast**: $500-2000/day per principal, $150-300/day per supporting, includes holding days
- **Crew**: $300-800/day per crew member, variable by department and specialization
- **Equipment**: $500-2000/day for basic packages, $1000-5000/day for specialized gear
- **Locations**: $500-5000/day plus travel and setup costs, permit fees
- **Department Costs**: Makeup ($200-800/day), Wardrobe ($300-1000/day), Props ($100-500/day)
- **Post-production**: 15-25% of production budget, varies by complexity
- **Contingency**: 10-15% buffer for unforeseen costs and schedule changes

## MANDATORY OUTPUT FORMAT

**CRITICAL: Return ONLY a complete, valid JSON object following this exact structure:**

\`\`\`json
{
  "scheduleOverview": {
    "projectId": "string",
    "totalShootDays": "number",
    "estimatedBudgetRange": {
      "low": "number",
      "high": "number"
    },
    "recommendedCrewSize": "number",
    "productionTimeline": {
      "prepDays": "number",
      "shootDays": "number", 
      "wrapDays": "number"
    }
  },
  "dailySchedule": [
    {
      "day": "number",
      "date": "YYYY-MM-DD",
      "location": "string",
      "scenes": [
        {
          "sceneNumber": "number",
          "startTime": "HH:MM",
          "endTime": "HH:MM", 
          "duration": "number_hours"
        }
      ],
      "castNeeded": ["array_of_character_names"],
      "crewSize": "number",
      "estimatedCost": "number"
    }
  ],
  "castSchedule": [
    {
      "characterName": "string",
      "workDays": ["array_of_day_numbers"],
      "totalDays": "number",
      "estimatedCost": "number"
    }
  ],
  "locationSchedule": [
    {
      "location": "string",
      "scenes": ["array_of_scene_numbers"],
      "days": ["array_of_day_numbers"],
      "setupRequirements": ["array_of_requirements"],
      "estimatedCost": "number"
    }
  ],
  "complexScenes": [
    {
      "sceneNumber": "number",
      "reason": "string",
      "recommendation": "string",
      "priority": "high|medium|low"
    }
  ],
  "departmentNeeds": {
    "makeup": {
      "dailyRequirements": [
        {
          "day": "number",
          "artistsNeeded": "number",
          "setupTime": "number_minutes"
        }
      ]
    },
    "wardrobe": {
      "dailyRequirements": [
        {
          "day": "number",
          "costumesNeeded": "number"
        }
      ]
    }
  },
  "budgetBreakdown": {
    "cast": "number",
    "crew": "number", 
    "equipment": "number",
    "locations": "number",
    "postProduction": "number",
    "contingency": "number",
    "total": "number"
  },
  "riskAssessment": [
    {
      "type": "weather|cast|location|equipment|budget",
      "description": "string",
      "impact": "high|medium|low", 
      "mitigation": "string"
    }
  ],
  "equipmentSchedule": [
    {
      "equipmentType": "string",
      "scenes": ["array_of_scene_numbers"],
      "days": ["array_of_day_numbers"],
      "rentalCost": "number",
      "setupTime": "number_minutes",
      "conflicts": ["array_of_conflict_descriptions"]
    }
  ],
  "departmentWorkload": {
    "makeup": [
      {
        "day": "number",
        "artistsNeeded": "number",
        "complexity": "standard|complex|extreme",
        "setupHours": "number",
        "specialRequirements": ["array_of_requirements"]
      }
    ],
    "wardrobe": [
      {
        "day": "number",
        "costumesNeeded": "number",
        "quickChanges": "number",
        "fittingTime": "number_minutes",
        "specialRequirements": ["array_of_requirements"]
      }
    ],
    "props": [
      {
        "day": "number",
        "propsNeeded": ["array_of_prop_names"],
        "setupTime": "number_minutes",
        "specialHandling": ["array_of_handling_requirements"]
      }
    ]
  },
  "conflictAnalysis": {
    "castConflicts": [
      {
        "characterName": "string",
        "conflictDays": ["array_of_day_numbers"],
        "severity": "high|medium|low",
        "resolution": "string"
      }
    ],
    "equipmentConflicts": [
      {
        "equipmentType": "string",
        "conflictDays": ["array_of_day_numbers"],
        "affectedScenes": ["array_of_scene_numbers"],
        "resolution": "string"
      }
    ],
    "locationConflicts": [
      {
        "location": "string",
        "conflictDays": ["array_of_day_numbers"],
        "issue": "string",
        "resolution": "string"
      }
    ]
  },
  "optimizationMetrics": {
    "locationEfficiency": "number_0_to_100",
    "castUtilization": "number_0_to_100",
    "equipmentUtilization": "number_0_to_100",
    "overallEfficiency": "number_0_to_100",
    "estimatedSavings": "number_dollar_amount"
  }
}
\`\`\`

**NEVER provide text responses, explanations, or incomplete JSON. Always return the complete structured JSON object with all required fields populated with realistic production values.**

Your scheduling recommendations will directly impact production success, budget management, and crew efficiency. Ensure all estimates are professional, realistic, and industry-standard.
`;

class GeminiSchedulingGeneratorService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: "AIzaSyABISxaNzifdIcZUCe408LoKnEz0bia8cI"
    });
  }

  async generateProductionSchedule(
    scriptAnalysis: ScriptAnalysisInput, 
    projectId: string
  ): Promise<ProductionScheduleOutput> {
    console.log('');
    console.log('🎬 ===== PRODUCTION SCHEDULE GENERATION STARTING =====');
    console.log('📅 TIMESTAMP:', new Date().toISOString());
    console.log('🆔 PROJECT_ID:', projectId);
    console.log('📊 METHOD: generateProductionSchedule()');
    console.log('🎬 ====================================================');
    console.log('');
    
    try {
      console.log('🚀 STEP 1: INPUT VALIDATION & PROCESSING');
      console.log('📝 INPUT: Script analysis data received');
      console.log('🔍 INPUT: Project ID:', projectId);
      console.log('📊 INPUT: Total scenes:', scriptAnalysis.sceneBreakdownOutput.sceneAnalysisSummary.totalScenesProcessed);
      console.log('📊 INPUT: Total characters:', scriptAnalysis.sceneBreakdownOutput.sceneAnalysisSummary.totalCharactersIdentified);
      console.log('📊 INPUT: Average complexity:', scriptAnalysis.sceneBreakdownOutput.sceneAnalysisSummary.averageSceneComplexity);
      
      // Validate input data
      if (!scriptAnalysis.sceneBreakdownOutput?.detailedSceneBreakdowns?.length) {
        throw new Error('No scene breakdown data provided for scheduling');
      }
      
      console.log('✅ VALIDATION: Script analysis data is valid');

      console.log('');
      console.log('🚀 STEP 2: PROMPT PREPARATION');
      console.log('📝 PROMPT: Building scheduling request...');
      
      const prompt = `
Generate a comprehensive production schedule from this script analysis data:

SCRIPT ANALYSIS DATA:
${JSON.stringify(scriptAnalysis, null, 2)}

PROJECT ID: ${projectId}

Create a realistic filming schedule that:
1. Groups scenes efficiently by location
2. Optimizes cast scheduling to minimize holding days
3. Provides accurate budget estimates
4. Identifies potential risks and complex scenes
5. Plans department resource allocation

Return ONLY the complete JSON object with all scheduling data populated according to the specified schema.
`;

      console.log('📊 PROMPT STATS:');
      console.log('  - User prompt length:', prompt.length, 'characters');
      console.log('  - System prompt length:', SCHEDULING_GENERATOR_SYSTEM_PROMPT.length, 'characters');
      console.log('  - Total prompt length:', prompt.length + SCHEDULING_GENERATOR_SYSTEM_PROMPT.length, 'characters');
      
      console.log('');
      console.log('🚀 STEP 3: API REQUEST PREPARATION');
      
      const requestConfig = {
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 32768,
          systemInstruction: SCHEDULING_GENERATOR_SYSTEM_PROMPT
        }
      };
      
      console.log('⚙️ REQUEST CONFIG:');
      console.log('  - Model:', requestConfig.model);
      console.log('  - Temperature:', requestConfig.config.temperature);
      console.log('  - Max Output Tokens:', requestConfig.config.maxOutputTokens);
      
      console.log('');
      console.log('🌐 MAKING API CALL TO GEMINI...');
      console.log('📡 Endpoint: ai.models.generateContent()');
      console.log('⏰ Request timestamp:', new Date().toISOString());
      
      const startTime = performance.now();
      const response = await this.ai.models.generateContent(requestConfig);
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      console.log('');
      console.log('🚀 STEP 4: API RESPONSE RECEIVED');
      console.log('⏰ Response timestamp:', new Date().toISOString());
      console.log('⚡ Response time:', responseTime, 'ms');
      
      const responseText = response.text;
      console.log('✅ Response text extracted successfully');
      console.log('📏 Response text length:', responseText ? responseText.length : 0, 'characters');
      
      if (!responseText) {
        throw new Error('No response text received from Gemini API');
      }

      console.log('================== RAW SCHEDULE RESULT ===================');
      console.log(responseText);
      console.log('=================== END RAW RESULT ===================');

      console.log('');
      console.log('🚀 STEP 5: RESPONSE PARSING & VALIDATION');
      
      const parsedResponse = this.parseSchedulingResponse(responseText);

      if (!parsedResponse) {
        throw new Error('Failed to parse production schedule response');
      }
      
      console.log('✅ PARSE SUCCESS: Valid production schedule received');
      
      console.log('📊 FINAL SCHEDULE SUMMARY:');
      console.log('  - Total shoot days:', parsedResponse.scheduleOverview?.totalShootDays || 'N/A');
      console.log('  - Budget range:', `$${parsedResponse.scheduleOverview?.estimatedBudgetRange?.low || 0}K - $${parsedResponse.scheduleOverview?.estimatedBudgetRange?.high || 0}K`);
      console.log('  - Crew size:', parsedResponse.scheduleOverview?.recommendedCrewSize || 'N/A');
      console.log('  - Daily schedules:', parsedResponse.dailySchedule?.length || 0);
      
      console.log('');
      console.log('🎉 ========== SCHEDULE GENERATION COMPLETE ==========');
      console.log('✅ Production schedule generated successfully!');
      console.log('🎯 Schedule ready for display in UI');
      console.log('🎉 ==================================================');
      console.log('');
      
      return parsedResponse;

    } catch (error) {
      console.log('');
      console.log('💥 ========== ERROR OCCURRED ==========');
      console.error('❌ Error generating production schedule:', error);
      console.error('🔍 Error type:', error?.name || 'Unknown');
      console.error('🔍 Error message:', error?.message || 'No message');
      
      if (error?.stack) {
        console.error('📚 Error stack trace:');
        console.error(error.stack);
      }
      
      console.log('💥 ====================================');
      throw error;
    }
  }

  private parseSchedulingResponse(responseText: string): ProductionScheduleOutput | null {
    console.log('');
    console.log('🔍 ===== SCHEDULE RESPONSE PARSING & VALIDATION =====');
    console.log('📅 Parse timestamp:', new Date().toISOString());
    console.log('🔍 ====================================================');
    console.log('');
    
    try {
      console.log('🚀 PARSE STEP 1: INPUT ANALYSIS');
      console.log('📏 Response text length:', responseText?.length || 0, 'characters');
      
      if (!responseText) {
        console.error('❌ PARSE FAILED: Response text is null or empty');
        return null;
      }
      
      console.log('🚀 PARSE STEP 2: JSON EXTRACTION & CLEANING');
      
      let cleanedResponse = responseText;
      console.log('📝 Original response length:', cleanedResponse.length, 'characters');
      
      // Remove markdown code blocks
      cleanedResponse = cleanedResponse
        .replace(/```json\s*\n?/g, '')
        .replace(/```\s*\n?/g, '')
        .trim();

      // Extract JSON boundaries
      const jsonStart = cleanedResponse.indexOf('{');
      const jsonEnd = cleanedResponse.lastIndexOf('}') + 1;
      
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd);
        console.log('✅ JSON extracted successfully');
      }

      console.log('🚀 PARSE STEP 3: JSON PARSING');
      const parsed = JSON.parse(cleanedResponse);
      console.log('✅ JSON parsing successful!');
      
      console.log('🚀 PARSE STEP 4: STRUCTURE VALIDATION');
      
      // Validate required structure
      const hasScheduleOverview = !!parsed.scheduleOverview;
      const hasDailySchedule = !!parsed.dailySchedule;
      const hasCastSchedule = !!parsed.castSchedule;
      
      console.log('  - scheduleOverview exists:', hasScheduleOverview ? '✅ YES' : '❌ NO');
      console.log('  - dailySchedule exists:', hasDailySchedule ? '✅ YES' : '❌ NO');
      console.log('  - castSchedule exists:', hasCastSchedule ? '✅ YES' : '❌ NO');

      if (hasScheduleOverview && hasDailySchedule && hasCastSchedule) {
        console.log('✅ VALIDATION SUCCESS!');
        console.log('🎉 Valid ProductionScheduleOutput structure found');
        return parsed as ProductionScheduleOutput;
      }

      console.error('❌ VALIDATION FAILED: Missing required structure');
      return null;

    } catch (error) {
      console.error('❌ Error parsing schedule response:', error);
      console.error('Response preview:', responseText.substring(0, 500));
      return null;
    }
  }
}

// Export singleton instance
export const geminiSchedulingGeneratorService = new GeminiSchedulingGeneratorService();

// Export helper function
export const generateProductionScheduleWithAI = async (
  scriptAnalysis: ScriptAnalysisInput,
  projectId: string,
  onProgress?: (status: string) => void
): Promise<{ status: 'completed' | 'error'; result?: ProductionScheduleOutput; error?: string }> => {
  console.log('');
  console.log('🎯 ===== SCHEDULE GENERATION AI HELPER FUNCTION CALLED =====');
  console.log('📅 TIMESTAMP:', new Date().toISOString());
  console.log('🆔 PROJECT_ID:', projectId);
  console.log('🎯 ==========================================================');
  console.log('');
  
  try {
    console.log('🚀 HELPER: Starting production schedule generation...');
    console.log('📊 HELPER: Script scenes:', scriptAnalysis.sceneBreakdownOutput.sceneAnalysisSummary.totalScenesProcessed);
    console.log('📊 HELPER: Progress callback provided:', !!onProgress);
    
    onProgress?.('Analyzing script data for scheduling...');
    console.log('📢 HELPER: Progress callback called - Starting analysis');
    
    onProgress?.('Generating optimized production schedule...');
    
    console.log('🔄 HELPER: Calling geminiSchedulingGeneratorService.generateProductionSchedule()...');
    const result = await geminiSchedulingGeneratorService.generateProductionSchedule(scriptAnalysis, projectId);
    
    console.log('✅ HELPER: Schedule generation completed!');
    console.log('📊 HELPER: Result type:', typeof result);
    console.log('📊 HELPER: Total shoot days:', result?.scheduleOverview?.totalShootDays);
    
    onProgress?.('Production schedule generated successfully!');
    console.log('📢 HELPER: Progress callback called - Generation completed');
    
    console.log('🎉 HELPER: Returning success result');
    return {
      status: 'completed',
      result
    };
    
  } catch (error) {
    console.log('💥 ========== HELPER ERROR OCCURRED ==========');
    console.error('❌ HELPER: Schedule generation failed:', error);
    console.error('🔍 HELPER: Error type:', error?.name || 'Unknown');
    console.error('🔍 HELPER: Error message:', error?.message || 'No message');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.log('🔄 HELPER: Returning error result with message:', errorMessage);
    console.log('💥 ==========================================');
    
    return {
      status: 'error',
      error: errorMessage
    };
  }
};