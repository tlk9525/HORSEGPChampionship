import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import { ACTIVE_TOURNAMENT_STATUSES, USER_ROLES } from '../config/constants.js';
import { publicUser, requireRole } from '../services/authService.js';
import {
  approvedRaceEntries,
  formatApprovals,
  isRaceRegistrationOpen,
  jockeyName,
  publicRaceEntries,
  raceRefereeIds,
  raceName,
  tournamentName,
  tournamentRaces,
} from '../services/domainService.js';
import {
  computePostRaceRating,
  computeRaceHandicap,
  officialHorseRating,
  raceCarriedWeightRange,
  raceEligibilityRange,
} from '../services/handicapService.js';
import { broadcastRaceUpdate } from '../services/liveRaceEvents.js';
import { recordRaceAction } from '../services/raceAuditService.js';
import {
  createNotification,
  notifyAdmins,
} from '../services/notificationService.js';
import {
  sanitizeSystemSettings,
  settingsToRows,
  systemSettingsFromDb,
} from '../services/systemSettingsService.js';
import {
  buildOfficialReplayTimeline,
  buildProvisionalRaceTimeline,
} from '../services/raceReplayTimeline.js';
import { racePotTotal, refundRaceBets, settleRaceBets } from '../services/bettingService.js';

// Helpers nội bộ
const nonRejectedEntry = (entry) => entry.status !== 'rejected';

const USER_ROLE_VALUES = Object.values(USER_ROLES);
const USER_STATUSES = ['pending', 'active', 'rejected', 'suspended', 'locked'];

// Ghi chú: Hàm này chuẩn hóa hoặc tính toán dữ liệu cho sortedPublicUsers.
const sortedPublicUsers = (db) =>
  [...(db.users || [])]
    .sort((first, second) => {
      const firstDate = new Date(first.createdAt || 0).getTime();
      const secondDate = new Date(second.createdAt || 0).getTime();
      return secondDate - firstDate || first.name.localeCompare(second.name);
    })
    .map(publicUser);

// Ghi chú: Hàm này tính nhanh giá trị cấu hình activeAdminCount.
const activeAdminCount = (db) =>
  (db.users || []).filter((user) => user.role === 'admin' && user.status === 'active').length;

// Ghi chú: Hàm này tính nhanh giá trị cấu hình raceFieldSize.
const raceFieldSize = (db) => systemSettingsFromDb(db).maxHorsesPerRace;
// Ghi chú: Hàm này lấy và chuẩn hóa dữ liệu cho minReadiedParticipants.
const minReadiedParticipants = (db) => systemSettingsFromDb(db).minReadiedParticipants;
// Ghi chú: Hàm này sắp xếp danh mục race class theo thứ tự admin cấu hình.
const sortedRaceClasses = (db, { activeOnly = false } = {}) =>
  [...(db.raceClasses || [])]
    .filter((raceClass) => !activeOnly || raceClass.isActive !== false)
    .sort(
      (first, second) =>
        Number(first.sortOrder || 0) - Number(second.sortOrder || 0) ||
        String(first.name).localeCompare(String(second.name))
    );

// Ghi chú: Hàm này kiểm tra và chuẩn hóa parameter của một race class.
const sanitizeRaceClass = (input, current = {}) => {
  const raceClass = {
    name: String(input.name ?? current.name ?? '').trim(),
    ratingMin: Number(input.ratingMin ?? current.ratingMin),
    ratingMax: Number(input.ratingMax ?? current.ratingMax),
    handicapMin: Number(input.handicapMin ?? current.handicapMin),
    handicapMax: Number(input.handicapMax ?? current.handicapMax),
    sortOrder: Number(input.sortOrder ?? current.sortOrder ?? 0),
    isActive:
      input.isActive === undefined
        ? current.isActive !== false
        : input.isActive === true,
  };

  if (!raceClass.name) return { message: 'Race class name is required' };
  if (raceClass.name.length > 128) return { message: 'Race class name is too long' };
  if (
    !Number.isFinite(raceClass.ratingMin) ||
    !Number.isFinite(raceClass.ratingMax) ||
    raceClass.ratingMin < 0 ||
    raceClass.ratingMax > 140 ||
    raceClass.ratingMin > raceClass.ratingMax
  ) {
    return { message: 'Rating range must be between 0 and 140' };
  }
  if (!raceCarriedWeightRange(raceClass)) {
    return { message: 'Assigned weights must be positive and minimum cannot exceed top weight' };
  }
  if (!Number.isInteger(raceClass.sortOrder) || raceClass.sortOrder < 0) {
    return { message: 'Display order must be a non-negative whole number' };
  }

  return { raceClass };
};

// Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến tournament has ended.
const tournamentHasEnded = (tournament, at = new Date()) => {
  if (!tournament?.finalDate) return false;

  const finalDate = String(tournament.finalDate).slice(0, 10);
  const tournamentEndsAt = new Date(`${finalDate}T23:59:59.999Z`);

  return (
    Number.isFinite(tournamentEndsAt.getTime()) &&
    at.getTime() > tournamentEndsAt.getTime()
  );
};

// Ghi chú: Hàm này kiểm tra trạng thái nghiệp vụ liên quan đến is date only.
const isDateOnly = (value) => {
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

// Ghi chú: Hàm này kiểm tra ngày race có nằm trong khoảng ngày của tournament.
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

// Ghi chú: Dùng chung validation lịch race cho create, edit và reset.
const validateRaceSchedule = ({
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

// Ghi chú: Gom danh sách người cần nhận thông báo khi race bị hủy.
const raceCancellationRecipientIds = (db, race, entries) => {
  const recipientIds = new Set();

  entries.forEach((entry) => {
    const horse = db.horses.find((item) => item.id === entry.horseId);
    if (horse?.ownerUserId) recipientIds.add(horse.ownerUserId);
    if (entry.jockeyUserId) recipientIds.add(entry.jockeyUserId);
  });
  raceRefereeIds(db, race).forEach((refereeId) => recipientIds.add(refereeId));
  db.users
    .filter((user) => [USER_ROLES.ADMIN, USER_ROLES.SPECTATOR].includes(user.role))
    .forEach((user) => recipientIds.add(user.id));

  return recipientIds;
};

// Ghi chú: Hủy race, hoàn cược và gửi thông báo bằng một luồng thống nhất.
const cancelRace = (db, race, entries, { refundReason, notificationMessage }) => {
  race.status = 'cancelled';
  race.updatedAt = new Date().toISOString();
  const refund = refundRaceBets(db, race.id, refundReason);

  raceCancellationRecipientIds(db, race, entries).forEach((userId) =>
    createNotification(db, userId, 'Race cancelled', notificationMessage)
  );

  return {
    settledBets: (db.bets || []).filter(
      (bet) => bet.raceId === race.id && bet.settledAt
    ),
    affectedSpectators: refund.affectedUsers || [],
  };
};

// Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến registration pair.
const registrationPair = (registration, invitation) => ({
  horseId: registration?.horseId || invitation?.horseId,
  jockeyUserId: registration?.jockeyUserId || invitation?.jockeyUserId,
  ownerUserId: registration?.ownerUserId || invitation?.ownerUserId,
  invitationId: registration?.invitationId || invitation?.id || null,
  notes: registration?.notes || invitation?.notes || '',
});

// Ghi chú: Hàm này kiểm tra nghiệp vụ liên quan đến validate pair for race.
const validatePairForRace = (db, race, pair) => {
  if (!isRaceRegistrationOpen(race)) {
    return `${race.name} registration is closed.`;
  }

  const existingEntry = (db.raceEntries || []).find(
    (entry) => entry.raceId === race.id && entry.horseId === pair.horseId && nonRejectedEntry(entry)
  );
  if (existingEntry) return null;

  const horse = db.horses.find((h) => h.id === pair.horseId);
  const ratingRange = raceEligibilityRange(race);
  if (horse && ratingRange) {
    const rating = officialHorseRating(horse);
    const { min, max } = ratingRange;
    if (rating < min || rating > max) {
      return `${horse.name || 'Horse'} rating (${rating}) is not eligible for ${race.raceClass || 'this race'} (${min}-${max}).`;
    }
  }

  const jockeyConflict = (db.raceEntries || []).find(
    (entry) =>
      entry.raceId === race.id && entry.jockeyUserId === pair.jockeyUserId &&
      entry.horseId !== pair.horseId && nonRejectedEntry(entry)
  );
  if (jockeyConflict) return `${jockeyName(db, pair.jockeyUserId)} is already assigned in ${race.name}.`;
  const maxRaceEntries = raceFieldSize(db);
  if (approvedRaceEntries(db, race.id).length >= maxRaceEntries) return `${race.name} already has ${maxRaceEntries} approved horses.`;
  return null;
};

// Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến add pair to race.
const addPairToRace = (db, race, pair, createdAt) => {
  db.raceEntries = db.raceEntries || [];
  const existingEntry = db.raceEntries.find(
    (entry) => entry.raceId === race.id && entry.horseId === pair.horseId && nonRejectedEntry(entry)
  );
  if (existingEntry) return false;

  db.raceEntries.push({
    id: randomUUID(), raceId: race.id, horseId: pair.horseId,
    jockeyUserId: pair.jockeyUserId, invitationId: pair.invitationId,
    status: 'approved', lane: null, handicap: 0, ratingSnapshot: 0,
    ownerConfirmed: true, jockeyConfirmed: true, preRaceStatus: 'pending',
    disqualified: false, resultStatus: 'draft', notes: pair.notes,
    violationNotes: '', finishTime: '', position: null, createdAt,
  });

  race.participants = approvedRaceEntries(db, race.id).length;
  race.ownerConfirmed = race.participants;
  race.jockeyConfirmed = race.participants;
  return true;
};
// Ghi chú: Hàm này tạo nhóm route admin routes cho backend.
export const createAdminRoutes = (
  getDb,
  writeDb,
  persistAdminRaceAction,
  persistSystemSettings,
  persistCreatedTournament
) => {
  const app = new Hono();

  // Middleware xác thực — chỉ admin mới truy cập được
  app.use('*', async (c, next) => {
    const db = await getDb();
    const user = await requireRole(c.req.raw, db, ['admin']);
    if (!user) return c.json({ message: 'Admin access required' }, 403);
    c.set('user', user);
    c.set('db', db);
    await next();
  });

  // Lấy danh sách tất cả các mục đang chờ phê duyệt
  app.get('/approvals', (c) => {
    const db = c.get('db');
    return c.json({ approvals: formatApprovals(db) });
  });

  app.get('/betting', (c) => {
    const db = c.get('db');
    const bets = db.bets || [];
    const raceIds = [...new Set(bets.map((bet) => bet.raceId))];

    const raceSummaries = raceIds.map((raceId) => {
      const race = db.races.find((item) => item.id === raceId);
      const raceBets = bets.filter((bet) => bet.raceId === raceId);
      const bettorIds = new Set(raceBets.map((bet) => bet.userId));
      const pending = raceBets.filter((bet) => bet.status === 'pending');
      const won = raceBets.filter((bet) => bet.status === 'won');
      const lost = raceBets.filter((bet) => bet.status === 'lost');
      const refunded = raceBets.filter((bet) => bet.status === 'refunded');

      return {
        raceId,
        raceName: race?.name || raceId,
        raceStatus: race?.status || 'unknown',
        totalBets: raceBets.length,
        uniqueBettors: bettorIds.size,
        poolTotal: racePotTotal(db, raceId),
        totalWagered: raceBets.reduce((sum, bet) => sum + Number(bet.amount || 0), 0),
        totalPaidOut: won.reduce((sum, bet) => sum + Number(bet.payout || 0), 0),
        totalRefunded: refunded.reduce((sum, bet) => sum + Number(bet.payout || 0), 0),
        counts: {
          pending: pending.length,
          won: won.length,
          lost: lost.length,
          refunded: refunded.length,
        },
      };
    });

    const spectators = db.users
      .filter((user) => user.role === 'spectator')
      .map((user) => {
        const userBets = bets.filter((bet) => bet.userId === user.id);
        return {
          id: user.id,
          name: user.name,
          credits: Number(user.credits ?? 0),
          loginStreak: Number(user.loginStreak ?? 0),
          lastLoginRewardDate: user.lastLoginRewardDate || null,
          totalBets: userBets.length,
          totalWagered: userBets.reduce((sum, bet) => sum + Number(bet.amount || 0), 0),
          totalWon: userBets
            .filter((bet) => bet.status === 'won')
            .reduce((sum, bet) => sum + Number(bet.payout || 0), 0),
        };
      })
      .sort((a, b) => b.credits - a.credits);

    return c.json({ raceSummaries, spectators });
  });

  app.get('/users', (c) => {
    const db = c.get('db');
    return c.json({ users: sortedPublicUsers(db) });
  });

  app.get('/settings', (c) => {
    const db = c.get('db');
    return c.json({ settings: systemSettingsFromDb(db) });
  });

  app.patch('/settings', async (c) => {
    const db = c.get('db');
    const user = c.get('user');
    const current = systemSettingsFromDb(db);
    const input = await c.req.json();
    const settings = sanitizeSystemSettings(input, current);
    const now = new Date().toISOString();

    const settingsRows = settingsToRows(settings, user.id, now);

    if (persistSystemSettings) {
      await persistSystemSettings(settingsRows);
    } else {
      db.systemSettings = settingsRows;
      await writeDb(db);
    }

    return c.json({ settings });
  });

  // Lấy toàn bộ danh mục race class để admin quản lý.
  app.get('/race-classes', (c) => {
    return c.json({ raceClasses: sortedRaceClasses(c.get('db')) });
  });

  // Tạo race class mới; các race đã tồn tại không bị thay đổi.
  app.post('/race-classes', async (c) => {
    const db = c.get('db');
    const user = c.get('user');
    const input = await c.req.json();
    const result = sanitizeRaceClass(input);
    if (result.message) return c.json({ message: result.message }, 400);

    const duplicate = (db.raceClasses || []).some(
      (item) => item.name.toLowerCase() === result.raceClass.name.toLowerCase()
    );
    if (duplicate) return c.json({ message: 'Race class name already exists' }, 409);

    const now = new Date().toISOString();
    const raceClass = {
      id: randomUUID(),
      ...result.raceClass,
      createdAt: now,
      updatedAt: now,
      updatedBy: user.id,
    };
    db.raceClasses = db.raceClasses || [];
    db.raceClasses.push(raceClass);
    await writeDb(db);

    return c.json({ raceClass, raceClasses: sortedRaceClasses(db) }, 201);
  });

  // Sửa parameter hoặc bật/tắt một race class trong catalog.
  app.patch('/race-classes/:raceClassId', async (c) => {
    const db = c.get('db');
    const user = c.get('user');
    const raceClass = (db.raceClasses || []).find(
      (item) => item.id === c.req.param('raceClassId')
    );
    if (!raceClass) return c.json({ message: 'Race class not found' }, 404);

    const input = await c.req.json();
    const result = sanitizeRaceClass(input, raceClass);
    if (result.message) return c.json({ message: result.message }, 400);

    const duplicate = db.raceClasses.some(
      (item) =>
        item.id !== raceClass.id &&
        item.name.toLowerCase() === result.raceClass.name.toLowerCase()
    );
    if (duplicate) return c.json({ message: 'Race class name already exists' }, 409);

    Object.assign(raceClass, result.raceClass, {
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
    });
    await writeDb(db);

    return c.json({ raceClass, raceClasses: sortedRaceClasses(db) });
  });

  app.patch('/users/:id', async (c) => {
    const currentUser = c.get('user');
    const db = c.get('db');
    const id = c.req.param('id');
    const { role, status } = await c.req.json();
    const target = (db.users || []).find((user) => user.id === id);

    if (!target) return c.json({ message: 'User not found' }, 404);
    if (!USER_ROLE_VALUES.includes(role)) return c.json({ message: 'Invalid role' }, 400);
    if (!USER_STATUSES.includes(status)) return c.json({ message: 'Invalid status' }, 400);
    if (target.id === currentUser.id && (role !== 'admin' || status !== 'active')) {
      return c.json({ message: 'You cannot remove your own active admin access' }, 400);
    }
    if (
      target.role === 'admin' &&
      target.status === 'active' &&
      (role !== 'admin' || status !== 'active') &&
      activeAdminCount(db) <= 1
    ) {
      return c.json({ message: 'At least one active admin is required' }, 400);
    }

    target.role = role;
    target.status = status;
    target.updatedAt = new Date().toISOString();

    await writeDb(db);
    return c.json({ user: publicUser(target), users: sortedPublicUsers(db) });
  });

  app.delete('/users/:id', async (c) => {
    const currentUser = c.get('user');
    const db = c.get('db');
    const id = c.req.param('id');
    const target = (db.users || []).find((user) => user.id === id);

    if (!target) return c.json({ message: 'User not found' }, 404);
    if (target.id === currentUser.id) {
      return c.json({ message: 'You cannot disable your own account' }, 400);
    }
    if (target.role === 'admin' && target.status === 'active' && activeAdminCount(db) <= 1) {
      return c.json({ message: 'At least one active admin is required' }, 400);
    }

    target.status = 'suspended';
    target.updatedAt = new Date().toISOString();

    await writeDb(db);
    return c.json({ user: publicUser(target), users: sortedPublicUsers(db) });
  });

  // Lấy dữ liệu trang tạo cuộc đua: giải, các cuộc đua hiện có, danh sách trọng tài
  app.get('/race-builder', (c) => {
    const db = c.get('db');
    const settings = systemSettingsFromDb(db);
    const referees = db.users
      .filter((item) => item.role === 'referee' && item.status === 'active')
      .map((item) => ({ id: item.id, name: item.name }));
    return c.json({
      tournaments: db.tournaments.filter((item) =>
        ACTIVE_TOURNAMENT_STATUSES.includes(item.status)
      ),
      races: db.races || [],
      referees,
      raceClasses: sortedRaceClasses(db, { activeOnly: true }),
      maxRacesPerTournament: settings.maxRacesPerTournament,
      defaultDistanceMeters: settings.defaultDistanceMeters,
      closeRegistrationHours: settings.closeRegistrationHours,
    });
  });

  // Tạo giải đấu mới
  app.post('/tournaments', async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const {
      name,
      startDate,
      finalDate,
      location,
    } = await c.req.json();

    const cleanName = String(name || '').trim();
    const cleanStartDate = String(startDate || '').trim();
    const cleanFinalDate = String(finalDate || '').trim();
    const cleanLocation = String(location || '').trim();

    if (!cleanName || !cleanStartDate || !cleanLocation) {
      return c.json(
        { message: 'Tournament name, start date and location are required' },
        400
      );
    }

    if (!isDateOnly(cleanStartDate) || (cleanFinalDate && !isDateOnly(cleanFinalDate))) {
      return c.json({ message: 'Tournament dates must be valid' }, 400);
    }

    if (cleanFinalDate && cleanFinalDate < cleanStartDate) {
      return c.json({ message: 'End date must be after start date' }, 400);
    }

    const createdAt = new Date().toISOString();
    const tournament = {
      id: randomUUID(), name: cleanName, status: 'active',
      startDate: cleanStartDate, finalDate: cleanFinalDate, location: cleanLocation,
      prizePool: 0, createdAt, updatedAt: createdAt,
    };

    db.tournaments.unshift(tournament);
    const previousNotificationIds = new Set(
      (db.notifications || []).map((notification) => notification.id)
    );
    notifyAdmins(db, 'Tournament created',
      `${tournament.name} has been created. Race registration opens on each race schedule.`);

    const createdNotifications = (db.notifications || []).filter(
      (notification) => !previousNotificationIds.has(notification.id)
    );

    if (persistCreatedTournament) {
      await persistCreatedTournament(tournament, createdNotifications);
    } else {
      await writeDb(db);
    }
    return c.json({ tournament, tournaments: db.tournaments, notifications: db.notifications || [] }, 201);
  });

  // Cập nhật thông tin cơ bản của giải đấu.
  app.patch('/tournaments/:tournamentId', async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const tournament = db.tournaments.find(
      (item) => item.id === c.req.param('tournamentId')
    );

    if (!tournament) return c.json({ message: 'Tournament not found' }, 404);

    const { name, startDate, finalDate, location } = await c.req.json();
    const cleanName = String(name || '').trim();
    const cleanStartDate = String(startDate || '').trim();
    const cleanFinalDate = String(finalDate || '').trim();
    const cleanLocation = String(location ?? tournament.location ?? '').trim();

    if (!cleanName || !cleanStartDate) {
      return c.json(
        { message: 'Tournament name and start date are required' },
        400
      );
    }

    if (!isDateOnly(cleanStartDate) || (cleanFinalDate && !isDateOnly(cleanFinalDate))) {
      return c.json({ message: 'Tournament dates must be valid' }, 400);
    }

    if (cleanFinalDate && cleanFinalDate < cleanStartDate) {
      return c.json({ message: 'End date must be after start date' }, 400);
    }

    tournament.name = cleanName;
    tournament.startDate = cleanStartDate;
    tournament.finalDate = cleanFinalDate;
    tournament.location = cleanLocation;
    tournament.updatedAt = new Date().toISOString();

    notifyAdmins(db, 'Tournament updated', `${tournament.name} was updated by ${user.name}.`);

    await writeDb(db);
    return c.json({ tournament, tournaments: db.tournaments, notifications: db.notifications || [] });
  });

  // Xóa giải đấu và toàn bộ dữ liệu race thuộc giải đấu đó.
  app.delete('/tournaments/:tournamentId', async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const tournamentId = c.req.param('tournamentId');
    const tournament = db.tournaments.find((item) => item.id === tournamentId);

    if (!tournament) return c.json({ message: 'Tournament not found' }, 404);

    const raceIds = new Set(
      (db.races || [])
        .filter((race) => race.tournamentId === tournamentId)
        .map((race) => race.id)
    );
    const entryIds = new Set(
      (db.raceEntries || [])
        .filter((entry) => raceIds.has(entry.raceId))
        .map((entry) => entry.id)
    );

    db.tournaments = (db.tournaments || []).filter((item) => item.id !== tournamentId);
    db.races = (db.races || []).filter((race) => race.tournamentId !== tournamentId);
    db.raceEntries = (db.raceEntries || []).filter((entry) => !raceIds.has(entry.raceId));
    db.horseRaceRegistrations = (db.horseRaceRegistrations || []).filter(
      (registration) =>
        registration.tournamentId !== tournamentId && !raceIds.has(registration.raceId)
    );
    db.jockeyRaceRegistrations = (db.jockeyRaceRegistrations || []).filter(
      (registration) => !raceIds.has(registration.raceId)
    );
    db.jockeyInvitations = (db.jockeyInvitations || []).filter(
      (invitation) =>
        invitation.tournamentId !== tournamentId && !raceIds.has(invitation.raceId)
    );
    db.raceRefereeAssignments = (db.raceRefereeAssignments || []).filter(
      (assignment) => !raceIds.has(assignment.raceId)
    );
    db.refereeReports = (db.refereeReports || []).filter(
      (report) => !raceIds.has(report.raceId) && !entryIds.has(report.raceEntryId)
    );
    db.raceActionLogs = (db.raceActionLogs || []).filter(
      (log) => !raceIds.has(log.raceId)
    );

    notifyAdmins(db, 'Tournament deleted', `${tournament.name} was deleted by ${user.name}.`);

    await writeDb(db);
    return c.json({
      ok: true,
      tournamentId,
      raceIds: Array.from(raceIds),
      tournaments: db.tournaments,
      notifications: db.notifications || [],
    });
  });

  // Tạo một cuộc đua mới trong giải đấu
  app.post('/races', async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const {
      tournamentId, raceNumber, name, round, date, time, venue, distance, surface,
      raceClassId, raceClass, totalPrize, refereeUserId, refereeUserIds,
      registrationOpensAt: reqRegOpens, registrationClosesAt: reqRegCloses,
    } = await c.req.json();

    if (
      !name || !date || !time || !venue || !distance || !surface ||
      !refereeUserId
    ) {
      return c.json({ message: 'Race name, schedule, venue, distance, weights and referee are required' }, 400);
    }

    const selectedRefereeIds = Array.from(
      new Set([refereeUserId, ...(Array.isArray(refereeUserIds) ? refereeUserIds : [])].filter(Boolean))
    );
    const selectedReferees = selectedRefereeIds
      .map((id) => db.users.find((item) => item.id === id && item.role === 'referee' && item.status === 'active'))
      .filter(Boolean);
    const referee = selectedReferees[0];

    if (selectedReferees.length !== selectedRefereeIds.length || !referee) {
      return c.json({ message: 'Assigned referee must be active' }, 400);
    }
    if (!tournamentId) {
      return c.json({ message: 'Create and select a tournament before creating races' }, 400);
    }

    const tournament = db.tournaments.find(
      (item) => item.id === tournamentId && ACTIVE_TOURNAMENT_STATUSES.includes(item.status)
    );
    if (!tournament) {
      return c.json({ message: 'Selected tournament must exist and be open before creating races' }, 400);
    }
    const existingTournamentRaces = tournamentRaces(db, tournament.id);
    const settings = systemSettingsFromDb(db);
    if (existingTournamentRaces.length >= settings.maxRacesPerTournament) {
      return c.json(
        { message: `${tournament.name} already has the maximum ${settings.maxRacesPerTournament} races` },
        409
      );
    }

    const now = new Date();
    // Registration window is set per-race (not per-tournament anymore)
    const registrationOpensAt = reqRegOpens ? new Date(reqRegOpens) : now;
    const raceStartsAt = new Date(`${date}T${time}`);
    const defaultRegistrationClosesAt = new Date(
      raceStartsAt.getTime() - settings.closeRegistrationHours * 60 * 60 * 1000
    );
    const registrationClosesAt = reqRegCloses ? new Date(reqRegCloses) : defaultRegistrationClosesAt;

    const scheduleError = validateRaceSchedule({
      tournament,
      raceDate: date,
      raceStartsAt,
      registrationOpensAt,
      registrationClosesAt,
    });
    if (scheduleError) {
      return c.json({ message: scheduleError }, 400);
    }
    const distanceMeters = Number(distance);
    const selectedRaceClass = (db.raceClasses || []).find(
      (item) =>
        item.isActive !== false &&
        (item.id === raceClassId ||
          (!raceClassId &&
            String(item.name).toLowerCase() === String(raceClass || '').toLowerCase()))
    );
    if (!selectedRaceClass) {
      return c.json({ message: 'Select an active race class from the catalog' }, 400);
    }
    const minRating = Number(selectedRaceClass.ratingMin);
    const maxRating = Number(selectedRaceClass.ratingMax);
    const minHandicap = Number(selectedRaceClass.handicapMin);
    const maxHandicap = Number(selectedRaceClass.handicapMax);
    if (!Number.isFinite(distanceMeters) || distanceMeters < 400 || distanceMeters > 10000) {
      return c.json({ message: 'Race distance must be between 400m and 10,000m' }, 400);
    }
    if (
      !Number.isFinite(minRating) ||
      !Number.isFinite(maxRating) ||
      minRating < 0 ||
      maxRating > 140 ||
      maxRating < minRating
    ) {
      return c.json({ message: 'Rating range must be between 0 and 140' }, 400);
    }
    if (!raceCarriedWeightRange(selectedRaceClass)) {
      return c.json(
        { message: 'Selected race class has an invalid assigned-weight range' },
        400
      );
    }

    const duplicateRaceNumber = db.races.some(
      (item) => item.tournamentId === tournament.id &&
        String(item.raceNumber || '').toLowerCase() === String(raceNumber || '').toLowerCase()
    );
    if (raceNumber && duplicateRaceNumber) {
      return c.json({ message: `${raceNumber} already exists in this tournament` }, 409);
    }

    const race = {
      id: randomUUID(), tournamentId: tournament.id, raceNumber: raceNumber || '',
      name, round: round || '', date, time, venue,
      distance: `${distanceMeters}m`, surface, raceClass: selectedRaceClass.name,
      ratingMin: Math.round(minRating), ratingMax: Math.round(maxRating),
      handicapMin: minHandicap, handicapMax: maxHandicap,
      totalPrize: Number(totalPrize) || 0, status: 'registration-open',
      participants: 0, ownerConfirmed: 0, jockeyConfirmed: 0,
      registrationOpensAt: registrationOpensAt.toISOString(),
      registrationClosesAt: registrationClosesAt.toISOString(),
      resultStatus: 'draft', awardsPublished: false,
      createdBy: user.id, createdAt: now.toISOString(), updatedAt: now.toISOString(),
    };

    db.races.unshift(race);
    db.raceRefereeAssignments = db.raceRefereeAssignments || [];
    selectedReferees.forEach((item) =>
      db.raceRefereeAssignments.push({
        id: randomUUID(), raceId: race.id, refereeUserId: item.id,
        assignedBy: user.id, status: 'assigned', assignedAt: now.toISOString(),
      })
    );
    selectedReferees.forEach((item) =>
      createNotification(db, item.id, 'Race assigned',
        `${race.name} has been created under ${tournament.name}.`)
    );

    await writeDb(db);
    broadcastRaceUpdate(race.id);
    return c.json({
      race: {
        ...race,
        refereeUserId: referee.id,
        refereeUserIds: selectedRefereeIds.join(','),
        referee: selectedReferees.map((item) => item.name).join(', '),
      },
      entries: [],
      notifications: db.notifications || [],
    }, 201);
  });

  // Chỉnh sửa lịch race và lưu xuống PostgreSQL trước khi race được publish.
  app.patch('/races/:raceId', async (c) => {
    const db = c.get('db');
    const race = db.races.find((item) => item.id === c.req.param('raceId'));
    if (!race) return c.json({ message: 'Race not found' }, 404);
    if (!['registration-open', 'registration-closed'].includes(race.status)) {
      return c.json({ message: 'Only unpublished races can be edited' }, 400);
    }

    const { name, date, time, registrationOpensAt, registrationClosesAt } = await c.req.json();
    if (!String(name || '').trim() || !date || !time || !registrationOpensAt || !registrationClosesAt) {
      return c.json({ message: 'Race name, date, time and registration window are required' }, 400);
    }

    const tournament = db.tournaments.find((item) => item.id === race.tournamentId);
    if (!tournament) {
      return c.json({ message: 'Race tournament not found' }, 400);
    }

    const regOpens = new Date(registrationOpensAt);
    const regCloses = new Date(registrationClosesAt);
    const raceStartsAt = new Date(`${date}T${time}`);
    const scheduleError = validateRaceSchedule({
      tournament,
      raceDate: date,
      raceStartsAt,
      registrationOpensAt: regOpens,
      registrationClosesAt: regCloses,
    });
    if (scheduleError) {
      return c.json({ message: scheduleError }, 400);
    }

    race.name = String(name).trim();
    race.date = date;
    race.raceDate = date;
    race.time = time;
    race.raceTime = time;
    race.registrationOpensAt = regOpens.toISOString();
    race.registrationClosesAt = regCloses.toISOString();
    race.updatedAt = new Date().toISOString();
    recordRaceAction(db, {
      raceId: race.id,
      userId: c.get('user').id,
      action: 'edit-race',
      fromStatus: race.status,
      toStatus: race.status,
      details: `Updated schedule to ${date} ${time} and registration window`,
    });

    await writeDb(db);
    broadcastRaceUpdate(race.id);
    return c.json({ race });
  });

  // Chỉ cho phép xóa race chưa publish/chưa bắt đầu để không phá lịch sử kết quả.
  app.delete('/races/:raceId', async (c) => {
    const db = c.get('db');
    const user = c.get('user');
    const raceId = c.req.param('raceId');
    const race = db.races.find((item) => item.id === raceId);
    if (!race) return c.json({ message: 'Race not found' }, 404);
    if (!['registration-open', 'registration-closed'].includes(race.status)) {
      return c.json({ message: 'Only races that have not been published can be deleted' }, 400);
    }

    const refereeIds = raceRefereeIds(db, race);
    const entryIds = new Set(
      (db.raceEntries || []).filter((entry) => entry.raceId === raceId).map((entry) => entry.id)
    );

    db.races = db.races.filter((item) => item.id !== raceId);
    db.raceEntries = (db.raceEntries || []).filter((entry) => entry.raceId !== raceId);
    db.horseRaceRegistrations = (db.horseRaceRegistrations || []).filter(
      (registration) => registration.raceId !== raceId
    );
    db.jockeyRaceRegistrations = (db.jockeyRaceRegistrations || []).filter(
      (registration) => registration.raceId !== raceId
    );
    db.raceRefereeAssignments = (db.raceRefereeAssignments || []).filter(
      (assignment) => assignment.raceId !== raceId
    );
    db.refereeReports = (db.refereeReports || []).filter(
      (report) => report.raceId !== raceId && !entryIds.has(report.raceEntryId)
    );
    db.raceActionLogs = (db.raceActionLogs || []).filter((log) => log.raceId !== raceId);
    db.jockeyInvitations = (db.jockeyInvitations || []).filter(
      (invitation) => invitation.raceId !== raceId
    );

    refereeIds.forEach((refereeId) =>
      createNotification(
        db,
        refereeId,
        'Race deleted',
        `${race.name} was deleted by ${user.name}.`
      )
    );

    await writeDb(db);
    broadcastRaceUpdate(raceId);
    return c.json({ ok: true, raceId });
  });

  // Admin chuẩn bị race, publish race và duyệt kết quả cuối cùng.
  app.post('/races/:raceId/:action', async (c) => {
    const db = c.get('db');
    const raceId = c.req.param('raceId');
    const action = c.req.param('action');
    const validActions = [
      'close-registration',
      'publish',
      'start-race',
      'finish-race',
      'complete-results',
      'cancel-race',
      'reset-race',
    ];

    if (!validActions.includes(action)) return c.json({ message: 'Invalid action' }, 400);

    const race = db.races.find((item) => item.id === raceId);
    if (!race) return c.json({ message: 'Race not found' }, 404);

    const entries = (db.raceEntries || []).filter(
      (entry) => entry.raceId === race.id && entry.status === 'approved'
    );
    const approvedPairEntries = entries.filter(
      (entry) => entry.horseId && entry.jockeyUserId
    );
    const approvedHorseCount = new Set(
      approvedPairEntries.map((entry) => entry.horseId)
    ).size;
    const approvedJockeyCount = new Set(
      approvedPairEntries.map((entry) => entry.jockeyUserId)
    ).size;
    const approvedPairCount = Math.min(
      approvedPairEntries.length,
      approvedHorseCount,
      approvedJockeyCount
    );
    const fromStatus = race.status;
    const existingNotificationIds = new Set(
      (db.notifications || []).map((notification) => notification.id)
    );
    const existingActionLogIds = new Set(
      (db.raceActionLogs || []).map((log) => log.id)
    );
    const existingCreditTransactionIds = new Set(
      (db.creditTransactions || []).map((transaction) => transaction.id)
    );
    const assignedRefereeIds = raceRefereeIds(db, race);
    let affectedTournament = null;
    let affectedHorses = [];
    let settledBets = [];
    let affectedSpectators = [];

    if (action === 'reset-race') {
      if (race.status !== 'cancelled') {
        return c.json({ message: 'Only a cancelled race can be reset' }, 400);
      }

      const { date, time, registrationOpensAt, registrationClosesAt } = await c.req.json();
      if (!date || !time || !registrationOpensAt || !registrationClosesAt) {
        return c.json({ message: 'Race date, start time and registration window are required' }, 400);
      }

      const tournament = db.tournaments.find((item) => item.id === race.tournamentId);
      if (!tournament) {
        return c.json({ message: 'Race tournament not found' }, 400);
      }

      const regOpens = new Date(registrationOpensAt);
      const regCloses = new Date(registrationClosesAt);
      const raceStartsAt = new Date(`${date}T${time}`);
      const scheduleError = validateRaceSchedule({
        tournament,
        raceDate: date,
        raceStartsAt,
        registrationOpensAt: regOpens,
        registrationClosesAt: regCloses,
      });
      if (scheduleError) {
        return c.json({ message: scheduleError }, 400);
      }

      const allRaceEntries = (db.raceEntries || []).filter((entry) => entry.raceId === race.id);
      const entryIds = new Set(allRaceEntries.map((entry) => entry.id));
      const recipientIds = new Set();
      allRaceEntries.forEach((entry) => {
        const horse = db.horses.find((item) => item.id === entry.horseId);
        if (horse?.ownerUserId) recipientIds.add(horse.ownerUserId);
        if (entry.jockeyUserId) recipientIds.add(entry.jockeyUserId);
      });
      (db.horseRaceRegistrations || [])
        .filter((registration) => registration.raceId === race.id)
        .forEach((registration) => {
          if (registration.ownerUserId) recipientIds.add(registration.ownerUserId);
          if (registration.jockeyUserId) recipientIds.add(registration.jockeyUserId);
        });
      (db.jockeyRaceRegistrations || [])
        .filter((registration) => registration.raceId === race.id)
        .forEach((registration) => {
          if (registration.jockeyUserId) recipientIds.add(registration.jockeyUserId);
        });
      (db.jockeyInvitations || [])
        .filter((invitation) => invitation.raceId === race.id)
        .forEach((invitation) => {
          if (invitation.ownerUserId) recipientIds.add(invitation.ownerUserId);
          if (invitation.jockeyUserId) recipientIds.add(invitation.jockeyUserId);
        });
      assignedRefereeIds.forEach((refereeId) => recipientIds.add(refereeId));
      db.users
        .filter((item) => ['admin', 'spectator'].includes(item.role))
        .forEach((item) => recipientIds.add(item.id));

      race.date = date;
      race.raceDate = date;
      race.time = time;
      race.raceTime = time;
      race.registrationOpensAt = regOpens.toISOString();
      race.registrationClosesAt = regCloses.toISOString();
      race.status = 'registration-open';
      race.participants = 0;
      race.ownerConfirmed = 0;
      race.jockeyConfirmed = 0;
      race.resultStatus = 'draft';
      race.awardsPublished = false;
      race.replayTimeline = null;
      race.updatedAt = new Date().toISOString();

      db.raceEntries = (db.raceEntries || []).filter((entry) => entry.raceId !== race.id);
      db.horseRaceRegistrations = (db.horseRaceRegistrations || []).filter(
        (registration) => registration.raceId !== race.id
      );
      db.jockeyRaceRegistrations = (db.jockeyRaceRegistrations || []).filter(
        (registration) => registration.raceId !== race.id
      );
      db.jockeyInvitations = (db.jockeyInvitations || []).filter(
        (invitation) => invitation.raceId !== race.id
      );
      db.refereeReports = (db.refereeReports || []).filter(
        (report) => report.raceId !== race.id && !entryIds.has(report.raceEntryId)
      );

      recipientIds.forEach((userId) =>
        createNotification(
          db,
          userId,
          'Race reset',
          `${race.name} has been reset with a new registration window and start time.`
        )
      );

      recordRaceAction(db, {
        raceId: race.id,
        userId: c.get('user').id,
        action,
        fromStatus,
        toStatus: race.status,
        details: `Reset schedule to ${date} ${time} and cleared race registrations`,
      });

      await writeDb(db);
      broadcastRaceUpdate(race.id);
      return c.json({
        race,
        entries: [],
        notifications: db.notifications || [],
      });
    }

    if (action === 'close-registration') {
      if (race.status !== 'registration-open') {
        return c.json({ message: 'Only an open registration can be closed' }, 400);
      }
      const maxRaceEntries = raceFieldSize(db);
      if (entries.length > maxRaceEntries) {
        return c.json(
          { message: `A race can have at most ${maxRaceEntries} horses and ${maxRaceEntries} jockeys on the track.` },
          400
        );
      }
      if (
        approvedPairEntries.length !== maxRaceEntries ||
        approvedHorseCount !== maxRaceEntries ||
        approvedJockeyCount !== maxRaceEntries
      ) {
        return c.json(
          {
            message: `Registration can close only after Admin approves exactly ${maxRaceEntries} distinct horse-jockey pairs. Current: ${approvedPairCount}/${maxRaceEntries}.`,
          },
          400
        );
      }
      if (assignedRefereeIds.length === 0) {
        return c.json({ message: 'Assign at least one referee before closing registration' }, 400);
      }

      race.status = 'registration-closed';
      race.participants = approvedPairEntries.length;
      race.ownerConfirmed = approvedPairEntries.length;
      race.jockeyConfirmed = approvedPairEntries.length;
      race.updatedAt = new Date().toISOString();

      const sortedEntries = [...approvedPairEntries];
      for (let index = sortedEntries.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [sortedEntries[index], sortedEntries[swapIndex]] = [
          sortedEntries[swapIndex],
          sortedEntries[index],
        ];
      }

      const fieldRatings = sortedEntries.map((entry) => {
        const horse = db.horses.find((item) => item.id === entry.horseId);
        return officialHorseRating(horse);
      });
      const highestFieldRating = Math.max(...fieldRatings);

      sortedEntries.forEach((entry, index) => {
        const horse = db.horses.find((item) => item.id === entry.horseId);
        const prepared = computeRaceHandicap(horse, race, highestFieldRating);
        entry.lane = index + 1;
        entry.ratingSnapshot = prepared.rating;
        entry.handicap = prepared.handicap;
        entry.preRaceStatus = 'ready-for-referee';
      });

      assignedRefereeIds.forEach((refereeId) =>
        createNotification(db, refereeId, 'Race registration closed',
          `${race.name} is ready for referee review. Starting gates, rating snapshots and carried weights have been assigned.`)
      );
    }

    if (action === 'publish') {
      if (!['registration-closed', 'published'].includes(race.status)) {
        return c.json({ message: 'Close registration before publishing the race' }, 400);
      }
      if (
        approvedPairEntries.length !== raceFieldSize(db) ||
        approvedHorseCount !== raceFieldSize(db) ||
        approvedJockeyCount !== raceFieldSize(db)
      ) {
        const maxRaceEntries = raceFieldSize(db);
        return c.json(
          {
            message: `A race can be published only with exactly ${maxRaceEntries} distinct approved horse-jockey pairs. Current: ${approvedPairCount}/${maxRaceEntries}.`,
          },
          400
        );
      }
      if (assignedRefereeIds.length === 0) {
        return c.json({ message: 'Assign at least one referee before publishing the race' }, 400);
      }
      race.status = 'published';
      race.updatedAt = new Date().toISOString();
      entries.forEach((entry) => {
        const horse = db.horses.find((item) => item.id === entry.horseId);
        const ratingLabel =
          entry.ratingSnapshot === null ||
          entry.ratingSnapshot === undefined ||
          entry.ratingSnapshot === ''
            ? 'TBD'
            : entry.ratingSnapshot;
        const msg = `${race.name} has been published. Gate ${entry.lane}, rating ${ratingLabel}, assigned weight ${entry.handicap}lb.`;
        createNotification(db, horse?.ownerUserId, 'Race published', msg);
        createNotification(db, entry.jockeyUserId, 'Race published', msg);
      });
    }

    if (action === 'start-race') {
      if (race.status !== 'published') {
        return c.json({ message: 'Race must be published before it can start' }, 400);
      }

      const readyEntries = entries.filter(
        (entry) => entry.preRaceStatus === 'ready' && !entry.disqualified
      );
      const uncheckedEntries = entries.filter(
        (entry) => !['ready', 'absent'].includes(entry.preRaceStatus) && !entry.disqualified
      );

      if (readyEntries.length === 0) {
        return c.json({ message: 'At least one participant must be checked in as Ready before starting the race' }, 400);
      }
      if (uncheckedEntries.length > 0) {
        return c.json({ message: 'Every participant must be marked Ready or Absent before starting the race' }, 400);
      }
      const requiredReadyCount = minReadiedParticipants(db);
      if (readyEntries.length < requiredReadyCount) {
        const cancellation = cancelRace(
          db,
          race,
          entries,
          {
            refundReason: `${race.name} was cancelled due to insufficient participants`,
            notificationMessage: `${race.name} has been cancelled due to insufficient participants. Only ${readyEntries.length} participants were marked Ready, but at least ${requiredReadyCount} are required.`,
          }
        );
        settledBets = cancellation.settledBets;
        affectedSpectators = cancellation.affectedSpectators;
      } else {
        race.status = 'in-progress';
        race.updatedAt = new Date().toISOString();
        entries.forEach((entry) => {
          if (entry.preRaceStatus === 'absent') entry.disqualified = true;
        });

        const tournament = db.tournaments.find((item) => item.id === race.tournamentId);
        if (tournament && tournament.status !== 'completed') {
          tournament.status = 'active';
          tournament.updatedAt = race.updatedAt;
          affectedTournament = tournament;
        }

        race.replayTimeline = buildProvisionalRaceTimeline({
          race,
          entries,
          horses: db.horses,
        });

        raceRefereeIds(db, race).forEach((refereeId) =>
          createNotification(
            db,
            refereeId,
            'Race started',
            `${race.name} has been started by Admin.`
          )
        );
      }
    }
    if (action === 'cancel-race') {
      if (['in-progress', 'finished', 'completed'].includes(race.status)) {
        return c.json({ message: 'The race has started and cannot be cancelled.' }, 400);
      }

      const cancellation = cancelRace(
        db,
        race,
        entries,
        {
          refundReason: `${race.name} was cancelled`,
          notificationMessage: `${race.name} has been cancelled by the admin`,
        }
      );
      settledBets = cancellation.settledBets;
      affectedSpectators = cancellation.affectedSpectators;
    }
    if (action === 'finish-race') {
      if (race.status !== 'in-progress') {
        return c.json({ message: 'Only an in-progress race can be finished' }, 400);
      }

      race.status = 'finished';
      race.resultStatus = 'draft';
      race.awardsPublished = false;
      race.updatedAt = new Date().toISOString();
      entries.forEach((entry) => {
        entry.resultStatus = entry.preRaceStatus === 'absent' || entry.disqualified
          ? 'disqualified'
          : 'draft';
      });

      raceRefereeIds(db, race).forEach((refereeId) =>
        createNotification(
          db,
          refereeId,
          'Race finished',
          `${race.name} has been finished by Admin. Enter and submit the official timing draft.`
        )
      );
    }

    if (action === 'complete-results') {
      if (race.status !== 'finished' || race.resultStatus !== 'submitted') {
        return c.json({ message: 'Only submitted race results can be approved by Admin' }, 400);
      }

      const competingEntries = entries.filter(
        (entry) => entry.preRaceStatus !== 'absent' && !entry.disqualified
      );
      if (competingEntries.length === 0) {
        return c.json({ message: 'A race needs at least one competing participant before completion' }, 400);
      }

      const ratingResults = competingEntries.map((entry) => ({
        entry,
        result: computePostRaceRating(entry, competingEntries),
      }));
      const invalidRatingResult = ratingResults.find(
        ({ result }) =>
          result.previousRating === null ||
          (competingEntries.length >= 4 && !result.calcLog)
      );
      if (invalidRatingResult) {
        return c.json(
          {
            message: `Cannot complete results because entry ${invalidRatingResult.entry.id} has a missing or invalid rating snapshot.`,
          },
          400
        );
      }

      race.status = 'completed';
      race.resultStatus = 'official';
      race.awardsPublished = true;
      race.updatedAt = new Date().toISOString();
      entries.forEach((entry) => {
        entry.resultStatus = entry.preRaceStatus === 'absent' || entry.disqualified
          ? 'disqualified'
          : 'official';
      });
      ratingResults.forEach(({ entry, result }) => {
        const horse = db.horses.find((item) => item.id === entry.horseId);
        entry.ratingChange = result.ratingChange;
        entry.postRaceRating = result.postRaceRating;
        entry.ratingLog = result.calcLog;
        if (horse) {
          horse.overallRating = result.postRaceRating;
          horse.updatedAt = race.updatedAt;
        }
      });
      affectedHorses = ratingResults
        .map(({ entry }) => db.horses.find((item) => item.id === entry.horseId))
        .filter(Boolean);

      race.replayTimeline = buildOfficialReplayTimeline({
        race,
        entries: competingEntries,
        horses: db.horses,
      });

      const settlement = settleRaceBets(db, race.id, entries);
      settledBets = (db.bets || []).filter(
        (bet) => bet.raceId === race.id && bet.settledAt
      );
      affectedSpectators = settlement.affectedUsers || [];

      const recipientIds = new Set();
      entries.forEach((entry) => {
        const horse = db.horses.find((item) => item.id === entry.horseId);
        if (horse?.ownerUserId) recipientIds.add(horse.ownerUserId);
        if (entry.jockeyUserId) recipientIds.add(entry.jockeyUserId);
      });
      db.users
        .filter((item) => ['admin', 'spectator'].includes(item.role))
        .forEach((item) => recipientIds.add(item.id));
      recipientIds.forEach((userId) =>
        createNotification(
          db,
          userId,
          'Official results published',
          `${race.name} results were approved by Admin and are now official.`
        )
      );

      const tournament = db.tournaments.find((item) => item.id === race.tournamentId);
      if (tournament && tournamentHasEnded(tournament)) {
        tournament.status = 'completed';
        tournament.updatedAt = race.updatedAt;
        affectedTournament = tournament;
      }
    }

    recordRaceAction(db, {
      raceId: race.id,
      userId: c.get('user').id,
      action,
      fromStatus,
      toStatus: race.status,
      details: `${entries.length} approved participants`,
    });

    if (persistAdminRaceAction) {
      await persistAdminRaceAction({
        race,
        raceEntries: entries,
        horses: affectedHorses,
        tournament: affectedTournament,
        bets: settledBets,
        users: affectedSpectators,
        creditTransactions: (db.creditTransactions || []).filter(
          (transaction) => !existingCreditTransactionIds.has(transaction.id)
        ),
        notifications: (db.notifications || []).filter(
          (notification) => !existingNotificationIds.has(notification.id)
        ),
        actionLogs: (db.raceActionLogs || []).filter(
          (log) => !existingActionLogIds.has(log.id)
        ),
      });
    } else {
      await writeDb(db);
    }
    broadcastRaceUpdate(race.id);
    return c.json({
      race,
      entries: publicRaceEntries(db).filter((entry) => entry.raceId === race.id),
      notifications: db.notifications || [],
    });
  });

  // Phê duyệt hoặc từ chối một mục cụ thể (ngựa, tài khoản, đăng ký race của jockey/horse, pairing)
  app.post('/approvals/:entityType/:id', async (c) => {
    const db = c.get('db');
    const entityType = c.req.param('entityType');
    const id = c.req.param('id');
    const { decision } = await c.req.json();
    const raceIdsToBroadcast = new Set();

    if (!['approved', 'rejected'].includes(decision)) {
      return c.json({ message: 'Decision must be approved or rejected' }, 400);
    }

    if (entityType === 'horse') {
      const horse = db.horses.find((item) => item.id === id);
      if (!horse) return c.json({ message: 'Horse approval not found' }, 404);
      horse.status = decision;
      horse.updatedAt = new Date().toISOString();
      createNotification(db, horse.ownerUserId,
        decision === 'approved' ? 'Horse approved' : 'Horse rejected',
        `${horse.name} has been ${decision} by Admin.`);
    }

    if (entityType === 'account') {
      const account = db.users.find(
        (item) => item.id === id && ['owner', 'jockey', 'referee'].includes(item.role) && item.status === 'pending'
      );
      if (!account) return c.json({ message: 'Account approval request not found' }, 404);
      account.status = decision === 'approved' ? 'active' : 'rejected';
      account.updatedAt = new Date().toISOString();
      createNotification(db, account.id,
        decision === 'approved' ? 'Account approved' : 'Account rejected',
        decision === 'approved' ? 'Admin approved your account. You can now log in.' : 'Admin rejected your account request.');
    }

    if (entityType === 'jockeyRace') {
      const registration = (db.jockeyRaceRegistrations || []).find(
        (item) => item.id === id && item.status === 'pending'
      );
      if (!registration) return c.json({ message: 'Jockey race registration not found' }, 404);
      registration.status = decision;
      registration.reviewedAt = new Date().toISOString();
      const race = db.races.find((item) => item.id === registration.raceId);
      createNotification(db, registration.jockeyUserId,
        decision === 'approved' ? 'Race participation approved' : 'Race participation rejected',
        `${race?.name || 'Race'} participation has been ${decision}.`);
    }

    if (entityType === 'horseRace') {
      const registration = (db.horseRaceRegistrations || []).find(
        (item) =>
          item.id === id &&
          item.status === 'pending-admin' &&
          !item.invitationId &&
          !item.jockeyUserId
      );
      if (!registration) return c.json({ message: 'Horse race registration not found' }, 404);

      registration.status = decision === 'approved' ? 'approved' : 'rejected';
      registration.reviewedAt = new Date().toISOString();

      const horse = db.horses.find((item) => item.id === registration.horseId);
      const tournament = db.tournaments.find((item) => item.id === registration.tournamentId);
      const race = db.races.find((item) => item.id === registration.raceId);
      if (horse) {
        horse.jockeyConfirmation = decision === 'approved' ? 'waiting-owner' : 'rejected';
        horse.updatedAt = registration.reviewedAt;
      }

      createNotification(
        db,
        registration.ownerUserId,
        decision === 'approved' ? 'Horse race registration approved' : 'Horse race registration rejected',
        `${horse?.name || 'Horse'} for ${race?.name || tournament?.name || 'Race'} has been ${decision}.`
      );
    }

    if (entityType === 'pairing') {
      const invitation = (db.jockeyInvitations || []).find(
        (item) => item.id === id && item.status === 'accepted' && item.adminStatus === 'pending'
      );
      if (!invitation) return c.json({ message: 'Horse-Jockey pairing approval not found' }, 404);

      const horse = db.horses.find((item) => item.id === invitation.horseId);
      const registration = (db.horseRaceRegistrations || []).find((item) => item.invitationId === invitation.id);
      const targetLabel = raceName(db, invitation.raceId);

      if (decision === 'approved') {
        if (invitation.raceId) {
          const race = db.races.find((item) => item.id === invitation.raceId);
          if (!race) return c.json({ message: 'Race not found' }, 404);

          const alreadyEntered = (db.raceEntries || []).some(
            (entry) => entry.raceId === invitation.raceId && entry.horseId === invitation.horseId && nonRejectedEntry(entry)
          );
          if (!alreadyEntered) {
            const approvedCount = approvedRaceEntries(db, invitation.raceId).length;
            const maxRaceEntries = raceFieldSize(db);
            if (approvedCount >= maxRaceEntries) {
              return c.json(
                { message: `This race already has ${maxRaceEntries} approved horses. Reject or remove an entry before approving another one.` },
                400
              );
            }
            const error = validatePairForRace(db, race, registrationPair(registration, invitation));
            if (error) return c.json({ message: error }, 400);
          }
        }

        invitation.adminStatus = decision;
        if (registration) { registration.status = 'approved'; registration.reviewedAt = new Date().toISOString(); }
        if (horse) { horse.jockeyConfirmation = 'confirmed'; horse.updatedAt = new Date().toISOString(); }

        if (invitation.raceId) {
          db.raceEntries = db.raceEntries || [];
          const race = db.races.find((item) => item.id === invitation.raceId);

          const alreadyEntered = db.raceEntries.some(
            (entry) => entry.raceId === invitation.raceId && entry.horseId === invitation.horseId && nonRejectedEntry(entry)
          );
          if (!alreadyEntered) {
            addPairToRace(db, race, registrationPair(registration, invitation), new Date().toISOString());
          }
          if (race) { race.participants = approvedRaceEntries(db, race.id).length; raceIdsToBroadcast.add(race.id); }
        }

        createNotification(db, invitation.ownerUserId,
          'Pairing approved for race',
          `Admin approved ${horse?.name || 'your horse'} with ${jockeyName(db, invitation.jockeyUserId)} for ${targetLabel}.`);
        createNotification(db, invitation.jockeyUserId,
          'You are approved for the race',
          `Admin approved your assignment to ride ${horse?.name || 'the horse'} in ${targetLabel}.`);
      } else {
        invitation.adminStatus = decision;
        if (registration) {
          registration.status = 'approved';
          registration.jockeyUserId = null;
          registration.invitationId = null;
          registration.reviewedAt = new Date().toISOString();
        }
        if (horse) { horse.jockeyConfirmation = 'waiting-owner'; horse.updatedAt = new Date().toISOString(); }
        createNotification(db, invitation.ownerUserId,
          'Pairing rejected for race',
          `Admin rejected the ${horse?.name || 'horse'} + ${jockeyName(db, invitation.jockeyUserId)} assignment for ${targetLabel}.`);
        createNotification(db, invitation.jockeyUserId,
          'Race assignment rejected',
          `Admin rejected your assignment to ride ${horse?.name || 'the horse'} in ${targetLabel}.`);
      }
    }

    await writeDb(db);
    raceIdsToBroadcast.forEach((raceId) => broadcastRaceUpdate(raceId));
    return c.json({ ok: true, approvals: formatApprovals(db), notifications: db.notifications || [] });
  });

  return app;
};
