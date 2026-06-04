export type UserRole = 'admin' | 'owner' | 'jockey' | 'referee' | 'spectator';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
  authProvider?: string;
  avatarUrl?: string;
}

export interface ApprovalItem {
  id: string;
  entityType: 'horse' | 'jockey' | 'jockeyTournament' | 'raceEntry' | 'pairing';
  type: string;
  name: string;
  detail: string;
  date: string;
  targetUserId: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface HorseRecord {
  id: string;
  name: string;
  breed: string;
  species?: string;
  age: number;
  sex?: string;
  color?: string;
  weightKg?: number;
  heightCm?: number;
  baseHandicap?: number;
  speedRating?: number;
  staminaRating?: number;
  formRating?: number;
  healthRating?: number;
  overallRating?: number;
  healthStatus?: string;
  profileNotes?: string;
  ownerUserId: string;
  status: string;
  selectedJockeyUserId: string | null;
  jockeyConfirmation: string;
  veterinaryCertificateUrl?: string;
}

export interface JockeyProfileRecord {
  id: string;
  userId: string;
  jockeyName: string;
  jockeyEmail: string;
  bio: string;
  certificate: string;
  competitionLevel: string;
  weight: number;
  status: string;
}

export interface JockeyInvitation {
  id: string;
  horseId: string;
  ownerUserId: string;
  jockeyUserId: string;
  tournamentId: string | null;
  raceId: string | null;
  status: string;
  adminStatus: string | null;
  createdAt: string;
  respondedAt?: string;
}

export interface RaceBuilderPairing {
  invitationId: string;
  horseId: string;
  horseName: string;
  breed: string;
  age: number;
  ownerUserId: string;
  ownerName: string;
  jockeyUserId: string;
  jockeyName: string;
  jockeyWeight: number;
}

export interface RaceBuilderReferee {
  id: string;
  name: string;
}

export interface RaceEntryInput {
  invitationId: string;
}

export interface RaceRecord {
  id: string;
  tournamentId: string | null;
  raceNumber?: string;
  name: string;
  round?: string;
  date: string;
  time: string;
  venue: string;
  distance?: string;
  surface?: string;
  raceClass?: string;
  handicapMin?: number;
  handicapMax?: number;
  totalPrize?: number;
  refereeUserId?: string;
  refereeUserIds?: string;
  referee?: string;
  status: string;
  participants: number;
  ownerConfirmed: number;
  jockeyConfirmed: number;
  registrationPeriodMinutes?: number;
  registrationOpensAt?: string;
  registrationClosesAt?: string;
  resultStatus?: string;
  awardsPublished?: boolean;
}

export interface RaceEntryRecord {
  id: string;
  raceId: string;
  horseId: string;
  jockeyUserId: string;
  invitationId?: string;
  status: string;
  lane: number | null;
  handicap: number;
  ratingSnapshot?: number;
  ownerConfirmed: boolean;
  jockeyConfirmed: boolean;
  preRaceStatus: string;
  disqualified: boolean;
  resultStatus?: string;
  position?: number | null;
  finishTime?: string;
  notes?: string;
  violationNotes?: string;
  horseName?: string;
  jockeyName?: string;
  ownerName?: string;
  raceName?: string;
}

export interface JockeyTournamentRegistration {
  id: string;
  tournamentId: string;
  jockeyUserId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string | null;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000/api';
const TOKEN_KEY = 'horse-racing-token';

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);

export const storeToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = getStoredToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
};

export const login = async (email: string, password: string) => {
  return request<{ token: string; user: AuthUser }>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const loginWithGoogle = async (
  credential: string,
  role: UserRole = 'spectator'
) => {
  return request<{ token: string; user: AuthUser }>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential, role }),
  });
};

export const register = async (
  name: string,
  email: string,
  password: string,
  role: UserRole
) => {
  return request<{ user: AuthUser }>('/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role }),
  });
};

export const logout = async () => {
  return request<{ ok: boolean }>('/logout', { method: 'POST' });
};

export const getMe = async () => request<{ user: AuthUser }>('/me');

export const getBootstrap = async () =>
  request<{
    tournaments: any[];
    horses: HorseRecord[];
    races: RaceRecord[];
    jockeyProfiles: JockeyProfileRecord[];
    jockeyTournamentRegistrations: JockeyTournamentRegistration[];
    jockeyInvitations: JockeyInvitation[];
    raceEntries: RaceEntryRecord[];
    users: AuthUser[];
    notifications: NotificationItem[];
  }>('/bootstrap');

export const getApprovals = async () =>
  request<{ approvals: ApprovalItem[] }>('/admin/approvals');

export const decideApproval = async (
  entityType: ApprovalItem['entityType'],
  id: string,
  decision: 'approved' | 'rejected'
) =>
  request<{ ok: boolean; approvals: ApprovalItem[]; notifications: NotificationItem[] }>(
    `/admin/approvals/${entityType}/${id}`,
    {
      method: 'POST',
      body: JSON.stringify({ decision }),
    }
  );

export const createTournament = async (tournament: {
  name: string;
  registrationWindow: string;
  startDate: string;
  finalDate: string;
  location: string;
  prizePool: string | number;
}) =>
  request<{ tournament: any; tournaments: any[]; notifications: NotificationItem[] }>(
    '/admin/tournaments',
    {
      method: 'POST',
      body: JSON.stringify(tournament),
    }
  );

export const getNotifications = async () =>
  request<{ notifications: NotificationItem[] }>('/notifications');

export const markNotificationRead = async (id: string) =>
  request<{ notification: NotificationItem }>(`/notifications/${id}/read`, {
    method: 'POST',
  });

export const joinTournamentAsJockey = async (tournamentId: string) =>
  request<{
    registration: JockeyTournamentRegistration;
    jockeyTournamentRegistrations: JockeyTournamentRegistration[];
  }>('/jockey/tournament-registrations', {
    method: 'POST',
    body: JSON.stringify({ tournamentId }),
  });

export const getOwnerPortal = async () =>
  request<{
    horses: HorseRecord[];
    raceEntries: RaceEntryRecord[];
    jockeyProfiles: JockeyProfileRecord[];
    invitations: JockeyInvitation[];
  }>('/owner/portal');

export const getRaceRegistration = async (tournamentId: string) =>
  request<{
    tournament: any;
    horses: HorseRecord[];
    races: RaceRecord[];
    jockeyProfiles: JockeyProfileRecord[];
    raceEntries: RaceEntryRecord[];
  }>(`/owner/race-registration?tournamentId=${encodeURIComponent(tournamentId)}`);

export const createRaceEntry = async (entry: {
  tournamentId: string;
  raceId: string;
  horseId: string;
  jockeyUserId: string;
  notes?: string;
}) =>
  request<{ entry: RaceEntryRecord }>('/owner/race-entries', {
    method: 'POST',
    body: JSON.stringify(entry),
  });

export const createHorse = async (horse: {
  name: string;
  breed: string;
  species?: string;
  age: string | number;
  sex?: string;
  color?: string;
  weightKg?: string | number;
  heightCm?: string | number;
  baseHandicap?: string | number;
  speedRating?: string | number;
  staminaRating?: string | number;
  formRating?: string | number;
  healthRating?: string | number;
  overallRating?: string | number;
  healthStatus?: string;
  profileNotes?: string;
  veterinaryCertificateUrl?: string;
}) =>
  request<{ horse: HorseRecord; horseCount: number; maxHorses: number }>(
    '/owner/horses',
    {
      method: 'POST',
      body: JSON.stringify(horse),
    }
  );

export const updateHorse = async (
  horseId: string,
  horse: {
    name: string;
    breed: string;
    species?: string;
    age: string | number;
    sex?: string;
    color?: string;
    weightKg?: string | number;
    heightCm?: string | number;
    baseHandicap?: string | number;
    speedRating?: string | number;
    staminaRating?: string | number;
    formRating?: string | number;
    healthRating?: string | number;
    overallRating?: string | number;
    healthStatus?: string;
    profileNotes?: string;
    veterinaryCertificateUrl?: string;
  }
) =>
  request<{ horse: HorseRecord }>(`/owner/horses/${horseId}`, {
    method: 'POST',
    body: JSON.stringify(horse),
  });

export const sendJockeyRequest = async (
  horseId: string,
  jockeyUserId: string,
  raceId: string
) =>
  request<{ invitation: JockeyInvitation }>('/owner/jockey-requests', {
    method: 'POST',
    body: JSON.stringify({ horseId, jockeyUserId, raceId }),
  });

export const getJockeyPortal = async () =>
  request<{
    profile: JockeyProfileRecord | null;
    horses: HorseRecord[];
    races: RaceRecord[];
    raceEntries: RaceEntryRecord[];
    invitations: JockeyInvitation[];
  }>('/jockey/portal');

export const saveJockeyProfile = async (profile: {
  bio: string;
  certificate: string;
  competitionLevel: string;
  weight: string | number;
}) =>
  request<{ profile: JockeyProfileRecord }>('/jockey/profile', {
    method: 'POST',
    body: JSON.stringify(profile),
  });

export const decideJockeyInvitation = async (
  id: string,
  decision: 'accepted' | 'rejected'
) =>
  request<{ invitation: JockeyInvitation }>(`/jockey/invitations/${id}`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  });

export const getRaceBuilder = async () =>
  request<{
    tournaments: any[];
    races: RaceRecord[];
    referees: RaceBuilderReferee[];
  }>('/admin/race-builder');

export const createRace = async (race: {
  raceNumber?: string;
  name: string;
  round: string;
  date: string;
  time: string;
  venue: string;
  distance: string | number;
  surface: string;
  raceClass: string;
  handicapMin?: string | number;
  handicapMax?: string | number;
  totalPrize: string | number;
  refereeUserId: string;
  refereeUserIds?: string[];
  tournamentId?: string;
  registrationPeriodMinutes?: string | number;
  registrationOpenTime?: string;
  registrationCloseTime?: string;
  entries?: RaceEntryInput[];
}) =>
  request<{ race: any; entries: any[]; notifications: NotificationItem[] }>(
    '/admin/races',
    {
      method: 'POST',
      body: JSON.stringify(race),
    }
  );

export const adminRaceAction = async (
  raceId: string,
  action: 'close-registration' | 'publish' | 'confirm-results' | 'reject-results' | 'complete'
) =>
  request<{ race: RaceRecord; entries: RaceEntryRecord[]; notifications: NotificationItem[] }>(
    `/admin/races/${raceId}/${action}`,
    { method: 'POST' }
  );

export const startRace = async (raceId: string) =>
  request<{ race: RaceRecord }>(`/referee/races/${raceId}/start`, {
    method: 'POST',
  });

export const submitRaceResults = async (raceId: string) =>
  request<{ race: RaceRecord }>(`/referee/races/${raceId}/submit-results`, {
    method: 'POST',
  });

export const markRaceEntryReadiness = async (
  entryId: string,
  readiness: 'ready' | 'absent'
) =>
  request<{ entry: RaceEntryRecord; entries: RaceEntryRecord[] }>(
    `/referee/race-entries/${entryId}/${readiness}`,
    { method: 'POST' }
  );

export const recordRaceResult = async (
  entryId: string,
  result: {
    position: string | number;
    finishTime: string;
    notes?: string;
    violationNotes?: string;
  }
) =>
  request<{ entry: RaceEntryRecord; entries: RaceEntryRecord[] }>(
    `/referee/race-entries/${entryId}/result`,
    {
      method: 'POST',
      body: JSON.stringify(result),
    }
  );
