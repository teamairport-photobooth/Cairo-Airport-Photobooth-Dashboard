
export enum UserRole {
  ADMIN = 'ADMIN',
  REGULAR = 'REGULAR'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  assignedProjectIds: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  ownerId: string;
  // Stats
  totalUsage?: number;
  total_usage?: number; // Supabase map
  created_at?: string;
  created_by?: string;
}

export interface UsageLog {
  id: string;
  projectId: string;
  timestamp: string;
  amount: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface CloudinaryImage {
  public_id: string;
  version: number;
  format: string;
  width: number;
  height: number;
  type: string;
  created_at: string;
  secure_url?: string;
  url?: string;
  context?: {
    [key: string]: string;
  };
  metadata?: {
    [key: string]: string;
  };
  tags?: string[];
}

export interface GlobalSettings {
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
  cloudinaryTag: string;
  cronJobsApiKey?: string;
  cronSecret?: string;
}

