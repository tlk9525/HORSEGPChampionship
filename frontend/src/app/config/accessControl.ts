import { UserRole } from '../services/api';

export type AppPage =
  | 'home'
  | 'login'
  | 'register'
  | 'tournaments'
  | 'tournament-details'
  | 'race-details'
  | 'admin'
  | 'create-race'
  | 'edit-race'
  | 'horses'
  | 'register-horse'
  | 'race-registration'
  | 'edit-horse'
  | 'horse-details'
  | 'horse-profiles'
  | 'jockey-profiles'
  | 'jockeys'
  | 'live-race'
  | 'simulation-demo'
  | 'results';

const ALL_ROLES: UserRole[] = ['admin', 'owner', 'jockey', 'referee', 'spectator'];

export const roleHome: Record<UserRole, AppPage> = {
  admin: 'admin',
  owner: 'horses',
  jockey: 'jockeys',
  referee: 'live-race',
  spectator: 'tournaments',
};

export const pageAccess: Partial<Record<AppPage, UserRole[]>> = {
  tournaments: ALL_ROLES,
  'tournament-details': ALL_ROLES,
  'race-details': ALL_ROLES,
  admin: ['admin'],
  'create-race': ['admin'],
  'edit-race': ['admin'],
  horses: ['owner'],
  'register-horse': ['owner'],
  'race-registration': ['owner'],
  'edit-horse': ['owner'],
  'horse-details': ALL_ROLES,
  'horse-profiles': ALL_ROLES,
  'jockey-profiles': ALL_ROLES,
  jockeys: ['jockey'],
  'live-race': ['admin', 'referee', 'spectator'],
  'simulation-demo': ALL_ROLES,
};

export const isPageProtected = (page: string) =>
  Boolean(pageAccess[page as AppPage]);

export const canAccessPage = (page: string, role: UserRole | null | undefined) => {
  const allowedRoles = pageAccess[page as AppPage];

  if (!allowedRoles) return true;
  if (!role) return false;

  return allowedRoles.includes(role);
};

type NavItem = {
  name: string;
  page: AppPage;
  roles?: UserRole[];
  public?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { name: 'Tournaments', page: 'tournaments', roles: ALL_ROLES },
  { name: 'Horses', page: 'horses', roles: ['owner'] },
  { name: 'Horse Profiles', page: 'horse-profiles', roles: ALL_ROLES },
  { name: 'Jockey Profiles', page: 'jockey-profiles', roles: ALL_ROLES },
  { name: 'Jockey Portal', page: 'jockeys', roles: ['jockey'] },
  { name: 'Race Operations', page: 'live-race', roles: ['admin', 'referee', 'spectator'] },
  { name: 'Race Replay', page: 'simulation-demo', roles: ALL_ROLES },
  { name: 'Results', page: 'results', public: true },
  { name: 'Admin', page: 'admin', roles: ['admin'] },
];
