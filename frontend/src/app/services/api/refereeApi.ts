import { request } from './client';
import type { RaceEntryRecord, RaceRecord } from './types';

export type RaceEntryReadiness = 'ready' | 'absent' | 'incident' | 'scratched';

// Gửi toàn bộ kết quả cuộc đua để chuyển sang bước công bố.
export const submitRaceResults = async (raceId: string) =>
  request<{ race?: RaceRecord; entries?: RaceEntryRecord[] }>(
    `/referee/races/${raceId}/submit-results`,
    { method: 'POST' },
  );

// Ghi nhận trạng thái sẵn sàng của một ngựa trước cuộc đua.
export const markRaceEntryReadiness = async (
  entryId: string,
  readiness: RaceEntryReadiness,
) =>
  request<{ entry: RaceEntryRecord; entries: RaceEntryRecord[] }>(
    `/referee/race-entries/${encodeURIComponent(entryId)}/readiness/${readiness}`,
    { method: 'POST' },
  );

// Lưu kết quả thi đấu và ghi chú sự cố của một ngựa.
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
