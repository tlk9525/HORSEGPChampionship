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

export const bootstrapTablesForScope = (scope) => {
  const scopeTables = bootstrapScopes[scope];
  if (!scopeTables) return null;
  return [...new Set([...authenticationTables, ...scopeTables])];
};

const isPublicRace = (race) => publicRaceStatuses.has(race?.status);

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

const visibleHorses = (db, user, entries) => {
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

const visibleUsers = (db, user) => {
  if (user?.role === USER_ROLES.ADMIN) return db.users.map(publicUser);
  if (user) return [publicUser(user)];
  return [];
};

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

export const buildBootstrapPayload = (db, user) => {
  const raceEntries = visibleRaceEntries(db, user);
  const settings = systemSettingsFromDb(db);

  return {
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
