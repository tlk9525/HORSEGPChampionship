import { nowIso } from './persistenceHelpers.js';

/**
 * Ghi ledger bất biến trước rồi cập nhật ví từ số dư đang được khóa.
 * Khi chạy lại cùng transaction ID, hàm trả số dư hiện tại mà không cộng trừ lần nữa.
 */
export const applyCreditTransactionsIdempotent = async (
  client,
  creditTransactions = [],
) => {
  const walletBalances = {};
  const appliedDeltaByUser = {};
  const sorted = [...creditTransactions].sort((left, right) => {
    const userComparison = String(left.userId).localeCompare(String(right.userId));
    return userComparison || String(left.id).localeCompare(String(right.id));
  });

  for (const transaction of sorted) {
    const amount = Number(transaction.amount);
    const updatedAt = transaction.createdAt || nowIso();
    if (!transaction.id || !transaction.userId || !Number.isFinite(amount) || amount === 0) {
      continue;
    }

    await client.query(
      `INSERT INTO "wallets" ("userId", "credits", "updatedAt")
       VALUES ($1, 0, $2)
       ON CONFLICT ("userId") DO NOTHING`,
      [transaction.userId, updatedAt],
    );

    const { rows: lockedWalletRows } = await client.query(
      `SELECT "credits"
       FROM "wallets"
       WHERE "userId" = $1
       FOR UPDATE`,
      [transaction.userId],
    );
    const currentCredits = Number(lockedWalletRows[0]?.credits ?? 0);

    const { rows: insertedRows } = await client.query(
      `INSERT INTO "creditTransactions" (
        "id", "userId", "type", "amount", "balanceAfter", "metadata", "createdAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT ("id") DO NOTHING
      RETURNING "id"`,
      [
        transaction.id,
        transaction.userId,
        transaction.type,
        amount,
        currentCredits,
        transaction.metadata || null,
        updatedAt,
      ],
    );

    if (!insertedRows.length) {
      transaction.balanceAfter = currentCredits;
      walletBalances[transaction.userId] = currentCredits;
      continue;
    }

    const { rows: walletRows } = await client.query(
      `UPDATE "wallets"
       SET "credits" = "credits" + $2,
           "updatedAt" = $3
       WHERE "userId" = $1
         AND "credits" + $2 >= 0
       RETURNING "credits"`,
      [transaction.userId, amount, updatedAt],
    );
    if (!walletRows.length) {
      throw new Error(
        `Insufficient credits while applying ${transaction.type} for ${transaction.userId}`,
      );
    }

    const nextCredits = Number(walletRows[0].credits);
    await client.query(
      `UPDATE "creditTransactions"
       SET "balanceAfter" = $2
       WHERE "id" = $1`,
      [transaction.id, nextCredits],
    );

    transaction.balanceAfter = nextCredits;
    walletBalances[transaction.userId] = nextCredits;
    appliedDeltaByUser[transaction.userId] =
      (appliedDeltaByUser[transaction.userId] || 0) + amount;
  }

  return { walletBalances, appliedDeltaByUser };
};
