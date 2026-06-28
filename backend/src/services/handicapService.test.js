import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computePostRaceRating,
  computeRaceHandicap,
  horseOverallRating,
} from './handicapService.js';

test('initial rating uses the documented attribute weights', () => {
  assert.equal(
    horseOverallRating({
      speedRating: 90,
      staminaRating: 80,
      formRating: 70,
      healthRating: 60,
    }),
    79
  );
});

test('assigned weight uses one pound per rating point below the top horse', () => {
  const race = { handicapMin: 115, handicapMax: 135 };

  assert.deepEqual(
    computeRaceHandicap({ overallRating: 90 }, race, 90),
    { rating: 90, handicap: 135 }
  );
  assert.deepEqual(
    computeRaceHandicap({ overallRating: 80 }, race, 90),
    { rating: 80, handicap: 125 }
  );
  assert.deepEqual(
    computeRaceHandicap({ overallRating: 60 }, race, 90),
    { rating: 60, handicap: 115 }
  );
});

test('equal-rated 10-horse field uses actual result against 0.5 expected score', () => {
  const entries = Array.from({ length: 10 }, (_, index) => ({
    id: `entry-${index + 1}`,
    position: index + 1,
    ratingSnapshot: 75,
  }));

  assert.deepEqual(
    entries.map((entry) => computePostRaceRating(entry, entries).ratingChange),
    [5, 4, 3, 2, 1, -1, -2, -3, -4, -5]
  );
});

test('winner gains more rating when beating a stronger field', () => {
  const winner = { id: 'winner', position: 1, ratingSnapshot: 65 };
  const entries = [
    winner,
    ...Array.from({ length: 9 }, (_, index) => ({
      id: `opponent-${index + 1}`,
      position: index + 2,
      ratingSnapshot: 70,
    })),
  ];

  const result = computePostRaceRating(winner, entries);

  assert.equal(result.ratingChange, 7);
  assert.ok(result.calcLog.expectedScore < 0.5);
});

test('reduced fields scale rating changes and fields below four do not rate', () => {
  const sixEntries = Array.from({ length: 6 }, (_, index) => ({
    id: `six-${index + 1}`,
    position: index + 1,
    ratingSnapshot: 75,
  }));
  const threeEntries = Array.from({ length: 3 }, (_, index) => ({
    id: `three-${index + 1}`,
    position: index + 1,
    ratingSnapshot: 75,
  }));

  assert.equal(computePostRaceRating(sixEntries[0], sixEntries).ratingChange, 4);
  assert.equal(computePostRaceRating(sixEntries[5], sixEntries).ratingChange, -4);
  assert.equal(computePostRaceRating(threeEntries[0], threeEntries).ratingChange, 0);
});

test('positive and negative half-point changes round symmetrically', () => {
  const entries = Array.from({ length: 5 }, (_, index) => ({
    id: `entry-${index + 1}`,
    position: index + 1,
    ratingSnapshot: 75,
  }));

  assert.deepEqual(
    entries.map((entry) => computePostRaceRating(entry, entries).ratingChange),
    [3, 1, 0, -1, -3]
  );
});
