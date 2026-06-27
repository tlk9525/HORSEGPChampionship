import test from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { createOwnerRoutes } from '../src/routes/ownerRoutes.js';

const makeDb = (race) => ({
  users: [
    { id: 'owner-1', name: 'Owner', role: 'owner', status: 'active' },
    { id: 'admin-1', name: 'Admin', role: 'admin', status: 'active' },
  ],
  sessions: [{ token: 'owner-token', userId: 'owner-1' }],
  tournaments: [{ id: 'tournament-1', name: 'Tournament', status: 'active' }],
  races: [race],
  horses: [{
    id: 'horse-1',
    name: 'Horse',
    ownerUserId: 'owner-1',
    status: 'approved',
    overallRating: 50,
    jockeyConfirmation: 'waiting-owner',
  }],
  raceEntries: [],
  jockeyInvitations: [],
  jockeyRaceRegistrations: [],
  horseRaceRegistrations: [],
  notifications: [],
});

const registerHorse = (app) => app.request('/race-entries', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer owner-token',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ raceId: 'race-1', horseId: 'horse-1' }),
});

test('owner cannot register after the race registration deadline', async () => {
  const db = makeDb({
    id: 'race-1',
    tournamentId: 'tournament-1',
    status: 'registration-open',
    raceClass: 'Open',
    registrationClosesAt: '2020-01-01T00:00:00.000Z',
  });
  const app = new Hono();
  app.route('/', createOwnerRoutes(async () => db, async () => undefined));

  assert.equal((await registerHorse(app)).status, 400);
});

test('owner registration keeps the selected race id', async () => {
  const db = makeDb({
    id: 'race-1',
    tournamentId: 'tournament-1',
    status: 'registration-open',
    raceClass: 'Open',
    registrationOpensAt: '2020-01-01T00:00:00.000Z',
    registrationClosesAt: '2099-01-01T00:00:00.000Z',
  });
  const app = new Hono();
  app.route('/', createOwnerRoutes(async () => db, async () => undefined));

  assert.equal((await registerHorse(app)).status, 201);
  assert.equal(db.horseRaceRegistrations[0].raceId, 'race-1');
});

test('owner jockey selection creates a pending invitation after horse approval', async () => {
  const db = makeDb({
    id: 'race-1',
    name: 'Race 1',
    tournamentId: 'tournament-1',
    status: 'registration-open',
    raceClass: 'Open',
    registrationOpensAt: '2020-01-01T00:00:00.000Z',
    registrationClosesAt: '2099-01-01T00:00:00.000Z',
  });
  db.users.push({ id: 'jockey-1', name: 'Jockey', role: 'jockey', status: 'active' });
  db.jockeyRaceRegistrations.push({
    id: 'jockey-reg-1',
    tournamentId: 'tournament-1',
    raceId: 'race-1',
    jockeyUserId: 'jockey-1',
    status: 'approved',
  });
  db.horseRaceRegistrations.push({
    id: 'horse-reg-1',
    tournamentId: 'tournament-1',
    raceId: 'race-1',
    horseId: 'horse-1',
    ownerUserId: 'owner-1',
    jockeyUserId: null,
    invitationId: null,
    status: 'approved',
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    reviewedAt: '2026-01-01T00:00:00.000Z',
  });
  const app = new Hono();
  app.route('/', createOwnerRoutes(async () => db, async () => undefined));

  const response = await app.request('/race-entries', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer owner-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raceId: 'race-1', horseId: 'horse-1', jockeyUserId: 'jockey-1' }),
  });

  assert.equal(response.status, 201);
  assert.equal(db.jockeyInvitations[0].status, 'pending');
  assert.equal(db.jockeyInvitations[0].adminStatus, null);
  assert.equal(db.horseRaceRegistrations[0].status, 'pending-jockey');
});
