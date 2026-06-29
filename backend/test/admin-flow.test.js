import test from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { createAdminRoutes } from '../src/routes/adminRoutes.js';

const requestJson = async (app, path, body, method = 'POST') => {
  const response = await app.request(path, {
    method,
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

test('admin can update tournament name and schedule dates', async () => {
  const db = baseDb();
  db.tournaments[0] = {
    ...db.tournaments[0],
    startDate: '2099-01-01',
    finalDate: '2099-01-10',
    location: 'Old Track',
  };
  let writes = 0;
  const app = new Hono();
  app.route('/', createAdminRoutes(async () => db, async () => {
    writes += 1;
  }));

  const result = await requestJson(app, '/tournaments/tournament-1', {
    name: 'Updated Tournament',
    startDate: '2099-02-01',
    finalDate: '2099-02-15',
  }, 'PATCH');

  assert.equal(result.status, 200);
  assert.equal(result.body.tournament.name, 'Updated Tournament');
  assert.equal(result.body.tournament.startDate, '2099-02-01');
  assert.equal(result.body.tournament.finalDate, '2099-02-15');
  assert.equal(result.body.tournament.location, 'Old Track');
  assert.equal(db.tournaments[0].name, 'Updated Tournament');
  assert.equal(writes, 1);
});

test('admin cannot set tournament end date before start date', async () => {
  const db = baseDb();
  db.tournaments[0] = {
    ...db.tournaments[0],
    name: 'Original Tournament',
    startDate: '2099-01-01',
    finalDate: '2099-01-10',
  };
  const app = new Hono();
  app.route('/', createAdminRoutes(async () => db, async () => undefined));

  const result = await requestJson(app, '/tournaments/tournament-1', {
    name: 'Invalid Tournament',
    startDate: '2099-02-15',
    finalDate: '2099-02-01',
  }, 'PATCH');

  assert.equal(result.status, 400);
  assert.match(result.body.message, /End date must be after start date/i);
  assert.equal(db.tournaments[0].name, 'Original Tournament');
});

test('admin can delete a tournament with all dependent race data', async () => {
  const db = baseDb();
  db.tournaments.push({ id: 'other-tournament', name: 'Other', status: 'active' });
  db.races = [
    { id: 'race-1', tournamentId: 'tournament-1', name: 'Race 1', status: 'registration-open' },
    { id: 'other-race', tournamentId: 'other-tournament', name: 'Other Race', status: 'registration-open' },
  ];
  db.raceEntries = [
    { id: 'entry-1', raceId: 'race-1', horseId: 'horse-1', status: 'approved' },
    { id: 'other-entry', raceId: 'other-race', horseId: 'horse-1', status: 'approved' },
  ];
  db.horseRaceRegistrations = [
    ...db.horseRaceRegistrations,
    { id: 'registration-1', tournamentId: 'tournament-1', raceId: 'race-1', status: 'approved' },
    { id: 'other-registration', tournamentId: 'other-tournament', raceId: 'other-race', status: 'approved' },
  ];
  db.jockeyRaceRegistrations = [
    { id: 'jockey-registration-1', raceId: 'race-1', jockeyUserId: 'jockey-1', status: 'approved' },
    { id: 'other-jockey-registration', raceId: 'other-race', jockeyUserId: 'jockey-1', status: 'approved' },
  ];
  db.jockeyInvitations = [
    { id: 'invitation-1', tournamentId: 'tournament-1', raceId: 'race-1' },
    { id: 'other-invitation', tournamentId: 'other-tournament', raceId: 'other-race' },
  ];
  db.raceRefereeAssignments = [
    { id: 'assignment-1', raceId: 'race-1', refereeUserId: 'referee-1' },
    { id: 'other-assignment', raceId: 'other-race', refereeUserId: 'referee-1' },
  ];
  db.refereeReports = [
    { id: 'report-1', raceId: 'race-1', raceEntryId: 'entry-1' },
    { id: 'other-report', raceId: 'other-race', raceEntryId: 'other-entry' },
  ];
  db.raceActionLogs = [
    { id: 'log-1', raceId: 'race-1' },
    { id: 'other-log', raceId: 'other-race' },
  ];
  let writes = 0;
  const app = new Hono();
  app.route('/', createAdminRoutes(async () => db, async () => {
    writes += 1;
  }));

  const result = await requestJson(app, '/tournaments/tournament-1', undefined, 'DELETE');

  assert.equal(result.status, 200);
  assert.deepEqual(result.body.raceIds, ['race-1']);
  assert.equal(db.tournaments.some((item) => item.id === 'tournament-1'), false);
  assert.equal(db.races.some((item) => item.id === 'race-1'), false);
  assert.equal(db.raceEntries.some((item) => item.id === 'entry-1'), false);
  assert.equal(db.horseRaceRegistrations.some((item) => item.tournamentId === 'tournament-1'), false);
  assert.equal(db.jockeyRaceRegistrations.some((item) => item.raceId === 'race-1'), false);
  assert.equal(db.jockeyInvitations.some((item) => item.tournamentId === 'tournament-1'), false);
  assert.equal(db.raceRefereeAssignments.some((item) => item.raceId === 'race-1'), false);
  assert.equal(db.refereeReports.some((item) => item.raceId === 'race-1'), false);
  assert.equal(db.raceActionLogs.some((item) => item.raceId === 'race-1'), false);
  assert.equal(db.races.some((item) => item.id === 'other-race'), true);
  assert.equal(writes, 1);
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

test('admin cannot close registration before 10 horse-jockey pairs are approved', async () => {
  const db = baseDb();
  db.races = [{
    id: 'race-1',
    tournamentId: 'tournament-1',
    name: 'Race',
    date: '2099-01-01',
    time: '10:00',
    status: 'registration-open',
    raceClass: 'Open',
    handicapMin: 115,
    handicapMax: 135,
    registrationOpensAt: '2020-01-01T00:00:00.000Z',
    registrationClosesAt: '2099-01-01T00:00:00.000Z',
  }];
  db.raceEntries = [
    { id: 'entry-1', raceId: 'race-1', horseId: 'horse-1', jockeyUserId: 'jockey-1', status: 'approved', disqualified: false },
  ];
  const app = new Hono();
  app.route('/', createAdminRoutes(async () => db, async () => undefined));

  const result = await requestJson(app, '/races/race-1/close-registration');

  assert.equal(result.status, 400);
  assert.match(result.body.message, /Current: 1\/10/i);
  assert.equal(db.races[0].status, 'registration-open');
});

test('admin cannot close registration with duplicate approved jockeys', async () => {
  const db = baseDb();
  db.races = [{
    id: 'race-1',
    tournamentId: 'tournament-1',
    name: 'Race',
    status: 'registration-open',
  }];
  db.raceEntries = Array.from({ length: 10 }, (_, index) => ({
    id: `entry-${index + 1}`,
    raceId: 'race-1',
    horseId: `horse-${index + 1}`,
    jockeyUserId: 'jockey-1',
    status: 'approved',
  }));
  const app = new Hono();
  app.route('/', createAdminRoutes(async () => db, async () => undefined));

  const result = await requestJson(app, '/races/race-1/close-registration');

  assert.equal(result.status, 400);
  assert.match(result.body.message, /Current: 1\/10/i);
  assert.equal(db.races[0].status, 'registration-open');
});

test('admin can close registration after 10 horse-jockey pairs are approved', async () => {
  const db = baseDb();
  db.races = [{
    id: 'race-1',
    tournamentId: 'tournament-1',
    name: 'Race',
    date: '2099-01-01',
    time: '10:00',
    status: 'registration-open',
    raceClass: 'Open',
    handicapMin: 115,
    handicapMax: 135,
    registrationOpensAt: '2020-01-01T00:00:00.000Z',
    registrationClosesAt: '2099-01-01T00:00:00.000Z',
  }];
  db.horses = Array.from({ length: 10 }, (_, index) => ({
    id: `horse-${index + 1}`,
    name: `Horse ${index + 1}`,
    ownerUserId: 'owner-1',
    overallRating: 50 + index,
  }));
  db.raceEntries = Array.from({ length: 10 }, (_, index) => ({
    id: `entry-${index + 1}`,
    raceId: 'race-1',
    horseId: `horse-${index + 1}`,
    jockeyUserId: `jockey-${index + 1}`,
    status: 'approved',
    disqualified: false,
  }));
  const app = new Hono();
  app.route('/', createAdminRoutes(async () => db, async () => undefined));

  const result = await requestJson(app, '/races/race-1/close-registration');

  assert.equal(result.status, 200);
  assert.equal(result.body.race.status, 'registration-closed');
  assert.equal(db.raceEntries.length, 10);
  assert.ok(db.raceEntries.every((entry) => entry.preRaceStatus === 'ready-for-referee'));
  assert.deepEqual(
    db.raceEntries.map((entry) => entry.lane).sort((a, b) => a - b),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  );
});

test('admin cannot publish legacy closed registration with fewer than 10 pairs', async () => {
  const db = baseDb();
  db.races = [{
    id: 'race-1',
    tournamentId: 'tournament-1',
    name: 'Race',
    status: 'registration-closed',
  }];
  db.raceEntries = [{
    id: 'entry-1',
    raceId: 'race-1',
    horseId: 'horse-1',
    jockeyUserId: 'jockey-1',
    status: 'approved',
  }];
  const app = new Hono();
  app.route('/', createAdminRoutes(async () => db, async () => undefined));

  const result = await requestJson(app, '/races/race-1/publish');

  assert.equal(result.status, 400);
  assert.match(result.body.message, /exactly 10 distinct approved/i);
  assert.equal(db.races[0].status, 'registration-closed');
});

test('admin completion applies expected-versus-actual rating changes to horses', async () => {
  const db = baseDb();
  db.tournaments[0].finalDate = '2099-01-01';
  db.races = [{
    id: 'race-1',
    tournamentId: 'tournament-1',
    name: 'Race',
    status: 'finished',
    resultStatus: 'submitted',
  }];
  db.horses = Array.from({ length: 10 }, (_, index) => ({
    id: `horse-${index + 1}`,
    name: `Horse ${index + 1}`,
    ownerUserId: 'owner-1',
    overallRating: 75,
  }));
  db.raceEntries = Array.from({ length: 10 }, (_, index) => ({
    id: `entry-${index + 1}`,
    raceId: 'race-1',
    horseId: `horse-${index + 1}`,
    jockeyUserId: `jockey-${index + 1}`,
    status: 'approved',
    preRaceStatus: 'ready',
    disqualified: false,
    resultStatus: 'submitted',
    ratingSnapshot: 75,
    position: index + 1,
  }));
  const app = new Hono();
  app.route('/', createAdminRoutes(async () => db, async () => undefined));

  const result = await requestJson(app, '/races/race-1/complete-results');

  assert.equal(result.status, 200);
  assert.equal(result.body.race.status, 'completed');
  assert.equal(db.tournaments[0].status, 'active');
  assert.deepEqual(
    db.raceEntries.map((entry) => entry.ratingChange),
    [5, 4, 3, 2, 1, -1, -2, -3, -4, -5]
  );
  assert.deepEqual(
    db.horses.map((horse) => horse.overallRating),
    [80, 79, 78, 77, 76, 74, 73, 72, 71, 70]
  );
});

test('admin completion only completes a tournament after the tournament end date has passed', async () => {
  const db = baseDb();
  db.tournaments[0].finalDate = '2020-01-01';
  db.races = [{
    id: 'race-1',
    tournamentId: 'tournament-1',
    name: 'Race',
    status: 'finished',
    resultStatus: 'submitted',
  }];
  db.horses = Array.from({ length: 4 }, (_, index) => ({
    id: `horse-${index + 1}`,
    name: `Horse ${index + 1}`,
    ownerUserId: 'owner-1',
    overallRating: 75,
  }));
  db.raceEntries = Array.from({ length: 4 }, (_, index) => ({
    id: `entry-${index + 1}`,
    raceId: 'race-1',
    horseId: `horse-${index + 1}`,
    jockeyUserId: `jockey-${index + 1}`,
    status: 'approved',
    preRaceStatus: 'ready',
    disqualified: false,
    resultStatus: 'submitted',
    ratingSnapshot: 75,
    position: index + 1,
  }));
  const app = new Hono();
  app.route('/', createAdminRoutes(async () => db, async () => undefined));

  const result = await requestJson(app, '/races/race-1/complete-results');

  assert.equal(result.status, 200);
  assert.equal(db.races[0].status, 'completed');
  assert.equal(db.tournaments[0].status, 'completed');
});

test('admin cannot complete results with a missing rating snapshot', async () => {
  const db = baseDb();
  db.races = [{
    id: 'race-1',
    tournamentId: 'tournament-1',
    name: 'Race',
    status: 'finished',
    resultStatus: 'submitted',
  }];
  db.horses = Array.from({ length: 4 }, (_, index) => ({
    id: `horse-${index + 1}`,
    name: `Horse ${index + 1}`,
    ownerUserId: 'owner-1',
    overallRating: 75,
  }));
  db.raceEntries = Array.from({ length: 4 }, (_, index) => ({
    id: `entry-${index + 1}`,
    raceId: 'race-1',
    horseId: `horse-${index + 1}`,
    jockeyUserId: `jockey-${index + 1}`,
    status: 'approved',
    preRaceStatus: 'ready',
    disqualified: false,
    resultStatus: 'submitted',
    ratingSnapshot: index === 3 ? null : 75,
    position: index + 1,
  }));
  const app = new Hono();
  app.route('/', createAdminRoutes(async () => db, async () => undefined));

  const result = await requestJson(app, '/races/race-1/complete-results');

  assert.equal(result.status, 400);
  assert.match(result.body.message, /missing or invalid rating snapshot/i);
  assert.equal(db.races[0].status, 'finished');
  assert.equal(db.races[0].resultStatus, 'submitted');
  assert.ok(db.raceEntries.every((entry) => entry.ratingChange === undefined));
  assert.ok(db.horses.every((horse) => horse.overallRating === 75));
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
