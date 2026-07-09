export type UserRole = 'admin' | 'owner' | 'jockey' | 'referee' | 'spectator';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'pending' | 'active' | 'rejected';
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
  maxRacesPerTournament: number;
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
  position?: number | null;
  finishTime?: string;
  createdAt?: string;
  notes?: string;
  violationNotes?: string;
  horseName?: string;
  jockeyName?: string;
  ownerName?: string;
  horseWeightLb?: number | null;
  jockeyWeightLb?: number | null;
  raceName?: string;
}

export interface RaceReplayCheckpoint {
  distanceMeters: number;
  timeSeconds: number;
}

export interface RaceReplayRunner {
  entryId: string;
  lane: number;
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

export interface RaceReplayTimeline {
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

const API_URL = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000/api';

// Tạo URL kết nối Server-Sent Events (SSE) để theo dõi cập nhật trực tiếp của một cuộc đua
export const getLiveRaceEventsUrl = (raceId: string) =>
  `${API_URL}/live/races/${encodeURIComponent(raceId)}/events`;

// Hàm gửi HTTP request chung, dùng HttpOnly session cookie và báo lỗi khi response thất bại.
const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
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

  return data;
};

// Đăng nhập bằng email/password; session được backend lưu trong HttpOnly cookie.
export const login = async (email: string, password: string) => {
  return request<{ user: AuthUser }>('/login', {
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

// Lấy toàn bộ dữ liệu khởi động: giải đấu, ngựa, cuộc đua, jockey, thông báo...
export const getBootstrap = async () =>
  request<{
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
  }>('/bootstrap');

// Lấy danh sách các mục đang chờ phê duyệt (admin)
export const getApprovals = async () =>
  request<{ approvals: ApprovalItem[] }>('/admin/approvals');

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
    maxRacesPerTournament: number;
  }>('/admin/race-builder');

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
  raceClass: string;
  registrationOpensAt: string;
  registrationClosesAt: string;
  handicapMin?: string | number;
  handicapMax?: string | number;
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
  race: Pick<RaceRecord, 'name' | 'date' | 'time'>
) =>
  request<{ race: RaceRecord }>(`/admin/races/${raceId}`, {
    method: 'PATCH',
    body: JSON.stringify(race),
  });

export const deleteRace = async (raceId: string) =>
  request<{ ok: boolean; raceId: string }>(`/admin/races/${raceId}`, {
    method: 'DELETE',
  });

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
