import test from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { createJockeyRoutes } from '../src/routes/jockeyRoutes.js';

const makeDb = () => ({
  users: [
    { id: 'jockey-1', name: 'Jockey', role: 'jockey', status: 'active' },
    { id: 'admin-1', name: 'Admin', role: 'admin', status: 'active' },
  ],
  sessions: [{ token: 'jockey-token', userId: 'jockey-1' }],
  tournaments: [{ id: 'tournament-1', name: 'Tournament', status: 'active' }],
  races: [{
    id: 'race-1',
    name: 'Race 1',
    tournamentId: 'tournament-1',
    status: 'registration-open',
    registrationOpensAt: '2020-01-01T00:00:00.000Z',
    registrationClosesAt: '2099-01-01T00:00:00.000Z',
  }],
  horses: [],
  raceEntries: [],
  jockeyInvitations: [],
  jockeyRaceRegistrations: [{
    id: 'jockey-reg-1',
    raceId: 'race-1',
    jockeyUserId: 'jockey-1',
    status: 'rejected',
    createdAt: '2026-01-01T00:00:00.000Z',
    reviewedAt: '2026-01-02T00:00:00.000Z',
  }],
  horseRaceRegistrations: [],
  notifications: [],
});

test('jockey can resubmit a rejected race registration without creating a duplicate', async () => {
  const db = makeDb();
  const app = new Hono();
  app.route('/', createJockeyRoutes(async () => db, async () => undefined));

  const response = await app.request('/race-registrations', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer jockey-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raceId: 'race-1' }),
  });

  assert.equal(response.status, 200);
  assert.equal(db.jockeyRaceRegistrations.length, 1);
  assert.equal(db.jockeyRaceRegistrations[0].id, 'jockey-reg-1');
  assert.equal(db.jockeyRaceRegistrations[0].status, 'pending');
  assert.equal(db.jockeyRaceRegistrations[0].reviewedAt, null);
});
