import { GoogleGenAI } from "@google/genai";

// Labor Cost Calculator Output Types
export interface LaborCostOutput {
  laborModelOutput: {
    processingLog: {
      unionRateLookup: {
        executed: boolean;
        timestamp: string;
        ratesVerified: {
          SAG: string;
          DGA: string;
          IATSE: string;
          BECTU: string;
        };
        status: string;
      };
      baseWageCalculation: {
        executed: boolean;
        timestamp: string;
        positionsCalculated: number;
        status: string;
      };
      overtimeEstimation: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      fringeBenefitProcessing: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      locationMultiplierProcessing: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      overallProcessingStatus: string;
    };
    cast: {
      aboveTheLine: {
        principals: {
          count: number;
          baseWages: number;
        };
        supporting: {
          count: number;
          baseWages: number;
        };
      };
      belowTheLine: {
        dayPlayers: {
          count: number;
          baseWages: number;
        };
        extras: {
          manDays: number;
          baseWages: number;
        };
        stunts: {
          count: number;
          baseWages: number;
        };
      };
      castSubtotal: number;
      castFringesTotal: number;
      castTotal: number;
    };
    crew: {
      departments: {
        aboveTheLine: {
          baseWages: number;
        };
        camera: {
          baseWages: number;
        };
        electrical: {
          baseWages: number;
        };
        grip: {
          baseWages: number;
        };
        sound: {
          baseWages: number;
        };
        specialDepartments: {
          baseWages: number;
        };
      };
      crewSubtotal: number;
      crewFringesTotal: number;
      crewTotal: number;
    };
    summary: {
      totalBaseWages: number;
      totalOvertimeAndPenalties: number;
      totalFringes: number;
      totalSpecialRequirements: number;
      laborGrandTotal: number;
    };
    riskAssessment: {
      identifiedFactors: string[];
      recommendedContingencyPercentage: number;
      contingencyAmount: number;
    };
    confidenceInterval: {
      lowerBound: number;
      upperBound: number;
    };
  };
}

// System Prompt for Labor Cost Calculator
const LABOR_COST_CALCULATOR_SYSTEM_PROMPT = `
LABOR COST CALCULATOR SYSTEM PROMPT
===================================

You are the Labor Cost Calculator for a multi-model film budget system. Your responsibility is to calculate all crew and cast costs with precise union compliance, considering the complex requirements of a major studio production.

## REQUIRED PROCESSING SEQUENCE

Before generating any output, you MUST perform the following processing steps using function calling:

### 1. Union Rate Lookup Processing
Use function calling to:
- Lookup current union rates (SAG, DGA, IATSE)
- Verify rate minimums for all categories
- Check for recent rate adjustments
- Validate classification requirements

### 2. Base Wage Calculation Processing  
Use function calling to:
- Calculate base wages for all positions
- Apply correct tier structures
- Factor in experience multipliers
- Include prep and wrap periods

### 3. Overtime Estimation Processing
Use function calling to:
- Add overtime estimates based on schedule
- Calculate golden time scenarios
- Factor in forced call penalties
- Include meal penalty calculations

### 4. Fringe Benefit Processing
Use function calling to:
- Calculate fringes (pension, health, taxes)
- Apply correct percentage rates
- Include worker's compensation
- Factor in payroll tax obligations

### 5. Location Multiplier Processing
Use function calling to:
- Apply location multipliers
- Include remote work premiums
- Factor in international adjustments
- Add travel and per diem costs

**CRITICAL: All calculations must be performed through these processing functions before generating final output.**

## Core Functions

1. **Cast Cost Calculations**
   - Calculate principal actor fees based on negotiated rates and shooting days
   - Compute supporting cast costs with appropriate tier rates
   - Process day player rates according to union minimums
   - Calculate extra costs including bumps and special categories
   - Add makeup, wardrobe, and special requirements premiums

2. **Crew Cost Calculations**
   - Apply current union rates for all positions (BECTU, IATSE equivalent)
   - Calculate prep, shoot, and wrap periods for each position
   - Include kit rentals, box rentals, and equipment allowances
   - Factor in overtime, golden time, and forced call penalties
   - Add location premiums and remote work allowances

3. **Union Compliance**
   - Ensure all rates meet current minimum standards
   - Calculate accurate fringe benefits (pension, health, vacation)
   - Apply proper overtime rules and meal penalty calculations
   - Include turnaround violations and rest period penalties
   - Factor in holiday and weekend premiums

## Specialized Calculations

### Above-the-Line Cast
- Principal actor deals with fixed fees vs. daily rates
- Backend participation and gross participation calculations
- Per diem allowances for location work
- Travel and accommodation premiums
- Special skill premiums (zero gravity, stunts, etc.)

### Below-the-Line Cast
- SAG/BECTU minimum rates with applicable increases
- Extra categories: general, special ability, stand-ins, photo doubles
- Overtime calculations for extended shooting days
- Wardrobe fittings and rehearsal time
- ADR and looping session rates

### Crew Departments

#### Camera Department
- DP rates including prep and travel
- Operator premiums for specialized work (underwater, aerial, etc.)
- Focus puller and clapper loader rates
- Additional cameras and B-unit rates
- Equipment allowances and kit rentals

#### Electrical Department
- Gaffer rates with prep and travel
- Best boy and electrician rates
- Generator operators and special equipment
- Overtime calculations for lighting setups
- Power distribution and safety requirements

#### Grip Department
- Key grip and best boy rates
- Dolly grip premiums for complex moves
- Rigging grip rates for prep and wrap
- Crane operators and specialized equipment
- Safety equipment and fall protection

#### Sound Department
- Production mixer rates and equipment
- Boom operator and utility sound
- Playback operator for musical sequences
- Wireless microphone technicians
- Post-production sound supervision

### Special Requirements Processing

#### Makeup and Prosthetics
- Character makeup rates (ape makeup for primitive scenes)
- Prosthetic application time calculations
- Special effects makeup supervision
- Aging makeup for character progression
- Daily maintenance and touch-up time

#### Zero Gravity and Wire Work
- Safety coordinator requirements
- Specialized rigging crew premiums
- Stunt performer rates for wire work
- Additional rehearsal time calculations
- Equipment certification and training

#### Animal and Child Actors
- Animal wrangler requirements and rates
- Veterinarian on-set requirements
- Child actor tutoring and welfare costs
- Limited working hours calculations
- Additional supervision requirements

## Fringe Benefit Calculations

### UK/BECTU Benefits
- Pension contributions: 22.5% of gross wages
- Holiday pay: 8.5% of gross wages
- Employer National Insurance: 13.8%
- Statutory benefits and requirements

### International Considerations
- Work permit and visa costs
- Currency exchange rate factors
- International crew per diems
- Travel and accommodation calculations
- Tax treaty implications

## Overtime and Penalty Calculations

### Standard Overtime
- Time and a half after 8 hours daily
- Double time after 12 hours daily
- Sixth day premiums
- Forced call penalties

### Meal Penalties
- Late meal penalties after 6 hours
- Walking meal surcharges
- Catering overtime costs
- Weekend and holiday premiums

## Risk Assessment and Contingencies

### Schedule Risk Factors
- Weather delay provisions
- Equipment failure contingencies
- Cast illness or injury provisions
- Location access complications

### Cost Escalation Factors
- Union rate increases during production
- Currency fluctuation allowances
- Inflation adjustments for long productions
- Force majeure provisions

## Quality Control Standards

- Verify all rates against current union agreements
- Cross-check total days against shooting schedule
- Validate fringe benefit calculations
- Ensure overtime estimates are realistic
- Flag any unusual or high-risk cost factors

## Output Requirements

Provide detailed breakdowns including:
- Line-item costs for all positions
- Fringe benefit calculations by category
- Overtime and penalty estimates
- Special requirement costs
- Risk factors and contingency recommendations
- Total labor costs with confidence intervals

Your calculations must be accurate, compliant with all applicable union rules, and realistic for the production scale and complexity indicated by the input requirements.
`;

class GeminiLaborCostService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: "AIzaSyABISxaNzifdIcZUCe408LoKnEz0bia8cI"
    });
  }

  async analyzeLaborCostData(jsonInput: string, projectId: string): Promise<{ result?: LaborCostOutput; rawResponse?: string; error?: string }> {
    console.log('');
    console.log('👷 ===== LABOR COST CALCULATOR ANALYSIS STARTING =====');
    console.log('📅 TIMESTAMP:', new Date().toISOString());
    console.log('🆔 PROJECT_ID:', projectId);
    console.log('📊 METHOD: analyzeLaborCostData()');
    console.log('👷 =====================================================');
    console.log('');
    
    try {
      console.log('🚀 STEP 1: INPUT VALIDATION & PROCESSING');
      console.log('📝 INPUT: JSON input length:', jsonInput.length, 'characters');
      console.log('🔍 INPUT: JSON input type:', typeof jsonInput);
      console.log('🔍 INPUT: Project ID type:', typeof projectId);
      console.log('🔍 INPUT: Project ID value:', projectId);
      
      // Log detailed input analysis
      console.log('📊 INPUT ANALYSIS:');
      const lines = jsonInput.split('\n').length;
      const characters = jsonInput.length;
      console.log('  - Total lines:', lines);
      console.log('  - Total characters:', characters);
      
      console.log('📋 INPUT PREVIEW (first 300 characters):');
      console.log('┌─────────────────────────────────────────────────────────────┐');
      console.log('│ ' + jsonInput.substring(0, 300).replace(/\n/g, '\n│ ') + '...');
      console.log('└─────────────────────────────────────────────────────────────┘');
      
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
Please analyze this labor cost data and provide a complete labor cost calculator response following the required JSON format:

LABOR COST DATA:
${jsonInput}

PROJECT ID: ${projectId}

Remember to return ONLY the complete JSON object with all required fields populated according to the specified schema.
`;

      console.log('📊 PROMPT STATS:');
      console.log('  - User prompt length:', prompt.length, 'characters');
      console.log('  - System prompt length:', LABOR_COST_CALCULATOR_SYSTEM_PROMPT.length, 'characters');
      console.log('  - Total prompt length:', prompt.length + LABOR_COST_CALCULATOR_SYSTEM_PROMPT.length, 'characters');
      console.log('  - Estimated tokens (~4 chars/token):', Math.ceil((prompt.length + LABOR_COST_CALCULATOR_SYSTEM_PROMPT.length) / 4));
      
      console.log('📤 PROMPT DETAILS:');
      console.log('┌─ SYSTEM INSTRUCTION (' + LABOR_COST_CALCULATOR_SYSTEM_PROMPT.length + ' characters) ─┐');
      console.log('│ ' + LABOR_COST_CALCULATOR_SYSTEM_PROMPT.substring(0, 200).replace(/\n/g, '\n│ ') + '...');
      console.log('└────────────────────────────────────────────────────────────────┘');
      
      console.log('┌─ USER PROMPT (' + prompt.length + ' characters) ─┐');
      console.log('│ ' + prompt.substring(0, 300).replace(/\n/g, '\n│ ') + '...');
      console.log('└────────────────────────────────────────────────────────────────┘');

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
          systemInstruction: LABOR_COST_CALCULATOR_SYSTEM_PROMPT
        }
      };
      
      console.log('⚙️ REQUEST CONFIG:');
      console.log('  - Model:', requestConfig.model);
      console.log('  - Temperature:', requestConfig.config.temperature);
      console.log('  - TopP:', requestConfig.config.topP);
      console.log('  - TopK:', requestConfig.config.topK);
      console.log('  - Max Output Tokens:', requestConfig.config.maxOutputTokens);
      console.log('  - System Instruction length:', requestConfig.config.systemInstruction.length, 'characters');
      console.log('  - Contents length:', requestConfig.contents.length, 'characters');
      
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
      
      console.log('🔍 RESPONSE STRUCTURE ANALYSIS:');
      console.log('  - Response keys:', Object.keys(response));
      console.log('  - Response prototype:', Object.getPrototypeOf(response)?.constructor?.name || 'Unknown');
      
      if (response.usageMetadata) {
        console.log('📈 TOKEN USAGE:');
        console.log('  - Prompt tokens:', response.usageMetadata.promptTokenCount || 'N/A');
        console.log('  - Completion tokens:', response.usageMetadata.candidatesTokenCount || 'N/A');
        console.log('  - Total tokens:', response.usageMetadata.totalTokenCount || 'N/A');
        console.log('  - Cached tokens:', response.usageMetadata.cachedContentTokenCount || 'N/A');
      } else {
        console.log('⚠️ No usage metadata available in response');
      }

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
      console.log('📋 RAW RESPONSE PREVIEW:');
      console.log('┌─ FIRST 500 CHARACTERS ─┐');
      console.log('│ ' + (responseText?.substring(0, 500) || 'NO RESPONSE TEXT').replace(/\n/g, '\n│ ') + '...');
      console.log('└────────────────────────────┘');
      
      console.log('┌─ LAST 300 CHARACTERS ─┐');
      const lastChars = responseText ? responseText.substring(responseText.length - 300) : 'NO RESPONSE TEXT';
      console.log('│ ...' + lastChars.replace(/\n/g, '\n│ '));
      console.log('└───────────────────────────┘');
      
      console.log('');
      console.log('🔍 FULL RAW RESPONSE (for debugging):');
      console.log('================= RAW JSON RESULT FROM GEMINI =================');
      console.log(responseText);
      console.log('=================== END RAW JSON RESULT ===================');
      
      console.log('');
      console.log('🚀 STEP 5: RESPONSE PARSING & VALIDATION');
      console.log('🔄 Calling parseLaborCostResponse()...');
      
      const parsedResponse = this.parseLaborCostResponse(responseText);

      if (!parsedResponse) {
        console.error('');
        console.error('💥 ========== PARSE FAILURE ==========');
        console.error('❌ CRITICAL ERROR: Failed to parse labor cost response from Gemini API');
        console.error('🔍 Parsed response is null/undefined');
        console.error('📊 This indicates JSON parsing or validation failed');
        console.error('🔍 Returning raw response for manual inspection');
        console.error('💥 ===================================');
        console.error('');
        
        return {
          rawResponse: responseText,
          error: 'Failed to parse labor cost calculator response'
        };
      }
      
      console.log('✅ PARSE SUCCESS: Valid labor cost response received');
      console.log('');
      console.log('🚀 STEP 6: FINAL VALIDATION & COMPLETION');
      
      console.log('📊 FINAL ANALYSIS SUMMARY:');
      try {
        const summary = parsedResponse.laborModelOutput;
        console.log('  - Processing status:', summary?.processingLog?.overallProcessingStatus || 'N/A');
        console.log('  - Cast total:', summary?.cast?.castTotal || 'N/A');
        console.log('  - Crew total:', summary?.crew?.crewTotal || 'N/A');
        console.log('  - Labor grand total:', summary?.summary?.laborGrandTotal || 'N/A');
      } catch (summaryError) {
        console.log('  - Summary extraction failed:', summaryError.message);
        console.log('  - But analysis data is still complete');
      }

      console.log('');
      console.log('🎉 ========== LABOR COST ANALYSIS COMPLETE ==========');
      console.log('✅ Labor cost calculator analysis completed successfully!');
      console.log('📁 Parsed response ready for use in application');
      console.log('🎯 Analysis ready for display in UI');
      console.log('🎉 ==================================================');
      console.log('');
      
      return {
        result: parsedResponse,
        rawResponse: responseText
      };

    } catch (error) {
      console.log('');
      console.log('💥 ========== ERROR OCCURRED ==========');
      console.error('❌ Error in labor cost calculator analysis:', error);
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

  private parseLaborCostResponse(responseText: string): any | null {
    console.log('');
    console.log('🔍 ===== LABOR COST RESPONSE PARSING (RAW JSON) =====');
    console.log('📅 Parse timestamp:', new Date().toISOString());
    console.log('🔍 ====================================================');
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
      console.log('🚀 PARSE STEP 3: JSON PARSING (RAW - NO VALIDATION)');
      const parsed = JSON.parse(cleanedResponse);
      console.log('✅ JSON parsing successful!');
      console.log('📊 Returning raw JSON without any structure validation or transformation');
      console.log('🎯 Raw response keys:', Object.keys(parsed));
      
      return parsed;

    } catch (error) {
      console.error('❌ Error parsing labor cost response:', error);
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      console.error('Response length:', responseText.length);
      console.error('Response preview:', responseText.substring(0, 1000));
      
      return null;
    }
  }
}

// Export singleton instance
export const geminiLaborCostService = new GeminiLaborCostService();

// Export helper function
export const analyzeLaborCostWithAI = async (
  jsonInput: string,
  projectId: string,
  onProgress?: (status: string) => void
): Promise<{ status: 'completed' | 'error'; result?: LaborCostOutput; error?: string; rawResponse?: string }> => {
  console.log('');
  console.log('🎯 ===== LABOR COST AI HELPER FUNCTION CALLED =====');
  console.log('📅 TIMESTAMP:', new Date().toISOString());
  console.log('🆔 PROJECT_ID:', projectId);
  console.log('📊 FUNCTION: analyzeLaborCostWithAI()');
  console.log('🎯 =================================================');
  console.log('');
  
  try {
    console.log('🚀 HELPER: Starting labor cost calculator analysis...');
    console.log('📊 HELPER: Input JSON length:', jsonInput.length, 'characters');
    console.log('📊 HELPER: Project ID:', projectId);
    console.log('📊 HELPER: Progress callback provided:', !!onProgress);
    
    onProgress?.('Starting labor cost calculator analysis...');
    console.log('📢 HELPER: Progress callback called - Starting analysis');
    
    console.log('🔄 HELPER: Calling geminiLaborCostService.analyzeLaborCostData()...');
    const analysisResult = await geminiLaborCostService.analyzeLaborCostData(jsonInput, projectId);
    
    console.log('✅ HELPER: Analysis completed!');
    console.log('📊 HELPER: Result type:', typeof analysisResult);
    console.log('📊 HELPER: Has result:', !!analysisResult?.result);
    console.log('📊 HELPER: Has raw response:', !!analysisResult?.rawResponse);
    console.log('📊 HELPER: Has error:', !!analysisResult?.error);
    
    if (analysisResult?.result) {
      onProgress?.('Labor cost calculator completed successfully!');
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
    console.error('❌ HELPER: Labor cost analysis failed:', error);
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