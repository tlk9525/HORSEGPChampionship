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

test('post-race changes reward placed horses and reduce the last horse', () => {
  const entries = Array.from({ length: 6 }, (_, index) => ({
    id: `entry-${index + 1}`,
    position: index + 1,
    ratingSnapshot: 75,
  }));

  assert.ok(computePostRaceRating(entries[0], entries).ratingChange > 0);
  assert.ok(computePostRaceRating(entries[1], entries).ratingChange > 0);
  assert.equal(computePostRaceRating(entries[2], entries).ratingChange, 1);
  assert.equal(computePostRaceRating(entries[5], entries).ratingChange, -4);
});
