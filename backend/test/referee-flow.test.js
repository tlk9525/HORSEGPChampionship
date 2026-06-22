import test from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { createRefereeRoutes } from '../src/routes/refereeRoutes.js';

const requestJson = async (app, path, token, body) => {
  const response = await app.request(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return {
    status: response.status,
    body: await response.json(),
  };
};

test('referee flow persists readiness, start, draft results and official publish', async () => {
  const db = {
    users: [
      { id: 'referee-1', name: 'Assigned Referee', role: 'referee', status: 'active' },
      { id: 'referee-2', name: 'Other Referee', role: 'referee', status: 'active' },
      { id: 'admin-1', name: 'Admin', role: 'admin', status: 'active' },
      { id: 'spectator-1', name: 'Spectator', role: 'spectator', status: 'active' },
      { id: 'owner-1', name: 'Owner', role: 'owner', status: 'active' },
      { id: 'jockey-1', name: 'Jockey One', role: 'jockey', status: 'active' },
      { id: 'jockey-2', name: 'Jockey Two', role: 'jockey', status: 'active' },
      { id: 'jockey-3', name: 'Jockey Three', role: 'jockey', status: 'active' },
    ],
    sessions: [
      { token: 'assigned-token', userId: 'referee-1' },
      { token: 'other-token', userId: 'referee-2' },
    ],
    tournaments: [
      { id: 'tournament-1', name: 'Tournament', status: 'published' },
    ],
    races: [
      {
        id: 'race-1',
        tournamentId: 'tournament-1',
        name: 'Referee Flow Race',
        date: '2020-01-01',
        time: '10:00',
        status: 'published',
        resultStatus: 'draft',
        awardsPublished: false,
      },
    ],
    raceRefereeAssignments: [
      {
        id: 'assignment-1',
        raceId: 'race-1',
        refereeUserId: 'referee-1',
        status: 'assigned',
      },
    ],
    horses: [
      { id: 'horse-1', name: 'Horse One', ownerUserId: 'owner-1' },
      { id: 'horse-2', name: 'Horse Two', ownerUserId: 'owner-1' },
      { id: 'horse-3', name: 'Horse Three', ownerUserId: 'owner-1' },
    ],
    raceEntries: [
      {
        id: 'entry-1',
        raceId: 'race-1',
        horseId: 'horse-1',
        jockeyUserId: 'jockey-1',
        status: 'approved',
        preRaceStatus: 'ready-for-referee',
        disqualified: false,
        resultStatus: 'draft',
      },
      {
        id: 'entry-2',
        raceId: 'race-1',
        horseId: 'horse-2',
        jockeyUserId: 'jockey-2',
        status: 'approved',
        preRaceStatus: 'ready-for-referee',
        disqualified: false,
        resultStatus: 'draft',
      },
      {
        id: 'entry-3',
        raceId: 'race-1',
        horseId: 'horse-3',
        jockeyUserId: 'jockey-3',
        status: 'approved',
        preRaceStatus: 'ready-for-referee',
        disqualified: false,
        resultStatus: 'draft',
      },
    ],
    notifications: [],
    raceActionLogs: [],
    refereeReports: [],
  };

  const persistedActions = [];
  const app = new Hono();
  app.route(
    '/',
    createRefereeRoutes(
      async () => db,
      async () => undefined,
      async () => undefined,
      async () => undefined,
      async () => undefined,
      async (payload) => persistedActions.push(structuredClone(payload))
    )
  );

  const unauthorized = await requestJson(
    app,
    '/race-entries/entry-1/readiness/ready',
    'other-token'
  );
  assert.equal(unauthorized.status, 403);

  for (const entryId of ['entry-1', 'entry-2', 'entry-3']) {
    const readiness = await requestJson(
      app,
      `/race-entries/${entryId}/readiness/ready`,
      'assigned-token'
    );
    assert.equal(readiness.status, 200);
  }

  const started = await requestJson(
    app,
    '/races/race-1/start',
    'assigned-token'
  );
  assert.equal(started.status, 200);
  assert.equal(started.body.race.status, 'in-progress');

  const firstResult = await requestJson(
    app,
    '/race-entries/entry-1/result',
    'assigned-token',
    { position: 1, finishTime: '01:10.000', notes: '', violationNotes: '' }
  );
  assert.equal(firstResult.status, 200);

  const duplicateResult = await requestJson(
    app,
    '/race-entries/entry-2/result',
    'assigned-token',
    { position: 1, finishTime: '01:11.000', notes: '', violationNotes: '' }
  );
  assert.equal(duplicateResult.status, 400);
  assert.match(duplicateResult.body.message, /already recorded/i);

  const secondResult = await requestJson(
    app,
    '/race-entries/entry-2/result',
    'assigned-token',
    { position: 2, finishTime: '01:12.000', notes: '', violationNotes: '' }
  );
  assert.equal(secondResult.status, 200);

  const thirdResult = await requestJson(
    app,
    '/race-entries/entry-3/result',
    'assigned-token',
    { position: 3, finishTime: '01:14.000', notes: '', violationNotes: '' }
  );
  assert.equal(thirdResult.status, 200);

  const published = await requestJson(
    app,
    '/races/race-1/submit-results',
    'assigned-token'
  );
  assert.equal(published.status, 200);
  assert.equal(published.body.race.status, 'finished');
  assert.equal(published.body.race.resultStatus, 'official');
  assert.equal(published.body.race.awardsPublished, true);
  assert.ok(published.body.entries.every((entry) => entry.resultStatus === 'official'));

  const reloadedRace = (await Promise.resolve(db)).races.find(
    (race) => race.id === 'race-1'
  );
  assert.equal(reloadedRace.status, 'finished');
  assert.equal(reloadedRace.resultStatus, 'official');
  assert.equal(persistedActions.length, 2);
  assert.equal(persistedActions[0].race.status, 'in-progress');
  assert.equal(persistedActions[1].race.status, 'finished');
});
