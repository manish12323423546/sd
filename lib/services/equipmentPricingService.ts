import { GoogleGenAI } from "@google/genai";

// Equipment Pricing Engine Output Types
export interface EquipmentPricingOutput {
  equipmentModelOutput: {
    processingLog: {
      equipmentVendorMatching: {
        executed: boolean;
        timestamp: string;
        vendorCatalogsProcessed: number;
        status: string;
      };
      dailyWeeklyRateCalculation: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      volumeDiscountProcessing: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      insuranceRequirementsProcessing: {
        executed: boolean;
        timestamp: string;
        coverageValuesCalculated: string;
        premiumsFactored: string;
        status: string;
      };
      transportationCostProcessing: {
        executed: boolean;
        timestamp: string;
        shippingExpensesCalculated: string;
        status: string;
      };
      overallProcessingStatus: string;
    };
    camera: {
      primaryPackages: {
        item: string;
        description: string;
        cost: string;
      };
      specialtyRigs: {
        item: string;
        description: string;
        cost: string;
      };
      accessories: {
        item: string;
        description: string;
        cost: string;
      };
      expendables: {
        item: string;
        description: string;
        cost: string;
      };
      cameraSubtotal: string;
    };
    lighting: {
      studioPackage: {
        item: string;
        description: string;
        cost: string;
      };
      specialtyLighting: {
        item: string;
        description: string;
        cost: string;
      };
      generators: {
        item: string;
        description: string;
        cost: string;
      };
      rigging: {
        item: string;
        description: string;
        cost: string;
      };
      expendables: {
        item: string;
        description: string;
        cost: string;
      };
      lightingSubtotal: string;
    };
    grip: {
      dollies: {
        item: string;
        description: string;
        cost: string;
      };
      cranes: {
        item: string;
        description: string;
        cost: string;
      };
      rigging: {
        item: string;
        description: string;
        cost: string;
      };
      expendables: {
        item: string;
        description: string;
        cost: string;
      };
      gripSubtotal: string;
    };
    sound: {
      recordingPackage: {
        item: string;
        description: string;
        cost: string;
      };
      specialRecording: {
        item: string;
        description: string;
        cost: string;
      };
      communications: {
        item: string;
        description: string;
        cost: string;
      };
      expendables: {
        item: string;
        description: string;
        cost: string;
      };
      soundSubtotal: string;
    };
    specialEffects: {
      mechanicalEffects: {
        item: string;
        description: string;
        cost: string;
      };
      opticalEffects: {
        item: string;
        description: string;
        cost: string;
      };
      specialEffectsSubtotal: string;
    };
    postProduction: {
      editingRooms: {
        item: string;
        description: string;
        cost: string;
      };
      soundMixing: {
        item: string;
        description: string;
        cost: string;
      };
      opticalWork: {
        item: string;
        description: string;
        cost: string;
      };
      postSubtotal: string;
    };
    transportation: {
      equipmentTrucks: {
        item: string;
        description: string;
        cost: string;
      };
      specialTransport: {
        item: string;
        description: string;
        cost: string;
      };
      transportSubtotal: string;
    };
    equipmentGrandTotal: {
      subtotal: string;
      contingency: string;
      insurance: string;
      total: string;
    };
  };
}

// System Prompt for Equipment Pricing Engine
const EQUIPMENT_PRICING_ENGINE_SYSTEM_PROMPT = `
EQUIPMENT PRICING ENGINE SYSTEM PROMPT
=====================================

You are the Equipment Pricing Engine for a multi-model film budget system. Your responsibility is to estimate all equipment rental and purchase costs for film production, specializing in both standard industry equipment and custom-built specialty items for complex productions.

## REQUIRED PROCESSING SEQUENCE

Before generating any output, you MUST perform the following processing steps using function calling:

### 1. Equipment-Vendor Catalog Matching Processing
Use function calling to:
- Match equipment to vendor catalogs
- Verify equipment availability and specifications
- Cross-reference technical requirements
- Validate vendor capabilities and reliability

### 2. Daily/Weekly Rate Calculation Processing
Use function calling to:
- Calculate daily/weekly rates for all equipment
- Apply tiered pricing structures
- Factor in seasonal rate variations
- Include setup and breakdown costs

### 3. Volume Discount Processing
Use function calling to:
- Apply volume discounts for bulk rentals
- Calculate package deal savings
- Factor in long-term rental discounts
- Include loyalty program benefits

### 4. Insurance Requirements Processing
Use function calling to:
- Add insurance requirements for all equipment
- Calculate coverage values and premiums
- Factor in specialized equipment risks
- Include deductible considerations

### 5. Transportation Cost Processing
Use function calling to:
- Factor in transportation costs
- Calculate shipping and logistics expenses
- Include international transport considerations
- Add handling and delivery charges

**CRITICAL: All equipment pricing must be performed through these processing functions before generating final output.**

## Core Functions

1. **Camera Equipment Pricing**
   - Standard camera packages (Mitchell, Panavision, etc.)
   - Specialty cameras (70mm, high-speed, underwater)
   - Custom camera mounts and rigs
   - Lens packages (primes, zooms, specialty)
   - Camera support equipment (dollies, cranes, steadicam)

2. **Lighting Equipment Pricing**
   - Studio lighting packages
   - Location lighting requirements
   - Generator and power distribution
   - Special effects lighting
   - Rigging and grip equipment

3. **Specialty Equipment Pricing**
   - Motion control systems
   - Front projection equipment
   - Underwater housings and life support
   - Wire rigs and safety systems
   - Custom-built mechanical effects

4. **Post-Production Equipment**
   - Editing room setups
   - Sound mixing facilities
   - Optical printing equipment
   - Model photography setups

## Pricing Methodology

### Vendor Tier Classification
- **Premium Tier**: Top-end rental houses with latest equipment
- **Standard Tier**: Established vendors with reliable equipment
- **Budget Tier**: Smaller vendors for basic equipment needs
- **Custom Build**: For equipment that doesn't exist commercially

### Rate Structure Analysis
- Daily, weekly, and monthly rates
- Volume discounts for long-term rentals
- Package deals vs. individual item pricing
- Seasonal pricing variations
- Geographic location multipliers

### Cost Components
- Base rental rates
- Insurance requirements
- Transportation and delivery
- Setup and operation costs
- Maintenance and repair allowances
- Expendables and consumables

## Specialty Equipment Categories

### Motion Control Systems
- Calculate custom build costs for precision systems
- Factor in programming and operation time
- Include model rigging and support equipment
- Account for spare parts and backup systems

### Centrifuge and Rotating Set Equipment
- Custom construction costs
- Safety certification requirements
- Specialized camera mounting systems
- Electrical and mechanical maintenance

### Zero Gravity Simulation
- Wire rig construction and installation
- Harness systems and safety equipment
- Computer-controlled winch systems
- Rehearsal and training time

### Front Projection Systems
- High-intensity projectors
- Precision alignment systems
- Reflective screen materials
- Background plate preparation

### Underwater Equipment
- Pressure housing construction
- Life support systems
- Underwater lighting packages
- Safety and rescue equipment

## Historical Context Adjustments

### 1960s Technology Considerations
- Limited electronic systems (mostly mechanical)
- Film-based recording (no digital systems)
- Custom fabrication requirements
- Longer development and testing periods
- Higher labor intensity for equipment operation

### Pioneering Equipment Costs
- First-time development expenses
- Prototype testing and refinement
- Limited vendor availability
- Higher insurance requirements
- Extended research and development periods

## Vendor Relationship Management

### Preferred Vendor Pricing
- Long-term relationship discounts
- Package deal negotiations
- Priority booking agreements
- Technical support inclusions

### International Considerations
- Equipment shipping and customs
- Currency exchange factors
- Local vendor partnerships
- Regulatory compliance costs

## Risk Assessment and Contingencies

### Equipment Failure Provisions
- Backup equipment requirements
- Rapid replacement capabilities
- On-site repair technician availability
- Emergency rental agreements

### Technology Development Risks
- Prototype equipment reliability
- Custom build timeline risks
- Performance specification guarantees
- Alternative equipment fallback plans

## Quality Control Standards

### Equipment Specifications
- Verify technical requirements against script needs
- Ensure compatibility between different systems
- Validate safety certifications and compliance
- Cross-check capacity against shooting schedule

### Cost Validation
- Compare rates against industry standards
- Verify vendor quotes and availability
- Account for all auxiliary costs
- Factor in realistic contingency allowances

## Output Requirements

Provide detailed breakdowns including:
- Line-item equipment costs by category
- Vendor information and contact details
- Rental duration and scheduling
- Transportation and setup costs
- Insurance and risk assessments
- Alternative equipment options
- Total equipment costs with confidence intervals

### Special Considerations for Revolutionary Productions
- Account for equipment that doesn't yet exist
- Factor in custom development time and costs
- Include extensive testing and calibration periods
- Plan for multiple prototype iterations
- Budget for extensive crew training on new equipment

Your equipment pricing must balance cutting-edge technical requirements with realistic budget constraints, ensuring the production has access to the tools needed while maintaining cost control and schedule feasibility.
`;

class GeminiEquipmentPricingService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: "AIzaSyABISxaNzifdIcZUCe408LoKnEz0bia8cI"
    });
  }

  async analyzeEquipmentPricingData(jsonInput: string, projectId: string): Promise<{ result?: EquipmentPricingOutput; rawResponse?: string; error?: string }> {
    console.log('');
    console.log('🎬 ===== EQUIPMENT PRICING ENGINE ANALYSIS STARTING =====');
    console.log('📅 TIMESTAMP:', new Date().toISOString());
    console.log('🆔 PROJECT_ID:', projectId);
    console.log('📊 METHOD: analyzeEquipmentPricingData()');
    console.log('🎬 ========================================================');
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
Please analyze this equipment pricing data and provide a complete equipment pricing engine response following the required JSON format:

EQUIPMENT PRICING DATA:
${jsonInput}

PROJECT ID: ${projectId}

Remember to return ONLY the complete JSON object with all required fields populated according to the specified schema.
`;

      console.log('📊 PROMPT STATS:');
      console.log('  - User prompt length:', prompt.length, 'characters');
      console.log('  - System prompt length:', EQUIPMENT_PRICING_ENGINE_SYSTEM_PROMPT.length, 'characters');
      console.log('  - Total prompt length:', prompt.length + EQUIPMENT_PRICING_ENGINE_SYSTEM_PROMPT.length, 'characters');
      
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
          systemInstruction: EQUIPMENT_PRICING_ENGINE_SYSTEM_PROMPT
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
      console.log('🔄 Calling parseEquipmentPricingResponse()...');
      
      const parsedResponse = this.parseEquipmentPricingResponse(responseText);

      if (!parsedResponse) {
        console.error('');
        console.error('💥 ========== PARSE FAILURE ==========');
        console.error('❌ CRITICAL ERROR: Failed to parse equipment pricing response from Gemini API');
        console.error('🔍 Parsed response is null/undefined');
        console.error('📊 This indicates JSON parsing or validation failed');
        console.error('🔍 Returning raw response for manual inspection');
        console.error('💥 ===================================');
        console.error('');
        
        return {
          rawResponse: responseText,
          error: 'Failed to parse equipment pricing engine response'
        };
      }
      
      console.log('✅ PARSE SUCCESS: Valid equipment pricing response received');
      console.log('');
      console.log('🚀 STEP 6: FINAL VALIDATION & COMPLETION');
      
      console.log('📊 FINAL ANALYSIS SUMMARY:');
      try {
        const summary = parsedResponse.equipmentModelOutput;
        console.log('  - Processing status:', summary?.processingLog?.overallProcessingStatus || 'N/A');
        console.log('  - Camera subtotal:', summary?.camera?.cameraSubtotal || 'N/A');
        console.log('  - Lighting subtotal:', summary?.lighting?.lightingSubtotal || 'N/A');
        console.log('  - Equipment grand total:', summary?.equipmentGrandTotal?.total || 'N/A');
      } catch (summaryError) {
        console.log('  - Summary extraction failed:', summaryError.message);
        console.log('  - But analysis data is still complete');
      }

      console.log('');
      console.log('🎉 ========== EQUIPMENT PRICING ANALYSIS COMPLETE ==========');
      console.log('✅ Equipment pricing engine analysis completed successfully!');
      console.log('📁 Parsed response ready for use in application');
      console.log('🎯 Analysis ready for display in UI');
      console.log('🎉 ==========================================================');
      console.log('');
      
      return {
        result: parsedResponse,
        rawResponse: responseText
      };

    } catch (error) {
      console.log('');
      console.log('💥 ========== ERROR OCCURRED ==========');
      console.error('❌ Error in equipment pricing engine analysis:', error);
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

  private parseEquipmentPricingResponse(responseText: string): any | null {
    console.log('');
    console.log('🔍 ===== EQUIPMENT PRICING RESPONSE PARSING (RAW JSON) =====');
    console.log('📅 Parse timestamp:', new Date().toISOString());
    console.log('🔍 ==========================================================');
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
      console.error('❌ Error parsing equipment pricing response:', error);
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      console.error('Response length:', responseText.length);
      console.error('Response preview:', responseText.substring(0, 1000));
      
      return null;
    }
  }
}

// Export singleton instance
export const geminiEquipmentPricingService = new GeminiEquipmentPricingService();

// Export helper function
export const analyzeEquipmentPricingWithAI = async (
  jsonInput: string,
  projectId: string,
  onProgress?: (status: string) => void
): Promise<{ status: 'completed' | 'error'; result?: EquipmentPricingOutput; error?: string; rawResponse?: string }> => {
  console.log('');
  console.log('🎯 ===== EQUIPMENT PRICING AI HELPER FUNCTION CALLED =====');
  console.log('📅 TIMESTAMP:', new Date().toISOString());
  console.log('🆔 PROJECT_ID:', projectId);
  console.log('📊 FUNCTION: analyzeEquipmentPricingWithAI()');
  console.log('🎯 ========================================================');
  console.log('');
  
  try {
    console.log('🚀 HELPER: Starting equipment pricing engine analysis...');
    console.log('📊 HELPER: Input JSON length:', jsonInput.length, 'characters');
    console.log('📊 HELPER: Project ID:', projectId);
    console.log('📊 HELPER: Progress callback provided:', !!onProgress);
    
    onProgress?.('Starting equipment pricing engine analysis...');
    console.log('📢 HELPER: Progress callback called - Starting analysis');
    
    console.log('🔄 HELPER: Calling geminiEquipmentPricingService.analyzeEquipmentPricingData()...');
    const analysisResult = await geminiEquipmentPricingService.analyzeEquipmentPricingData(jsonInput, projectId);
    
    console.log('✅ HELPER: Analysis completed!');
    console.log('📊 HELPER: Result type:', typeof analysisResult);
    console.log('📊 HELPER: Has result:', !!analysisResult?.result);
    console.log('📊 HELPER: Has raw response:', !!analysisResult?.rawResponse);
    console.log('📊 HELPER: Has error:', !!analysisResult?.error);
    
    if (analysisResult?.result) {
      onProgress?.('Equipment pricing engine completed successfully!');
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
    console.error('❌ HELPER: Equipment pricing analysis failed:', error);
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