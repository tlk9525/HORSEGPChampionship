import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatApprovals,
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

test('admin approval items include horse, jockey and race review information', () => {
  const approvalDb = {
    users: [
      {
        id: 'owner-1',
        name: 'Owner One',
        email: 'owner@example.com',
        role: 'owner',
        status: 'active',
      },
      {
        id: 'jockey-1',
        name: 'Jockey One',
        email: 'jockey@example.com',
        role: 'jockey',
        status: 'active',
      },
    ],
    tournaments: [
      { id: 'tournament-1', name: 'Summer Cup', status: 'active' },
    ],
    races: [
      {
        id: 'race-1',
        tournamentId: 'tournament-1',
        raceNumber: 'R3',
        name: 'Class 4 Sprint',
        date: '2026-07-04',
        time: '14:00',
        venue: 'Track 1',
        distance: '1200m',
        surface: 'Turf',
        raceClass: 'Class 4',
      },
    ],
    horses: [
      {
        id: 'horse-1',
        name: 'Thunder',
        ownerUserId: 'owner-1',
        status: 'approved',
        overallRating: 55,
        speedRating: 70,
        staminaRating: 60,
        formRating: 65,
        healthRating: 80,
        breed: 'Thoroughbred',
        age: 4,
        sex: 'Stallion',
        weightLb: 1100,
        healthStatus: 'Fit',
        veterinaryCertificateUrl: 'certificate.pdf',
      },
    ],
    jockeyProfiles: [
      {
        id: 'profile-1',
        userId: 'jockey-1',
        weightLb: 116,
        competitionLevel: 'Professional',
        certificate: 'Licensed',
        status: 'published',
      },
    ],
    jockeyRaceRegistrations: [],
    horseRaceRegistrations: [],
    jockeyInvitations: [
      {
        id: 'invitation-1',
        horseId: 'horse-1',
        ownerUserId: 'owner-1',
        jockeyUserId: 'jockey-1',
        raceId: 'race-1',
        status: 'accepted',
        adminStatus: 'pending',
        createdAt: '2026-06-29T00:00:00.000Z',
      },
    ],
  };

  const [approval] = formatApprovals(approvalDb);
  assert.equal(approval.entityType, 'pairing');
  assert.deepEqual(
    approval.reviewSections.map((section) => section.title),
    ['Owner', 'Horse', 'Jockey', 'Race']
  );
  assert.equal(
    approval.reviewSections
      .find((section) => section.title === 'Horse')
      .fields.find((field) => field.label === 'Official Rating').value,
    '55'
  );
  assert.equal(
    approval.reviewSections
      .find((section) => section.title === 'Jockey')
      .fields.find((field) => field.label === 'Weight').value,
    '116lb'
  );
  assert.equal(
    approval.reviewSections
      .find((section) => section.title === 'Race')
      .fields.find((field) => field.label === 'Race').value,
    'R3 - Class 4 Sprint'
  );
  assert.deepEqual(approval.warnings, []);
});
