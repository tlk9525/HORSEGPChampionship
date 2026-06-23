import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import {
  MAX_OWNER_HORSES,
  TOURNAMENT_REGISTRATION_STATUSES,
} from '../config/constants.js';
import { requireRole } from '../services/authService.js';
import {
  activeHorseTournamentRegistrations,
  activeRace,
  activeTournament,
  defaultRaceForTournament,
  jockeyName,
  isRaceRegistrationOpen,
  publicRaceEntries,
  publicTournamentJockeyProfiles,
  tournamentRaces,
} from '../services/domainService.js';
import {
  createNotification,
  notifyAdmins,
} from '../services/notificationService.js';
import {
  horseOverallRating,
  numeric,
} from '../services/handicapService.js';

const validRatingComponents = (values) =>
  values.every((value) => {
    if (value === undefined || value === null || value === '') return true;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100;
  });

export const createOwnerRoutes = (getDb, writeDb) => {
  const app = new Hono();

  // Middleware xác thực — chỉ cho phép owner truy cập
  app.use('*', async (c, next) => {
    const db = await getDb();
    const user = await requireRole(c.req.raw, db, ['owner']);
    if (!user) return c.json({ message: 'Owner access required' }, 403);
    c.set('user', user);
    c.set('db', db);
    await next();
  });

  // Lấy dữ liệu portal của owner: danh sách ngựa, race entries, jockeys, lời mời
  app.get('/portal', (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const activeTournamentIds = new Set(
      db.tournaments
        .filter((tournament) => tournament.status !== 'completed')
        .map((tournament) => tournament.id)
    );
    const activeRaceIds = new Set(
      db.races.filter(activeRace).map((race) => race.id)
    );
    const ownerHorseIds = new Set(
      db.horses.filter((horse) => horse.ownerUserId === user.id).map((horse) => horse.id)
    );
    const registeredActivePairings = (db.horseTournamentRegistrations || []).filter(
      (registration) =>
        registration.ownerUserId === user.id &&
        registration.status === 'approved' &&
        activeTournamentIds.has(registration.tournamentId)
    );
    const activePairingMap = new Map(
      registeredActivePairings.map((pairing) => [
        `${pairing.horseId}:${pairing.jockeyUserId}:${pairing.tournamentId}`,
        pairing,
      ])
    );
    publicRaceEntries(db)
      .filter((entry) => ownerHorseIds.has(entry.horseId) && activeRaceIds.has(entry.raceId))
      .forEach((entry) => {
        const race = db.races.find((item) => item.id === entry.raceId);
        const key = `${entry.horseId}:${entry.jockeyUserId}:${race?.tournamentId || ''}`;
        if (!activePairingMap.has(key)) {
          activePairingMap.set(key, {
            id: `race-entry:${entry.id}`,
            tournamentId: race?.tournamentId || '',
            horseId: entry.horseId,
            ownerUserId: user.id,
            jockeyUserId: entry.jockeyUserId,
            status: 'approved',
            createdAt: entry.createdAt || race?.createdAt || new Date().toISOString(),
          });
        }
      });
    const activePairings = Array.from(activePairingMap.values());

    return c.json({
      horses: db.horses.filter((horse) => horse.ownerUserId === user.id),
      raceEntries: publicRaceEntries(db).filter(
        (entry) => ownerHorseIds.has(entry.horseId) && activeRaceIds.has(entry.raceId)
      ),
      activePairings: activePairings.map((pairing) => ({
        ...pairing,
        horseName: db.horses.find((horse) => horse.id === pairing.horseId)?.name || 'Horse',
        jockeyName: jockeyName(db, pairing.jockeyUserId),
        tournamentName: db.tournaments.find((item) => item.id === pairing.tournamentId)?.name || 'Tournament',
      })),
      jockeyProfiles: [],
      invitations: (db.jockeyInvitations || []).filter((invitation) =>
        invitation.ownerUserId === user.id &&
        (invitation.tournamentId
          ? activeTournamentIds.has(invitation.tournamentId)
          : activeRaceIds.has(invitation.raceId))
      ),
      limits: { maxOwnerHorses: MAX_OWNER_HORSES },
    });
  });

  // Lấy dữ liệu trang đăng ký race cho owner
  app.get('/race-registration', (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const tournamentId = c.req.query('tournamentId') || '';
    const tournament = db.tournaments.find((item) => item.id === tournamentId);

    if (!tournament) return c.json({ message: 'Tournament not found' }, 404);

    const activeRegistrations = activeHorseTournamentRegistrations(db, tournament.id);
    const registeredHorseIds = new Set(activeRegistrations.map((r) => r.horseId));
    const registeredJockeyIds = new Set(activeRegistrations.map((r) => r.jockeyUserId));

    return c.json({
      tournament,
      horses: db.horses.filter(
        (horse) =>
          horse.ownerUserId === user.id &&
          horse.status === 'approved' &&
          !registeredHorseIds.has(horse.id)
      ),
      races: tournamentRaces(db, tournament.id),
      jockeyProfiles: publicTournamentJockeyProfiles(db, tournament.id).filter(
        (profile) => !registeredJockeyIds.has(profile.userId)
      ),
      horseTournamentRegistrations: activeRegistrations.filter(
        (r) => r.ownerUserId === user.id
      ),
      raceEntries: publicRaceEntries(db).filter((entry) => {
        const horse = db.horses.find((item) => item.id === entry.horseId);
        return horse?.ownerUserId === user.id;
      }),
    });
  });

  // Tạo hồ sơ ngựa mới (owner)
  app.post('/horses', async (c) => {
    const user = c.get('user');
    const db = c.get('db');

    if (!activeTournament(db)) {
      return c.json(
        { message: 'Admin must create and open a tournament before owners can register horses.' },
        400
      );
    }

    const ownerHorses = db.horses.filter((horse) => horse.ownerUserId === user.id);
    if (ownerHorses.length >= MAX_OWNER_HORSES) {
      return c.json({ message: `Each owner can register up to ${MAX_OWNER_HORSES} horses.` }, 400);
    }

    const {
      name, breed, species, age, sex, color, weightKg, heightCm,
      speedRating, staminaRating, formRating, healthRating,
      healthStatus, profileNotes, veterinaryCertificateUrl,
    } = await c.req.json();

    if (!name || !breed || !age || Number(age) <= 0) {
      return c.json({ message: 'Horse name, breed and age are required' }, 400);
    }
    if (!validRatingComponents([speedRating, staminaRating, formRating, healthRating])) {
      return c.json({ message: 'All rating components must be between 0 and 100' }, 400);
    }

    const createdAt = new Date().toISOString();
    const horse = {
      id: randomUUID(), name, breed,
      species: species || '', age: Number(age), sex: sex || '',
      color: color || '', weightKg: Number(weightKg) || 0, heightCm: Number(heightCm) || 0,
      baseHandicap: 0,
      speedRating: numeric(speedRating, 75), staminaRating: numeric(staminaRating, 75),
      formRating: numeric(formRating, 75), healthRating: numeric(healthRating, 80),
      overallRating: horseOverallRating({ speedRating, staminaRating, formRating, healthRating }),
      healthStatus: healthStatus || '', profileNotes: profileNotes || '',
      ownerUserId: user.id, status: 'pending', jockeyConfirmation: 'waiting-owner',
      veterinaryCertificateUrl: veterinaryCertificateUrl || '',
      createdAt, updatedAt: createdAt,
    };

    db.horses.unshift(horse);
    notifyAdmins(db, 'New horse registration', `${user.name} submitted ${horse.name} for admin approval.`);
    createNotification(db, user.id, 'Horse registration submitted', `${horse.name} is waiting for admin approval.`);

    await writeDb(db);
    return c.json({ horse, horseCount: ownerHorses.length + 1, maxHorses: MAX_OWNER_HORSES }, 201);
  });

  // Cập nhật thông tin ngựa đã tồn tại (owner hoặc admin)
  app.post('/horses/:id', async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const horseId = c.req.param('id');
    const horse = db.horses.find((item) => item.id === horseId);

    if (!horse || horse.ownerUserId !== user.id) {
      return c.json({ message: 'Horse not found' }, 404);
    }

    const {
      name, breed, species, age, sex, color, weightKg, heightCm,
      speedRating, staminaRating, formRating, healthRating,
      healthStatus, profileNotes, veterinaryCertificateUrl,
    } = await c.req.json();

    if (!name || !breed || !age || Number(age) <= 0) {
      return c.json({ message: 'Horse name, breed and age are required' }, 400);
    }
    if (!validRatingComponents([speedRating, staminaRating, formRating, healthRating])) {
      return c.json({ message: 'All rating components must be between 0 and 100' }, 400);
    }

    horse.name = name; horse.breed = breed; horse.species = species || '';
    horse.age = Number(age); horse.sex = sex || ''; horse.color = color || '';
    horse.weightKg = Number(weightKg) || 0; horse.heightCm = Number(heightCm) || 0;
    horse.speedRating = numeric(speedRating, 75); horse.staminaRating = numeric(staminaRating, 75);
    horse.formRating = numeric(formRating, 75); horse.healthRating = numeric(healthRating, 80);
    if (!numeric(horse.overallRating, 0)) {
      horse.overallRating = horseOverallRating({ speedRating, staminaRating, formRating, healthRating });
    }
    horse.healthStatus = healthStatus || ''; horse.profileNotes = profileNotes || '';
    horse.veterinaryCertificateUrl = veterinaryCertificateUrl || '';
    horse.updatedAt = new Date().toISOString();

    createNotification(db, horse.ownerUserId, 'Horse profile updated', `${horse.name} profile information has been updated.`);

    await writeDb(db);
    return c.json({ horse });
  });

  // Gửi lời mời jockey để cưỡi ngựa trong một cuộc đua cụ thể
  app.post('/jockey-requests', async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const { horseId, jockeyUserId, raceId } = await c.req.json();

    const horse = db.horses.find((item) => item.id === horseId && item.ownerUserId === user.id);
    const jockey = db.users.find(
      (item) => item.id === jockeyUserId && item.role === 'jockey' && item.status === 'active'
    );

    if (!horse || horse.status !== 'approved') {
      return c.json({ message: 'Horse must exist and be approved' }, 400);
    }
    if (!jockey) return c.json({ message: 'Jockey must exist and be active' }, 400);

    db.jockeyInvitations = db.jockeyInvitations || [];
    const tournament = activeTournament(db);
    const race =
      db.races.find((item) => item.id === raceId && item.status === 'registration-open') ||
      (tournament ? defaultRaceForTournament(db, tournament.id) : null);

    if (!race) return c.json({ message: 'Race registration is not open' }, 400);
    if (!isRaceRegistrationOpen(race)) {
      return c.json({ message: 'This race is outside its registration window' }, 400);
    }

    const duplicateEntry = (db.jockeyInvitations || []).some(
      (item) => item.raceId === race.id && item.horseId === horseId && item.status !== 'cancelled'
    );
    if (duplicateEntry) return c.json({ message: 'This horse is already registered for this race' }, 409);

    const invitation = {
      id: randomUUID(), horseId, ownerUserId: user.id, jockeyUserId,
      tournamentId: tournament?.id || null, raceId: race.id,
      status: 'pending', adminStatus: null, createdAt: new Date().toISOString(),
    };
    db.jockeyInvitations.unshift(invitation);
    horse.jockeyConfirmation = 'pending';
    horse.updatedAt = new Date().toISOString();

    createNotification(db, jockeyUserId, 'New race participation request',
      `${user.name} registered ${horse.name} for ${race.name} and selected you as jockey.`);

    await writeDb(db);
    return c.json({ invitation }, 201);
  });

  // Owner đăng ký ngựa vào cuộc đua
  app.post('/race-entries', async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const { tournamentId, horseId, jockeyUserId, notes } = await c.req.json();

    const tournament = db.tournaments.find(
      (item) => item.id === tournamentId && TOURNAMENT_REGISTRATION_STATUSES.includes(item.status)
    );
    const horse = db.horses.find(
      (item) => item.id === horseId && item.ownerUserId === user.id && item.status === 'approved'
    );
    const jockeyApproved = (db.jockeyTournamentRegistrations || []).some(
      (r) => r.tournamentId === tournamentId && r.jockeyUserId === jockeyUserId && r.status === 'approved'
    );

    if (!horse) return c.json({ message: 'Owner can only register approved horses they own' }, 400);
    if (!tournament) return c.json({ message: 'Tournament registration is not open' }, 400);
    const tournamentRaceList = tournamentRaces(db, tournamentId);
    if (
      tournamentRaceList.length > 0 &&
      !tournamentRaceList.some((race) => isRaceRegistrationOpen(race))
    ) {
      return c.json({ message: 'No race is currently inside its registration window' }, 400);
    }
    if (!jockeyApproved) return c.json({ message: 'Jockey must be approved for the same tournament' }, 400);

    db.raceEntries = db.raceEntries || [];
    db.jockeyInvitations = db.jockeyInvitations || [];
    db.horseTournamentRegistrations = db.horseTournamentRegistrations || [];

    const activeRegistrations = activeHorseTournamentRegistrations(db, tournamentId);
    const duplicateRegistration = activeRegistrations.some((r) => r.horseId === horse.id);
    const duplicateInvitation = db.jockeyInvitations.some(
      (inv) =>
        inv.tournamentId === tournamentId && inv.horseId === horse.id &&
        !['rejected', 'cancelled'].includes(inv.status) && inv.adminStatus !== 'rejected'
    );

    if (duplicateRegistration || duplicateInvitation) {
      return c.json(
        { message: 'This horse already has a pending or approved registration for this tournament' },
        409
      );
    }

    const jockeyAlreadyRegistered = activeRegistrations.some((r) => r.jockeyUserId === jockeyUserId);
    const jockeyAlreadyInvited = db.jockeyInvitations.some(
      (inv) =>
        inv.tournamentId === tournamentId && inv.jockeyUserId === jockeyUserId &&
        !['rejected', 'cancelled'].includes(inv.status) && inv.adminStatus !== 'rejected'
    );

    if (jockeyAlreadyRegistered || jockeyAlreadyInvited) {
      return c.json(
        { message: 'This jockey already has a pending or approved assignment in the same tournament' },
        409
      );
    }

    const createdAt = new Date().toISOString();
    const invitation = {
      id: randomUUID(), horseId: horse.id, ownerUserId: user.id, jockeyUserId,
      tournamentId, raceId: null, status: 'pending', adminStatus: null,
      notes: notes || '', createdAt, respondedAt: null,
    };

    db.jockeyInvitations.unshift(invitation);
    db.horseTournamentRegistrations.unshift({
      id: randomUUID(), tournamentId, horseId: horse.id,
      ownerUserId: user.id, jockeyUserId, invitationId: invitation.id,
      status: 'pending-jockey', notes: notes || '', createdAt, reviewedAt: null,
    });

    horse.jockeyConfirmation = 'pending-jockey';
    horse.updatedAt = new Date().toISOString();

    createNotification(db, jockeyUserId, 'Tournament riding request',
      `${user.name} invited you to ride ${horse.name} for ${tournament.name}. This pair will run every race in the tournament after Admin approval.`);
    createNotification(db, user.id, 'Jockey request sent',
      `${horse.name} is waiting for ${jockeyName(db, jockeyUserId)} to accept ${tournament.name}. Admin approval starts after the jockey accepts.`);

    await writeDb(db);
    return c.json({ invitation }, 201);
  });

  return app;
};
