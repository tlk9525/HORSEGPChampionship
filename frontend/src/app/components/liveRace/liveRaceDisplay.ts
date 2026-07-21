export type ResultOutcome = 'finished' | 'dnf' | 'fell' | 'injured' | 'disqualified';

export interface DisplayRunnerRow {
  keyId: string;
  lane: number | null;
  horseName: string;
  jockeyName: string;
  silkColor: string;
  rating: number;
  carriedWeight: number;
  progress: number;
  position?: number;
  finishTime?: string;
  liveRank?: number;
  simulationOutcome?: ResultOutcome;
  incidentReason?: string;
  nonFinishRisk?: number;
}

export interface OfficialLeaderboardRow {
  id: string;
  horseName: string;
  lane: number | null;
  outcome: string;
  position: number | null;
  finishTime: string;
  incidentReason: string;
  silkColor: string;
}

export const resultOutcomeOptions: Array<{ value: ResultOutcome; label: string }> = [
  { value: 'finished', label: 'Finished normally' },
  { value: 'dnf', label: 'DNF' },
  { value: 'fell', label: 'Fell / Nhao' },
  { value: 'injured', label: 'Injured' },
  { value: 'disqualified', label: 'Disqualified' },
];

// Ghi chú: Đổi mã kết quả thi đấu thành nhãn dễ đọc trên giao diện.
export const resultOutcomeLabel = (value?: string) =>
  resultOutcomeOptions.find((option) => option.value === value)?.label || 'Finished normally';

const leaderboardLaneColors = [
  '#22c55e',
  '#38bdf8',
  '#6366f1',
  '#ef4444',
  '#f4c542',
  '#cbd5e1',
  '#a855f7',
  '#14b8a6',
];

// Ghi chú: Chọn màu áo đua ổn định theo số làn của runner.
export const silkPaletteByLane = (lane?: number | null) =>
  leaderboardLaneColors[Math.max(0, Number(lane || 1) - 1) % leaderboardLaneColors.length];

// Ghi chú: Chuyển thời gian về đích dạng chuỗi thành tổng số giây để so sánh.
export const parseFinishTimeSeconds = (value?: string) => {
  const raw = String(value || '').trim();
  if (!raw) return Number.NaN;

  const parts = raw.split(':');
  const timeParts = parts.map((part) => part.split('.'));
  if (parts.length === 2 || parts.length === 3) {
    const hours = parts.length === 3 ? Number(parts[0]) : 0;
    const minuteIndex = parts.length === 3 ? 1 : 0;
    const secondIndex = parts.length === 3 ? 2 : 1;
    const minutes = Number(parts[minuteIndex]);
    const seconds = Number(timeParts[secondIndex][0]);
    const fraction = Number((timeParts[secondIndex][1] || '0').padEnd(3, '0').slice(0, 3));

    if ([hours, minutes, seconds, fraction].every(Number.isFinite)) {
      return hours * 3600 + minutes * 60 + seconds + fraction / 1000;
    }
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

// Ghi chú: Tạo giá trị sắp xếp thời gian về đích, đẩy dữ liệu không hợp lệ xuống cuối.
export const finishTimeSortValue = (value?: string) => {
  const parsed = parseFinishTimeSeconds(value);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
};
