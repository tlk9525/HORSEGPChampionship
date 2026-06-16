import { randomUUID } from 'node:crypto';
import {
  ACTIVE_TOURNAMENT_STATUSES,
  MAX_RACE_FIELD_SIZE,
} from '../config/constants.js';
import { requireRole } from '../services/authService.js';
import {
  approvedRaceEntries,
  formatApprovals,
  jockeyName,
  publicRaceEntries,
  raceRefereeIds,
  raceName,
  tournamentName,
  tournamentRaces,
} from '../services/domainService.js';
import { computeRaceHandicap } from '../services/handicapService.js';
import { broadcastRaceUpdate } from '../services/liveRaceEvents.js';
import {
  createNotification,
  notifyAdmins,
} from '../services/notificationService.js';

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
    (entry) =>
      entry.raceId === race.id &&
      entry.horseId === pair.horseId &&
      nonRejectedEntry(entry)
  );

  if (existingEntry) return null;

  const jockeyConflict = (db.raceEntries || []).find(
    (entry) =>
      entry.raceId === race.id &&
      entry.jockeyUserId === pair.jockeyUserId &&
      entry.horseId !== pair.horseId &&
      nonRejectedEntry(entry)
  );

  if (jockeyConflict) {
    return `${jockeyName(db, pair.jockeyUserId)} is already assigned in ${race.name}.`;
  }

  if (approvedRaceEntries(db, race.id).length >= MAX_RACE_FIELD_SIZE) {
    return `${race.name} already has ${MAX_RACE_FIELD_SIZE} approved horses.`;
  }

  return null;
};

const addPairToRace = (db, race, pair, createdAt) => {
  db.raceEntries = db.raceEntries || [];

  const existingEntry = db.raceEntries.find(
    (entry) =>
      entry.raceId === race.id &&
      entry.horseId === pair.horseId &&
      nonRejectedEntry(entry)
  );

  if (existingEntry) return false;

  db.raceEntries.push({
    id: randomUUID(),
    raceId: race.id,
    horseId: pair.horseId,
    jockeyUserId: pair.jockeyUserId,
    invitationId: pair.invitationId,
    status: 'approved',
    lane: null,
    handicap: 0,
    ratingSnapshot: 0,
    ownerConfirmed: true,
    jockeyConfirmed: true,
    preRaceStatus: 'pending',
    disqualified: false,
    resultStatus: 'draft',
    notes: pair.notes,
    violationNotes: '',
    finishTime: '',
    position: null,
    createdAt,
  });

  race.participants = approvedRaceEntries(db, race.id).length;
  race.ownerConfirmed = race.participants;
  race.jockeyConfirmed = race.participants;
  return true;
};

const addPairToTournamentRaces = (db, invitation, registration, createdAt) => {
  const pair = registrationPair(registration, invitation);
  const races = tournamentRaces(db, invitation.tournamentId);
  const errors = races
    .map((race) => validatePairForRace(db, race, pair))
    .filter(Boolean);

  if (errors.length) {
    return { error: errors[0], races: [] };
  }

  const touchedRaces = races.filter((race) =>
    addPairToRace(db, race, pair, createdAt)
  );

  return { error: null, races: touchedRaces };
};

const addApprovedTournamentPairsToRace = (db, race, createdAt) => {
  const registrations = (db.horseTournamentRegistrations || []).filter(
    (registration) =>
      registration.tournamentId === race.tournamentId &&
      registration.status === 'approved'
  );

  if (registrations.length > MAX_RACE_FIELD_SIZE) {
    return {
      error: `Tournament already has more than ${MAX_RACE_FIELD_SIZE} approved horse-jockey pairs.`,
    };
  }

  const errors = registrations
    .map((registration) =>
      validatePairForRace(db, race, registrationPair(registration, null))
    )
    .filter(Boolean);

  if (errors.length) return { error: errors[0] };

  registrations.forEach((registration) =>
    addPairToRace(db, race, registrationPair(registration, null), createdAt)
  );

  return { error: null };
};

export const handleAdminRoutes = async ({
  req,
  res,
  url,
  db,
  send,
  readBody,
  writeDb,
}) => {
  if (req.method === 'GET' && url.pathname === '/api/admin/approvals') {
    const user = await requireRole(req, db, ['admin']);

    if (!user) {
      send(res, 403, { message: 'Admin access required' });
      return true;
    }

    send(res, 200, { approvals: formatApprovals(db) });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/tournaments') {
    const user = await requireRole(req, db, ['admin']);

    if (!user) {
      send(res, 403, { message: 'Admin access required' });
      return true;
    }

    const {
      name,
      registrationWindow,
      startDate,
      finalDate,
      location,
      prizePool,
    } = await readBody(req);

    if (!name || !startDate || !location) {
      send(res, 400, {
        message: 'Tournament name, start date and location are required',
      });
      return true;
    }

    const createdAt = new Date().toISOString();
    const tournament = {
      id: randomUUID(),
      name,
      status: 'registration',
      registrationWindow: registrationWindow || 'Open Registration',
      startDate,
      finalDate: finalDate || '',
      location,
      prizePool: Number(prizePool) || 0,
      createdAt,
      updatedAt: createdAt,
    };

    db.tournaments.unshift(tournament);

    notifyAdmins(
      db,
      'Tournament registration opened',
      `${tournament.name} has been created and opened for Owner/Jockey registration.`
    );

    await writeDb(db);
    send(res, 201, {
      tournament,
      tournaments: db.tournaments,
      notifications: db.notifications || [],
    });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/race-builder') {
    const user = await requireRole(req, db, ['admin']);

    if (!user) {
      send(res, 403, { message: 'Admin access required' });
      return true;
    }

    const referees = db.users
      .filter((item) => item.role === 'referee' && item.status === 'active')
      .map((item) => ({
        id: item.id,
        name: item.name,
      }));

    send(res, 200, {
      tournaments: db.tournaments,
      races: db.races || [],
      referees,
    });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/races') {
    const user = await requireRole(req, db, ['admin']);

    if (!user) {
      send(res, 403, { message: 'Admin access required' });
      return true;
    }

    const {
      tournamentId,
      raceNumber,
      name,
      round,
      date,
      time,
      venue,
      distance,
      surface,
      raceClass,
      handicapMin,
      handicapMax,
      totalPrize,
      refereeUserId,
      refereeUserIds,
      registrationPeriodMinutes,
      registrationOpenTime,
      registrationCloseTime,
    } = await readBody(req);

    if (!name || !date || !time || !venue || !distance || !refereeUserId) {
      send(res, 400, {
        message: 'Race name, date, time, venue, distance and referee are required',
      });
      return true;
    }

    const selectedRefereeIds = Array.from(
      new Set([refereeUserId, ...(Array.isArray(refereeUserIds) ? refereeUserIds : [])].filter(Boolean))
    );
    const selectedReferees = selectedRefereeIds
      .map((id) =>
        db.users.find(
          (item) =>
            item.id === id &&
            item.role === 'referee' &&
            item.status === 'active'
        )
      )
      .filter(Boolean);
    const referee = selectedReferees[0];

    if (selectedReferees.length !== selectedRefereeIds.length || !referee) {
      send(res, 400, { message: 'Assigned referee must be active' });
      return true;
    }

    if (!tournamentId) {
      send(res, 400, { message: 'Create and select a tournament before creating races' });
      return true;
    }

    const tournament = db.tournaments.find(
      (item) =>
        item.id === tournamentId &&
        ACTIVE_TOURNAMENT_STATUSES.includes(item.status)
    );

    if (!tournament) {
      send(res, 400, { message: 'Selected tournament must exist and be open before creating races' });
      return true;
    }

    const now = new Date();
    const minutes = Math.max(1, Number(registrationPeriodMinutes) || 10);
    const registrationOpensAt = registrationOpenTime || now.toISOString();
    const registrationClosesAt =
      registrationCloseTime ||
      new Date(now.getTime() + minutes * 60 * 1000).toISOString();

    const race = {
      id: randomUUID(),
      tournamentId: tournament.id,
      raceNumber: raceNumber || '',
      name,
      round: round || 'Qualifier',
      date,
      time,
      venue,
      distance: `${distance}m`,
      surface: surface || 'Turf',
      raceClass: raceClass || '',
      handicapMin: Number(handicapMin) || 0,
      handicapMax: Number(handicapMax) || 0,
      totalPrize: Number(totalPrize) || 0,
      status: 'registration-open',
      participants: 0,
      ownerConfirmed: 0,
      jockeyConfirmed: 0,
      registrationPeriodMinutes: minutes,
      registrationOpensAt,
      registrationClosesAt,
      resultStatus: 'draft',
      awardsPublished: false,
      createdBy: user.id,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const addExistingPairsResult = addApprovedTournamentPairsToRace(db, race, now.toISOString());
    if (addExistingPairsResult.error) {
      send(res, 400, { message: addExistingPairsResult.error });
      return true;
    }

    db.races.unshift(race);
    db.raceRefereeAssignments = db.raceRefereeAssignments || [];
    selectedReferees.forEach((item) =>
      db.raceRefereeAssignments.push({
        id: randomUUID(),
        raceId: race.id,
        refereeUserId: item.id,
        assignedBy: user.id,
        status: 'assigned',
        assignedAt: now.toISOString(),
      })
    );

    selectedReferees.forEach((item) =>
      createNotification(
        db,
        item.id,
        'Race assigned',
        `${race.name} has been created. Registration closes at ${race.registrationClosesAt}.`
      )
    );

    await writeDb(db);
    broadcastRaceUpdate(race.id);
    send(res, 201, {
      race: {
        ...race,
        refereeUserId: referee.id,
        refereeUserIds: selectedRefereeIds.join(','),
        referee: selectedReferees.map((item) => item.name).join(', '),
      },
      entries: [],
      notifications: db.notifications || [],
    });
    return true;
  }

  const adminRaceActionMatch = url.pathname.match(
    /^\/api\/admin\/races\/([^/]+)\/(close-registration|publish|confirm-results|reject-results|complete)$/
  );

  if (req.method === 'POST' && adminRaceActionMatch) {
    const user = await requireRole(req, db, ['admin']);

    if (!user) {
      send(res, 403, { message: 'Admin access required' });
      return true;
    }

    const [, raceId, action] = adminRaceActionMatch;
    const race = db.races.find((item) => item.id === raceId);

    if (!race) {
      send(res, 404, { message: 'Race not found' });
      return true;
    }

    const entries = (db.raceEntries || []).filter(
      (entry) => entry.raceId === race.id && entry.status === 'approved'
    );

    if (action === 'close-registration') {
      if (entries.length > MAX_RACE_FIELD_SIZE) {
        send(res, 400, {
          message: `A race can have at most ${MAX_RACE_FIELD_SIZE} horses and ${MAX_RACE_FIELD_SIZE} jockeys on the track.`,
        });
        return true;
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

      sortedEntries.forEach((entry, index) => {
        const horse = db.horses.find((item) => item.id === entry.horseId);
        const profile = (db.jockeyProfiles || []).find(
          (item) => item.userId === entry.jockeyUserId
        );
        const prepared = computeRaceHandicap(horse, profile, race);

        entry.lane = index + 1;
        entry.ratingSnapshot = prepared.rating;
        entry.handicap = prepared.handicap;
        entry.preRaceStatus = 'ready-for-referee';
      });

      raceRefereeIds(db, race)
        .forEach((refereeId) =>
          createNotification(
            db,
            refereeId,
            'Race registration closed',
            `${race.name} is ready for referee review. Starting gates, rating snapshots and handicap have been assigned.`
          )
        );
    }

    if (action === 'publish') {
      if (!['registration-closed', 'published'].includes(race.status)) {
        send(res, 400, { message: 'Close registration before publishing the race' });
        return true;
      }

      race.status = 'published';
      race.updatedAt = new Date().toISOString();
      entries.forEach((entry) => {
        const horse = db.horses.find((item) => item.id === entry.horseId);
        createNotification(
          db,
          horse?.ownerUserId,
          'Race published',
          `${race.name} has been published. Gate ${entry.lane}, rating ${entry.ratingSnapshot || 'TBD'}, handicap ${entry.handicap}kg.`
        );
        createNotification(
          db,
          entry.jockeyUserId,
          'Race published',
          `${race.name} has been published. Gate ${entry.lane}, rating ${entry.ratingSnapshot || 'TBD'}, handicap ${entry.handicap}kg.`
        );
      });
    }

    if (action === 'confirm-results') {
      if (race.resultStatus !== 'submitted') {
        send(res, 400, { message: 'Referee must submit results before Admin confirmation' });
        return true;
      }

      race.status = 'finished';
      race.resultStatus = 'approved';
      race.updatedAt = new Date().toISOString();

      entries.forEach((entry) => {
        entry.resultStatus = 'official';
      });

      const recipientIds = new Set();

      entries.forEach((entry) => {
        const horse = db.horses.find((item) => item.id === entry.horseId);
        if (horse?.ownerUserId) recipientIds.add(horse.ownerUserId);
        if (entry.jockeyUserId) recipientIds.add(entry.jockeyUserId);
      });

      raceRefereeIds(db, race).forEach((refereeId) => recipientIds.add(refereeId));

      db.users
        .filter((item) => item.role === 'spectator')
        .forEach((spectator) => recipientIds.add(spectator.id));

      recipientIds.forEach((recipientId) =>
        createNotification(
          db,
          recipientId,
          'Official results published',
          `${race.name} official results have been approved by Admin and published for viewing.`
        )
      );
    }

    if (action === 'reject-results') {
      race.resultStatus = 'rejected';
      race.updatedAt = new Date().toISOString();
      entries.forEach((entry) => {
        entry.resultStatus = 'draft';
      });
    }

    if (action === 'complete') {
      if (race.status !== 'finished') {
        send(res, 400, { message: 'Confirm results before completing awards' });
        return true;
      }

      race.status = 'completed';
      race.awardsPublished = true;
      race.updatedAt = new Date().toISOString();
    }

    await writeDb(db);
    broadcastRaceUpdate(race.id);
    send(res, 200, {
      race,
      entries: publicRaceEntries(db).filter((entry) => entry.raceId === race.id),
      notifications: db.notifications || [],
    });
    return true;
  }

  const approvalMatch = url.pathname.match(
    /^\/api\/admin\/approvals\/(horse|account|jockey|jockeyTournament|raceEntry|pairing)\/([^/]+)$/
  );

  if (req.method === 'POST' && approvalMatch) {
    const user = await requireRole(req, db, ['admin']);

    if (!user) {
      send(res, 403, { message: 'Admin access required' });
      return true;
    }

    const [, entityType, id] = approvalMatch;
    const { decision } = await readBody(req);
    const raceIdsToBroadcast = new Set();

    if (!['approved', 'rejected'].includes(decision)) {
      send(res, 400, { message: 'Decision must be approved or rejected' });
      return true;
    }

    if (entityType === 'horse') {
      const horse = db.horses.find((item) => item.id === id);

      if (!horse) {
        send(res, 404, { message: 'Horse approval not found' });
        return true;
      }

      horse.status = decision;
      horse.updatedAt = new Date().toISOString();

      createNotification(
        db,
        horse.ownerUserId,
        decision === 'approved' ? 'Horse approved' : 'Horse rejected',
        `${horse.name} has been ${decision} by Admin.`
      );
    }

    if (entityType === 'jockey') {
      const jockey = db.users.find((item) => item.id === id && item.role === 'jockey');

      if (!jockey) {
        send(res, 404, { message: 'Jockey approval not found' });
        return true;
      }

      jockey.status = decision === 'approved' ? 'active' : 'rejected';
      jockey.updatedAt = new Date().toISOString();

      createNotification(
        db,
        jockey.id,
        decision === 'approved' ? 'Jockey account approved' : 'Jockey account rejected',
        `Your jockey application has been ${decision} by Admin.`
      );
    }

    if (entityType === 'account') {
      const account = db.users.find(
        (item) =>
          item.id === id &&
          ['owner', 'jockey', 'referee'].includes(item.role) &&
          item.status === 'pending'
      );

      if (!account) {
        send(res, 404, { message: 'Account approval request not found' });
        return true;
      }

      account.status = decision === 'approved' ? 'active' : 'rejected';
      account.updatedAt = new Date().toISOString();

      createNotification(
        db,
        account.id,
        decision === 'approved' ? 'Account approved' : 'Account rejected',
        decision === 'approved'
          ? 'Admin approved your account. You can now log in.'
          : 'Admin rejected your account request.'
      );
    }

    if (entityType === 'jockeyTournament') {
      const registration = (db.jockeyTournamentRegistrations || []).find(
        (item) => item.id === id && item.status === 'pending'
      );

      if (!registration) {
        send(res, 404, { message: 'Jockey tournament registration not found' });
        return true;
      }

      registration.status = decision;
      registration.reviewedAt = new Date().toISOString();

      const tournament = db.tournaments.find(
        (item) => item.id === registration.tournamentId
      );

      createNotification(
        db,
        registration.jockeyUserId,
        decision === 'approved'
          ? 'Tournament participation approved'
          : 'Tournament participation rejected',
        `${tournament?.name || 'Tournament'} participation has been ${decision}.`
      );
    }

    if (entityType === 'raceEntry') {
      const entry = (db.raceEntries || []).find(
        (item) => item.id === id && item.status === 'pending-approval'
      );

      if (!entry) {
        send(res, 404, { message: 'Horse race entry not found' });
        return true;
      }

      const horse = db.horses.find((item) => item.id === entry.horseId);
      const race = db.races.find((item) => item.id === entry.raceId);

      if (decision === 'approved') {
        const approvedCount = approvedRaceEntries(db, entry.raceId).filter(
          (item) => item.id !== entry.id
        ).length;

        if (approvedCount >= MAX_RACE_FIELD_SIZE) {
          send(res, 400, {
            message: `This race already has ${MAX_RACE_FIELD_SIZE} approved horses. Reject or remove an entry before approving another one.`,
          });
          return true;
        }
      }

      entry.status = decision === 'approved' ? 'approved' : 'rejected';

      if (race) {
        race.participants = approvedRaceEntries(db, race.id).length;
        raceIdsToBroadcast.add(race.id);
      }

      createNotification(
        db,
        horse?.ownerUserId,
        decision === 'approved' ? 'Race entry approved' : 'Race entry rejected',
        `${horse?.name || 'Horse'} for ${race?.name || 'race'} has been ${decision}.`
      );

      createNotification(
        db,
        entry.jockeyUserId,
        decision === 'approved' ? 'Race entry approved' : 'Race entry rejected',
        `${horse?.name || 'Horse'} for ${race?.name || 'race'} has been ${decision}.`
      );
    }

    if (entityType === 'pairing') {
      const invitation = (db.jockeyInvitations || []).find(
        (item) =>
          item.id === id &&
          item.status === 'accepted' &&
          item.adminStatus === 'pending'
      );

      if (!invitation) {
        send(res, 404, { message: 'Horse-Jockey pairing approval not found' });
        return true;
      }

      const horse = db.horses.find((item) => item.id === invitation.horseId);
      const registration = (db.horseTournamentRegistrations || []).find(
        (item) => item.invitationId === invitation.id
      );
      const targetLabel = invitation.tournamentId
        ? tournamentName(db, invitation.tournamentId)
        : raceName(db, invitation.raceId);

      if (decision === 'approved') {
        if (invitation.tournamentId) {
          const addResult = addPairToTournamentRaces(
            db,
            invitation,
            registration,
            new Date().toISOString()
          );

          if (addResult.error) {
            send(res, 400, { message: addResult.error });
            return true;
          }

          addResult.races.forEach((race) => raceIdsToBroadcast.add(race.id));
        }

        invitation.adminStatus = decision;

        if (registration) {
          registration.status = 'approved';
          registration.reviewedAt = new Date().toISOString();
        }

        if (horse) {
          horse.jockeyConfirmation = 'confirmed';
          horse.updatedAt = new Date().toISOString();
        }

        if (!invitation.tournamentId && invitation.raceId) {
          db.raceEntries = db.raceEntries || [];
          const race = db.races.find((item) => item.id === invitation.raceId);

          if (!race) {
            send(res, 404, { message: 'Race not found' });
            return true;
          }

          const alreadyEntered = db.raceEntries.some(
            (entry) =>
              entry.raceId === invitation.raceId &&
              entry.horseId === invitation.horseId &&
              nonRejectedEntry(entry)
          );

          if (!alreadyEntered) {
            const approvedCount = approvedRaceEntries(
              db,
              invitation.raceId
            ).length;

            if (approvedCount >= MAX_RACE_FIELD_SIZE) {
              send(res, 400, {
                message: `This race already has ${MAX_RACE_FIELD_SIZE} approved horses. Reject or remove an entry before approving another one.`,
              });
              return true;
            }

            addPairToRace(
              db,
              race,
              registrationPair(null, invitation),
              new Date().toISOString()
            );
          }

          if (race) {
            race.participants = approvedRaceEntries(db, race.id).length;
            raceIdsToBroadcast.add(race.id);
          }
        }

        createNotification(
          db,
          invitation.ownerUserId,
          invitation.tournamentId
            ? 'Pairing approved for tournament'
            : 'Pairing approved for race',
          `Admin approved ${horse?.name || 'your horse'} with ${jockeyName(db, invitation.jockeyUserId)} for ${targetLabel}.`
        );

        createNotification(
          db,
          invitation.jockeyUserId,
          invitation.tournamentId
            ? 'You are approved for the tournament'
            : 'You are approved for the race',
          `Admin approved your assignment to ride ${horse?.name || 'the horse'} in ${targetLabel}.`
        );
      } else {
        invitation.adminStatus = decision;

        if (registration) {
          registration.status = 'rejected';
          registration.reviewedAt = new Date().toISOString();
        }

        if (horse) {
          horse.jockeyConfirmation = 'waiting-owner';
          horse.updatedAt = new Date().toISOString();
        }

        createNotification(
          db,
          invitation.ownerUserId,
          invitation.tournamentId
            ? 'Pairing rejected for tournament'
            : 'Pairing rejected for race',
          `Admin rejected the ${horse?.name || 'horse'} + ${jockeyName(db, invitation.jockeyUserId)} assignment for ${targetLabel}.`
        );

        createNotification(
          db,
          invitation.jockeyUserId,
          invitation.tournamentId
            ? 'Tournament assignment rejected'
            : 'Race assignment rejected',
          `Admin rejected your assignment for ${horse?.name || 'the horse'} in ${targetLabel}.`
        );
      }
    }

    await writeDb(db);
    raceIdsToBroadcast.forEach((raceId) => broadcastRaceUpdate(raceId));
    send(res, 200, {
      ok: true,
      approvals: formatApprovals(db),
      notifications: db.notifications || [],
    });
    return true;
  }

  return false;
};
