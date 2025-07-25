// Global type definitions

export type Roles = 
  | 'admin'
  | 'writer'
  | 'producer'
  | 'storyboard_artist'
  | 'director'
  | 'team_member';

export interface User {
  id: string;
  role?: Roles;
  email?: string;
  name?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
}

export interface ScriptAnalysis {
  id: string;
  projectId: string;
  content: string;
  analysis?: any;
  createdAt: Date;
} 