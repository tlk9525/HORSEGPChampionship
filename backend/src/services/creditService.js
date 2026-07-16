import { randomUUID } from 'node:crypto';
import { SPECTATOR_STARTING_CREDITS, USER_ROLES } from '../config/constants.js';

export const CREDIT_TRANSACTION_TYPES = Object.freeze({
  STARTER_BONUS: 'starter_bonus',
  DAILY_LOGIN_BONUS: 'daily_login_bonus',
  BET_PLACED: 'bet_placed',
  BET_CANCELLED: 'bet_cancelled',
  BET_REFUNDED: 'bet_refunded',
  BET_PAYOUT: 'bet_payout',
  ADMIN_ADJUSTMENT: 'admin_adjustment',
});

export const CREDIT_TIME_ZONE = 'Asia/Ho_Chi_Minh';
export const DAILY_LOGIN_REWARD_CAP = 50;

export const vietnamDateKey = (value = new Date()) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: CREDIT_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(new Date(value))
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
};

const previousDateKey = (dateKey) => {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
};

export const calculateDailyLoginReward = (
  user,
  now = new Date(),
  cap = DAILY_LOGIN_REWARD_CAP
) => {
  const rewardDate = vietnamDateKey(now);
  const lastRewardDate = user?.lastLoginRewardDate
    ? String(user.lastLoginRewardDate).slice(0, 10)
    : null;
  const currentStreak = Number(user?.loginStreak || 0);

  if (lastRewardDate === rewardDate) {
    return { claimed: false, amount: 0, streak: currentStreak, rewardDate };
  }

  const streak = lastRewardDate === previousDateKey(rewardDate)
    ? currentStreak + 1
    : 1;
  const amount = Math.min(10 + (streak - 1) * 5, cap);
  return { claimed: true, amount, streak, rewardDate };
};

export const syncWalletCredits = (
  db,
  userId,
  credits,
  updatedAt = new Date().toISOString()
) => {
  const nextCredits = Number(credits ?? 0);
  db.wallets = db.wallets || [];
  const wallet = db.wallets.find((item) => item.userId === userId);

  if (wallet) {
    wallet.credits = nextCredits;
    wallet.updatedAt = updatedAt;
    return wallet;
  }

  const created = { userId, credits: nextCredits, updatedAt };
  db.wallets.push(created);
  return created;
};

export const recordCreditTransaction = (
  db,
  { userId, type, amount, balanceAfter, metadata = null, createdAt = new Date().toISOString() }
) => {
  db.creditTransactions = db.creditTransactions || [];
  const transaction = {
    id: randomUUID(),
    userId,
    type,
    amount: Number(amount),
    balanceAfter: Number(balanceAfter),
    metadata,
    createdAt,
  };
  db.creditTransactions.push(transaction);
  return transaction;
};

export const grantStarterCredits = (
  db,
  userId,
  amount = SPECTATOR_STARTING_CREDITS,
  createdAt = new Date().toISOString()
) => {
  const user = db.users.find((item) => item.id === userId);
  if (!user) return null;

  user.credits = Number(amount);
  user.updatedAt = createdAt;
  syncWalletCredits(db, userId, user.credits, createdAt);
  return recordCreditTransaction(db, {
    userId,
    type: CREDIT_TRANSACTION_TYPES.STARTER_BONUS,
    amount: Number(amount),
    balanceAfter: user.credits,
    metadata: { source: 'spectator_registration' },
    createdAt,
  });
};

export const debitCredits = (
  db,
  userId,
  amount,
  { type, metadata = null, createdAt = new Date().toISOString() }
) => {
  const parsedAmount = Number(amount);
  const user = db.users.find((item) => item.id === userId);
  const currentCredits = Number(user?.credits ?? 0);
  if (!user || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return null;
  if (currentCredits < parsedAmount) return null;

  user.credits = currentCredits - parsedAmount;
  user.updatedAt = createdAt;
  syncWalletCredits(db, userId, user.credits, createdAt);
  const transaction = recordCreditTransaction(db, {
    userId,
    type,
    amount: -parsedAmount,
    balanceAfter: user.credits,
    metadata,
    createdAt,
  });
  return { user, transaction, credits: user.credits };
};

export const creditCredits = (
  db,
  userId,
  amount,
  { type, metadata = null, createdAt = new Date().toISOString() }
) => {
  const parsedAmount = Number(amount);
  const user = db.users.find((item) => item.id === userId);
  if (!user || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return null;

  user.credits = Number(user.credits ?? 0) + parsedAmount;
  user.updatedAt = createdAt;
  syncWalletCredits(db, userId, user.credits, createdAt);
  const transaction = recordCreditTransaction(db, {
    userId,
    type,
    amount: parsedAmount,
    balanceAfter: user.credits,
    metadata,
    createdAt,
  });
  return { user, transaction, credits: user.credits };
};

export const awardDailyLoginBonus = (db, userId, now = new Date()) => {
  const user = db.users.find((item) => item.id === userId);
  if (!user || user.role !== USER_ROLES.SPECTATOR) return null;

  const reward = calculateDailyLoginReward(user, now);
  if (!reward.claimed) return reward;

  const createdAt = new Date(now).toISOString();
  const credited = creditCredits(db, userId, reward.amount, {
    type: CREDIT_TRANSACTION_TYPES.DAILY_LOGIN_BONUS,
    metadata: { streak: reward.streak, rewardDate: reward.rewardDate },
    createdAt,
  });
  if (!credited) return null;

  user.loginStreak = reward.streak;
  user.lastLoginRewardDate = reward.rewardDate;
  return reward;
};
