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

test('post-race changes respect HKJC placement limits', () => {
  const entries = Array.from({ length: 6 }, (_, index) => ({
    id: `entry-${index + 1}`,
    position: index + 1,
    ratingSnapshot: 75,
  }));

  const winner = computePostRaceRating(entries[0], entries);
  const second = computePostRaceRating(entries[1], entries);
  const fifth = computePostRaceRating(entries[4], entries);
  const sixth = computePostRaceRating(entries[5], entries);

  assert.ok(winner.ratingChange >= 3);
  assert.ok(second.ratingChange >= 0 && second.ratingChange <= 5);
  assert.equal(fifth.ratingChange, 0);
  assert.ok(sixth.ratingChange <= 0);
});
