import test from 'node:test';
import assert from 'node:assert/strict';

import { buildOfficialReplayTimeline } from '../src/services/raceReplayTimeline.js';

const baseEntry = (index, finishTime) => ({
  id: `entry-${index}`,
  horseId: `horse-${index}`,
  lane: index,
  horseName: `Horse ${index}`,
  jockeyName: `Jockey ${index}`,
  status: 'approved',
  preRaceStatus: 'ready',
  disqualified: false,
  position: index,
  finishTime,
  ratingSnapshot: 80 - index,
  handicap: 120 + index,
});

const parseFinishTime = (value) => {
  const [minutes, secondsAndMs] = String(value).split(':');
  const [seconds, fraction = '0'] = String(secondsAndMs || '').split('.');
  return Number(minutes) * 60 + Number(seconds) + Number(fraction.padEnd(3, '0').slice(0, 3)) / 1000;
};

const progressAt = (runner, elapsedSeconds) => {
  if (!Array.isArray(runner.checkpoints) || runner.checkpoints.length === 0) {
    return 0;
  }

  if (elapsedSeconds <= 0) return 0;
  if (elapsedSeconds >= runner.finishTimeSeconds) return 1;

  const nextCheckpointIndex = runner.checkpoints.findIndex(
    (checkpoint) => checkpoint.timeSeconds >= elapsedSeconds
  );

  if (nextCheckpointIndex <= 0) return 0;

  const previousCheckpoint = runner.checkpoints[nextCheckpointIndex - 1];
  const nextCheckpoint = runner.checkpoints[nextCheckpointIndex];
  const checkpointDuration =
    nextCheckpoint.timeSeconds - previousCheckpoint.timeSeconds;
  const checkpointProgress =
    checkpointDuration > 0
      ? (elapsedSeconds - previousCheckpoint.timeSeconds) / checkpointDuration
      : 1;
  const currentDistance =
    previousCheckpoint.distanceMeters +
    (nextCheckpoint.distanceMeters - previousCheckpoint.distanceMeters) *
      checkpointProgress;

  return currentDistance / runner.checkpoints.at(-1).distanceMeters;
};

test('official replay timeline compresses placeholder finish times into a realistic spread', () => {
  const timeline = buildOfficialReplayTimeline({
    race: { id: 'race-1', distance: '2000M', surface: 'Dirt' },
    entries: Array.from({ length: 10 }, (_, index) => baseEntry(index + 1, `${String(index + 1).padStart(2, '0')}:00`)),
    horses: [],
  });

  const finishTimes = timeline.runners.map((runner) => parseFinishTime(runner.finishTime));
  const spread = Math.max(...finishTimes) - Math.min(...finishTimes);

  assert.equal(timeline.runners.length, 10);
  assert.equal(new Set(timeline.runners.map((runner) => runner.displayGate)).size, 10);
  assert.ok(
    timeline.runners.some((runner) => runner.displayGate !== runner.lane),
    'expected at least one shuffled display gate'
  );
  assert.ok(timeline.durationSeconds < 140, 'expected replay duration to stay in race-like range');
  assert.ok(spread < 8, 'expected replay finish times to stay close together');
  assert.notEqual(timeline.runners[0].finishTime, '01:00');
});

test('official replay timeline keeps already realistic finish times intact', () => {
  const timeline = buildOfficialReplayTimeline({
    race: { id: 'race-2', distance: '1600M', surface: 'Turf' },
    entries: [
      baseEntry(1, '01:39.500'),
      baseEntry(2, '01:40.200'),
      baseEntry(3, '01:41.100'),
    ],
    horses: [],
  });

  assert.equal(timeline.runners[0].finishTime, '01:39.500');
  assert.equal(timeline.runners[1].finishTime, '01:40.200');
  assert.equal(timeline.runners[2].finishTime, '01:41.100');
});

test('official replay timeline creates a more animated mid-race order than final results', () => {
  const timeline = buildOfficialReplayTimeline({
    race: { id: 'race-3', distance: '1700M', surface: 'Turf' },
    entries: Array.from({ length: 10 }, (_, index) =>
      baseEntry(index + 1, `${String(68 + index).padStart(2, '0')}:${String(200 + index * 20).padStart(2, '0')}.${String(index * 37).padStart(3, '0')}`)
    ),
    horses: [],
  });

  const midpoint = timeline.durationSeconds * 0.45;
  const finalOrder = timeline.runners.map((runner) => runner.entryId);
  const midRaceOrder = [...timeline.runners]
    .map((runner) => ({
      entryId: runner.entryId,
      progress: progressAt(runner, midpoint),
    }))
    .sort((a, b) => b.progress - a.progress)
    .map((runner) => runner.entryId);

  assert.ok(timeline.runners.every((runner) => runner.checkpoints.length > 3));
  assert.notDeepEqual(midRaceOrder, finalOrder);
});
