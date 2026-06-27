import test from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { createAdminRoutes } from '../src/routes/adminRoutes.js';

const requestJson = async (app, path, body) => {
  const response = await app.request(path, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer admin-token',
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
};

const baseDb = () => ({
  users: [
    { id: 'admin-1', name: 'Admin', role: 'admin', status: 'active' },
    { id: 'referee-1', name: 'Referee', role: 'referee', status: 'active' },
    { id: 'owner-1', name: 'Owner', role: 'owner', status: 'active' },
    { id: 'jockey-1', name: 'Jockey', role: 'jockey', status: 'active' },
  ],
  sessions: [{ token: 'admin-token', userId: 'admin-1' }],
  tournaments: [{ id: 'tournament-1', name: 'Tournament', status: 'active' }],
  races: [],
  horses: [{ id: 'horse-1', name: 'Horse', ownerUserId: 'owner-1', overallRating: 50 }],
  jockeyProfiles: [],
  jockeyRaceRegistrations: [],
  jockeyInvitations: [],
  horseRaceRegistrations: [{
    id: 'registration-old',
    tournamentId: 'tournament-1',
    raceId: 'old-race',
    horseId: 'horse-1',
    ownerUserId: 'owner-1',
    jockeyUserId: 'jockey-1',
    status: 'approved',
  }],
  raceEntries: [],
  raceRefereeAssignments: [],
  raceActionLogs: [],
  refereeReports: [],
  notifications: [],
});

test('race creation rejects invalid registration timestamps', async () => {
  const db = baseDb();
  const app = new Hono();
  app.route('/', createAdminRoutes(async () => db, async () => undefined));

  const result = await requestJson(app, '/races', {
    tournamentId: 'tournament-1',
    raceNumber: 'R1',
    name: 'Race',
    date: '2099-01-02',
    time: '14:00',
    venue: 'Track',
    distance: 1200,
    surface: 'Turf',
    raceClass: 'Open',
    refereeUserId: 'referee-1',
    registrationOpensAt: 'invalid',
    registrationClosesAt: '2099-01-01T12:00:00.000Z',
  });

  assert.equal(result.status, 400);
  assert.match(result.body.message, /must be valid/i);
});

test('creating a race does not copy approved pairs from another race', async () => {
  const db = baseDb();
  const app = new Hono();
  app.route('/', createAdminRoutes(async () => db, async () => undefined));

  const result = await requestJson(app, '/races', {
    tournamentId: 'tournament-1',
    raceNumber: 'R1',
    name: 'Race',
    date: '2099-01-02',
    time: '14:00',
    venue: 'Track',
    distance: 1200,
    surface: 'Turf',
    raceClass: 'Open',
    refereeUserId: 'referee-1',
    registrationOpensAt: '2099-01-01T08:00:00.000Z',
    registrationClosesAt: '2099-01-01T12:00:00.000Z',
  });

  assert.equal(result.status, 201);
  assert.equal(db.raceEntries.length, 0);
});

test('a published race can start before schedule after referee check-in is complete', async () => {
  const db = baseDb();
  db.races = [{
    id: 'race-1',
    tournamentId: 'tournament-1',
    name: 'Race',
    date: '2099-01-01',
    time: '10:00',
    status: 'published',
    resultStatus: 'draft',
  }];
  db.raceEntries = [
    { id: 'entry-1', raceId: 'race-1', horseId: 'horse-1', jockeyUserId: 'jockey-1', status: 'approved', preRaceStatus: 'ready', disqualified: false },
    { id: 'entry-2', raceId: 'race-1', horseId: 'horse-1', jockeyUserId: 'jockey-1', status: 'approved', preRaceStatus: 'absent', disqualified: true },
  ];
  const app = new Hono();
  app.route('/', createAdminRoutes(async () => db, async () => undefined));

  const result = await requestJson(app, '/races/race-1/start-race');

  assert.equal(result.status, 200);
  assert.equal(result.body.race.status, 'in-progress');
});

test('a published race cannot start while an incident is unresolved', async () => {
  const db = baseDb();
  db.races = [{
    id: 'race-1',
    tournamentId: 'tournament-1',
    name: 'Race',
    date: '2020-01-01',
    time: '10:00',
    status: 'published',
    resultStatus: 'draft',
  }];
  db.raceEntries = [
    { id: 'entry-1', raceId: 'race-1', horseId: 'horse-1', jockeyUserId: 'jockey-1', status: 'approved', preRaceStatus: 'ready', disqualified: false },
    { id: 'entry-2', raceId: 'race-1', horseId: 'horse-2', jockeyUserId: 'jockey-2', status: 'approved', preRaceStatus: 'incident', disqualified: false },
  ];
  const app = new Hono();
  app.route('/', createAdminRoutes(async () => db, async () => undefined));

  const result = await requestJson(app, '/races/race-1/start-race');

  assert.equal(result.status, 400);
  assert.match(result.body.message, /Ready or Absent/i);
});

test('a scratched entry is not counted as an active runner when starting', async () => {
  const db = baseDb();
  db.races = [{
    id: 'race-1',
    tournamentId: 'tournament-1',
    name: 'Race',
    date: '2020-01-01',
    time: '10:00',
    status: 'published',
    resultStatus: 'draft',
  }];
  db.raceEntries = [
    { id: 'entry-1', raceId: 'race-1', horseId: 'horse-1', jockeyUserId: 'jockey-1', status: 'approved', preRaceStatus: 'ready', disqualified: false },
    { id: 'entry-2', raceId: 'race-1', horseId: 'horse-2', jockeyUserId: 'jockey-2', status: 'scratched', preRaceStatus: 'scratched', disqualified: true },
  ];
  const app = new Hono();
  app.route('/', createAdminRoutes(async () => db, async () => undefined));

  const result = await requestJson(app, '/races/race-1/start-race');

  assert.equal(result.status, 200);
  assert.equal(result.body.race.status, 'in-progress');
});

test('admin rejecting a pairing keeps the approved horse registration reusable', async () => {
  const db = baseDb();
  db.races = [{
    id: 'race-1',
    tournamentId: 'tournament-1',
    name: 'Race',
    date: '2099-01-01',
    time: '10:00',
    status: 'registration-open',
    raceClass: 'Open',
    registrationOpensAt: '2020-01-01T00:00:00.000Z',
    registrationClosesAt: '2099-01-01T00:00:00.000Z',
  }];
  db.horseRaceRegistrations = [{
    id: 'horse-reg-1',
    tournamentId: 'tournament-1',
    raceId: 'race-1',
    horseId: 'horse-1',
    ownerUserId: 'owner-1',
    jockeyUserId: 'jockey-1',
    invitationId: 'invitation-1',
    status: 'pending-admin',
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    reviewedAt: null,
  }];
  db.jockeyInvitations = [{
    id: 'invitation-1',
    tournamentId: 'tournament-1',
    raceId: 'race-1',
    horseId: 'horse-1',
    ownerUserId: 'owner-1',
    jockeyUserId: 'jockey-1',
    status: 'accepted',
    adminStatus: 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
    respondedAt: '2026-01-01T01:00:00.000Z',
  }];
  const app = new Hono();
  app.route('/', createAdminRoutes(async () => db, async () => undefined));

  const result = await requestJson(app, '/approvals/pairing/invitation-1', { decision: 'rejected' });

  assert.equal(result.status, 200);
  assert.equal(db.jockeyInvitations[0].adminStatus, 'rejected');
  assert.equal(db.horseRaceRegistrations[0].status, 'approved');
  assert.equal(db.horseRaceRegistrations[0].jockeyUserId, null);
  assert.equal(db.horseRaceRegistrations[0].invitationId, null);
});
