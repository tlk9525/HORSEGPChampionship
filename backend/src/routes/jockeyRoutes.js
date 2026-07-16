import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import { requireRole } from '../services/authService.js';
import {
  activeTournament,
  activeRace,
  isRaceRegistrationOpen,
  ownerName,
  publicRaceEntries,
  raceName,
  tournamentName,
} from '../services/domainService.js';
import {
  createNotification,
  notifyAdmins,
} from '../services/notificationService.js';

// Ghi chú: Hàm này tạo nhóm route jockey routes cho backend.
export const createJockeyRoutes = (getDb, writeDb) => {
  const app = new Hono();

  // Middleware xác thực — chỉ cho phép jockey truy cập
  app.use('*', async (c, next) => {
    const db = await getDb();
    const user = await requireRole(c.req.raw, db, ['jockey']);
    if (!user) return c.json({ message: 'Jockey access required' }, 403);
    c.set('user', user);
    c.set('db', db);
    await next();
  });

  // Lấy dữ liệu portal của jockey: hồ sơ, ngựa, giải, cuộc đua, lời mời
  app.get('/portal', (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const profile =
      (db.jockeyProfiles || []).find((item) => item.userId === user.id) || null;

    const activeTournamentIds = new Set(
      db.tournaments
        .filter((tournament) => tournament.status !== 'completed')
        .map((tournament) => tournament.id)
    );
    const activeRaceIds = new Set(db.races.filter(activeRace).map((race) => race.id));
    const invitations = (db.jockeyInvitations || []).filter((invitation) =>
      invitation.jockeyUserId === user.id &&
      (invitation.tournamentId
        ? activeTournamentIds.has(invitation.tournamentId)
        : activeRaceIds.has(invitation.raceId))
    );
    const raceEntries = publicRaceEntries(db).filter(
      (entry) => entry.jockeyUserId === user.id && activeRaceIds.has(entry.raceId)
    );
    const visibleHorseIds = new Set([
      ...invitations.map((invitation) => invitation.horseId),
      ...raceEntries.map((entry) => entry.horseId),
    ]);

    return c.json({
      profile,
      horses: db.horses.filter((horse) => visibleHorseIds.has(horse.id)),
      tournaments: db.tournaments.filter((item) => activeTournamentIds.has(item.id)),
      races: db.races.filter((race) => activeRaceIds.has(race.id)),
      raceEntries,
      invitations,
    });
  });

  // Lưu hoặc cập nhật hồ sơ jockey (bio, chứng chỉ, cấp độ, cân nặng)
  app.post('/profile', async (c) => {
    const user = c.get('user');
    const db = c.get('db');

    if (!activeTournament(db)) {
      return c.json(
        { message: 'Admin must create and open a tournament before jockeys can publish profiles.' },
        400
      );
    }

    const { bio, certificate, competitionLevel, weightLb, weight } = await c.req.json();
    db.jockeyProfiles = db.jockeyProfiles || [];

    let profile = db.jockeyProfiles.find((item) => item.userId === user.id);
    if (!profile) {
      profile = { id: randomUUID(), userId: user.id };
      db.jockeyProfiles.unshift(profile);
    }

    profile.bio = bio || '';
    profile.certificate = certificate || '';
    profile.competitionLevel = competitionLevel || '';
    profile.weightLb = Number(weightLb ?? weight) || 0;
    profile.status = 'published';
    profile.updatedAt = new Date().toISOString();

    await writeDb(db);
    return c.json({ profile });
  });

  // Jockey đăng ký tham gia một cuộc đua (cần admin phê duyệt)
  app.post('/race-registrations', async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const { raceId } = await c.req.json();
    const race = db.races.find((item) => item.id === raceId);

    if (!isRaceRegistrationOpen(race)) {
      return c.json({ message: 'Race registration is not open' }, 400);
    }

    db.jockeyRaceRegistrations = db.jockeyRaceRegistrations || [];
    const existing = db.jockeyRaceRegistrations.find(
      (r) => r.raceId === race.id && r.jockeyUserId === user.id
    );

    if (existing) {
      if (existing.status === 'rejected') {
        existing.status = 'pending';
        existing.createdAt = new Date().toISOString();
        existing.reviewedAt = null;
        notifyAdmins(db, 'Jockey race registration', `${user.name} requested to join ${race.name}.`);
        createNotification(db, user.id, 'Race registration resubmitted', `${race.name} is waiting for Admin approval.`);

        await writeDb(db);
        return c.json({ registration: existing, jockeyRaceRegistrations: db.jockeyRaceRegistrations }, 200);
      }

      return c.json(
        { message: `You already have a ${existing.status} registration for this race.` },
        409
      );
    }

    const registration = {
      id: randomUUID(),
      raceId: race.id,
      jockeyUserId: user.id,
      status: 'pending',
      createdAt: new Date().toISOString(),
      reviewedAt: null,
    };

    db.jockeyRaceRegistrations.unshift(registration);
    notifyAdmins(db, 'Jockey race registration', `${user.name} requested to join ${race.name}.`);
    createNotification(db, user.id, 'Race registration submitted', `${race.name} is waiting for Admin approval.`);

    await writeDb(db);
    return c.json({ registration, jockeyRaceRegistrations: db.jockeyRaceRegistrations }, 201);
  });

  // Jockey chấp nhận hoặc từ chối lời mời tham gia cuộc đua
  app.post('/invitations/:id', async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const id = c.req.param('id');
    const { decision } = await c.req.json();

    if (!['accepted', 'rejected'].includes(decision)) {
      return c.json({ message: 'Decision must be accepted or rejected' }, 400);
    }

    const invitation = (db.jockeyInvitations || []).find(
      (item) => item.id === id && item.jockeyUserId === user.id && item.status === 'pending'
    );
    if (!invitation) return c.json({ message: 'Pending invitation not found' }, 404);
    const invitationTournament = invitation.tournamentId
      ? db.tournaments.find((item) => item.id === invitation.tournamentId)
      : null;
    const invitationRace = invitation.raceId
      ? db.races.find((item) => item.id === invitation.raceId)
      : null;
    if (invitationTournament?.status === 'completed' || !activeRace(invitationRace) && invitation.raceId) {
      return c.json({ message: 'This assignment is no longer active' }, 400);
    }

    invitation.status = decision;
    invitation.respondedAt = new Date().toISOString();

    const horse = db.horses.find((item) => item.id === invitation.horseId);
    const targetLabel = raceName(db, invitation.raceId);
    const horseRegistration = (db.horseRaceRegistrations || []).find(
      (r) => r.invitationId === invitation.id
    );

    if (decision === 'accepted') {
      invitation.adminStatus = 'pending';
      if (horseRegistration) horseRegistration.status = 'pending-admin';
      if (horse) { horse.jockeyConfirmation = 'pending-admin'; horse.updatedAt = new Date().toISOString(); }

      createNotification(db, invitation.ownerUserId, 'Jockey accepted race participation',
        `${user.name} accepted riding ${horse?.name || 'your horse'} for ${targetLabel}. Waiting for Admin approval.`);
      notifyAdmins(db, 'Race horse registration needs approval',
        `${ownerName(db, invitation.ownerUserId)} registered ${horse?.name || 'Horse'} + ${user.name} for ${targetLabel}.`);
    } else {
      invitation.adminStatus = null;
      if (horseRegistration) {
        horseRegistration.status = 'approved';
        horseRegistration.jockeyUserId = null;
        horseRegistration.invitationId = null;
        horseRegistration.reviewedAt = new Date().toISOString();
      }
      if (horse) { horse.jockeyConfirmation = 'waiting-owner'; horse.updatedAt = new Date().toISOString(); }

      createNotification(db, invitation.ownerUserId, 'Jockey rejected request',
        `${user.name} rejected the request${horse ? ` for ${horse.name}` : ''}.`);
    }

    await writeDb(db);
    return c.json({ invitation });
  });

  return app;
};
