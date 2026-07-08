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

const mulberry32 = (seed) => {
  let value = seed || 1;

  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffleValues = (values, seed) => {
  const random = mulberry32(seed);
  const next = [...values];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  if (next.length > 1 && next.every((value, index) => value === values[index])) {
    const [first, ...rest] = next;
    return [...rest, first];
  }

  return next;
};

const hashRaceSeed = (value) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const baseSpeedBySurface = {
  Turf: 17,
  Dirt: 16,
  Synthetic: 16.5,
};

const parseDistanceMeters = (distance) => {
  const parsed = Number(String(distance ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 1600;
};

const normalizeRaceSurface = (surface) => {
  const normalized = String(surface || '').toLowerCase();
  if (normalized.includes('dirt')) return 'Dirt';
  if (normalized.includes('synthetic')) return 'Synthetic';
  return 'Turf';
};

const finishTimeToSeconds = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return Number.NaN;

  const parts = raw.split(':');
  if (parts.length === 2) {
    const [minutes, secondsAndMs] = parts;
    const [seconds, fraction = '0'] = String(secondsAndMs).split('.');
    const parsedMinutes = Number(minutes);
    const parsedSeconds = Number(seconds);
    const parsedFraction = Number(fraction.padEnd(3, '0').slice(0, 3));

    if (
      Number.isFinite(parsedMinutes) &&
      Number.isFinite(parsedSeconds) &&
      Number.isFinite(parsedFraction)
    ) {
      return parsedMinutes * 60 + parsedSeconds + parsedFraction / 1000;
    }
  }

  if (parts.length === 3) {
    const [hours, minutes, secondsAndMs] = parts;
    const [seconds, fraction = '0'] = String(secondsAndMs).split('.');
    const parsedHours = Number(hours);
    const parsedMinutes = Number(minutes);
    const parsedSeconds = Number(seconds);
    const parsedFraction = Number(fraction.padEnd(3, '0').slice(0, 3));

    if (
      Number.isFinite(parsedHours) &&
      Number.isFinite(parsedMinutes) &&
      Number.isFinite(parsedSeconds) &&
      Number.isFinite(parsedFraction)
    ) {
      return parsedHours * 3600 + parsedMinutes * 60 + parsedSeconds + parsedFraction / 1000;
    }
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const buildCheckpoints = (distanceMeters, finishTimeSeconds, positionIndex) => {
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

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const buildCompetitiveCheckpoints = ({
  distanceMeters,
  finishTimeSeconds,
  positionIndex,
  fieldSize,
  seed,
}) => {
  const checkpointSize = distanceMeters <= 1200 ? 50 : 100;
  const rawCheckpoints = [{ distanceMeters: 0, timeSeconds: 0 }];
  const random = mulberry32(seed || 1);
  const styleRoll = random();
  const phaseShift = random() * Math.PI * 2;

  const style = styleRoll < 0.34
    ? {
        early: 1.16,
        middle: 0.98,
        late: 0.92,
      }
    : styleRoll < 0.67
      ? {
          early: 1.0,
          middle: 1.0,
          late: 1.0,
        }
      : {
          early: 0.92,
          middle: 1.0,
          late: 1.14,
        };

  const laneBias = clamp(1.06 - positionIndex * 0.01, 0.9, 1.08);
  const fieldBias = clamp(1 + (fieldSize - positionIndex - 1) * 0.004, 0.96, 1.06);

  for (
    let checkpointDistance = checkpointSize;
    checkpointDistance <= distanceMeters;
    checkpointDistance += checkpointSize
  ) {
    const safeDistance = Math.min(checkpointDistance, distanceMeters);
    const progress = safeDistance / distanceMeters;
    const earlyPhase = clamp(1 - progress / 0.42, 0, 1);
    const middlePhase = clamp(1 - Math.abs(progress - 0.55) / 0.28, 0, 1);
    const latePhase = clamp((progress - 0.7) / 0.3, 0, 1);
    const tacticalVariation = 1 + Math.sin(progress * Math.PI * 4 + phaseShift) * 0.03;
    const phaseMultiplier = clamp(
      (style.early * earlyPhase) +
        (style.middle * middlePhase * 0.9) +
        (style.late * latePhase * 1.05) +
        0.52,
      0.82,
      1.26
    );
    const segmentSpeed = (distanceMeters / finishTimeSeconds) * laneBias * fieldBias * phaseMultiplier * tacticalVariation;
    const previous = rawCheckpoints.at(-1);
    const segmentDistance = safeDistance - (previous?.distanceMeters || 0);
    const previousTime = previous?.timeSeconds || 0;
    const nextTime = previousTime + segmentDistance / Math.max(segmentSpeed, 0.001);

    rawCheckpoints.push({
      distanceMeters: safeDistance,
      timeSeconds: nextTime,
    });
  }

  if (rawCheckpoints.at(-1)?.distanceMeters !== distanceMeters) {
    rawCheckpoints.push({
      distanceMeters,
      timeSeconds: rawCheckpoints.at(-1)?.timeSeconds || 0,
    });
  }

  const rawElapsed = rawCheckpoints.at(-1)?.timeSeconds || finishTimeSeconds;
  const timeScale = rawElapsed > 0 ? finishTimeSeconds / rawElapsed : 1;
  const checkpoints = rawCheckpoints.map((checkpoint, index) => ({
    ...checkpoint,
    timeSeconds:
      index === rawCheckpoints.length - 1
        ? finishTimeSeconds
        : checkpoint.timeSeconds * timeScale,
  }));

  return checkpoints;
};

const formatFinishTime = (seconds) => {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = Math.floor(safeSeconds % 60);
  const milliseconds = Math.floor((safeSeconds % 1) * 1000);

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
};

const buildVisualFinishTimeSeconds = (
  distanceMeters,
  surface,
  positionIndex,
  fieldSize
) => {
  const winnerSeconds = Math.max(35, (distanceMeters / baseSpeedBySurface[surface]) * 0.98);
  const spreadSeconds = Math.min(6.5, Math.max(2.2, 1.2 + fieldSize * 0.22 + distanceMeters / 2500));
  const normalizedPosition = fieldSize > 1 ? positionIndex / (fieldSize - 1) : 0;
  const easing = Math.pow(normalizedPosition, 1.15);

  return winnerSeconds + spreadSeconds * easing;
};

export const buildOfficialReplayTimeline = ({ race, entries, horses = [] }) => {
  const competingEntries = [...(entries || [])]
    .filter(
      (entry) =>
        entry.status === 'approved' &&
        entry.preRaceStatus !== 'absent' &&
        !entry.disqualified &&
        Number.isFinite(Number(entry.position)) &&
        Boolean(entry.finishTime) &&
        Number.isFinite(finishTimeToSeconds(entry.finishTime))
    )
    .sort((a, b) => {
      const positionA = Number(a.position || 999);
      const positionB = Number(b.position || 999);
      if (positionA !== positionB) return positionA - positionB;
      return String(a.finishTime || '').localeCompare(String(b.finishTime || ''));
    });

  const distanceMeters = parseDistanceMeters(race?.distance);
  const surface = normalizeRaceSurface(race?.surface);
  const recordedFinishTimes = competingEntries.map((entry) =>
    finishTimeToSeconds(entry.finishTime)
  );
  const recordedSpread = recordedFinishTimes.length > 0
    ? Math.max(...recordedFinishTimes) - Math.min(...recordedFinishTimes)
    : Number.POSITIVE_INFINITY;
  const largestRecordedGap = recordedFinishTimes.reduce((maxGap, value, index) => {
    if (index === 0 || !Number.isFinite(value) || !Number.isFinite(recordedFinishTimes[index - 1])) {
      return maxGap;
    }
    return Math.max(maxGap, value - recordedFinishTimes[index - 1]);
  }, 0);
  const useRecordedTiming = recordedFinishTimes.every(Number.isFinite) && recordedSpread <= 20 && largestRecordedGap <= 10;
  const fieldSize = competingEntries.length;
  const visualGates = shuffleValues(
    Array.from({ length: fieldSize }, (_, index) => index + 1),
    hashRaceSeed(`${race.id}:${distanceMeters}:${surface}:${fieldSize}`)
  );

  const horseById = new Map((horses || []).map((horse) => [horse.id, horse]));
  const runners = competingEntries.map((entry, index) => {
    const horse = horseById.get(entry.horseId);
    const positionIndex = Math.max(0, Number(entry.position || index + 1) - 1);
    const recordedFinishTimeSeconds = finishTimeToSeconds(entry.finishTime);
    const finishTimeSeconds = useRecordedTiming
      ? recordedFinishTimeSeconds
      : buildVisualFinishTimeSeconds(distanceMeters, surface, positionIndex, fieldSize);
    const checkpoints = useRecordedTiming
      ? buildCompetitiveCheckpoints({
          distanceMeters,
          finishTimeSeconds,
          positionIndex,
          fieldSize,
          seed: hashRaceSeed(`${race.id}:${entry.id}:${entry.position || index + 1}`),
        })
      : buildCheckpoints(distanceMeters, finishTimeSeconds, positionIndex);

    return {
      entryId: entry.id,
      lane: entry.lane || index + 1,
      displayGate: visualGates[index] || index + 1,
      horseName: entry.horseName || horse?.name || `Horse ${index + 1}`,
      jockeyName: entry.jockeyName || `Jockey ${index + 1}`,
      silkColor: silkPalette[((visualGates[index] || index + 1) - 1) % silkPalette.length],
      rating: Number(entry.ratingSnapshot || horse?.overallRating || 0),
      carriedWeight: Number(entry.handicap || 0),
      speed: Number(horse?.speedRating || entry.ratingSnapshot || 0),
      stamina: Number(horse?.staminaRating || entry.ratingSnapshot || 0),
      form: Number(horse?.formRating || entry.ratingSnapshot || 0),
      phase: 0,
      performanceScore: Math.max(0, competingEntries.length - positionIndex),
      finishTimeSeconds,
      position: Number(entry.position || index + 1),
      finishTime: useRecordedTiming ? entry.finishTime || '' : formatFinishTime(finishTimeSeconds),
      officialFinishTime: entry.finishTime || '',
      checkpoints,
      displayGate: visualGates[index] || index + 1,
    };
  });

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    raceId: race.id,
    distanceMeters,
    surface,
    durationSeconds: runners.reduce((max, runner) => Math.max(max, runner.finishTimeSeconds), 0),
    runners,
  };
};
