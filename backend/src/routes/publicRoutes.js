import { Hono } from 'hono';
import {
  PUBLIC_RACE_STATUSES,
  USER_ROLES,
  FRONTEND_URL,
} from '../config/constants.js';
import { authenticate, publicUser } from '../services/authService.js';
import {
  ownerName,
  publicJockeyProfiles,
  publicRaceEntries,
  raceRefereeIds,
} from '../services/domainService.js';
import { streamRaceUpdates } from '../services/liveRaceEvents.js';
import { systemSettingsFromDb } from '../services/systemSettingsService.js';

const publicRaceStatuses = new Set(PUBLIC_RACE_STATUSES);

// Kiểm tra xem một cuộc đua có trạng thái công khai hay không
const isPublicRace = (race) => publicRaceStatuses.has(race?.status);

// Lấy danh sách cuộc đua mà người dùng được phép xem
const visibleRaces = (db, user) => {
  if (user?.role === USER_ROLES.ADMIN) return db.races;
  if (user?.role === USER_ROLES.REFEREE) {
    return db.races.filter(
      (race) => isPublicRace(race) || raceRefereeIds(db, race).includes(user.id)
    );
  }
  if ([USER_ROLES.OWNER, USER_ROLES.JOCKEY].includes(user?.role)) {
    return db.races.filter(
      (race) => isPublicRace(race) || race.status === 'registration-open'
    );
  }
  return db.races.filter(isPublicRace);
};

// Lấy danh sách race entries mà người dùng được phép xem theo vai trò
const visibleRaceEntries = (db, user) => {
  const publicEntries = publicRaceEntries(db);
  if (user?.role === USER_ROLES.ADMIN) return publicEntries;
  return publicEntries.filter((entry) => {
    const race = db.races.find((item) => item.id === entry.raceId);
    const horse = db.horses.find((item) => item.id === entry.horseId);
    if (isPublicRace(race)) return true;
    if (user?.role === USER_ROLES.OWNER) return horse?.ownerUserId === user.id;
    if (user?.role === USER_ROLES.JOCKEY) return entry.jockeyUserId === user.id;
    if (user?.role === USER_ROLES.REFEREE) return raceRefereeIds(db, race).includes(user.id);
    return false;
  });
};

// Lấy danh sách ngựa mà người dùng được phép xem
const visibleHorses = (db, user, entries) => {
  // Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến with owner name.
  const withOwnerName = (horse) => ({
    ...horse,
    ownerName: ownerName(db, horse.ownerUserId),
  });

  if (user?.role === USER_ROLES.ADMIN) return db.horses.map(withOwnerName);
  const visibleHorseIds = new Set(entries.map((entry) => entry.horseId));
  return db.horses.filter(
    (horse) =>
      visibleHorseIds.has(horse.id) ||
      (user?.role === USER_ROLES.OWNER && horse.ownerUserId === user.id)
  ).map(withOwnerName);
};

// Lấy danh sách user được phép xem theo vai trò
const visibleUsers = (db, user) => {
  if (user?.role === USER_ROLES.ADMIN) return db.users.map(publicUser);
  if (user) return [publicUser(user)];
  return [];
};

// Lấy danh sách đăng ký jockey mà người dùng được xem
const visibleJockeyRegistrations = (db, user) => {
  if (user?.role === USER_ROLES.ADMIN) return db.jockeyRaceRegistrations || [];
  if (user?.role === USER_ROLES.OWNER)
    return (db.jockeyRaceRegistrations || []).filter((r) => r.status === 'approved');
  if (user?.role === USER_ROLES.JOCKEY)
    return (db.jockeyRaceRegistrations || []).filter((r) => r.jockeyUserId === user.id);
  return [];
};

// Lấy danh sách lời mời jockey mà người dùng được xem
const visibleJockeyInvitations = (db, user) => {
  if (user?.role === USER_ROLES.ADMIN) return db.jockeyInvitations || [];
  if (user?.role === USER_ROLES.OWNER)
    return (db.jockeyInvitations || []).filter((i) => i.ownerUserId === user.id);
  if (user?.role === USER_ROLES.JOCKEY)
    return (db.jockeyInvitations || []).filter((i) => i.jockeyUserId === user.id);
  return [];
};

// Lấy danh sách đăng ký ngựa theo từng race mà người dùng được phép xem
const visibleHorseRaceRegistrations = (db, user) => {
  if (user?.role === USER_ROLES.ADMIN) return db.horseRaceRegistrations || [];
  if (user?.role === USER_ROLES.OWNER)
    return (db.horseRaceRegistrations || []).filter((r) => r.ownerUserId === user.id);
  if (user?.role === USER_ROLES.JOCKEY)
    return (db.horseRaceRegistrations || []).filter((r) => r.jockeyUserId === user.id);
  return [];
};

// Ghi chú: Hàm này tạo nhóm route public routes cho backend.
export const createPublicRoutes = (getDb) => {
  const app = new Hono();

  // Redirect trang gốc về frontend
  app.get('/', (c) => {
    return c.redirect(FRONTEND_URL, 302);
  });

  // Health check endpoint
  app.get('/health', (c) => c.json({ ok: true }));

  // SSE stream theo dõi đua trực tiếp
  app.get('/live/races/:raceId/events', (c) => {
    const raceId = c.req.param('raceId');
    return streamRaceUpdates(c.req.raw, raceId);
  });

  // Tải toàn bộ dữ liệu khởi động cho frontend
  app.get('/bootstrap', async (c) => {
    const db = await getDb();
    const user = await authenticate(c.req.raw, db);
    const raceEntries = visibleRaceEntries(db, user);
    const settings = systemSettingsFromDb(db);

    return c.json({
      tournaments: db.tournaments,
      horses: visibleHorses(db, user, raceEntries),
      races: visibleRaces(db, user),
      jockeyProfiles: publicJockeyProfiles(db, {
        includeEmail: user?.role === USER_ROLES.ADMIN,
      }),
      jockeyRaceRegistrations: visibleJockeyRegistrations(db, user),
      jockeyInvitations: visibleJockeyInvitations(db, user),
      horseRaceRegistrations: visibleHorseRaceRegistrations(db, user),
      raceEntries,
      users: visibleUsers(db, user),
      notifications: user
        ? (db.notifications || []).filter((n) => n.userId === user.id)
        : [],
      limits: {
        maxOwnerHorses: settings.maxOwnerHorses,
        maxRaceFieldSize: settings.maxHorsesPerRace,
        minReadiedParticipants: settings.minReadiedParticipants,
        maxRacesPerTournament: settings.maxRacesPerTournament,
        defaultDistanceMeters: settings.defaultDistanceMeters,
        closeRegistrationHours: settings.closeRegistrationHours,
      },
      systemSettings: settings,
    });
  });

  return app;
};
