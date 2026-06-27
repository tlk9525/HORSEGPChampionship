import test from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { createRefereeRoutes } from '../src/routes/refereeRoutes.js';

const requestJson = async (app, path) => {
  const response = await app.request(path, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer referee-token',
      'Content-Type': 'application/json',
    },
  });

  return { status: response.status, body: await response.json() };
};

const baseDb = () => ({
  users: [
    { id: 'referee-1', name: 'Referee', role: 'referee', status: 'active' },
    { id: 'owner-1', name: 'Owner', role: 'owner', status: 'active' },
    { id: 'jockey-1', name: 'Jockey', role: 'jockey', status: 'active' },
  ],
  sessions: [{ token: 'referee-token', userId: 'referee-1' }],
  tournaments: [{ id: 'tournament-1', name: 'Tournament', status: 'active' }],
  races: [{
    id: 'race-1',
    tournamentId: 'tournament-1',
    name: 'Race',
    status: 'published',
    resultStatus: 'draft',
  }],
  raceRefereeAssignments: [{
    id: 'assignment-1',
    raceId: 'race-1',
    refereeUserId: 'referee-1',
    status: 'assigned',
  }],
  horses: [{ id: 'horse-1', name: 'Horse', ownerUserId: 'owner-1' }],
  raceEntries: [{
    id: 'entry-1',
    raceId: 'race-1',
    horseId: 'horse-1',
    jockeyUserId: 'jockey-1',
    status: 'approved',
    preRaceStatus: 'pending',
    disqualified: false,
    resultStatus: 'draft',
  }],
  jockeyProfiles: [],
  jockeyRaceRegistrations: [],
  jockeyInvitations: [],
  horseTournamentRegistrations: [],
  raceActionLogs: [],
  refereeReports: [],
  notifications: [],
});

test('referee can mark an unresolved check-in incident', async () => {
  const db = baseDb();
  const app = new Hono();
  app.route('/', createRefereeRoutes(async () => db, async () => undefined));

  const result = await requestJson(app, '/race-entries/entry-1/readiness/incident');

  assert.equal(result.status, 200);
  assert.equal(db.raceEntries[0].status, 'approved');
  assert.equal(db.raceEntries[0].preRaceStatus, 'incident');
  assert.equal(db.raceEntries[0].disqualified, false);
});

test('referee can scratch an entry during check-in', async () => {
  const db = baseDb();
  const app = new Hono();
  app.route('/', createRefereeRoutes(async () => db, async () => undefined));

  const result = await requestJson(app, '/race-entries/entry-1/readiness/scratched');

  assert.equal(result.status, 200);
  assert.equal(db.raceEntries[0].status, 'scratched');
  assert.equal(db.raceEntries[0].preRaceStatus, 'scratched');
  assert.equal(db.raceEntries[0].disqualified, true);
  assert.equal(db.raceEntries[0].resultStatus, 'disqualified');
});
