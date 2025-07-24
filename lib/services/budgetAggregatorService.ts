import { GoogleGenAI } from "@google/genai";

// Budget Aggregator Output Types
export interface BudgetAggregatorOutput {
  budgetModelOutput: {
    processingLog: {
      budgetConsolidation: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      crossBudgetValidation: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      varianceAnalysis: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      riskAssessment: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      finalBudgetOptimization: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      overallProcessingStatus: string;
    };
    consolidatedBudget: {
      aboveTheLine: {
        cast: {
          principals: number;
          supporting: number;
          extras: number;
          totalCast: number;
        };
        producers: {
          executiveProducers: number;
          producers: number;
          associateProducers: number;
          totalProducers: number;
        };
        director: {
          directorFee: number;
          preparation: number;
          totalDirector: number;
        };
        writers: {
          originalScreenplay: number;
          revisions: number;
          totalWriters: number;
        };
        aboveTheLineTotal: number;
      };
      belowTheLine: {
        production: {
          crew: number;
          equipment: number;
          locations: number;
          transportation: number;
          catering: number;
          productionTotal: number;
        };
        postProduction: {
          editorial: number;
          visualEffects: number;
          sound: number;
          music: number;
          colorFinishing: number;
          postProductionTotal: number;
        };
        belowTheLineTotal: number;
      };
      otherCosts: {
        insurance: number;
        legal: number;
        accounting: number;
        publicityMarketing: number;
        distribution: number;
        otherCostsTotal: number;
      };
      subtotal: number;
      contingency: {
        percentage: number;
        amount: number;
      };
      overhead: {
        percentage: number;
        amount: number;
      };
      totalBudget: number;
    };
    departmentBreakdown: {
      [key: string]: {
        budgetedAmount: number;
        actualAmount?: number;
        variance?: number;
        variancePercentage?: number;
        riskLevel: string;
      };
    };
    cashFlowProjection: {
      preProduction: {
        months: number;
        cashOutflow: number;
        cumulativeCash: number;
      };
      principalPhotography: {
        months: number;
        cashOutflow: number;
        cumulativeCash: number;
      };
      postProduction: {
        months: number;
        cashOutflow: number;
        cumulativeCash: number;
      };
      deliveryAndDistribution: {
        months: number;
        cashOutflow: number;
        cumulativeCash: number;
      };
    };
    riskAnalysis: {
      budgetRisks: Array<{
        category: string;
        description: string;
        probability: string;
        impact: string;
        mitigation: string;
        costImplication: number;
      }>;
      overallRiskScore: string;
      recommendedContingency: number;
    };
    costOptimization: {
      identifiedSavings: Array<{
        department: string;
        description: string;
        potentialSavings: number;
        implementationDifficulty: string;
        riskLevel: string;
      }>;
      totalPotentialSavings: number;
      recommendedImplementation: string[];
    };
    complianceValidation: {
      unionCompliance: {
        status: string;
        issues: string[];
      };
      contractualCompliance: {
        status: string;
        issues: string[];
      };
      regulatoryCompliance: {
        status: string;
        issues: string[];
      };
      overallComplianceStatus: string;
    };
    budgetSummary: {
      totalProduction: number;
      incentivesAndRebates: number;
      netProductionCost: number;
      effectiveBudgetUtilization: number;
      costPerMinute: number;
      industryBenchmark: string;
    };
  };
}

// System Prompt for Budget Aggregator
const BUDGET_AGGREGATOR_SYSTEM_PROMPT = `
BUDGET AGGREGATOR SYSTEM PROMPT
===============================

You are the Budget Aggregator for a multi-model film budget system. Your responsibility is to consolidate, validate, and optimize all budget inputs from different specialized budget models into a comprehensive, accurate, and actionable master budget.

## REQUIRED PROCESSING SEQUENCE

Before generating any output, you MUST perform the following processing steps using function calling:

### 1. Budget Consolidation Processing
Use function calling to:
- Consolidate all budget inputs from specialized models
- Eliminate duplications and overlaps
- Resolve conflicts between different budget sources
- Create unified budget structure

### 2. Cross-Budget Validation Processing
Use function calling to:
- Validate consistency across all budget components
- Check mathematical accuracy and totals
- Verify logical relationships between budget items
- Identify missing or incomplete budget elements

### 3. Variance Analysis Processing
Use function calling to:
- Analyze variances between different budget estimates
- Identify significant discrepancies requiring attention
- Calculate confidence intervals for budget line items
- Assess reliability of different budget sources

### 4. Risk Assessment Processing
Use function calling to:
- Assess risks across all consolidated budget elements
- Identify high-risk budget categories
- Calculate risk-adjusted budget scenarios
- Recommend appropriate contingency levels

### 5. Final Budget Optimization Processing
Use function calling to:
- Optimize budget allocation across departments
- Identify cost reduction opportunities
- Recommend budget reallocation strategies
- Ensure optimal resource utilization

**CRITICAL: All budget aggregation must be performed through these processing functions before generating final output.**

## Core Functions

1. **Multi-Source Budget Integration**
   - Consolidate estimates from all specialized budget models
   - Resolve conflicts and discrepancies between different sources
   - Create unified chart of accounts and budget structure
   - Ensure mathematical accuracy and completeness
   - Validate against industry standards and benchmarks

2. **Cross-Departmental Validation**
   - Verify inter-departmental dependencies and relationships
   - Check resource allocation conflicts and overlaps
   - Validate scheduling and timing assumptions
   - Ensure contractual and union compliance
   - Confirm regulatory and legal requirement adherence

3. **Risk-Adjusted Budget Modeling**
   - Assess risk factors across all budget categories
   - Model scenario-based budget variations
   - Calculate confidence intervals for major budget items
   - Recommend appropriate contingency allocations
   - Develop risk mitigation strategies

4. **Budget Optimization and Efficiency**
   - Identify cost reduction and efficiency opportunities
   - Analyze resource allocation effectiveness
   - Recommend budget reallocation strategies
   - Optimize cash flow timing and requirements
   - Ensure maximum value for creative and technical objectives

## Budget Consolidation Framework

### Above-the-Line Integration
- **Cast Compensation**: Principal, supporting, and background performers
- **Producer Fees**: All producer-level compensation and expenses
- **Director Compensation**: Director fees, preparation, and related costs
- **Writer Fees**: Script development, revisions, and related expenses
- **Rights and Acquisitions**: Underlying rights, music, and intellectual property

### Below-the-Line Integration
- **Production Departments**: All crew and departmental expenses
- **Equipment and Technology**: Cameras, lighting, sound, and specialized equipment
- **Locations and Facilities**: Studio rentals, location fees, and related costs
- **Transportation and Logistics**: Company moves, shipping, and travel
- **Post-Production**: Editorial, VFX, sound, music, and finishing

### Other Costs Integration
- **Insurance**: All production insurance requirements
- **Legal and Professional**: Legal, accounting, and professional services
- **Marketing and Distribution**: Publicity, marketing, and distribution costs
- **Financing**: Interest, fees, and completion bond costs

## Validation and Quality Control

### Mathematical Validation
- **Totals and Subtotals**: Verify all mathematical calculations
- **Percentage Allocations**: Confirm percentage-based calculations
- **Rate Applications**: Validate rate multiplications and applications
- **Currency Conversions**: Verify international currency calculations
- **Tax and Fee Applications**: Confirm tax and fee calculations

### Logical Consistency Validation
- **Resource Dependencies**: Verify crew and equipment dependencies
- **Timeline Consistency**: Ensure schedule and budget alignment
- **Contract Compliance**: Verify union and contractual requirements
- **Regulatory Adherence**: Confirm legal and regulatory compliance
- **Industry Standards**: Validate against industry benchmarks

### Completeness Validation
- **Budget Coverage**: Ensure all production aspects are budgeted
- **Department Integration**: Verify all departments are included
- **Timeline Coverage**: Confirm all production phases are budgeted
- **Risk Coverage**: Ensure adequate risk and contingency planning
- **Documentation**: Verify supporting documentation and assumptions

## Risk Assessment Integration

### Budget Risk Categories
- **Creative Risks**: Script changes, director changes, cast changes
- **Technical Risks**: Equipment failures, technology challenges, weather
- **Schedule Risks**: Delays, overruns, force majeure events
- **Financial Risks**: Currency fluctuation, inflation, funding shortfalls
- **Regulatory Risks**: Permit delays, compliance issues, policy changes

### Risk Quantification Methods
- **Probability Assessment**: Likelihood of risk occurrence
- **Impact Analysis**: Financial impact of risk realization
- **Risk Correlation**: Interdependencies between different risks
- **Mitigation Costs**: Cost of risk prevention and mitigation
- **Contingency Adequacy**: Appropriate contingency allocation

## Budget Optimization Strategies

### Cost Efficiency Analysis
- **Value Engineering**: Optimize cost-to-value ratios
- **Resource Sharing**: Maximize equipment and crew utilization
- **Timing Optimization**: Optimize scheduling for cost efficiency
- **Vendor Negotiation**: Leverage volume and relationships for better rates
- **Alternative Approaches**: Evaluate different production methods

### Cash Flow Optimization
- **Payment Timing**: Optimize payment schedules and terms
- **Financing Efficiency**: Minimize financing costs and fees
- **Incentive Maximization**: Optimize tax incentives and rebates
- **Working Capital**: Minimize working capital requirements
- **Contingency Management**: Optimize contingency allocation and timing

## Output Requirements

Provide comprehensive budget aggregation including:
- **Consolidated master budget** with complete departmental breakdown
- **Cross-budget validation report** with discrepancy analysis and resolution
- **Risk assessment summary** with quantified risk factors and mitigation strategies
- **Cash flow projection** with detailed timing and funding requirements
- **Optimization recommendations** with specific cost reduction and efficiency opportunities
- **Compliance validation** confirming all regulatory and contractual adherence
- **Alternative scenarios** with different budget allocation and risk profiles

### Historical Context for 1960s Productions
Consider the unique aspects of 1960s film budgeting:
- **Limited Historical Data**: Fewer comparable productions for benchmarking
- **Emerging Technology Costs**: Higher costs and risks for innovative technology
- **International Production Complexity**: Greater complexity in multi-location productions
- **Currency and Political Risks**: Higher uncertainty in international operations

Your budget aggregation must balance comprehensive accuracy with practical usability, ensuring the production team has a reliable, actionable budget that supports both creative ambitions and financial discipline throughout the extended production period.
`;

class GeminiBudgetAggregatorService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: "AIzaSyABISxaNzifdIcZUCe408LoKnEz0bia8cI"
    });
  }

  async analyzeBudgetAggregatorData(jsonInput: string, projectId: string): Promise<{ result?: any; rawResponse?: string; error?: string }> {
    console.log('');
    console.log('📊 ===== BUDGET AGGREGATOR ANALYSIS STARTING =====');
    console.log('📅 TIMESTAMP:', new Date().toISOString());
    console.log('🆔 PROJECT_ID:', projectId);
    console.log('📊 METHOD: analyzeBudgetAggregatorData()');
    console.log('📊 ==================================================');
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
Please analyze this budget aggregator data and provide a complete budget aggregator response following the required JSON format:

BUDGET AGGREGATOR DATA:
${jsonInput}

PROJECT ID: ${projectId}

Remember to return ONLY the complete JSON object with all required fields populated according to the specified schema.
`;

      console.log('📊 PROMPT STATS:');
      console.log('  - User prompt length:', prompt.length, 'characters');
      console.log('  - System prompt length:', BUDGET_AGGREGATOR_SYSTEM_PROMPT.length, 'characters');
      console.log('  - Total prompt length:', prompt.length + BUDGET_AGGREGATOR_SYSTEM_PROMPT.length, 'characters');
      
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
          systemInstruction: BUDGET_AGGREGATOR_SYSTEM_PROMPT
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
      console.log('🔄 Calling parseBudgetAggregatorResponse()...');
      
      const parsedResponse = this.parseBudgetAggregatorResponse(responseText);

      if (!parsedResponse) {
        console.error('');
        console.error('💥 ========== PARSE FAILURE ==========');
        console.error('❌ CRITICAL ERROR: Failed to parse budget aggregator response from Gemini API');
        console.error('🔍 Parsed response is null/undefined');
        console.error('📊 This indicates JSON parsing or validation failed');
        console.error('🔍 Returning raw response for manual inspection');
        console.error('💥 ===================================');
        console.error('');
        
        return {
          rawResponse: responseText,
          error: 'Failed to parse budget aggregator response'
        };
      }
      
      console.log('✅ PARSE SUCCESS: Valid budget aggregator response received');
      console.log('');
      console.log('🚀 STEP 6: FINAL VALIDATION & COMPLETION');
      
      console.log('📊 FINAL ANALYSIS SUMMARY:');
      try {
        const summary = parsedResponse.budgetModelOutput;
        console.log('  - Processing status:', summary?.processingLog?.overallProcessingStatus || 'N/A');
        console.log('  - Total budget:', summary?.consolidatedBudget?.totalBudget || 'N/A');
        console.log('  - Overall risk score:', summary?.riskAnalysis?.overallRiskScore || 'N/A');
        console.log('  - Compliance status:', summary?.complianceValidation?.overallComplianceStatus || 'N/A');
      } catch (summaryError) {
        console.log('  - Summary extraction failed:', summaryError.message);
        console.log('  - But analysis data is still complete');
      }

      console.log('');
      console.log('🎉 ========== BUDGET AGGREGATOR ANALYSIS COMPLETE ==========');
      console.log('✅ Budget aggregator analysis completed successfully!');
      console.log('📁 Parsed response ready for use in application');
      console.log('🎯 Analysis ready for display in UI');
      console.log('🎉 ============================================================');
      console.log('');
      
      return {
        result: parsedResponse,
        rawResponse: responseText
      };

    } catch (error) {
      console.log('');
      console.log('💥 ========== ERROR OCCURRED ==========');
      console.error('❌ Error in budget aggregator analysis:', error);
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

  private parseBudgetAggregatorResponse(responseText: string): any | null {
    console.log('');
    console.log('🔍 ===== BUDGET AGGREGATOR RESPONSE PARSING (RAW JSON) =====');
    console.log('📅 Parse timestamp:', new Date().toISOString());
    console.log('🔍 ===========================================================');
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
      console.error('❌ Error parsing budget aggregator response:', error);
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      console.error('Response length:', responseText.length);
      console.error('Response preview:', responseText.substring(0, 1000));
      
      return null;
    }
  }
}

// Export singleton instance
export const geminiBudgetAggregatorService = new GeminiBudgetAggregatorService();

// Export helper function
export const analyzeBudgetAggregatorWithAI = async (
  jsonInput: string,
  projectId: string,
  onProgress?: (status: string) => void
): Promise<{ status: 'completed' | 'error'; result?: any; error?: string; rawResponse?: string }> => {
  console.log('');
  console.log('🎯 ===== BUDGET AGGREGATOR AI HELPER FUNCTION CALLED =====');
  console.log('📅 TIMESTAMP:', new Date().toISOString());
  console.log('🆔 PROJECT_ID:', projectId);
  console.log('📊 FUNCTION: analyzeBudgetAggregatorWithAI()');
  console.log('🎯 ==========================================================');
  console.log('');
  
  try {
    console.log('🚀 HELPER: Starting budget aggregator analysis...');
    console.log('📊 HELPER: Input JSON length:', jsonInput.length, 'characters');
    console.log('📊 HELPER: Project ID:', projectId);
    console.log('📊 HELPER: Progress callback provided:', !!onProgress);
    
    onProgress?.('Starting budget aggregator analysis...');
    console.log('📢 HELPER: Progress callback called - Starting analysis');
    
    console.log('🔄 HELPER: Calling geminiBudgetAggregatorService.analyzeBudgetAggregatorData()...');
    const analysisResult = await geminiBudgetAggregatorService.analyzeBudgetAggregatorData(jsonInput, projectId);
    
    console.log('✅ HELPER: Analysis completed!');
    console.log('📊 HELPER: Result type:', typeof analysisResult);
    console.log('📊 HELPER: Has result:', !!analysisResult?.result);
    console.log('📊 HELPER: Has raw response:', !!analysisResult?.rawResponse);
    console.log('📊 HELPER: Has error:', !!analysisResult?.error);
    
    if (analysisResult?.result) {
      onProgress?.('Budget aggregator completed successfully!');
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
    console.error('❌ HELPER: Budget aggregator analysis failed:', error);
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