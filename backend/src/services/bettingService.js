import { createNotification } from './notificationService.js';

const winningEntry = (entries = []) =>
  entries.find(
    (entry) =>
      Number(entry.position) === 1 &&
      !entry.disqualified &&
      entry.preRaceStatus !== 'absent'
  );

export const racePotTotal = (db, raceId) =>
  (db.bets || [])
    .filter((bet) => bet.raceId === raceId && bet.status === 'pending')
    .reduce((sum, bet) => sum + Number(bet.amount || 0), 0);

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

    const user = db.users.find((item) => item.id === bet.userId);
    if (user) {
      user.credits = Number(user.credits ?? 0) + payout;
      user.updatedAt = settledAt;
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
