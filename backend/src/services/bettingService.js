import { createNotification } from './notificationService.js';
import { RACE_TIMEZONE_OFFSET } from '../config/constants.js';
import {
  CREDIT_TRANSACTION_TYPES,
  creditCredits,
} from './creditService.js';

const winningEntry = (entries = []) =>
  entries.find(
    (entry) =>
      Number(entry.position) === 1 &&
      !entry.disqualified &&
      entry.preRaceStatus !== 'absent'
  );

/**
 * Parse race wall-clock date/time as Vietnam time (+07:00) so betting cutoff
 * matches how admins enter race schedules (not UTC).
 */
export const raceStartMs = (race) => {
  const date = String(race?.date || race?.raceDate || '').slice(0, 10);
  const rawTime = String(race?.time || race?.raceTime || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !rawTime) return Number.NaN;

  const [hours = '00', minutes = '00', seconds = '00'] = rawTime.split(':');
  const normalized = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${String(seconds)
    .padStart(2, '0')
    .slice(0, 2)}`;

  return new Date(`${date}T${normalized}${RACE_TIMEZONE_OFFSET}`).getTime();
};

export const isBettableEntry = (entry) =>
  Boolean(
    entry &&
      entry.status === 'approved' &&
      !entry.disqualified &&
      entry.preRaceStatus !== 'absent'
  );

export const racePotTotal = (db, raceId) =>
  (db.bets || [])
    .filter((bet) => bet.raceId === raceId && bet.status === 'pending')
    .reduce((sum, bet) => sum + Number(bet.amount || 0), 0);

export const refundRaceBets = (db, raceId, reason = 'Race cancelled') => {
  const pendingBets = (db.bets || []).filter(
    (bet) => bet.raceId === raceId && bet.status === 'pending'
  );

  if (pendingBets.length === 0) {
    return { refunded: 0, affectedUsers: [] };
  }

  const settledAt = new Date().toISOString();
  const affectedUserIds = new Set();

  pendingBets.forEach((bet) => {
    const amount = Number(bet.amount || 0);
    bet.status = 'refunded';
    bet.payout = amount;
    bet.settledAt = settledAt;

    const credited = creditCredits(db, bet.userId, amount, {
      type: CREDIT_TRANSACTION_TYPES.BET_REFUNDED,
      metadata: { betId: bet.id, raceId, reason },
      createdAt: settledAt,
    });
    if (credited?.user) {
      affectedUserIds.add(credited.user.id);
    }

    createNotification(
      db,
      bet.userId,
      'Bet refunded',
      `${reason}. Your ${amount}-credit bet has been returned to your wallet.`
    );
  });

  return {
    refunded: pendingBets.length,
    affectedUsers: [...affectedUserIds]
      .map((userId) => db.users.find((item) => item.id === userId))
      .filter(Boolean),
  };
};

export const settleRaceBets = (db, raceId, entries = []) => {
  const pendingBets = (db.bets || []).filter(
    (bet) => bet.raceId === raceId && bet.status === 'pending'
  );

  if (pendingBets.length === 0) {
    return { pot: 0, settled: 0, winnerEntryId: null, affectedUsers: [] };
  }

  const pot = pendingBets.reduce((sum, bet) => sum + Number(bet.amount || 0), 0);
  const settledAt = new Date().toISOString();
  const winner = winningEntry(entries);
  const affectedUserIds = new Set();

  const markLost = (bet) => {
    bet.status = 'lost';
    bet.payout = 0;
    bet.settledAt = settledAt;
  };

  if (!winner) {
    pendingBets.forEach(markLost);
    return { pot, settled: pendingBets.length, winnerEntryId: null, affectedUsers: [] };
  }

  const winningBets = pendingBets.filter((bet) => bet.raceEntryId === winner.id);
  const losingBets = pendingBets.filter((bet) => bet.raceEntryId !== winner.id);

  losingBets.forEach(markLost);

  if (winningBets.length === 0) {
    pendingBets.forEach(markLost);
    return {
      pot,
      settled: pendingBets.length,
      winnerEntryId: winner.id,
      affectedUsers: [],
      noWinningBets: true,
    };
  }

  const totalWinningStake = winningBets.reduce(
    (sum, bet) => sum + Number(bet.amount || 0),
    0
  );
  let distributed = 0;

  winningBets.forEach((bet, index) => {
    const payout =
      index === winningBets.length - 1
        ? pot - distributed
        : Math.floor((pot * Number(bet.amount)) / totalWinningStake);

    distributed += payout;
    bet.status = 'won';
    bet.payout = payout;
    bet.settledAt = settledAt;

    const credited = creditCredits(db, bet.userId, payout, {
      type: CREDIT_TRANSACTION_TYPES.BET_PAYOUT,
      metadata: { betId: bet.id, raceId, pot, winningEntryId: winner.id },
      createdAt: settledAt,
    });
    const user = credited?.user;
    if (user) {
      affectedUserIds.add(user.id);

      createNotification(
        db,
        user.id,
        'Bet won',
        `You won ${payout} credits from the ${pot}-credit pot for picking the 1st-place horse.`
      );
    }
  });

  losingBets.forEach((bet) => {
    createNotification(
      db,
      bet.userId,
      'Bet lost',
      'Your bet did not pick the 1st-place horse. Better luck in the next race.'
    );
  });

  return {
    pot,
    settled: pendingBets.length,
    winnerEntryId: winner.id,
    affectedUsers: [...affectedUserIds].map((userId) =>
      db.users.find((item) => item.id === userId)
    ).filter(Boolean),
  };
};
