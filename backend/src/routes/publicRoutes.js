import {
  MAX_OWNER_HORSES,
  MAX_RACE_FIELD_SIZE,
  PUBLIC_RACE_STATUSES,
  USER_ROLES,
} from '../config/constants.js';
import { FRONTEND_URL } from '../config/constants.js';
import {
  authenticate,
  publicUser,
} from '../services/authService.js';
import {
  publicJockeyProfiles,
  publicRaceEntries,
  raceRefereeIds,
} from '../services/domainService.js';
import { streamRaceUpdates } from '../services/liveRaceEvents.js';

const publicRaceStatuses = new Set(PUBLIC_RACE_STATUSES);

const isPublicRace = (race) => publicRaceStatuses.has(race?.status);

const visibleRaces = (db, user) => {
  if (user?.role === USER_ROLES.ADMIN) return db.races;

  if (user?.role === USER_ROLES.REFEREE) {
    return db.races.filter(
      (race) => isPublicRace(race) || raceRefereeIds(db, race).includes(user.id)
    );
  }

  return db.races;
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
  if (user?.role === USER_ROLES.ADMIN) return db.horses;

  const visibleHorseIds = new Set(entries.map((entry) => entry.horseId));

  return db.horses.filter(
    (horse) =>
      visibleHorseIds.has(horse.id) ||
      (user?.role === USER_ROLES.OWNER && horse.ownerUserId === user.id)
  );
};

const visibleUsers = (db, user) => {
  if (user?.role === USER_ROLES.ADMIN) return db.users.map(publicUser);
  if (user) return [publicUser(user)];

  return [];
};

const visibleJockeyRegistrations = (db, user) => {
  if (user?.role === USER_ROLES.ADMIN) return db.jockeyTournamentRegistrations || [];

  if (user?.role === USER_ROLES.OWNER) {
    return (db.jockeyTournamentRegistrations || []).filter(
      (registration) => registration.status === 'approved'
    );
  }

  if (user?.role === USER_ROLES.JOCKEY) {
    return (db.jockeyTournamentRegistrations || []).filter(
      (registration) => registration.jockeyUserId === user.id
    );
  }

  return [];
};

const visibleJockeyInvitations = (db, user) => {
  if (user?.role === USER_ROLES.ADMIN) return db.jockeyInvitations || [];

  if (user?.role === USER_ROLES.OWNER) {
    return (db.jockeyInvitations || []).filter(
      (invitation) => invitation.ownerUserId === user.id
    );
  }

  if (user?.role === USER_ROLES.JOCKEY) {
    return (db.jockeyInvitations || []).filter(
      (invitation) => invitation.jockeyUserId === user.id
    );
  }

  return [];
};

const visibleHorseTournamentRegistrations = (db, user) => {
  if (user?.role === USER_ROLES.ADMIN) return db.horseTournamentRegistrations || [];

  if (user?.role === USER_ROLES.OWNER) {
    return (db.horseTournamentRegistrations || []).filter(
      (registration) => registration.ownerUserId === user.id
    );
  }

  if (user?.role === USER_ROLES.JOCKEY) {
    return (db.horseTournamentRegistrations || []).filter(
      (registration) => registration.jockeyUserId === user.id
    );
  }

  return [];
};

export const handlePublicRoutes = async ({ req, res, url, db, send }) => {
  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(302, {
      Location: FRONTEND_URL,
      'Access-Control-Allow-Origin': '*',
    });
    res.end();
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    send(res, 200, { ok: true });
    return true;
  }

  const liveRaceEventsMatch = url.pathname.match(
    /^\/api\/live\/races\/([^/]+)\/events$/
  );

  if (req.method === 'GET' && liveRaceEventsMatch) {
    streamRaceUpdates(req, res, liveRaceEventsMatch[1]);
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/bootstrap') {
    const user = await authenticate(req, db);
    const raceEntries = visibleRaceEntries(db, user);

    send(res, 200, {
      tournaments: db.tournaments,
      horses: visibleHorses(db, user, raceEntries),
      races: visibleRaces(db, user),
      jockeyProfiles: publicJockeyProfiles(db),
      jockeyTournamentRegistrations: visibleJockeyRegistrations(db, user),
      jockeyInvitations: visibleJockeyInvitations(db, user),
      horseTournamentRegistrations: visibleHorseTournamentRegistrations(db, user),
      raceEntries,
      users: visibleUsers(db, user),
      notifications: user
        ? (db.notifications || []).filter(
            (notification) => notification.userId === user.id
          )
        : [],
      limits: {
        maxOwnerHorses: MAX_OWNER_HORSES,
        maxRaceFieldSize: MAX_RACE_FIELD_SIZE,
      },
    });
    return true;
  }

  return false;
};
