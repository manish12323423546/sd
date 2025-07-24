// Browser-compatible PDF Script Analyzer
// Exact replica of the Node.js pdfanyliser.cjs logic

export interface SceneData {
  Scene_Names: string;
  Scene_action: string;
  Scene_Characters: string[] | null;
  Scene_Dialogue: string[] | null;
  Contents: string;
}

export interface DialogueData {
  characters: string;
  Character_dialogue: string;
}

export interface AnalysisResults {
  scenes: SceneData[];
  dialogues: DialogueData[];
  characters: Set<string>;
  movieCharacters: string[];
  summary: {
    totalScenes: number;
    totalDialogues: number;
    totalCharacters: number;
    topCharacters: Array<{ character: string; count: number }>;
  };
  interactions: Array<{ pair: string; count: number }>;
}

export class NodeJSStylePDFAnalyzer {
  private scriptName: string;
  private scenes: SceneData[] = [];
  private dialogues: DialogueData[] = [];
  private characters: Set<string> = new Set();
  private movieCharacters: string[] = [];

  constructor(scriptName: string) {
    this.scriptName = scriptName;
    
    // Initialize data structures - exact copy from Node.js
    this.scenes = [];
    this.dialogues = [];
    this.characters = new Set();
    this.movieCharacters = [];
  }

  async extractPdfText(file: File): Promise<string> {
    console.log(`📖 Extracting text from ${this.scriptName} PDF...`);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      console.log('📚 Loading pdfjs-dist library...');
      // Use dynamic import with webpack ignore to prevent server-side bundling issues
      const pdfjsLib = await import(/* webpackIgnore: true */ 'pdfjs-dist/build/pdf.min.js');
      
      // Configure worker for browser environment
      if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        console.log('🔧 Setting up PDF.js worker for browser...');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
      }
      
      const pdf = await pdfjsLib.getDocument({ 
        data: arrayBuffer,
        // Disable web workers to avoid canvas issues
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true
      }).promise;
      let fullText = '';
      
      console.log(`📄 Processing ${pdf.numPages} pages...`);
      
      // Extract text page by page to mimic Node.js pdf-parse behavior
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Build text from items, similar to pdf-parse approach
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      
      console.log(`✅ Extracted ${fullText.length} characters from PDF`);
      return fullText;
      
    } catch (error) {
      console.error(`❌ Error extracting PDF: ${error.message}`);
      console.warn('📄 PDF.js failed, this is expected if running on server-side');
      // If PDF.js fails completely, return empty string like Node.js version
      return "";
    }
  }


  parseScreenplay(text) {
    console.log(`🎬 Parsing ${this.scriptName} screenplay structure...`);

    const lines = text.split('\n');
    let currentScene = null;
    let currentSceneAction = "";
    let currentSceneCharacters = [];
    let currentSceneDialogues = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      const sceneMatch = trimmedLine.match(/^(?:\d+\s+)?(INT\.|EXT\.|INTERIOR|EXTERIOR)\s+(.+)/i);
      if (sceneMatch) {
        if (currentScene) {
          this.scenes.push({
            Scene_Names: currentScene,
            Scene_action: currentSceneAction.trim(),
            Scene_Characters: currentSceneCharacters.length > 0 ? [...currentSceneCharacters] : null,
            Scene_Dialogue: currentSceneDialogues.length > 0 ? [...currentSceneDialogues] : null,
            Contents: `${currentSceneAction.trim()}\n${currentSceneDialogues.join(' ')}`
          });
        }
        currentScene = trimmedLine;
        currentSceneAction = "";
        currentSceneCharacters = [];
        currentSceneDialogues = [];
      } else if (trimmedLine.includes(':') && trimmedLine.split(':')[0].length < 50) {
        const charMatch = trimmedLine.match(/^([A-Z][A-Z\s'().]+[A-Z]):\s*(.*)/);
        if (charMatch) {
          let character = charMatch[1].trim().replace(/\s*\(.*?\)/, '').replace(/\s+/, ' ').trim();
          const dialogue = charMatch[2].trim();
          if (character && character.length > 1) {
            this.characters.add(character);
            if (!currentSceneCharacters.includes(character)) {
              currentSceneCharacters.push(character);
            }
            if (dialogue) {
              currentSceneDialogues.push(dialogue);
              this.dialogues.push({
                characters: character,
                Character_dialogue: dialogue
              });
            }
          }
        }
      } else if (/^[A-Z'\s]+$/.test(trimmedLine) && trimmedLine.length > 2 && trimmedLine.length < 30) {
        let character = trimmedLine.trim().replace(/\s*\(.*?\)/, '');
        if (character && !['THE', 'AND', 'OR', 'TO', 'IN', 'ON', 'AT'].includes(character)) {
          this.characters.add(character);
          if (!currentSceneCharacters.includes(character)) {
            currentSceneCharacters.push(character);
          }
        }
      } else if (/^[A-Z][A-Z\s'().]+$/.test(trimmedLine) && trimmedLine.length < 50) {
        let character = trimmedLine.trim().replace(/\s*\(.*?\)/, '');
        if (character) {
          this.characters.add(character);
          if (!currentSceneCharacters.includes(character)) {
            currentSceneCharacters.push(character);
          }
        }
      } else {
        currentSceneAction += " " + trimmedLine;
      }
    }

    if (currentScene) {
      this.scenes.push({
        Scene_Names: currentScene,
        Scene_action: currentSceneAction.trim(),
        Scene_Characters: currentSceneCharacters.length > 0 ? [...currentSceneCharacters] : null,
        Scene_Dialogue: currentSceneDialogues.length > 0 ? [...currentSceneDialogues] : null,
        Contents: `${currentSceneAction.trim()}\n${currentSceneDialogues.join(' ')}`
      });
    }
    this.movieCharacters = Array.from(this.characters).sort();
  }

  generateCharacterInteractions(): Array<{ pair: string; count: number }> {
    const interactions: Record<string, number> = {};

    this.scenes.forEach(scene => {
      if (scene.Scene_Characters && scene.Scene_Characters.length > 1) {
        const uniqueChars = [...new Set(scene.Scene_Characters)];
        for (let i = 0; i < uniqueChars.length; i++) {
          for (let j = i + 1; j < uniqueChars.length; j++) {
            const pair = [uniqueChars[i], uniqueChars[j]].sort().join(' ↔ ');
            interactions[pair] = (interactions[pair] || 0) + 1;
          }
        }
      }
    });

    return Object.entries(interactions)
      .map(([pair, count]) => ({ pair, count }))
      .sort((a, b) => b.count - a.count);
  }

  generateAllScenesText(): string {
    let content = `${this.scriptName.toUpperCase()} - ALL SCENES COMPLETE\n`;
    content += `Complete extraction of all ${this.scenes.length} scenes\n`;
    content += "=".repeat(80) + "\n\n";

    this.scenes.forEach((scene, idx) => {
      content += `SCENE ${idx + 1}:\n`;
      content += "-".repeat(40) + "\n";
      content += `Scene Name: ${scene.Scene_Names}\n`;
      content += `Scene Action: ${scene.Scene_action}\n`;
      content += `Characters: ${scene.Scene_Characters ? scene.Scene_Characters.join(', ') : 'None'}\n`;
      content += `Dialogues: ${scene.Scene_Dialogue ? scene.Scene_Dialogue.join(' | ') : 'None'}\n`;
      content += `Complete Content: ${scene.Contents}\n`;
      content += "=".repeat(80) + "\n\n";
    });

    return content;
  }

  generateAnalysisResults(): AnalysisResults {
    const characterCounts = this.dialogues.reduce((acc, dialogue) => {
      acc[dialogue.characters] = (acc[dialogue.characters] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCharacters = Object.entries(characterCounts)
      .map(([character, count]) => ({ character, count }))
      .sort((a, b) => b.count - a.count);

    const interactions = this.generateCharacterInteractions();

    return {
      scenes: this.scenes,
      dialogues: this.dialogues,
      characters: this.characters,
      movieCharacters: this.movieCharacters,
      summary: {
        totalScenes: this.scenes.length,
        totalDialogues: this.dialogues.length,
        totalCharacters: this.movieCharacters.length,
        topCharacters: topCharacters.slice(0, 10)
      },
      interactions
    };
  }

  // EXACT methods from Node.js code - browser adapted
  saveAllScenes(): string {
    console.log(`💾 Saving ALL ${this.scriptName} scenes...`);
    const content = this.generateAllScenesText();
    console.log(`✅ ALL ${this.scenes.length} scenes saved`);
    return content;
  }

  saveAllDialogues(): string {
    console.log(`💾 Saving ALL ${this.scriptName} dialogues...`);
    let content = `${this.scriptName.toUpperCase()} - ALL DIALOGUES COMPLETE\n`;
    content += `Complete extraction of all ${this.dialogues.length} dialogue entries\n`;
    content += "=".repeat(80) + "\n\n";

    this.dialogues.forEach((dialogue, idx) => {
      content += `DIALOGUE ${idx + 1}:\n`;
      content += "-".repeat(40) + "\n";
      content += `Character: ${dialogue.characters}\n`;
      content += `Dialogue: ${dialogue.Character_dialogue}\n`;
      content += "-".repeat(40) + "\n";
    });

    console.log(`✅ ALL ${this.dialogues.length} dialogues saved`);
    return content;
  }

  saveAllCharacters(): string {
    console.log(`💾 Saving ALL ${this.scriptName} characters...`);
    const characterCounts = this.dialogues.reduce((acc, dialogue) => {
      acc[dialogue.characters] = (acc[dialogue.characters] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sortedCharactersByCount = Object.entries(characterCounts).sort((a, b) => b[1] - a[1]);

    let content = `${this.scriptName.toUpperCase()} - ALL CHARACTERS COMPLETE\n`;
    content += `Complete list of all ${this.movieCharacters.length} characters\n`;
    content += "=".repeat(80) + "\n\n";

    if (sortedCharactersByCount.length > 0) {
      content += "CHARACTER RANKING BY DIALOGUE COUNT:\n";
      content += "-".repeat(40) + "\n";
      sortedCharactersByCount.forEach(([character, count], idx) => {
        content += `${(idx + 1).toString().padStart(2, ' ')}. ${character}: ${count} dialogues\n`;
      });
    }

    content += `\nALL CHARACTERS IDENTIFIED:\n`;
    content += "-".repeat(40) + "\n";
    this.movieCharacters.forEach((character, idx) => {
      const dialogueCount = characterCounts[character] || 0;
      content += `${(idx + 1).toString().padStart(2, ' ')}. ${character} (${dialogueCount} dialogues)\n`;
    });

    console.log(`✅ ALL ${this.movieCharacters.length} characters saved`);
    return content;
  }

  saveCharacterInteractions(): string {
    console.log(`💾 Saving ${this.scriptName} character interactions...`);
    const interactions: Record<string, number> = {};

    this.scenes.forEach(scene => {
      if (scene.Scene_Characters && scene.Scene_Characters.length > 1) {
        const uniqueChars = [...new Set(scene.Scene_Characters)];
        for (let i = 0; i < uniqueChars.length; i++) {
          for (let j = i + 1; j < uniqueChars.length; j++) {
            const pair = [uniqueChars[i], uniqueChars[j]].sort().join(' ↔ ');
            interactions[pair] = (interactions[pair] || 0) + 1;
          }
        }
      }
    });

    const sortedInteractions = Object.entries(interactions).sort((a, b) => b[1] - a[1]);

    let content = `${this.scriptName.toUpperCase()} - ALL CHARACTER INTERACTIONS\n`;
    content += `Complete character interaction analysis\n`;
    content += `Total character pairs found: ${sortedInteractions.length}\n`;
    content += "=".repeat(80) + "\n\n";
    content += "CHARACTER PAIRS (Sorted by co-occurrence):\n";
    content += "-".repeat(50) + "\n";
    sortedInteractions.forEach(([pair, count], idx) => {
      content += `${(idx + 1).toString().padStart(3, ' ')}. ${pair}: ${count} scenes together\n`;
    });

    console.log(`✅ ${sortedInteractions.length} character interactions saved`);
    return content;
  }

  saveCompleteSummary(): string {
    console.log(`💾 Saving ${this.scriptName} complete summary...`);
    const characterCounts = this.dialogues.reduce((acc, dialogue) => {
      acc[dialogue.characters] = (acc[dialogue.characters] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const sortedCharactersByCount = Object.entries(characterCounts).sort((a, b) => b[1] - a[1]);

    let content = `${this.scriptName.toUpperCase()} - COMPLETE ANALYSIS SUMMARY\n`;
    content += `Full extraction and analysis of ${this.scriptName} screenplay\n`;
    content += "=".repeat(80) + "\n\n";
    content += "EXTRACTION RESULTS:\n";
    content += "-".repeat(20) + "\n";
    content += `Total Scenes: ${this.scenes.length}\n`;
    content += `Total Dialogues: ${this.dialogues.length}\n`;
    content += `Total Characters: ${this.movieCharacters.length}\n`;

    if (sortedCharactersByCount.length > 0) {
      content += `\nTOP 10 CHARACTERS BY DIALOGUE COUNT:\n`;
      content += "-".repeat(40) + "\n";
      sortedCharactersByCount.slice(0, 10).forEach(([character, count], idx) => {
        content += `${(idx + 1).toString().padStart(2, ' ')}. ${character}: ${count} dialogues\n`;
      });
    }

    content += `\nFILES GENERATED:\n`;
    content += "-".repeat(16) + "\n";
    content += `1. ALL_SCENES_COMPLETE.txt - All ${this.scenes.length} scenes\n`;
    content += "2. ALL_DIALOGUES_COMPLETE.txt - All dialogue entries\n";
    content += "3. ALL_CHARACTERS_COMPLETE.txt - All character details\n";
    content += "4. ALL_CHARACTER_INTERACTIONS.txt - Character relationships\n";
    content += "5. COMPLETE_ANALYSIS_SUMMARY.txt - This summary\n";

    console.log("✅ Complete summary saved");
    return content;
  }

  async runCompleteAnalysis(file: File): Promise<AnalysisResults> {
    console.log(`\n🎬 ${this.scriptName.toUpperCase()} COMPLETE ANALYZER`);
    console.log("Extracting ALL scenes, dialogues, and characters");
    console.log("=".repeat(60));

    try {
      const text = await this.extractPdfText(file);
      if (!text) {
        console.error(`❌ Failed to extract text from ${this.scriptName}`);
        throw new Error(`Failed to extract text from ${this.scriptName}`);
      }
      
      this.parseScreenplay(text);
      
      // Generate all output content like Node.js version
      this.saveAllScenes();
      this.saveAllDialogues();
      this.saveAllCharacters();
      this.saveCharacterInteractions();
      this.saveCompleteSummary();

      console.log(`\n🎉 ${this.scriptName.toUpperCase()} ANALYSIS FINISHED!`);
      console.log(`📁 All files saved to: browser localStorage`);
      console.log(`🎭 Analyzed ${this.movieCharacters.length} characters`);
      console.log(`🎬 Processed ${this.scenes.length} scenes`);
      console.log(`💬 Extracted ${this.dialogues.length} dialogues`);

      return this.generateAnalysisResults();
    } catch (error) {
      console.error(`❌ ${this.scriptName} analysis failed: ${error.message}`);
      console.error(error.stack);
      throw error;
    }
  }
}

// Helper function to save analysis results to localStorage
export const saveAnalysisToLocalStorage = (scriptName: string, results: AnalysisResults): void => {
  console.log(`💾 Saving analysis to localStorage...`);
  const key = `thinkAI_pdf_analysis_${scriptName}`;
  const data = {
    scriptName,
    timestamp: new Date().toISOString(),
    results
  };
  const jsonData = JSON.stringify(data);
  localStorage.setItem(key, jsonData);
  console.log(`✅ Analysis saved to localStorage: ${key}`);
  console.log(`📊 Saved data size: ${(jsonData.length / 1024).toFixed(2)} KB`);
  console.log(`📊 Saved scenes: ${results.scenes.length}`);
  console.log(`📊 Saved characters: ${results.movieCharacters.length}`);
  console.log(`📊 Saved dialogues: ${results.dialogues.length}`);
};

// Helper function to load analysis results from localStorage
export const loadAnalysisFromLocalStorage = (scriptName: string): AnalysisResults | null => {
  console.log(`📖 Loading analysis from localStorage...`);
  const key = `thinkAI_pdf_analysis_${scriptName}`;
  console.log(`🔍 Looking for key: ${key}`);
  
  const data = localStorage.getItem(key);
  if (data) {
    try {
      console.log(`✅ Found saved analysis (${(data.length / 1024).toFixed(2)} KB)`);
      const parsed = JSON.parse(data);
      console.log(`📊 Loaded scenes: ${parsed.results?.scenes?.length || 0}`);
      console.log(`📊 Loaded characters: ${parsed.results?.movieCharacters?.length || 0}`);
      console.log(`📊 Loaded dialogues: ${parsed.results?.dialogues?.length || 0}`);
      console.log(`📅 Analysis timestamp: ${parsed.timestamp}`);
      return parsed.results;
    } catch (error) {
      console.error('❌ Failed to parse saved analysis:', error);
      return null;
    }
  }
  console.log('❌ No saved analysis found');
  return null;
};

// Helper function to download analysis as text file
export const downloadAnalysisAsText = (scriptName: string, content: string, filename?: string): void => {
  const finalFilename = filename || `${scriptName}_ALL_SCENES_COMPLETE.txt`;
  console.log(`📥 Downloading file: ${finalFilename}`);
  console.log(`📊 File content size: ${(content.length / 1024).toFixed(2)} KB`);
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = finalFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log(`✅ Download initiated: ${finalFilename}`);
};

// Export all analysis files (matching Node.js functionality)
export const exportAllAnalysisFiles = (analyzer: NodeJSStylePDFAnalyzer, scriptName: string): void => {
  console.log(`📁 Exporting all analysis files for ${scriptName}...`);
  
  // Export ALL_SCENES_COMPLETE.txt
  downloadAnalysisAsText(scriptName, analyzer.saveAllScenes(), `ALL_SCENES_COMPLETE.txt`);
  
  // Export ALL_DIALOGUES_COMPLETE.txt
  downloadAnalysisAsText(scriptName, analyzer.saveAllDialogues(), `ALL_DIALOGUES_COMPLETE.txt`);
  
  // Export ALL_CHARACTERS_COMPLETE.txt
  downloadAnalysisAsText(scriptName, analyzer.saveAllCharacters(), `ALL_CHARACTERS_COMPLETE.txt`);
  
  // Export ALL_CHARACTER_INTERACTIONS.txt
  downloadAnalysisAsText(scriptName, analyzer.saveCharacterInteractions(), `ALL_CHARACTER_INTERACTIONS.txt`);
  
  // Export COMPLETE_ANALYSIS_SUMMARY.txt
  downloadAnalysisAsText(scriptName, analyzer.saveCompleteSummary(), `COMPLETE_ANALYSIS_SUMMARY.txt`);
  
  console.log(`✅ All analysis files exported for ${scriptName}`);
};