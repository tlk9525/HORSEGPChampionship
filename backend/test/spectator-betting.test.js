import test from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { createSpectatorRoutes } from '../src/routes/spectatorRoutes.js';

const buildDb = () => {
  const now = new Date().toISOString();
  const raceStart = new Date(Date.now() + 60 * 60 * 1000).toISOString();

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
        date: raceStart.slice(0, 10),
        time: '18:00',
        raceDate: raceStart.slice(0, 10),
        raceTime: '18:00:00',
        venue: 'Main Track',
      },
    ],
    raceEntries: [
      {
        id: 'entry-1',
        raceId: 'race-1',
        horseId: 'horse-1',
        jockeyUserId: 'jockey-1',
        lane: 1,
        handicap: 120,
        ratingSnapshot: 88,
        ownerConfirmed: true,
        jockeyConfirmed: true,
        preRaceStatus: 'ready',
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
  db.races[0].date = start.toISOString().slice(0, 10);
  db.races[0].raceDate = db.races[0].date;
  db.races[0].time = start.toTimeString().slice(0, 5);
  db.races[0].raceTime = `${db.races[0].time}:00`;

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
