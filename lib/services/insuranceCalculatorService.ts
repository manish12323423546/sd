import { GoogleGenAI } from "@google/genai";

// Insurance Calculator Output Types
export interface InsuranceCalculatorOutput {
  insuranceModelOutput: {
    processingLog: {
      coverageRequirementsCalculation: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      riskFactorAssessment: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      actuarialTableApplication: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      deductibleFactorProcessing: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      completionBondProcessing: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      overallProcessingStatus: string;
    };
    generalLiability: {
      coverage: {
        perOccurrence: number;
        generalAggregate: number;
        productsCompletedOps: number;
      };
      premium: {
        basePremium: number;
        stuntMultiplier: number;
        animalWorkMultiplier: number;
        internationalOpsMultiplier: number;
        specialEffectsMultiplier: number;
        totalPremium: number;
      };
      deductible: number;
      specialConditions: string[];
    };
    equipmentCoverage: {
      schedule: {
        camera: number;
        lighting: number;
        sound: number;
        vehicles: number;
        props: number;
        specialEquipment: number;
      };
      totalValue: number;
      totalPremium: number;
      deductible: number;
      specialConditions: string[];
    };
    castInsurance: {
      essentialElements: {
        [key: string]: {
          value: number;
          rate: number;
          premium: number;
        };
      };
      totalCastPremium: number;
      specialConditions: string[];
    };
    errorsOmissions: {
      coverage: number;
      premium: number;
      deductible: number;
      retroactiveDate: string;
      specialConditions: string[];
    };
    autoLiability: {
      totalAuto: number;
    };
    workersCompensation: {
      payroll: {
        clerical: {
          amount: number;
          rate: number;
          premium: number;
        };
        productionCrew: {
          amount: number;
          rate: number;
          premium: number;
        };
        stuntPerformers: {
          amount: number;
          rate: number;
          premium: number;
        };
        internationalCrew: {
          amount: number;
          rate: number;
          premium: number;
        };
      };
      totalPayroll: number;
      totalPremium: number;
    };
    completionBond: {
      required: boolean;
      bondableElements: {
        aboveTheLine: number;
        belowTheLine: number;
        postProduction: number;
        totalBondable: number;
      };
      rate: number;
      fee: number;
      rebate: {
        potentialRebatePercentage: number;
        potentialRebateAmount: number;
      };
      deliveryRequirements: string[];
      specialConditions: string[];
    };
    additionalCoverages: {
      animalMortality: {
        premium: number;
      };
      politicalRisk: {
        premium: number;
      };
      weatherInsurance: {
        premium: number;
      };
      thirdPartyPropertyDamage: {
        premium: number;
      };
    };
    specialRiskCoverages: {
      unprecedentedTechnologyFailure: {
        description: string;
        premium: number;
        deductible: number;
      };
      civilAuthority: {
        description: string;
        premium: number;
      };
    };
    insuranceSummary: {
      subtotal: number;
      completionBond: number;
      brokerFee: number;
      taxes: number;
      grandTotal: number;
    };
    riskAssessment: {
      overallRisk: string;
      riskFactors: Array<{
        type: string;
        description: string;
        level: string;
      }>;
      recommendations: string[];
    };
  };
}

// System Prompt for Insurance Calculator
const INSURANCE_CALCULATOR_SYSTEM_PROMPT = `
INSURANCE CALCULATOR SYSTEM PROMPT
==================================

You are the Insurance Calculator for a multi-model film budget system. Your responsibility is to determine all insurance requirements and costs for film production, specializing in high-risk, technically complex, and international productions.

## REQUIRED PROCESSING SEQUENCE

Before generating any output, you MUST perform the following processing steps using function calling:

### 1. Coverage Requirements Calculation Processing
Use function calling to:
- Calculate coverage requirements for all risks
- Determine appropriate policy limits
- Factor in statutory minimum requirements
- Include specialized coverage needs

### 2. Risk Factor Assessment Processing
Use function calling to:
- Assess risk factors across all categories
- Evaluate technical innovation risks
- Factor in location and operational risks
- Include cast and key personnel risks

### 3. Actuarial Table Application Processing
Use function calling to:
- Apply actuarial tables for premium calculation
- Use industry-specific rating factors
- Factor in production scale multipliers
- Include experience modification factors

### 4. Deductible Factor Processing
Use function calling to:
- Factor in deductibles for all coverage types
- Optimize deductible levels for cost efficiency
- Include self-insured retention calculations
- Factor in risk tolerance considerations

### 5. Completion Bond Processing
Use function calling to:
- Add completion bond requirements
- Calculate bond premium and terms
- Factor in delivery requirements
- Include rebate potential calculations

**CRITICAL: All insurance calculations must be performed through these processing functions before generating final output.**

## Core Functions

### Risk Assessment and Classification
- Evaluate production risks across all departments and activities
- Classify risk levels (low, medium, high, extreme)
- Assess technical innovation and experimental equipment risks
- Evaluate international filming and political risks
- Determine appropriate coverage limits and deductibles

### Coverage Requirement Analysis
- Calculate general liability coverage needs
- Determine equipment and property insurance values
- Assess cast and key personnel insurance requirements
- Evaluate errors and omissions coverage needs
- Determine completion bond requirements and bondability

### Premium Calculation and Rating
- Apply actuarial tables and industry risk factors
- Calculate location-specific rate multipliers
- Assess special risk premiums for experimental work
- Factor in international coverage extensions
- Determine experience modification factors

### Compliance and Regulatory Requirements
- Ensure workers' compensation compliance across jurisdictions
- Verify auto liability requirements for all locations
- Assess international insurance regulations
- Determine local insurance requirements and minimums
- Evaluate completion bond company requirements

## Insurance Coverage Categories

### General Liability Insurance
- Base Coverage: $1M-$10M per occurrence/aggregate
- Rate Factors: Location risk, stunt work, animal work, crowd scenes
- Special Considerations: International extensions, equipment operation
- Multipliers: Stunt work (1.2-1.5x), Animals (1.3-1.6x), International (1.1-1.3x)

### Equipment and Property Insurance
- Scheduled Equipment: Cameras, lighting, sound, vehicles, props
- Custom Equipment: Motion control, specialized rigs, one-off builds
- Rate Structure: 2-8% of equipment value depending on risk
- Special Considerations: Transit coverage, mysterious disappearance, custom builds
- Deductibles: $10K-$100K based on equipment value and risk

### Cast and Key Personnel Insurance
- Essential Elements: Principals, director, key department heads
- Coverage Calculation: Based on role importance and replacement difficulty
- Rate Factors: Age, health, role requirements, international travel
- Medical Requirements: Examinations for high-value coverage
- Special Conditions: Stunt work, extreme conditions, international filming

### Errors and Omissions (E&O)
- Coverage: $1M-$10M for legal liability from content
- Requirements: Script clearance, music rights, chain of title
- International Considerations: Multiple jurisdiction coverage
- Retroactive Coverage: Protection for pre-production activities

### Workers' Compensation
- Jurisdiction Compliance: UK, US, international requirements
- Rate Classification: Office (0.5-1%), Production (3-6%), Stunts (12-20%)
- International Extensions: Foreign filming coverage
- Medical Evacuation: Remote location requirements

### Completion Bond
- Bond Requirement: Typically required for budgets over $5M
- Bondable Budget: Total production costs excluding financing
- Rate Structure: 3-6% of bondable budget
- Rebate Potential: 20-50% for on-time, on-budget delivery
- Delivery Requirements: Chain of title, lab access, distribution agreements

## Specialized Risk Categories

### Technical Innovation Risks
- Custom Equipment Development: Higher premiums for untested technology
- Performance Guarantees: Coverage for equipment failure delays
- Testing Requirements: Extensive pre-production testing protocols
- Engineering Certification: Professional engineering approval required

### International Production Risks
- Political Risk: Government action, civil unrest, currency restrictions
- Medical Evacuation: Emergency medical transport from remote locations
- Currency Fluctuation: Exchange rate protection for long productions
- Customs and Carnet: Equipment import/export complications

### High-Risk Activity Coverage
- Stunt Work: Specialized stunt performer coverage and coordination
- Animal Work: Animal mortality, trainer liability, public safety
- Underwater Work: Diver safety, equipment protection, emergency response
- Aerial Work: Aircraft operation, equipment mounting, crew safety

### Environmental and Location Risks
- Weather Delays: Extra expense coverage for weather interruptions
- Natural Disasters: Force majeure coverage for production interruption
- Remote Locations: Extended emergency response and evacuation
- Hazardous Environments: Special safety protocols and equipment

## Risk Assessment Methodology

### Production Risk Factors
- Technical Complexity: Experimental equipment, new techniques
- Schedule Risk: Compressed timelines, weather dependence
- Location Risk: Remote, international, politically unstable areas
- Cast Risk: Essential personnel concentration, health factors
- Financial Risk: Budget adequacy, completion probability

### Historical Analysis
- Previous Claims Experience: Director, producer, company history
- Similar Production Analysis: Comparable project outcomes
- Industry Loss Ratios: Historical claim patterns by category
- Vendor Track Record: Equipment supplier and location reliability

### Mitigation Requirements
- Safety Protocols: Detailed safety procedures and training
- Emergency Planning: Comprehensive emergency response plans
- Quality Control: Equipment testing and certification requirements
- Supervision Requirements: Safety coordinators and specialists

## Premium Calculation Factors

### Base Rate Determination
- Industry Standard Rates: Starting point for each coverage type
- Production Scale Adjustment: Budget size impacts on rates
- Geographic Factors: Location-specific risk multipliers
- Seasonal Considerations: Weather and timing factors

### Risk Multipliers
- High-Risk Activities: Stunts, animals, underwater, aerial work
- Technical Complexity: Custom equipment, experimental techniques
- International Operations: Political risk, medical evacuation
- Schedule Pressure: Compressed timelines, weather dependence

### Experience Modifications
- Track Record Adjustments: Based on historical performance
- Safety Record: Previous claims and safety violations
- Financial Stability: Production company financial strength
- Professional References: Industry reputation and relationships

## Output Requirements

Provide comprehensive insurance analysis including:
- Detailed coverage recommendations with limits and deductibles
- Premium calculations with all rate factors and multipliers
- Risk assessment summary with mitigation recommendations
- Compliance verification for all applicable jurisdictions
- Completion bond analysis with bondability assessment
- Alternative coverage scenarios with cost-benefit analysis
- Claims prevention recommendations and safety protocols

### Special Considerations for Revolutionary Productions
- Account for unprecedented risk factors in experimental filmmaking
- Factor in extended development and testing periods for new technology
- Include higher safety margins for unknown risk exposures
- Plan for regulatory approvals of novel safety and insurance approaches
- Budget for specialized expertise in risk assessment and management

Your insurance calculations must balance comprehensive risk protection with practical cost considerations, ensuring the production is fully protected while maintaining budget feasibility for ambitious and technically innovative filmmaking.
`;

class GeminiInsuranceCalculatorService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: "AIzaSyABISxaNzifdIcZUCe408LoKnEz0bia8cI"
    });
  }

  async analyzeInsuranceCalculatorData(jsonInput: string, projectId: string): Promise<{ result?: InsuranceCalculatorOutput; rawResponse?: string; error?: string }> {
    console.log('');
    console.log('🛡️ ===== INSURANCE CALCULATOR ANALYSIS STARTING =====');
    console.log('📅 TIMESTAMP:', new Date().toISOString());
    console.log('🆔 PROJECT_ID:', projectId);
    console.log('📊 METHOD: analyzeInsuranceCalculatorData()');
    console.log('🛡️ =====================================================');
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
Please analyze this insurance calculator data and provide a complete insurance calculator response following the required JSON format:

INSURANCE CALCULATOR DATA:
${jsonInput}

PROJECT ID: ${projectId}

Remember to return ONLY the complete JSON object with all required fields populated according to the specified schema.
`;

      console.log('📊 PROMPT STATS:');
      console.log('  - User prompt length:', prompt.length, 'characters');
      console.log('  - System prompt length:', INSURANCE_CALCULATOR_SYSTEM_PROMPT.length, 'characters');
      console.log('  - Total prompt length:', prompt.length + INSURANCE_CALCULATOR_SYSTEM_PROMPT.length, 'characters');
      
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
          systemInstruction: INSURANCE_CALCULATOR_SYSTEM_PROMPT
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
      console.log('🔄 Calling parseInsuranceCalculatorResponse()...');
      
      const parsedResponse = this.parseInsuranceCalculatorResponse(responseText);

      if (!parsedResponse) {
        console.error('');
        console.error('💥 ========== PARSE FAILURE ==========');
        console.error('❌ CRITICAL ERROR: Failed to parse insurance calculator response from Gemini API');
        console.error('🔍 Parsed response is null/undefined');
        console.error('📊 This indicates JSON parsing or validation failed');
        console.error('🔍 Returning raw response for manual inspection');
        console.error('💥 ===================================');
        console.error('');
        
        return {
          rawResponse: responseText,
          error: 'Failed to parse insurance calculator response'
        };
      }
      
      console.log('✅ PARSE SUCCESS: Valid insurance calculator response received');
      console.log('');
      console.log('🚀 STEP 6: FINAL VALIDATION & COMPLETION');
      
      console.log('📊 FINAL ANALYSIS SUMMARY:');
      try {
        const summary = parsedResponse.insuranceModelOutput;
        console.log('  - Processing status:', summary?.processingLog?.overallProcessingStatus || 'N/A');
        console.log('  - Overall risk level:', summary?.riskAssessment?.overallRisk || 'N/A');
        console.log('  - Insurance grand total:', summary?.insuranceSummary?.grandTotal || 'N/A');
        console.log('  - Completion bond required:', summary?.completionBond?.required || 'N/A');
      } catch (summaryError) {
        console.log('  - Summary extraction failed:', summaryError.message);
        console.log('  - But analysis data is still complete');
      }

      console.log('');
      console.log('🎉 ========== INSURANCE CALCULATOR ANALYSIS COMPLETE ==========');
      console.log('✅ Insurance calculator analysis completed successfully!');
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
      console.error('❌ Error in insurance calculator analysis:', error);
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

  private parseInsuranceCalculatorResponse(responseText: string): any | null {
    console.log('');
    console.log('🔍 ===== INSURANCE CALCULATOR RESPONSE PARSING & VALIDATION =====');
    console.log('📅 Parse timestamp:', new Date().toISOString());
    console.log('🔍 =================================================================');
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
      console.error('❌ Error parsing insurance calculator response:', error);
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      console.error('Response length:', responseText.length);
      console.error('Response preview:', responseText.substring(0, 1000));
      
      return null;
    }
  }
}

// Export singleton instance
export const geminiInsuranceCalculatorService = new GeminiInsuranceCalculatorService();

// Export helper function
export const analyzeInsuranceCalculatorWithAI = async (
  jsonInput: string,
  projectId: string,
  onProgress?: (status: string) => void
): Promise<{ status: 'completed' | 'error'; result?: any; error?: string; rawResponse?: string }> => {
  console.log('');
  console.log('🎯 ===== INSURANCE CALCULATOR AI HELPER FUNCTION CALLED =====');
  console.log('📅 TIMESTAMP:', new Date().toISOString());
  console.log('🆔 PROJECT_ID:', projectId);
  console.log('📊 FUNCTION: analyzeInsuranceCalculatorWithAI()');
  console.log('🎯 =============================================================');
  console.log('');
  
  try {
    console.log('🚀 HELPER: Starting insurance calculator analysis...');
    console.log('📊 HELPER: Input JSON length:', jsonInput.length, 'characters');
    console.log('📊 HELPER: Project ID:', projectId);
    console.log('📊 HELPER: Progress callback provided:', !!onProgress);
    
    onProgress?.('Starting insurance calculator analysis...');
    console.log('📢 HELPER: Progress callback called - Starting analysis');
    
    console.log('🔄 HELPER: Calling geminiInsuranceCalculatorService.analyzeInsuranceCalculatorData()...');
    const analysisResult = await geminiInsuranceCalculatorService.analyzeInsuranceCalculatorData(jsonInput, projectId);
    
    console.log('✅ HELPER: Analysis completed!');
    console.log('📊 HELPER: Result type:', typeof analysisResult);
    console.log('📊 HELPER: Has result:', !!analysisResult?.result);
    console.log('📊 HELPER: Has raw response:', !!analysisResult?.rawResponse);
    console.log('📊 HELPER: Has error:', !!analysisResult?.error);
    
    if (analysisResult?.result) {
      onProgress?.('Insurance calculator completed successfully!');
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
    console.error('❌ HELPER: Insurance calculator analysis failed:', error);
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