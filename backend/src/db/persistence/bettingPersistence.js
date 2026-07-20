import { randomUUID } from 'node:crypto';
import { CREDIT_TRANSACTION_TYPES } from '../../services/creditService.js';
import { nowIso } from './persistenceHelpers.js';

export const createBettingPersistence = ({ ensureRuntimeSchema, getPool }) => {
  /**
   * Atomically debit wallet credits and insert a pending bet.
   * Uses SELECT ... FOR UPDATE to prevent double-spend under concurrent requests.
   */
  const persistPlaceBet = async ({ userId, bet, amount }) => {
    await ensureRuntimeSchema();
    const client = await getPool().connect();
    const createdAt = bet.createdAt || nowIso();

    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO "wallets" ("userId", "credits", "updatedAt")
         VALUES ($1, 100, $2)
         ON CONFLICT ("userId") DO NOTHING`,
        [userId, createdAt],
      );

      const { rows: walletRows } = await client.query(
        `SELECT "credits" FROM "wallets" WHERE "userId" = $1 FOR UPDATE`,
        [userId],
      );
      const currentCredits = Number(walletRows[0]?.credits ?? 0);
      if (currentCredits < amount) {
        await client.query('ROLLBACK');
        return { ok: false, reason: 'insufficient', credits: currentCredits };
      }

      const nextCredits = currentCredits - amount;
      await client.query(
        `UPDATE "wallets"
         SET "credits" = $2, "updatedAt" = $3
         WHERE "userId" = $1`,
        [userId, nextCredits, createdAt],
      );

      await client.query(
        `INSERT INTO "bets" (
          "id", "userId", "raceId", "raceEntryId", "amount", "status", "payout", "createdAt", "settledAt"
        ) VALUES ($1, $2, $3, $4, $5, 'pending', 0, $6, NULL)`,
        [bet.id, bet.userId, bet.raceId, bet.raceEntryId, amount, createdAt],
      );

      await client.query(
        `INSERT INTO "creditTransactions" (
          "id", "userId", "type", "amount", "balanceAfter", "metadata", "createdAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          randomUUID(),
          userId,
          CREDIT_TRANSACTION_TYPES.BET_PLACED,
          -amount,
          nextCredits,
          { betId: bet.id, raceId: bet.raceId, raceEntryId: bet.raceEntryId },
          createdAt,
        ],
      );

      await client.query('COMMIT');
      return { ok: true, credits: nextCredits };
    } catch (error) {
      await client.query('ROLLBACK');
      if (error?.code === '23505') {
        return { ok: false, reason: 'duplicate' };
      }
      throw error;
    } finally {
      client.release();
    }
  };

  /**
   * Atomically cancel a pending bet and refund credits to the wallet.
   */
  const persistCancelBet = async ({ userId, betId, amount, settledAt }) => {
    await ensureRuntimeSchema();
    const client = await getPool().connect();
    const now = settledAt || nowIso();

    try {
      await client.query('BEGIN');

      const { rows: betRows } = await client.query(
        `SELECT "id", "status", "amount", "raceId"
         FROM "bets"
         WHERE "id" = $1 AND "userId" = $2
         FOR UPDATE`,
        [betId, userId],
      );
      const bet = betRows[0];
      if (!bet) {
        await client.query('ROLLBACK');
        return { ok: false, reason: 'not_found' };
      }
      if (bet.status !== 'pending') {
        await client.query('ROLLBACK');
        return { ok: false, reason: 'not_pending' };
      }

      const refundAmount = Number(bet.amount ?? amount ?? 0);

      await client.query(
        `INSERT INTO "wallets" ("userId", "credits", "updatedAt")
         VALUES ($1, 100, $2)
         ON CONFLICT ("userId") DO NOTHING`,
        [userId, now],
      );

      const { rows: walletRows } = await client.query(
        `SELECT "credits" FROM "wallets" WHERE "userId" = $1 FOR UPDATE`,
        [userId],
      );
      const nextCredits = Number(walletRows[0]?.credits ?? 0) + refundAmount;

      await client.query(
        `UPDATE "wallets"
         SET "credits" = $2, "updatedAt" = $3
         WHERE "userId" = $1`,
        [userId, nextCredits, now],
      );

      await client.query(
        `UPDATE "bets"
         SET "status" = 'cancelled', "settledAt" = $2
         WHERE "id" = $1`,
        [betId, now],
      );

      await client.query(
        `INSERT INTO "creditTransactions" (
          "id", "userId", "type", "amount", "balanceAfter", "metadata", "createdAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          randomUUID(),
          userId,
          CREDIT_TRANSACTION_TYPES.BET_CANCELLED,
          refundAmount,
          nextCredits,
          { betId, raceId: bet.raceId || null },
          now,
        ],
      );

      await client.query('COMMIT');
      return { ok: true, credits: nextCredits };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  return { persistPlaceBet, persistCancelBet };
};
