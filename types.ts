
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
  dailyLimit: number;
  currentGenerations: number;
  max_usage?: number; // Supabase map
  total_usage?: number; // Supabase map
  // Status
  status: 'active' | 'paused' | 'exhausted';
  is_active?: boolean; // Supabase map
  // Cloudinary
  cloudinaryCloudName?: string;
  cloudinaryTag?: string;
  cloudinaryApiKey?: string;
  cloudinaryApiSecret?: string;
  // Supabase Snake Case Mappings
  cloudinary_cloud_name?: string;
  cloudinary_api_key?: string;
  cloudinary_api_secret?: string;
  cloudinary_tag?: string;
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
}
