import { request } from './client';
import type {
  NotificationItem,
  RaceBuilderReferee,
  RaceClassRecord,
  RaceEntryRecord,
  RaceRecord,
  TournamentRecord,
} from './types';

// Lấy dữ liệu cần thiết để Admin tạo và quản lý cuộc đua.
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

// Lấy danh sách hạng đua đang được cấu hình.
export const getRaceClasses = async () =>
  request<{ raceClasses: RaceClassRecord[] }>('/admin/race-classes');

// Tạo một hạng đua mới cùng các giới hạn tương ứng.
export const createRaceClass = async (
  raceClass: Omit<RaceClassRecord, 'id' | 'createdAt' | 'updatedAt'>,
) =>
  request<{ raceClass: RaceClassRecord; raceClasses: RaceClassRecord[] }>(
    '/admin/race-classes',
    { method: 'POST', body: JSON.stringify(raceClass) },
  );

// Cập nhật cấu hình của một hạng đua.
export const updateRaceClass = async (
  raceClassId: string,
  raceClass: Partial<Omit<RaceClassRecord, 'id' | 'createdAt' | 'updatedAt'>>,
) =>
  request<{ raceClass: RaceClassRecord; raceClasses: RaceClassRecord[] }>(
    `/admin/race-classes/${raceClassId}`,
    { method: 'PATCH', body: JSON.stringify(raceClass) },
  );

// Tạo cuộc đua mới với lịch, hạng đua và trọng tài được chọn.
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
  betLimit?: string | number | null;
  refereeUserId: string;
  refereeUserIds?: string[];
  tournamentId?: string;
}) =>
  request<{
    race: RaceRecord;
    entries: RaceEntryRecord[];
    notifications: NotificationItem[];
  }>('/admin/races', {
    method: 'POST',
    body: JSON.stringify(race),
  });

// Cập nhật mức cược tối đa cho một cuộc đua.
export const updateRaceBetLimit = (raceId: string, betLimit: number | null) =>
  request<{ race: RaceRecord; betLimit: number | null }>(
    `/admin/races/${raceId}/bet-limit`,
    {
      method: 'PATCH',
      body: JSON.stringify({ betLimit }),
    },
  );

// Cập nhật lịch và thời gian đăng ký của cuộc đua.
export const updateRace = async (
  raceId: string,
  race: {
    name: string;
    date: string;
    time: string;
    registrationOpensAt: string;
    registrationClosesAt: string;
  },
) =>
  request<{ race: RaceRecord }>(`/admin/races/${raceId}`, {
    method: 'PATCH',
    body: JSON.stringify(race),
  });

// Đưa cuộc đua về trạng thái ban đầu với lịch mới.
export const resetRace = async (
  raceId: string,
  race: {
    date: string;
    time: string;
    registrationOpensAt: string;
    registrationClosesAt: string;
  },
) =>
  request<{
    race: RaceRecord;
    entries: RaceEntryRecord[];
    notifications: NotificationItem[];
  }>(`/admin/races/${raceId}/reset-race`, {
    method: 'POST',
    body: JSON.stringify(race),
  });

export type AdminRaceAction =
  | 'close-registration'
  | 'publish'
  | 'start-race'
  | 'finish-race'
  | 'complete-results'
  | 'cancel-race'
  | 'reset-race';

// Gửi một hành động chuyển trạng thái cuộc đua từ phía Admin.
export const adminRaceAction = async (
  raceId: string,
  action: AdminRaceAction,
) =>
  request<{
    race: RaceRecord;
    entries: RaceEntryRecord[];
    notifications: NotificationItem[];
  }>(`/admin/races/${raceId}/${action}`, { method: 'POST' });
