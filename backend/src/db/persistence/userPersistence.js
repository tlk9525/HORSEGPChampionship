import { randomUUID } from 'node:crypto';
import {
  CREDIT_TRANSACTION_TYPES,
  calculateDailyLoginReward,
  creditTransactionIdForStarterBonus,
} from '../../services/creditService.js';
import { SPECTATOR_STARTING_CREDITS } from '../../config/constants.js';
import { insertNotifications, nowIso } from './persistenceHelpers.js';

// Khởi tạo các hàm persistence cho tài khoản, phiên đăng nhập và credit của spectator.
export const createUserPersistence = ({ ensureRuntimeSchema, getPool }) => {
  /**
   * Cấp starter credit cho mỗi user đúng một lần trong một transaction.
   * Khóa row user/ví và dùng ledger ID cố định để các request đổi role đồng thời
   * không thể cấp thưởng hai lần.
   */
  const persistEnsureSpectatorStarterCredits = async ({
    userId,
    amount = SPECTATOR_STARTING_CREDITS,
    source = 'spectator_role_change',
    createdAt = nowIso(),
  }) => {
    await ensureRuntimeSchema();
    const client = await getPool().connect();
    const transactionId = creditTransactionIdForStarterBonus(userId);
    const parsedAmount = Number(amount);

    try {
      await client.query('BEGIN');

      const { rows: userRows } = await client.query(
        `SELECT "id" FROM "users" WHERE "id" = $1 FOR UPDATE`,
        [userId],
      );
      if (!userRows.length) {
        await client.query('ROLLBACK');
        return { ok: false, reason: 'not_found' };
      }

      await client.query(
        `INSERT INTO "wallets" ("userId", "credits", "updatedAt")
         VALUES ($1, 0, $2)
         ON CONFLICT ("userId") DO NOTHING`,
        [userId, createdAt],
      );

      const { rows: walletRows } = await client.query(
        `SELECT "credits" FROM "wallets" WHERE "userId" = $1 FOR UPDATE`,
        [userId],
      );
      const currentCredits = Number(walletRows[0]?.credits ?? 0);

      const { rows: existingStarterRows } = await client.query(
        `SELECT "id"
         FROM "creditTransactions"
         WHERE "userId" = $1 AND "type" = $2
         LIMIT 1`,
        [userId, CREDIT_TRANSACTION_TYPES.STARTER_BONUS],
      );
      if (existingStarterRows.length) {
        await client.query('COMMIT');
        return { ok: true, granted: false, credits: currentCredits };
      }

      const { rows: insertedRows } = await client.query(
        `INSERT INTO "creditTransactions" (
          "id", "userId", "type", "amount", "balanceAfter", "metadata", "createdAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT ("id") DO NOTHING
        RETURNING "id"`,
        [
          transactionId,
          userId,
          CREDIT_TRANSACTION_TYPES.STARTER_BONUS,
          parsedAmount,
          0,
          { source },
          createdAt,
        ],
      );

      if (!insertedRows.length) {
        await client.query('COMMIT');
        return { ok: true, granted: false, credits: currentCredits };
      }

      const nextCredits = parsedAmount;
      await client.query(
        `UPDATE "wallets"
         SET "credits" = $2, "updatedAt" = $3
         WHERE "userId" = $1`,
        [userId, nextCredits, createdAt],
      );
      await client.query(
        `UPDATE "creditTransactions"
         SET "balanceAfter" = $2
         WHERE "id" = $1`,
        [transactionId, nextCredits],
      );

      await client.query('COMMIT');
      return { ok: true, granted: true, credits: nextCredits };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  // Lưu session đăng nhập, cập nhật mật khẩu và cấp thưởng hằng ngày cho spectator.
  const persistLoginSession = async (
    user,
    session,
    expiredBefore,
    loginAt = nowIso(),
  ) => {
    await ensureRuntimeSchema();

    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const { rows: userRows } = await client.query(
        `SELECT "id", "role", "loginStreak", "lastLoginRewardDate"
         FROM "users"
         WHERE "id" = $1
         FOR UPDATE`,
        [user.id],
      );
      const persistedUser = userRows[0];
      let dailyReward = null;
      let credits = Number(user.credits ?? 0);

      if (persistedUser?.role === 'spectator') {
        await client.query(
          `INSERT INTO "wallets" ("userId", "credits", "updatedAt")
           VALUES ($1, 100, $2)
           ON CONFLICT ("userId") DO NOTHING`,
          [user.id, loginAt],
        );
        const { rows: walletRows } = await client.query(
          `SELECT "credits"
           FROM "wallets"
           WHERE "userId" = $1
           FOR UPDATE`,
          [user.id],
        );
        credits = Number(walletRows[0]?.credits ?? 0);
        dailyReward = calculateDailyLoginReward(
          persistedUser,
          new Date(loginAt),
        );

        if (dailyReward.claimed) {
          credits += dailyReward.amount;
          await client.query(
            `UPDATE "wallets"
             SET "credits" = $2, "updatedAt" = $3
             WHERE "userId" = $1`,
            [user.id, credits, loginAt],
          );
          await client.query(
            `INSERT INTO "creditTransactions" (
              "id", "userId", "type", "amount", "balanceAfter", "metadata", "createdAt"
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              randomUUID(),
              user.id,
              CREDIT_TRANSACTION_TYPES.DAILY_LOGIN_BONUS,
              dailyReward.amount,
              credits,
              {
                streak: dailyReward.streak,
                rewardDate: dailyReward.rewardDate,
              },
              loginAt,
            ],
          );
        }

        await client.query(
          `UPDATE "users"
           SET "password" = $2,
               "loginStreak" = $3,
               "lastLoginRewardDate" = $4,
               "updatedAt" = $5
           WHERE "id" = $1`,
          [
            user.id,
            user.password,
            dailyReward.streak,
            dailyReward.rewardDate,
            loginAt,
          ],
        );
      } else {
        await client.query(
          `UPDATE "users"
           SET "password" = $2,
               "updatedAt" = $3
           WHERE "id" = $1`,
          [user.id, user.password, loginAt],
        );
      }

      await client.query(`DELETE FROM "sessions" WHERE "expiresAt" <= $1`, [
        expiredBefore || nowIso(),
      ]);
      await client.query(
        `INSERT INTO "sessions" ("token", "userId", "createdAt", "expiresAt")
         VALUES ($1, $2, $3, $4)`,
        [session.token, session.userId, session.createdAt, session.expiresAt],
      );
      await client.query('COMMIT');
      return {
        user: {
          credits,
          loginStreak:
            dailyReward?.streak ?? Number(persistedUser?.loginStreak || 0),
          lastLoginRewardDate:
            dailyReward?.rewardDate ||
            persistedUser?.lastLoginRewardDate ||
            null,
        },
        dailyReward,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  // Lưu tài khoản mới và thông báo liên quan trong một transaction nhỏ.
  const persistRegisteredUser = async (
    user,
    notifications = [],
    creditTransactions = [],
  ) => {
    await ensureRuntimeSchema();

    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO "users" (
          "id", "name", "email", "password", "role", "status",
          "loginStreak", "lastLoginRewardDate", "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          user.id,
          user.name,
          user.email,
          user.password,
          user.role,
          user.status,
          Number(user.loginStreak || 0),
          user.lastLoginRewardDate || null,
          user.createdAt,
          user.updatedAt,
        ],
      );

      if (user.role === 'spectator') {
        await client.query(
          `INSERT INTO "wallets" ("userId", "credits", "updatedAt")
           VALUES ($1, $2, $3)
           ON CONFLICT ("userId") DO UPDATE SET
             "credits" = EXCLUDED."credits",
             "updatedAt" = EXCLUDED."updatedAt"`,
          [user.id, Number(user.credits ?? 100), user.updatedAt || nowIso()],
        );

        const starterTransaction = creditTransactions[0] || {
          id: creditTransactionIdForStarterBonus(user.id),
          userId: user.id,
          type: CREDIT_TRANSACTION_TYPES.STARTER_BONUS,
          amount: Number(user.credits ?? 100),
          balanceAfter: Number(user.credits ?? 100),
          metadata: { source: 'spectator_registration' },
          createdAt: user.createdAt || nowIso(),
        };
        await client.query(
          `INSERT INTO "creditTransactions" (
            "id", "userId", "type", "amount", "balanceAfter", "metadata", "createdAt"
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT ("id") DO NOTHING`,
          [
            starterTransaction.id,
            starterTransaction.userId,
            starterTransaction.type,
            Number(starterTransaction.amount),
            Number(starterTransaction.balanceAfter),
            starterTransaction.metadata || null,
            starterTransaction.createdAt || nowIso(),
          ],
        );
      }

      await insertNotifications(client, notifications, {
        ignoreConflicts: false,
      });
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  // Lưu cấu hình hệ thống bằng transaction nhỏ, tránh ghi lại toàn bộ database.
  const persistSystemSettings = async (settingsRows = []) => {
    await ensureRuntimeSchema();

    const client = await getPool().connect();
    try {
      await client.query('BEGIN');

      for (const setting of settingsRows) {
        await client.query(
          `INSERT INTO "systemSettings" ("key", "value", "updatedBy", "updatedAt")
           VALUES ($1, $2, $3, $4)
           ON CONFLICT ("key") DO UPDATE SET
             "value" = EXCLUDED."value",
             "updatedBy" = EXCLUDED."updatedBy",
             "updatedAt" = EXCLUDED."updatedAt"`,
          [
            setting.key,
            setting.value,
            setting.updatedBy || null,
            setting.updatedAt || nowIso(),
          ],
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

  // Xóa đúng phiên đăng xuất thay vì ghi lại toàn bộ bảng session.
  const deleteSession = async (token) => {
    if (!token) return;
    await ensureRuntimeSchema();
    await getPool().query(`DELETE FROM "sessions" WHERE "token" = $1`, [token]);
  };

  return {
    persistLoginSession,
    persistRegisteredUser,
    persistEnsureSpectatorStarterCredits,
    persistSystemSettings,
    deleteSession,
  };
};
