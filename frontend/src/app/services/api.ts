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
  status: 'pending' | 'active' | 'approved' | 'rejected' | 'suspended' | 'locked';
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
  status: 'pending-jockey' | 'pending-admin' | 'approved' | 'rejected' | 'cancelled';
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

const API_URL = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000/api';

const BOOTSTRAP_CACHE_TTL_MS = 10_000;
let bootstrapCache: { data: BootstrapPayload; fetchedAt: number } | null = null;
let bootstrapRequest: Promise<BootstrapPayload> | null = null;

// Ghi chú: Hàm này xóa cache bootstrap để lần đọc tiếp theo lấy dữ liệu mới.
function invalidateBootstrapCache() {
  bootstrapCache = null;
  bootstrapRequest = null;
}

// Tạo URL kết nối Server-Sent Events (SSE) để theo dõi cập nhật trực tiếp của một cuộc đua
export const getLiveRaceEventsUrl = (raceId: string) =>
  `${API_URL}/live/races/${encodeURIComponent(raceId)}/events`;

// Hàm gửi HTTP request chung, dùng HttpOnly session cookie và báo lỗi khi response thất bại.
const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const method = String(options.method || 'GET').toUpperCase();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  if (method !== 'GET') {
    invalidateBootstrapCache();
  }

  return data;
};

// Đăng nhập bằng email/password; session được backend lưu trong HttpOnly cookie.
export const login = async (email: string, password: string) => {
  return request<{ user: AuthUser; dailyReward?: DailyReward }>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

// Đăng ký tài khoản mới, trả về thông tin user và trạng thái có cần phê duyệt hay không
export const register = async (
  name: string,
  email: string,
  password: string,
  role: UserRole
) => {
  return request<{
    user: AuthUser;
    requiresApproval?: boolean;
    message?: string;
  }>('/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role }),
  });
};

// Đăng xuất khỏi hệ thống, hủy phiên làm việc trên server
export const logout = async () => {
  return request<{ ok: boolean }>('/logout', { method: 'POST' });
};

// Lấy thông tin user đang đăng nhập từ server
export const getMe = async () => request<{ user: AuthUser }>('/me');

// Lấy toàn bộ dữ liệu khởi động. Cache ngắn hạn để đổi trang không gọi lại endpoint nặng liên tục.
export const getBootstrap = async ({ force = false } = {}) => {
  const now = Date.now();

  if (!force && bootstrapCache && now - bootstrapCache.fetchedAt < BOOTSTRAP_CACHE_TTL_MS) {
    return bootstrapCache.data;
  }

  if (!force && bootstrapRequest) {
    return bootstrapRequest;
  }

  bootstrapRequest = request<BootstrapPayload>('/bootstrap')
    .then((data) => {
      bootstrapCache = { data, fetchedAt: Date.now() };
      return data;
    })
    .finally(() => {
      bootstrapRequest = null;
    });

  return bootstrapRequest;
};

// Lấy danh sách các mục đang chờ phê duyệt (admin)
export const getApprovals = async () =>
  request<{ approvals: ApprovalItem[] }>('/admin/approvals');

// Ghi chú: Hàm này lấy và chuẩn hóa dữ liệu cho getUsers.
export const getUsers = async () =>
  request<{ users: AuthUser[] }>('/admin/users');

// Ghi chú: Hàm này lấy và chuẩn hóa dữ liệu cho getSystemSettings.
export const getSystemSettings = async () =>
  request<{ settings: SystemSettings }>('/admin/settings');

// Ghi chú: Hàm này xử lý thao tác updateSystemSettings trong luồng nghiệp vụ.
export const updateSystemSettings = async (settings: Partial<SystemSettings>) =>
  request<{ settings: SystemSettings }>('/admin/settings', {
    method: 'PATCH',
    body: JSON.stringify(settings),
  });

// Ghi chú: Hàm này xử lý thao tác updateUser trong luồng nghiệp vụ.
export const updateUser = async (
  userId: string,
  user: {
    role: UserRole;
    status: AuthUser['status'];
  }
) =>
  request<{ user: AuthUser; users: AuthUser[] }>(`/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(user),
  });

// Ghi chú: Hàm này xử lý thao tác disableUser trong luồng nghiệp vụ.
export const disableUser = async (userId: string) =>
  request<{ user: AuthUser; users: AuthUser[] }>(`/admin/users/${userId}`, {
    method: 'DELETE',
  });

// Phê duyệt hoặc từ chối một yêu cầu cụ thể (ngựa, tài khoản, đăng ký race, pairing)
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

// Tạo giải đấu mới (admin)
export const createTournament = async (tournament: {
  name: string;
  startDate: string;
  finalDate?: string;
  location: string;
}) =>
  request<{ tournament: TournamentRecord; tournaments: TournamentRecord[]; notifications: NotificationItem[] }>(
    '/admin/tournaments',
    {
      method: 'POST',
      body: JSON.stringify(tournament),
    }
  );

// Cập nhật thông tin giải đấu (admin)
export const updateTournament = async (
  tournamentId: string,
  tournament: {
    name: string;
    startDate: string;
    finalDate?: string;
    location?: string;
  }
) =>
  request<{ tournament: TournamentRecord; tournaments: TournamentRecord[]; notifications: NotificationItem[] }>(
    `/admin/tournaments/${tournamentId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(tournament),
    }
  );

// Xóa giải đấu và toàn bộ dữ liệu race thuộc giải đấu đó (admin)
export const deleteTournament = async (tournamentId: string) =>
  request<{
    ok: boolean;
    tournamentId: string;
    raceIds: string[];
    tournaments: TournamentRecord[];
    notifications: NotificationItem[];
  }>(`/admin/tournaments/${tournamentId}`, {
    method: 'DELETE',
  });

// Lấy danh sách thông báo của người dùng hiện tại
export const getNotifications = async () =>
  request<{ notifications: NotificationItem[] }>('/notifications');

// Đánh dấu một thông báo cụ thể là đã đọc
export const markNotificationRead = async (id: string) =>
  request<{ notification: NotificationItem }>(`/notifications/${id}/read`, {
    method: 'POST',
  });

// Jockey đăng ký tham gia một cuộc đua (cần admin phê duyệt)
export const joinRaceAsJockey = async (raceId: string) =>
  request<{
    registration: JockeyRaceRegistration;
    jockeyRaceRegistrations: JockeyRaceRegistration[];
  }>('/jockey/race-registrations', {
    method: 'POST',
    body: JSON.stringify({ raceId }),
  });

// Lấy dữ liệu portal của owner: danh sách ngựa, race entries, jockeys, lời mời
export const getOwnerPortal = async () =>
  request<{
    horses: HorseRecord[];
    raceEntries: RaceEntryRecord[];
    activePairings: ActivePairing[];
    jockeyProfiles: JockeyProfileRecord[];
    invitations: JockeyInvitation[];
    limits: Pick<SystemLimits, 'maxOwnerHorses'>;
  }>('/owner/portal');

// Lấy dữ liệu trang đăng ký race cho owner, bao gồm thông tin giải, ngựa, race...
export const getRaceRegistration = async (raceId: string) =>
  request<{
    tournament: TournamentRecord;
    race: RaceRecord;
    races?: RaceRecord[];
    horses: HorseRecord[];
    jockeyProfiles: JockeyProfileRecord[];
    horseRaceRegistrations: HorseRaceRegistration[];
    raceEntries: RaceEntryRecord[];
  }>(`/owner/race-registration?raceId=${encodeURIComponent(raceId)}`);

// Owner đăng ký ngựa vào một chặng đua hoặc gửi lời mời jockey cho chặng đó
export const submitHorseRaceRegistration = async (entry: {
  raceId: string;
  horseId: string;
  jockeyUserId?: string;
  notes?: string;
}) =>
  request<{ invitation?: JockeyInvitation; registration?: HorseRaceRegistration }>('/owner/race-registrations', {
    method: 'POST',
    body: JSON.stringify(entry),
  });

// Tạo hồ sơ ngựa mới (owner)
export const createHorse = async (horse: {
  name: string;
  breed: string;
  species?: string;
  age: string | number;
  sex?: string;
  color?: string;
  weightLb?: string | number;
  heightCm?: string | number;
  baseHandicap?: string | number;
  speedRating?: string | number;
  staminaRating?: string | number;
  formRating?: string | number;
  healthRating?: string | number;
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

// Cập nhật thông tin ngựa đã tồn tại (owner)
export const updateHorse = async (
  horseId: string,
  horse: {
    name: string;
    breed: string;
    species?: string;
    age: string | number;
    sex?: string;
    color?: string;
    weightLb?: string | number;
    heightCm?: string | number;
    baseHandicap?: string | number;
    healthStatus?: string;
    profileNotes?: string;
    veterinaryCertificateUrl?: string;
  }
) =>
  request<{ horse: HorseRecord }>(`/owner/horses/${horseId}`, {
    method: 'POST',
    body: JSON.stringify(horse),
  });

// Lấy dữ liệu portal của jockey: hồ sơ, ngựa, giải, cuộc đua, lời mời
export const getJockeyPortal = async () =>
  request<{
    profile: JockeyProfileRecord | null;
    horses: HorseRecord[];
    tournaments: TournamentRecord[];
    races: RaceRecord[];
    raceEntries: RaceEntryRecord[];
    invitations: JockeyInvitation[];
  }>('/jockey/portal');

// Lưu hoặc cập nhật hồ sơ jockey (bio, chứng chỉ, cấp độ, cân nặng)
export const saveJockeyProfile = async (profile: {
  bio: string;
  certificate: string;
  competitionLevel: string;
  weightLb: string | number;
}) =>
  request<{ profile: JockeyProfileRecord }>('/jockey/profile', {
    method: 'POST',
    body: JSON.stringify(profile),
  });

// Jockey chấp nhận hoặc từ chối lời mời tham gia cuộc đua
export const decideJockeyInvitation = async (
  id: string,
  decision: 'accepted' | 'rejected'
) =>
  request<{ invitation: JockeyInvitation }>(`/jockey/invitations/${id}`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  });

// Lấy dữ liệu trang tạo cuộc đua (admin): giải, các cuộc đua hiện có, danh sách trọng tài
export const getRaceBuilder = async () =>
  request<{
    tournaments: TournamentRecord[];
    races: RaceRecord[];
    referees: RaceBuilderReferee[];
    raceClasses: RaceClassRecord[];
    maxRacesPerTournament: number;
    defaultDistanceMeters: number;
    closeRegistrationHours: number;
  }>('/admin/race-builder');

// Lấy danh mục race class để admin quản lý.
export const getRaceClasses = async () =>
  request<{ raceClasses: RaceClassRecord[] }>('/admin/race-classes');

// Tạo một race class mới trong catalog.
export const createRaceClass = async (
  raceClass: Omit<RaceClassRecord, 'id' | 'createdAt' | 'updatedAt'>
) =>
  request<{ raceClass: RaceClassRecord; raceClasses: RaceClassRecord[] }>(
    '/admin/race-classes',
    { method: 'POST', body: JSON.stringify(raceClass) }
  );

// Sửa parameter hoặc trạng thái active của race class.
export const updateRaceClass = async (
  raceClassId: string,
  raceClass: Partial<Omit<RaceClassRecord, 'id' | 'createdAt' | 'updatedAt'>>
) =>
  request<{ raceClass: RaceClassRecord; raceClasses: RaceClassRecord[] }>(
    `/admin/race-classes/${raceClassId}`,
    { method: 'PATCH', body: JSON.stringify(raceClass) }
  );

// Tạo một cuộc đua mới trong giải đấu (admin)
export const createRace = async (race: {
  raceNumber?: string;
  name: string;
  round?: string;
  date: string;
  time: string;
  venue: string;
  distance: string | number;
  surface: string;
  raceClassId: string;
  registrationOpensAt: string;
  registrationClosesAt: string;
  totalPrize?: string | number;
  refereeUserId: string;
  refereeUserIds?: string[];
  tournamentId?: string;
}) =>
  request<{ race: RaceRecord; entries: RaceEntryRecord[]; notifications: NotificationItem[] }>(
    '/admin/races',
    {
      method: 'POST',
      body: JSON.stringify(race),
    }
  );

// Lưu thay đổi lịch race (admin)
export const updateRace = async (
  raceId: string,
  race: {
    name: string;
    date: string;
    time: string;
    registrationOpensAt: string;
    registrationClosesAt: string;
  }
) =>
  request<{ race: RaceRecord }>(`/admin/races/${raceId}`, {
    method: 'PATCH',
    body: JSON.stringify(race),
  });

// Reset race đã hủy về trạng thái mở đăng ký với lịch mới
export const resetRace = async (
  raceId: string,
  race: {
    date: string;
    time: string;
    registrationOpensAt: string;
    registrationClosesAt: string;
  }
) =>
  request<{ race: RaceRecord; entries: RaceEntryRecord[]; notifications: NotificationItem[] }>(
    `/admin/races/${raceId}/reset-race`,
    {
      method: 'POST',
      body: JSON.stringify(race),
    }
  );

// Admin đóng đăng ký, publish race và duyệt kết quả cuối cùng
export const adminRaceAction = async (
  raceId: string,
  action:
    | 'close-registration'
    | 'publish'
    | 'start-race'
    | 'finish-race'
    | 'complete-results'
    | 'cancel-race'
    | 'reset-race'
) =>
  request<{ race: RaceRecord; entries: RaceEntryRecord[]; notifications: NotificationItem[] }>(
    `/admin/races/${raceId}/${action}`,
    { method: 'POST' }
  );

// Trọng tài nộp kết quả để Admin duyệt
export const submitRaceResults = async (raceId: string) =>
  request<{ race?: RaceRecord; entries?: RaceEntryRecord[] }>(
    `/referee/races/${raceId}/submit-results`,
    {
      method: 'POST',
    }
  );

export type RaceEntryReadiness = 'ready' | 'absent' | 'incident' | 'scratched';

// Đánh dấu trạng thái check-in của một thí sinh
export const markRaceEntryReadiness = async (
  entryId: string,
  readiness: RaceEntryReadiness
) =>
  request<{ entry: RaceEntryRecord; entries: RaceEntryRecord[] }>(
    `/referee/race-entries/${encodeURIComponent(entryId)}/readiness/${readiness}`,
    { method: 'POST' }
  );

// Ghi kết quả cho một thí sinh: vị trí, thời gian vào đích, ghi chú và vi phạm
export const recordRaceResult = async (
  entryId: string,
  result: {
    resultOutcome?: 'finished' | 'dnf' | 'fell' | 'injured' | 'disqualified';
    position: string | number;
    finishTime: string;
    notes?: string;
    incidentReason?: string;
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

// Ghi chú: Hàm này lấy ví credit, thưởng đăng nhập và lịch sử cược của spectator hiện tại.
export const getSpectatorWallet = () =>
  request<SpectatorWallet>('/spectator/wallet');

// Ghi chú: Hàm này lấy tổng pot theo race và tổng tiền cược theo từng race entry.
export const getRacePots = () =>
  request<{ pots: RacePot[]; entryTotals: Record<string, number> }>('/spectator/pots');

// Ghi chú: Hàm này gửi yêu cầu đặt một lượng credit vào race entry đã chọn.
export const placeBet = (raceEntryId: string, amount: number) =>
  request<{ bet: BetRecord; credits: number }>('/spectator/bets', {
    method: 'POST',
    body: JSON.stringify({ raceEntryId, amount }),
  });

// Ghi chú: Hàm này hủy một cược đang chờ và nhận lại số dư credit sau khi hoàn tiền.
export const cancelBet = (betId: string) =>
  request<{ ok: boolean; credits: number }>(`/spectator/bets/${betId}/cancel`, {
    method: 'POST',
  });

export interface AdminBettingRaceSummary {
  raceId: string;
  raceName: string;
  raceStatus: string;
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

// Ghi chú: Hàm này lấy thống kê betting theo race và spectator để admin theo dõi.
export const getAdminBetting = () =>
  request<{
    raceSummaries: AdminBettingRaceSummary[];
    spectators: AdminBettingSpectator[];
  }>('/admin/betting');
