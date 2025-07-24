import { GoogleGenAI } from "@google/genai";

// Cash Flow Projector Output Types
export interface CashFlowProjectorOutput {
  cashFlowModelOutput: {
    processingLog: {
      revenueProjection: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      expenditureScheduling: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      financingOptimization: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      riskScenarioModeling: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      liquidityAnalysis: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      overallProcessingStatus: string;
    };
    cashFlowProjection: {
      monthlyProjections: Array<{
        month: string;
        cashInflows: {
          initialFunding: number;
          additionalInvestment: number;
          presales: number;
          taxIncentives: number;
          distributionAdvances: number;
          totalInflows: number;
        };
        cashOutflows: {
          aboveTheLine: number;
          belowTheLine: number;
          postProduction: number;
          marketing: number;
          distribution: number;
          overhead: number;
          financing: number;
          totalOutflows: number;
        };
        netCashFlow: number;
        cumulativeCashFlow: number;
        minimumCashRequired: number;
        cashPosition: number;
      }>;
      annualSummary: {
        [year: string]: {
          totalInflows: number;
          totalOutflows: number;
          netCashFlow: number;
          endingCashPosition: number;
        };
      };
    };
    financingRequirements: {
      totalProductionCost: number;
      initialEquityRequired: number;
      debtFinancingRequired: number;
      workingCapitalNeeds: number;
      contingencyReserve: number;
      totalFinancingNeed: number;
      financingStructure: {
        equity: {
          percentage: number;
          amount: number;
          cost: number;
        };
        debt: {
          percentage: number;
          amount: number;
          interestRate: number;
          term: number;
        };
        incentives: {
          percentage: number;
          amount: number;
          timing: string;
        };
        presales: {
          percentage: number;
          amount: number;
          timing: string;
        };
      };
    };
    liquidityAnalysis: {
      peakFundingRequirement: number;
      minimumCashBalance: number;
      cashCoverageRatio: number;
      workingCapitalDays: number;
      liquidityRiskScore: string;
      criticalCashFlowPeriods: Array<{
        period: string;
        riskLevel: string;
        description: string;
        mitigation: string;
      }>;
    };
    riskScenarios: {
      baseCase: {
        description: string;
        probability: number;
        totalCost: number;
        financingNeed: number;
        roi: number;
      };
      optimisticCase: {
        description: string;
        probability: number;
        totalCost: number;
        financingNeed: number;
        roi: number;
      };
      pessimisticCase: {
        description: string;
        probability: number;
        totalCost: number;
        financingNeed: number;
        roi: number;
      };
      probabilityWeightedExpected: {
        totalCost: number;
        financingNeed: number;
        roi: number;
      };
    };
    sensitivityAnalysis: {
      costOverrunImpact: {
        [percentage: string]: {
          additionalFunding: number;
          liquidityImpact: string;
        };
      };
      scheduleDelayImpact: {
        [months: string]: {
          additionalCosts: number;
          liquidityImpact: string;
        };
      };
      interestRateImpact: {
        [rate: string]: {
          additionalCosts: number;
          totalFinancingCost: number;
        };
      };
    };
    recommendations: {
      financingStrategy: string[];
      cashManagement: string[];
      riskMitigation: string[];
      costOptimization: string[];
    };
    keyMetrics: {
      cashConversionCycle: number;
      debtServiceCoverageRatio: number;
      returnOnInvestment: number;
      internalRateOfReturn: number;
      netPresentValue: number;
      paybackPeriod: number;
    };
  };
}

// System Prompt for Cash Flow Projector
const CASH_FLOW_PROJECTOR_SYSTEM_PROMPT = `
CASH FLOW PROJECTOR SYSTEM PROMPT
=================================

You are the Cash Flow Projector for a multi-model film budget system. Your responsibility is to create detailed cash flow projections, optimize financing structures, and provide liquidity management strategies for complex film productions.

## REQUIRED PROCESSING SEQUENCE

Before generating any output, you MUST perform the following processing steps using function calling:

### 1. Revenue Projection Processing
Use function calling to:
- Project all revenue streams and timing
- Calculate presales and distribution advances
- Factor in tax incentive cash flow timing
- Include ancillary revenue projections

### 2. Expenditure Scheduling Processing
Use function calling to:
- Schedule all expenditures by timing and phase
- Factor in payment terms and cash timing
- Include contingency and overhead allocation
- Calculate working capital requirements

### 3. Financing Optimization Processing
Use function calling to:
- Optimize financing structure and timing
- Calculate debt service requirements
- Factor in equity and debt costs
- Include financing fee and cost allocation

### 4. Risk Scenario Modeling Processing
Use function calling to:
- Model different risk scenarios and impacts
- Calculate probability-weighted outcomes
- Factor in sensitivity to key variables
- Include stress testing and worst-case analysis

### 5. Liquidity Analysis Processing
Use function calling to:
- Analyze liquidity requirements and timing
- Calculate minimum cash balance needs
- Factor in credit facility requirements
- Include cash management optimization

**CRITICAL: All cash flow projection must be performed through these processing functions before generating final output.**

## Core Functions

1. **Cash Flow Modeling and Projection**
   - Detailed monthly cash flow projections throughout production lifecycle
   - Integration of all revenue streams and expenditure schedules
   - Working capital requirements and timing analysis
   - Seasonal and cyclical cash flow pattern recognition
   - Multi-currency cash flow management for international productions

2. **Financing Structure Optimization**
   - Optimal debt-to-equity ratio analysis
   - Cost of capital minimization strategies
   - Tax-efficient financing structure design
   - Alternative financing mechanism evaluation
   - Risk-adjusted return optimization

3. **Liquidity Management and Planning**
   - Minimum cash balance determination
   - Credit facility sizing and structure
   - Cash concentration and pooling strategies
   - Foreign exchange hedging requirements
   - Emergency liquidity contingency planning

4. **Risk Assessment and Scenario Modeling**
   - Monte Carlo simulation for cash flow scenarios
   - Sensitivity analysis for key variables
   - Stress testing under adverse conditions
   - Probability-weighted expected outcome calculation
   - Risk mitigation strategy development

## Cash Flow Components Analysis

### Revenue Stream Modeling
- **Initial Financing**: Equity investment timing and tranches
- **Debt Financing**: Loan drawdown schedules and terms
- **Presales Revenue**: Territory sales and advance timing
- **Tax Incentives**: Credit realization and cash flow timing
- **Distribution Advances**: Domestic and international advance payments
- **Ancillary Revenue**: Merchandising, music, and secondary revenue

### Expenditure Scheduling
- **Above-the-Line**: Cast and key talent payment schedules
- **Production**: Crew, equipment, and location payment timing
- **Post-Production**: Editorial, VFX, and finishing payment schedules
- **Marketing and Distribution**: Campaign timing and payment terms
- **Overhead and General**: Administrative and general expense timing
- **Financing Costs**: Interest, fees, and debt service payments

### Working Capital Management
- **Accounts Payable**: Vendor payment terms and cash timing
- **Accounts Receivable**: Revenue collection timing and terms
- **Inventory Management**: Work-in-progress and finished goods
- **Prepaid Expenses**: Advance payments and deposit timing
- **Accrued Expenses**: Deferred payment obligations

## Financing Structure Optimization

### Equity Financing Analysis
- **Investment Tranches**: Staged equity investment timing
- **Investor Rights**: Participation rights and preferences
- **Dilution Management**: Ownership percentage optimization
- **Exit Strategy**: Return timing and mechanism planning
- **Tax Efficiency**: Structure optimization for tax benefits

### Debt Financing Structure
- **Senior Debt**: Traditional bank financing terms and structure
- **Mezzanine Financing**: Bridge financing and gap funding
- **Equipment Financing**: Asset-based lending optimization
- **Completion Guarantees**: Bond and guarantee requirements
- **International Financing**: Multi-currency debt optimization

### Alternative Financing Mechanisms
- **Revenue-Based Financing**: Future revenue monetization
- **Tax Credit Monetization**: Incentive advance and sale
- **Equipment Leasing**: Operating vs. capital lease optimization
- **Co-Production Financing**: International partnership structures
- **Government Grants**: Program timing and cash flow impact

## Risk Management and Scenario Planning

### Base Case Scenario Development
- **Most Likely Outcomes**: Realistic projection assumptions
- **Historical Benchmarking**: Comparable production analysis
- **Market Condition Assessment**: Current market environment factors
- **Execution Probability**: Management team and track record assessment
- **Regulatory Environment**: Stable policy and regulatory assumptions

### Optimistic Scenario Modeling
- **Favorable Market Conditions**: Strong market performance assumptions
- **Execution Excellence**: Best-case operational performance
- **Cost Efficiency**: Maximum cost reduction and efficiency gains
- **Revenue Upside**: Premium pricing and additional revenue streams
- **Financing Advantages**: Optimal financing terms and conditions

### Pessimistic Scenario Analysis
- **Adverse Market Conditions**: Weak market and economic conditions
- **Operational Challenges**: Delays, overruns, and execution issues
- **Cost Overruns**: Budget increases and efficiency losses
- **Revenue Shortfalls**: Reduced pricing and revenue realization
- **Financing Constraints**: Higher costs and limited availability

### Stress Testing and Sensitivity Analysis
- **Interest Rate Sensitivity**: Impact of rate changes on financing costs
- **Currency Fluctuation**: Foreign exchange risk on cash flows
- **Schedule Delays**: Impact of production delays on cash requirements
- **Cost Inflation**: Impact of cost increases on financing needs
- **Market Downturn**: Impact of adverse market conditions

## Liquidity Management Framework

### Minimum Cash Balance Determination
- **Operating Cash Needs**: Daily operational cash requirements
- **Contingency Reserves**: Emergency cash availability requirements
- **Debt Service Coverage**: Minimum ratios for covenant compliance
- **Seasonal Variations**: Peak and trough cash requirement periods
- **Regulatory Requirements**: Minimum balance regulatory requirements

### Credit Facility Design
- **Revolving Credit**: Working capital credit line sizing
- **Term Loans**: Project financing and capital expenditure funding
- **Letters of Credit**: Guarantee and performance bond support
- **Multi-Currency Facilities**: International cash management support
- **Covenant Structure**: Financial ratio and performance requirements

### Cash Management Optimization
- **Cash Concentration**: Centralized cash management systems
- **Sweep Accounts**: Automated cash optimization and investment
- **Foreign Exchange**: Currency hedging and conversion optimization
- **Investment Policy**: Short-term investment guidelines and strategies
- **Banking Relationships**: Optimal banking structure and relationships

## Output Requirements

Provide comprehensive cash flow projections including:
- **Monthly cash flow statements** with detailed inflow and outflow analysis
- **Financing requirement analysis** with optimal structure recommendations
- **Liquidity management plan** with minimum balance and credit facility requirements
- **Risk scenario modeling** with probability-weighted outcomes and sensitivity analysis
- **Cash management strategy** with optimization recommendations and operational guidelines
- **Financial metrics analysis** with return calculations and performance indicators
- **Financing recommendation** with structure, timing, and cost optimization

### Historical Context for 1960s Productions
Consider the unique financial environment of the 1960s:
- **Limited Financing Options**: Fewer sophisticated financing mechanisms available
- **International Banking**: Less developed international banking and currency markets
- **Technology Costs**: Higher uncertainty and costs for innovative technology financing
- **Market Volatility**: Greater political and economic uncertainty affecting projections

Your cash flow projections must balance ambitious creative goals with financial discipline, ensuring adequate liquidity throughout the production while optimizing financing costs and maintaining financial flexibility for unforeseen challenges and opportunities.
`;

class GeminiCashFlowProjectorService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: "AIzaSyABISxaNzifdIcZUCe408LoKnEz0bia8cI"
    });
  }

  async analyzeCashFlowProjectorData(jsonInput: string, projectId: string): Promise<{ result?: any; rawResponse?: string; error?: string }> {
    console.log('');
    console.log('💰 ===== CASH FLOW PROJECTOR ANALYSIS STARTING =====');
    console.log('📅 TIMESTAMP:', new Date().toISOString());
    console.log('🆔 PROJECT_ID:', projectId);
    console.log('📊 METHOD: analyzeCashFlowProjectorData()');
    console.log('💰 ====================================================');
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
Please analyze this cash flow projector data and provide a complete cash flow projector response following the required JSON format:

CASH FLOW PROJECTOR DATA:
${jsonInput}

PROJECT ID: ${projectId}

Remember to return ONLY the complete JSON object with all required fields populated according to the specified schema.
`;

      console.log('📊 PROMPT STATS:');
      console.log('  - User prompt length:', prompt.length, 'characters');
      console.log('  - System prompt length:', CASH_FLOW_PROJECTOR_SYSTEM_PROMPT.length, 'characters');
      console.log('  - Total prompt length:', prompt.length + CASH_FLOW_PROJECTOR_SYSTEM_PROMPT.length, 'characters');
      
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
          systemInstruction: CASH_FLOW_PROJECTOR_SYSTEM_PROMPT
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
      console.log('🔄 Calling parseCashFlowProjectorResponse()...');
      
      const parsedResponse = this.parseCashFlowProjectorResponse(responseText);

      if (!parsedResponse) {
        console.error('');
        console.error('💥 ========== PARSE FAILURE ==========');
        console.error('❌ CRITICAL ERROR: Failed to parse cash flow projector response from Gemini API');
        console.error('🔍 Parsed response is null/undefined');
        console.error('📊 This indicates JSON parsing or validation failed');
        console.error('🔍 Returning raw response for manual inspection');
        console.error('💥 ===================================');
        console.error('');
        
        return {
          rawResponse: responseText,
          error: 'Failed to parse cash flow projector response'
        };
      }
      
      console.log('✅ PARSE SUCCESS: Valid cash flow projector response received');
      console.log('');
      console.log('🚀 STEP 6: FINAL VALIDATION & COMPLETION');
      
      console.log('📊 FINAL ANALYSIS SUMMARY:');
      try {
        const summary = parsedResponse.cashFlowModelOutput;
        console.log('  - Processing status:', summary?.processingLog?.overallProcessingStatus || 'N/A');
        console.log('  - Total financing need:', summary?.financingRequirements?.totalFinancingNeed || 'N/A');
        console.log('  - Liquidity risk score:', summary?.liquidityAnalysis?.liquidityRiskScore || 'N/A');
        console.log('  - ROI:', summary?.keyMetrics?.returnOnInvestment || 'N/A');
      } catch (summaryError) {
        console.log('  - Summary extraction failed:', summaryError.message);
        console.log('  - But analysis data is still complete');
      }

      console.log('');
      console.log('🎉 ========== CASH FLOW PROJECTOR ANALYSIS COMPLETE ==========');
      console.log('✅ Cash flow projector analysis completed successfully!');
      console.log('📁 Parsed response ready for use in application');
      console.log('🎯 Analysis ready for display in UI');
      console.log('🎉 ==============================================================');
      console.log('');
      
      return {
        result: parsedResponse,
        rawResponse: responseText
      };

    } catch (error) {
      console.log('');
      console.log('💥 ========== ERROR OCCURRED ==========');
      console.error('❌ Error in cash flow projector analysis:', error);
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

  private parseCashFlowProjectorResponse(responseText: string): any | null {
    console.log('');
    console.log('🔍 ===== CASH FLOW PROJECTOR RESPONSE PARSING (RAW JSON) =====');
    console.log('📅 Parse timestamp:', new Date().toISOString());
    console.log('🔍 =============================================================');
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
      console.error('❌ Error parsing cash flow projector response:', error);
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      console.error('Response length:', responseText.length);
      console.error('Response preview:', responseText.substring(0, 1000));
      
      return null;
    }
  }
}

// Export singleton instance
export const geminiCashFlowProjectorService = new GeminiCashFlowProjectorService();

// Export helper function
export const analyzeCashFlowProjectorWithAI = async (
  jsonInput: string,
  projectId: string,
  onProgress?: (status: string) => void
): Promise<{ status: 'completed' | 'error'; result?: any; error?: string; rawResponse?: string }> => {
  console.log('');
  console.log('🎯 ===== CASH FLOW PROJECTOR AI HELPER FUNCTION CALLED =====');
  console.log('📅 TIMESTAMP:', new Date().toISOString());
  console.log('🆔 PROJECT_ID:', projectId);
  console.log('📊 FUNCTION: analyzeCashFlowProjectorWithAI()');
  console.log('🎯 ============================================================');
  console.log('');
  
  try {
    console.log('🚀 HELPER: Starting cash flow projector analysis...');
    console.log('📊 HELPER: Input JSON length:', jsonInput.length, 'characters');
    console.log('📊 HELPER: Project ID:', projectId);
    console.log('📊 HELPER: Progress callback provided:', !!onProgress);
    
    onProgress?.('Starting cash flow projector analysis...');
    console.log('📢 HELPER: Progress callback called - Starting analysis');
    
    console.log('🔄 HELPER: Calling geminiCashFlowProjectorService.analyzeCashFlowProjectorData()...');
    const analysisResult = await geminiCashFlowProjectorService.analyzeCashFlowProjectorData(jsonInput, projectId);
    
    console.log('✅ HELPER: Analysis completed!');
    console.log('📊 HELPER: Result type:', typeof analysisResult);
    console.log('📊 HELPER: Has result:', !!analysisResult?.result);
    console.log('📊 HELPER: Has raw response:', !!analysisResult?.rawResponse);
    console.log('📊 HELPER: Has error:', !!analysisResult?.error);
    
    if (analysisResult?.result) {
      onProgress?.('Cash flow projector completed successfully!');
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
    console.error('❌ HELPER: Cash flow projector analysis failed:', error);
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