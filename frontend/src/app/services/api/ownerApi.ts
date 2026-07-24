import { request } from './client';
import type {
  ActivePairing,
  HorseRaceRegistration,
  HorseRecord,
  JockeyInvitation,
  JockeyProfileRecord,
  RaceEntryRecord,
  RaceRecord,
  SystemLimits,
  TournamentRecord,
} from './types';

// Lấy dữ liệu tổng hợp cần hiển thị trên cổng Owner.
export const getOwnerPortal = async () =>
  request<{
    horses: HorseRecord[];
    raceEntries: RaceEntryRecord[];
    activePairings: ActivePairing[];
    jockeyProfiles: JockeyProfileRecord[];
    invitations: JockeyInvitation[];
    limits: Pick<SystemLimits, 'maxOwnerHorses'>;
  }>('/owner/portal');

// Lấy dữ liệu đăng ký ngựa và Jockey cho một cuộc đua.
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

// Gửi đăng ký ngựa và lời mời Jockey tham gia cuộc đua.
export const submitHorseRaceRegistration = async (entry: {
  raceId: string;
  horseId: string;
  jockeyUserId?: string;
  notes?: string;
}) =>
  request<{
    invitation?: JockeyInvitation;
    registration?: HorseRaceRegistration;
  }>('/owner/race-registrations', {
    method: 'POST',
    body: JSON.stringify(entry),
  });

// Tạo hồ sơ ngựa mới thuộc Owner đang đăng nhập.
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
    },
  );

// Cập nhật thông tin hồ sơ của một ngựa thuộc Owner.
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
  },
) =>
  request<{ horse: HorseRecord }>(`/owner/horses/${horseId}`, {
    method: 'POST',
    body: JSON.stringify(horse),
  });
