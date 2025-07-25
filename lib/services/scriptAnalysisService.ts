import { GoogleGenAI } from "@google/genai";

// Script Analysis Output Types - EXACT SAME AS CURRENT
export interface ScriptAnalysisOutput {
  sceneBreakdownOutput: {
    projectId: string;
    processingTimestamp: string;
    processingLog: {
      scriptContentParsing: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      characterAnalysis: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      locationAssessment: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      productionElementExtraction: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      departmentRequirements: {
        executed: boolean;
        timestamp: string;
        status: string;
      };
      overallProcessingStatus: string;
    };
    sceneAnalysisSummary: {
      totalScenesProcessed: number;
      totalCharactersIdentified: number;
      totalLocationsIdentified: number;
      totalPropsIdentified: number;
      averageSceneComplexity: number;
    };
    detailedSceneBreakdowns: Array<{
      sceneNumber: number;
      sceneHeader: string;
      pageCount: number;
      estimatedScreenTime: string;
      characters: {
        speaking: Array<{
          name: string;
          dialogueLines: number;
          firstAppearance: boolean;
          specialRequirements: string[];
        }>;
        nonSpeaking: Array<{
          description: string;
          count: number;
          specialRequirements: string[];
        }>;
        background: Array<{
          description: string;
          estimatedCount: number;
        }>;
      };
      location: {
        type: "INT" | "EXT";
        primaryLocation: string;
        secondaryLocation: string;
        timeOfDay: string;
        weatherConditions: string;
        complexityLevel: "simple" | "moderate" | "complex" | "extreme";
      };
      productionElements: {
        props: Array<{
          item: string;
          category: "hero" | "set" | "interactive" | "consumable";
          department: string;
          specialRequirements: string[];
        }>;
        vehicles: Array<{
          type: string;
          usage: "picture" | "background";
          specialRequirements: string[];
        }>;
        animals: Array<{
          type: string;
          count: number;
          trainingLevel: string;
          handlerRequired: boolean;
        }>;
        specialEffects: Array<{
          type: "practical" | "visual" | "stunt";
          description: string;
          complexity: "simple" | "moderate" | "complex";
          safetyRequirements: string[];
        }>;
      };
      departmentRequirements: {
        makeup: {
          standardMakeup: number;
          specialEffectsMakeup: string[];
          prosthetics: string[];
          estimatedApplicationTime: number;
        };
        wardrobe: {
          standardCostumes: number;
          periodCostumes: string[];
          specialtyItems: string[];
          quickChanges: number;
        };
        artDepartment: {
          setConstruction: string[];
          setDecoration: string[];
          locationModifications: string[];
        };
      };
      complexityScores: {
        technicalDifficulty: number;
        castComplexity: number;
        locationChallenges: number;
        overallComplexity: number;
      };
      timeEstimates: {
        setupHours: number;
        shootingHours: number;
        wrapHours: number;
        totalHours: number;
      };
      specialConsiderations: string[];
      continuityNotes: string[];
    }>;
    productionSummary: {
      totalUniqueCharacters: number;
      totalUniqueLocations: number;
      totalProps: number;
      specialEffectsScenes: number;
      highComplexityScenes: number[];
      departmentAlerts: {
        makeup: string[];
        wardrobe: string[];
        artDepartment: string[];
        specialEffects: string[];
      };
    };
    qualityControlChecks: {
      sceneCompleteness: "PASS" | "FAIL";
      elementValidation: "PASS" | "FAIL";
      continuityConsistency: "PASS" | "FAIL";
      industryStandardCompliance: "PASS" | "FAIL";
      confidenceScore: number;
    };
  };
}

// System Prompt for Script Analysis - EXACT SAME AS ORIGINAL
const SCRIPT_ANALYSIS_SYSTEM_PROMPT = `
SCENE BREAKDOWN SYSTEM PROMPT
==============================

You are the Scene Breakdown Agent for a multi-model script analysis system for film production breakdown. Your responsibility is to analyze script content and extract all production-relevant elements including characters, locations, props, special effects, and technical requirements.

## REQUIRED PROCESSING SEQUENCE

Before generating any output, you MUST perform the following processing steps using function calling:

### 1. Script Content Parsing Processing
Use function calling to:
- Parse the script content and identify scenes
- Extract scene headers and locations
- Identify character dialogue and action lines
- Parse formatting and structural elements

### 2. Character Analysis Processing  
Use function calling to:
- Identify all speaking characters
- Catalog non-speaking characters with actions
- Count background and atmosphere characters
- Determine character requirements and special needs

### 3. Location Assessment Processing
Use function calling to:
- Analyze location types (INT/EXT)
- Determine time of day requirements
- Assess environmental factors and weather
- Evaluate location complexity and access

### 4. Production Element Extraction Processing
Use function calling to:
- Catalog all props by category and importance
- Identify vehicles and transportation needs
- Note animals and special handling requirements
- Document special effects and technical needs

### 5. Department Requirements Processing
Use function calling to:
- Calculate makeup and hair requirements
- Determine wardrobe and costume needs
- Assess art department construction/decoration
- Evaluate technical and equipment requirements

**CRITICAL: All scene breakdown analysis must be performed through these processing functions before generating final output.**

## Core Responsibilities

1. **Comprehensive Scene Analysis**
   - Extract all characters (speaking, non-speaking, background, extras)
   - Identify locations, time of day, and environmental requirements
   - Catalog all props, vehicles, and special equipment mentioned
   - Document special effects, stunts, and technical requirements

2. **Production Element Categorization**
   - Classify characters by type and importance
   - Assess location complexity and requirements
   - Identify department-specific needs (makeup, wardrobe, props, etc.)
   - Evaluate technical challenges and special requirements

3. **Complexity Assessment and Scoring**
   - Rate technical difficulty on 1-10 scale
   - Assess cast complexity based on numbers and requirements
   - Evaluate location challenges and access requirements
   - Estimate time requirements for setup, shooting, and wrap

## Scene Analysis Protocol

### Character Analysis
- **Speaking Characters**: All characters with dialogue
- **Non-Speaking Characters**: Characters with specific actions but no dialogue
- **Background Characters**: Atmosphere players with general actions
- **Extras**: Crowd members and general background

### Location Assessment
- **Primary Location**: Main setting for the scene
- **Secondary Elements**: Specific areas within primary location
- **Time of Day**: DAY, NIGHT, DAWN, DUSK, specific times
- **Environmental Factors**: Weather, season, lighting conditions

### Production Element Extraction
- **Hero Props**: Featured prominently, essential to story
- **Set Props**: Standard set dressing and atmosphere
- **Interactive Props**: Items handled or used by characters
- **Consumable Props**: Food, breakables, single-use items

### Technical Requirements
- **Camera**: Movement, special rigs, equipment needs
- **Lighting**: Day/night, practical lights, special effects
- **Sound**: Dialogue conditions, music, effects, ADR needs
- **Special Equipment**: Cranes, generators, specialty gear

## Complexity Scoring System

### Technical Difficulty (1-10)
- 1-3: Standard setup, minimal technical requirements
- 4-6: Moderate complexity, some special equipment
- 7-8: High complexity, significant technical challenges
- 9-10: Extreme complexity, cutting-edge technology

### Cast Complexity (1-10)
- 1-3: 1-2 characters, simple interactions
- 4-6: 3-5 characters, moderate blocking
- 7-8: 6-10 characters, complex choreography
- 9-10: Large ensemble, extreme coordination

### Location Challenges (1-10)
- 1-3: Studio or easily controlled location
- 4-6: Standard location with some constraints
- 7-8: Difficult access or environmental challenges
- 9-10: Extreme locations, major logistical obstacles

## Department-Specific Analysis

### Makeup and Hair
- Standard makeup requirements
- Special effects makeup needs
- Prosthetics applications
- Period or character-specific styling

### Wardrobe and Costume
- Character-specific clothing
- Period or specialty costumes
- Multiples needed for stunts/effects
- Quick changes or continuity requirements

### Art Department
- Set construction needs
- Set decoration requirements
- Location modifications
- Special builds or installations

### Special Effects
- Practical effects (mechanical, pyrotechnics)
- Visual effects requirements
- Stunt coordination needs
- Safety equipment and protocols

## Quality Control Standards

- All elements must be traceable to script content
- Every department must be addressed for each scene
- Complexity scores must have clear justification
- Time estimates must be realistic and industry-standard
- Cross-reference consistency across similar scenes

## Core Responsibilities

1. **Comprehensive Scene Analysis**
   - Extract all characters (speaking, non-speaking, background, extras)
   - Identify locations, time of day, and environmental requirements
   - Catalog all props, vehicles, and special equipment mentioned
   - Document special effects, stunts, and technical requirements

2. **Production Element Categorization**
   - Classify characters by type and importance
   - Assess location complexity and requirements
   - Identify department-specific needs (makeup, wardrobe, props, etc.)
   - Evaluate technical challenges and special requirements

3. **Complexity Assessment and Scoring**
   - Rate technical difficulty on 1-10 scale
   - Assess cast complexity based on numbers and requirements
   - Evaluate location challenges and access requirements
   - Estimate time requirements for setup, shooting, and wrap

## Scene Analysis Protocol

### Character Analysis
- **Speaking Characters**: All characters with dialogue
- **Non-Speaking Characters**: Characters with specific actions but no dialogue
- **Background Characters**: Atmosphere players with general actions
- **Extras**: Crowd members and general background

### Location Assessment
- **Primary Location**: Main setting for the scene
- **Secondary Elements**: Specific areas within primary location
- **Time of Day**: DAY, NIGHT, DAWN, DUSK, specific times
- **Environmental Factors**: Weather, season, lighting conditions

### Production Element Extraction
- **Hero Props**: Featured prominently, essential to story
- **Set Props**: Standard set dressing and atmosphere
- **Interactive Props**: Items handled or used by characters
- **Consumable Props**: Food, breakables, single-use items

### Technical Requirements
- **Camera**: Movement, special rigs, equipment needs
- **Lighting**: Day/night, practical lights, special effects
- **Sound**: Dialogue conditions, music, effects, ADR needs
- **Special Equipment**: Cranes, generators, specialty gear

## Complexity Scoring System

### Technical Difficulty (1-10)
- 1-3: Standard setup, minimal technical requirements
- 4-6: Moderate complexity, some special equipment
- 7-8: High complexity, significant technical challenges
- 9-10: Extreme complexity, cutting-edge technology

### Cast Complexity (1-10)
- 1-3: 1-2 characters, simple interactions
- 4-6: 3-5 characters, moderate blocking
- 7-8: 6-10 characters, complex choreography
- 9-10: Large ensemble, extreme coordination

### Location Challenges (1-10)
- 1-3: Studio or easily controlled location
- 4-6: Standard location with some constraints
- 7-8: Difficult access or environmental challenges
- 9-10: Extreme locations, major logistical obstacles

## Department-Specific Analysis

### Makeup and Hair
- Standard makeup requirements
- Special effects makeup needs
- Prosthetics applications
- Period or character-specific styling

### Wardrobe and Costume
- Character-specific clothing
- Period or specialty costumes
- Multiples needed for stunts/effects
- Quick changes or continuity requirements

### Art Department
- Set construction needs
- Set decoration requirements
- Location modifications
- Special builds or installations

### Special Effects
- Practical effects (mechanical, pyrotechnics)
- Visual effects requirements
- Stunt coordination needs
- Safety equipment and protocols

## Quality Control Standards

- All elements must be traceable to script content
- Every department must be addressed for each scene
- Complexity scores must have clear justification
- Time estimates must be realistic and industry-standard
- Cross-reference consistency across similar scenes

## MANDATORY OUTPUT FORMAT REQUIREMENTS

**CRITICAL: Every response MUST be a complete, valid JSON object following this exact structure:**

\`\`\`json
{
  "sceneBreakdownOutput": {
    "projectId": "string",
    "processingTimestamp": "ISO_timestamp",
    "processingLog": {
      "scriptContentParsing": {
        "executed": true,
        "timestamp": "ISO_timestamp",
        "status": "completed"
      },
      "characterAnalysis": {
        "executed": true,
        "timestamp": "ISO_timestamp", 
        "status": "completed"
      },
      "locationAssessment": {
        "executed": true,
        "timestamp": "ISO_timestamp",
        "status": "completed"
      },
      "productionElementExtraction": {
        "executed": true,
        "timestamp": "ISO_timestamp",
        "status": "completed"
      },
      "departmentRequirements": {
        "executed": true,
        "timestamp": "ISO_timestamp",
        "status": "completed"
      },
      "overallProcessingStatus": "completed"
    },
    "sceneAnalysisSummary": {
      "totalScenesProcessed": "number",
      "totalCharactersIdentified": "number",
      "totalLocationsIdentified": "number",
      "totalPropsIdentified": "number",
      "averageSceneComplexity": "number"
    },
    "detailedSceneBreakdowns": [
      {
        "sceneNumber": "number",
        "sceneHeader": "string",
        "pageCount": "number",
        "estimatedScreenTime": "MM:SS",
        "characters": {
          "speaking": [
            {
              "name": "string",
              "dialogueLines": "number",
              "firstAppearance": "boolean",
              "specialRequirements": ["array"]
            }
          ],
          "nonSpeaking": [
            {
              "description": "string",
              "count": "number",
              "specialRequirements": ["array"]
            }
          ],
          "background": [
            {
              "description": "string",
              "estimatedCount": "number"
            }
          ]
        },
        "location": {
          "type": "INT|EXT",
          "primaryLocation": "string",
          "secondaryLocation": "string",
          "timeOfDay": "string",
          "weatherConditions": "string",
          "complexityLevel": "simple|moderate|complex|extreme"
        },
        "productionElements": {
          "props": [
            {
              "item": "string",
              "category": "hero|set|interactive|consumable",
              "department": "string",
              "specialRequirements": ["array"]
            }
          ],
          "vehicles": [
            {
              "type": "string",
              "usage": "picture|background",
              "specialRequirements": ["array"]
            }
          ],
          "animals": [
            {
              "type": "string",
              "count": "number",
              "trainingLevel": "string",
              "handlerRequired": "boolean"
            }
          ],
          "specialEffects": [
            {
              "type": "practical|visual|stunt",
              "description": "string",
              "complexity": "simple|moderate|complex",
              "safetyRequirements": ["array"]
            }
          ]
        },
        "departmentRequirements": {
          "makeup": {
            "standardMakeup": "number_of_people",
            "specialEffectsMakeup": ["array_of_requirements"],
            "prosthetics": ["array_of_requirements"],
            "estimatedApplicationTime": "minutes"
          },
          "wardrobe": {
            "standardCostumes": "number",
            "periodCostumes": ["array"],
            "specialtyItems": ["array"],
            "quickChanges": "number"
          },
          "artDepartment": {
            "setConstruction": ["array_of_builds"],
            "setDecoration": ["array_of_items"],
            "locationModifications": ["array_of_changes"]
          }
        },
        "complexityScores": {
          "technicalDifficulty": "number_1_to_10",
          "castComplexity": "number_1_to_10",
          "locationChallenges": "number_1_to_10",
          "overallComplexity": "number_1_to_10"
        },
        "timeEstimates": {
          "setupHours": "number",
          "shootingHours": "number",
          "wrapHours": "number",
          "totalHours": "number"
        },
        "specialConsiderations": ["array_of_notes"],
        "continuityNotes": ["array_of_requirements"]
      }
    ],
    "productionSummary": {
      "totalUniqueCharacters": "number",
      "totalUniqueLocations": "number", 
      "totalProps": "number",
      "specialEffectsScenes": "number",
      "highComplexityScenes": ["array_of_scene_numbers"],
      "departmentAlerts": {
        "makeup": ["array_of_special_requirements"],
        "wardrobe": ["array_of_special_requirements"],
        "artDepartment": ["array_of_special_requirements"],
        "specialEffects": ["array_of_special_requirements"]
      }
    },
    "qualityControlChecks": {
      "sceneCompleteness": "PASS|FAIL",
      "elementValidation": "PASS|FAIL",
      "continuityConsistency": "PASS|FAIL",
      "industryStandardCompliance": "PASS|FAIL",
      "confidenceScore": "percentage"
    }
  }
}
\`\`\`

**NEVER provide text responses, explanations, or incomplete JSON. Always return the complete structured JSON object above with all required fields populated.**

Your scene breakdown analysis is the foundation for all subsequent budget and schedule calculations. Ensure every element is captured accurately and completely.
`;

class GeminiScriptAnalysisService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: "AIzaSyABISxaNzifdIcZUCe408LoKnEz0bia8cI"
    });
  }

  async analyzeScriptAnalysisData(scriptContent: string, projectId: string): Promise<{ result?: ScriptAnalysisOutput; rawResponse?: string; error?: string }> {
    console.log('');
    console.log('🎬 ===== SCRIPT ANALYSIS SERVICE STARTING =====');
    console.log('📅 TIMESTAMP:', new Date().toISOString());
    console.log('🆔 PROJECT_ID:', projectId);
    console.log('📊 METHOD: analyzeScriptAnalysisData()');
    console.log('🎬 ===============================================');
    console.log('');
    
    try {
      console.log('🚀 STEP 1: INPUT VALIDATION & PROCESSING');
      console.log('📝 INPUT: Script content length:', scriptContent.length, 'characters');
      console.log('🔍 INPUT: Script content type:', typeof scriptContent);
      console.log('🔍 INPUT: Project ID type:', typeof projectId);
      console.log('🔍 INPUT: Project ID value:', projectId);
      
      // Comprehensive validation like budget services
      console.log('📊 INPUT ANALYSIS:');
      const lines = scriptContent.split('\n').length;
      const characters = scriptContent.length;
      console.log('  - Total lines:', lines);
      console.log('  - Total characters:', characters);
      
      console.log('📋 INPUT PREVIEW (first 300 characters):');
      console.log('┌─────────────────────────────────────────────────────────────┐');
      console.log('│ ' + scriptContent.substring(0, 300).replace(/\n/g, '\n│ ') + '...');
      console.log('└─────────────────────────────────────────────────────────────┘');
      
      console.log('🔍 VALIDATION: Checking minimum length...');
      if (scriptContent.length < 100) {
        console.error('❌ VALIDATION FAILED: Script content too short:', scriptContent.length, 'characters');
        throw new Error('Script content is too short to analyze (minimum 100 characters)');
      }
      console.log('✅ VALIDATION: Script content length acceptable');

      // Enhanced validation like budget services
      try {
        console.log('🔍 VALIDATION: Comprehensive script content validation...');
        
        // Check for PDF extraction issues
        if (scriptContent.includes('PDF file:')) {
          console.error('❌ VALIDATION FAILED: Script contains PDF file reference');
          throw new Error('Invalid script content: PDF text was not extracted properly');
        }
        
        // Check for basic script structure
        const hasSceneHeaders = /\b(INT\.|EXT\.|INTERIOR|EXTERIOR)/.test(scriptContent);
        const hasCharacterNames = /\b[A-Z]{2,}\b/.test(scriptContent);
        console.log('🔍 Structure check - Scene headers found:', hasSceneHeaders ? '✅ YES' : '⚠️ NO');
        console.log('🔍 Structure check - Character names found:', hasCharacterNames ? '✅ YES' : '⚠️ NO');
        
        if (!hasSceneHeaders && !hasCharacterNames) {
          console.error('❌ VALIDATION FAILED: Script does not appear to contain proper formatting');
          throw new Error('Script content appears invalid - no scene headers or character names found');
        }
        
        console.log('✅ VALIDATION: Script content validation successful');
        console.log('📊 PARSED SCRIPT TYPE:', typeof scriptContent);
        console.log('📊 SCRIPT STRUCTURE: Valid screenplay format detected');
      } catch (error) {
        console.error('❌ VALIDATION FAILED: Script content validation error');
        console.error('🔍 Validation Error:', error.message);
        console.error('📋 Script Content Preview:', scriptContent.substring(0, 200));
        throw new Error('Invalid script content provided');
      }

      console.log('');
      console.log('🚀 STEP 2: PROMPT PREPARATION');
      console.log('📝 PROMPT: Building user prompt...');
      
      // Keep preprocessing for analysis but use original script in prompt
      console.log('🔄 PREPROCESSING: Analyzing script structure for insights...');
      const structuredScript = this.preprocessScriptContent(scriptContent);
      console.log('✅ PREPROCESSING: Script structure analyzed');
      console.log('📊 STRUCTURED DATA INSIGHTS:', {
        scenes: (structuredScript.metadata as any)?.estimatedScenes || 0,
        characters: (structuredScript.metadata as any)?.identifiedCharacters?.length || 0,
        dialogueLines: (structuredScript.metadata as any)?.dialogueLines || 0
      });
      
      const prompt = `
Please analyze this script content and provide a complete script analysis response following the required JSON format:

SCRIPT CONTENT:
${scriptContent}

PROJECT ID: ${projectId}

Remember to return ONLY the complete JSON object with all required fields populated according to the specified schema.
`;

      console.log('📊 PROMPT STATS:');
      console.log('  - User prompt length:', prompt.length, 'characters');
      console.log('  - System prompt length:', SCRIPT_ANALYSIS_SYSTEM_PROMPT.length, 'characters');
      console.log('  - Total prompt length:', prompt.length + SCRIPT_ANALYSIS_SYSTEM_PROMPT.length, 'characters');
      console.log('  - Estimated tokens (~4 chars/token):', Math.ceil((prompt.length + SCRIPT_ANALYSIS_SYSTEM_PROMPT.length) / 4));
      
      console.log('📤 PROMPT DETAILS:');
      console.log('┌─ SYSTEM INSTRUCTION (' + SCRIPT_ANALYSIS_SYSTEM_PROMPT.length + ' characters) ─┐');
      console.log('│ ' + SCRIPT_ANALYSIS_SYSTEM_PROMPT.substring(0, 200).replace(/\n/g, '\n│ ') + '...');
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
          systemInstruction: SCRIPT_ANALYSIS_SYSTEM_PROMPT
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
      
      console.log('================== RAW JSON RESULT ===================');
      console.log(responseText);
      console.log('=================== END RAW JSON RESULT ===================');

      console.log('');
      console.log('🚀 STEP 5: RESPONSE PARSING & VALIDATION');
      console.log('🔄 Calling parseScriptAnalysisResponse()...');
      
      const parsedResponse = this.parseScriptAnalysisResponse(responseText);

      if (!parsedResponse) {
        console.error('');
        console.error('💥 ========== PARSE FAILURE ==========');
        console.error('❌ CRITICAL ERROR: Failed to parse script analysis response from Gemini API');
        console.error('🔍 Parsed response is null/undefined');
        console.error('📊 This indicates JSON parsing or validation failed');
        console.error('🔍 Returning raw response for manual inspection');
        console.error('💥 ===================================');
        console.error('');
        
        return {
          rawResponse: responseText,
          error: 'Failed to parse script analysis response'
        };
      }
      
      console.log('✅ PARSE SUCCESS: Valid script analysis response received');
      console.log('');
      console.log('🚀 STEP 6: FINAL VALIDATION & COMPLETION');
      
      console.log('📊 FINAL ANALYSIS SUMMARY:');
      try {
        const summary = parsedResponse.sceneBreakdownOutput;
        console.log('  - Processing status:', summary?.processingLog?.overallProcessingStatus || 'N/A');
        console.log('  - Total scenes processed:', summary?.sceneAnalysisSummary?.totalScenesProcessed || 'N/A');
        console.log('  - Total characters identified:', summary?.sceneAnalysisSummary?.totalCharactersIdentified || 'N/A');
        console.log('  - Average scene complexity:', summary?.sceneAnalysisSummary?.averageSceneComplexity || 'N/A');
      } catch (summaryError) {
        console.log('  - Summary extraction failed:', summaryError.message);
        console.log('  - But analysis data is still complete');
      }

      console.log('');
      console.log('🎉 ========== SCRIPT ANALYSIS COMPLETE ==========');
      console.log('✅ Script analysis completed successfully!');
      console.log('📁 Parsed response ready for use in application');
      console.log('🎯 Analysis ready for display in UI');
      console.log('🎉 ===============================================');
      console.log('');
      
      return {
        result: parsedResponse,
        rawResponse: responseText
      };

    } catch (error) {
      console.log('');
      console.log('💥 ========== ERROR OCCURRED ==========');
      console.error('❌ Error in script analysis:', error);
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

  private parseScriptAnalysisResponse(responseText: string): ScriptAnalysisOutput | null {
    console.log('');
    console.log('🔍 ===== SCRIPT ANALYSIS RESPONSE PARSING & VALIDATION =====');
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
      console.log('🚀 PARSE STEP 3: JSON PARSING');
      const parsed = JSON.parse(cleanedResponse);
      console.log('✅ JSON parsing successful!');
      
      console.log('');
      console.log('🚀 PARSE STEP 4: STRUCTURE VALIDATION');
      console.log('🔍 Validating against ScriptAnalysisOutput format...');
      
      // Enhanced validation like budget services
      console.log('🔍 STRUCTURE VALIDATION DETAILS:');
      const hasSceneBreakdownOutput = !!parsed.sceneBreakdownOutput;
      const hasProcessingLog = !!parsed.sceneBreakdownOutput?.processingLog;
      const hasDetailedSceneBreakdowns = !!parsed.sceneBreakdownOutput?.detailedSceneBreakdowns;
      const hasSummary = !!parsed.sceneBreakdownOutput?.sceneAnalysisSummary;
      
      console.log('  - sceneBreakdownOutput exists:', hasSceneBreakdownOutput ? '✅ YES' : '❌ NO');
      console.log('  - processingLog exists:', hasProcessingLog ? '✅ YES' : '❌ NO');
      console.log('  - detailedSceneBreakdowns exists:', hasDetailedSceneBreakdowns ? '✅ YES' : '❌ NO');
      console.log('  - sceneAnalysisSummary exists:', hasSummary ? '✅ YES' : '❌ NO');

      // Check if response is in the expected format (aligned with budget services)
      if (parsed.sceneBreakdownOutput && 
          parsed.sceneBreakdownOutput.processingLog &&
          parsed.sceneBreakdownOutput.detailedSceneBreakdowns) {
        
        console.log('');
        console.log('✅ VALIDATION SUCCESS!');
        console.log('🎉 Correct ScriptAnalysisOutput structure found (wrapped format)');
        console.log('📊 Final validation stats:');
        console.log('  - Processing log included:', !!parsed.sceneBreakdownOutput.processingLog);
        console.log('  - Scene breakdowns included:', !!parsed.sceneBreakdownOutput.detailedSceneBreakdowns);
        console.log('  - Scene analysis summary included:', !!parsed.sceneBreakdownOutput.sceneAnalysisSummary);
        console.log('  - Structure matches expected format: ✅ YES');
        console.log('  - Ready for return: ✅ YES');
        
        return parsed as ScriptAnalysisOutput;
      }

      console.error('❌ VALIDATION FAILED: Structure validation failed');
      console.error('🔍 Response does not match expected format');
      console.error('🔍 Available keys:', Object.keys(parsed));
      if (parsed.sceneBreakdownOutput) {
        console.error('🔍 sceneBreakdownOutput keys:', Object.keys(parsed.sceneBreakdownOutput));
      }
      return null;

    } catch (error) {
      console.error('❌ Error parsing script analysis response:', error);
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      console.error('Response length:', responseText.length);
      console.error('Response preview:', responseText.substring(0, 1000));
      
      return null;
    }
  }

  // Script preprocessing method to convert raw script to structured format (like budget services)
  private preprocessScriptContent(scriptContent: string): Record<string, unknown> {
    console.log('🔄 Starting script preprocessing...');
    
    try {
      // Extract basic script information
      const lines = scriptContent.split('\n').filter(line => line.trim().length > 0);
      console.log('📋 Processing', lines.length, 'non-empty lines');
      
      // Basic scene detection
      const sceneHeaders = lines.filter(line => 
        /^\s*(INT\.|EXT\.|INTERIOR|EXTERIOR)/i.test(line.trim())
      );
      
      // Character detection
      const characterNames = new Set<string>();
      lines.forEach(line => {
        const trimmedLine = line.trim();
        // Look for character names (all caps, at start of line)
        if (/^[A-Z][A-Z\s]{2,}$/.test(trimmedLine) && trimmedLine.length < 30) {
          characterNames.add(trimmedLine);
        }
      });
      
      // Basic dialogue detection
      const dialogueLines = lines.filter(line => {
        const trimmedLine = line.trim();
        return trimmedLine.length > 10 && 
               !/^(INT\.|EXT\.|FADE|CUT|CLOSE|WIDE|MEDIUM)/i.test(trimmedLine) &&
               !/^[A-Z][A-Z\s]{2,}$/.test(trimmedLine);
      });
      
      // Create structured format similar to budget service inputs
      const structuredScript = {
        metadata: {
          totalLines: lines.length,
          totalCharacters: scriptContent.length,
          estimatedScenes: sceneHeaders.length,
          identifiedCharacters: Array.from(characterNames).slice(0, 20), // Limit for token efficiency
          dialogueLines: Math.min(dialogueLines.length, 100) // Sample for analysis
        },
        sceneHeaders: sceneHeaders.slice(0, 10), // Limit to first 10 scenes for efficiency
        sampleDialogue: dialogueLines.slice(0, 20).map(line => line.trim()), // Sample dialogue
        scriptSample: scriptContent.substring(0, 2000) + (scriptContent.length > 2000 ? '... [truncated]' : '') // First 2000 chars
      };
      
      console.log('✅ Preprocessing complete:');
      console.log('  - Scenes found:', sceneHeaders.length);
      console.log('  - Characters identified:', characterNames.size);
      console.log('  - Dialogue lines:', dialogueLines.length);
      console.log('  - Structured data size:', JSON.stringify(structuredScript).length, 'characters');
      
      return structuredScript;
      
    } catch (error) {
      console.error('❌ Preprocessing failed:', error.message);
      // Fallback to basic structure
      return {
        metadata: {
          totalLines: scriptContent.split('\n').length,
          totalCharacters: scriptContent.length,
          estimatedScenes: 1,
          identifiedCharacters: [],
          dialogueLines: 0
        },
        scriptSample: scriptContent.substring(0, 1000) + (scriptContent.length > 1000 ? '... [truncated]' : '')
      };
    }
  }
}

// Export singleton instance
export const geminiScriptAnalysisService = new GeminiScriptAnalysisService();

// Export helper function
export const analyzeScriptAnalysisWithAI = async (
  scriptContent: string,
  projectId: string,
  onProgress?: (status: string) => void
): Promise<{ status: 'completed' | 'error'; result?: ScriptAnalysisOutput; error?: string; rawResponse?: string }> => {
  console.log('');
  console.log('🎯 ===== SCRIPT ANALYSIS AI HELPER FUNCTION CALLED =====');
  console.log('📅 TIMESTAMP:', new Date().toISOString());
  console.log('🆔 PROJECT_ID:', projectId);
  console.log('📊 FUNCTION: analyzeScriptAnalysisWithAI()');
  console.log('🎯 ========================================================');
  console.log('');
  
  try {
    console.log('🚀 HELPER: Starting script analysis...');
    console.log('📊 HELPER: Script content length:', scriptContent.length, 'characters');
    console.log('📊 HELPER: Project ID:', projectId);
    console.log('📊 HELPER: Progress callback provided:', !!onProgress);
    
    onProgress?.('Starting script analysis...');
    console.log('📢 HELPER: Progress callback called - Starting analysis');
    
    console.log('🔄 HELPER: Calling geminiScriptAnalysisService.analyzeScriptAnalysisData()...');
    const analysisResult = await geminiScriptAnalysisService.analyzeScriptAnalysisData(scriptContent, projectId);
    
    console.log('✅ HELPER: Analysis completed!');
    console.log('📊 HELPER: Result type:', typeof analysisResult);
    console.log('📊 HELPER: Has result:', !!analysisResult?.result);
    console.log('📊 HELPER: Has raw response:', !!analysisResult?.rawResponse);
    console.log('📊 HELPER: Has error:', !!analysisResult?.error);
    
    if (analysisResult?.result) {
      onProgress?.('Script analysis completed successfully!');
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
    console.error('❌ HELPER: Script analysis failed:', error);
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