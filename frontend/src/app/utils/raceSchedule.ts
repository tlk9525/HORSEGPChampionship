interface TournamentSchedule {
  startDate?: string;
  finalDate?: string;
}

interface RaceScheduleInput {
  tournament?: TournamentSchedule | null;
  raceDate: string;
  startTime: string;
  registrationOpensAt: string;
  registrationClosesAt: string;
}

// Ghi chú: Kiểm tra ngày race có nằm trong lịch của tournament.
const raceDateWithinTournamentMessage = (
  tournament: TournamentSchedule | null | undefined,
  raceDate: string
) => {
  if (!tournament) return '';
  if (tournament.startDate && raceDate < tournament.startDate) {
    return 'Race date must be on or after tournament start date.';
  }
  if (tournament.finalDate && raceDate > tournament.finalDate) {
    return 'Race date must be on or before tournament end date.';
  }
  return '';
};

// Ghi chú: Parse và validate một lần cho cả form create, edit và reset race.
export const parseRaceSchedule = ({
  tournament,
  raceDate,
  startTime,
  registrationOpensAt,
  registrationClosesAt,
}: RaceScheduleInput) => {
  const regOpens = new Date(registrationOpensAt);
  const regCloses = new Date(registrationClosesAt);
  const raceStartsAt = new Date(`${raceDate}T${startTime}`);
  let error = '';

  if (
    !Number.isFinite(regOpens.getTime()) ||
    !Number.isFinite(regCloses.getTime()) ||
    !Number.isFinite(raceStartsAt.getTime())
  ) {
    error = 'Race and registration times must be valid.';
  } else if (regOpens >= regCloses) {
    error = 'Registration close time must be after open time.';
  } else if (regCloses > raceStartsAt) {
    error = 'Registration must close before the race starts.';
  } else {
    error = raceDateWithinTournamentMessage(tournament, raceDate);
  }

  return { error, regOpens, regCloses, raceStartsAt };
};

// Ghi chú: Đổi Date sang định dạng input datetime-local.
export const formatDatetimeLocal = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0');

  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ].join('T');
};

// Ghi chú: Đổi thời gian ISO sang định dạng input datetime-local.
export const isoToDatetimeLocal = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? formatDatetimeLocal(date) : '';
};
