import { USER_ROLES } from '../../config/constants.js';
import { raceRefereeIds } from '../../services/domainService.js';
import { createNotification } from '../../services/notificationService.js';
import { refundRaceBets } from '../../services/bettingService.js';
import { systemSettingsFromDb } from '../../services/systemSettingsService.js';

// Lấy số ngựa tối đa được phép tham gia một race từ system settings.
export const raceFieldSize = (db) => systemSettingsFromDb(db).maxHorsesPerRace;

// Lấy số participant tối thiểu phải sẵn sàng trước khi race bắt đầu.
export const minReadiedParticipants = (db) =>
  systemSettingsFromDb(db).minReadiedParticipants;

// Kiểm tra tournament đã qua hết ngày kết thúc hay chưa.
export const tournamentHasEnded = (tournament, at = new Date()) => {
  if (!tournament?.finalDate) return false;

  const finalDate = String(tournament.finalDate).slice(0, 10);
  const tournamentEndsAt = new Date(`${finalDate}T23:59:59.999Z`);

  return (
    Number.isFinite(tournamentEndsAt.getTime()) &&
    at.getTime() > tournamentEndsAt.getTime()
  );
};

// Kiểm tra một chuỗi có phải ngày hợp lệ theo định dạng YYYY-MM-DD hay không.
export const isDateOnly = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  );
};

// Kiểm tra ngày race có nằm trong khoảng thời gian của tournament hay không.
const validateRaceDateInTournament = (tournament, raceDate) => {
  if (!isDateOnly(raceDate)) return 'Race date and time must be valid';
  if (tournament?.startDate && raceDate < tournament.startDate) {
    return 'Race date must be on or after tournament start date';
  }
  if (tournament?.finalDate && raceDate > tournament.finalDate) {
    return 'Race date must be on or before tournament end date';
  }
  return null;
};

// Kiểm tra thứ tự thời gian giữa lịch đăng ký, lịch race và thời hạn tournament.
export const validateRaceSchedule = ({
  tournament,
  raceDate,
  raceStartsAt,
  registrationOpensAt,
  registrationClosesAt,
}) => {
  if (
    !Number.isFinite(raceStartsAt.getTime()) ||
    !Number.isFinite(registrationOpensAt.getTime()) ||
    !Number.isFinite(registrationClosesAt.getTime())
  ) {
    return 'Race and registration times must be valid';
  }

  const raceDateError = validateRaceDateInTournament(tournament, raceDate);
  if (raceDateError) return raceDateError;
  if (registrationOpensAt >= registrationClosesAt) {
    return 'Registration close time must be after open time';
  }
  if (registrationClosesAt > raceStartsAt) {
    return 'Registration must close before the race starts';
  }

  return null;
};

// Phân tích lịch mới của race hiện có và trả về các mốc thời gian đã xác thực.
export const resolveExistingRaceSchedule = (
  db,
  race,
  { date, time, registrationOpensAt, registrationClosesAt },
) => {
  const tournament = db.tournaments.find(
    (item) => item.id === race.tournamentId,
  );
  if (!tournament) {
    return { error: 'Race tournament not found' };
  }

  const regOpens = new Date(registrationOpensAt);
  const regCloses = new Date(registrationClosesAt);
  const scheduleError = validateRaceSchedule({
    tournament,
    raceDate: date,
    raceStartsAt: new Date(`${date}T${time}`),
    registrationOpensAt: regOpens,
    registrationClosesAt: regCloses,
  });

  return scheduleError
    ? { error: scheduleError }
    : { tournament, regOpens, regCloses };
};

// Thu thập ID của mọi user cần nhận thông báo khi race bị hủy.
const raceCancellationRecipientIds = (db, race, entries) => {
  const recipientIds = new Set();

  entries.forEach((entry) => {
    const horse = db.horses.find((item) => item.id === entry.horseId);
    if (horse?.ownerUserId) recipientIds.add(horse.ownerUserId);
    if (entry.jockeyUserId) recipientIds.add(entry.jockeyUserId);
  });
  raceRefereeIds(db, race).forEach((refereeId) => recipientIds.add(refereeId));
  db.users
    .filter((user) =>
      [USER_ROLES.ADMIN, USER_ROLES.SPECTATOR].includes(user.role),
    )
    .forEach((user) => recipientIds.add(user.id));

  return recipientIds;
};

// Hủy race, hoàn các cược pending và thông báo cho những user liên quan.
export const cancelRace = (
  db,
  race,
  entries,
  { refundReason, notificationMessage },
) => {
  race.status = 'cancelled';
  race.updatedAt = new Date().toISOString();
  const refund = refundRaceBets(db, race.id, refundReason);

  raceCancellationRecipientIds(db, race, entries).forEach((userId) =>
    createNotification(db, userId, 'Race cancelled', notificationMessage),
  );

  return {
    settledBets: (db.bets || []).filter(
      (bet) => bet.raceId === race.id && bet.settledAt,
    ),
    affectedSpectators: refund.affectedUsers || [],
  };
};
