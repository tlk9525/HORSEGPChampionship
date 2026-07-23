import {
  BETTING_CLOSE_BEFORE_RACE_MS,
  PUBLIC_RACE_STATUSES,
  RACE_TIMEZONE_OFFSET,
  USER_ROLES,
} from '../config/constants.js';
import { publicUser } from './authService.js';
import {
  ownerName,
  publicJockeyProfiles,
  publicRaceEntries,
  raceRefereeIds,
} from './domainService.js';
import { systemSettingsFromDb } from './systemSettingsService.js';

const bootstrapScopes = {
  tournaments: [
    'tournaments',
    'races',
    'raceEntries',
    'horses',
    'jockeyProfiles',
    'jockeyRaceRegistrations',
    'raceRefereeAssignments',
  ],
  race: [
    'tournaments',
    'races',
    'raceEntries',
    'horses',
    'jockeyProfiles',
    'raceRefereeAssignments',
  ],
  horses: [
    'horses',
    'races',
    'raceEntries',
    'jockeyProfiles',
    'raceRefereeAssignments',
  ],
  jockeys: [
    'jockeyProfiles',
    'raceEntries',
    'horses',
    'races',
    'raceRefereeAssignments',
  ],
  live: [
    'races',
    'raceEntries',
    'horses',
    'jockeyProfiles',
    'raceRefereeAssignments',
  ],
  results: [
    'tournaments',
    'races',
    'raceEntries',
    'horses',
    'jockeyProfiles',
    'raceRefereeAssignments',
  ],
  betting: [
    'tournaments',
    'races',
    'raceEntries',
    'horses',
    'jockeyProfiles',
    'raceRefereeAssignments',
  ],
  admin: [
    'tournaments',
    'races',
    'raceEntries',
    'horses',
    'jockeyProfiles',
    'jockeyRaceRegistrations',
    'jockeyInvitations',
    'horseRaceRegistrations',
    'raceRefereeAssignments',
    'notifications',
    'wallets',
  ],
};

const authenticationTables = ['users', 'sessions', 'systemSettings'];
const publicRaceStatuses = new Set(PUBLIC_RACE_STATUSES);
const replayTimelineScopes = new Set(['full', 'race', 'live']);

// Xác định tập bảng tối thiểu cần đọc cho từng bootstrap scope.
export const bootstrapTablesForScope = (scope) => {
  const scopeTables = bootstrapScopes[scope];
  if (!scopeTables) return null;
  return [...new Set([...authenticationTables, ...scopeTables])];
};

// Kiểm tra trạng thái race có được phép xuất hiện trong dữ liệu công khai hay không.
const isPublicRace = (race) => publicRaceStatuses.has(race?.status);

// Lọc danh sách race mà user hiện tại được phép nhìn thấy theo role.
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

// Lọc race entry theo quyền của admin, owner, jockey, referee hoặc khách công khai.
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

// Lọc horse theo các entry được phép xem và bổ sung tên owner cho từng horse.
const visibleHorses = (db, user, entries) => {
  // Gắn tên owner vào horse trước khi đưa vào bootstrap payload.
  const withOwnerName = (horse) => ({
    ...horse,
    ownerName: ownerName(db, horse.ownerUserId),
  });

  if (user?.role === USER_ROLES.ADMIN) return db.horses.map(withOwnerName);
  const visibleHorseIds = new Set(entries.map((entry) => entry.horseId));
  return db.horses
    .filter(
      (horse) =>
        visibleHorseIds.has(horse.id) ||
        (user?.role === USER_ROLES.OWNER && horse.ownerUserId === user.id)
    )
    .map(withOwnerName);
};

// Chỉ trả user hiện tại, hoặc toàn bộ user công khai khi người gọi là admin.
const visibleUsers = (db, user) => {
  if (user?.role === USER_ROLES.ADMIN) return db.users.map(publicUser);
  if (user) return [publicUser(user)];
  return [];
};

// Lọc đăng ký jockey theo phạm vi dữ liệu mà role hiện tại được phép xem.
const visibleJockeyRegistrations = (db, user) => {
  if (user?.role === USER_ROLES.ADMIN) return db.jockeyRaceRegistrations || [];
  if (user?.role === USER_ROLES.OWNER) {
    return (db.jockeyRaceRegistrations || []).filter((item) => item.status === 'approved');
  }
  if (user?.role === USER_ROLES.JOCKEY) {
    return (db.jockeyRaceRegistrations || []).filter(
      (item) => item.jockeyUserId === user.id
    );
  }
  return [];
};

// Lọc lời mời jockey theo owner, jockey hoặc quyền admin hiện tại.
const visibleJockeyInvitations = (db, user) => {
  if (user?.role === USER_ROLES.ADMIN) return db.jockeyInvitations || [];
  if (user?.role === USER_ROLES.OWNER) {
    return (db.jockeyInvitations || []).filter((item) => item.ownerUserId === user.id);
  }
  if (user?.role === USER_ROLES.JOCKEY) {
    return (db.jockeyInvitations || []).filter((item) => item.jockeyUserId === user.id);
  }
  return [];
};

// Lọc đăng ký horse vào race theo owner, jockey hoặc quyền admin hiện tại.
const visibleHorseRaceRegistrations = (db, user) => {
  if (user?.role === USER_ROLES.ADMIN) return db.horseRaceRegistrations || [];
  if (user?.role === USER_ROLES.OWNER) {
    return (db.horseRaceRegistrations || []).filter((item) => item.ownerUserId === user.id);
  }
  if (user?.role === USER_ROLES.JOCKEY) {
    return (db.horseRaceRegistrations || []).filter((item) => item.jockeyUserId === user.id);
  }
  return [];
};

// Chỉ gửi timeline nặng cho màn hình phát lại/trực tiếp; các scope khác giữ nguyên race contract.
const racesForScope = (races, scope) => {
  if (replayTimelineScopes.has(scope)) return races;

  return races.map(({ replayTimeline: _replayTimeline, ...race }) => race);
};

// Dựng bootstrap payload đã lọc quyền cùng các giới hạn cấu hình cho frontend.
export const buildBootstrapPayload = (db, user, scope = 'full') => {
  const raceEntries = visibleRaceEntries(db, user);
  const settings = systemSettingsFromDb(db);
  const races = visibleRaces(db, user);

  return {
    tournaments: db.tournaments,
    horses: visibleHorses(db, user, raceEntries),
    races: racesForScope(races, scope),
    jockeyProfiles: publicJockeyProfiles(db, {
      includeEmail: user?.role === USER_ROLES.ADMIN,
    }),
    jockeyRaceRegistrations: visibleJockeyRegistrations(db, user),
    jockeyInvitations: visibleJockeyInvitations(db, user),
    horseRaceRegistrations: visibleHorseRaceRegistrations(db, user),
    raceEntries,
    users: visibleUsers(db, user),
    notifications: user
      ? (db.notifications || []).filter((notification) => notification.userId === user.id)
      : [],
    limits: {
      maxOwnerHorses: settings.maxOwnerHorses,
      maxRaceFieldSize: settings.maxHorsesPerRace,
      minReadiedParticipants: settings.minReadiedParticipants,
      maxRacesPerTournament: settings.maxRacesPerTournament,
      defaultDistanceMeters: settings.defaultDistanceMeters,
      closeRegistrationHours: settings.closeRegistrationHours,
      bettingCloseBeforeRaceMs: BETTING_CLOSE_BEFORE_RACE_MS,
      raceTimezoneOffset: RACE_TIMEZONE_OFFSET,
    },
    systemSettings: settings,
  };
};
