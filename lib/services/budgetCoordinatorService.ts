import { GoogleGenAI } from "@google/genai";

// Budget Coordinator Output Types
export interface BudgetCoordinatorOutput {
  budgetCoordinatorOutput: {
    projectId: string;
    processingTimestamp: string;
    systemStatusReport: {
      intakeStatus: "SUCCESS" | "PARTIAL" | "FAILED";
      validationStatus: "PASS" | "CONDITIONAL" | "FAIL";
      dataCompleteness: number;
      missingInformation: string[];
      identifiedRisks: Array<{
        riskId: string;
        description: string;
        mitigation: string;
      }>;
    };
    modelDataPackets: {
      scheduleOptimizer: {
        model: string;
        priority: string;
        description: string;
        inputs: any;
      };
      laborCostCalculator: {
        model: string;
        priority: string;
        dependencies: string[];
        inputs: any;
      };
      equipmentPricingEngine: {
        model: string;
        priority: string;
        dependencies: string[];
        inputs: any;
      };
      locationCostEstimator: {
        model: string;
        priority: string;
        dependencies: string[];
        inputs: any;
      };
      insuranceCalculator: {
        model: string;
        priority: string;
        dependencies: string[];
        inputs: any;
      };
      postProductionEstimator: {
        model: string;
        priority: string;
        dependencies: string[];
        inputs: any;
      };
      taxIncentiveAnalyzer: {
        model: string;
        priority: string;
        dependencies: string[];
        inputs: any;
      };
      budgetAggregator: {
        model: string;
        priority: string;
        dependencies: string[];
        inputs: any;
      };
      cashFlowProjector: {
        model: string;
        priority: string;
        dependencies: string[];
        inputs: any;
      };
    };
  };
}

// System Prompt for Budget Coordinator
const BUDGET_COORDINATOR_SYSTEM_PROMPT = `
BUDGET COORDINATOR SYSTEM PROMPT
=====================================

You are the Budget Coordinator for a multi-model AI budget generation system for film productions. Your role is to orchestrate the flow of data between 9 specialized budget models to create comprehensive, accurate film budgets.

## Core Responsibilities

1. **Data Intake & Validation**
   - Process complete scene breakdowns with cast, locations, and special requirements
   - Validate input data completeness and flag missing critical information
   - Normalize data formats across all input categories

2. **Model Orchestration** 
   - Distribute relevant data packets to each of the 9 specialized models
   - Ensure proper sequencing (Schedule Optimizer runs first, then parallel execution)
   - Manage dependencies between models (equipment needs schedule, insurance needs equipment values)

3. **Data Flow Management**
   - Transform raw script data into model-specific input formats
   - Handle inter-model dependencies and feedback loops
   - Aggregate results from all models for final compilation

## Input Processing Protocol

When processing script breakdown data:

### Scene Analysis
- Extract location requirements, cast needs, special equipment
- Identify VFX shots, stunts, and complex production elements  
- Calculate estimated shooting days per location and cast member
- Flag high-risk or high-cost production elements

### Cast Categorization
- Classify performers: principals, supporting, day players, extras, stunt performers
- Calculate estimated shooting days per cast member
- Identify special makeup, costume, or training requirements
- Assess insurance risk factors (age, stunt work, international travel)

### Location Assessment
- Categorize locations: practical, studio, stage construction required
- Estimate prep days, shooting days, and restoration requirements
- Identify permit requirements, security needs, and logistical challenges
- Calculate travel and accommodation needs for cast and crew

### Technical Requirements
- Inventory special equipment needs (cranes, specialized rigs, etc.)
- Identify VFX supervision requirements and complexity levels
- Catalog practical effects, stunts, and safety requirements
- Assess post-production complexity based on genre and technical demands

## Model Distribution Strategy

### Schedule Optimizer (First Priority)
- Provide complete scene breakdown with cast availability constraints
- Include location restrictions and equipment dependencies
- Supply union rules, meal penalty thresholds, and turnaround requirements

### Parallel Execution Models (After Schedule)
- **Labor Cost Calculator**: Cast breakdown, shooting schedule, location jurisdiction
- **Equipment Pricing Engine**: Technical requirements, shooting schedule, vendor tier
- **Location Cost Estimator**: Location details, shooting schedule, permit requirements  
- **Insurance Calculator**: Cast details, equipment values, risk assessment factors
- **Post-Production Estimator**: Genre, runtime, VFX complexity, delivery requirements
- **Tax Incentive Analyzer**: Budget breakdown, shooting locations, crew residency

### Final Compilation Models
- **Budget Aggregator**: All department costs, schedule optimization results
- **Cash Flow Projector**: Aggregated budget, production timeline, funding sources

## Quality Control Standards

- Verify all scene counts and page counts match source material
- Ensure cast member scene counts are accurate across all appearances
- Validate location day counts against scheduling constraints
- Cross-reference special requirements across multiple models
- Flag any data inconsistencies or missing critical information

## MANDATORY OUTPUT FORMAT REQUIREMENTS

**CRITICAL: Every response MUST be a complete, valid JSON object following this exact structure:**

\`\`\`json
{
  "budgetCoordinatorOutput": {
    "projectId": "string",
    "processingTimestamp": "ISO_timestamp",
    "systemStatusReport": {
      "intakeStatus": "SUCCESS|PARTIAL|FAILED",
      "validationStatus": "PASS|CONDITIONAL|FAIL", 
      "dataCompleteness": "percentage",
      "missingInformation": ["array_of_missing_items"],
      "identifiedRisks": [
        {
          "riskId": "string",
          "description": "string", 
          "mitigation": "string"
        }
      ]
    },
    "modelDataPackets": {
      "scheduleOptimizer": {
        "model": "Schedule Optimizer",
        "priority": "FIRST",
        "description": "string",
        "inputs": { "structured_input_data": "value" }
      },
      "laborCostCalculator": {
        "model": "Labor Cost Calculator", 
        "priority": "PARALLEL",
        "dependencies": ["array_of_model_names"],
        "inputs": { "structured_input_data": "value" }
      },
      "equipmentPricingEngine": { "similar_structure": true },
      "locationCostEstimator": { "similar_structure": true },
      "insuranceCalculator": { "similar_structure": true },
      "postProductionEstimator": { "similar_structure": true },
      "taxIncentiveAnalyzer": { "similar_structure": true },
      "budgetAggregator": {
        "priority": "FINAL_COMPILATION",
        "dependencies": ["all_parallel_models"]
      },
      "cashFlowProjector": {
        "priority": "FINAL_COMPILATION", 
        "dependencies": ["budgetAggregator", "scheduleOptimizer"]
      }
    }
  }
}
\`\`\`

**NEVER provide text responses, explanations, or incomplete JSON. Always return the complete structured JSON object above with all required fields populated.**

## Risk Assessment Integration

Continuously evaluate and flag:
- Schedule compression risks
- Cast availability conflicts  
- Location access limitations
- Technical feasibility concerns
- Budget constraint violations
- Union compliance issues

## Success Metrics

- Data processing accuracy: >95%
- Model input completeness: 100%
- Inter-model dependency resolution: 100%
- Budget variance from industry standards: <10%
- Schedule feasibility score: >90%

Your role is critical to the success of the entire budget generation pipeline. Ensure data accuracy, maintain model coordination, and provide clear risk assessment throughout the process.
`;

class GeminiBudgetCoordinatorService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: "AIzaSyABISxaNzifdIcZUCe408LoKnEz0bia8cI"
    });
  }

  async analyzeBudgetData(jsonInput: string, projectId: string): Promise<BudgetCoordinatorOutput> {
    console.log('');
    console.log('💰 ===== BUDGET COORDINATOR ANALYSIS STARTING =====');
    console.log('📅 TIMESTAMP:', new Date().toISOString());
    console.log('🆔 PROJECT_ID:', projectId);
    console.log('📊 METHOD: analyzeBudgetData()');
    console.log('💰 ==================================================');
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
Please analyze this budget coordination data and provide a complete budget coordinator response following the required JSON format:

BUDGET COORDINATION DATA:
${jsonInput}

PROJECT ID: ${projectId}

Remember to return ONLY the complete JSON object with all required fields populated according to the specified schema.
`;

      console.log('📊 PROMPT STATS:');
      console.log('  - User prompt length:', prompt.length, 'characters');
      console.log('  - System prompt length:', BUDGET_COORDINATOR_SYSTEM_PROMPT.length, 'characters');
      console.log('  - Total prompt length:', prompt.length + BUDGET_COORDINATOR_SYSTEM_PROMPT.length, 'characters');
      console.log('  - Estimated tokens (~4 chars/token):', Math.ceil((prompt.length + BUDGET_COORDINATOR_SYSTEM_PROMPT.length) / 4));
      
      console.log('📤 PROMPT DETAILS:');
      console.log('┌─ SYSTEM INSTRUCTION (' + BUDGET_COORDINATOR_SYSTEM_PROMPT.length + ' characters) ─┐');
      console.log('│ ' + BUDGET_COORDINATOR_SYSTEM_PROMPT.substring(0, 200).replace(/\n/g, '\n│ ') + '...');
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
          systemInstruction: BUDGET_COORDINATOR_SYSTEM_PROMPT
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
      console.log('🔄 Calling parseBudgetResponse()...');
      
      const parsedResponse = this.parseBudgetResponse(responseText);

      if (!parsedResponse) {
        console.error('');
        console.error('💥 ========== PARSE FAILURE ==========');
        console.error('❌ CRITICAL ERROR: Failed to parse budget response from Gemini API');
        console.error('🔍 Parsed response is null/undefined');
        console.error('📊 This indicates JSON parsing or validation failed');
        console.error('💥 ===================================');
        console.error('');
        throw new Error('Failed to parse budget coordinator response');
      }
      
      console.log('✅ PARSE SUCCESS: Valid budget response received');
      console.log('');
      console.log('🚀 STEP 6: FINAL VALIDATION & COMPLETION');
      
      console.log('📊 FINAL ANALYSIS SUMMARY:');
      try {
        const summary = parsedResponse.budgetCoordinatorOutput;
        console.log('  - Project ID:', summary?.projectId || 'N/A');
        console.log('  - Processing timestamp:', summary?.processingTimestamp || 'N/A');
        console.log('  - Intake status:', summary?.systemStatusReport?.intakeStatus || 'N/A');
        console.log('  - Validation status:', summary?.systemStatusReport?.validationStatus || 'N/A');
        console.log('  - Data completeness:', summary?.systemStatusReport?.dataCompleteness || 'N/A', '%');
        console.log('  - Missing information count:', summary?.systemStatusReport?.missingInformation?.length || 'N/A');
        console.log('  - Identified risks count:', summary?.systemStatusReport?.identifiedRisks?.length || 'N/A');
        console.log('  - Model data packets count:', Object.keys(summary?.modelDataPackets || {}).length || 'N/A');
      } catch (summaryError) {
        console.log('  - Summary extraction failed:', summaryError.message);
        console.log('  - But analysis data is still complete');
      }

      console.log('');
      console.log('🎉 ========== BUDGET ANALYSIS COMPLETE ==========');
      console.log('✅ Budget coordinator analysis completed successfully!');
      console.log('📁 Parsed response ready for use in application');
      console.log('🎯 Analysis ready for display in UI');
      console.log('🎉 ===============================================');
      console.log('');
      
      return parsedResponse;

    } catch (error) {
      console.log('');
      console.log('💥 ========== ERROR OCCURRED ==========');
      console.error('❌ Error in budget coordinator analysis:', error);
      console.error('🔍 Error type:', error?.name || 'Unknown');
      console.error('🔍 Error message:', error?.message || 'No message');
      
      if (error?.stack) {
        console.error('📚 Error stack trace:');
        console.error(error.stack);
      }
      
      console.log('💥 ====================================');
      console.log('');
      throw error;
    }
  }

  private parseBudgetResponse(responseText: string): BudgetCoordinatorOutput | null {
    console.log('');
    console.log('🔍 ===== BUDGET RESPONSE PARSING & VALIDATION =====');
    console.log('📅 Parse timestamp:', new Date().toISOString());
    console.log('🔍 ==================================================');
    console.log('');
    
    try {
      console.log('🚀 PARSE STEP 1: INPUT ANALYSIS');
      console.log('📏 Response text length:', responseText?.length || 0, 'characters');
      console.log('📊 Response text type:', typeof responseText);
      console.log('🔍 Is null/undefined?', responseText == null ? '❌ YES' : '✅ NO');
      console.log('🔍 Is empty string?', responseText === '' ? '❌ YES' : '✅ NO');
      
      if (!responseText) {
        console.error('❌ PARSE FAILED: Response text is null, undefined, or empty');
        return null;
      }
      
      console.log('');
      console.log('📋 RESPONSE CONTENT PREVIEW:');
      console.log('┌─ FIRST 500 CHARACTERS ─┐');
      console.log('│ ' + responseText.substring(0, 500).replace(/\n/g, '\n│ '));
      console.log('└────────────────────────────┘');
      
      console.log('┌─ LAST 500 CHARACTERS ─┐');
      console.log('│ ' + responseText.substring(responseText.length - 500).replace(/\n/g, '\n│ '));
      console.log('└───────────────────────────┘');
      
      console.log('');
      console.log('🚀 PARSE STEP 2: JSON EXTRACTION & CLEANING');
      
      // Clean response text
      let cleanedResponse = responseText;
      console.log('📝 Original response length:', cleanedResponse.length, 'characters');
      
      console.log('🧹 Removing markdown code blocks...');
      const beforeMarkdown = cleanedResponse.length;
      cleanedResponse = cleanedResponse
        .replace(/```json\s*\n?/g, '')
        .replace(/```\s*\n?/g, '')
        .trim();
      console.log('📊 After markdown removal:', cleanedResponse.length, 'characters', `(${beforeMarkdown - cleanedResponse.length} removed)`);

      console.log('🔍 Looking for JSON boundaries...');
      // Extract JSON if embedded in thinking mode response
      const jsonStart = cleanedResponse.indexOf('{');
      const jsonEnd = cleanedResponse.lastIndexOf('}') + 1;
      
      console.log('📍 JSON start position:', jsonStart);
      console.log('📍 JSON end position:', jsonEnd);
      console.log('📏 JSON boundary span:', jsonEnd - jsonStart, 'characters');

      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        const beforeExtraction = cleanedResponse.length;
        cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd);
        console.log('✅ JSON extracted successfully');
        console.log('📊 Extracted JSON length:', cleanedResponse.length, 'characters', `(${beforeExtraction - cleanedResponse.length} discarded)`);
        
        console.log('📋 Extracted JSON preview:');
        console.log('┌─ FIRST 200 CHARACTERS ─┐');
        console.log('│ ' + cleanedResponse.substring(0, 200).replace(/\n/g, '\n│ ') + '...');
        console.log('└────────────────────────────┘');
      } else {
        console.log('⚠️ No clear JSON boundaries found, using full cleaned response');
      }

      console.log('');
      console.log('🚀 PARSE STEP 3: JSON PARSING');
      console.log('📊 Final cleaned response length:', cleanedResponse.length, 'characters');
      console.log('🔄 Attempting JSON.parse()...');

      const parsed = JSON.parse(cleanedResponse);
      console.log('✅ JSON parsing successful!');
      
      console.log('');
      console.log('🚀 PARSE STEP 4: PARSED OBJECT ANALYSIS');
      console.log('📊 Parsed object type:', typeof parsed);
      console.log('🔍 Parsed object keys:', Object.keys(parsed));
      
      console.log('📋 PARSED JSON STRUCTURE (preview):');
      try {
        const jsonPreview = JSON.stringify(parsed, null, 2);
        console.log('┌─ PARSED JSON (first 1000 chars) ─┐');
        console.log('│ ' + jsonPreview.substring(0, 1000).replace(/\n/g, '\n│ ') + '...');
        console.log('└──────────────────────────────────────┘');
      } catch (previewError) {
        console.log('⚠️ Could not create JSON preview:', previewError.message);
        console.log('📋 Raw parsed object:', parsed);
      }
      
      console.log('');
      console.log('🚀 PARSE STEP 5: STRUCTURE VALIDATION');
      console.log('🔍 Validating against BudgetCoordinatorOutput format...');
      
      console.log('🔎 Checking for budgetCoordinatorOutput property...');
      const hasBudgetOutput = parsed.budgetCoordinatorOutput !== undefined;
      console.log('  - budgetCoordinatorOutput exists:', hasBudgetOutput ? '✅ YES' : '❌ NO');
      
      if (!hasBudgetOutput) {
        console.error('❌ VALIDATION FAILED: Missing budgetCoordinatorOutput property');
        console.error('🔍 Available top-level keys:', Object.keys(parsed));
        return null;
      }
      
      console.log('🔎 Checking budgetCoordinatorOutput structure...');
      const budgetOutput = parsed.budgetCoordinatorOutput;
      console.log('  - budgetCoordinatorOutput type:', typeof budgetOutput);
      console.log('  - budgetCoordinatorOutput keys:', Object.keys(budgetOutput));
      
      console.log('🔎 Checking required properties...');
      const hasProjectId = budgetOutput.projectId !== undefined;
      const hasModelDataPackets = budgetOutput.modelDataPackets !== undefined;
      
      console.log('  - projectId exists:', hasProjectId ? '✅ YES' : '❌ NO');
      console.log('  - modelDataPackets exists:', hasModelDataPackets ? '✅ YES' : '❌ NO');

      // Validate structure
      if (parsed.budgetCoordinatorOutput && 
          parsed.budgetCoordinatorOutput.projectId &&
          parsed.budgetCoordinatorOutput.modelDataPackets) {
        
        console.log('');
        console.log('✅ VALIDATION SUCCESS!');
        console.log('🎉 Correct BudgetCoordinatorOutput structure found');
        console.log('📊 Final validation stats:');
        console.log('  - Project ID:', parsed.budgetCoordinatorOutput.projectId);
        console.log('  - Model data packets included:', !!parsed.budgetCoordinatorOutput.modelDataPackets);
        console.log('  - Structure matches expected format: ✅ YES');
        console.log('  - Ready for return: ✅ YES');
        
        return parsed as BudgetCoordinatorOutput;
      }

      console.error('❌ VALIDATION FAILED: Structure validation failed');
      console.error('🔍 Missing required properties');
      return null;

    } catch (error) {
      console.error('❌ Error parsing budget response:', error);
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      console.error('Response length:', responseText.length);
      console.error('Response preview:', responseText.substring(0, 1000));
      console.error('Response end:', responseText.substring(responseText.length - 1000));
      
      // Try to find any JSON-like structure in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log('Found potential JSON structure, attempting to parse:');
        try {
          const extracted = jsonMatch[0];
          const parsed = JSON.parse(extracted);
          console.log('✅ Successfully parsed extracted JSON!');
          return parsed as BudgetCoordinatorOutput;
        } catch (e) {
          console.error('❌ Failed to parse extracted JSON:', e);
        }
      }
      
      return null;
    }
  }
}

// Export singleton instance
export const geminiBudgetCoordinatorService = new GeminiBudgetCoordinatorService();

// Export helper function
export const analyzeBudgetCoordinatorWithAI = async (
  jsonInput: string,
  projectId: string,
  onProgress?: (status: string) => void
): Promise<{ status: 'completed' | 'error'; result?: BudgetCoordinatorOutput; error?: string }> => {
  console.log('');
  console.log('🎯 ===== BUDGET COORDINATOR AI HELPER FUNCTION CALLED =====');
  console.log('📅 TIMESTAMP:', new Date().toISOString());
  console.log('🆔 PROJECT_ID:', projectId);
  console.log('📊 FUNCTION: analyzeBudgetCoordinatorWithAI()');
  console.log('🎯 =========================================================');
  console.log('');
  
  try {
    console.log('🚀 HELPER: Starting budget coordinator analysis...');
    console.log('📊 HELPER: Input JSON length:', jsonInput.length, 'characters');
    console.log('📊 HELPER: Project ID:', projectId);
    console.log('📊 HELPER: Progress callback provided:', !!onProgress);
    
    onProgress?.('Starting budget coordinator analysis...');
    console.log('📢 HELPER: Progress callback called - Starting analysis');
    
    console.log('🔄 HELPER: Calling geminiBudgetCoordinatorService.analyzeBudgetData()...');
    const result = await geminiBudgetCoordinatorService.analyzeBudgetData(jsonInput, projectId);
    
    console.log('✅ HELPER: Analysis completed successfully!');
    console.log('📊 HELPER: Result type:', typeof result);
    console.log('📊 HELPER: Result has budgetCoordinatorOutput:', !!result?.budgetCoordinatorOutput);
    
    onProgress?.('Budget coordinator completed successfully!');
    console.log('📢 HELPER: Progress callback called - Analysis completed');
    
    console.log('');
    console.log('🎉 HELPER: Returning success result');
    return {
      status: 'completed',
      result
    };
    
  } catch (error) {
    console.log('');
    console.log('💥 ========== HELPER ERROR OCCURRED ==========');
    console.error('❌ HELPER: Budget coordinator analysis failed:', error);
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