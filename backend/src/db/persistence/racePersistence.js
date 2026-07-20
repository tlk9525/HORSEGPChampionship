import {
  insertNotifications,
  insertRaceActionLogs,
  nowIso,
} from './persistenceHelpers.js';
import { applyCreditTransactionsIdempotent } from './creditPersistence.js';

export class RaceStateConflictError extends Error {
  constructor(message = 'Race state changed by another request') {
    super(message);
    this.name = 'RaceStateConflictError';
    this.code = 'RACE_STATE_CONFLICT';
  }
}

export const createRacePersistence = ({ ensureRuntimeSchema, getPool }) => {
  const persistCreatedTournament = async (tournament, notifications = []) => {
    await ensureRuntimeSchema();

    const client = await getPool().connect();

    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO "tournaments" (
          "id", "name", "status", "startDate", "finalDate", "location",
          "prizePool", "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          tournament.id,
          tournament.name,
          tournament.status,
          tournament.startDate || null,
          tournament.finalDate || null,
          tournament.location || null,
          Number(tournament.prizePool || 0),
          tournament.createdAt || nowIso(),
          tournament.updatedAt || tournament.createdAt || nowIso(),
        ],
      );

      await insertNotifications(client, notifications);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  // Cập nhật một kết quả race entry bằng row-level update để tránh writeDb ghi lại toàn bộ database.
  const persistRaceEntryResult = async (entry, report = null) => {
    await ensureRuntimeSchema();

    const client = await getPool().connect();

    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE "raceEntries"
         SET "position" = $2,
             "finishTime" = $3,
             "notes" = $4,
             "violationNotes" = $5,
             "resultStatus" = $6,
             "resultOutcome" = $7,
             "incidentReason" = $8,
             "disqualified" = $9
         WHERE "id" = $1`,
        [
          entry.id,
          entry.position ?? null,
          entry.finishTime || '',
          entry.notes || '',
          entry.violationNotes || '',
          entry.resultStatus || 'draft',
          entry.resultOutcome || 'finished',
          entry.incidentReason || '',
          Boolean(entry.disqualified),
        ],
      );

      if (report) {
        await client.query(
          `INSERT INTO "refereeReports" (
            "id",
            "raceId",
            "raceEntryId",
            "refereeUserId",
            "reportType",
            "description",
            "violation",
            "status",
            "createdAt",
            "reviewedAt"
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT ("id") DO UPDATE
          SET "description" = EXCLUDED."description",
              "violation" = EXCLUDED."violation",
              "status" = EXCLUDED."status",
              "reviewedAt" = EXCLUDED."reviewedAt"`,
          [
            report.id,
            report.raceId,
            report.raceEntryId || null,
            report.refereeUserId,
            report.reportType || 'violation',
            report.description || '',
            report.violation || '',
            report.status || 'submitted',
            report.createdAt || nowIso(),
            report.reviewedAt || null,
          ],
        );
      } else if (!String(entry.violationNotes || '').trim()) {
        await client.query(
          `UPDATE "refereeReports"
           SET "status" = 'dismissed',
               "reviewedAt" = NOW()
           WHERE "raceEntryId" = $1
             AND "reportType" = 'violation'
             AND "status" IN ('draft', 'submitted')`,
          [entry.id],
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  // Cập nhật readiness của một race entry bằng row-level update cho thao tác Referee nhanh hơn.
  const persistRaceEntryReadiness = async (entry) => {
    await ensureRuntimeSchema();

    await getPool().query(
      `UPDATE "raceEntries"
       SET "preRaceStatus" = $2,
           "disqualified" = $3,
           "status" = $4,
           "resultStatus" = $5
       WHERE "id" = $1`,
      [
        entry.id,
        entry.preRaceStatus || 'pending',
        Boolean(entry.disqualified),
        entry.status || 'approved',
        entry.resultStatus || 'draft',
      ],
    );
  };

  // Lưu các thay đổi vận hành race trong một transaction nhỏ, không rewrite toàn DB.
  const persistRefereeRaceAction = async ({
    race,
    raceEntries = [],
    tournament = null,
    notifications = [],
    actionLogs = [],
  }) => {
    await ensureRuntimeSchema();

    const client = await getPool().connect();

    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE "races"
         SET "status" = $2,
             "resultStatus" = $3,
             "awardsPublished" = $4,
             "replayTimeline" = $5,
             "updatedAt" = $6
         WHERE "id" = $1`,
        [
          race.id,
          race.status,
          race.resultStatus || 'draft',
          Boolean(race.awardsPublished),
          race.replayTimeline || null,
          race.updatedAt || nowIso(),
        ],
      );

      if (tournament) {
        await client.query(
          `UPDATE "tournaments"
           SET "status" = $2,
               "updatedAt" = $3
           WHERE "id" = $1`,
          [tournament.id, tournament.status, tournament.updatedAt || nowIso()],
        );
      }

      for (const entry of raceEntries) {
        await client.query(
          `UPDATE "raceEntries"
           SET "preRaceStatus" = $2,
               "disqualified" = $3,
               "resultStatus" = $4,
               "resultOutcome" = $5,
               "position" = $6,
               "finishTime" = $7,
               "notes" = $8,
               "incidentReason" = $9,
               "violationNotes" = $10
           WHERE "id" = $1`,
          [
            entry.id,
            entry.preRaceStatus || 'pending',
            Boolean(entry.disqualified),
            entry.resultStatus || 'draft',
            entry.resultOutcome || 'finished',
            entry.position ?? null,
            entry.finishTime || '',
            entry.notes || '',
            entry.incidentReason || '',
            entry.violationNotes || '',
          ],
        );
      }

      await insertNotifications(client, notifications);
      await insertRaceActionLogs(client, actionLogs);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  // Lưu thao tác Admin trên race bằng row-level update để tránh rewrite toàn DB.
  const persistAdminRaceAction = async ({
    race,
    expectedStatus = null,
    raceEntries = [],
    horses = [],
    tournament = null,
    bets = [],
    creditTransactions = [],
    notifications = [],
    actionLogs = [],
  }) => {
    await ensureRuntimeSchema();

    const client = await getPool().connect();

    try {
      await client.query('BEGIN');
      const { rows: lockedRaceRows } = await client.query(
        `SELECT "status"
         FROM "races"
         WHERE "id" = $1
         FOR UPDATE`,
        [race.id],
      );
      if (!lockedRaceRows.length) {
        throw new RaceStateConflictError('Race no longer exists');
      }
      if (expectedStatus && lockedRaceRows[0].status !== expectedStatus) {
        throw new RaceStateConflictError(
          `Race state changed from ${expectedStatus} to ${lockedRaceRows[0].status}`,
        );
      }

      await client.query(
        `UPDATE "races"
         SET "status" = $2,
             "participants" = $3,
             "ownerConfirmed" = $4,
             "jockeyConfirmed" = $5,
             "resultStatus" = $6,
             "awardsPublished" = $7,
             "replayTimeline" = $8,
             "updatedAt" = $9
         WHERE "id" = $1`,
        [
          race.id,
          race.status,
          Number(race.participants || 0),
          Number(race.ownerConfirmed || 0),
          Number(race.jockeyConfirmed || 0),
          race.resultStatus || 'draft',
          Boolean(race.awardsPublished),
          race.replayTimeline || null,
          race.updatedAt || nowIso(),
        ],
      );

      if (tournament) {
        await client.query(
          `UPDATE "tournaments"
           SET "status" = $2,
               "updatedAt" = $3
           WHERE "id" = $1`,
          [tournament.id, tournament.status, tournament.updatedAt || nowIso()],
        );
      }

      for (const entry of raceEntries) {
        await client.query(
          `UPDATE "raceEntries"
           SET "lane" = $2,
               "handicap" = $3,
               "ratingSnapshot" = $4,
               "ratingChange" = $5,
               "postRaceRating" = $6,
               "preRaceStatus" = $7,
               "disqualified" = $8,
               "status" = $9,
               "resultStatus" = $10,
               "resultOutcome" = $11,
               "position" = $12,
               "finishTime" = $13,
               "notes" = $14,
               "incidentReason" = $15,
               "violationNotes" = $16
           WHERE "id" = $1`,
          [
            entry.id,
            entry.lane ?? null,
            entry.handicap ?? 0,
            entry.ratingSnapshot ?? 0,
            entry.ratingChange ?? 0,
            entry.postRaceRating ?? 0,
            entry.preRaceStatus || 'pending',
            Boolean(entry.disqualified),
            entry.status || 'approved',
            entry.resultStatus || 'draft',
            entry.resultOutcome || 'finished',
            entry.position ?? null,
            entry.finishTime || '',
            entry.notes || '',
            entry.incidentReason || '',
            entry.violationNotes || '',
          ],
        );
      }

      for (const horse of horses) {
        await client.query(
          `UPDATE "horses"
           SET "overallRating" = $2,
               "updatedAt" = $3
           WHERE "id" = $1`,
          [horse.id, horse.overallRating ?? 75, horse.updatedAt || nowIso()],
        );
      }

      for (const bet of bets) {
        const { rows: lockedBetRows } = await client.query(
          `SELECT "status"
           FROM "bets"
           WHERE "id" = $1
           FOR UPDATE`,
          [bet.id],
        );
        if (!lockedBetRows.length || lockedBetRows[0].status !== 'pending') {
          throw new RaceStateConflictError(
            `Bet ${bet.id} was already changed by another request`,
          );
        }

        await client.query(
          `UPDATE "bets"
           SET "status" = $2,
               "payout" = $3,
               "settledAt" = $4
           WHERE "id" = $1`,
          [
            bet.id,
            bet.status || 'pending',
            Number(bet.payout ?? 0),
            bet.settledAt || null,
          ],
        );
      }

      await applyCreditTransactionsIdempotent(client, creditTransactions);

      await insertNotifications(client, notifications);
      await insertRaceActionLogs(client, actionLogs);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  return {
    persistCreatedTournament,
    persistRaceEntryResult,
    persistRaceEntryReadiness,
    persistRefereeRaceAction,
    persistAdminRaceAction,
  };
};
