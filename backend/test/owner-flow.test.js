import test from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { createJockeyRoutes } from '../src/routes/jockeyRoutes.js';
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

const registerHorse = (app) => app.request('/race-registrations', {
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

  const response = await app.request('/race-registrations', {
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

test('owner can resubmit a horse race registration after admin rejection', async () => {
  const db = makeDb({
    id: 'race-1',
    name: 'Race 1',
    tournamentId: 'tournament-1',
    status: 'registration-open',
    raceClass: 'Open',
    registrationOpensAt: '2020-01-01T00:00:00.000Z',
    registrationClosesAt: '2099-01-01T00:00:00.000Z',
  });
  db.horseRaceRegistrations.push({
    id: 'horse-reg-rejected',
    tournamentId: 'tournament-1',
    raceId: 'race-1',
    horseId: 'horse-1',
    ownerUserId: 'owner-1',
    jockeyUserId: null,
    invitationId: null,
    status: 'rejected',
    notes: 'old note',
    createdAt: '2026-01-01T00:00:00.000Z',
    reviewedAt: '2026-01-02T00:00:00.000Z',
  });
  const app = new Hono();
  app.route('/', createOwnerRoutes(async () => db, async () => undefined));

  const response = await registerHorse(app);

  assert.equal(response.status, 201);
  assert.equal(db.horseRaceRegistrations.length, 1);
  assert.equal(db.horseRaceRegistrations[0].id, 'horse-reg-rejected');
  assert.equal(db.horseRaceRegistrations[0].status, 'pending-admin');
  assert.equal(db.horseRaceRegistrations[0].reviewedAt, null);
});

test('owner can pick another jockey after jockey rejects an invitation', async () => {
  const db = makeDb({
    id: 'race-1',
    name: 'Race 1',
    tournamentId: 'tournament-1',
    status: 'registration-open',
    raceClass: 'Open',
    registrationOpensAt: '2020-01-01T00:00:00.000Z',
    registrationClosesAt: '2099-01-01T00:00:00.000Z',
  });
  db.users.push(
    { id: 'jockey-1', name: 'Jockey One', role: 'jockey', status: 'active' },
    { id: 'jockey-2', name: 'Jockey Two', role: 'jockey', status: 'active' }
  );
  db.sessions.push({ token: 'jockey-token', userId: 'jockey-1' });
  db.jockeyRaceRegistrations.push(
    {
      id: 'jockey-reg-1',
      raceId: 'race-1',
      jockeyUserId: 'jockey-1',
      status: 'approved',
    },
    {
      id: 'jockey-reg-2',
      raceId: 'race-1',
      jockeyUserId: 'jockey-2',
      status: 'approved',
    }
  );
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
  const ownerApp = new Hono();
  ownerApp.route('/', createOwnerRoutes(async () => db, async () => undefined));
  const jockeyApp = new Hono();
  jockeyApp.route('/', createJockeyRoutes(async () => db, async () => undefined));

  const firstSelection = await ownerApp.request('/race-registrations', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer owner-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raceId: 'race-1', horseId: 'horse-1', jockeyUserId: 'jockey-1' }),
  });
  assert.equal(firstSelection.status, 201);

  const invitationId = db.jockeyInvitations[0].id;
  const rejection = await jockeyApp.request(`/invitations/${invitationId}`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer jockey-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ decision: 'rejected' }),
  });
  assert.equal(rejection.status, 200);
  assert.equal(db.horseRaceRegistrations[0].status, 'approved');
  assert.equal(db.horseRaceRegistrations[0].jockeyUserId, null);
  assert.equal(db.horseRaceRegistrations[0].invitationId, null);

  const secondSelection = await ownerApp.request('/race-registrations', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer owner-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raceId: 'race-1', horseId: 'horse-1', jockeyUserId: 'jockey-2' }),
  });

  assert.equal(secondSelection.status, 201);
  assert.equal(db.jockeyInvitations[0].jockeyUserId, 'jockey-2');
  assert.equal(db.horseRaceRegistrations[0].status, 'pending-jockey');
});
