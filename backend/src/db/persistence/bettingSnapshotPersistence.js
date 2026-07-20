import { nowIso } from './persistenceHelpers.js';

// Ghi snapshot bet, ví và lịch sử biến động credit trong cùng transaction của writeDb.
export const writeBettingSnapshot = async ({ db, writeRows }) => {
  await writeRows(
    'bets',
    [
      'id',
      'userId',
      'raceId',
      'raceEntryId',
      'amount',
      'status',
      'payout',
      'createdAt',
      'settledAt',
    ],
    (db.bets || []).map((bet) => ({
      ...bet,
      amount: Number(bet.amount),
      status: bet.status || 'pending',
      payout: Number(bet.payout ?? 0),
      createdAt: bet.createdAt || nowIso(),
      settledAt: bet.settledAt || null,
    })),
  );

  await writeRows(
    'creditTransactions',
    ['id', 'userId', 'type', 'amount', 'balanceAfter', 'metadata', 'createdAt'],
    (db.creditTransactions || []).map((transaction) => ({
      ...transaction,
      amount: Number(transaction.amount),
      balanceAfter: Number(transaction.balanceAfter),
      metadata: transaction.metadata || null,
      createdAt: transaction.createdAt || nowIso(),
    })),
  );

  const walletsFromUsers = (db.users || [])
    .filter((user) => user.role === 'spectator')
    .map((user) => ({
      userId: user.id,
      credits: Number(user.credits ?? 100),
      updatedAt: user.updatedAt || nowIso(),
    }));
  const walletByUserId = new Map(
    (db.wallets || []).map((wallet) => [wallet.userId, wallet]),
  );
  for (const wallet of walletsFromUsers) {
    walletByUserId.set(wallet.userId, {
      ...(walletByUserId.get(wallet.userId) || {}),
      ...wallet,
    });
  }

  await writeRows(
    'wallets',
    ['userId', 'credits', 'updatedAt'],
    [...walletByUserId.values()].map((wallet) => ({
      userId: wallet.userId,
      credits: Number(wallet.credits ?? 0),
      updatedAt: wallet.updatedAt || nowIso(),
    })),
    'userId',
  );
};
