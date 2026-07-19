import { createNotification } from './notificationService.js';
import { RACE_TIMEZONE_OFFSET } from '../config/constants.js';
import {
  CREDIT_TRANSACTION_TYPES,
  creditCredits,
  creditTransactionIdForBet,
} from './creditService.js';

// Ghi chú: Hàm này tìm entry về nhất hợp lệ trong kết quả chính thức của race.
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

// Ghi chú: Hàm này kiểm tra một race entry có đủ điều kiện nhận cược hay không.
export const isBettableEntry = (entry) =>
  Boolean(
    entry &&
      entry.status === 'approved' &&
      !entry.disqualified &&
      entry.preRaceStatus !== 'absent'
  );

/**
 * Max credits allowed for a single bet on this race.
 * Returns null when unlimited (unset, zero, or invalid stored value).
 */
export const raceBetLimit = (race) => {
  const limit = Number(race?.betLimit);
  if (!Number.isFinite(limit) || limit <= 0) return null;
  return Math.floor(limit);
};

/**
 * Parse an admin-supplied bet limit.
 * Empty / null → unlimited (null). Otherwise must be a positive whole number.
 */
export const parseBetLimitInput = (value) => {
  if (value === null || value === undefined || value === '') {
    return { ok: true, betLimit: null };
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { ok: false, message: 'Bet limit must be a positive number of credits, or empty for unlimited.' };
  }
  if (!Number.isInteger(parsed)) {
    return { ok: false, message: 'Bet limit must be a whole number of credits.' };
  }

  return { ok: true, betLimit: parsed };
};

// Ghi chú: Hàm này tính tổng credit của các cược đang chờ xử lý trong một race.
export const racePotTotal = (db, raceId) =>
  (db.bets || [])
    .filter((bet) => bet.raceId === raceId && bet.status === 'pending')
    .reduce((sum, bet) => sum + Number(bet.amount || 0), 0);

// Ghi chú: Hàm này hoàn tiền mọi cược đang chờ khi race bị hủy và thông báo cho người cược.
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
      id: creditTransactionIdForBet(CREDIT_TRANSACTION_TYPES.BET_REFUNDED, bet.id),
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

// Ghi chú: Hàm này chốt pot cược theo kết quả race, trả thưởng người thắng và đánh dấu cược thua.
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

  // Ghi chú: Hàm này đánh dấu một cược là thua và lưu thời điểm chốt cược.
  const markLost = (bet) => {
    bet.status = 'lost';
    bet.payout = 0;
    bet.settledAt = settledAt;
  };

  // Void the pool (refund stakes) when there is no payable 1st place or nobody
  // backed the winner — do not burn credits.
  if (!winner) {
    const refund = refundRaceBets(
      db,
      raceId,
      'No valid 1st-place finisher; pending bets were refunded'
    );
    return {
      pot,
      settled: refund.refunded,
      winnerEntryId: null,
      affectedUsers: refund.affectedUsers,
      refunded: true,
    };
  }

  const winningBets = pendingBets.filter((bet) => bet.raceEntryId === winner.id);
  const losingBets = pendingBets.filter((bet) => bet.raceEntryId !== winner.id);

  if (winningBets.length === 0) {
    const refund = refundRaceBets(
      db,
      raceId,
      'No bets on the winning horse; the pot was refunded'
    );
    return {
      pot,
      settled: refund.refunded,
      winnerEntryId: winner.id,
      affectedUsers: refund.affectedUsers,
      noWinningBets: true,
      refunded: true,
    };
  }

  losingBets.forEach(markLost);

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
      id: creditTransactionIdForBet(CREDIT_TRANSACTION_TYPES.BET_PAYOUT, bet.id),
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
