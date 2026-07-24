export type UserRole = 'admin' | 'owner' | 'jockey' | 'referee' | 'spectator';

export interface DailyReward {
  claimed: boolean;
  amount: number;
  streak: number;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status:
    'pending' | 'active' | 'approved' | 'rejected' | 'suspended' | 'locked';
  credits?: number | null;
  loginStreak?: number;
  lastLoginRewardDate?: string | null;
  dailyReward?: DailyReward;
}

export interface BetRecord {
  id: string;
  userId: string;
  raceId: string;
  raceEntryId: string;
  amount: number;
  status: 'pending' | 'won' | 'lost' | 'cancelled' | 'refunded';
  payout?: number;
  createdAt: string;
  settledAt?: string | null;
  horseName?: string;
  jockeyName?: string;
  raceName?: string;
}

export interface RacePot {
  raceId: string;
  total: number;
}

export interface SpectatorWallet {
  credits: number;
  loginStreak: number;
  lastLoginRewardDate: string | null;
  dailyReward: DailyReward;
  bets: BetRecord[];
}

export interface ApprovalItem {
  id: string;
  entityType: 'horse' | 'account' | 'jockeyRace' | 'horseRace' | 'pairing';
  type: string;
  name: string;
  detail: string;
  date: string;
  targetUserId: string;
  reviewSections: Array<{
    title: string;
    fields: Array<{
      label: string;
      value: string;
    }>;
  }>;
  warnings: string[];
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
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
  weightLb?: number;
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
  ownerName?: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'retired';
  jockeyConfirmation: string;
  veterinaryCertificateUrl?: string;
}

export interface JockeyProfileRecord {
  id: string;
  userId: string;
  jockeyName: string;
  jockeyEmail?: string;
  bio: string;
  certificate: string;
  competitionLevel: string;
  weightLb: number;
  status: 'draft' | 'pending' | 'published' | 'rejected' | 'archived';
}

export interface JockeyInvitation {
  id: string;
  horseId: string;
  ownerUserId: string;
  jockeyUserId: string;
  tournamentId: string | null;
  raceId: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  adminStatus: string | null;
  createdAt: string;
  respondedAt?: string;
}

export interface RaceBuilderReferee {
  id: string;
  name: string;
}

export interface RaceClassRecord {
  id: string;
  name: string;
  ratingMin: number;
  ratingMax: number;
  handicapMin: number;
  handicapMax: number;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RaceRecord {
  id: string;
  tournamentId: string | null;
  raceNumber?: string;
  name: string;
  round?: string;
  raceDate?: string;
  raceTime?: string;
  date: string;
  time: string;
  venue: string;
  distance?: string;
  surface?: string;
  raceClass?: string;
  ratingMin?: number;
  ratingMax?: number;
  handicapMin?: number;
  handicapMax?: number;
  totalPrize?: number;
  /** Max credits per single bet; null/undefined means unlimited. */
  betLimit?: number | null;
  refereeUserId?: string;
  refereeUserIds?: string;
  referee?: string;
  status: string;
  participants: number;
  ownerConfirmed: number;
  jockeyConfirmed: number;
  registrationOpensAt?: string;
  registrationClosesAt?: string;
  resultStatus?: string;
  awardsPublished?: boolean;
  replayTimeline?: RaceReplayTimeline | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TournamentRecord {
  id: string;
  name: string;
  status: string;
  startDate?: string;
  finalDate?: string;
  location?: string;
  prizePool?: string | number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SystemLimits {
  maxOwnerHorses: number;
  maxRaceFieldSize: number;
  minReadiedParticipants: number;
  maxRacesPerTournament: number;
  defaultDistanceMeters: number;
  closeRegistrationHours: number;
  bettingCloseBeforeRaceMs: number;
  raceTimezoneOffset: string;
}

export interface SystemSettings {
  maxOwnerHorses: number;
  defaultDistanceMeters: number;
  maxHorsesPerRace: number;
  minReadiedParticipants: number;
  maxRacesPerTournament: number;
  closeRegistrationHours: number;
  autoPublishResults: boolean;
  requireOwnerApproval: boolean;
  requireJockeyApproval: boolean;
  requireRefereeApproval: boolean;
  allowSelfRegistration: boolean;
  notifyHorseRegistration: boolean;
  notifyJockeyRegistration: boolean;
  notifyRaceResults: boolean;
  notifyAdmins: boolean;
  notifyReferees: boolean;
  notifyOwners: boolean;
  notifyJockeys: boolean;
  maintenanceMode: boolean;
  auditSettingsChanges: boolean;
  archiveCompletedAfterDays: number;
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
  ratingChange?: number;
  postRaceRating?: number;
  ownerConfirmed: boolean;
  jockeyConfirmed: boolean;
  preRaceStatus: string;
  disqualified: boolean;
  resultStatus?: string;
  resultOutcome?: 'finished' | 'dnf' | 'fell' | 'injured' | 'disqualified';
  position?: number | null;
  finishTime?: string;
  createdAt?: string;
  notes?: string;
  incidentReason?: string;
  violationNotes?: string;
  horseName?: string;
  jockeyName?: string;
  ownerName?: string;
  horseWeightLb?: number | null;
  jockeyWeightLb?: number | null;
  raceName?: string;
}

interface RaceReplayCheckpoint {
  distanceMeters: number;
  timeSeconds: number;
}

export interface RaceReplayRunner {
  entryId: string;
  lane: number;
  displayGate?: number;
  horseName: string;
  jockeyName: string;
  silkColor: string;
  rating: number;
  carriedWeight: number;
  speed: number;
  stamina: number;
  form: number;
  phase: number;
  performanceScore: number;
  finishTimeSeconds: number;
  position: number;
  finishTime: string;
  checkpoints: RaceReplayCheckpoint[];
}

interface RaceReplayTimeline {
  version: number;
  generatedAt: string;
  raceId: string;
  distanceMeters: number;
  surface: string;
  durationSeconds: number;
  runners: RaceReplayRunner[];
}

export interface JockeyRaceRegistration {
  id: string;
  raceId: string;
  jockeyUserId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string | null;
}

export interface HorseRaceRegistration {
  id: string;
  tournamentId: string;
  raceId: string;
  horseId: string;
  ownerUserId: string;
  jockeyUserId?: string | null;
  invitationId?: string | null;
  status:
    'pending-jockey' | 'pending-admin' | 'approved' | 'rejected' | 'cancelled';
  notes?: string;
  createdAt: string;
  reviewedAt?: string | null;
  horseName?: string;
  jockeyName?: string;
}

export interface ActivePairing extends HorseRaceRegistration {
  horseName: string;
  jockeyName: string;
  tournamentName: string;
}

export interface BootstrapPayload {
  tournaments: TournamentRecord[];
  horses: HorseRecord[];
  races: RaceRecord[];
  jockeyProfiles: JockeyProfileRecord[];
  jockeyRaceRegistrations: JockeyRaceRegistration[];
  jockeyInvitations: JockeyInvitation[];
  horseRaceRegistrations: HorseRaceRegistration[];
  raceEntries: RaceEntryRecord[];
  users: AuthUser[];
  notifications: NotificationItem[];
  limits: SystemLimits;
  systemSettings: SystemSettings;
}

export type BootstrapScope =
  | 'full'
  | 'tournaments'
  | 'race'
  | 'horses'
  | 'jockeys'
  | 'live'
  | 'results'
  | 'betting'
  | 'admin';

export interface AdminBettingRaceSummary {
  raceId: string;
  raceName: string;
  raceStatus: string;
  betLimit: number | null;
  totalBets: number;
  uniqueBettors: number;
  poolTotal: number;
  totalWagered: number;
  totalPaidOut: number;
  totalRefunded: number;
  counts: { pending: number; won: number; lost: number; refunded: number };
}

export interface AdminBettingSpectator {
  id: string;
  name: string;
  credits: number;
  loginStreak: number;
  lastLoginRewardDate: string | null;
  totalBets: number;
  totalWagered: number;
  totalWon: number;
}
