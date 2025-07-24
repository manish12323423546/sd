const express = require('express');
const multer = require('multer');
const cors = require('cors');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('🏥 Health check requested');
  res.json({ 
    status: 'healthy', 
    message: 'CJS API server is running',
    timestamp: new Date().toISOString()
  });
});

// PDF Analysis Class (same logic as browser version)
class PDFAnalyzer {
  constructor(scriptName) {
    this.scriptName = scriptName;
    this.scenes = [];
    this.dialogues = [];
    this.characters = new Set();
    this.movieCharacters = [];
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
      } else {
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

  generateCharacterInteractions() {
    const interactions = {};

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

  generateAnalysisResults() {
    const characterCounts = this.dialogues.reduce((acc, dialogue) => {
      acc[dialogue.characters] = (acc[dialogue.characters] || 0) + 1;
      return acc;
    }, {});

    const topCharacters = Object.entries(characterCounts)
      .map(([character, count]) => ({ character, count }))
      .sort((a, b) => b.count - a.count);

    const interactions = this.generateCharacterInteractions();

    return {
      totalScenes: this.scenes.length,
      totalCharacters: this.movieCharacters.length,
      totalDialogues: this.dialogues.length,
      scenes: this.scenes,
      characters: this.movieCharacters,
      dialogues: this.dialogues,
      summary: {
        totalScenes: this.scenes.length,
        totalDialogues: this.dialogues.length,
        totalCharacters: this.movieCharacters.length,
        topCharacters: topCharacters.slice(0, 10)
      },
      interactions
    };
  }
}

// PDF analysis endpoint
app.post('/api/analyze-pdf', upload.single('pdf'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('\n🚀 CJS API: Starting PDF analysis...');
    console.log(`📄 File: ${req.file?.originalname}`);
    console.log(`📊 Size: ${(req.file?.size / 1024).toFixed(2)} KB`);
    console.log(`🆔 Project ID: ${req.body.projectId}`);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No PDF file uploaded'
      });
    }

    // Extract text from PDF
    console.log('📖 Extracting text from PDF...');
    const pdfBufffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(pdfBufffer);
    const text = pdfData.text;

    if (!text || text.length < 10) {
      throw new Error('Failed to extract meaningful text from PDF');
    }

    console.log(`✅ Extracted ${text.length} characters from PDF`);

    // Analyze screenplay
    const scriptName = req.file.originalname.replace('.pdf', '');
    const analyzer = new PDFAnalyzer(scriptName);
    analyzer.parseScreenplay(text);
    const results = analyzer.generateAnalysisResults();

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    const duration = Date.now() - startTime;
    console.log(`🎉 Analysis completed in ${duration}ms`);
    console.log(`📊 Results: ${results.totalScenes} scenes, ${results.totalCharacters} characters, ${results.totalDialogues} dialogues`);

    res.json({
      success: true,
      data: results,
      processingTime: duration
    });

  } catch (error) {
    console.error('❌ PDF analysis failed:', error.message);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: error.message,
      processingTime: Date.now() - startTime
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 CJS API Server Started!');
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📄 PDF Analysis: POST http://localhost:${PORT}/api/analyze-pdf`);
  console.log('🔥 Ready to process PDF scripts!\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down CJS API server...');
  process.exit(0);
});

module.exports = app;