import test from 'node:test';
import assert from 'node:assert/strict';

import {
  broadcastRaceUpdate,
  __liveRaceEventsForTest,
} from '../src/services/liveRaceEvents.js';

test('broadcastRaceUpdate ignores a broken SSE listener instead of throwing', () => {
  const raceId = 'race-broadcast-test';
  const listener = () => {
    throw new Error('broken listener');
  };

  __liveRaceEventsForTest.on(`race:${raceId}`, listener);

  assert.doesNotThrow(() => {
    broadcastRaceUpdate(raceId);
  });

  assert.equal(__liveRaceEventsForTest.listeners(`race:${raceId}`).includes(listener), false);
});
