export const API_HOST =
  process.env.API_HOST ||
  process.env.HOST ||
  (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
export const API_PORT = Number(process.env.PORT || process.env.API_PORT || 4000);
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://127.0.0.1:5173/';
export const MAX_RACE_FIELD_SIZE = Number(process.env.MAX_RACE_FIELD_SIZE || 10);
export const MIN_READY_PARTICIPANTS = Number(process.env.MIN_READY_PARTICIPANTS || 5);
export const MAX_TOURNAMENT_RACES = Number(process.env.MAX_TOURNAMENT_RACES || 10);
export const MAX_OWNER_HORSES = Number(process.env.MAX_OWNER_HORSES || 5);
export const SESSION_DAYS = Number(process.env.SESSION_DAYS || 7);
export const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME || 'horse-racing-session';
export const COOKIE_SECURE =
  process.env.COOKIE_SECURE === 'true' ||
  (process.env.COOKIE_SECURE !== 'false' &&
    (process.env.NODE_ENV === 'production' || FRONTEND_URL.startsWith('https://')));
export const COOKIE_SAME_SITE =
  process.env.COOKIE_SAME_SITE || 'Lax';

export const USER_ROLES = Object.freeze({
  ADMIN: 'admin',
  OWNER: 'owner',
  JOCKEY: 'jockey',
  REFEREE: 'referee',
  SPECTATOR: 'spectator',
});

export const SELF_REGISTRATION_ROLES = [
  USER_ROLES.OWNER,
  USER_ROLES.JOCKEY,
  USER_ROLES.REFEREE,
  USER_ROLES.SPECTATOR,
];

export const ACCOUNT_APPROVAL_ROLES = [
  USER_ROLES.OWNER,
  USER_ROLES.JOCKEY,
  USER_ROLES.REFEREE,
];

export const TOURNAMENT_REGISTRATION_STATUSES = [
  'registration',
  'registration-open',
  'approvals',
  'active',
];

export const ACTIVE_TOURNAMENT_STATUSES = TOURNAMENT_REGISTRATION_STATUSES;

export const PUBLIC_RACE_STATUSES = [
  'registration-closed',
  'published',
  'in-progress',
  'finished',
  'completed',
];
