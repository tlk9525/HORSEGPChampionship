import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import {
  BETTING_CLOSE_BEFORE_RACE_MS,
  USER_ROLES,
} from '../config/constants.js';
import { requireRole } from '../services/authService.js';
import { publicRaceEntries } from '../services/domainService.js';
import {
  isBettableEntry,
  raceBetLimit,
  racePotTotal,
  raceStartMs,
} from '../services/bettingService.js';
import {
  CREDIT_TRANSACTION_TYPES,
  creditCredits,
  debitCredits,
  vietnamDateKey,
} from '../services/creditService.js';

const BETTABLE_RACE_STATUSES = new Set(['published']);

// Ghi chú: Hàm này kiểm tra race đã publish và vẫn còn trước thời điểm đóng cược hay chưa.
const isBettingOpen = (race) => {
  if (!BETTABLE_RACE_STATUSES.has(race.status)) return false;
  const startMs = raceStartMs(race);
  if (!Number.isFinite(startMs)) return false;
  return Date.now() < startMs - BETTING_CLOSE_BEFORE_RACE_MS;
};

// Ghi chú: Hàm này lấy các race entry hợp lệ để spectator có thể đặt cược.
const bettableEntries = (db) => publicRaceEntries(db).filter(isBettableEntry);

// Ghi chú: Hàm này khởi tạo các API dành cho spectator gồm ví credit, pot cược và thao tác đặt/hủy cược.
export const createSpectatorRoutes = (
  getDb,
  writeDb,
  persistPlaceBet = null,
  persistCancelBet = null
) => {
  const app = new Hono();

  app.use('*', async (c, next) => {
    const db = await getDb();
    const user = await requireRole(c.req.raw, db, [USER_ROLES.SPECTATOR]);
    if (!user) return c.json({ message: 'Spectator access required' }, 403);
    c.set('user', user);
    c.set('db', db);
    await next();
  });

  app.get('/wallet', (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const dbUser = db.users.find((item) => item.id === user.id);
    const todayRewardTransaction = (db.creditTransactions || []).find(
      (transaction) =>
        transaction.userId === user.id &&
        transaction.type === CREDIT_TRANSACTION_TYPES.DAILY_LOGIN_BONUS &&
        transaction.metadata?.rewardDate === vietnamDateKey()
    );
    const bets = (db.bets || [])
      .filter((bet) => bet.userId === user.id)
      .map((bet) => {
        const entry = publicRaceEntries(db).find((item) => item.id === bet.raceEntryId) ||
          (db.raceEntries || []).find((item) => item.id === bet.raceEntryId);
        const race = db.races.find((item) => item.id === bet.raceId);
        return {
          ...bet,
          horseName: entry?.horseName || '',
          jockeyName: entry?.jockeyName || '',
          raceName: race?.name || '',
        };
      });

    return c.json({
      credits: Number(dbUser?.credits ?? 0),
      loginStreak: Number(dbUser?.loginStreak ?? 0),
      lastLoginRewardDate: dbUser?.lastLoginRewardDate || null,
      dailyReward: {
        claimed: Boolean(todayRewardTransaction),
        amount: Number(todayRewardTransaction?.amount || 0),
        streak: Number(dbUser?.loginStreak ?? 0),
      },
      bets,
    });
  });

  app.get('/pots', (c) => {
    const db = c.get('db');
    const pendingBets = (db.bets || []).filter((bet) => bet.status === 'pending');
    const raceIds = new Set(pendingBets.map((bet) => bet.raceId));

    const entryTotals = {};
    for (const bet of pendingBets) {
      entryTotals[bet.raceEntryId] = (entryTotals[bet.raceEntryId] || 0) + Number(bet.amount || 0);
    }

    return c.json({
      pots: [...raceIds].map((raceId) => ({
        raceId,
        total: racePotTotal(db, raceId),
      })),
      entryTotals,
    });
  });

  app.post('/bets', async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const { raceEntryId, amount } = await c.req.json();
    const parsedAmount = Number(amount);

    if (!raceEntryId || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return c.json({ message: 'A valid race entry and positive bet amount are required.' }, 400);
    }

    if (!Number.isInteger(parsedAmount)) {
      return c.json({ message: 'Bet amount must be a whole number of credits.' }, 400);
    }

    const entry = bettableEntries(db).find((item) => item.id === raceEntryId);
    if (!entry) {
      return c.json({ message: 'Race entry not found or not available for betting.' }, 404);
    }

    const race = db.races.find((item) => item.id === entry.raceId);
    if (!race) {
      return c.json({ message: 'Race not found.' }, 404);
    }

    if (!isBettingOpen(race)) {
      const startMs = raceStartMs(race);
      const closed =
        Number.isFinite(startMs) && Date.now() >= startMs - BETTING_CLOSE_BEFORE_RACE_MS;
      return c.json(
        {
          message: closed
            ? 'Betting closed. Bets must be placed at least 1 minute before the race starts.'
            : 'Betting is not open for this race yet.',
        },
        400
      );
    }

    const maxBet = raceBetLimit(race);
    if (maxBet !== null && parsedAmount > maxBet) {
      return c.json(
        {
          message: `Bet amount exceeds this race's limit of ${maxBet} credits per bet.`,
          betLimit: maxBet,
        },
        400
      );
    }

    const dbUser = db.users.find((item) => item.id === user.id);
    const currentCredits = Number(dbUser?.credits ?? 0);
    if (currentCredits < parsedAmount) {
      return c.json({ message: 'Insufficient credits for this bet.' }, 400);
    }

    const existingBet = (db.bets || []).find(
      (bet) =>
        bet.userId === user.id &&
        bet.raceEntryId === raceEntryId &&
        bet.status === 'pending'
    );
    if (existingBet) {
      return c.json({ message: 'You already have an active bet on this horse for this race.' }, 409);
    }

    const createdAt = new Date().toISOString();
    const bet = {
      id: randomUUID(),
      userId: user.id,
      raceId: entry.raceId,
      raceEntryId,
      amount: parsedAmount,
      status: 'pending',
      createdAt,
    };

    let nextCredits = currentCredits - parsedAmount;

    if (persistPlaceBet) {
      const result = await persistPlaceBet({
        userId: user.id,
        bet,
        amount: parsedAmount,
      });
      if (!result.ok) {
        if (result.reason === 'insufficient') {
          return c.json({ message: 'Insufficient credits for this bet.' }, 400);
        }
        if (result.reason === 'bet_limit') {
          return c.json(
            {
              message: `Bet amount exceeds this race's limit of ${result.betLimit} credits per bet.`,
              betLimit: result.betLimit,
            },
            400
          );
        }
        if (result.reason === 'duplicate') {
          return c.json(
            { message: 'You already have an active bet on this horse for this race.' },
            409
          );
        }
        if (result.reason === 'race_not_found') {
          return c.json({ message: 'Race not found.' }, 404);
        }
        if (result.reason === 'entry_not_bettable') {
          return c.json(
            { message: 'Race entry is no longer available for betting.' },
            400
          );
        }
        if (result.reason === 'betting_closed') {
          return c.json(
            { message: 'Betting is closed or no longer open for this race.' },
            400
          );
        }
        return c.json({ message: 'Unable to place bet.' }, 500);
      }
      nextCredits = result.credits;
    } else {
      const debited = debitCredits(db, dbUser.id, parsedAmount, {
        type: CREDIT_TRANSACTION_TYPES.BET_PLACED,
        metadata: { betId: bet.id, raceId: bet.raceId, raceEntryId },
        createdAt,
      });
      if (!debited) {
        return c.json({ message: 'Insufficient credits for this bet.' }, 400);
      }
      nextCredits = debited.credits;
      db.bets = [...(db.bets || []), bet];
      await writeDb(db);
    }

    if (dbUser) {
      dbUser.credits = nextCredits;
      dbUser.updatedAt = createdAt;
    }
    if (!(db.bets || []).some((item) => item.id === bet.id)) {
      db.bets = [...(db.bets || []), bet];
    }

    return c.json({
      bet: {
        ...bet,
        horseName: entry.horseName || '',
        jockeyName: entry.jockeyName || '',
        raceName: race.name || '',
      },
      credits: nextCredits,
    });
  });

  app.post('/bets/:betId/cancel', async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const { betId } = c.req.param();

    const bet = (db.bets || []).find(
      (b) => b.id === betId && b.userId === user.id
    );
    if (!bet) {
      return c.json({ message: 'Bet not found.' }, 404);
    }

    if (bet.status !== 'pending') {
      return c.json({ message: 'Only pending bets can be cancelled.' }, 400);
    }

    const race = db.races.find((r) => r.id === bet.raceId);
    if (race && !isBettingOpen(race)) {
      return c.json(
        { message: 'Cannot cancel — betting window for this race has closed.' },
        400
      );
    }

    const amount = Number(bet.amount || 0);
    const now = new Date().toISOString();
    const dbUser = db.users.find((u) => u.id === user.id);
    let nextCredits = Number(dbUser?.credits ?? 0) + amount;

    if (persistCancelBet) {
      const result = await persistCancelBet({
        userId: user.id,
        betId: bet.id,
        raceId: bet.raceId,
        amount,
        settledAt: now,
      });
      if (!result.ok) {
        if (result.reason === 'not_found') {
          return c.json({ message: 'Bet not found.' }, 404);
        }
        if (result.reason === 'not_pending') {
          return c.json({ message: 'Only pending bets can be cancelled.' }, 400);
        }
        if (result.reason === 'betting_closed') {
          return c.json(
            { message: 'Cannot cancel because betting for this race has closed.' },
            400
          );
        }
        return c.json({ message: 'Unable to cancel bet.' }, 500);
      }
      nextCredits = result.credits;
    } else {
      bet.status = 'cancelled';
      bet.settledAt = now;
      const credited = creditCredits(db, user.id, amount, {
        type: CREDIT_TRANSACTION_TYPES.BET_CANCELLED,
        metadata: { betId: bet.id, raceId: bet.raceId },
        createdAt: now,
      });
      nextCredits = credited?.credits ?? nextCredits;
      await writeDb(db);
    }

    bet.status = 'cancelled';
    bet.settledAt = now;
    if (dbUser) {
      dbUser.credits = nextCredits;
      dbUser.updatedAt = now;
    }

    return c.json({
      ok: true,
      credits: nextCredits,
    });
  });

  return app;
};
