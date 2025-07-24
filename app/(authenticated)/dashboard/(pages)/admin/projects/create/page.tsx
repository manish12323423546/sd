"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelectedProject } from '@/hooks/useSelectedProject';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Upload, ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ProjectData } from '@/lib/types';
import { cjsApiService } from '@/lib/services/cjsApiService';

export default function CreateProjectPage() {
  const router = useRouter();
  const { selectProject } = useSelectedProject();
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [scriptFile, setScriptFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>('');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Accept both PDF and TXT files
      const isValidType = file.type === 'application/pdf' || 
                         file.type === 'text/plain' || 
                         file.name.toLowerCase().endsWith('.pdf') || 
                         file.name.toLowerCase().endsWith('.txt');
      
      if (!isValidType) {
        toast.error("Invalid file type", {
          description: "Please upload a PDF or TXT file only.",
        });
        return;
      }
      
      console.log('📄 Script file selected:', file.name, '(', (file.size / 1024).toFixed(2), 'KB)');
      setScriptFile(file);
    }
  };

  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        // For PDF, store info and let the script analysis page handle processing
        resolve(`PDF_FILE_UPLOADED: ${file.name}\nSize: ${(file.size / 1024).toFixed(2)} KB\nFile will be processed when accessing Script Analysis page.`);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Project name required", {
        description: "Please enter a project name.",
      });
      return;
    }

    if (!scriptFile) {
      toast.error("Script file required", {
        description: "Please upload a script file.",
      });
      return;
    }

    setIsUploading(true);

    try {
      console.log('📁 Processing script file:', scriptFile.name);
      
      let scriptContent: string;
      let analysisData: any = null;
      
      if (scriptFile.name.toLowerCase().endsWith('.pdf')) {
        // Handle PDF with CJS API
        setAnalysisStatus('Analyzing PDF with CJS API...');
        
        // Check for cached analysis first
        const cached = cjsApiService.loadCachedAnalysis(scriptFile.name);
        if (cached) {
          console.log('⚡ Using cached PDF analysis');
          setAnalysisStatus('Using cached analysis...');
          analysisData = cached;
          scriptContent = `PDF Analysis Complete: ${scriptFile.name}\n\nExtracted ${cached.totalScenes || 0} scenes, ${cached.totalCharacters || 0} characters, ${cached.totalDialogues || 0} dialogues.`;
        } else {
          // Analyze with CJS API
          const result = await cjsApiService.analyzePdfWithFallback(
            scriptFile, 
            Date.now().toString()
          );
          
          if (result.success && result.data) {
            analysisData = result.data;
            const analysisSource = result.source === 'cjs' ? 'CJS API' : 'Browser Analysis';
            setAnalysisStatus(`Analysis complete via ${analysisSource}...`);
            scriptContent = `PDF Analysis Complete: ${scriptFile.name}\n\nExtracted ${result.data.totalScenes || 0} scenes, ${result.data.totalCharacters || 0} characters, ${result.data.totalDialogues || 0} dialogues.\n\nAnalyzed using: ${analysisSource}`;
          } else {
            throw new Error(result.error || 'PDF analysis failed');
          }
        }
      } else {
        // Handle TXT files
        setAnalysisStatus('Reading text file...');
        scriptContent = await readFileContent(scriptFile);
      }
      
      setAnalysisStatus('Creating project...');
      
      const projectData: ProjectData = {
        id: Date.now().toString(),
        name: formData.name,
        description: formData.description,
        scriptContent: scriptContent,
        created: new Date().toISOString(),
        pdfFileName: scriptFile.name.toLowerCase().endsWith('.pdf') ? scriptFile.name : undefined,
        pdfAnalysisResults: analysisData ? { success: true, data: analysisData } : undefined
      };

      // Store project data locally
      console.log('💾 Storing project data locally');
      const existingProjects = JSON.parse(localStorage.getItem('filmustage_projects') || '[]');
      const updatedProjects = [...existingProjects, projectData];
      localStorage.setItem('filmustage_projects', JSON.stringify(updatedProjects));

      // Set this project as selected
      selectProject(projectData);

      const sceneCount = analysisData ? analysisData.totalScenes || 0 : 0;
      const successMessage = sceneCount > 0 
        ? `${formData.name} created with ${sceneCount} scenes analyzed!`
        : `${formData.name} is ready for analysis.`;

      toast.success("Project created successfully!", {
        description: successMessage
      });

      // Set redirecting state
      setIsRedirecting(true);
      setAnalysisStatus('Project created! Redirecting to script analysis...');

      // Navigate to script analysis page
      setTimeout(() => {
        router.push('/dashboard/admin/script-analysis');
      }, 1500);
      
    } catch (error) {
      console.error('Error creating project:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast.error("Error creating project", {
        description: errorMessage,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/admin/projects')}
            className="mr-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Projects
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create New Project</h1>
            <p className="text-muted-foreground mt-2">
              Start your film production project with AI-powered analysis
            </p>
          </div>
        </div>

        {/* Main Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="font-medium">
                  Project Name *
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter project name..."
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              {/* Project Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="font-medium">
                  Project Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Enter project description..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                />
              </div>

              {/* Script Upload */}
              <div className="space-y-2">
                <Label htmlFor="script" className="font-medium">
                  Upload Script *
                </Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <input
                    id="script"
                    type="file"
                    accept=".pdf,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Label htmlFor="script" className="cursor-pointer">
                    {scriptFile ? (
                      <div className="space-y-3">
                        <FileText className="h-16 w-16 mx-auto text-primary" />
                        <div>
                          <p className="font-medium text-lg">{scriptFile.name}</p>
                          <p className="text-muted-foreground">
                            {(scriptFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          <p className="text-primary text-sm mt-2">Click to change file</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Upload className="h-16 w-16 mx-auto text-muted-foreground" />
                        <div>
                          <p className="font-medium text-lg">Upload Script File</p>
                          <p className="text-muted-foreground">
                            Drag and drop or click to browse
                          </p>
                          <p className="text-muted-foreground text-sm mt-2">
                            Supported formats: PDF and TXT files
                          </p>
                        </div>
                      </div>
                    )}
                  </Label>
                </div>
              </div>

              {/* Analysis Status */}
              {analysisStatus && (
                <div className="flex items-center space-x-3 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  <span className="text-primary font-medium">{analysisStatus}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/admin/projects')}
                  disabled={isUploading || isRedirecting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUploading || isRedirecting}
                  className="flex items-center space-x-2"
                >
                  {isRedirecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Redirecting...</span>
                    </>
                  ) : isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Creating Project...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      <span>Create Project</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}