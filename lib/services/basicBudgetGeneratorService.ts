import { GoogleGenAI } from "@google/genai";

// Basic Budget Generator Output Types
export interface BasicBudgetOutput {
  basicBudgetOutput: {
    projectId: string;
    processingTimestamp: string;
    budgetSummary: {
      totalBudget: number;
      budgetRange: {
        low: number;
        high: number;
      };
      shootDays: number;
      currency: string;
    };
    budgetCategories: {
      aboveTheLine: {
        director: number;
        producer: number;
        keyCast: number;
        subtotal: number;
      };
      belowTheLine: {
        crew: number;
        equipment: number;
        locations: number;
        cast: number;
        postProduction: number;
        subtotal: number;
      };
      otherCosts: {
        insurance: number;
        contingency: number;
        subtotal: number;
      };
    };
    budgetBreakdown: Array<{
      category: string;
      amount: number;
      percentage: number;
      description: string;
    }>;
    recommendations: Array<{
      category: string;
      suggestion: string;
      impact: "low" | "medium" | "high";
    }>;
  };
}

// System Prompt for Basic Budget Generator
const BASIC_BUDGET_GENERATOR_SYSTEM_PROMPT = `
BASIC BUDGET GENERATOR SYSTEM PROMPT
===================================

You are a Basic Budget Generator AI for film productions. Your role is to create essential, realistic budget estimates based on script analysis and production scheduling data.

## Core Responsibilities

1. **Generate Essential Budget Categories**
   - Above-the-Line: Director, Producer, Key Cast
   - Below-the-Line: Crew, Equipment, Locations, Cast, Post-Production  
   - Other Costs: Insurance, Contingency

2. **Use Production Data**
   - Analyze shoot days and crew requirements from scheduling
   - Factor in cast work days and requirements
   - Consider location complexity and setup costs
   - Account for equipment rental schedules

3. **Industry-Standard Estimates**
   - Use realistic industry rates and standards
   - Provide budget ranges (low/high estimates)
   - Calculate appropriate contingency (10-15%)
   - Include insurance estimates (2-3% of total)

## Budget Calculation Guidelines

### Above-the-Line (15-25% of total budget)
- **Director**: Based on film scale and experience level
- **Producer**: Executive and line producer fees
- **Key Cast**: Principal actors based on work days and scale

### Below-the-Line (60-75% of total budget)
- **Crew**: Daily rates × crew size × shoot days
- **Equipment**: Rental costs from equipment schedule
- **Locations**: Fees, permits, construction from location data
- **Cast**: Supporting cast and extras based on schedule
- **Post-Production**: Editing, sound, color, VFX estimates

### Other Costs (10-20% of total budget)
- **Insurance**: 2-3% of total production value
- **Contingency**: 10-15% buffer for overruns

## Input Data Processing

When analyzing script and scheduling data:

### Script Analysis Integration
- Use scene count for complexity assessment
- Factor character count for cast requirements
- Consider location variety for cost estimation
- Assess technical requirements from scene content

### Scheduling Data Integration
- Use actual shoot days (not estimates)
- Factor crew size variations by day
- Include equipment rental periods
- Account for location setup and strike days

### Cost Estimation Factors
- Film genre and scale (indie vs studio)
- Location type (studio vs practical vs remote)
- Technical complexity (VFX, stunts, special equipment)
- Union vs non-union considerations

## MANDATORY OUTPUT FORMAT

**CRITICAL: Every response MUST be a complete, valid JSON object following this exact structure:**

\`\`\`json
{
  "basicBudgetOutput": {
    "projectId": "string",
    "processingTimestamp": "ISO_timestamp",
    "budgetSummary": {
      "totalBudget": "number",
      "budgetRange": {
        "low": "number", 
        "high": "number"
      },
      "shootDays": "number",
      "currency": "USD"
    },
    "budgetCategories": {
      "aboveTheLine": {
        "director": "number",
        "producer": "number", 
        "keyCast": "number",
        "subtotal": "number"
      },
      "belowTheLine": {
        "crew": "number",
        "equipment": "number",
        "locations": "number", 
        "cast": "number",
        "postProduction": "number",
        "subtotal": "number"
      },
      "otherCosts": {
        "insurance": "number",
        "contingency": "number",
        "subtotal": "number"
      }
    },
    "budgetBreakdown": [
      {
        "category": "string",
        "amount": "number",
        "percentage": "number",
        "description": "string"
      }
    ],
    "recommendations": [
      {
        "category": "string", 
        "suggestion": "string",
        "impact": "low|medium|high"
      }
    ]
  }
}
\`\`\`

**NEVER provide text responses, explanations, or incomplete JSON. Always return the complete structured JSON object above with all required fields populated with realistic numbers.**

## Quality Standards

- All budget figures must be realistic and industry-appropriate
- Percentages should add up to 100% of total budget
- Contingency should be 10-15% of production costs
- Insurance should be 2-3% of total budget value
- Provide both conservative (low) and optimistic (high) estimates

Your role is to provide essential, actionable budget information that production teams can use for planning and financing decisions.
`;

class GeminiBasicBudgetGeneratorService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: "AIzaSyABISxaNzifdIcZUCe408LoKnEz0bia8cI"
    });
  }

  async generateBasicBudget(
    scriptData: any, 
    schedulingData: any, 
    projectId: string
  ): Promise<BasicBudgetOutput> {
    console.log('');
    console.log('💰 ===== BASIC BUDGET GENERATOR STARTING =====');
    console.log('📅 TIMESTAMP:', new Date().toISOString());
    console.log('🆔 PROJECT_ID:', projectId);
    console.log('📊 METHOD: generateBasicBudget()');
    console.log('💰 ============================================');
    console.log('');
    
    try {
      console.log('🚀 STEP 1: INPUT VALIDATION & PROCESSING');
      console.log('📝 Script data type:', typeof scriptData);
      console.log('📝 Scheduling data type:', typeof schedulingData);
      console.log('🔍 Project ID:', projectId);
      
      // Validate inputs
      if (!scriptData || !schedulingData) {
        throw new Error('Script data and scheduling data are required');
      }

      // Combine input data
      const combinedInput = {
        projectId,
        scriptAnalysis: scriptData,
        schedulingData: schedulingData,
        timestamp: new Date().toISOString()
      };

      const jsonInput = JSON.stringify(combinedInput, null, 2);
      
      console.log('📊 Combined input length:', jsonInput.length, 'characters');
      console.log('📋 Input preview (first 300 chars):');
      console.log('┌─────────────────────────────────────────────────────────────┐');
      console.log('│ ' + jsonInput.substring(0, 300).replace(/\n/g, '\n│ ') + '...');
      console.log('└─────────────────────────────────────────────────────────────┘');

      console.log('');
      console.log('🚀 STEP 2: PROMPT PREPARATION');
      
      const prompt = `
Please analyze this film production data and generate a basic budget estimate following the required JSON format:

PRODUCTION DATA:
${jsonInput}

Generate realistic budget estimates based on:
- Script complexity and requirements
- Production schedule and shoot days  
- Cast and crew requirements
- Location and equipment needs
- Industry-standard rates and practices

Return ONLY the complete JSON object with all required budget categories and realistic cost estimates.
`;

      console.log('📊 Prompt length:', prompt.length, 'characters');
      console.log('📊 System prompt length:', BASIC_BUDGET_GENERATOR_SYSTEM_PROMPT.length, 'characters');

      console.log('');
      console.log('🌐 MAKING API CALL TO GEMINI...');
      
      const startTime = performance.now();

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192,
          systemInstruction: BASIC_BUDGET_GENERATOR_SYSTEM_PROMPT
        }
      });

      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      console.log('');
      console.log('🚀 STEP 3: API RESPONSE RECEIVED');
      console.log('⏰ Response time:', responseTime, 'ms');
      
      if (response.usageMetadata) {
        console.log('📈 TOKEN USAGE:');
        console.log('  - Prompt tokens:', response.usageMetadata.promptTokenCount || 'N/A');
        console.log('  - Completion tokens:', response.usageMetadata.candidatesTokenCount || 'N/A');
        console.log('  - Total tokens:', response.usageMetadata.totalTokenCount || 'N/A');
      }

      const responseText = response.text;
      console.log('📏 Response text length:', responseText?.length || 0, 'characters');

      if (!responseText) {
        throw new Error('No response text received from Gemini API');
      }

      console.log('');
      console.log('🔍 RAW RESPONSE:');
      console.log('================= RAW JSON RESULT FROM GEMINI =================');
      console.log(responseText);
      console.log('=================== END RAW JSON RESULT ===================');

      console.log('');
      console.log('🚀 STEP 4: RESPONSE PARSING & VALIDATION');
      
      const parsedResponse = this.parseBudgetResponse(responseText);

      if (!parsedResponse) {
        throw new Error('Failed to parse basic budget response');
      }
      
      console.log('✅ PARSE SUCCESS: Valid budget response received');
      console.log('');
      console.log('🎉 ========== BASIC BUDGET GENERATION COMPLETE ==========');
      console.log('✅ Basic budget generation completed successfully!');
      console.log('📊 Total budget:', parsedResponse.basicBudgetOutput?.budgetSummary?.totalBudget || 'N/A');
      console.log('📅 Shoot days:', parsedResponse.basicBudgetOutput?.budgetSummary?.shootDays || 'N/A');
      console.log('🎉 =======================================================');
      console.log('');
      
      return parsedResponse;

    } catch (error) {
      console.log('');
      console.log('💥 ========== ERROR OCCURRED ==========');
      console.error('❌ Error in basic budget generation:', error);
      console.error('🔍 Error type:', error?.name || 'Unknown');
      console.error('🔍 Error message:', error?.message || 'No message');
      console.log('💥 ====================================');
      console.log('');
      throw error;
    }
  }

  private parseBudgetResponse(responseText: string): BasicBudgetOutput | null {
    console.log('');
    console.log('🔍 ===== BUDGET RESPONSE PARSING =====');
    console.log('📏 Response length:', responseText?.length || 0, 'characters');
    console.log('');
    
    try {
      if (!responseText) {
        console.error('❌ Response text is null or empty');
        return null;
      }
      
      // Clean response text - remove markdown and extract JSON
      let cleanedResponse = responseText
        .replace(/```json\s*\n?/g, '')
        .replace(/```\s*\n?/g, '')
        .trim();

      // Extract JSON if embedded in text
      const jsonStart = cleanedResponse.indexOf('{');
      const jsonEnd = cleanedResponse.lastIndexOf('}') + 1;
      
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd);
      }

      console.log('📊 Cleaned response length:', cleanedResponse.length, 'characters');
      console.log('🔄 Attempting JSON parse...');

      const parsed = JSON.parse(cleanedResponse);
      console.log('✅ JSON parsing successful!');
      
      // Validate structure
      if (parsed.basicBudgetOutput && 
          parsed.basicBudgetOutput.projectId &&
          parsed.basicBudgetOutput.budgetSummary &&
          parsed.basicBudgetOutput.budgetCategories) {
        
        console.log('✅ Structure validation successful!');
        console.log('📊 Project ID:', parsed.basicBudgetOutput.projectId);
        console.log('📊 Total budget:', parsed.basicBudgetOutput.budgetSummary.totalBudget);
        
        return parsed as BasicBudgetOutput;
      }

      console.error('❌ Structure validation failed');
      return null;

    } catch (error) {
      console.error('❌ Error parsing budget response:', error);
      console.error('📋 Response preview:', responseText?.substring(0, 500));
      return null;
    }
  }
}

// Export singleton instance
export const geminiBasicBudgetGeneratorService = new GeminiBasicBudgetGeneratorService();

// Export helper function
export const generateBasicBudgetWithAI = async (
  scriptData: any,
  schedulingData: any,
  projectId: string,
  onProgress?: (status: string) => void
): Promise<{ status: 'completed' | 'error'; result?: BasicBudgetOutput; error?: string }> => {
  console.log('');
  console.log('🎯 ===== BASIC BUDGET AI HELPER FUNCTION CALLED =====');
  console.log('📅 TIMESTAMP:', new Date().toISOString());
  console.log('🆔 PROJECT_ID:', projectId);
  console.log('🎯 ====================================================');
  console.log('');
  
  try {
    console.log('🚀 HELPER: Starting basic budget generation...');
    
    onProgress?.('Analyzing script and scheduling data...');
    console.log('📢 Progress: Analyzing data');
    
    onProgress?.('Generating budget estimates...');
    console.log('📢 Progress: Generating estimates');
    
    const result = await geminiBasicBudgetGeneratorService.generateBasicBudget(
      scriptData, 
      schedulingData, 
      projectId
    );
    
    console.log('✅ HELPER: Budget generation completed successfully!');
    
    onProgress?.('Basic budget completed successfully!');
    console.log('📢 Progress: Completed');
    
    return {
      status: 'completed',
      result
    };
    
  } catch (error) {
    console.error('❌ HELPER: Basic budget generation failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return {
      status: 'error',
      error: errorMessage
    };
  }
};