export const API_HOST =
  process.env.API_HOST ||
  process.env.HOST ||
  (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
export const API_PORT = Number(process.env.PORT || process.env.API_PORT || 4000);
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://127.0.0.1:5173/';
export const MAX_RACE_FIELD_SIZE = Number(process.env.MAX_RACE_FIELD_SIZE || 10);
export const MIN_READIED_PARTICIPANTS = Number(process.env.MIN_READIED_PARTICIPANTS || 5);
export const MAX_TOURNAMENT_RACES = Number(process.env.MAX_TOURNAMENT_RACES || 10);
export const MAX_OWNER_HORSES = Number(process.env.MAX_OWNER_HORSES || 10);
export const SPECTATOR_STARTING_CREDITS = Number(process.env.SPECTATOR_STARTING_CREDITS || 100);
export const BETTING_CLOSE_BEFORE_RACE_MS = 60 * 1000;
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

export const ACTIVE_TOURNAMENT_STATUSES = [
  'registration',
  'registration-open',
  'approvals',
  'active',
];

export const PUBLIC_RACE_STATUSES = [
  'registration-closed',
  'published',
  'in-progress',
  'finished',
  'completed',
];

export const RACE_CLASSES = {
  'Class 1': { min: 101, max: 140 },
  'Class 2': { min: 81, max: 100 },
  'Class 3': { min: 61, max: 80 },
  'Class 4': { min: 41, max: 60 },
  'Class 5': { min: 0, max: 40 },
  'Open': { min: 0, max: 140 }
};

export const RACE_CLASS_WEIGHT_RANGES = {
  'Class 1': { topWeightLb: 135, minWeightLb: 115 },
  'Class 2': { topWeightLb: 135, minWeightLb: 115 },
  'Class 3': { topWeightLb: 133, minWeightLb: 113 },
  'Class 4': { topWeightLb: 132, minWeightLb: 112 },
  'Class 5': { topWeightLb: 130, minWeightLb: 110 },
  Open: { topWeightLb: 135, minWeightLb: 110 },
};
