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

export const joinRaceAsJockey = async (raceId: string) =>
  request<{
    registration: JockeyRaceRegistration;
    jockeyRaceRegistrations: JockeyRaceRegistration[];
  }>('/jockey/race-registrations', {
    method: 'POST',
    body: JSON.stringify({ raceId }),
  });

export const getJockeyPortal = async () =>
  request<{
    profile: JockeyProfileRecord | null;
    horses: HorseRecord[];
    tournaments: TournamentRecord[];
    races: RaceRecord[];
    raceEntries: RaceEntryRecord[];
    invitations: JockeyInvitation[];
  }>('/jockey/portal');

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

export const decideJockeyInvitation = async (
  id: string,
  decision: 'accepted' | 'rejected',
) =>
  request<{ invitation: JockeyInvitation }>(`/jockey/invitations/${id}`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  });
