/**
 * Client-Side PDF Analyzer for think.ai
 * Only runs in browser environment to avoid Next.js SSR issues
 */

import { AnalysisResults, SceneData, DialogueData } from './pdfAnalyzerNodeJS';

export class ClientPdfAnalyzer {
  private scriptName: string;
  private scenes: SceneData[] = [];
  private dialogues: DialogueData[] = [];
  private characters: Set<string> = new Set();
  private movieCharacters: string[] = [];

  constructor(scriptName: string) {
    this.scriptName = scriptName;
    this.scenes = [];
    this.dialogues = [];
    this.characters = new Set();
    this.movieCharacters = [];
  }

  async extractPdfText(file: File): Promise<string> {
    // Only run in browser environment
    if (typeof window === 'undefined') {
      console.warn('📄 PDF extraction skipped - not in browser environment');
      return '';
    }

    console.log(`📖 Extracting text from ${this.scriptName} PDF (client-side)...`);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      console.log('📚 Loading PDF.js library...');
      
      // Use CDN version to avoid bundling issues
      if (!window.pdfjsLib) {
        await this.loadPdfJs();
      }

      const pdf = await window.pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true
      }).promise;
      
      let fullText = '';
      console.log(`📄 Processing ${pdf.numPages} pages...`);
      
      // Extract text page by page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Build text from items
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
        
        // Show progress for large PDFs
        if (pageNum % 10 === 0) {
          console.log(`📄 Processed ${pageNum}/${pdf.numPages} pages...`);
        }
      }
      
      console.log(`✅ Extracted ${fullText.length} characters from PDF`);
      return fullText;
      
    } catch (error) {
      console.error(`❌ Error extracting PDF: ${error.message}`);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  private async loadPdfJs(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.pdfjsLib) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        // Configure worker
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        console.log('✅ PDF.js loaded successfully');
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load PDF.js library'));
      };
      
      document.head.appendChild(script);
    });
  }

  parseScreenplay(text: string): void {
    console.log(`🎬 Parsing ${this.scriptName} screenplay structure...`);

    const lines = text.split('\n');
    let currentScene: string | null = null;
    let currentSceneAction = "";
    let currentSceneCharacters: string[] = [];
    let currentSceneDialogues: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Scene headers
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
      } 
      // Character dialogue
      else if (trimmedLine.includes(':') && trimmedLine.split(':')[0].length < 50) {
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
      } 
      // Character names
      else if (/^[A-Z'\s]+$/.test(trimmedLine) && trimmedLine.length > 2 && trimmedLine.length < 30) {
        let character = trimmedLine.trim().replace(/\s*\(.*?\)/, '');
        if (character && !['THE', 'AND', 'OR', 'TO', 'IN', 'ON', 'AT'].includes(character)) {
          this.characters.add(character);
          if (!currentSceneCharacters.includes(character)) {
            currentSceneCharacters.push(character);
          }
        }
      } 
      // Scene action
      else {
        currentSceneAction += " " + trimmedLine;
      }
    }

    // Add final scene
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

  private generateCharacterInteractions(): Array<{ pair: string; count: number }> {
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

  async runCompleteAnalysis(file: File): Promise<AnalysisResults> {
    // Only run in browser
    if (typeof window === 'undefined') {
      throw new Error('PDF analysis can only run in browser environment');
    }

    console.log(`\n🎬 ${this.scriptName.toUpperCase()} CLIENT-SIDE ANALYZER`);
    console.log("Extracting ALL scenes, dialogues, and characters");
    console.log("=".repeat(60));

    try {
      const text = await this.extractPdfText(file);
      if (!text || text.length < 10) {
        throw new Error(`Failed to extract meaningful text from ${this.scriptName}`);
      }
      
      this.parseScreenplay(text);

      console.log(`\n🎉 ${this.scriptName.toUpperCase()} ANALYSIS FINISHED!`);
      console.log(`🎭 Analyzed ${this.movieCharacters.length} characters`);
      console.log(`🎬 Processed ${this.scenes.length} scenes`);
      console.log(`💬 Extracted ${this.dialogues.length} dialogues`);

      return this.generateAnalysisResults();
    } catch (error) {
      console.error(`❌ ${this.scriptName} analysis failed: ${error.message}`);
      throw error;
    }
  }
}

// Type declaration for PDF.js global
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

// ClientPdfAnalyzer is already exported above as a class export