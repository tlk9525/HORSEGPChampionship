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
  racePotTotal,
  raceStartMs,
} from '../services/bettingService.js';

const BETTABLE_RACE_STATUSES = new Set(['published']);

const isBettingOpen = (race) => {
  if (!BETTABLE_RACE_STATUSES.has(race.status)) return false;
  const startMs = raceStartMs(race);
  if (!Number.isFinite(startMs)) return false;
  return Date.now() < startMs - BETTING_CLOSE_BEFORE_RACE_MS;
};

const bettableEntries = (db) => publicRaceEntries(db).filter(isBettableEntry);

export const createSpectatorRoutes = (getDb, writeDb) => {
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

    const dbUser = db.users.find((item) => item.id === user.id);
    const currentCredits = Number(dbUser?.credits ?? 0);
    if (currentCredits < parsedAmount) {
      return c.json({ message: 'Insufficient credits for this bet.' }, 400);
    }

    const existingBet = (db.bets || []).find(
      (bet) => bet.userId === user.id && bet.raceEntryId === raceEntryId
    );
    if (existingBet) {
      return c.json({ message: 'You already placed a bet on this horse for this race.' }, 409);
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

    dbUser.credits = currentCredits - parsedAmount;
    dbUser.updatedAt = createdAt;
    db.bets = [...(db.bets || []), bet];

    await writeDb(db);

    return c.json({
      bet: {
        ...bet,
        horseName: entry.horseName || '',
        jockeyName: entry.jockeyName || '',
        raceName: race.name || '',
      },
      credits: dbUser.credits,
    });
  });

  return app;
};

export { isBettingOpen, raceStartMs, bettableEntries };
