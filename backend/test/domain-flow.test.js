import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isRaceRegistrationOpen,
  publicJockeyProfiles,
  publicTournamentJockeyProfiles,
} from '../src/services/domainService.js';

const db = {
  users: [
    { id: 'jockey-1', name: 'Jockey One', email: 'one@example.com', status: 'active' },
    { id: 'jockey-2', name: 'Jockey Two', email: 'two@example.com', status: 'active' },
  ],
  jockeyProfiles: [
    { id: 'profile-1', userId: 'jockey-1', status: 'published' },
    { id: 'profile-2', userId: 'jockey-2', status: 'published' },
  ],
  races: [
    { id: 'race-1', tournamentId: 'tournament-1' },
    { id: 'race-2', tournamentId: 'tournament-1' },
  ],
  jockeyRaceRegistrations: [
    { raceId: 'race-1', jockeyUserId: 'jockey-1', status: 'approved' },
    { raceId: 'race-2', jockeyUserId: 'jockey-2', status: 'approved' },
  ],
};

test('race registration window is enforced by status and timestamps', () => {
  const now = Date.now();
  assert.equal(isRaceRegistrationOpen({
    status: 'registration-open',
    registrationOpensAt: new Date(now - 1000).toISOString(),
    registrationClosesAt: new Date(now + 1000).toISOString(),
  }, now), true);
  assert.equal(isRaceRegistrationOpen({
    status: 'registration-open',
    registrationClosesAt: new Date(now - 1).toISOString(),
  }, now), false);
  assert.equal(isRaceRegistrationOpen({ status: 'registration-closed' }, now), false);
});

test('legacy registration-open races without timestamps remain available', () => {
  assert.equal(isRaceRegistrationOpen({ status: 'registration-open' }), true);
});

test('public jockey profiles hide email unless explicitly requested', () => {
  assert.equal('jockeyEmail' in publicJockeyProfiles(db)[0], false);
  assert.equal(
    publicJockeyProfiles(db, { includeEmail: true })[0].jockeyEmail,
    'one@example.com'
  );
});

test('jockey selection is filtered to the selected race', () => {
  assert.deepEqual(
    publicTournamentJockeyProfiles(db, 'tournament-1', 'race-1').map((item) => item.userId),
    ['jockey-1']
  );
});
