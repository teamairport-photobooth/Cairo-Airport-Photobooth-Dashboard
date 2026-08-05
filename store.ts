
import { User, Project, UsageLog, UserRole } from './types';

const INITIAL_USERS: User[] = [
  {
    id: 'u1',
    name: 'Super Admin',
    email: 'admin@photobooth.ai',
    role: UserRole.ADMIN,
    assignedProjectIds: []
  },
  {
    id: 'u2',
    name: 'Jane Doe',
    email: 'jane@example.com',
    role: UserRole.REGULAR,
    assignedProjectIds: ['p1']
  }
];

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'Wedding Gala 2024',
    description: 'AI Generated portraits for the Smith-Jones wedding event.',
    dailyLimit: 500,
    currentGenerations: 124,
    createdAt: new Date().toISOString(),
    status: 'active',
    ownerId: 'u2',
    cloudinaryTag: 'wedding'
  }
];

export const getStoreData = <T,>(key: string, initialValue: T): T => {
  if (typeof window === 'undefined') return initialValue;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : initialValue;
};

export const setStoreData = (key: string, value: any) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
};

export const initializeStore = () => {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem('pb_users')) {
    setStoreData('pb_users', INITIAL_USERS);
  }
  if (!localStorage.getItem('pb_projects')) {
    setStoreData('pb_projects', INITIAL_PROJECTS);
  }
  if (!localStorage.getItem('pb_logs')) {
    setStoreData('pb_logs', []);
  }
  if (!localStorage.getItem('pb_settings')) {
    setStoreData('pb_settings', {
      cloudinaryCloudName: '',
      cloudinaryApiKey: '',
      cloudinaryApiSecret: ''
    });
  }
};
