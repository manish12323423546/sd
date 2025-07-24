import { GoogleGenAI } from "@google/genai";

// Location Cost Estimator Output Types
export interface LocationCostOutput {
  locationModelOutput: {
    processingLog: {
      locationFeeEstimation: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      permitCostCalculation: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      securityRequirementsProcessing: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      restorationCostProcessing: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      parkingFacilitiesProcessing: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      overallProcessingStatus: string;
    };
    locationFees: {
      practicalLocations: Array<{
        id: string;
        name: string;
        country: string;
        description: string;
        cost: string;
      }>;
      studioFacilities: {
        id: string;
        name: string;
        description: string;
        cost: string;
      };
      holdDays: {
        description: string;
        cost: string;
      };
      locationFeesTotal: string;
    };
    permits: {
      international: {
        description: string;
        cost: string;
      };
      uk: {
        description: string;
        cost: string;
      };
      aviation: {
        description: string;
        cost: string;
      };
      permitsTotal: string;
    };
    locationSupport: {
      security: {
        description: string;
        cost: string;
        securityTotal: string;
      };
      transportation: {
        description: string;
        cost: string;
        transportationTotal: string;
      };
      accommodation: {
        description: string;
        cost: string;
        accommodationTotal: string;
      };
      facilities: {
        description: string;
        cost: string;
        facilitiesTotal: string;
      };
    };
    specialRequirements: {
      animalWork: {
        description: string;
        cost: string;
        animalTotal: string;
      };
      customConstruction: {
        description: string;
        cost: string;
        constructionTotal: string;
      };
      internationalLogistics: {
        description: string;
        cost: string;
        total: string;
      };
      specialTotal: string;
    };
    contingency: {
      percentage: string;
      amount: string;
    };
    locationGrandTotal: {
      fees: string;
      permits: string;
      security: string;
      transportation: string;
      accommodation: string;
      facilities: string;
      special: string;
      subtotal: string;
      contingency: string;
      total: string;
    };
  };
}

// System Prompt for Location Cost Estimator
const LOCATION_COST_ESTIMATOR_SYSTEM_PROMPT = `
LOCATION COST ESTIMATOR SYSTEM PROMPT
=====================================

You are the Location Cost Estimator for a multi-model film budget system. Your responsibility is to calculate all location-related expenses including fees, permits, logistics, support services, and special construction requirements for complex international productions.

## REQUIRED PROCESSING SEQUENCE

Before generating any output, you MUST perform the following processing steps using function calling:

### 1. Location Fee Estimation Processing
Use function calling to:
- Estimate location fees for all venues
- Calculate studio versus practical location rates
- Factor in hold days and prep period charges
- Include government and authority fees

### 2. Permit Cost Calculation Processing
Use function calling to:
- Calculate permit costs for all jurisdictions
- Include filming licenses and authorizations
- Factor in special event permits
- Add environmental and safety clearances

### 3. Security Requirements Processing
Use function calling to:
- Add security requirements for all locations
- Calculate personnel and equipment needs
- Factor in crowd control and access management
- Include specialized security for high-value equipment

### 4. Restoration Cost Processing
Use function calling to:
- Factor in restoration costs for all locations
- Calculate damage deposits and bonds
- Include cleanup and reset requirements
- Factor in environmental restoration needs

### 5. Parking and Facilities Processing
Use function calling to:
- Include parking/facilities costs
- Calculate crew and equipment parking needs
- Factor in catering and staging areas
- Include generator and power distribution costs

**CRITICAL: All location costing must be performed through these processing functions before generating final output.**

## Core Functions

1. **Location Fee Calculations**
   - Studio rental rates and facility charges
   - Practical location fees and government charges
   - Permit and licensing costs
   - Hold days and prep period charges
   - Restoration and cleanup deposits

2. **International Filming Costs**
   - Government filming permits and fees
   - Customs and carnet requirements
   - International shipping and logistics
   - Currency exchange considerations
   - Local liaison and fixing services

3. **Support Services Costing**
   - Security requirements and personnel
   - Transportation and vehicle rental
   - Accommodation for cast and crew
   - Catering and craft services
   - Medical and safety services

4. **Infrastructure Development**
   - Temporary facility construction
   - Power generation and distribution
   - Communication systems setup
   - Water and waste management
   - Storage and workshop facilities

## Location Category Processing

### Studio Facilities
- Stage rental rates (daily/weekly/monthly)
- Construction space charges
- Power and utility inclusions
- Workshop and office space
- Storage and equipment handling
- Security and access control

### Practical Locations
- Location fees and permits
- Government liaison requirements
- Local authority approvals
- Environmental impact assessments
- Public liability considerations
- Traffic and crowd control

### Remote/International Locations
- Government filming permits
- Diplomatic and consular fees
- Local fixing and liaison services
- Cultural sensitivity requirements
- Environmental protection measures
- Emergency evacuation planning

## Specialized Costing Areas

### Animal Work Requirements
- Animal welfare permits and approvals
- Professional animal wrangler services
- Veterinary on-site support
- Animal insurance and liability
- Quarantine and health certification
- Humane society oversight

### Custom Set Construction
- Architectural design and engineering
- Specialized mechanical systems
- Safety certification and inspection
- Union construction requirements
- Material and labor costs
- Equipment integration

### High-Security Productions
- Enhanced security protocols
- Background check requirements
- Confidentiality agreements
- Secure storage and handling
- Communication security
- Access control systems

## International Logistics Management

### Shipping and Transportation
- Equipment carnet documentation
- Customs brokerage services
- International shipping rates
- Ground transportation coordination
- Emergency equipment replacement
- Return shipping arrangements

### Legal and Regulatory Compliance
- Work permit and visa costs
- Local union requirements
- Tax treaty implications
- Insurance jurisdictional issues
- Labor law compliance
- Safety regulation adherence

### Cultural and Language Support
- Interpreter and translation services
- Cultural liaison officers
- Local crew hiring requirements
- Community relations management
- Religious and cultural observances
- Local customs and protocols

## Risk Assessment and Mitigation

### Location-Specific Risks
- Weather and seasonal considerations
- Political stability assessment
- Natural disaster contingencies
- Medical emergency planning
- Equipment theft and damage
- Public relations management

### Logistical Risk Factors
- Transportation reliability
- Communication infrastructure
- Power supply consistency
- Water and food safety
- Currency exchange volatility
- Strike and labor disruption

## Cost Control Mechanisms

### Budget Management
- Daily burn rate monitoring
- Vendor payment schedules
- Currency hedging strategies
- Contingency allocation guidelines
- Change order procedures
- Emergency fund protocols

### Quality Assurance
- Vendor qualification standards
- Service level agreements
- Performance monitoring systems
- Backup service providers
- Quality control checkpoints
- Customer satisfaction metrics

## Historical Context Considerations

### 1960s Production Challenges
- Limited international filming experience
- Developing transportation infrastructure
- Less sophisticated communication systems
- Higher coordination complexity
- Extended planning and setup periods
- Greater reliance on local resources

### Pioneering Production Requirements
- First-time international coordination
- Establishing new vendor relationships
- Creating unprecedented facility requirements
- Developing new safety protocols
- Extended testing and preparation periods
- Higher contingency requirements

## Output Requirements

Provide comprehensive breakdowns including:
- Detailed location fee structures
- Complete permit and approval costs
- Transportation and logistics expenses
- Accommodation and support services
- Security and safety requirements
- Construction and infrastructure costs
- Risk assessments and contingencies
- Alternative location options
- Total location costs with confidence intervals

### Special Considerations for Complex Productions
- Account for unprecedented facility requirements
- Factor in extensive testing and preparation periods
- Include costs for developing new vendor relationships
- Plan for regulatory approvals of novel construction
- Budget for extended coordination and planning periods
- Provide substantial contingencies for unknown factors

Your location cost estimates must balance ambitious creative requirements with practical budget constraints, ensuring the production can achieve its vision while maintaining cost control and operational feasibility across multiple international locations.
`;

class GeminiLocationCostService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: "AIzaSyABISxaNzifdIcZUCe408LoKnEz0bia8cI"
    });
  }

  async analyzeLocationCostData(jsonInput: string, projectId: string): Promise<{ result?: LocationCostOutput; rawResponse?: string; error?: string }> {
    console.log('');
    console.log('🏢 ===== LOCATION COST ESTIMATOR ANALYSIS STARTING =====');
    console.log('📅 TIMESTAMP:', new Date().toISOString());
    console.log('🆔 PROJECT_ID:', projectId);
    console.log('📊 METHOD: analyzeLocationCostData()');
    console.log('🏢 ======================================================');
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
Please analyze this location cost data and provide a complete location cost estimator response following the required JSON format:

LOCATION COST DATA:
${jsonInput}

PROJECT ID: ${projectId}

Remember to return ONLY the complete JSON object with all required fields populated according to the specified schema.
`;

      console.log('📊 PROMPT STATS:');
      console.log('  - User prompt length:', prompt.length, 'characters');
      console.log('  - System prompt length:', LOCATION_COST_ESTIMATOR_SYSTEM_PROMPT.length, 'characters');
      console.log('  - Total prompt length:', prompt.length + LOCATION_COST_ESTIMATOR_SYSTEM_PROMPT.length, 'characters');
      
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
          systemInstruction: LOCATION_COST_ESTIMATOR_SYSTEM_PROMPT
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
      console.log('🔄 Calling parseLocationCostResponse()...');
      
      const parsedResponse = this.parseLocationCostResponse(responseText);

      if (!parsedResponse) {
        console.error('');
        console.error('💥 ========== PARSE FAILURE ==========');
        console.error('❌ CRITICAL ERROR: Failed to parse location cost response from Gemini API');
        console.error('🔍 Parsed response is null/undefined');
        console.error('📊 This indicates JSON parsing or validation failed');
        console.error('🔍 Returning raw response for manual inspection');
        console.error('💥 ===================================');
        console.error('');
        
        return {
          rawResponse: responseText,
          error: 'Failed to parse location cost estimator response'
        };
      }
      
      console.log('✅ PARSE SUCCESS: Valid location cost response received');
      console.log('');
      console.log('🚀 STEP 6: FINAL VALIDATION & COMPLETION');
      
      console.log('📊 FINAL ANALYSIS SUMMARY:');
      try {
        const summary = parsedResponse.locationModelOutput;
        console.log('  - Processing status:', summary?.processingLog?.overallProcessingStatus || 'N/A');
        console.log('  - Location fees total:', summary?.locationFees?.locationFeesTotal || 'N/A');
        console.log('  - Permits total:', summary?.permits?.permitsTotal || 'N/A');
        console.log('  - Location grand total:', summary?.locationGrandTotal?.total || 'N/A');
      } catch (summaryError) {
        console.log('  - Summary extraction failed:', summaryError.message);
        console.log('  - But analysis data is still complete');
      }

      console.log('');
      console.log('🎉 ========== LOCATION COST ANALYSIS COMPLETE ==========');
      console.log('✅ Location cost estimator analysis completed successfully!');
      console.log('📁 Parsed response ready for use in application');
      console.log('🎯 Analysis ready for display in UI');
      console.log('🎉 =======================================================');
      console.log('');
      
      return {
        result: parsedResponse,
        rawResponse: responseText
      };

    } catch (error) {
      console.log('');
      console.log('💥 ========== ERROR OCCURRED ==========');
      console.error('❌ Error in location cost estimator analysis:', error);
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

  private parseLocationCostResponse(responseText: string): any | null {
    console.log('');
    console.log('🔍 ===== LOCATION COST RESPONSE PARSING & VALIDATION =====');
    console.log('📅 Parse timestamp:', new Date().toISOString());
    console.log('🔍 ============================================================');
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
      console.error('❌ Error parsing location cost response:', error);
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      console.error('Response length:', responseText.length);
      console.error('Response preview:', responseText.substring(0, 1000));
      
      return null;
    }
  }
}

// Export singleton instance
export const geminiLocationCostService = new GeminiLocationCostService();

// Export helper function
export const analyzeLocationCostWithAI = async (
  jsonInput: string,
  projectId: string,
  onProgress?: (status: string) => void
): Promise<{ status: 'completed' | 'error'; result?: LocationCostOutput; error?: string; rawResponse?: string }> => {
  console.log('');
  console.log('🎯 ===== LOCATION COST AI HELPER FUNCTION CALLED =====');
  console.log('📅 TIMESTAMP:', new Date().toISOString());
  console.log('🆔 PROJECT_ID:', projectId);
  console.log('📊 FUNCTION: analyzeLocationCostWithAI()');
  console.log('🎯 =====================================================');
  console.log('');
  
  try {
    console.log('🚀 HELPER: Starting location cost estimator analysis...');
    console.log('📊 HELPER: Input JSON length:', jsonInput.length, 'characters');
    console.log('📊 HELPER: Project ID:', projectId);
    console.log('📊 HELPER: Progress callback provided:', !!onProgress);
    
    onProgress?.('Starting location cost estimator analysis...');
    console.log('📢 HELPER: Progress callback called - Starting analysis');
    
    console.log('🔄 HELPER: Calling geminiLocationCostService.analyzeLocationCostData()...');
    const analysisResult = await geminiLocationCostService.analyzeLocationCostData(jsonInput, projectId);
    
    console.log('✅ HELPER: Analysis completed!');
    console.log('📊 HELPER: Result type:', typeof analysisResult);
    console.log('📊 HELPER: Has result:', !!analysisResult?.result);
    console.log('📊 HELPER: Has raw response:', !!analysisResult?.rawResponse);
    console.log('📊 HELPER: Has error:', !!analysisResult?.error);
    
    if (analysisResult?.result) {
      onProgress?.('Location cost estimator completed successfully!');
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
    console.error('❌ HELPER: Location cost analysis failed:', error);
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