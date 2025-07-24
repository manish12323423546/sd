import { GoogleGenAI } from "@google/genai";

// AI Analysis Response Types (matching actual Gemini response)
export interface AISceneAnalysis {
  projectId: string;
  sceneId: string;
  sceneNumber: number;
  sceneName: string;
  analysisTimestamp: string;
  breakdown: {
    summary: string;
    location: {
      primaryLocation: string;
      setting: string;
      timeOfDay: string;
      environmentalFactors: string;
    };
    characters: {
      speakingCharacters: Array<{
        name: string;
        description: string;
      }>;
      nonSpeakingCharacters: Array<{
        name: string;
        description: string;
      }>;
      backgroundCharacters: any[];
      extras: any[];
    };
    props: {
      heroProps: string[];
      setProps: string[];
      interactiveProps: string[];
      consumableProps: string[];
    };
    technicalRequirements: {
      camera: string;
      lighting: string;
      sound: string;
      specialEquipment: string;
    };
    departmentalBreakdown: {
      artDepartment: string;
      wardrobeAndCostume: string;
      makeupAndHair: string;
      specialEffects: {
        VFX: string;
        PracticalFX: string;
        Stunts: string;
      };
    };
    complexityScore: {
      technicalDifficulty: {
        score: number;
        justification: string;
      };
      castComplexity: {
        score: number;
        justification: string;
      };
      locationChallenges: {
        score: number;
        justification: string;
      };
    };
    timeEstimate: {
      setupHours: number;
      shootHours: number;
      wrapHours: number;
      justification: string;
    };
  };
}

// Legacy interface for backward compatibility
export interface SceneBreakdownOutput {
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
    detailedSceneBreakdowns: DetailedSceneBreakdown[];
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

export interface DetailedSceneBreakdown {
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
}

// AI Analysis Status Types
export type AIAnalysisStatus = 'idle' | 'processing' | 'completed' | 'error';

export interface AIAnalysisResult {
  status: AIAnalysisStatus;
  result?: SceneBreakdownOutput;
  rawResponse?: string;
  error?: string;
  timestamp?: string;
}

// System Prompt for Scene Breakdown
const SCENE_BREAKDOWN_SYSTEM_PROMPT = `
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

class GeminiSceneAnalysisService {
  private ai: GoogleGenAI;

  constructor() {
    console.log('🏗️ CONSTRUCTOR: Initializing GeminiSceneAnalysisService');
    
    // Use environment variable or provide default API key
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "AIzaSyABISxaNzifdIcZUCe408LoKnEz0bia8cI";
    console.log('🔑 CONSTRUCTOR: API Key length:', apiKey.length, 'characters');
    console.log('🔑 CONSTRUCTOR: API Key prefix:', apiKey.substring(0, 10) + '...');
    
    // Initialize with the provided API key
    this.ai = new GoogleGenAI({
      apiKey: apiKey
    });
    
    console.log('✅ CONSTRUCTOR: GoogleGenAI client initialized successfully');
  }

  async analyzeScript(scriptContent: string, projectId: string): Promise<{ result?: SceneBreakdownOutput; rawResponse?: string; error?: string }> {
    console.log('🔥 ===== GEMINI API ANALYSIS STARTING =====');
    console.log('📅 TIMESTAMP:', new Date().toISOString());
    console.log('🆔 PROJECT_ID:', projectId);
    
    try {
      console.log('🚀 STEP 1: INPUT VALIDATION & PROCESSING');
      console.log('📝 INPUT: Script content length:', scriptContent.length, 'characters');
      
      // Log detailed input analysis
      const lines = scriptContent.split('\n').length;
      const words = scriptContent.split(/\s+/).length;
      const scenes = (scriptContent.match(/SCENE \d+:/g) || []).length;
      console.log('  - Total lines:', lines);
      console.log('  - Total words:', words);
      console.log('  - Detected scenes:', scenes);
      
      // Validation
      if (scriptContent.includes('PDF file:')) {
        throw new Error('Invalid script content: PDF text was not extracted properly');
      }
      
      if (scriptContent.length < 50) {
        throw new Error('Script content is too short to analyze');
      }
      
      console.log('🚀 STEP 2: PROMPT PREPARATION');
      
      const prompt = `
Please analyze this script and provide a complete scene breakdown following the required JSON format:

SCRIPT CONTENT:
${scriptContent}

PROJECT ID: ${projectId}

Remember to return ONLY the complete JSON object with all required fields populated according to the specified schema.
`;

      console.log('📊 PROMPT STATS:');
      console.log('  - User prompt length:', prompt.length, 'characters');
      console.log('  - System prompt length:', SCENE_BREAKDOWN_SYSTEM_PROMPT.length, 'characters');
      
      console.log('🚀 STEP 3: API REQUEST PREPARATION');
      
      const requestConfig = {
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 32768,
          systemInstruction: SCENE_BREAKDOWN_SYSTEM_PROMPT
        }
      };
      
      console.log('🌐 MAKING API CALL TO GEMINI...');
      const startTime = performance.now();
      
      const response = await this.ai.models.generateContent(requestConfig);
      
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      console.log('🚀 STEP 4: API RESPONSE RECEIVED');
      console.log('⚡ Response time:', responseTime, 'ms');
      
      if (response.usageMetadata) {
        console.log('📈 TOKEN USAGE:');
        console.log('  - Prompt tokens:', response.usageMetadata.promptTokenCount || 'N/A');
        console.log('  - Completion tokens:', response.usageMetadata.candidatesTokenCount || 'N/A');
        console.log('  - Total tokens:', response.usageMetadata.totalTokenCount || 'N/A');
      }
      
      console.log('📝 EXTRACTING RESPONSE TEXT...');
      const responseText = response.text;
      console.log('✅ Response text extracted successfully');
      
      console.log('🚀 STEP 5: RESPONSE PARSING & VALIDATION');
      const parsedResponse = this.parseAndValidateResponse(responseText);
      
      if (!parsedResponse) {
        console.error('❌ Failed to parse response from Gemini API');
        return {
          rawResponse: responseText,
          error: 'Failed to parse scene breakdown response'
        };
      }
      
      console.log('✅ Analysis completed successfully!');
      
      return {
        result: parsedResponse,
        rawResponse: responseText
      };
      
    } catch (error) {
      console.error('❌ Error analyzing script with Gemini:', error);
      const handledError = this.handleAPIError(error);
      
      return {
        error: handledError.message
      };
    }
  }

  private parseAndValidateResponse(responseText: string): SceneBreakdownOutput | null {
    console.log('🔍 ===== RESPONSE PARSING & VALIDATION =====');
    
    try {
      if (!responseText) {
        console.error('❌ Response text is null, undefined, or empty');
        return null;
      }
      
      // Try to extract JSON from thinking mode response
      let cleanedResponse = responseText;
      
      // Remove markdown code blocks
      cleanedResponse = cleanedResponse
        .replace(/```json\s*\n?/g, '')
        .replace(/```\s*\n?/g, '')
        .trim();
      
      // Extract JSON boundaries
      const jsonStart = cleanedResponse.indexOf('{');
      const jsonEnd = cleanedResponse.lastIndexOf('}') + 1;
      
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd);
      }

      const parsed = JSON.parse(cleanedResponse);
      console.log('✅ JSON parsing successful!');
      
      // Validate structure
      if (parsed.sceneBreakdownOutput && 
          parsed.sceneBreakdownOutput.detailedSceneBreakdowns &&
          Array.isArray(parsed.sceneBreakdownOutput.detailedSceneBreakdowns)) {
        
        console.log('✅ Valid SceneBreakdownOutput structure found');
        return parsed as SceneBreakdownOutput;
      }
      
      console.error('❌ Invalid structure - missing required properties');
      return null;
      
    } catch (error) {
      console.error('❌ Error parsing JSON response:', error);
      
      // Try to find any JSON-like structure in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extracted = jsonMatch[0];
          const parsed = JSON.parse(extracted);
          console.log('✅ Successfully parsed extracted JSON!');
          return parsed as SceneBreakdownOutput;
        } catch (e) {
          console.error('❌ Failed to parse extracted JSON:', e);
        }
      }
      
      return null;
    }
  }

  private handleAPIError(error: unknown): Error {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('API key')) {
      return new Error('Invalid API key. Please check your Gemini API configuration.');
    }
    
    if (errorMessage.includes('quota')) {
      return new Error('API quota exceeded. Please try again later.');
    }
    
    if (errorMessage.includes('rate limit')) {
      return new Error('Rate limit exceeded. Please wait before trying again.');
    }
    
    return new Error(`Scene analysis failed: ${errorMessage || 'Unknown error'}`);
  }
}

// Export singleton instance
export const geminiSceneAnalysis = new GeminiSceneAnalysisService();

// Export helper functions
export const analyzeScriptWithAI = async (
  scriptContent: string, 
  projectId: string,
  onProgress?: (status: string) => void
): Promise<AIAnalysisResult> => {
  console.log('🎯 ===== SCRIPT AI HELPER FUNCTION CALLED =====');
  
  try {
    onProgress?.('Starting AI scene analysis with Gemini 2.5 Pro...');
    
    const analysisResult = await geminiSceneAnalysis.analyzeScript(scriptContent, projectId);
    
    if (analysisResult?.result) {
      onProgress?.('Analysis completed successfully!');
      
      return {
        status: 'completed',
        result: analysisResult.result,
        rawResponse: analysisResult.rawResponse,
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        status: 'error',
        error: analysisResult?.error || 'Analysis failed',
        rawResponse: analysisResult?.rawResponse,
        timestamp: new Date().toISOString()
      };
    }
    
  } catch (error) {
    console.error('❌ Script analysis failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return {
      status: 'error',
      error: errorMessage,
      timestamp: new Date().toISOString()
    };
  }
};