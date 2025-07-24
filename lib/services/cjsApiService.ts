/**
 * CJS API Service for think.ai
 * Interfaces with the Node.js CJS backend for advanced PDF script analysis
 * Fallback to browser-based analysis if CJS API is unavailable
 */

import { AnalysisResults } from './pdfAnalyzerNodeJS';
import { ClientPdfAnalyzer } from './clientPdfAnalyzer';

// CJS API Configuration
const CJS_API_BASE_URL = 'http://localhost:3002';
const CJS_API_TIMEOUT = 30000; // 30 seconds timeout

export interface CJSAnalysisResponse {
  success: boolean;
  data?: {
    totalScenes: number;
    totalCharacters: number;
    totalDialogues: number;
    scenes: any[];
    characters: string[];
    dialogues: any[];
    summary: any;
    interactions: any[];
  };
  error?: string;
  message?: string;
}

class CJSApiService {
  private isApiAvailable: boolean | null = null;
  private lastHealthCheck: number = 0;
  private healthCheckInterval = 60000; // Check every minute

  /**
   * Check if CJS API is available
   */
  async checkApiHealth(): Promise<boolean> {
    const now = Date.now();
    
    // Cache health check for 1 minute
    if (this.isApiAvailable !== null && (now - this.lastHealthCheck) < this.healthCheckInterval) {
      return this.isApiAvailable;
    }

    try {
      console.log('🏥 Checking CJS API health...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for health check
      
      const response = await fetch(`${CJS_API_BASE_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        this.isApiAvailable = true;
        this.lastHealthCheck = now;
        console.log('✅ CJS API is available');
        return true;
      } else {
        throw new Error(`Health check failed: ${response.status}`);
      }
    } catch (error) {
      console.warn('⚠️ CJS API not available:', error.message);
      this.isApiAvailable = false;
      this.lastHealthCheck = now;
      return false;
    }
  }

  /**
   * Analyze PDF using CJS API
   */
  async analyzePdfWithCJS(file: File, projectId: string): Promise<CJSAnalysisResponse> {
    try {
      console.log('📄 Starting CJS API PDF analysis...');
      console.log('📊 File:', file.name, `(${(file.size / 1024).toFixed(2)} KB)`);
      
      // Check if API is available first
      const isHealthy = await this.checkApiHealth();
      if (!isHealthy) {
        throw new Error('CJS API is not available');
      }

      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('projectId', projectId);

      console.log('🚀 Uploading to CJS API...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CJS_API_TIMEOUT);

      const response = await fetch(`${CJS_API_BASE_URL}/api/analyze-pdf`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`CJS API error: ${response.status} ${response.statusText}`);
      }

      const result: CJSAnalysisResponse = await response.json();
      
      if (result.success && result.data) {
        console.log('✅ CJS API analysis successful');
        console.log(`📊 Extracted ${result.data.totalScenes} scenes`);
        console.log(`📊 Found ${result.data.totalCharacters} characters`);
        console.log(`📊 Processed ${result.data.totalDialogues} dialogues`);
        
        // Save to localStorage for caching
        this.saveCJSResultsToLocalStorage(file.name, result.data);
        
        return result;
      } else {
        throw new Error(result.error || result.message || 'CJS API analysis failed');
      }
      
    } catch (error) {
      console.error('❌ CJS API analysis failed:', error);
      
      if (error.name === 'AbortError') {
        throw new Error('CJS API request timed out');
      }
      
      throw error;
    }
  }

  /**
   * Analyze PDF with fallback to browser-based analysis
   */
  async analyzePdfWithFallback(file: File, projectId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    source: 'cjs' | 'browser';
  }> {
    try {
      console.log('🔄 Attempting PDF analysis with CJS API fallback...');
      
      // Try CJS API first
      try {
        const cjsResult = await this.analyzePdfWithCJS(file, projectId);
        if (cjsResult.success && cjsResult.data) {
          return {
            success: true,
            data: cjsResult.data,
            source: 'cjs'
          };
        }
      } catch (cjsError) {
        console.warn('⚠️ CJS API failed, falling back to browser analysis:', cjsError.message);
      }

      // Fallback to browser-based analysis
      console.log('🌐 Using client-side PDF analysis...');
      const analyzer = new ClientPdfAnalyzer(file.name.replace('.pdf', ''));
      const browserResult = await analyzer.runCompleteAnalysis(file);
      
      // Save browser results to localStorage
      this.saveBrowserResultsToLocalStorage(file.name.replace('.pdf', ''), browserResult);
      
      // Transform browser results to match CJS API format
      const transformedData = {
        totalScenes: browserResult.summary.totalScenes,
        totalCharacters: browserResult.summary.totalCharacters,
        totalDialogues: browserResult.summary.totalDialogues,
        scenes: browserResult.scenes,
        characters: browserResult.movieCharacters,
        dialogues: browserResult.dialogues,
        summary: browserResult.summary,
        interactions: browserResult.interactions
      };

      console.log('✅ Browser-based analysis successful');
      console.log(`📊 Extracted ${transformedData.totalScenes} scenes`);
      console.log(`📊 Found ${transformedData.totalCharacters} characters`);
      console.log(`📊 Processed ${transformedData.totalDialogues} dialogues`);

      return {
        success: true,
        data: transformedData,
        source: 'browser'
      };
      
    } catch (error) {
      console.error('❌ Both CJS API and browser analysis failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF analysis failed',
        source: 'browser'
      };
    }
  }

  /**
   * Save browser results to localStorage for caching
   */
  private saveBrowserResultsToLocalStorage(scriptName: string, results: AnalysisResults): void {
    try {
      const key = `thinkAI_browser_analysis_${scriptName}`;
      const cacheData = {
        scriptName,
        timestamp: new Date().toISOString(),
        source: 'browser',
        results
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
      console.log(`💾 Browser results cached: ${key}`);
    } catch (error) {
      console.warn('⚠️ Failed to cache browser results:', error);
    }
  }

  /**
   * Save CJS results to localStorage for caching
   */
  private saveCJSResultsToLocalStorage(scriptName: string, data: any): void {
    try {
      const key = `thinkAI_cjs_analysis_${scriptName.replace('.pdf', '')}`;
      const cacheData = {
        scriptName,
        timestamp: new Date().toISOString(),
        source: 'cjs',
        data
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
      console.log(`💾 CJS results cached: ${key}`);
    } catch (error) {
      console.warn('⚠️ Failed to cache CJS results:', error);
    }
  }

  /**
   * Load cached analysis results
   */
  loadCachedAnalysis(scriptName: string): any | null {
    try {
      const cleanName = scriptName.replace('.pdf', '');
      
      // Try CJS cache first
      const cjsKey = `thinkAI_cjs_analysis_${cleanName}`;
      const cjsData = localStorage.getItem(cjsKey);
      if (cjsData) {
        const parsed = JSON.parse(cjsData);
        console.log(`📖 Loaded CJS cached analysis: ${cjsKey}`);
        return { ...parsed.data, source: 'cjs' };
      }

      // Try browser cache (new format)
      const browserKey = `thinkAI_browser_analysis_${cleanName}`;
      const browserData = localStorage.getItem(browserKey);
      if (browserData) {
        const parsed = JSON.parse(browserData);
        console.log(`📖 Loaded browser cached analysis: ${browserKey}`);
        return { 
          totalScenes: parsed.results.summary.totalScenes,
          totalCharacters: parsed.results.summary.totalCharacters,
          totalDialogues: parsed.results.summary.totalDialogues,
          scenes: parsed.results.scenes,
          characters: parsed.results.movieCharacters,
          dialogues: parsed.results.dialogues,
          summary: parsed.results.summary,
          interactions: parsed.results.interactions,
          source: 'browser'
        };
      }

      // Try old browser cache format
      const oldBrowserKey = `thinkAI_pdf_analysis_${cleanName}`;
      const oldBrowserData = localStorage.getItem(oldBrowserKey);
      if (oldBrowserData) {
        const parsed = JSON.parse(oldBrowserData);
        console.log(`📖 Loaded old browser cached analysis: ${oldBrowserKey}`);
        return { 
          totalScenes: parsed.results.summary.totalScenes,
          totalCharacters: parsed.results.summary.totalCharacters,
          totalDialogues: parsed.results.summary.totalDialogues,
          scenes: parsed.results.scenes,
          characters: parsed.results.movieCharacters,
          dialogues: parsed.results.dialogues,
          summary: parsed.results.summary,
          interactions: parsed.results.interactions,
          source: 'browser'
        };
      }

      return null;
    } catch (error) {
      console.warn('⚠️ Failed to load cached analysis:', error);
      return null;
    }
  }

  /**
   * Clear cached analysis data
   */
  clearAnalysisCache(scriptName?: string): void {
    try {
      if (scriptName) {
        const cleanName = scriptName.replace('.pdf', '');
        localStorage.removeItem(`thinkAI_cjs_analysis_${cleanName}`);
        localStorage.removeItem(`thinkAI_pdf_analysis_${cleanName}`);
        console.log(`🗑️ Cleared cache for: ${cleanName}`);
      } else {
        // Clear all analysis cache
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('thinkAI_cjs_analysis_') || key.startsWith('thinkAI_pdf_analysis_')) {
            localStorage.removeItem(key);
          }
        });
        console.log('🗑️ Cleared all analysis cache');
      }
    } catch (error) {
      console.warn('⚠️ Failed to clear cache:', error);
    }
  }
}

// Export singleton instance
export const cjsApiService = new CJSApiService();

// Export types and utilities
export { CJSApiService };
export type { AnalysisResults };