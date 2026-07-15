import test from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { createSpectatorRoutes } from '../src/routes/spectatorRoutes.js';

const buildDb = () => {
  const now = new Date().toISOString();
  const raceStart = new Date(Date.now() + 60 * 60 * 1000);
  const raceStartIso = raceStart.toISOString();

  return {
    users: [
      {
        id: 'spectator-1',
        name: 'Spectator One',
        email: 'spectator@example.com',
        password: 'hashed',
        role: 'spectator',
        status: 'active',
        credits: 100,
        createdAt: now,
        updatedAt: now,
      },
    ],
    sessions: [
      {
        token: 'session-token',
        userId: 'spectator-1',
        createdAt: now,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
    ],
    horses: [
      {
        id: 'horse-1',
        name: 'Thunder Bolt',
        ownerUserId: 'owner-1',
        status: 'approved',
      },
    ],
    races: [
      {
        id: 'race-1',
        tournamentId: 'tournament-1',
        name: 'Feature Race',
        status: 'published',
        date: raceStartIso.slice(0, 10),
        time: raceStartIso.slice(11, 16),
        raceDate: raceStartIso.slice(0, 10),
        raceTime: raceStartIso.slice(11, 19),
        venue: 'Main Track',
      },
    ],
    raceEntries: [
      {
        id: 'entry-1',
        raceId: 'race-1',
        horseId: 'horse-1',
        jockeyUserId: 'jockey-1',
        status: 'approved',
        lane: 1,
        handicap: 120,
        ratingSnapshot: 88,
        ownerConfirmed: true,
        jockeyConfirmed: true,
        preRaceStatus: 'ready',
        disqualified: false,
      },
      {
        id: 'entry-rejected',
        raceId: 'race-1',
        horseId: 'horse-1',
        jockeyUserId: 'jockey-2',
        status: 'rejected',
        lane: 2,
        handicap: 118,
        ratingSnapshot: 80,
        ownerConfirmed: true,
        jockeyConfirmed: true,
        preRaceStatus: 'pending',
        disqualified: false,
      },
    ],
    jockeyProfiles: [],
    bets: [],
    notifications: [],
    tournaments: [],
    jockeyRaceRegistrations: [],
    jockeyInvitations: [],
    horseRaceRegistrations: [],
    raceRefereeAssignments: [],
    raceActionLogs: [],
    refereeReports: [],
  };
};

test('spectator can place a bet before the race starts', async () => {
  const db = buildDb();
  let persisted = false;

  const app = new Hono();
  app.route('/api/spectator', createSpectatorRoutes(
    async () => db,
    async () => {
      persisted = true;
    }
  ));

  const walletResponse = await app.request('/api/spectator/wallet', {
    headers: { Cookie: 'horse-racing-session=session-token' },
  });
  assert.equal(walletResponse.status, 200);
  assert.deepEqual(await walletResponse.json(), { credits: 100, bets: [] });

  const betResponse = await app.request('/api/spectator/bets', {
    method: 'POST',
    headers: {
      Cookie: 'horse-racing-session=session-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raceEntryId: 'entry-1', amount: 25 }),
  });

  assert.equal(betResponse.status, 200);
  const betBody = await betResponse.json();
  assert.equal(betBody.credits, 75);
  assert.equal(betBody.bet.amount, 25);
  assert.equal(db.users[0].credits, 75);
  assert.equal(db.bets.length, 1);
  assert.ok(persisted);
});

test('spectator cannot bet within one minute of race start', async () => {
  const db = buildDb();
  const start = new Date(Date.now() + 30 * 1000);
  const startIso = start.toISOString();
  db.races[0].date = startIso.slice(0, 10);
  db.races[0].raceDate = db.races[0].date;
  db.races[0].time = startIso.slice(11, 16);
  db.races[0].raceTime = startIso.slice(11, 19);

  const app = new Hono();
  app.route('/api/spectator', createSpectatorRoutes(async () => db, async () => undefined));

  const response = await app.request('/api/spectator/bets', {
    method: 'POST',
    headers: {
      Cookie: 'horse-racing-session=session-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raceEntryId: 'entry-1', amount: 10 }),
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /Betting closed/i);
});

test('spectator cannot bet on a rejected race entry', async () => {
  const db = buildDb();
  const app = new Hono();
  app.route('/api/spectator', createSpectatorRoutes(async () => db, async () => undefined));

  const response = await app.request('/api/spectator/bets', {
    method: 'POST',
    headers: {
      Cookie: 'horse-racing-session=session-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raceEntryId: 'entry-rejected', amount: 10 }),
  });

  assert.equal(response.status, 404);
  assert.match((await response.json()).message, /not available for betting/i);
});

test('spectator can cancel a pending bet and get credits back', async () => {
  const db = buildDb();
  let persisted = false;

  const app = new Hono();
  app.route('/api/spectator', createSpectatorRoutes(
    async () => db,
    async () => { persisted = true; }
  ));

  const betResponse = await app.request('/api/spectator/bets', {
    method: 'POST',
    headers: {
      Cookie: 'horse-racing-session=session-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raceEntryId: 'entry-1', amount: 30 }),
  });
  assert.equal(betResponse.status, 200);
  const { bet } = await betResponse.json();
  assert.equal(db.users[0].credits, 70);

  const cancelResponse = await app.request(`/api/spectator/bets/${bet.id}/cancel`, {
    method: 'POST',
    headers: { Cookie: 'horse-racing-session=session-token' },
  });
  assert.equal(cancelResponse.status, 200);
  const cancelBody = await cancelResponse.json();
  assert.equal(cancelBody.credits, 100);
  assert.equal(db.users[0].credits, 100);
  assert.equal(db.bets[0].status, 'cancelled');
  assert.ok(persisted);
});

test('spectator cannot cancel a bet after betting window closes', async () => {
  const db = buildDb();
  const start = new Date(Date.now() + 30 * 1000);
  const startIso = start.toISOString();
  db.races[0].date = startIso.slice(0, 10);
  db.races[0].raceDate = db.races[0].date;
  db.races[0].time = startIso.slice(11, 16);
  db.races[0].raceTime = startIso.slice(11, 19);

  db.bets.push({
    id: 'bet-existing',
    userId: 'spectator-1',
    raceId: 'race-1',
    raceEntryId: 'entry-1',
    amount: 20,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
  db.users[0].credits = 80;

  const app = new Hono();
  app.route('/api/spectator', createSpectatorRoutes(async () => db, async () => undefined));

  const response = await app.request('/api/spectator/bets/bet-existing/cancel', {
    method: 'POST',
    headers: { Cookie: 'horse-racing-session=session-token' },
  });
  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /betting window.*closed/i);
  assert.equal(db.users[0].credits, 80);
  assert.equal(db.bets[0].status, 'pending');
});

test('spectator can place a new bet after cancelling', async () => {
  const db = buildDb();
  const app = new Hono();
  app.route('/api/spectator', createSpectatorRoutes(
    async () => db,
    async () => undefined
  ));

  const bet1 = await app.request('/api/spectator/bets', {
    method: 'POST',
    headers: {
      Cookie: 'horse-racing-session=session-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raceEntryId: 'entry-1', amount: 20 }),
  });
  const { bet } = await bet1.json();

  await app.request(`/api/spectator/bets/${bet.id}/cancel`, {
    method: 'POST',
    headers: { Cookie: 'horse-racing-session=session-token' },
  });
  assert.equal(db.users[0].credits, 100);

  const bet2 = await app.request('/api/spectator/bets', {
    method: 'POST',
    headers: {
      Cookie: 'horse-racing-session=session-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raceEntryId: 'entry-1', amount: 50 }),
  });
  assert.equal(bet2.status, 200);
  const body2 = await bet2.json();
  assert.equal(body2.credits, 50);
  assert.equal(body2.bet.amount, 50);
});
