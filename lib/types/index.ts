export interface Scene {
  id: number;
  number: string;
  header: string;
  pageFrame: string;
  content: string;
  breakdown: {
    cast: string[];
    props: string[];
    locationDetails: string[];
    sound?: string[];
    costumes?: string[];
    vehicles?: string[];
    animals?: string[];
    set?: string[];
  };
  notes: string;
}

export interface Project {
  name: string;
  created: string;
  scenes: number;
}

// Enhanced Project Data for localStorage
export interface ProjectData {
  id: string;
  name: string;
  description: string;
  scriptContent: string;
  created: string;
  pdfFileName?: string; // Store PDF filename for projects with PDF scripts
  pdfAnalysisResults?: any; // Store PDF analysis results from CJS API
}

export interface CastMember {
  id: number;
  tag: string;
  dood: number;
  scenes: number;
  occurrence: number;
  pages: string;
  notes?: string;
}

export interface BudgetItem {
  id: number;
  code: string;
  name: string;
  tagType: string;
  estimate: number;
  fringes: number;
}

export interface ScheduleItem {
  id: number;
  set: string;
  castId: string;
  pages: string;
  unit: string;
  estimation: number;
  location: string;
  description: string;
}