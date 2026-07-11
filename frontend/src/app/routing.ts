import { AuthUser, HorseRecord, UserRole } from './services/api';

export type AppPage =
  | 'home'
  | 'login'
  | 'register'
  | 'tournaments'
  | 'tournament-details'
  | 'race-details'
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
  | 'results'
  | 'betting'
  | 'admin'
  | 'create-race'
  | 'edit-race';

export const roleHome: Record<UserRole, AppPage> = {
  admin: 'admin',
  owner: 'horses',
  jockey: 'jockeys',
  referee: 'live-race',
  spectator: 'tournaments',
};

export const protectedPages: Record<AppPage, UserRole[] | undefined> = {
  home: undefined,
  login: undefined,
  register: undefined,
  tournaments: ['admin', 'owner', 'jockey', 'referee', 'spectator'],
  'tournament-details': ['admin', 'owner', 'jockey', 'referee', 'spectator'],
  'race-details': ['admin', 'owner', 'jockey', 'referee', 'spectator'],
  admin: ['admin'],
  'create-race': ['admin'],
  'edit-race': ['admin'],
  horses: ['admin', 'owner'],
  'register-horse': ['owner'],
  'race-registration': ['owner'],
  'edit-horse': ['owner'],
  'horse-details': ['admin', 'owner', 'jockey', 'referee', 'spectator'],
  'horse-profiles': ['admin', 'owner', 'jockey', 'referee', 'spectator'],
  'jockey-profiles': ['admin', 'owner', 'jockey', 'referee', 'spectator'],
  jockeys: ['jockey'],
  'live-race': ['admin', 'referee', 'spectator'],
  'simulation-demo': ['admin', 'owner', 'jockey', 'referee', 'spectator'],
  results: ['admin', 'owner', 'jockey', 'referee', 'spectator'],
  betting: ['spectator'],
};

export interface RouteContext {
  selectedTournamentId: string;
  selectedRaceId: string;
  selectedHorseId: string;
}

export const pageFromPath = (pathname: string): AppPage => {
  const path = pathname.replace(/\/+$/, '') || '/';

  if (path === '/') return 'home';
  if (path === '/login') return 'login';
  if (path === '/register') return 'register';
  if (path === '/tournaments') return 'tournaments';
  if (/^\/races\/[^/]+\/register$/.test(path)) return 'race-registration';
  if (path.startsWith('/tournaments/')) return 'tournament-details';
  if (path === '/races' || path.startsWith('/races/')) return 'race-details';
  if (path === '/horses') return 'horses';
  if (path === '/horse-profiles') return 'horse-profiles';
  if (path === '/horses/new') return 'register-horse';
  if (/^\/horses\/[^/]+\/edit$/.test(path)) return 'edit-horse';
  if (/^\/horses\/[^/]+$/.test(path)) return 'horse-details';
  if (path === '/jockey-portal') return 'jockeys';
  if (path === '/jockeys/me') return 'jockeys';
  if (path === '/jockeys') return 'jockey-profiles';
  if (path === '/live-race' || path.startsWith('/live-race/')) return 'live-race';
  if (path === '/simulation-demo' || path.startsWith('/simulation-demo/')) return 'simulation-demo';
  if (path === '/results') return 'results';
  if (path === '/betting') return 'betting';
  if (path === '/admin') return 'admin';
  if (path === '/admin/races/new') return 'create-race';
  if (/^\/admin\/races\/[^/]+\/edit$/.test(path)) return 'edit-race';

  return 'tournaments';
};

export const pathForPage = (
  page: AppPage | string,
  context: RouteContext,
  selectedHorse?: HorseRecord | null
) => {
  const selectedHorseId = selectedHorse?.id || context.selectedHorseId;

  const paths: Record<AppPage, string> = {
    home: '/',
    login: '/login',
    register: '/register',
    tournaments: '/tournaments',
    'tournament-details': context.selectedTournamentId
      ? `/tournaments/${context.selectedTournamentId}`
      : '/tournaments',
    'race-details': context.selectedRaceId ? `/races/${context.selectedRaceId}` : '/races',
    horses: '/horses',
    'register-horse': '/horses/new',
    'race-registration': context.selectedRaceId
      ? `/races/${context.selectedRaceId}/register`
      : '/tournaments',
    'edit-horse': selectedHorseId ? `/horses/${selectedHorseId}/edit` : '/horses',
    'horse-details': selectedHorseId ? `/horses/${selectedHorseId}` : '/horses',
    'horse-profiles': '/horse-profiles',
    'jockey-profiles': '/jockeys',
    jockeys: '/jockey-portal',
    'live-race': context.selectedRaceId ? `/live-race/${context.selectedRaceId}` : '/live-race',
    'simulation-demo': context.selectedRaceId
      ? `/simulation-demo/${context.selectedRaceId}`
      : '/simulation-demo',
    results: '/results',
    betting: '/betting',
    admin: '/admin',
    'create-race': '/admin/races/new',
    'edit-race': context.selectedRaceId
      ? `/admin/races/${context.selectedRaceId}/edit`
      : '/admin',
  };

  return (page in paths ? paths[page as AppPage] : undefined) || '/tournaments';
};

export const canAccessPage = (page: AppPage, user: AuthUser | null) => {
  const allowedRoles = protectedPages[page];
  if (!allowedRoles) return true;
  return Boolean(user && allowedRoles.includes(user.role));
};

export const isProtectedPage = (page: AppPage) => Boolean(protectedPages[page]);
