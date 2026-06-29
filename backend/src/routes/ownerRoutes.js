import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import {
  ACTIVE_TOURNAMENT_STATUSES,
  MAX_OWNER_HORSES,
  RACE_CLASSES,
} from '../config/constants.js';
import { requireRole } from '../services/authService.js';
import {
  activeHorseRaceRegistrations,
  activeRace,
  activeTournament,
  isRaceRegistrationOpen,
  jockeyName,
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
  officialHorseRating,
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
    const registeredActivePairings = (db.horseRaceRegistrations || []).filter(
      (registration) =>
        registration.ownerUserId === user.id &&
        registration.status === 'approved' &&
        registration.jockeyUserId &&
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
    const raceId = c.req.query('raceId') || '';
    const race = db.races.find((item) => item.id === raceId);
    if (!race) return c.json({ message: 'Race not found' }, 404);

    const tournament = db.tournaments.find((item) => item.id === race.tournamentId);
    if (!tournament) return c.json({ message: 'Tournament not found' }, 404);

    const activeRegistrations = activeHorseRaceRegistrations(db, tournament.id);
    const registeredHorseIds = new Set([
      ...activeRegistrations.filter(r => r.raceId === race.id).map((r) => r.horseId),
      ...(db.raceEntries || [])
        .filter((entry) => entry.raceId === race.id && entry.status !== 'rejected')
        .map((entry) => entry.horseId),
    ]);

    // Horses busy in another non-completed race in the same tournament cannot be registered again
    const COMPLETED_RACE_STATUSES = ['completed', 'cancelled'];
    const busyInOtherRace = new Set([
      ...(db.raceEntries || []).filter((entry) => {
        if (entry.raceId === race.id || entry.status === 'rejected') return false;
        const entryRace = db.races.find((r) => r.id === entry.raceId);
        return entryRace && entryRace.tournamentId === tournament.id && !COMPLETED_RACE_STATUSES.includes(entryRace.status);
      }).map((e) => e.horseId),
      ...(db.horseRaceRegistrations || []).filter((r) => {
        if (r.raceId === race.id || r.tournamentId !== tournament.id) return false;
        if (['rejected', 'cancelled'].includes(r.status)) return false;
        const regRace = db.races.find((rc) => rc.id === r.raceId);
        return regRace && !COMPLETED_RACE_STATUSES.includes(regRace.status);
      }).map((r) => r.horseId),
    ]);
    const registeredJockeyIds = new Set(
      activeRegistrations
        .filter((registration) => registration.raceId === race.id)
        .map((registration) => registration.jockeyUserId)
        .filter(Boolean)
    );

    return c.json({
      tournament,
      race,
      races: tournamentRaces(db, tournament.id),
      horses: db.horses.filter(
        (horse) => {
          if (
            horse.ownerUserId !== user.id ||
            horse.status !== 'approved' ||
            registeredHorseIds.has(horse.id) ||
            busyInOtherRace.has(horse.id)
          ) {
            return false;
          }
          if (race.raceClass && RACE_CLASSES[race.raceClass]) {
            const rating = officialHorseRating(horse);
            const { min, max } = RACE_CLASSES[race.raceClass];
            if (rating < min || rating > max) {
              return false;
            }
          }
          return true;
        }
      ),
      jockeyProfiles: publicTournamentJockeyProfiles(db, tournament.id, race.id).filter(
        (profile) => !registeredJockeyIds.has(profile.userId)
      ),
      horseRaceRegistrations: activeRegistrations.filter(
        (r) => r.ownerUserId === user.id
      ).map((registration) => ({
        ...registration,
        horseName: db.horses.find((horse) => horse.id === registration.horseId)?.name || 'Horse',
        jockeyName: jockeyName(db, registration.jockeyUserId),
      })),
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
      name, breed, species, age, sex, color, weightLb, heightCm,
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
      color: color || '', weightLb: Number(weightLb) || 0, heightCm: Number(heightCm) || 0,
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

  // Cập nhật thông tin hồ sơ. Các thành phần rating chỉ được nhập khi tạo ngựa.
  app.post('/horses/:id', async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const horseId = c.req.param('id');
    const horse = db.horses.find((item) => item.id === horseId);

    if (!horse || horse.ownerUserId !== user.id) {
      return c.json({ message: 'Horse not found' }, 404);
    }

    const {
      name, breed, species, age, sex, color, weightLb, heightCm,
      speedRating, staminaRating, formRating, healthRating,
      healthStatus, profileNotes, veterinaryCertificateUrl,
    } = await c.req.json();

    if (!name || !breed || !age || Number(age) <= 0) {
      return c.json({ message: 'Horse name, breed and age are required' }, 400);
    }

    const attemptsRatingChange = [
      [speedRating, horse.speedRating],
      [staminaRating, horse.staminaRating],
      [formRating, horse.formRating],
      [healthRating, horse.healthRating],
    ].some(
      ([nextValue, storedValue]) =>
        nextValue !== undefined &&
        nextValue !== null &&
        nextValue !== '' &&
        Number(nextValue) !== Number(storedValue)
    );
    if (attemptsRatingChange) {
      return c.json(
        {
          message:
            'Performance rating attributes are locked after horse registration.',
        },
        400
      );
    }

    horse.name = name; horse.breed = breed; horse.species = species || '';
    horse.age = Number(age); horse.sex = sex || ''; horse.color = color || '';
    horse.weightLb = Number(weightLb) || 0; horse.heightCm = Number(heightCm) || 0;
    horse.healthStatus = healthStatus || ''; horse.profileNotes = profileNotes || '';
    horse.veterinaryCertificateUrl = veterinaryCertificateUrl || '';
    horse.updatedAt = new Date().toISOString();

    createNotification(db, horse.ownerUserId, 'Horse profile updated', `${horse.name} profile information has been updated.`);

    await writeDb(db);
    return c.json({ horse });
  });

  // Owner đăng ký ngựa vào một chặng đua cụ thể
  app.post('/race-registrations', async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const { raceId, horseId, jockeyUserId, notes } = await c.req.json();

    const race = db.races.find((item) => item.id === raceId);
    if (!race) return c.json({ message: 'Race not found' }, 404);
    if (!isRaceRegistrationOpen(race)) {
      return c.json({ message: 'Race registration is not open' }, 400);
    }
    const tournamentId = race.tournamentId;

    const tournament = db.tournaments.find(
      (item) => item.id === tournamentId && ACTIVE_TOURNAMENT_STATUSES.includes(item.status)
    );
    const horse = db.horses.find(
      (item) => item.id === horseId && item.ownerUserId === user.id && item.status === 'approved'
    );

    if (!horse) return c.json({ message: 'Owner can only register approved horses they own' }, 400);
    if (!tournament) return c.json({ message: 'Tournament is not active for race registration' }, 400);

    if (race.raceClass && RACE_CLASSES[race.raceClass]) {
      const rating = officialHorseRating(horse);
      const { min, max } = RACE_CLASSES[race.raceClass];
      if (rating < min || rating > max) {
        return c.json({ message: `${horse.name || 'Horse'} rating (${rating}) is not eligible for ${race.raceClass} (${min}-${max}).` }, 400);
      }
    }

    db.raceEntries = db.raceEntries || [];
    db.jockeyInvitations = db.jockeyInvitations || [];
    db.horseRaceRegistrations = db.horseRaceRegistrations || [];

    const activeRegistrations = activeHorseRaceRegistrations(db, tournamentId);
    const existingRegistration = activeRegistrations.find((r) => r.horseId === horse.id && r.raceId === race.id);
    const reusableRegistration = db.horseRaceRegistrations.find(
      (r) =>
        r.tournamentId === tournamentId &&
        r.raceId === race.id &&
        r.horseId === horse.id &&
        ['rejected', 'cancelled'].includes(r.status)
    );

    if (!jockeyUserId) {
      if (!isRaceRegistrationOpen(race)) {
        return c.json({ message: 'This race is outside its registration window' }, 400);
      }

      if (existingRegistration) {
        return c.json(
          { message: 'This horse already has a pending or approved registration for this race' },
          409
        );
      }

      // Rule: 1 horse may only be in 1 active (non-completed) race per tournament.
      // If a previous race is fully completed (results confirmed), allow entering a new one.
      const COMPLETED_RACE_STATUSES = ['completed', 'cancelled'];
      const conflictRaceId = (() => {
        const entryConflict = (db.raceEntries || []).find((entry) => {
          if (entry.horseId !== horse.id || entry.raceId === race.id) return false;
          if (entry.status === 'rejected') return false;
          const entryRace = db.races.find((r) => r.id === entry.raceId);
          if (!entryRace || entryRace.tournamentId !== tournamentId) return false;
          return !COMPLETED_RACE_STATUSES.includes(entryRace.status);
        });
        if (entryConflict) return entryConflict.raceId;
        const regConflict = (db.horseRaceRegistrations || []).find((r) => {
          if (r.horseId !== horse.id || r.raceId === race.id || r.tournamentId !== tournamentId) return false;
          if (['rejected', 'cancelled'].includes(r.status)) return false;
          const regRace = db.races.find((rc) => rc.id === r.raceId);
          if (!regRace) return false;
          return !COMPLETED_RACE_STATUSES.includes(regRace.status);
        });
        return regConflict?.raceId || null;
      })();

      if (conflictRaceId) {
        const conflictRace = db.races.find((r) => r.id === conflictRaceId);
        return c.json(
          { message: `${horse.name} is already registered in "${conflictRace?.name || 'another race'}" of this tournament. A horse may only enter another race after its current race is fully completed.` },
          409
        );
      }

      const createdAt = new Date().toISOString();
      const registration = reusableRegistration || {
        id: randomUUID(),
        tournamentId,
        raceId: race.id,
        horseId: horse.id,
        ownerUserId: user.id,
        createdAt,
      };
      registration.tournamentId = tournamentId;
      registration.raceId = race.id;
      registration.horseId = horse.id;
      registration.ownerUserId = user.id;
      registration.jockeyUserId = null;
      registration.invitationId = null;
      registration.status = 'pending-admin';
      registration.notes = notes || '';
      registration.createdAt = createdAt;
      registration.reviewedAt = null;

      if (!reusableRegistration) db.horseRaceRegistrations.unshift(registration);
      horse.jockeyConfirmation = 'pending-admin';
      horse.updatedAt = createdAt;

      notifyAdmins(
        db,
        'Horse race registration needs approval',
        `${user.name} registered ${horse.name} for ${tournament.name}. Approve the horse before the owner can select a jockey.`
      );
      createNotification(
        db,
        user.id,
        'Horse race registration submitted',
        `${horse.name} is waiting for Admin approval before jockey selection.`
      );

      await writeDb(db);
      return c.json({ registration }, 201);
    }

    const jockeyApproved = (db.jockeyRaceRegistrations || []).some(
      (r) => r.raceId === race.id && r.jockeyUserId === jockeyUserId && r.status === 'approved'
    );
    if (!jockeyApproved) return c.json({ message: 'Jockey must be approved for the same race' }, 400);

    if (!existingRegistration || existingRegistration.status !== 'approved' || existingRegistration.jockeyUserId) {
      return c.json(
        { message: 'Admin must approve this horse for the tournament before selecting a jockey' },
        400
      );
    }

    const jockeyAlreadyRegistered = activeRegistrations.some((r) => r.jockeyUserId === jockeyUserId && r.raceId === race.id);
    const jockeyAlreadyInvited = db.jockeyInvitations.some(
      (inv) =>
        inv.raceId === race.id && inv.jockeyUserId === jockeyUserId &&
        !['rejected', 'cancelled'].includes(inv.status) && inv.adminStatus !== 'rejected'
    );

    if (jockeyAlreadyRegistered || jockeyAlreadyInvited) {
      return c.json(
        { message: 'This jockey already has a pending or approved assignment in the same race' },
        409
      );
    }

    const createdAt = new Date().toISOString();
    const invitation = {
      id: randomUUID(), horseId: horse.id, ownerUserId: user.id, jockeyUserId,
      tournamentId, raceId: race.id, status: 'pending', adminStatus: null,
      notes: notes || '', createdAt, respondedAt: null,
    };

    db.jockeyInvitations.unshift(invitation);
    existingRegistration.jockeyUserId = jockeyUserId;
    existingRegistration.invitationId = invitation.id;
    existingRegistration.status = 'pending-jockey';
    existingRegistration.notes = notes || existingRegistration.notes || '';
    existingRegistration.reviewedAt = null;

    horse.jockeyConfirmation = 'pending-jockey';
    horse.updatedAt = new Date().toISOString();

    createNotification(db, jockeyUserId, 'Race riding request',
      `${user.name} invited you to ride ${horse.name} for ${race.name}. Admin approval starts after the jockey accepts.`);
    createNotification(db, user.id, 'Jockey request sent',
      `${horse.name} is waiting for ${jockeyName(db, jockeyUserId)} to accept for ${race.name}. Admin approval starts after the jockey accepts.`);

    await writeDb(db);
    return c.json({ invitation }, 201);
  });

  return app;
};
