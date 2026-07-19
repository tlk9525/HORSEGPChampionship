import { request } from './client';
import type { RaceEntryRecord, RaceRecord } from './types';

export type RaceEntryReadiness = 'ready' | 'absent' | 'incident' | 'scratched';

export const submitRaceResults = async (raceId: string) =>
  request<{ race?: RaceRecord; entries?: RaceEntryRecord[] }>(
    `/referee/races/${raceId}/submit-results`,
    { method: 'POST' },
  );

export const markRaceEntryReadiness = async (
  entryId: string,
  readiness: RaceEntryReadiness,
) =>
  request<{ entry: RaceEntryRecord; entries: RaceEntryRecord[] }>(
    `/referee/race-entries/${encodeURIComponent(entryId)}/readiness/${readiness}`,
    { method: 'POST' },
  );

export const recordRaceResult = async (
  entryId: string,
  result: {
    resultOutcome?: 'finished' | 'dnf' | 'fell' | 'injured' | 'disqualified';
    position: string | number;
    finishTime: string;
    notes?: string;
    incidentReason?: string;
    violationNotes?: string;
  },
) =>
  request<{ entry: RaceEntryRecord; entries: RaceEntryRecord[] }>(
    `/referee/race-entries/${entryId}/result`,
    {
      method: 'POST',
      body: JSON.stringify(result),
    },
  );
