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

// Ghi chú: Hàm này tạo bộ sinh số giả ngẫu nhiên có seed cố định.
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

// Ghi chú: Hàm này xáo trộn danh sách theo seed để kết quả mô phỏng ổn định.
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

// Ghi chú: Hàm này tạo seed số ổn định từ chuỗi để replay race nhất quán.
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

// Ghi chú: Hàm này phân tích nghiệp vụ liên quan đến parse distance meters.
const parseDistanceMeters = (distance) => {
  const parsed = Number(String(distance ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 1600;
};

// Ghi chú: Hàm này chuẩn hóa loại mặt đường race về nhóm surface được mô phỏng hỗ trợ.
const normalizeRaceSurface = (surface) => {
  const normalized = String(surface || '').toLowerCase();
  if (normalized.includes('dirt')) return 'Dirt';
  if (normalized.includes('synthetic')) return 'Synthetic';
  return 'Turf';
};

// Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến finish time to seconds.
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

// Ghi chú: Hàm này xây dựng nghiệp vụ liên quan đến build checkpoints.
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

// Ghi chú: Hàm này giới hạn một giá trị số trong khoảng min và max.
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Ghi chú: Hàm này dựng các checkpoint cạnh tranh để replay race có nhịp chạy tự nhiên hơn.
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

// Ghi chú: Hàm này định dạng nghiệp vụ liên quan đến format finish time.
const formatFinishTime = (seconds) => {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = Math.floor(safeSeconds % 60);
  const milliseconds = Math.floor((safeSeconds % 1) * 1000);

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
};

// Ghi chú: Hàm này tính thời gian finish dùng cho hoạt ảnh replay.
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

// Ghi chú: Hàm này chuẩn hóa rating thành số hợp lệ hoặc fallback.
const numericRating = (value, fallback = 75) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

// Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến scale checkpoints to finish.
const scaleCheckpointsToFinish = (checkpoints, finishTimeSeconds, distanceMeters) => {
  if (!Array.isArray(checkpoints) || checkpoints.length < 2) {
    return null;
  }

  const lastCheckpoint = checkpoints.at(-1);
  const previousFinishSeconds = Number(lastCheckpoint?.timeSeconds);
  const scale =
    Number.isFinite(previousFinishSeconds) && previousFinishSeconds > 0
      ? finishTimeSeconds / previousFinishSeconds
      : 1;

  return checkpoints.map((checkpoint, index) => ({
    distanceMeters: Number(checkpoint.distanceMeters) || (index === checkpoints.length - 1 ? distanceMeters : 0),
    timeSeconds:
      index === checkpoints.length - 1
        ? finishTimeSeconds
        : (Number(checkpoint.timeSeconds) || 0) * scale,
  }));
};

// Ghi chú: Hàm này xây dựng nghiệp vụ liên quan đến build provisional race timeline.
export const buildProvisionalRaceTimeline = ({ race, entries, horses = [] }) => {
  const approvedEntries = [...(entries || [])]
    .filter(
      (entry) =>
        entry.status === 'approved' &&
        entry.preRaceStatus !== 'absent' &&
        !entry.disqualified
    )
    .sort((a, b) => Number(a.lane || 999) - Number(b.lane || 999));

  const distanceMeters = parseDistanceMeters(race?.distance);
  const surface = normalizeRaceSurface(race?.surface);
  const seed = hashRaceSeed(
    [
      race?.id || '',
      race?.updatedAt || race?.createdAt || '',
      race?.distance || '',
      race?.surface || '',
    ].join(':')
  );
  const random = mulberry32(seed || 1);
  const visualGates = shuffleValues(
    Array.from({ length: approvedEntries.length }, (_, index) => index + 1),
    seed
  );
  const horseById = new Map((horses || []).map((horse) => [horse.id, horse]));

  const scoredRunners = approvedEntries.map((entry, index) => {
    const horse = horseById.get(entry.horseId);
    const rating = numericRating(
      entry.ratingSnapshot,
      numericRating(horse?.overallRating)
    );
    const carriedWeight = numericRating(entry.handicap, 126);
    const speed = numericRating(horse?.speedRating, rating);
    const stamina = numericRating(horse?.staminaRating, rating);
    const form = numericRating(horse?.formRating, rating);
    const horseWeightFactor = numericRating(entry.horseWeightLb || horse?.weightLb, 1000) > 0
      ? (numericRating(entry.horseWeightLb || horse?.weightLb, 1000) - 1000) * 0.002
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
      entry,
      horse,
      index,
      lane: entry.lane || index + 1,
      displayGate: visualGates[index] || index + 1,
      silkColor: silkPalette[((visualGates[index] || index + 1) - 1) % silkPalette.length],
      rating,
      carriedWeight,
      speed,
      stamina,
      form,
      phase: random() * Math.PI * 2,
      performanceScore,
      finishTimeSeconds: 0,
      checkpoints: [],
    };
  });

  if (scoredRunners.length === 0) {
    return {
      version: 1,
      generatedAt: new Date().toISOString(),
      raceId: race.id,
      distanceMeters,
      surface,
      durationSeconds: 0,
      runners: [],
    };
  }

  const fieldAverageScore =
    scoredRunners.reduce((total, runner) => total + runner.performanceScore, 0) /
    scoredRunners.length;
  const baseFinishTime = Math.max(400, distanceMeters) / baseSpeedBySurface[surface];
  const checkpointSize = distanceMeters <= 1200 ? 50 : 100;

  scoredRunners.forEach((runner) => {
    const abilitySpeedFactor =
      1 + (runner.performanceScore - fieldAverageScore) * 0.004;
    const desiredFinishTime =
      baseFinishTime / abilitySpeedFactor + (random() - 0.5) * 0.12;
    const rawCheckpoints = [{ distanceMeters: 0, timeSeconds: 0 }];
    let rawElapsed = 0;

    for (
      let checkpointDistance = checkpointSize;
      checkpointDistance <= distanceMeters;
      checkpointDistance += checkpointSize
    ) {
      const segmentEnd = Math.min(checkpointDistance, distanceMeters);
      const segmentStart = rawCheckpoints.at(-1)?.distanceMeters || 0;
      const segmentDistance = segmentEnd - segmentStart;
      const raceProgress = (segmentStart + segmentDistance / 2) / distanceMeters;
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

    const timeScale = desiredFinishTime / rawElapsed;
    runner.finishTimeSeconds = desiredFinishTime;
    runner.checkpoints = rawCheckpoints.map((checkpoint, index) => ({
      distanceMeters: checkpoint.distanceMeters,
      timeSeconds:
        index === rawCheckpoints.length - 1
          ? desiredFinishTime
          : checkpoint.timeSeconds * timeScale,
    }));
  });

  const finishOrderByEntryId = new Map(
    [...scoredRunners]
      .sort((a, b) => a.finishTimeSeconds - b.finishTimeSeconds)
      .map((runner, index) => [runner.entry.id, index + 1])
  );

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    raceId: race.id,
    distanceMeters,
    surface,
    durationSeconds: scoredRunners.reduce(
      (max, runner) => Math.max(max, runner.finishTimeSeconds),
      0
    ),
    runners: scoredRunners.map((runner) => ({
      entryId: runner.entry.id,
      lane: runner.lane,
      displayGate: runner.displayGate,
      horseName: runner.entry.horseName || runner.horse?.name || `Horse ${runner.index + 1}`,
      jockeyName: runner.entry.jockeyName || `Jockey ${runner.index + 1}`,
      silkColor: runner.silkColor,
      rating: runner.rating,
      carriedWeight: runner.carriedWeight,
      speed: runner.speed,
      stamina: runner.stamina,
      form: runner.form,
      phase: runner.phase,
      performanceScore: runner.performanceScore,
      finishTimeSeconds: runner.finishTimeSeconds,
      position: finishOrderByEntryId.get(runner.entry.id) || runner.index + 1,
      finishTime: formatFinishTime(runner.finishTimeSeconds),
      checkpoints: runner.checkpoints,
    })),
  };
};

// Ghi chú: Hàm này xây dựng nghiệp vụ liên quan đến build official replay timeline.
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
  const existingTimelineByEntryId = new Map(
    (race?.replayTimeline?.runners || [])
      .filter((runner) => runner?.entryId)
      .map((runner) => [runner.entryId, runner])
  );
  const runners = competingEntries.map((entry, index) => {
    const horse = horseById.get(entry.horseId);
    const existingRunner = existingTimelineByEntryId.get(entry.id);
    const positionIndex = Math.max(0, Number(entry.position || index + 1) - 1);
    const recordedFinishTimeSeconds = finishTimeToSeconds(entry.finishTime);
    const finishTimeSeconds = useRecordedTiming
      ? recordedFinishTimeSeconds
      : buildVisualFinishTimeSeconds(distanceMeters, surface, positionIndex, fieldSize);
    const existingCheckpoints = scaleCheckpointsToFinish(
      existingRunner?.checkpoints,
      finishTimeSeconds,
      distanceMeters
    );
    const checkpoints = existingCheckpoints || (
      useRecordedTiming
        ? buildCompetitiveCheckpoints({
          distanceMeters,
          finishTimeSeconds,
          positionIndex,
          fieldSize,
          seed: hashRaceSeed(`${race.id}:${entry.id}:${entry.position || index + 1}`),
        })
        : buildCheckpoints(distanceMeters, finishTimeSeconds, positionIndex)
    );
    const displayGate = existingRunner?.displayGate || visualGates[index] || index + 1;

    return {
      entryId: entry.id,
      lane: existingRunner?.lane || entry.lane || index + 1,
      displayGate,
      horseName: existingRunner?.horseName || entry.horseName || horse?.name || `Horse ${index + 1}`,
      jockeyName: existingRunner?.jockeyName || entry.jockeyName || `Jockey ${index + 1}`,
      silkColor: existingRunner?.silkColor || silkPalette[(displayGate - 1) % silkPalette.length],
      rating: Number(existingRunner?.rating ?? entry.ratingSnapshot ?? horse?.overallRating ?? 0),
      carriedWeight: Number(existingRunner?.carriedWeight ?? entry.handicap ?? 0),
      speed: Number(existingRunner?.speed ?? horse?.speedRating ?? entry.ratingSnapshot ?? 0),
      stamina: Number(existingRunner?.stamina ?? horse?.staminaRating ?? entry.ratingSnapshot ?? 0),
      form: Number(existingRunner?.form ?? horse?.formRating ?? entry.ratingSnapshot ?? 0),
      phase: Number(existingRunner?.phase ?? 0),
      performanceScore: Number(existingRunner?.performanceScore ?? Math.max(0, competingEntries.length - positionIndex)),
      finishTimeSeconds,
      position: Number(entry.position || index + 1),
      finishTime: useRecordedTiming ? entry.finishTime || '' : formatFinishTime(finishTimeSeconds),
      officialFinishTime: entry.finishTime || '',
      checkpoints,
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
