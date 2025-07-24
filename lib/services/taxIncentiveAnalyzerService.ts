import { GoogleGenAI } from "@google/genai";

// Tax Incentive Analyzer Output Types
export interface TaxIncentiveAnalyzerOutput {
  taxModelOutput: {
    processingLog: {
      multiJurisdictionEvaluation: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      qualifiedExpenseCalculation: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      qualificationProbabilityAssessment: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      netBenefitComparison: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      optimalStrategyRecommendation: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      overallProcessingStatus: string;
    };
    ukIncentives: {
      filmProductionTaxCredit: {
        type: string;
        qualifyingExpenditure: number;
        rate: number;
        calculatedValue: number;
        notes: string;
      };
      enterpriseInvestmentScheme: {
        type: string;
        maxInvestment: number;
        rate: number;
        calculatedValue: number;
        notes: string;
      };
      regionalDevelopmentGrants: {
        type: string;
        eligibility: string;
        calculatedValue: number;
        notes: string;
      };
      ukIncentiveSubtotal: number;
    };
    californiaIncentives: {
      filmTaxCredit: {
        type: string;
        qualifyingExpenditure: number;
        rate: number;
        calculatedValue: number;
        notes: string;
      };
      investmentTaxCredit: {
        type: string;
        qualifyingExpenditure: number;
        rate: number;
        calculatedValue: number;
        notes: string;
      };
      californiaIncentiveSubtotal: number;
    };
    namibiaIncentives: {
      locationIncentives: {
        type: string;
        permitFeeWaiver: number;
        equipmentDutyRelief: number;
        calculatedValue: number;
        notes: string;
      };
      namibiaIncentiveSubtotal: number;
    };
    totalIncentiveValue: {
      ukCreditsAndGrants: number;
      californiaCredits: number;
      namibiaIncentives: number;
      grossTotal: number;
      professionalFees: number;
      netIncentiveValue: number;
    };
    cashFlowTiming: {
      year1_1966: {
        description: string;
        inflow: number;
      };
      year2_1967: {
        description: string;
        inflow: number;
      };
      year3_1968: {
        description: string;
        inflow: number;
      };
      year4_1969: {
        description: string;
        inflow: number;
      };
    };
    complianceStatus: {
      uk: {
        status: string;
        culturalTest: string;
        localSpend: string;
        auditRequired: boolean;
      };
      california: {
        status: string;
        laborCompliance: string;
        environmentalCompliance: string;
        auditRequired: boolean;
      };
      namibia: {
        status: string;
        localHire: string;
        documentation: string;
        auditRequired: boolean;
      };
    };
    riskAssessment: {
      incentiveSecurityRating: string;
      riskFactors: Array<{
        factor: string;
        probability: string;
        impact: string;
        mitigation: string;
      }>;
      overallRiskScore: string;
      confidence: number;
    };
    recommendations: string[];
    alternativeScenarios: {
      conservative: {
        description: string;
        netIncentiveValue: number;
        varianceFromBase: number;
      };
      optimistic: {
        description: string;
        netIncentiveValue: number;
        varianceFromBase: number;
      };
    };
    effectiveIncentiveRate: {
      percentageOfBudget: number;
      netPercentageAfterFees: number;
      roiOnIncentiveEffort: number;
    };
  };
}

// System Prompt for Tax Incentive Analyzer
const TAX_INCENTIVE_ANALYZER_SYSTEM_PROMPT = `
TAX INCENTIVE ANALYZER SYSTEM PROMPT
====================================

You are the Tax Incentive Analyzer for a multi-model film budget system. Your responsibility is to identify, calculate, and optimize all available tax incentives, credits, grants, and rebates for film productions across multiple jurisdictions.

## REQUIRED PROCESSING SEQUENCE

Before generating any output, you MUST perform the following processing steps using function calling:

### 1. Multi-Jurisdiction Evaluation Processing
Use function calling to:
- Evaluate all jurisdictions for incentive programs
- Compare program benefits and requirements
- Factor in qualification criteria
- Include application and compliance timelines

### 2. Qualified Expense Calculation Processing
Use function calling to:
- Calculate qualified expenses by jurisdiction
- Apply local spend requirements
- Factor in above/below line allocations
- Include cultural test compliance

### 3. Qualification Probability Assessment Processing
Use function calling to:
- Assess qualification probability for each program
- Factor in production structure optimization
- Include risk factors and compliance history
- Evaluate alternative structuring options

### 4. Net Benefit Comparison Processing
Use function calling to:
- Compare net benefits across jurisdictions
- Factor in compliance costs and professional fees
- Include cash flow timing considerations
- Calculate risk-adjusted returns

### 5. Optimal Strategy Recommendation Processing
Use function calling to:
- Recommend optimal strategy across programs
- Include entity structuring recommendations
- Factor in international tax considerations
- Provide implementation roadmap

**CRITICAL: All tax incentive analysis must be performed through these processing functions before generating final output.**

## Core Functions

1. **Incentive Identification and Qualification**
   - Research and catalog all available film incentives by jurisdiction
   - Analyze production structure for optimal incentive qualification
   - Evaluate cultural tests, local spend requirements, and compliance criteria
   - Assess timing requirements and application deadlines
   - Determine entity structure optimization for maximum benefit

2. **Incentive Calculation and Modeling**
   - Calculate qualifying expenditure amounts by jurisdiction
   - Apply appropriate credit rates, caps, and limitations
   - Model cash flow timing and refund mechanisms
   - Analyze transferability and marketability of credits
   - Factor in professional service costs and compliance requirements

3. **Multi-Jurisdiction Optimization**
   - Compare incentive programs across potential filming locations
   - Optimize production structure for maximum overall benefit
   - Analyze trade-offs between different incentive programs
   - Recommend optimal entity structures and funding arrangements
   - Coordinate international tax planning strategies

4. **Compliance and Risk Management**
   - Ensure full compliance with all incentive program requirements
   - Monitor ongoing compliance obligations and reporting requirements
   - Assess audit risk and documentation standards
   - Evaluate political and regulatory stability risks
   - Recommend risk mitigation strategies

## Incentive Program Categories

### Film Production Tax Credits
- **Refundable Credits**: Direct cash refunds or payments
- **Non-Refundable Credits**: Offset against tax liabilities
- **Transferable Credits**: Marketable to third parties
- **Rate Structures**: Typically 15-40% of qualifying expenditure
- **Caps and Limitations**: Per-project, annual, or program caps

### Cultural and Content Tests
- **UK Cultural Test**: Points-based system for British qualifying films
- **Canadian Content Requirements**: Canadian certification criteria
- **Australian Content Tests**: Screen Australia cultural criteria
- **EU Co-Production Requirements**: Pan-European qualification standards

### Location-Based Incentives
- **State/Provincial Credits**: Regional film incentive programs
- **Local Municipality Grants**: City and county support programs
- **Economic Development Incentives**: Job creation and local spend bonuses
- **Infrastructure Rebates**: Stage rental and facility development support

### Investment Incentives
- **Enterprise Investment Schemes**: Tax-advantaged private investment
- **Section 181 Deductions**: US accelerated depreciation benefits
- **Film Investment Tax Credits**: Equipment and facility investment incentives
- **Co-Production Treaties**: International treaty-based benefits

## Historical Context for 1960s Productions

Consider the limited incentive landscape of the 1960s:
- **Emerging Programs**: Early UK Eady Levy and emerging regional incentives
- **Limited Infrastructure**: Fewer specialized advisors and standardized procedures

Your tax incentive analysis must balance maximum benefit capture with practical compliance and minimize regulatory risk while establishing sustainable precedents for future productions.
`;

class GeminiTaxIncentiveAnalyzerService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: "AIzaSyABISxaNzifdIcZUCe408LoKnEz0bia8cI"
    });
  }

  async analyzeTaxIncentiveAnalyzerData(jsonInput: string, projectId: string): Promise<{ result?: TaxIncentiveAnalyzerOutput; rawResponse?: string; error?: string }> {
    console.log('');
    console.log('💰 ===== TAX INCENTIVE ANALYZER ANALYSIS STARTING =====');
    console.log('📅 TIMESTAMP:', new Date().toISOString());
    console.log('🆔 PROJECT_ID:', projectId);
    console.log('📊 METHOD: analyzeTaxIncentiveAnalyzerData()');
    console.log('💰 =======================================================');
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
Please analyze this tax incentive analyzer data and provide a complete tax incentive analyzer response following the required JSON format:

TAX INCENTIVE ANALYZER DATA:
${jsonInput}

PROJECT ID: ${projectId}

Remember to return ONLY the complete JSON object with all required fields populated according to the specified schema.
`;

      console.log('📊 PROMPT STATS:');
      console.log('  - User prompt length:', prompt.length, 'characters');
      console.log('  - System prompt length:', TAX_INCENTIVE_ANALYZER_SYSTEM_PROMPT.length, 'characters');
      console.log('  - Total prompt length:', prompt.length + TAX_INCENTIVE_ANALYZER_SYSTEM_PROMPT.length, 'characters');
      
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
          systemInstruction: TAX_INCENTIVE_ANALYZER_SYSTEM_PROMPT
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
      console.log('🔄 Calling parseTaxIncentiveAnalyzerResponse()...');
      
      const parsedResponse = this.parseTaxIncentiveAnalyzerResponse(responseText);

      if (!parsedResponse) {
        console.error('');
        console.error('💥 ========== PARSE FAILURE ==========');
        console.error('❌ CRITICAL ERROR: Failed to parse tax incentive analyzer response from Gemini API');
        console.error('🔍 Parsed response is null/undefined');
        console.error('📊 This indicates JSON parsing or validation failed');
        console.error('🔍 Returning raw response for manual inspection');
        console.error('💥 ===================================');
        console.error('');
        
        return {
          rawResponse: responseText,
          error: 'Failed to parse tax incentive analyzer response'
        };
      }
      
      console.log('✅ PARSE SUCCESS: Valid tax incentive analyzer response received');
      console.log('');
      console.log('🚀 STEP 6: FINAL VALIDATION & COMPLETION');
      
      console.log('📊 FINAL ANALYSIS SUMMARY:');
      try {
        const summary = parsedResponse.taxModelOutput;
        console.log('  - Processing status:', summary?.processingLog?.overallProcessingStatus || 'N/A');
        console.log('  - Net incentive value:', summary?.totalIncentiveValue?.netIncentiveValue || 'N/A');
        console.log('  - Effective incentive rate:', summary?.effectiveIncentiveRate?.percentageOfBudget || 'N/A', '%');
        console.log('  - Overall risk score:', summary?.riskAssessment?.overallRiskScore || 'N/A');
      } catch (summaryError) {
        console.log('  - Summary extraction failed:', summaryError.message);
        console.log('  - But analysis data is still complete');
      }

      console.log('');
      console.log('🎉 ========== TAX INCENTIVE ANALYZER ANALYSIS COMPLETE ==========');
      console.log('✅ Tax incentive analyzer analysis completed successfully!');
      console.log('📁 Parsed response ready for use in application');
      console.log('🎯 Analysis ready for display in UI');
      console.log('🎉 ================================================================');
      console.log('');
      
      return {
        result: parsedResponse,
        rawResponse: responseText
      };

    } catch (error) {
      console.log('');
      console.log('💥 ========== ERROR OCCURRED ==========');
      console.error('❌ Error in tax incentive analyzer analysis:', error);
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

  private parseTaxIncentiveAnalyzerResponse(responseText: string): any | null {
    console.log('');
    console.log('🔍 ===== TAX INCENTIVE ANALYZER RESPONSE PARSING & VALIDATION =====');
    console.log('📅 Parse timestamp:', new Date().toISOString());
    console.log('🔍 ===================================================================');
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
      console.error('❌ Error parsing tax incentive analyzer response:', error);
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      console.error('Response length:', responseText.length);
      console.error('Response preview:', responseText.substring(0, 1000));
      
      return null;
    }
  }
}

// Export singleton instance
export const geminiTaxIncentiveAnalyzerService = new GeminiTaxIncentiveAnalyzerService();

// Export helper function
export const analyzeTaxIncentiveAnalyzerWithAI = async (
  jsonInput: string,
  projectId: string,
  onProgress?: (status: string) => void
): Promise<{ status: 'completed' | 'error'; result?: any; error?: string; rawResponse?: string }> => {
  console.log('');
  console.log('🎯 ===== TAX INCENTIVE ANALYZER AI HELPER FUNCTION CALLED =====');
  console.log('📅 TIMESTAMP:', new Date().toISOString());
  console.log('🆔 PROJECT_ID:', projectId);
  console.log('📊 FUNCTION: analyzeTaxIncentiveAnalyzerWithAI()');
  console.log('🎯 ===============================================================');
  console.log('');
  
  try {
    console.log('🚀 HELPER: Starting tax incentive analyzer analysis...');
    console.log('📊 HELPER: Input JSON length:', jsonInput.length, 'characters');
    console.log('📊 HELPER: Project ID:', projectId);
    console.log('📊 HELPER: Progress callback provided:', !!onProgress);
    
    onProgress?.('Starting tax incentive analyzer analysis...');
    console.log('📢 HELPER: Progress callback called - Starting analysis');
    
    console.log('🔄 HELPER: Calling geminiTaxIncentiveAnalyzerService.analyzeTaxIncentiveAnalyzerData()...');
    const analysisResult = await geminiTaxIncentiveAnalyzerService.analyzeTaxIncentiveAnalyzerData(jsonInput, projectId);
    
    console.log('✅ HELPER: Analysis completed!');
    console.log('📊 HELPER: Result type:', typeof analysisResult);
    console.log('📊 HELPER: Has result:', !!analysisResult?.result);
    console.log('📊 HELPER: Has raw response:', !!analysisResult?.rawResponse);
    console.log('📊 HELPER: Has error:', !!analysisResult?.error);
    
    if (analysisResult?.result) {
      onProgress?.('Tax incentive analyzer completed successfully!');
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
    console.error('❌ HELPER: Tax incentive analyzer analysis failed:', error);
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