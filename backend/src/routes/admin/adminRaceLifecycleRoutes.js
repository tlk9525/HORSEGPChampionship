import {
  publicRaceEntries,
  raceRefereeIds,
} from '../../services/domainService.js';
import {
  computePostRaceRating,
  computeRaceHandicap,
  officialHorseRating,
} from '../../services/handicapService.js';
import { broadcastRaceUpdate } from '../../services/liveRaceEvents.js';
import { recordRaceAction } from '../../services/raceAuditService.js';
import { createNotification } from '../../services/notificationService.js';
import {
  buildOfficialReplayTimeline,
  buildProvisionalRaceTimeline,
} from '../../services/raceReplayTimeline.js';
import { settleRaceBets } from '../../services/bettingService.js';
import {
  cancelRace,
  minReadiedParticipants,
  raceFieldSize,
  resolveExistingRaceSchedule,
  tournamentHasEnded,
} from './adminRaceRules.js';

// Đăng ký toàn bộ transition trạng thái của race trong một module nghiệp vụ riêng.
export const registerAdminRaceLifecycleRoutes = (
  app,
  { writeDb, persistAdminRaceAction },
) => {
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

    if (!validActions.includes(action))
      return c.json({ message: 'Invalid action' }, 400);

    const race = db.races.find((item) => item.id === raceId);
    if (!race) return c.json({ message: 'Race not found' }, 404);

    const entries = (db.raceEntries || []).filter(
      (entry) => entry.raceId === race.id && entry.status === 'approved',
    );
    const approvedPairEntries = entries.filter(
      (entry) => entry.horseId && entry.jockeyUserId,
    );
    const approvedHorseCount = new Set(
      approvedPairEntries.map((entry) => entry.horseId),
    ).size;
    const approvedJockeyCount = new Set(
      approvedPairEntries.map((entry) => entry.jockeyUserId),
    ).size;
    const approvedPairCount = Math.min(
      approvedPairEntries.length,
      approvedHorseCount,
      approvedJockeyCount,
    );
    const fromStatus = race.status;
    const existingNotificationIds = new Set(
      (db.notifications || []).map((notification) => notification.id),
    );
    const existingActionLogIds = new Set(
      (db.raceActionLogs || []).map((log) => log.id),
    );
    const existingCreditTransactionIds = new Set(
      (db.creditTransactions || []).map((transaction) => transaction.id),
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

      const { date, time, registrationOpensAt, registrationClosesAt } =
        await c.req.json();
      if (!date || !time || !registrationOpensAt || !registrationClosesAt) {
        return c.json(
          {
            message:
              'Race date, start time and registration window are required',
          },
          400,
        );
      }

      const schedule = resolveExistingRaceSchedule(db, race, {
        date,
        time,
        registrationOpensAt,
        registrationClosesAt,
      });
      if (schedule.error) {
        return c.json({ message: schedule.error }, 400);
      }
      const { regOpens, regCloses } = schedule;

      const allRaceEntries = (db.raceEntries || []).filter(
        (entry) => entry.raceId === race.id,
      );
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
          if (registration.ownerUserId)
            recipientIds.add(registration.ownerUserId);
          if (registration.jockeyUserId)
            recipientIds.add(registration.jockeyUserId);
        });
      (db.jockeyRaceRegistrations || [])
        .filter((registration) => registration.raceId === race.id)
        .forEach((registration) => {
          if (registration.jockeyUserId)
            recipientIds.add(registration.jockeyUserId);
        });
      (db.jockeyInvitations || [])
        .filter((invitation) => invitation.raceId === race.id)
        .forEach((invitation) => {
          if (invitation.ownerUserId) recipientIds.add(invitation.ownerUserId);
          if (invitation.jockeyUserId)
            recipientIds.add(invitation.jockeyUserId);
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

      db.raceEntries = (db.raceEntries || []).filter(
        (entry) => entry.raceId !== race.id,
      );
      db.horseRaceRegistrations = (db.horseRaceRegistrations || []).filter(
        (registration) => registration.raceId !== race.id,
      );
      db.jockeyRaceRegistrations = (db.jockeyRaceRegistrations || []).filter(
        (registration) => registration.raceId !== race.id,
      );
      db.jockeyInvitations = (db.jockeyInvitations || []).filter(
        (invitation) => invitation.raceId !== race.id,
      );
      db.refereeReports = (db.refereeReports || []).filter(
        (report) =>
          report.raceId !== race.id && !entryIds.has(report.raceEntryId),
      );

      recipientIds.forEach((userId) =>
        createNotification(
          db,
          userId,
          'Race reset',
          `${race.name} has been reset with a new registration window and start time.`,
        ),
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
        return c.json(
          { message: 'Only an open registration can be closed' },
          400,
        );
      }
      const maxRaceEntries = raceFieldSize(db);
      if (entries.length > maxRaceEntries) {
        return c.json(
          {
            message: `A race can have at most ${maxRaceEntries} horses and ${maxRaceEntries} jockeys on the track.`,
          },
          400,
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
          400,
        );
      }
      if (assignedRefereeIds.length === 0) {
        return c.json(
          {
            message: 'Assign at least one referee before closing registration',
          },
          400,
        );
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
        createNotification(
          db,
          refereeId,
          'Race registration closed',
          `${race.name} is ready for referee review. Starting gates, rating snapshots and carried weights have been assigned.`,
        ),
      );
    }

    if (action === 'publish') {
      if (!['registration-closed', 'published'].includes(race.status)) {
        return c.json(
          { message: 'Close registration before publishing the race' },
          400,
        );
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
          400,
        );
      }
      if (assignedRefereeIds.length === 0) {
        return c.json(
          { message: 'Assign at least one referee before publishing the race' },
          400,
        );
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
        return c.json(
          { message: 'Race must be published before it can start' },
          400,
        );
      }

      const readyEntries = entries.filter(
        (entry) => entry.preRaceStatus === 'ready' && !entry.disqualified,
      );
      const uncheckedEntries = entries.filter(
        (entry) =>
          !['ready', 'absent'].includes(entry.preRaceStatus) &&
          !entry.disqualified,
      );

      if (readyEntries.length === 0) {
        return c.json(
          {
            message:
              'At least one participant must be checked in as Ready before starting the race',
          },
          400,
        );
      }
      if (uncheckedEntries.length > 0) {
        return c.json(
          {
            message:
              'Every participant must be marked Ready or Absent before starting the race',
          },
          400,
        );
      }
      const requiredReadyCount = minReadiedParticipants(db);
      if (readyEntries.length < requiredReadyCount) {
        const cancellation = cancelRace(db, race, entries, {
          refundReason: `${race.name} was cancelled due to insufficient participants`,
          notificationMessage: `${race.name} has been cancelled due to insufficient participants. Only ${readyEntries.length} participants were marked Ready, but at least ${requiredReadyCount} are required.`,
        });
        settledBets = cancellation.settledBets;
        affectedSpectators = cancellation.affectedSpectators;
      } else {
        race.status = 'in-progress';
        race.updatedAt = new Date().toISOString();
        entries.forEach((entry) => {
          if (entry.preRaceStatus === 'absent') entry.disqualified = true;
        });

        const tournament = db.tournaments.find(
          (item) => item.id === race.tournamentId,
        );
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
            `${race.name} has been started by Admin.`,
          ),
        );
      }
    }
    if (action === 'cancel-race') {
      if (['in-progress', 'finished', 'completed'].includes(race.status)) {
        return c.json(
          { message: 'The race has started and cannot be cancelled.' },
          400,
        );
      }

      const cancellation = cancelRace(db, race, entries, {
        refundReason: `${race.name} was cancelled`,
        notificationMessage: `${race.name} has been cancelled by the admin`,
      });
      settledBets = cancellation.settledBets;
      affectedSpectators = cancellation.affectedSpectators;
    }
    if (action === 'finish-race') {
      if (race.status !== 'in-progress') {
        return c.json(
          { message: 'Only an in-progress race can be finished' },
          400,
        );
      }

      race.status = 'finished';
      race.resultStatus = 'draft';
      race.awardsPublished = false;
      race.updatedAt = new Date().toISOString();
      entries.forEach((entry) => {
        entry.resultStatus =
          entry.preRaceStatus === 'absent' || entry.disqualified
            ? 'disqualified'
            : 'draft';
      });

      raceRefereeIds(db, race).forEach((refereeId) =>
        createNotification(
          db,
          refereeId,
          'Race finished',
          `${race.name} has been finished by Admin. Enter and submit the official timing draft.`,
        ),
      );
    }

    if (action === 'complete-results') {
      if (race.status !== 'finished' || race.resultStatus !== 'submitted') {
        return c.json(
          { message: 'Only submitted race results can be approved by Admin' },
          400,
        );
      }

      const competingEntries = entries.filter(
        (entry) => entry.preRaceStatus !== 'absent' && !entry.disqualified,
      );
      if (competingEntries.length === 0) {
        return c.json(
          {
            message:
              'A race needs at least one competing participant before completion',
          },
          400,
        );
      }

      const ratingResults = competingEntries.map((entry) => ({
        entry,
        result: computePostRaceRating(entry, competingEntries),
      }));
      const invalidRatingResult = ratingResults.find(
        ({ result }) =>
          result.previousRating === null ||
          (competingEntries.length >= 4 && !result.calcLog),
      );
      if (invalidRatingResult) {
        return c.json(
          {
            message: `Cannot complete results because entry ${invalidRatingResult.entry.id} has a missing or invalid rating snapshot.`,
          },
          400,
        );
      }

      race.status = 'completed';
      race.resultStatus = 'official';
      race.awardsPublished = true;
      race.updatedAt = new Date().toISOString();
      entries.forEach((entry) => {
        entry.resultStatus =
          entry.preRaceStatus === 'absent' || entry.disqualified
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
        (bet) => bet.raceId === race.id && bet.settledAt,
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
          `${race.name} results were approved by Admin and are now official.`,
        ),
      );

      const tournament = db.tournaments.find(
        (item) => item.id === race.tournamentId,
      );
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
          (transaction) => !existingCreditTransactionIds.has(transaction.id),
        ),
        notifications: (db.notifications || []).filter(
          (notification) => !existingNotificationIds.has(notification.id),
        ),
        actionLogs: (db.raceActionLogs || []).filter(
          (log) => !existingActionLogIds.has(log.id),
        ),
      });
    } else {
      await writeDb(db);
    }
    broadcastRaceUpdate(race.id);
    return c.json({
      race,
      entries: publicRaceEntries(db).filter(
        (entry) => entry.raceId === race.id,
      ),
      notifications: db.notifications || [],
    });
  });
};
