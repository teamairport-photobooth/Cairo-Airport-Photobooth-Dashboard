
import { User, Project, UserRole } from './types';

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
    assignedProjectIds: ['cairo-airport-photobooth']
  }
];

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'cairo-airport-photobooth',
    name: 'Cairo Airport AI Photobooth',
    description: 'Main AI Photobooth instance at Cairo International Airport',
    createdAt: new Date().toISOString(),
    status: 'active',
    ownerId: 'system',
    cloudinaryTag: 'cairo-airport-photobooth'
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
  if (!localStorage.getItem('pb_settings')) {
    setStoreData('pb_settings', {
      cloudinaryCloudName: '',
      cloudinaryApiKey: '',
      cloudinaryApiSecret: ''
    });
  }
};
