import { request } from './client';
import type {
  HorseRecord,
  JockeyInvitation,
  JockeyProfileRecord,
  JockeyRaceRegistration,
  RaceEntryRecord,
  RaceRecord,
  TournamentRecord,
} from './types';

// Đăng ký Jockey tham gia một cuộc đua.
export const joinRaceAsJockey = async (raceId: string) =>
  request<{
    registration: JockeyRaceRegistration;
    jockeyRaceRegistrations: JockeyRaceRegistration[];
  }>('/jockey/race-registrations', {
    method: 'POST',
    body: JSON.stringify({ raceId }),
  });

// Lấy toàn bộ dữ liệu cần hiển thị trên cổng Jockey.
export const getJockeyPortal = async () =>
  request<{
    profile: JockeyProfileRecord | null;
    horses: HorseRecord[];
    tournaments: TournamentRecord[];
    races: RaceRecord[];
    raceEntries: RaceEntryRecord[];
    invitations: JockeyInvitation[];
  }>('/jockey/portal');

// Tạo hoặc cập nhật hồ sơ chuyên môn của Jockey.
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

// Chấp nhận hoặc từ chối lời mời ghép cặp từ Owner.
export const decideJockeyInvitation = async (
  id: string,
  decision: 'accepted' | 'rejected',
) =>
  request<{ invitation: JockeyInvitation }>(`/jockey/invitations/${id}`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  });
