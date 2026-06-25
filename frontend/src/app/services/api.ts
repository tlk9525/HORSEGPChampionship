export type UserRole = 'admin' | 'owner' | 'jockey' | 'referee' | 'spectator';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
}

export interface ApprovalItem {
  id: string;
  entityType: 'horse' | 'account' | 'jockey' | 'jockeyTournament' | 'horseTournament' | 'raceEntry' | 'pairing';
  type: string;
  name: string;
  detail: string;
  date: string;
  targetUserId: string;
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
  status: string;
  selectedJockeyUserId?: string | null;
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
  registrationPeriodMinutes?: number;
  registrationOpensAt?: string;
  registrationClosesAt?: string;
  resultStatus?: string;
  awardsPublished?: boolean;
}

export interface TournamentRecord {
  id: string;
  name: string;
  status: string;
  registrationWindow?: string;
  registrationOpensAt?: string;
  registrationClosesAt?: string;
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

export interface HorseTournamentRegistration {
  id: string;
  tournamentId: string;
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

export interface ActivePairing extends HorseTournamentRegistration {
  horseName: string;
  jockeyName: string;
  tournamentName: string;
}

const API_URL = import.meta.env.PROD
  ? '/api'
  : import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000/api';

class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

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
    throw new ApiRequestError(data.message || 'Request failed', response.status);
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
    jockeyTournamentRegistrations: JockeyTournamentRegistration[];
    jockeyInvitations: JockeyInvitation[];
    horseTournamentRegistrations: HorseTournamentRegistration[];
    raceEntries: RaceEntryRecord[];
    users: AuthUser[];
    notifications: NotificationItem[];
    limits: SystemLimits;
  }>('/bootstrap');

// Lấy danh sách các mục đang chờ phê duyệt (admin)
export const getApprovals = async () =>
  request<{ approvals: ApprovalItem[] }>('/admin/approvals');

// Phê duyệt hoặc từ chối một yêu cầu cụ thể (ngựa, tài khoản, đăng ký jockey, race entry)
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
  registrationOpenTime: string;
  registrationCloseTime: string;
  startDate: string;
  finalDate: string;
  location: string;
  prizePool: string | number;
}) =>
  request<{ tournament: TournamentRecord; tournaments: TournamentRecord[]; notifications: NotificationItem[] }>(
    '/admin/tournaments',
    {
      method: 'POST',
      body: JSON.stringify(tournament),
    }
  );

// Lấy danh sách thông báo của người dùng hiện tại
export const getNotifications = async () =>
  request<{ notifications: NotificationItem[] }>('/notifications');

// Đánh dấu một thông báo cụ thể là đã đọc
export const markNotificationRead = async (id: string) =>
  request<{ notification: NotificationItem }>(`/notifications/${id}/read`, {
    method: 'POST',
  });

// Jockey đăng ký tham gia một giải đấu (cần admin phê duyệt)
export const joinTournamentAsJockey = async (tournamentId: string) =>
  request<{
    registration: JockeyTournamentRegistration;
    jockeyTournamentRegistrations: JockeyTournamentRegistration[];
  }>('/jockey/tournament-registrations', {
    method: 'POST',
    body: JSON.stringify({ tournamentId }),
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
    horses: HorseRecord[];
    jockeyProfiles: JockeyProfileRecord[];
    horseTournamentRegistrations: HorseTournamentRegistration[];
    raceEntries: RaceEntryRecord[];
  }>(`/owner/race-registration?raceId=${encodeURIComponent(raceId)}`);

// Tạo một race entry mới (owner đăng ký ngựa vào cuộc đua)
export const createRaceEntry = async (entry: {
  raceId: string;
  horseId: string;
  jockeyUserId?: string;
  notes?: string;
}) =>
  request<{ invitation?: JockeyInvitation; registration?: HorseTournamentRegistration }>('/owner/race-entries', {
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
    speedRating?: string | number;
    staminaRating?: string | number;
    formRating?: string | number;
    healthRating?: string | number;
    healthStatus?: string;
    profileNotes?: string;
    veterinaryCertificateUrl?: string;
  }
) =>
  request<{ horse: HorseRecord }>(`/owner/horses/${horseId}`, {
    method: 'POST',
    body: JSON.stringify(horse),
  });

// Gửi lời mời jockey để cưỡi ngựa trong một cuộc đua cụ thể
export const sendJockeyRequest = async (
  horseId: string,
  jockeyUserId: string,
  raceId: string
) =>
  request<{ invitation: JockeyInvitation }>('/owner/jockey-requests', {
    method: 'POST',
    body: JSON.stringify({ horseId, jockeyUserId, raceId }),
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
  weight: string | number;
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
  round: string;
  date: string;
  time: string;
  venue: string;
  distance: string | number;
  surface: string;
  raceClass: string;
  handicapMin?: string | number;
  handicapMax?: string | number;
  totalPrize?: string | number;
  refereeUserId: string;
  refereeUserIds?: string[];
  tournamentId?: string;
  entries?: RaceEntryInput[];
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

// Admin chỉ đóng đăng ký và publish race
export const adminRaceAction = async (
  raceId: string,
  action: 'close-registration' | 'publish'
) =>
  request<{ race: RaceRecord; entries: RaceEntryRecord[]; notifications: NotificationItem[] }>(
    `/admin/races/${raceId}/${action}`,
    { method: 'POST' }
  );

// Bắt đầu một cuộc đua (trọng tài được phân công)
export const startRace = async (raceId: string) =>
  request<{ race: RaceRecord }>(`/referee/races/${raceId}/start`, {
    method: 'POST',
  });

// Trọng tài xác nhận và công bố kết quả chính thức
export const submitRaceResults = async (raceId: string) =>
  request<{ race?: RaceRecord; entries?: RaceEntryRecord[] }>(
    `/referee/races/${raceId}/submit-results`,
    {
      method: 'POST',
    }
  );

// Đánh dấu một thí sinh là sẵn sàng thi đấu hoặc vắng mặt
export const markRaceEntryReadiness = async (
  entryId: string,
  readiness: 'ready' | 'absent'
) => {
  const encodedEntryId = encodeURIComponent(entryId);
  const options = { method: 'POST' };

  try {
    return await request<{ entry: RaceEntryRecord; entries: RaceEntryRecord[] }>(
      `/referee/race-entries/${encodedEntryId}/readiness/${readiness}`,
      options
    );
  } catch (error) {
    const isLegacyRenderRoute =
      error instanceof ApiRequestError &&
      error.status === 404 &&
      error.message.toLowerCase() === 'not found';

    if (!isLegacyRenderRoute) throw error;

    return request<{ entry: RaceEntryRecord; entries: RaceEntryRecord[] }>(
      `/referee/race-entries/${encodedEntryId}/${readiness}`,
      options
    );
  }
};

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
