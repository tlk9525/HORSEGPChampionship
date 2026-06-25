import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import { requireRole } from '../services/authService.js';
import {
  canRefereeRace,
  findEntry,
  publicRaceEntries,
} from '../services/domainService.js';
import { broadcastRaceUpdate } from '../services/liveRaceEvents.js';
import { createNotification } from '../services/notificationService.js';
import { recordRaceAction } from '../services/raceAuditService.js';
import { computePostRaceRating } from '../services/handicapService.js';

const finishTimeMs = (value) => {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?$/);
  if (!match) return Number.NaN;
  const [, minutes, seconds, fraction = '0'] = match;
  if (Number(seconds) >= 60) return Number.NaN;
  return Number(minutes) * 60000 + Number(seconds) * 1000 + Number(fraction.padEnd(3, '0'));
};

export const createRefereeRoutes = (
  getDb,
  writeDb,
  persistOfficialResults,
  persistEntryResult,
  persistEntryReadiness,
  persistRaceAction
) => {
  const app = new Hono();

  // Chỉ trọng tài được phân công mới có quyền điều hành và công bố kết quả.
  app.use('*', async (c, next) => {
    const db = await getDb();
    const user = await requireRole(c.req.raw, db, ['referee']);
    if (!user) return c.json({ message: 'Referee access required' }, 403);
    c.set('user', user);
    c.set('db', db);
    await next();
  });

  // Bắt đầu hoặc nộp kết quả cuộc đua
  app.post('/races/:raceId/:action', async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const raceId = c.req.param('raceId');
    const action = c.req.param('action');

    if (!['start', 'submit-results'].includes(action)) {
      return c.json({ message: 'Invalid action' }, 400);
    }

    const race = db.races.find((item) => item.id === raceId);
    if (!race || !canRefereeRace(race, user, db)) {
      return c.json({ message: 'Assigned race not found' }, 404);
    }

    const existingNotificationIds = new Set(
      (db.notifications || []).map((notification) => notification.id)
    );
    const existingActionLogIds = new Set(
      (db.raceActionLogs || []).map((log) => log.id)
    );
    let affectedEntries = [];
    let affectedTournament = null;

    if (action === 'start') {
      if (race.status !== 'published') {
        return c.json({ message: 'Race must be published before it can start' }, 400);
      }
      const scheduledStart = new Date(`${race.date}T${race.time}`).getTime();
      if (Number.isFinite(scheduledStart) && Date.now() < scheduledStart) {
        return c.json({ message: 'Race cannot start before its scheduled date and time' }, 400);
      }

      const raceEntries = (db.raceEntries || []).filter(
        (entry) => entry.raceId === race.id && entry.status === 'approved'
      );
      affectedEntries = raceEntries;
      const readyEntries = raceEntries.filter(
        (entry) => entry.preRaceStatus === 'ready' && !entry.disqualified
      );
      const uncheckedEntries = raceEntries.filter(
        (entry) => !['ready', 'absent'].includes(entry.preRaceStatus) && !entry.disqualified
      );

      if (readyEntries.length === 0) {
        return c.json({ message: 'Mark at least one participant Ready before starting the race' }, 400);
      }
      if (uncheckedEntries.length > 0) {
        return c.json({ message: 'Check every participant as Ready or Absent before starting the race' }, 400);
      }

      const fromStatus = race.status;
      race.status = 'in-progress';
      race.updatedAt = new Date().toISOString();
      raceEntries.forEach((entry) => { if (entry.preRaceStatus === 'absent') entry.disqualified = true; });
      const tournament = db.tournaments.find((item) => item.id === race.tournamentId);
      affectedTournament = tournament || null;
      if (tournament && tournament.status !== 'completed') {
        tournament.status = 'active';
        tournament.updatedAt = new Date().toISOString();
      }
      db.users
        .filter((item) => item.role === 'admin')
        .forEach((admin) =>
          createNotification(db, admin.id, 'Race started', `${race.name} has been started by ${user.name}.`)
        );
      recordRaceAction(db, {
        raceId: race.id,
        userId: user.id,
        action: 'start-race',
        fromStatus,
        toStatus: race.status,
        details: `Started by assigned referee ${user.name}`,
      });

    }

    if (action === 'submit-results') {
      if (race.status !== 'in-progress') {
        return c.json({ message: 'Race must be in progress before results are submitted' }, 400);
      }

      const raceEntries = (db.raceEntries || []).filter(
        (entry) => entry.raceId === race.id && entry.status === 'approved'
      );
      affectedEntries = raceEntries;
      const competingEntries = raceEntries.filter(
        (entry) => entry.preRaceStatus !== 'absent' && !entry.disqualified
      );
      const entriesMissingResult = competingEntries.filter(
        (entry) => !entry.position || !entry.finishTime
      );
      const positions = competingEntries.map((entry) => Number(entry.position)).filter(Number.isInteger);
      const uniquePositions = new Set(positions);
      const orderedResults = [...competingEntries].sort(
        (a, b) => Number(a.position) - Number(b.position)
      );
      const finishTimes = orderedResults.map((entry) => finishTimeMs(entry.finishTime));

      if (entriesMissingResult.length > 0) {
        return c.json({ message: 'Record a finishing position and finish time for every competing participant before submitting results' }, 400);
      }
      if (uniquePositions.size !== positions.length) {
        return c.json({ message: 'Each competing participant must have a unique finishing position' }, 400);
      }
      if (finishTimes.some((time) => !Number.isFinite(time))) {
        return c.json({ message: 'Finish time must use MM:SS or MM:SS.mmm format' }, 400);
      }
      if (finishTimes.some((time, index) => index > 0 && time <= finishTimes[index - 1])) {
        return c.json({ message: 'Finish times must increase in finishing-position order' }, 400);
      }

      const fromStatus = race.status;
      race.status = 'finished';
      race.resultStatus = 'official';
      race.awardsPublished = true;
      race.updatedAt = new Date().toISOString();
      raceEntries.forEach((entry) => {
        entry.resultStatus = entry.preRaceStatus === 'absent' || entry.disqualified
          ? 'disqualified'
          : 'official';
      });
      competingEntries.forEach((entry) => {
        const result = computePostRaceRating(entry, competingEntries);
        const horse = db.horses.find((item) => item.id === entry.horseId);
        entry.ratingChange = result.ratingChange;
        entry.postRaceRating = result.postRaceRating;
        entry.ratingLog = result.calcLog;
        if (horse) {
          horse.overallRating = result.postRaceRating;
          horse.updatedAt = race.updatedAt;
        }
      });

      const recipientIds = new Set();
      raceEntries.forEach((entry) => {
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
          `${race.name} results were confirmed and published by referee ${user.name}.`
        )
      );
      recordRaceAction(db, {
        raceId: race.id,
        userId: user.id,
        action: 'publish-results',
        fromStatus,
        toStatus: race.status,
        details: `${competingEntries.length} official results published by ${user.name}`,
      });

      const tournament = db.tournaments.find((item) => item.id === race.tournamentId);
      affectedTournament = tournament || null;
      const racesInTournament = (db.races || []).filter(
        (item) => item.tournamentId === race.tournamentId
      );
      if (
        tournament &&
        racesInTournament.length > 0 &&
        racesInTournament.every((item) => ['finished', 'completed'].includes(item.status))
      ) {
        tournament.status = 'completed';
        tournament.updatedAt = new Date().toISOString();
      }
    }

    if (persistRaceAction) {
      await persistRaceAction({
        race,
        raceEntries: affectedEntries,
        tournament: affectedTournament,
        notifications: (db.notifications || []).filter(
          (notification) => !existingNotificationIds.has(notification.id)
        ),
        actionLogs: (db.raceActionLogs || []).filter(
          (log) => !existingActionLogIds.has(log.id)
        ),
      });
    } else {
      await writeDb(db);
    }
    if (action === 'submit-results' && persistOfficialResults && !persistRaceAction) {
      await persistOfficialResults(race.id, race.updatedAt);
    }
    broadcastRaceUpdate(race.id);
    const persistedDb = await getDb();
    const persistedRace = persistedDb.races.find((item) => item.id === race.id) || race;
    const persistedEntries = publicRaceEntries(persistedDb).filter((item) => item.raceId === race.id);

    if (
      action === 'submit-results' &&
      (persistedRace.status !== 'finished' || persistedRace.resultStatus !== 'official')
    ) {
      return c.json(
        { message: 'Results were validated but could not be persisted. Please retry publishing.' },
        500
      );
    }

    return c.json({
      race: persistedRace,
      entries: persistedEntries,
    });
  });

  // Đánh dấu một thí sinh là sẵn sàng thi đấu hoặc vắng mặt
  app.post('/race-entries/:entryId/readiness/:status', async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const entryId = c.req.param('entryId');
    const readiness = c.req.param('status');

    if (!['ready', 'absent'].includes(readiness)) {
      return c.json({ message: 'Invalid readiness status' }, 400);
    }

    const entry = findEntry(db, entryId);
    const race = db.races.find((item) => item.id === entry?.raceId);

    if (!entry) {
      return c.json({ message: 'Entry not found' }, 404);
    }
    if (!race) {
      return c.json({ message: 'Race not found' }, 404);
    }
    if (!canRefereeRace(race, user, db)) {
      return c.json({ message: 'Not authorized as referee' }, 403);
    }
    if (entry.status !== 'approved') {
      return c.json({ message: 'Only approved race entries can be checked' }, 400);
    }
    if (race.status !== 'published') {
      return c.json({ message: 'Readiness can only be changed before a published race starts' }, 400);
    }

    entry.preRaceStatus = readiness === 'ready' ? 'ready' : 'absent';
    entry.disqualified = readiness === 'absent';

    if (persistEntryReadiness) {
      await persistEntryReadiness(entry);
    } else {
      await writeDb(db);
    }
    broadcastRaceUpdate(race.id);
    return c.json({
      entry,
      entries: publicRaceEntries(db).filter((item) => item.raceId === race.id),
    });
  });

  // Ghi kết quả cho một thí sinh: vị trí, thời gian vào đích, ghi chú và vi phạm
  app.post('/race-entries/:entryId/result', async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const entryId = c.req.param('entryId');

    const entry = findEntry(db, entryId);
    const race = db.races.find((item) => item.id === entry?.raceId);

    if (!entry) {
      return c.json({ message: 'Entry not found' }, 404);
    }
    if (!race) {
      return c.json({ message: 'Race not found' }, 404);
    }
    if (!canRefereeRace(race, user, db)) {
      return c.json({ message: 'Not authorized as referee' }, 403);
    }
    if (entry.status !== 'approved') {
      return c.json({ message: 'Only approved race entries can receive results' }, 400);
    }
    if (race.status !== 'in-progress') {
      return c.json({ message: 'Results can only be recorded while the race is in progress' }, 400);
    }
    if (entry.preRaceStatus === 'absent' || entry.disqualified) {
      return c.json({ message: 'Absent participants cannot compete' }, 400);
    }

    const { position, finishTime, notes, violationNotes } = await c.req.json();
    const numericPosition = Number(position);
    const raceEntries = (db.raceEntries || []).filter(
      (item) => item.raceId === race.id && item.status === 'approved'
    );
    const competingEntries = raceEntries.filter(
      (item) => item.preRaceStatus !== 'absent' && !item.disqualified
    );
    const duplicatePosition = competingEntries.some(
      (item) => item.id !== entry.id && Number(item.position) === numericPosition
    );

    if (!Number.isInteger(numericPosition) || numericPosition < 1 || numericPosition > competingEntries.length) {
      return c.json({ message: `Position must be between 1 and ${competingEntries.length}` }, 400);
    }
    if (duplicatePosition) {
      return c.json({ message: `Position ${numericPosition} is already recorded for another participant` }, 400);
    }
    if (!Number.isFinite(finishTimeMs(finishTime))) {
      return c.json({ message: 'Finish time must use MM:SS or MM:SS.mmm format' }, 400);
    }

    entry.position = numericPosition;
    entry.finishTime = finishTime || '';
    entry.notes = notes || '';
    entry.violationNotes = violationNotes || '';
    entry.resultStatus = 'draft';

    let reportToPersist = null;

    if (String(violationNotes || '').trim()) {
      db.refereeReports = db.refereeReports || [];
      const existingReport = db.refereeReports.find(
        (report) => report.raceEntryId === entry.id && report.refereeUserId === user.id && report.reportType === 'violation'
      );
      if (existingReport) {
        existingReport.description = violationNotes;
        existingReport.violation = violationNotes;
        existingReport.status = 'submitted';
        existingReport.reviewedAt = null;
        reportToPersist = existingReport;
      } else {
        reportToPersist = {
          id: randomUUID(),
          raceId: race.id,
          raceEntryId: entry.id,
          refereeUserId: user.id,
          reportType: 'violation',
          description: violationNotes,
          violation: violationNotes,
          status: 'submitted',
          createdAt: new Date().toISOString(),
          reviewedAt: null,
        };
        db.refereeReports.unshift(reportToPersist);
      }
    }

    if (persistEntryResult) {
      await persistEntryResult(entry, reportToPersist);
    } else {
      await writeDb(db);
    }
    broadcastRaceUpdate(race.id);
    return c.json({
      entry,
      entries: publicRaceEntries(db).filter((item) => item.raceId === race.id),
    });
  });

  return app;
};
