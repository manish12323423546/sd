import { GoogleGenAI } from "@google/genai";

// Schedule Optimizer Output Types
export interface ScheduleOptimizerOutput {
  scheduleModelOutput: {
    processingLog: {
      sceneLocationGrouping: {
        executed: boolean;
        timestamp: string;
        scenesGroupedByLocation: number;
        locationClustersCreated: number;
        stageVsPracticalOptimized: boolean;
        geographicProximityFactored: boolean;
        status: string;
      };
      companyMoveMinimization: {
        executed: boolean;
        timestamp: string;
        totalMovesReduced: string;
        moveCostsCalculated: number;
        equipmentLogisticsOptimized: boolean;
        locationBookingPeriodsFactored: boolean;
        status: string;
      };
      castScheduleOptimization: {
        executed: boolean;
        timestamp: string;
        castHoldDaysMinimized: string;
        principalSupportingBalanced: boolean;
        availabilityConstraintsRespected: boolean;
        travelCostsOptimized: boolean;
        status: string;
      };
      dayNightBalancing: {
        executed: boolean;
        timestamp: string;
        turnaroundViolationsMinimized: boolean;
        lightingTransitionsOptimized: boolean;
        seasonalDaylightFactored: boolean;
        crewEfficiencyMaximized: boolean;
        status: string;
      };
      constraintRespectProcessing: {
        executed: boolean;
        timestamp: string;
        unionConstraintsValidated: boolean;
        castLocationWeatherFactored: boolean;
        contractualObligationsRespected: boolean;
        safetyRegulationsIncluded: boolean;
        status: string;
      };
      overallProcessingStatus: string;
    };
    optimizedSchedule: {
      summary: {
        totalDays: number;
        efficiency: number;
        pagesPerDay: number;
        companyMoves: number;
        overtimeEstimate: number;
      };
      productionPhases: Array<{
        phase: string;
        startDate: string;
        endDate: string;
        days: number;
        location: string;
        scenes: number[];
        keyConstraints: string[];
      }>;
      weeklyBreakdown: Array<{
        week: number;
        dates: string;
        location: string;
        days: Array<{
          date: string;
          scenes: number[];
          pages: number;
          callTime: string;
          wrapTime: string;
          cast: string[];
        }>;
      }>;
      metrics: {
        castUtilization: {
          [key: string]: {
            workDays: number;
            holdDays: number;
            efficiency: number;
          };
        };
        locationEfficiency: {
          [key: string]: {
            setupDays: number;
            shootDays: number;
            efficiency: number;
          };
        };
        equipmentUtilization: {
          [key: string]: {
            bookedDays: number;
            utilizationRate: number;
          };
        };
      };
    };
    costImpact: {
      laborCosts: {
        regularTime: number;
        overtime: number;
        nightPremiums: number;
        mealPenalties: number;
        forcedCalls: number;
        castHoldDays: number;
        total: number;
      };
      efficiencySavings: {
        reducedSetups: number;
        minimizedMoves: number;
        castGrouping: number;
        total: number;
      };
      additionalCosts: {
        weatherDelays: number;
        equipmentIdle: number;
        total: number;
      };
    };
    riskFactors: Array<{
      type: string;
      location?: string;
      equipment?: string;
      affected?: string;
      probability: number;
      impact: string;
      mitigation: string;
    }>;
    recommendations: string[];
  };
}

// System Prompt for Schedule Optimizer
const SCHEDULE_OPTIMIZER_SYSTEM_PROMPT = `
SCHEDULE OPTIMIZER SYSTEM PROMPT
=================================

You are the Schedule Optimizer for a multi-model film budget system. Your responsibility is to create cost-efficient, realistic shooting schedules that optimize crew utilization, minimize company moves, and respect all creative, logistical, and contractual constraints.

## REQUIRED PROCESSING SEQUENCE

Before generating any output, you MUST perform the following processing steps using function calling:

### 1. Scene Location Grouping Processing
Use function calling to:
- Group scenes by location for efficiency
- Minimize total number of location moves
- Cluster scenes by geographic proximity
- Optimize stage and practical location usage

### 2. Company Move Minimization Processing
Use function calling to:
- Minimize company moves between locations
- Calculate move costs and time requirements
- Factor in equipment transport logistics
- Optimize location booking periods

### 3. Cast Schedule Optimization Processing
Use function calling to:
- Optimize cast scheduling for efficiency
- Minimize cast hold days and travel
- Balance principal and supporting cast usage
- Factor in cast availability constraints

### 4. Day/Night Shoot Balancing Processing
Use function calling to:
- Balance day/night shoots for crew efficiency
- Minimize turnaround violations
- Optimize lighting and equipment transitions
- Factor in seasonal daylight variations

### 5. Constraint Respect Processing
Use function calling to:
- Respect all constraints (union, cast, location, weather)
- Validate schedule compliance
- Factor in contractual obligations
- Include safety and regulatory requirements

**CRITICAL: All schedule optimization must be performed through these processing functions before generating final output.**

## Core Functions

1. **Scene Sequencing Optimization**
   - Group scenes by location to minimize company moves
   - Organize by cast availability to reduce hold days
   - Balance daily page counts for consistent productivity
   - Respect day/night shooting requirements
   - Account for setup and breakdown time

2. **Constraint Management**
   - Cast availability windows and blackout dates
   - Location availability and seasonal restrictions
   - Equipment booking conflicts and dependencies
   - Union regulations (turnaround, overtime, meal penalties)
   - Weather-dependent outdoor shooting windows

3. **Resource Optimization**
   - Minimize cast hold days and travel costs
   - Optimize crew utilization across production phases
   - Balance equipment rental periods
   - Reduce setup and strike time through grouping
   - Maximize studio and location efficiency

4. **Risk Assessment and Mitigation**
   - Identify schedule vulnerabilities
   - Build in appropriate contingencies
   - Plan for weather and technical delays
   - Establish backup shooting options
   - Create flexibility for unexpected changes

## Optimization Algorithms

### Location Grouping Strategy
- Prioritize completing all work at remote locations first
- Minimize expensive location moves and setup costs
- Consider travel time and logistics between locations
- Group related scenes to maintain narrative continuity
- Account for location-specific crew and equipment needs

### Cast Scheduling Optimization
- Minimize high-value cast member hold days
- Group scenes by cast combinations when possible
- Respect start dates, wrap dates, and availability windows
- Balance workload to prevent exhaustion
- Plan for makeup, wardrobe, and preparation time

### Equipment Utilization
- Coordinate specialized equipment booking periods
- Minimize rental duration through efficient scheduling
- Group scenes requiring similar technical setups
- Plan for equipment testing and calibration time
- Account for backup equipment and maintenance periods

## Production Phase Management

### Pre-Production Integration
- Coordinate with construction and preparation schedules
- Align with casting and crew hiring timelines
- Integrate with location scouting and permitting
- Schedule equipment testing and rehearsal periods
- Plan for wardrobe fittings and makeup tests

### Principal Photography Phases
- **Phase 1**: Remote/Seasonal Location Work
  - Complete weather-dependent exterior work first
  - Minimize crew travel and accommodation costs
  - Group all location-specific scenes together
  - Plan for equipment shipping and customs clearance
- **Phase 2**: Studio Base Work
  - Establish consistent studio workflow
  - Optimize stage utilization and construction
  - Balance multiple unit photography
  - Coordinate complex technical setups
- **Phase 3**: Specialized/VFX Work
  - Schedule extensive setup time for complex shots
  - Allow for multiple takes and experimentation
  - Plan for motion control and specialized equipment
  - Coordinate with post-production preparation

### Wrap and Transition Planning
- Schedule equipment return and reconciliation
- Plan for location restoration and cleanup
- Coordinate with post-production startup
- Manage crew transition and release schedules

## Union Compliance and Cost Control

### Labor Regulations
- Ensure minimum turnaround times (12 hours UK, 10 hours US)
- Plan meal breaks within 6-hour windows
- Minimize forced calls and overtime exposure
- Respect maximum daily working hours
- Account for travel time in scheduling

### Cost Impact Analysis
- Calculate overtime and penalty projections
- Assess meal penalty exposure
- Evaluate cast hold day costs
- Analyze equipment idle time charges
- Project transportation and accommodation costs

## Risk Assessment Integration

### Schedule Vulnerability Analysis
- Identify critical path dependencies
- Assess weather and seasonal risks
- Evaluate technical complexity challenges
- Consider cast health and availability risks
- Plan for equipment failure contingencies

### Contingency Planning
- Build realistic buffer time into complex sequences
- Establish backup shooting options for weather delays
- Plan alternative approaches for technical failures
- Create flexibility for creative changes
- Maintain crew and equipment availability options

## Historical Context Considerations

### 1960s Production Realities
- Limited communication systems requiring more planning
- Less sophisticated weather forecasting
- Longer equipment setup and breakdown times
- More manual labor-intensive operations
- Extended testing periods for new technology

### Revolutionary Production Challenges
- Unprecedented technical requirements
- Extensive research and development time
- Multiple prototype iterations
- Extended testing and calibration periods
- Higher risk factors requiring greater contingencies

## Output Requirements

Provide comprehensive schedules including:
- Day-by-day shooting schedule with scenes and pages
- Cast call times and wrap estimates
- Location and equipment requirements
- Crew size and department needs
- Risk assessments and contingency plans
- Cost impact analysis
- Alternative scenario planning
- Efficiency metrics and optimization opportunities

### Quality Control Standards
- Verify all scenes are scheduled and accounted for
- Ensure cast availability aligns with scene requirements
- Confirm location and equipment availability
- Validate union compliance and cost projections
- Cross-check with other department requirements

Your schedule optimization must balance creative ambitions with practical constraints, ensuring the production can achieve its artistic vision while maintaining cost control, crew welfare, and operational efficiency throughout the extended production period.
`;

class GeminiScheduleOptimizerService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: "AIzaSyABISxaNzifdIcZUCe408LoKnEz0bia8cI"
    });
  }

  async analyzeScheduleOptimizerData(jsonInput: string, projectId: string): Promise<{ result?: ScheduleOptimizerOutput; rawResponse?: string; error?: string }> {
    console.log('');
    console.log('📅 ===== SCHEDULE OPTIMIZER ANALYSIS STARTING =====');
    console.log('📅 TIMESTAMP:', new Date().toISOString());
    console.log('🆔 PROJECT_ID:', projectId);
    console.log('📊 METHOD: analyzeScheduleOptimizerData()');
    console.log('📅 ==================================================');
    console.log('');
    
    try {
      console.log('🚀 STEP 1: INPUT VALIDATION & PROCESSING');
      console.log('📝 INPUT: JSON input length:', jsonInput.length, 'characters');
      console.log('🔍 INPUT: JSON input type:', typeof jsonInput);
      console.log('🔍 INPUT: Project ID type:', typeof projectId);
      console.log('🔍 INPUT: Project ID value:', projectId);
      
      console.log('🔍 VALIDATION: Checking minimum length...');
      if (jsonInput.length < 10) {
        console.error('❌ VALIDATION FAILED: JSON input too short:', jsonInput.length, 'characters');
        throw new Error('JSON input is too short to analyze');
      }
      console.log('✅ VALIDATION: JSON input length acceptable');

      // Validate JSON input
      let parsedInput;
      try {
        console.log('🔍 VALIDATION: Attempting to parse JSON...');
        parsedInput = JSON.parse(jsonInput);
        console.log('✅ VALIDATION: JSON parsing successful');
        console.log('📊 PARSED JSON TYPE:', typeof parsedInput);
        console.log('📊 PARSED JSON KEYS:', Object.keys(parsedInput));
      } catch (error) {
        console.error('❌ VALIDATION FAILED: Invalid JSON input provided');
        console.error('🔍 JSON Parse Error:', error.message);
        console.error('📋 JSON Input Preview:', jsonInput.substring(0, 200));
        throw new Error('Invalid JSON input provided');
      }

      console.log('');
      console.log('🚀 STEP 2: PROMPT PREPARATION');
      console.log('📝 PROMPT: Building user prompt...');
      
      const prompt = `
Please analyze this schedule optimization data and provide a complete schedule optimizer response following the required JSON format:

SCHEDULE OPTIMIZATION DATA:
${jsonInput}

PROJECT ID: ${projectId}

Remember to return ONLY the complete JSON object with all required fields populated according to the specified schema.
`;

      console.log('📊 PROMPT STATS:');
      console.log('  - User prompt length:', prompt.length, 'characters');
      console.log('  - System prompt length:', SCHEDULE_OPTIMIZER_SYSTEM_PROMPT.length, 'characters');
      console.log('  - Total prompt length:', prompt.length + SCHEDULE_OPTIMIZER_SYSTEM_PROMPT.length, 'characters');
      
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
          systemInstruction: SCHEDULE_OPTIMIZER_SYSTEM_PROMPT
        }
      };
      
      console.log('⚙️ REQUEST CONFIG:');
      console.log('  - Model:', requestConfig.model);
      console.log('  - Temperature:', requestConfig.config.temperature);
      console.log('  - TopP:', requestConfig.config.topP);
      console.log('  - TopK:', requestConfig.config.topK);
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
      console.log('📊 Response object type:', typeof response);
      
      console.log('');
      console.log('📝 EXTRACTING RESPONSE TEXT...');
      const responseText = response.text;
      console.log('✅ Response text extracted successfully');
      console.log('📊 Response text type:', typeof responseText);
      console.log('📏 Response text length:', responseText ? responseText.length : 0, 'characters');
      
      if (!responseText) {
        console.error('❌ CRITICAL ERROR: No response text received from Gemini API');
        throw new Error('No response text received from Gemini API');
      }

      console.log('');
      console.log('🚀 STEP 5: RESPONSE PARSING & VALIDATION');
      console.log('🔄 Calling parseScheduleOptimizerResponse()...');
      
      const parsedResponse = this.parseScheduleOptimizerResponse(responseText);

      if (!parsedResponse) {
        console.error('');
        console.error('💥 ========== PARSE FAILURE ==========');
        console.error('❌ CRITICAL ERROR: Failed to parse schedule optimizer response from Gemini API');
        console.error('🔍 Parsed response is null/undefined');
        console.error('📊 This indicates JSON parsing or validation failed');
        console.error('🔍 Returning raw response for manual inspection');
        console.error('💥 ===================================');
        console.error('');
        
        return {
          rawResponse: responseText,
          error: 'Failed to parse schedule optimizer response'
        };
      }
      
      console.log('✅ PARSE SUCCESS: Valid schedule optimizer response received');
      console.log('');
      console.log('🚀 STEP 6: FINAL VALIDATION & COMPLETION');
      
      console.log('📊 FINAL ANALYSIS SUMMARY:');
      try {
        const summary = parsedResponse.scheduleModelOutput;
        console.log('  - Processing status:', summary?.processingLog?.overallProcessingStatus || 'N/A');
        console.log('  - Total days:', summary?.optimizedSchedule?.summary?.totalDays || 'N/A');
        console.log('  - Efficiency:', summary?.optimizedSchedule?.summary?.efficiency || 'N/A');
        console.log('  - Company moves:', summary?.optimizedSchedule?.summary?.companyMoves || 'N/A');
      } catch (summaryError) {
        console.log('  - Summary extraction failed:', summaryError.message);
        console.log('  - But analysis data is still complete');
      }

      console.log('');
      console.log('🎉 ========== SCHEDULE OPTIMIZER ANALYSIS COMPLETE ==========');
      console.log('✅ Schedule optimizer analysis completed successfully!');
      console.log('📁 Parsed response ready for use in application');
      console.log('🎯 Analysis ready for display in UI');
      console.log('🎉 =============================================================');
      console.log('');
      
      return {
        result: parsedResponse,
        rawResponse: responseText
      };

    } catch (error) {
      console.log('');
      console.log('💥 ========== ERROR OCCURRED ==========');
      console.error('❌ Error in schedule optimizer analysis:', error);
      console.error('🔍 Error type:', error?.name || 'Unknown');
      console.error('🔍 Error message:', error?.message || 'No message');
      
      if (error?.stack) {
        console.error('📚 Error stack trace:');
        console.error(error.stack);
      }
      
      console.log('💥 ====================================');
      console.log('');
      
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private parseScheduleOptimizerResponse(responseText: string): ScheduleOptimizerOutput | null {
    console.log('');
    console.log('🔍 ===== SCHEDULE OPTIMIZER RESPONSE PARSING & VALIDATION =====');
    console.log('📅 Parse timestamp:', new Date().toISOString());
    console.log('🔍 ===============================================================');
    console.log('');
    
    try {
      console.log('🚀 PARSE STEP 1: INPUT ANALYSIS');
      console.log('📏 Response text length:', responseText?.length || 0, 'characters');
      console.log('📊 Response text type:', typeof responseText);
      
      if (!responseText) {
        console.error('❌ PARSE FAILED: Response text is null, undefined, or empty');
        return null;
      }
      
      console.log('');
      console.log('🚀 PARSE STEP 2: JSON EXTRACTION & CLEANING');
      
      // Clean response text
      let cleanedResponse = responseText;
      console.log('📝 Original response length:', cleanedResponse.length, 'characters');
      
      console.log('🧹 Removing markdown code blocks...');
      cleanedResponse = cleanedResponse
        .replace(/```json\s*\n?/g, '')
        .replace(/```\s*\n?/g, '')
        .trim();

      console.log('🔍 Looking for JSON boundaries...');
      const jsonStart = cleanedResponse.indexOf('{');
      const jsonEnd = cleanedResponse.lastIndexOf('}') + 1;
      
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd);
        console.log('✅ JSON extracted successfully');
      }

      console.log('');
      console.log('🚀 PARSE STEP 3: JSON PARSING');
      const parsed = JSON.parse(cleanedResponse);
      console.log('✅ JSON parsing successful!');
      
      console.log('');
      console.log('🚀 PARSE STEP 4: STRUCTURE VALIDATION');
      console.log('🔍 Validating against ScheduleOptimizerOutput format...');
      
      // Check if response is in the expected format
      if (parsed.scheduleModelOutput && 
          parsed.scheduleModelOutput.processingLog &&
          parsed.scheduleModelOutput.optimizedSchedule) {
        
        console.log('');
        console.log('✅ VALIDATION SUCCESS!');
        console.log('🎉 Correct ScheduleOptimizerOutput structure found');
        console.log('📊 Final validation stats:');
        console.log('  - Processing log included:', !!parsed.scheduleModelOutput.processingLog);
        console.log('  - Optimized schedule included:', !!parsed.scheduleModelOutput.optimizedSchedule);
        console.log('  - Structure matches expected format: ✅ YES');
        console.log('  - Ready for return: ✅ YES');
        
        return parsed as ScheduleOptimizerOutput;
      }

      console.error('❌ VALIDATION FAILED: Structure validation failed');
      console.error('🔍 Response does not match expected format');
      console.error('🔍 Available keys:', Object.keys(parsed));
      return null;

    } catch (error) {
      console.error('❌ Error parsing schedule optimizer response:', error);
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      console.error('Response length:', responseText.length);
      console.error('Response preview:', responseText.substring(0, 1000));
      
      return null;
    }
  }
}

// Export singleton instance
export const geminiScheduleOptimizerService = new GeminiScheduleOptimizerService();

// Export helper function
export const analyzeScheduleOptimizerWithAI = async (
  jsonInput: string,
  projectId: string,
  onProgress?: (status: string) => void
): Promise<{ status: 'completed' | 'error'; result?: ScheduleOptimizerOutput; error?: string; rawResponse?: string }> => {
  console.log('');
  console.log('🎯 ===== SCHEDULE OPTIMIZER AI HELPER FUNCTION CALLED =====');
  console.log('📅 TIMESTAMP:', new Date().toISOString());
  console.log('🆔 PROJECT_ID:', projectId);
  console.log('📊 FUNCTION: analyzeScheduleOptimizerWithAI()');
  console.log('🎯 ==========================================================');
  console.log('');
  
  try {
    console.log('🚀 HELPER: Starting schedule optimizer analysis...');
    console.log('📊 HELPER: Input JSON length:', jsonInput.length, 'characters');
    console.log('📊 HELPER: Project ID:', projectId);
    console.log('📊 HELPER: Progress callback provided:', !!onProgress);
    
    onProgress?.('Starting schedule optimizer analysis...');
    console.log('📢 HELPER: Progress callback called - Starting analysis');
    
    console.log('🔄 HELPER: Calling geminiScheduleOptimizerService.analyzeScheduleOptimizerData()...');
    const analysisResult = await geminiScheduleOptimizerService.analyzeScheduleOptimizerData(jsonInput, projectId);
    
    console.log('✅ HELPER: Analysis completed!');
    console.log('📊 HELPER: Result type:', typeof analysisResult);
    console.log('📊 HELPER: Has result:', !!analysisResult?.result);
    console.log('📊 HELPER: Has raw response:', !!analysisResult?.rawResponse);
    console.log('📊 HELPER: Has error:', !!analysisResult?.error);
    
    if (analysisResult?.result) {
      onProgress?.('Schedule optimizer completed successfully!');
      console.log('📢 HELPER: Progress callback called - Analysis completed');
      
      console.log('');
      console.log('🎉 HELPER: Returning success result');
      return {
        status: 'completed',
        result: analysisResult.result,
        rawResponse: analysisResult.rawResponse
      };
    } else {
      console.log('⚠️ HELPER: Analysis failed, returning error with raw response');
      return {
        status: 'error',
        error: analysisResult?.error || 'Analysis failed',
        rawResponse: analysisResult?.rawResponse
      };
    }
    
  } catch (error) {
    console.log('');
    console.log('💥 ========== HELPER ERROR OCCURRED ==========');
    console.error('❌ HELPER: Schedule optimizer analysis failed:', error);
    console.error('🔍 HELPER: Error type:', error?.name || 'Unknown');
    console.error('🔍 HELPER: Error message:', error?.message || 'No message');
    
    if (error?.stack) {
      console.error('📚 HELPER: Error stack trace:');
      console.error(error.stack);
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.log('🔄 HELPER: Returning error result with message:', errorMessage);
    console.log('💥 ==========================================');
    console.log('');
    
    return {
      status: 'error',
      error: errorMessage
    };
  }
};