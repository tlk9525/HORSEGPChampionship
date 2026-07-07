import type { RaceRecord, RaceReplayRunner } from '../services/api';

export type RaceSurface = 'Turf' | 'Dirt' | 'Synthetic';

export interface RaceSimulationEntryInput {
  id: string;
  lane?: number | null;
  horseName?: string;
  jockeyName?: string;
  ratingSnapshot?: number | null;
  handicap?: number | null;
  horseWeightLb?: number | null;
  jockeyWeightLb?: number | null;
  horseSpeedRating?: number | null;
  horseStaminaRating?: number | null;
  horseFormRating?: number | null;
  horseOverallRating?: number | null;
}

export interface RaceCheckpoint {
  distanceMeters: number;
  timeSeconds: number;
}

export interface RaceSimulationRunner {
  entryId: string;
  lane: number;
  displayGate: number;
  horseName: string;
  jockeyName: string;
  silkColor: string;
  rating: number;
  carriedWeight: number;
  speed: number;
  stamina: number;
  form: number;
  phase: number;
  performanceScore: number;
  finishTimeSeconds: number;
  checkpoints: RaceCheckpoint[];
}

export interface RaceSimulationPlan {
  seed: number;
  distanceMeters: number;
  surface: RaceSurface;
  durationSeconds: number;
  runners: RaceSimulationRunner[];
}

const baseSpeedBySurface: Record<RaceSurface, number> = {
  Turf: 17,
  Dirt: 16,
  Synthetic: 16.5,
};

const silkPalette = [
  '#f4c542',
  '#ef4444',
  '#22c55e',
  '#6366f1',
  '#cbd5e1',
  '#38bdf8',
  '#f97316',
  '#a855f7',
  '#14b8a6',
  '#f472b6',
];

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const parseRaceDistanceMeters = (distance?: string | number | null) => {
  const parsed = Number(String(distance ?? '').replace(/[^\d.]/g, ''));

  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 1600;
};

export const normalizeRaceSurface = (surface?: string | null): RaceSurface => {
  const normalized = String(surface || '').toLowerCase();

  if (normalized.includes('dirt')) return 'Dirt';
  if (normalized.includes('synthetic')) return 'Synthetic';
  return 'Turf';
};

export const hashRaceSeed = (value: string) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const mulberry32 = (seed: number) => {
  let value = seed;

  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffleValues = <T,>(values: T[], seed: number) => {
  const random = mulberry32(seed || 1);
  const next = [...values];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  if (
    next.length > 1 &&
    next.every((value, index) => value === values[index])
  ) {
    const [first, ...rest] = next;
    return [...rest, first];
  }

  return next;
};

const numericRating = (value: number | null | undefined, fallback = 75) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

const buildVisualGateOrder = (seed: number, fieldSize: number) =>
  shuffleValues(
    Array.from({ length: fieldSize }, (_, index) => index + 1),
    seed
  );

export const formatRaceSimulationTime = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = Math.floor(safeSeconds % 60);
  const milliseconds = Math.floor((safeSeconds % 1) * 1000);

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
};

export const createRaceSimulationPlan = ({
  seed,
  distanceMeters,
  surface,
  entries,
}: {
  seed: number;
  distanceMeters: number;
  surface: RaceSurface;
  entries: RaceSimulationEntryInput[];
}): RaceSimulationPlan => {
  const random = mulberry32(seed || 1);
  const sortedEntries = [...entries].sort(
    (a, b) => Number(a.lane || 999) - Number(b.lane || 999)
  );
  const visualGates = buildVisualGateOrder(seed, sortedEntries.length);

  const scoredRunners = sortedEntries.map((entry, index) => {
    const rating = numericRating(
      entry.ratingSnapshot,
      numericRating(entry.horseOverallRating)
    );
    const carriedWeight = numericRating(entry.handicap, 126);
    const speed = numericRating(entry.horseSpeedRating, rating);
    const stamina = numericRating(entry.horseStaminaRating, rating);
    const form = numericRating(entry.horseFormRating, rating);
    const horseWeightFactor = numericRating(entry.horseWeightLb, 1000) > 0
      ? (numericRating(entry.horseWeightLb, 1000) - 1000) * 0.002
      : 0;
    const jockeyWeightFactor = numericRating(entry.jockeyWeightLb, 115) > 0
      ? (numericRating(entry.jockeyWeightLb, 115) - 115) * 0.025
      : 0;
    const weightPenalty = (carriedWeight - 115) * 0.16 + horseWeightFactor + jockeyWeightFactor;
    const raceVariance = (random() - 0.5) * 7;
    const performanceScore =
      rating * 0.45 +
      speed * 0.2 +
      stamina * 0.2 +
      form * 0.15 -
      weightPenalty +
      raceVariance;

    return {
      entryId: entry.id,
      lane: entry.lane || index + 1,
      displayGate: visualGates[index] || index + 1,
      horseName: entry.horseName || `Horse ${index + 1}`,
      jockeyName: entry.jockeyName || 'Jockey pending',
      silkColor: silkPalette[((visualGates[index] || index + 1) - 1) % silkPalette.length],
      rating,
      carriedWeight,
      speed,
      stamina,
      form,
      phase: random() * Math.PI * 2,
      performanceScore,
      finishTimeSeconds: 0,
      checkpoints: [] as RaceCheckpoint[],
    };
  });

  if (scoredRunners.length === 0) {
    return {
      seed,
      distanceMeters,
      surface,
      durationSeconds: 0,
      runners: [],
    };
  }

  const fieldAverageScore =
    scoredRunners.reduce((total, runner) => total + runner.performanceScore, 0) /
    scoredRunners.length;
  const safeDistanceMeters = Math.max(400, distanceMeters);
  const baseFinishTime = safeDistanceMeters / baseSpeedBySurface[surface];
  const checkpointSize = safeDistanceMeters <= 1200 ? 50 : 100;

  scoredRunners.forEach((runner) => {
    const abilitySpeedFactor =
      1 + (runner.performanceScore - fieldAverageScore) * 0.004;
    const desiredFinishTime =
      baseFinishTime / abilitySpeedFactor + (random() - 0.5) * 0.12;
    const rawCheckpoints: RaceCheckpoint[] = [
      { distanceMeters: 0, timeSeconds: 0 },
    ];
    let rawElapsed = 0;

    for (
      let checkpointDistance = checkpointSize;
      checkpointDistance <= safeDistanceMeters;
      checkpointDistance += checkpointSize
    ) {
      const segmentEnd = Math.min(checkpointDistance, safeDistanceMeters);
      const segmentStart = rawCheckpoints.at(-1)?.distanceMeters ?? 0;
      const segmentDistance = segmentEnd - segmentStart;
      const raceProgress = (segmentStart + segmentDistance / 2) / safeDistanceMeters;
      const accelerationFactor =
        raceProgress < 0.12 ? 0.7 + raceProgress * 2.5 : 1;
      const staminaFactor =
        raceProgress > 0.65
          ? 1 +
            ((runner.stamina - 80) / 420) *
              ((raceProgress - 0.65) / 0.35)
          : 1;
      const closingKick =
        raceProgress > 0.84
          ? 1 +
            ((runner.form - 80) / 300) *
              ((raceProgress - 0.84) / 0.16)
          : 1;
      const tacticalVariation =
        1 + Math.sin(raceProgress * Math.PI * 4 + runner.phase) * 0.012;
      const segmentSpeed =
        baseSpeedBySurface[surface] *
        accelerationFactor *
        staminaFactor *
        closingKick *
        tacticalVariation;

      rawElapsed += segmentDistance / segmentSpeed;
      rawCheckpoints.push({
        distanceMeters: segmentEnd,
        timeSeconds: rawElapsed,
      });
    }

    if (rawCheckpoints.at(-1)?.distanceMeters !== safeDistanceMeters) {
      const segmentStart = rawCheckpoints.at(-1)?.distanceMeters ?? 0;
      rawElapsed +=
        (safeDistanceMeters - segmentStart) / baseSpeedBySurface[surface];
      rawCheckpoints.push({
        distanceMeters: safeDistanceMeters,
        timeSeconds: rawElapsed,
      });
    }

    const timeScale = desiredFinishTime / rawElapsed;
    runner.finishTimeSeconds = desiredFinishTime;
    runner.checkpoints = rawCheckpoints.map((checkpoint) => ({
      ...checkpoint,
      timeSeconds: checkpoint.timeSeconds * timeScale,
    }));
  });

  return {
    seed,
    distanceMeters: safeDistanceMeters,
    surface,
    durationSeconds: Math.max(
      ...scoredRunners.map((runner) => runner.finishTimeSeconds)
    ),
    runners: scoredRunners,
  };
};

export const progressForRunner = (
  runner: RaceSimulationRunner,
  elapsedSeconds: number
) => {
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

  return clamp(currentDistance / runner.checkpoints.at(-1)!.distanceMeters, 0, 1);
};

const parseReplayTimeSeconds = (value?: string) => {
  if (!value) return Number.NaN;

  const segments = value.trim().split(':');

  if (segments.length === 3) {
    const [hours, minutes, seconds] = segments.map(Number);
    if ([hours, minutes, seconds].every(Number.isFinite)) {
      return hours * 3600 + minutes * 60 + seconds;
    }
  }

  if (segments.length === 2) {
    const [minutes, seconds] = segments;
    const parsedMinutes = Number(minutes);
    const parsedSeconds = Number(seconds);

    if (Number.isFinite(parsedMinutes) && Number.isFinite(parsedSeconds)) {
      return parsedMinutes * 60 + parsedSeconds;
    }
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const buildOfficialCheckpoints = (
  distanceMeters: number,
  finishTimeSeconds: number,
  positionIndex: number
) => {
  const checkpointSize = distanceMeters <= 1200 ? 50 : 100;
  const checkpoints = [{ distanceMeters: 0, timeSeconds: 0 }];
  const easedExponent = 0.9 + Math.min(positionIndex, 12) * 0.01;

  for (
    let checkpointDistance = checkpointSize;
    checkpointDistance <= distanceMeters;
    checkpointDistance += checkpointSize
  ) {
    const safeDistance = Math.min(checkpointDistance, distanceMeters);
    const progress = safeDistance / distanceMeters;
    checkpoints.push({
      distanceMeters: safeDistance,
      timeSeconds: finishTimeSeconds * Math.pow(progress, easedExponent),
    });
  }

  if (checkpoints.at(-1)?.distanceMeters !== distanceMeters) {
    checkpoints.push({
      distanceMeters,
      timeSeconds: finishTimeSeconds,
    });
  } else {
    checkpoints[checkpoints.length - 1] = {
      distanceMeters,
      timeSeconds: finishTimeSeconds,
    };
  }

  return checkpoints;
};

const buildVisualFinishTimeSeconds = (
  distanceMeters: number,
  surface: RaceSurface,
  positionIndex: number,
  fieldSize: number
) => {
  const winnerSeconds = Math.max(35, (distanceMeters / baseSpeedBySurface[surface]) * 0.98);
  const spreadSeconds = clamp(
    1.2 + fieldSize * 0.22 + distanceMeters / 2500,
    2.2,
    6.5
  );
  const normalizedPosition = fieldSize > 1 ? positionIndex / (fieldSize - 1) : 0;
  const easing = Math.pow(normalizedPosition, 1.15);

  return winnerSeconds + spreadSeconds * easing;
};

export const normalizeOfficialReplayRunners = (
  runners: RaceReplayRunner[],
  race?: Pick<RaceRecord, 'distance' | 'surface'>
) => {
  const sortedRunners = [...(runners || [])].sort((a, b) => {
    if (Number(a.position || 999) !== Number(b.position || 999)) {
      return Number(a.position || 999) - Number(b.position || 999);
    }
    return Number(a.finishTimeSeconds || 0) - Number(b.finishTimeSeconds || 0);
  });

  const recordedTimes = sortedRunners.map((runner) =>
    parseReplayTimeSeconds(runner.finishTime)
  );
  const hasRecordedTimes = recordedTimes.every(Number.isFinite);
  const rawSpread =
    hasRecordedTimes && recordedTimes.length > 0
      ? Math.max(...recordedTimes) - Math.min(...recordedTimes)
      : Number.POSITIVE_INFINITY;
  const largestGap = sortedRunners.reduce((maxGap, runner, index) => {
    if (index === 0 || !Number.isFinite(recordedTimes[index]) || !Number.isFinite(recordedTimes[index - 1])) {
      return maxGap;
    }
    return Math.max(maxGap, recordedTimes[index] - recordedTimes[index - 1]);
  }, 0);

  const useRecordedTiming =
    hasRecordedTimes && rawSpread <= 20 && largestGap <= 10;

  if (useRecordedTiming) {
    return sortedRunners.map((runner, index) => ({
      ...runner,
      displayGate: runner.displayGate || index + 1,
      finishTimeSeconds: parseReplayTimeSeconds(runner.finishTime),
    }));
  }

  const distanceMeters = parseRaceDistanceMeters(race?.distance);
  const surface = normalizeRaceSurface(race?.surface);

  return sortedRunners.map((runner, index) => {
    const displayGate = index + 1;
    const finishTimeSeconds = buildVisualFinishTimeSeconds(
      distanceMeters,
      surface,
      index,
      sortedRunners.length
    );

    return {
      ...runner,
      displayGate,
      finishTimeSeconds,
      finishTime: formatRaceSimulationTime(finishTimeSeconds),
      checkpoints: buildOfficialCheckpoints(
        distanceMeters,
        finishTimeSeconds,
        index
      ),
      silkColor: silkPalette[index % silkPalette.length],
    };
  });
};
