import { GoogleGenAI } from "@google/genai";

// Post-Production Estimator Output Types
export interface PostProductionEstimatorOutput {
  postProductionModelOutput: {
    processingLog: {
      editorialTimeEstimation: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      vfxCostCalculation: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      soundDesignMixing: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      colorCorrection: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      deliveryCost: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      overallProcessingStatus: string;
    };
    editorialCosts: {
      personnel: {
        supervisingEditor: {
          rate: number;
          weeks: number;
          cost: number;
        };
        editor: {
          rate: number;
          weeks: number;
          cost: number;
        };
        assistantEditors: {
          rate: number;
          weeks: number;
          cost: number;
        };
        apprenticeEditors: {
          rate: number;
          weeks: number;
          cost: number;
        };
      };
      facilities: {
        editingSuites: {
          rate: number;
          months: number;
          cost: number;
        };
        screeningRooms: {
          rate: number;
          days: number;
          cost: number;
        };
        equipmentRental: {
          cost: number;
        };
        storage: {
          cost: number;
        };
      };
      timeline: {
        assemblyEdit: number;
        roughCut: number;
        fineCut: number;
        conformFinish: number;
        totalWeeks: number;
      };
      editorialSubtotal: number;
    };
    visualEffects: {
      shotBreakdown: {
        simpleShots: {
          count: number;
          avgCost: number;
          totalCost: number;
        };
        mediumShots: {
          count: number;
          avgCost: number;
          totalCost: number;
        };
        complexShots: {
          count: number;
          avgCost: number;
          totalCost: number;
        };
      };
      customEquipment: {
        slitScanApparatus: {
          developmentCost: number;
          operationCost: number;
          totalCost: number;
        };
        motionControlSystems: {
          developmentCost: number;
          operationCost: number;
          totalCost: number;
        };
        opticalPrinters: {
          developmentCost: number;
          operationCost: number;
          totalCost: number;
        };
        modelPhotographyRigs: {
          developmentCost: number;
          operationCost: number;
          totalCost: number;
        };
      };
      timeline: {
        developmentPhase: number;
        testingPhase: number;
        productionPhase: number;
        postProductionPhase: number;
        totalMonths: number;
      };
      vfxSubtotal: number;
    };
    soundPostProduction: {
      dialogueADR: {
        dialogueEditor: {
          rate: number;
          weeks: number;
          cost: number;
        };
        adrSessions: {
          rate: number;
          days: number;
          cost: number;
        };
        dialogueCleanup: {
          rate: number;
          hours: number;
          cost: number;
        };
        voiceProcessing: {
          cost: number;
        };
      };
      soundEffectsDesign: {
        soundDesigner: {
          rate: number;
          weeks: number;
          cost: number;
        };
        soundLibraryCreation: {
          cost: number;
        };
        customSoundCreation: {
          cost: number;
        };
        foleyRecording: {
          rate: number;
          days: number;
          cost: number;
        };
      };
      musicProduction: {
        composerFee: {
          cost: number;
        };
        orchestraRecording: {
          cost: number;
        };
        musicEditing: {
          rate: number;
          weeks: number;
          cost: number;
        };
        musicMixing: {
          rate: number;
          weeks: number;
          cost: number;
        };
      };
      finalMixing: {
        mixingStage: {
          rate: number;
          weeks: number;
          cost: number;
        };
        mixingTeam: {
          rate: number;
          weeks: number;
          cost: number;
        };
        sixTrackStereo: {
          cost: number;
        };
        multipleVersions: {
          cost: number;
        };
      };
      soundSubtotal: number;
    };
    colorFinishing: {
      colorTimingGrading: {
        colorTimer: {
          rate: number;
          weeks: number;
          cost: number;
        };
        gradingSupervision: {
          rate: number;
          weeks: number;
          cost: number;
        };
        laboratoryServices: {
          cost: number;
        };
      };
      labServicesPrintProduction: {
        answerPrints: {
          cost: number;
        };
        releasePrints: {
          costPerPrint: number;
          quantity: number;
          totalCost: number;
        };
        seventymmBlowup: {
          cost: number;
        };
        specialFormats: {
          cost: number;
        };
      };
      colorSubtotal: number;
    };
    deliveryDistribution: {
      masterElements: {
        thirtyfivemmCameraNegative: {
          cost: number;
        };
        seventymmMasters: {
          cost: number;
        };
        magneticMasters: {
          cost: number;
        };
        archivalElements: {
          cost: number;
        };
      };
      internationalVersioning: {
        subtitling: {
          costPerLanguage: number;
          languages: number;
          totalCost: number;
        };
        dubbing: {
          costPerLanguage: number;
          languages: number;
          totalCost: number;
        };
        internationalME: {
          cost: number;
        };
        culturalAdaptation: {
          cost: number;
        };
      };
      deliverySubtotal: number;
    };
    riskContingencies: {
      technicalInnovationRisks: {
        equipmentDevelopment: {
          baseAmount: number;
          contingencyPercentage: number;
          contingencyAmount: number;
        };
        techniqueDevelopment: {
          baseAmount: number;
          contingencyPercentage: number;
          contingencyAmount: number;
        };
        integrationChallenges: {
          baseAmount: number;
          contingencyPercentage: number;
          contingencyAmount: number;
        };
      };
      scheduleRisks: {
        customEquipmentDelays: {
          cost: number;
        };
        creativeIteration: {
          cost: number;
        };
        technicalProblemSolving: {
          cost: number;
        };
        qualityControl: {
          cost: number;
        };
      };
      totalContingency: number;
    };
    postProductionSummary: {
      editorial: number;
      visualEffects: number;
      sound: number;
      colorFinishing: number;
      delivery: number;
      contingencies: number;
      subtotal: number;
      overhead: number;
      grandTotal: number;
    };
    timeline: {
      preProduction: number;
      principalPhotography: number;
      postProduction: number;
      delivery: number;
      totalMonths: number;
    };
    qualityMetrics: {
      shotCount: number;
      vfxShotCount: number;
      soundCues: number;
      musicCues: number;
      deliveryFormats: number;
      languages: number;
    };
  };
}

// System Prompt for Post-Production Estimator
const POST_PRODUCTION_ESTIMATOR_SYSTEM_PROMPT = `
POST-PRODUCTION ESTIMATOR SYSTEM PROMPT
=======================================

You are the Post-Production Estimator for a multi-model film budget system. Your responsibility is to calculate all post-production costs including editorial, visual effects, sound, music, color correction, and delivery for complex, technically innovative productions.

## REQUIRED PROCESSING SEQUENCE

Before generating any output, you MUST perform the following processing steps using function calling:

### 1. Editorial Time Estimation Processing
Use function calling to:
- Estimate editorial time for all phases
- Calculate rough cut and fine cut periods
- Factor in complexity and shot count
- Include conforming and finishing time

### 2. VFX Cost Calculation Processing
Use function calling to:
- Calculate VFX costs by shot complexity
- Factor in custom equipment development
- Include testing and R&D time
- Calculate vendor and facility costs

### 3. Sound Design and Mixing Processing
Use function calling to:
- Price sound design/mixing requirements
- Calculate ADR and dialogue editing
- Factor in music recording and composition
- Include final mixing and delivery

### 4. Color Correction Processing
Use function calling to:
- Factor in color correction requirements
- Calculate color timing and grading
- Include lab services and print costs
- Factor in multiple format delivery

### 5. Delivery Cost Processing
Use function calling to:
- Add delivery costs for all formats
- Calculate master creation expenses
- Include international versioning
- Factor in archive and preservation

**CRITICAL: All post-production estimating must be performed through these processing functions before generating final output.**

## Core Functions

### Editorial Cost Estimation
- Calculate editing room and equipment rental costs
- Estimate editor and assistant editor labor costs
- Determine screening room and projection requirements
- Calculate film stock and magnetic stock needs
- Assess editorial timeline and facility requirements

### Visual Effects Cost Analysis
- Evaluate VFX shot complexity and count
- Calculate custom equipment development costs
- Estimate model construction and photography costs
- Assess optical effects and compositing requirements
- Determine motion control and specialized rig costs

### Sound Post-Production Estimation
- Calculate dialogue editing and ADR requirements
- Estimate sound effects creation and library costs
- Determine foley recording and editing needs
- Calculate music composition, recording, and mixing costs
- Assess final mixing and delivery requirements

### Delivery and Distribution Costing
- Calculate color timing and lab services
- Estimate print production and duplication costs
- Determine international versioning requirements
- Calculate archive and preservation costs
- Assess multiple format delivery needs

## Editorial Department Costing

### Personnel Requirements
- Supervising Editor: $1,500-$4,000/week (1960s rates)
- Editor: $1,200-$2,500/week
- Assistant Editors: $600-$1,200/week
- Apprentice Editors: $300-$600/week
- Editorial Coordinator: $800-$1,500/week

### Facility and Equipment
- Editing Suites: $2,000-$5,000/month per suite
- Screening Rooms: $200-$500/day
- Equipment Rental: Moviolas, synchronizers, viewers
- Storage: Film vaults, work print storage, magnetic storage
- Projection Equipment: 35mm, 70mm, specialized formats

### Timeline Considerations
- Assembly Edit: 4-8 weeks for feature length
- Rough Cut: 6-12 weeks depending on complexity
- Fine Cut: 8-20 weeks for complex narratives
- Conform and Finish: 2-6 weeks for final preparation

## Visual Effects Cost Analysis

### Revolutionary 1960s VFX Techniques
- Slit-Scan Photography: Custom equipment development and operation
- Front Projection: Specialized projection systems and background plates
- Motion Control: Precision camera movement systems
- Optical Compositing: Multiple exposure and matte techniques
- Model Photography: Detailed miniature construction and filming

### VFX Shot Categories
- Simple Shots: $1,000-$5,000 (basic composites, simple models)
- Medium Shots: $5,000-$15,000 (complex composites, detailed models)
- Complex Shots: $15,000-$50,000 (revolutionary techniques, multiple elements)

### Custom Equipment Development
- Slit-Scan Apparatus: $50,000-$150,000 development cost
- Motion Control Systems: $100,000-$300,000 for precision rigs
- Optical Printers: $25,000-$75,000 for specialized configurations
- Model Photography Rigs: $50,000-$200,000 for complex setups

### Production Timeline
- Development Phase: 3-6 months for custom equipment
- Testing Phase: 2-4 months for technique refinement
- Production Phase: 6-18 months for shot completion
- Post-Production: 3-6 months for finishing and integration

## Sound Post-Production Estimation

### Dialogue and ADR
- Dialogue Editor: $1,200-$2,500/week
- ADR Sessions: $800-$2,000/day including studio and talent
- Dialogue Cleanup: $50-$150/hour for specialized processing
- Voice Processing: Custom techniques for character voices

### Sound Effects and Design
- Sound Designer: $1,500-$3,000/week
- Sound Library Creation: $50,000-$200,000 for comprehensive library
- Custom Sound Creation: $25,000-$100,000 for unique soundscapes
- Foley Recording: $500-$1,500/day including artists and stage

### Music Production
- Composer Fee: $200,000-$1,000,000 for major productions
- Orchestra Recording: $150,000-$500,000 for full orchestra sessions
- Music Editing: $1,000-$2,000/week
- Music Mixing: $2,000-$5,000/week

### Final Mixing
- Mixing Stage: $5,000-$15,000/week for major facility
- Mixing Team: $8,000-$20,000/week for complete crew
- 6-Track Stereo: Premium for advanced format mixing
- Multiple Versions: Mono, stereo, international mixes

## Color and Finishing Costs

### Color Timing and Grading
- Color Timer: $2,000-$4,000/week
- Grading Supervision: $2,500-$5,000/week
- Laboratory Services: $200,000-$500,000 for complete timing

### Lab Services and Print Production
- Answer Prints: $15,000-$40,000 for initial approval prints
- Release Prints: $500-$1,500 per 35mm print
- 70mm Blow-up: $75,000-$200,000 for format conversion
- Special Formats: Premium costs for Cinerama and other systems

## Delivery and Distribution

### Master Elements
- 35mm Camera Negative: $50,000-$150,000 for protection and conforming
- 70mm Masters: $100,000-$300,000 for large format masters
- Magnetic Masters: $25,000-$75,000 for sound masters
- Archival Elements: $50,000-$150,000 for preservation masters

### International Versioning
- Subtitling: $5,000-$15,000 per language
- Dubbing: $25,000-$75,000 per language for feature film
- International M&E: $75,000-$200,000 for music and effects tracks
- Cultural Adaptation: Additional costs for content modification

## Risk Assessment and Contingencies

### Technical Innovation Risks
- Equipment Development: 25-50% contingency for untested technology
- Technique Development: 20-40% contingency for new processes
- Integration Challenges: 15-25% contingency for complex workflows
- Format Compatibility: 10-20% contingency for delivery complications

### Schedule Risk Factors
- Custom Equipment Delays: Extended development and testing periods
- Creative Iteration: Additional time for artistic refinement
- Technical Problem Solving: Extended troubleshooting periods
- Quality Control: Additional time for unprecedented quality standards

### Budget Control Measures
- Milestone Reviews: Regular assessment of progress and costs
- Alternative Approaches: Backup plans for technical challenges
- Vendor Management: Multiple supplier relationships for critical services
- Quality Metrics: Defined standards for acceptable deliverables

## Historical Context Considerations

### 1960s Post-Production Environment
- Limited Digital Technology: All effects achieved practically
- Manual Labor Intensive: Higher crew requirements for complex work
- Extended Development Periods: More time needed for innovation
- Higher Risk Factors: Greater uncertainty in untested techniques
- Premium for Innovation: Higher costs for pioneering work

### Revolutionary Production Factors
- First-Time Development: No existing templates or workflows
- Extended Testing: Multiple iterations to achieve desired results
- Specialized Talent: Premium costs for innovative technical expertise
- Custom Facility Requirements: Modified or purpose-built facilities
- Documentation Requirements: Extensive documentation for unprecedented work

## Output Requirements

Provide detailed post-production budgets including:
- Phase-by-phase cost breakdowns with detailed line items
- Timeline analysis with critical path dependencies
- Risk assessment with appropriate contingency factors
- Alternative scenario planning for different creative approaches
- Facility and equipment requirements with vendor recommendations
- Quality control standards and delivery specifications
- International delivery planning with format and language requirements

### Special Considerations for Revolutionary Productions
- Account for unprecedented technical requirements in experimental filmmaking
- Factor in extended development and testing periods for new technology
- Include higher contingency margins for unknown technical challenges
- Plan for regulatory approvals of novel post-production techniques
- Budget for specialized expertise in innovative post-production workflows

Your post-production estimates must balance ambitious creative and technical goals with practical budget and schedule constraints, ensuring the production can achieve its artistic vision while maintaining cost control and delivery commitments.
`;

class GeminiPostProductionEstimatorService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: "AIzaSyABISxaNzifdIcZUCe408LoKnEz0bia8cI"
    });
  }

  async analyzePostProductionEstimatorData(jsonInput: string, projectId: string): Promise<{ result?: PostProductionEstimatorOutput; rawResponse?: string; error?: string }> {
    console.log('');
    console.log('🎬 ===== POST-PRODUCTION ESTIMATOR ANALYSIS STARTING =====');
    console.log('📅 TIMESTAMP:', new Date().toISOString());
    console.log('🆔 PROJECT_ID:', projectId);
    console.log('📊 METHOD: analyzePostProductionEstimatorData()');
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
Please analyze this post-production estimator data and provide a complete post-production estimator response following the required JSON format:

POST-PRODUCTION ESTIMATOR DATA:
${jsonInput}

PROJECT ID: ${projectId}

Remember to return ONLY the complete JSON object with all required fields populated according to the specified schema.
`;

      console.log('📊 PROMPT STATS:');
      console.log('  - User prompt length:', prompt.length, 'characters');
      console.log('  - System prompt length:', POST_PRODUCTION_ESTIMATOR_SYSTEM_PROMPT.length, 'characters');
      console.log('  - Total prompt length:', prompt.length + POST_PRODUCTION_ESTIMATOR_SYSTEM_PROMPT.length, 'characters');
      
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
          systemInstruction: POST_PRODUCTION_ESTIMATOR_SYSTEM_PROMPT
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
      console.log('🔄 Calling parsePostProductionEstimatorResponse()...');
      
      const parsedResponse = this.parsePostProductionEstimatorResponse(responseText);

      if (!parsedResponse) {
        console.error('');
        console.error('💥 ========== PARSE FAILURE ==========');
        console.error('❌ CRITICAL ERROR: Failed to parse post-production estimator response from Gemini API');
        console.error('🔍 Parsed response is null/undefined');
        console.error('📊 This indicates JSON parsing or validation failed');
        console.error('🔍 Returning raw response for manual inspection');
        console.error('💥 ===================================');
        console.error('');
        
        return {
          rawResponse: responseText,
          error: 'Failed to parse post-production estimator response'
        };
      }
      
      console.log('✅ PARSE SUCCESS: Valid post-production estimator response received');
      console.log('');
      console.log('🚀 STEP 6: FINAL VALIDATION & COMPLETION');
      
      console.log('📊 FINAL ANALYSIS SUMMARY:');
      try {
        const summary = parsedResponse.postProductionModelOutput;
        console.log('  - Processing status:', summary?.processingLog?.overallProcessingStatus || 'N/A');
        console.log('  - Total timeline:', summary?.timeline?.totalMonths || 'N/A', 'months');
        console.log('  - Post-production grand total:', summary?.postProductionSummary?.grandTotal || 'N/A');
        console.log('  - VFX shots count:', summary?.qualityMetrics?.vfxShotCount || 'N/A');
      } catch (summaryError) {
        console.log('  - Summary extraction failed:', summaryError.message);
        console.log('  - But analysis data is still complete');
      }

      console.log('');
      console.log('🎉 ========== POST-PRODUCTION ESTIMATOR ANALYSIS COMPLETE ==========');
      console.log('✅ Post-production estimator analysis completed successfully!');
      console.log('📁 Parsed response ready for use in application');
      console.log('🎯 Analysis ready for display in UI');
      console.log('🎉 ===================================================================');
      console.log('');
      
      return {
        result: parsedResponse,
        rawResponse: responseText
      };

    } catch (error) {
      console.log('');
      console.log('💥 ========== ERROR OCCURRED ==========');
      console.error('❌ Error in post-production estimator analysis:', error);
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

  private parsePostProductionEstimatorResponse(responseText: string): any | null {
    console.log('');
    console.log('🔍 ===== POST-PRODUCTION ESTIMATOR RESPONSE PARSING & VALIDATION =====');
    console.log('📅 Parse timestamp:', new Date().toISOString());
    console.log('🔍 ======================================================================');
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
      console.error('❌ Error parsing post-production estimator response:', error);
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      console.error('Response length:', responseText.length);
      console.error('Response preview:', responseText.substring(0, 1000));
      
      return null;
    }
  }
}

// Export singleton instance
export const geminiPostProductionEstimatorService = new GeminiPostProductionEstimatorService();

// Export helper function
export const analyzePostProductionEstimatorWithAI = async (
  jsonInput: string,
  projectId: string,
  onProgress?: (status: string) => void
): Promise<{ status: 'completed' | 'error'; result?: any; error?: string; rawResponse?: string }> => {
  console.log('');
  console.log('🎯 ===== POST-PRODUCTION ESTIMATOR AI HELPER FUNCTION CALLED =====');
  console.log('📅 TIMESTAMP:', new Date().toISOString());
  console.log('🆔 PROJECT_ID:', projectId);
  console.log('📊 FUNCTION: analyzePostProductionEstimatorWithAI()');
  console.log('🎯 ==================================================================');
  console.log('');
  
  try {
    console.log('🚀 HELPER: Starting post-production estimator analysis...');
    console.log('📊 HELPER: Input JSON length:', jsonInput.length, 'characters');
    console.log('📊 HELPER: Project ID:', projectId);
    console.log('📊 HELPER: Progress callback provided:', !!onProgress);
    
    onProgress?.('Starting post-production estimator analysis...');
    console.log('📢 HELPER: Progress callback called - Starting analysis');
    
    console.log('🔄 HELPER: Calling geminiPostProductionEstimatorService.analyzePostProductionEstimatorData()...');
    const analysisResult = await geminiPostProductionEstimatorService.analyzePostProductionEstimatorData(jsonInput, projectId);
    
    console.log('✅ HELPER: Analysis completed!');
    console.log('📊 HELPER: Result type:', typeof analysisResult);
    console.log('📊 HELPER: Has result:', !!analysisResult?.result);
    console.log('📊 HELPER: Has raw response:', !!analysisResult?.rawResponse);
    console.log('📊 HELPER: Has error:', !!analysisResult?.error);
    
    if (analysisResult?.result) {
      onProgress?.('Post-production estimator completed successfully!');
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
    console.error('❌ HELPER: Post-production estimator analysis failed:', error);
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