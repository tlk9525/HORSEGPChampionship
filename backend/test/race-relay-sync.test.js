import test from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';

import { createAdminRoutes } from '../src/routes/adminRoutes.js';
import { createRefereeRoutes } from '../src/routes/refereeRoutes.js';
import { __liveRaceEventsForTest } from '../src/services/liveRaceEvents.js';

const requestJson = async (app, path, { token, body, method = 'POST' } = {}) => {
  const response = await app.request(path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return { status: response.status, body: await response.json() };
};

const listenRaceUpdates = (raceId) => {
  const events = [];
  const eventKey = `race:${raceId}`;
  const listener = (payload) => {
    events.push(payload);
  };

  __liveRaceEventsForTest.on(eventKey, listener);

  return {
    events,
    cleanup: () => __liveRaceEventsForTest.off(eventKey, listener),
  };
};

const baseDb = () => ({
  users: [
    { id: 'admin-1', name: 'Admin', role: 'admin', status: 'active' },
    { id: 'referee-1', name: 'Referee', role: 'referee', status: 'active' },
    { id: 'owner-1', name: 'Owner', role: 'owner', status: 'active' },
    ...Array.from({ length: 10 }, (_, index) => ({
      id: `jockey-${index + 1}`,
      name: `Jockey ${index + 1}`,
      role: 'jockey',
      status: 'active',
    })),
  ],
  sessions: [
    { token: 'admin-token', userId: 'admin-1' },
    { token: 'referee-token', userId: 'referee-1' },
  ],
  tournaments: [{
    id: 'tournament-1',
    name: 'Tournament',
    status: 'active',
    finalDate: '2020-01-01',
  }],
  races: [],
  horses: Array.from({ length: 10 }, (_, index) => ({
    id: `horse-${index + 1}`,
    name: `Horse ${index + 1}`,
    ownerUserId: 'owner-1',
    overallRating: 75,
  })),
  jockeyProfiles: [],
  jockeyRaceRegistrations: [],
  jockeyInvitations: [],
  horseRaceRegistrations: [],
  raceEntries: [],
  raceRefereeAssignments: [],
  raceActionLogs: [],
  refereeReports: [],
  notifications: [],
});

test('admin race operations keep replay generation and relay broadcast in sync', async () => {
  const db = baseDb();
  db.races = [{
    id: 'race-1',
    tournamentId: 'tournament-1',
    name: 'Race 1',
    date: '2020-01-01',
    time: '10:00',
    status: 'published',
    resultStatus: 'draft',
  }];
  db.raceEntries = Array.from({ length: 5 }, (_, index) => ({
    id: `entry-${index + 1}`,
    raceId: 'race-1',
    horseId: `horse-${index + 1}`,
    jockeyUserId: `jockey-${index + 1}`,
    status: 'approved',
    preRaceStatus: 'ready',
    disqualified: false,
    lane: index + 1,
    ratingSnapshot: 75 + index,
    handicap: 120 + index,
    position: index + 1,
    finishTime: `01:0${index}.000`,
    resultStatus: 'submitted',
  }));

  const app = new Hono();
  app.route('/', createAdminRoutes(async () => db, async () => undefined));

  const startListener = listenRaceUpdates('race-1');
  try {
    const startResult = await requestJson(app, '/races/race-1/start-race', {
      token: 'admin-token',
    });

    assert.equal(startResult.status, 200);
    assert.equal(startResult.body.race.status, 'in-progress');
    assert.equal(startResult.body.race.replayTimeline.runners.length, 5);
    assert.equal(startListener.events.length, 1);
    assert.equal(startListener.events[0].raceId, 'race-1');
    assert.ok(Number.isFinite(Date.parse(startListener.events[0].updatedAt)));
  } finally {
    startListener.cleanup();
  }

  db.races[0].status = 'finished';
  db.races[0].resultStatus = 'submitted';
  db.raceEntries.forEach((entry, index) => {
    entry.resultStatus = 'submitted';
    entry.position = index + 1;
    entry.finishTime = `01:${String(index).padStart(2, '0')}.000`;
    entry.preRaceStatus = 'ready';
    entry.disqualified = false;
  });

  const completeListener = listenRaceUpdates('race-1');
  try {
    const completeResult = await requestJson(app, '/races/race-1/complete-results', {
      token: 'admin-token',
    });

    assert.equal(completeResult.status, 200);
    assert.equal(completeResult.body.race.status, 'completed');
    assert.equal(completeResult.body.race.resultStatus, 'official');
    assert.equal(completeResult.body.race.replayTimeline.runners.length, 5);
    assert.equal(completeResult.body.race.replayTimeline.runners[0].position, 1);
    assert.equal(completeListener.events.length, 1);
    assert.equal(completeListener.events[0].raceId, 'race-1');
    assert.ok(Number.isFinite(Date.parse(completeListener.events[0].updatedAt)));
  } finally {
    completeListener.cleanup();
  }
});

test('referee operations broadcast live relay updates after each operation', async () => {
  const db = baseDb();
  db.races = [{
    id: 'race-1',
    tournamentId: 'tournament-1',
    name: 'Race 1',
    date: '2020-01-01',
    time: '10:00',
    status: 'published',
    resultStatus: 'draft',
    refereeUserId: 'referee-1',
  }];
  db.raceEntries = [
    {
      id: 'entry-1',
      raceId: 'race-1',
      horseId: 'horse-1',
      jockeyUserId: 'jockey-1',
      status: 'approved',
      preRaceStatus: 'pending',
      disqualified: false,
      resultStatus: 'draft',
      lane: 1,
      ratingSnapshot: 75,
      handicap: 120,
    },
    {
      id: 'entry-2',
      raceId: 'race-1',
      horseId: 'horse-2',
      jockeyUserId: 'jockey-2',
      status: 'approved',
      preRaceStatus: 'ready',
      disqualified: false,
      resultStatus: 'draft',
      lane: 2,
      ratingSnapshot: 74,
      handicap: 121,
    },
  ];

  const app = new Hono();
  app.route('/', createRefereeRoutes(async () => db, async () => undefined));

  const listener = listenRaceUpdates('race-1');
  try {
    const readinessResult = await requestJson(app, '/race-entries/entry-1/readiness/ready', {
      token: 'referee-token',
    });
    assert.equal(readinessResult.status, 200);
    assert.equal(readinessResult.body.entry.preRaceStatus, 'ready');

    db.races[0].status = 'finished';
    db.races[0].resultStatus = 'draft';

    const firstResult = await requestJson(app, '/race-entries/entry-1/result', {
      token: 'referee-token',
      body: { position: 1, finishTime: '01:00.000' },
    });
    assert.equal(firstResult.status, 200);

    const secondResult = await requestJson(app, '/race-entries/entry-2/result', {
      token: 'referee-token',
      body: { position: 2, finishTime: '01:02.500' },
    });
    assert.equal(secondResult.status, 200);

    const submitResult = await requestJson(app, '/races/race-1/submit-results', {
      token: 'referee-token',
    });
    assert.equal(submitResult.status, 200);
    assert.equal(submitResult.body.race.resultStatus, 'submitted');

    assert.equal(listener.events.length, 4);
    assert.ok(listener.events.every((event) => event.raceId === 'race-1'));
    assert.ok(listener.events.every((event) => Number.isFinite(Date.parse(event.updatedAt))));
  } finally {
    listener.cleanup();
  }
});
