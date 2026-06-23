import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import {
  ACTIVE_TOURNAMENT_STATUSES,
  MAX_RACE_FIELD_SIZE,
  MAX_TOURNAMENT_RACES,
} from '../config/constants.js';
import { requireRole } from '../services/authService.js';
import {
  approvedRaceEntries,
  formatApprovals,
  jockeyName,
  isRaceRegistrationOpen,
  publicRaceEntries,
  raceRefereeIds,
  raceName,
  tournamentName,
  tournamentRaces,
} from '../services/domainService.js';
import {
  MAX_CARRIED_WEIGHT_LB,
  MIN_CARRIED_WEIGHT_LB,
  computeRaceHandicap,
  officialHorseRating,
} from '../services/handicapService.js';
import { broadcastRaceUpdate } from '../services/liveRaceEvents.js';
import { recordRaceAction } from '../services/raceAuditService.js';
import {
  createNotification,
  notifyAdmins,
} from '../services/notificationService.js';

// Helpers nội bộ
const nonRejectedEntry = (entry) => entry.status !== 'rejected';

const registrationPair = (registration, invitation) => ({
  horseId: registration?.horseId || invitation?.horseId,
  jockeyUserId: registration?.jockeyUserId || invitation?.jockeyUserId,
  ownerUserId: registration?.ownerUserId || invitation?.ownerUserId,
  invitationId: registration?.invitationId || invitation?.id || null,
  notes: registration?.notes || invitation?.notes || '',
});

const validatePairForRace = (db, race, pair) => {
  const existingEntry = (db.raceEntries || []).find(
    (entry) => entry.raceId === race.id && entry.horseId === pair.horseId && nonRejectedEntry(entry)
  );
  if (existingEntry) return null;

  const jockeyConflict = (db.raceEntries || []).find(
    (entry) =>
      entry.raceId === race.id && entry.jockeyUserId === pair.jockeyUserId &&
      entry.horseId !== pair.horseId && nonRejectedEntry(entry)
  );
  if (jockeyConflict) return `${jockeyName(db, pair.jockeyUserId)} is already assigned in ${race.name}.`;
  if (approvedRaceEntries(db, race.id).length >= MAX_RACE_FIELD_SIZE) return `${race.name} already has ${MAX_RACE_FIELD_SIZE} approved horses.`;
  return null;
};

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

const addPairToTournamentRaces = (db, invitation, registration, createdAt) => {
  const pair = registrationPair(registration, invitation);
  const races = tournamentRaces(db, invitation.tournamentId).filter((race) =>
    isRaceRegistrationOpen(race)
  );
  const errors = races.map((race) => validatePairForRace(db, race, pair)).filter(Boolean);
  if (errors.length) return { error: errors[0], races: [] };
  const touchedRaces = races.filter((race) => addPairToRace(db, race, pair, createdAt));
  return { error: null, races: touchedRaces };
};

const addApprovedTournamentPairsToRace = (db, race, createdAt) => {
  const registrations = (db.horseTournamentRegistrations || []).filter(
    (r) => r.tournamentId === race.tournamentId && r.status === 'approved'
  );
  if (registrations.length > MAX_RACE_FIELD_SIZE) {
    return { error: `Tournament already has more than ${MAX_RACE_FIELD_SIZE} approved horse-jockey pairs.` };
  }
  const errors = registrations.map((r) => validatePairForRace(db, race, registrationPair(r, null))).filter(Boolean);
  if (errors.length) return { error: errors[0] };
  registrations.forEach((r) => addPairToRace(db, race, registrationPair(r, null), createdAt));
  return { error: null };
};

export const createAdminRoutes = (getDb, writeDb) => {
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

  // Lấy dữ liệu trang tạo cuộc đua: giải, các cuộc đua hiện có, danh sách trọng tài
  app.get('/race-builder', (c) => {
    const db = c.get('db');
    const referees = db.users
      .filter((item) => item.role === 'referee' && item.status === 'active')
      .map((item) => ({ id: item.id, name: item.name }));
    return c.json({
      tournaments: db.tournaments.filter((item) =>
        ACTIVE_TOURNAMENT_STATUSES.includes(item.status)
      ),
      races: db.races || [],
      referees,
      maxRacesPerTournament: MAX_TOURNAMENT_RACES,
    });
  });

  // Tạo giải đấu mới
  app.post('/tournaments', async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const { name, registrationWindow, startDate, finalDate, location, prizePool } = await c.req.json();

    if (!name || !startDate || !location) {
      return c.json({ message: 'Tournament name, start date and location are required' }, 400);
    }

    const createdAt = new Date().toISOString();
    const tournament = {
      id: randomUUID(), name, status: 'registration',
      registrationWindow: registrationWindow || 'Open Registration',
      startDate, finalDate: finalDate || '', location,
      prizePool: Number(prizePool) || 0, createdAt, updatedAt: createdAt,
    };

    db.tournaments.unshift(tournament);
    notifyAdmins(db, 'Tournament registration opened',
      `${tournament.name} has been created and opened for Owner/Jockey registration.`);

    await writeDb(db);
    return c.json({ tournament, tournaments: db.tournaments, notifications: db.notifications || [] }, 201);
  });

  // Tạo một cuộc đua mới trong giải đấu
  app.post('/races', async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const {
      tournamentId, raceNumber, name, round, date, time, venue, distance, surface,
      raceClass, handicapMin, handicapMax, totalPrize, refereeUserId, refereeUserIds,
      registrationOpenTime, registrationCloseTime,
    } = await c.req.json();

    if (
      !name || !date || !time || !venue || !distance || !surface || !raceClass ||
      handicapMin === undefined || handicapMax === undefined || !refereeUserId ||
      !registrationOpenTime || !registrationCloseTime
    ) {
      return c.json({ message: 'Race name, schedule, registration window, venue, distance and referee are required' }, 400);
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
    if (existingTournamentRaces.length >= MAX_TOURNAMENT_RACES) {
      return c.json(
        { message: `${tournament.name} already has the maximum ${MAX_TOURNAMENT_RACES} races` },
        409
      );
    }

    const now = new Date();
    const registrationOpensAt = new Date(registrationOpenTime);
    const registrationClosesAt = new Date(registrationCloseTime);
    const raceStartsAt = new Date(`${date}T${time}`);

    if (
      !Number.isFinite(registrationOpensAt.getTime()) ||
      !Number.isFinite(registrationClosesAt.getTime()) ||
      !Number.isFinite(raceStartsAt.getTime())
    ) {
      return c.json({ message: 'Registration and race schedule must use valid date/time values' }, 400);
    }
    if (registrationOpensAt >= registrationClosesAt) {
      return c.json({ message: 'Registration close time must be after open time' }, 400);
    }
    if (registrationClosesAt <= now) {
      return c.json({ message: 'Registration close time must be in the future' }, 400);
    }
    if (registrationClosesAt > raceStartsAt) {
      return c.json({ message: 'Registration must close before the race starts' }, 400);
    }
    const distanceMeters = Number(distance);
    const minHandicap = Number(handicapMin);
    const maxHandicap = Number(handicapMax);
    if (!Number.isFinite(distanceMeters) || distanceMeters < 400 || distanceMeters > 10000) {
      return c.json({ message: 'Race distance must be between 400m and 10,000m' }, 400);
    }
    if (
      !Number.isFinite(minHandicap) ||
      !Number.isFinite(maxHandicap) ||
      minHandicap < MIN_CARRIED_WEIGHT_LB ||
      maxHandicap > MAX_CARRIED_WEIGHT_LB ||
      maxHandicap < minHandicap
    ) {
      return c.json(
        { message: `Assigned weight must be between ${MIN_CARRIED_WEIGHT_LB}lb and ${MAX_CARRIED_WEIGHT_LB}lb` },
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

    const minutes = Math.max(
      1,
      Math.ceil((registrationClosesAt.getTime() - registrationOpensAt.getTime()) / 60000)
    );

    const race = {
      id: randomUUID(), tournamentId: tournament.id, raceNumber: raceNumber || '',
      name, round: round || '', date, time, venue,
      distance: `${distanceMeters}m`, surface, raceClass,
      handicapMin: minHandicap, handicapMax: maxHandicap,
      totalPrize: Number(totalPrize) || 0, status: 'registration-open',
      participants: 0, ownerConfirmed: 0, jockeyConfirmed: 0,
      registrationPeriodMinutes: minutes,
      registrationOpensAt: registrationOpensAt.toISOString(),
      registrationClosesAt: registrationClosesAt.toISOString(),
      resultStatus: 'draft', awardsPublished: false,
      createdBy: user.id, createdAt: now.toISOString(), updatedAt: now.toISOString(),
    };

    const addExistingPairsResult = addApprovedTournamentPairsToRace(db, race, now.toISOString());
    if (addExistingPairsResult.error) {
      return c.json({ message: addExistingPairsResult.error }, 400);
    }

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
        `${race.name} has been created. Registration closes at ${race.registrationClosesAt}.`)
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

    const { name, date, time } = await c.req.json();
    if (!String(name || '').trim() || !date || !time) {
      return c.json({ message: 'Race name, date and time are required' }, 400);
    }

    race.name = String(name).trim();
    race.date = date;
    race.raceDate = date;
    race.time = time;
    race.raceTime = time;
    race.updatedAt = new Date().toISOString();
    recordRaceAction(db, {
      raceId: race.id,
      userId: c.get('user').id,
      action: 'edit-race',
      fromStatus: race.status,
      toStatus: race.status,
      details: `Updated schedule to ${date} ${time}`,
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

  // Admin chỉ chuẩn bị và publish race; kết quả thuộc trách nhiệm của trọng tài.
  app.post('/races/:raceId/:action', async (c) => {
    const db = c.get('db');
    const raceId = c.req.param('raceId');
    const action = c.req.param('action');
    const validActions = ['close-registration', 'publish'];

    if (!validActions.includes(action)) return c.json({ message: 'Invalid action' }, 400);

    const race = db.races.find((item) => item.id === raceId);
    if (!race) return c.json({ message: 'Race not found' }, 404);

    const entries = (db.raceEntries || []).filter(
      (entry) => entry.raceId === race.id && entry.status === 'approved'
    );
    const fromStatus = race.status;

    if (action === 'close-registration') {
      if (race.status !== 'registration-open') {
        return c.json({ message: 'Only an open registration can be closed' }, 400);
      }
      if (entries.length === 0) {
        return c.json({ message: 'A race must have at least one approved participant' }, 400);
      }
      if (
        race.registrationClosesAt &&
        Date.now() < new Date(race.registrationClosesAt).getTime()
      ) {
        return c.json({ message: 'Registration cannot close before its configured close time' }, 400);
      }
      if (entries.length > MAX_RACE_FIELD_SIZE) {
        return c.json(
          { message: `A race can have at most ${MAX_RACE_FIELD_SIZE} horses and ${MAX_RACE_FIELD_SIZE} jockeys on the track.` },
          400
        );
      }

      race.status = 'registration-closed';
      race.participants = entries.length;
      race.ownerConfirmed = entries.length;
      race.jockeyConfirmed = entries.length;
      race.updatedAt = new Date().toISOString();

      const sortedEntries = [...entries].sort((a, b) => {
        const horseA = db.horses.find((horse) => horse.id === a.horseId);
        const horseB = db.horses.find((horse) => horse.id === b.horseId);
        return String(horseA?.breed || '').localeCompare(String(horseB?.breed || ''));
      });

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

      raceRefereeIds(db, race).forEach((refereeId) =>
        createNotification(db, refereeId, 'Race registration closed',
          `${race.name} is ready for referee review. Starting gates, rating snapshots and carried weights have been assigned.`)
      );
    }

    if (action === 'publish') {
      if (!['registration-closed', 'published'].includes(race.status)) {
        return c.json({ message: 'Close registration before publishing the race' }, 400);
      }
      if (entries.length === 0) {
        return c.json({ message: 'A race must have at least one approved participant before publishing' }, 400);
      }
      race.status = 'published';
      race.updatedAt = new Date().toISOString();
      entries.forEach((entry) => {
        const horse = db.horses.find((item) => item.id === entry.horseId);
        const msg = `${race.name} has been published. Gate ${entry.lane}, rating ${entry.ratingSnapshot || 'TBD'}, assigned weight ${entry.handicap}lb.`;
        createNotification(db, horse?.ownerUserId, 'Race published', msg);
        createNotification(db, entry.jockeyUserId, 'Race published', msg);
      });
    }

    recordRaceAction(db, {
      raceId: race.id,
      userId: c.get('user').id,
      action,
      fromStatus,
      toStatus: race.status,
      details: `${entries.length} approved participants`,
    });

    await writeDb(db);
    broadcastRaceUpdate(race.id);
    return c.json({
      race,
      entries: publicRaceEntries(db).filter((entry) => entry.raceId === race.id),
      notifications: db.notifications || [],
    });
  });

  // Phê duyệt hoặc từ chối một mục cụ thể (ngựa, tài khoản, jockey, race entry, pairing)
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

    if (entityType === 'jockey') {
      const jockey = db.users.find((item) => item.id === id && item.role === 'jockey');
      if (!jockey) return c.json({ message: 'Jockey approval not found' }, 404);
      jockey.status = decision === 'approved' ? 'active' : 'rejected';
      jockey.updatedAt = new Date().toISOString();
      createNotification(db, jockey.id,
        decision === 'approved' ? 'Jockey account approved' : 'Jockey account rejected',
        `Your jockey application has been ${decision} by Admin.`);
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

    if (entityType === 'jockeyTournament') {
      const registration = (db.jockeyTournamentRegistrations || []).find(
        (item) => item.id === id && item.status === 'pending'
      );
      if (!registration) return c.json({ message: 'Jockey tournament registration not found' }, 404);
      registration.status = decision;
      registration.reviewedAt = new Date().toISOString();
      const tournament = db.tournaments.find((item) => item.id === registration.tournamentId);
      createNotification(db, registration.jockeyUserId,
        decision === 'approved' ? 'Tournament participation approved' : 'Tournament participation rejected',
        `${tournament?.name || 'Tournament'} participation has been ${decision}.`);
    }

    if (entityType === 'raceEntry') {
      const entry = (db.raceEntries || []).find((item) => item.id === id && item.status === 'pending-approval');
      if (!entry) return c.json({ message: 'Horse race entry not found' }, 404);
      const horse = db.horses.find((item) => item.id === entry.horseId);
      const race = db.races.find((item) => item.id === entry.raceId);

      if (decision === 'approved') {
        const approvedCount = approvedRaceEntries(db, entry.raceId).filter((item) => item.id !== entry.id).length;
        if (approvedCount >= MAX_RACE_FIELD_SIZE) {
          return c.json(
            { message: `This race already has ${MAX_RACE_FIELD_SIZE} approved horses. Reject or remove an entry before approving another one.` },
            400
          );
        }
      }

      entry.status = decision === 'approved' ? 'approved' : 'rejected';
      if (race) { race.participants = approvedRaceEntries(db, race.id).length; raceIdsToBroadcast.add(race.id); }

      const msg = `${horse?.name || 'Horse'} for ${race?.name || 'race'} has been ${decision}.`;
      createNotification(db, horse?.ownerUserId, decision === 'approved' ? 'Race entry approved' : 'Race entry rejected', msg);
      createNotification(db, entry.jockeyUserId, decision === 'approved' ? 'Race entry approved' : 'Race entry rejected', msg);
    }

    if (entityType === 'pairing') {
      const invitation = (db.jockeyInvitations || []).find(
        (item) => item.id === id && item.status === 'accepted' && item.adminStatus === 'pending'
      );
      if (!invitation) return c.json({ message: 'Horse-Jockey pairing approval not found' }, 404);

      const horse = db.horses.find((item) => item.id === invitation.horseId);
      const registration = (db.horseTournamentRegistrations || []).find((item) => item.invitationId === invitation.id);
      const targetLabel = invitation.tournamentId
        ? tournamentName(db, invitation.tournamentId)
        : raceName(db, invitation.raceId);

      if (decision === 'approved') {
        if (invitation.tournamentId) {
          const addResult = addPairToTournamentRaces(db, invitation, registration, new Date().toISOString());
          if (addResult.error) return c.json({ message: addResult.error }, 400);
          addResult.races.forEach((race) => raceIdsToBroadcast.add(race.id));
        }

        invitation.adminStatus = decision;
        if (registration) { registration.status = 'approved'; registration.reviewedAt = new Date().toISOString(); }
        if (horse) { horse.jockeyConfirmation = 'confirmed'; horse.updatedAt = new Date().toISOString(); }

        if (!invitation.tournamentId && invitation.raceId) {
          db.raceEntries = db.raceEntries || [];
          const race = db.races.find((item) => item.id === invitation.raceId);
          if (!race) return c.json({ message: 'Race not found' }, 404);

          const alreadyEntered = db.raceEntries.some(
            (entry) => entry.raceId === invitation.raceId && entry.horseId === invitation.horseId && nonRejectedEntry(entry)
          );
          if (!alreadyEntered) {
            const approvedCount = approvedRaceEntries(db, invitation.raceId).length;
            if (approvedCount >= MAX_RACE_FIELD_SIZE) {
              return c.json(
                { message: `This race already has ${MAX_RACE_FIELD_SIZE} approved horses. Reject or remove an entry before approving another one.` },
                400
              );
            }
            addPairToRace(db, race, registrationPair(null, invitation), new Date().toISOString());
          }
          if (race) { race.participants = approvedRaceEntries(db, race.id).length; raceIdsToBroadcast.add(race.id); }
        }

        createNotification(db, invitation.ownerUserId,
          invitation.tournamentId ? 'Pairing approved for tournament' : 'Pairing approved for race',
          `Admin approved ${horse?.name || 'your horse'} with ${jockeyName(db, invitation.jockeyUserId)} for ${targetLabel}.`);
        createNotification(db, invitation.jockeyUserId,
          invitation.tournamentId ? 'You are approved for the tournament' : 'You are approved for the race',
          `Admin approved your assignment to ride ${horse?.name || 'the horse'} in ${targetLabel}.`);
      } else {
        invitation.adminStatus = decision;
        if (registration) { registration.status = 'rejected'; registration.reviewedAt = new Date().toISOString(); }
        if (horse) { horse.jockeyConfirmation = 'waiting-owner'; horse.updatedAt = new Date().toISOString(); }
        createNotification(db, invitation.ownerUserId,
          invitation.tournamentId ? 'Pairing rejected for tournament' : 'Pairing rejected for race',
          `Admin rejected the ${horse?.name || 'horse'} + ${jockeyName(db, invitation.jockeyUserId)} assignment for ${targetLabel}.`);
        createNotification(db, invitation.jockeyUserId,
          invitation.tournamentId ? 'Tournament assignment rejected' : 'Race assignment rejected',
          `Admin rejected your assignment for ${horse?.name || 'the horse'} in ${targetLabel}.`);
      }
    }

    await writeDb(db);
    raceIdsToBroadcast.forEach((raceId) => broadcastRaceUpdate(raceId));
    return c.json({ ok: true, approvals: formatApprovals(db), notifications: db.notifications || [] });
  });

  return app;
};
