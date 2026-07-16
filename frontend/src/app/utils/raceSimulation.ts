import type { RaceRecord, RaceReplayRunner } from '../services/api';

export type RaceSurface = 'Turf' | 'Dirt' | 'Synthetic';
export type RaceSimulationOutcome = 'finished' | 'dnf' | 'fell' | 'injured' | 'disqualified';

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
  horseHealthRating?: number | null;
  horseOverallRating?: number | null;
}

interface RaceCheckpoint {
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
  simulationOutcome: RaceSimulationOutcome;
  incidentReason: string;
  nonFinishRisk: number;
  distanceMeters: number;
  incidentDistanceMeters?: number;
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

interface RaceDisplayRunnerLike {
  progress?: number;
  finishTimeSeconds?: number;
  simulationOutcome?: RaceSimulationOutcome;
  incidentDistanceMeters?: number;
  distanceMeters?: number;
  lane?: number | null;
  displayGate?: number | null;
  entryId?: string;
  keyId?: string;
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

const simulationOutcomeLabels: Record<RaceSimulationOutcome, string> = {
  finished: 'Finished',
  dnf: 'DNF',
  fell: 'Fell',
  injured: 'Injured',
  disqualified: 'DQ',
};

const simulationIncidentReasons: Record<Exclude<RaceSimulationOutcome, 'finished'>, string> = {
  dnf: 'Simulator: did not finish after losing momentum.',
  fell: 'Simulator: horse fell during the race.',
  injured: 'Simulator: pulled up because of possible injury.',
  disqualified: 'Simulator: disqualified for a race-rule violation.',
};

// Ghi chú: Hàm này chuẩn hóa hoặc tính toán dữ liệu cho raceSimulationOutcomeLabel.
export const raceSimulationOutcomeLabel = (outcome?: RaceSimulationOutcome) =>
  simulationOutcomeLabels[outcome || 'finished'];

// Ghi chú: Hàm này giới hạn một giá trị số trong khoảng min và max.
export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

// Ghi chú: Hàm này chuyển distance của race thành số mét dùng cho mô phỏng.
export const parseRaceDistanceMeters = (distance?: string | number | null) => {
  const parsed = Number(String(distance ?? '').replace(/[^\d.]/g, ''));

  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 1600;
};

// Ghi chú: Hàm này chuẩn hóa loại mặt đường race về nhóm surface được mô phỏng hỗ trợ.
export const normalizeRaceSurface = (surface?: string | null): RaceSurface => {
  const normalized = String(surface || '').toLowerCase();

  if (normalized.includes('dirt')) return 'Dirt';
  if (normalized.includes('synthetic')) return 'Synthetic';
  return 'Turf';
};

// Ghi chú: Hàm này tạo seed số ổn định từ chuỗi để replay race nhất quán.
export const hashRaceSeed = (value: string) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

// Ghi chú: Hàm này tạo bộ sinh số giả ngẫu nhiên có seed cố định.
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

// Ghi chú: Hàm này xáo trộn danh sách theo seed để kết quả mô phỏng ổn định.
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

// Ghi chú: Hàm này chuẩn hóa rating thành số hợp lệ hoặc fallback.
const numericRating = (value: number | null | undefined, fallback = 75) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

// Ghi chú: Hàm này chuẩn hóa hoặc tính toán dữ liệu cho buildNonFinishRisk.
const buildNonFinishRisk = ({
  health,
  stamina,
  form,
  carriedWeight,
  distanceMeters,
  surface,
}: {
  health: number;
  stamina: number;
  form: number;
  carriedWeight: number;
  distanceMeters: number;
  surface: RaceSurface;
}) => {
  const healthRisk = clamp((82 - health) * 0.00045, 0, 0.025);
  const staminaRisk = clamp((80 - stamina) * 0.00032, 0, 0.018);
  const formRisk = clamp((76 - form) * 0.00016, 0, 0.008);
  const distanceRisk = clamp((distanceMeters - 1400) / 100000, 0, 0.018);
  const surfaceRisk = surface === 'Dirt' ? 0.006 : surface === 'Synthetic' ? 0.003 : 0;
  const weightRisk = clamp((carriedWeight - 124) * 0.00035, 0, 0.006);

  return clamp(0.018 + healthRisk + staminaRisk + formRisk + distanceRisk + surfaceRisk + weightRisk, 0.006, 0.095);
};

// Ghi chú: Hàm này chuẩn hóa hoặc tính toán dữ liệu cho pickNonFinishOutcome.
const pickNonFinishOutcome = (
  random: () => number,
  risk: number,
  health: number,
  stamina: number
): RaceSimulationOutcome => {
  if (random() >= risk) return 'finished';

  const healthPressure = clamp((78 - health) / 40, 0, 1);
  const staminaPressure = clamp((78 - stamina) / 40, 0, 1);
  const fellThreshold = 0.2 + healthPressure * 0.08;
  const injuredThreshold = fellThreshold + 0.2 + healthPressure * 0.18;
  const dnfThreshold = injuredThreshold + 0.48 + staminaPressure * 0.12;
  const roll = random();

  if (roll < fellThreshold) return 'fell';
  if (roll < injuredThreshold) return 'injured';
  if (roll < dnfThreshold) return 'dnf';
  return 'disqualified';
};

// Ghi chú: Hàm này tạo thứ tự cổng xuất phát hiển thị cho các runner.
const buildVisualGateOrder = (seed: number, fieldSize: number) =>
  shuffleValues(
    Array.from({ length: fieldSize }, (_, index) => index + 1),
    seed
  );

// Ghi chú: Hàm này định dạng thời gian mô phỏng thành chuỗi phút giây.
export const formatRaceSimulationTime = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = Math.floor(safeSeconds % 60);
  const milliseconds = Math.floor((safeSeconds % 1) * 1000);

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
};

// Ghi chú: Hàm này tạo toàn bộ kế hoạch mô phỏng race gồm runner, checkpoint và thời gian finish.
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
  const safeDistanceMeters = Math.max(400, distanceMeters);

  const scoredRunners = sortedEntries.map((entry, index) => {
    const rating = numericRating(
      entry.ratingSnapshot,
      numericRating(entry.horseOverallRating)
    );
    const carriedWeight = numericRating(entry.handicap, 126);
    const speed = numericRating(entry.horseSpeedRating, rating);
    const stamina = numericRating(entry.horseStaminaRating, rating);
    const form = numericRating(entry.horseFormRating, rating);
    const health = numericRating(entry.horseHealthRating, numericRating(entry.horseOverallRating, rating));
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
    const nonFinishRisk = buildNonFinishRisk({
      health,
      stamina,
      form,
      carriedWeight,
      distanceMeters: safeDistanceMeters,
      surface,
    });
    const simulationOutcome = pickNonFinishOutcome(random, nonFinishRisk, health, stamina);
    const incidentDistanceMeters = simulationOutcome === 'finished'
      ? undefined
      : Math.round(
        safeDistanceMeters *
          clamp(
            0.18 +
              random() * 0.72 +
              (simulationOutcome === 'dnf' ? 0.08 : 0) -
              (simulationOutcome === 'fell' ? 0.06 : 0),
            0.12,
            0.94
          )
      );

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
      simulationOutcome,
      incidentReason:
        simulationOutcome === 'finished'
          ? ''
          : simulationIncidentReasons[simulationOutcome],
      nonFinishRisk,
      distanceMeters: safeDistanceMeters,
      incidentDistanceMeters,
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
  const baseFinishTime = safeDistanceMeters / baseSpeedBySurface[surface];
  const checkpointSize = safeDistanceMeters <= 1200 ? 50 : 100;

  scoredRunners.forEach((runner) => {
    const runnerDistanceMeters = runner.incidentDistanceMeters || safeDistanceMeters;
    const abilitySpeedFactor =
      1 + (runner.performanceScore - fieldAverageScore) * 0.004;
    const desiredFinishTime =
      baseFinishTime / abilitySpeedFactor + (random() - 0.5) * 0.12;
    const desiredEndTime =
      runner.simulationOutcome === 'finished'
        ? desiredFinishTime
        : desiredFinishTime *
          clamp((runnerDistanceMeters / safeDistanceMeters) + 0.03 + random() * 0.08, 0.22, 0.98);
    const rawCheckpoints: RaceCheckpoint[] = [
      { distanceMeters: 0, timeSeconds: 0 },
    ];
    let rawElapsed = 0;

    for (
      let checkpointDistance = checkpointSize;
      checkpointDistance <= runnerDistanceMeters;
      checkpointDistance += checkpointSize
    ) {
      const segmentEnd = Math.min(checkpointDistance, runnerDistanceMeters);
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

    if (rawCheckpoints.at(-1)?.distanceMeters !== runnerDistanceMeters) {
      const segmentStart = rawCheckpoints.at(-1)?.distanceMeters ?? 0;
      rawElapsed +=
        (runnerDistanceMeters - segmentStart) / baseSpeedBySurface[surface];
      rawCheckpoints.push({
        distanceMeters: runnerDistanceMeters,
        timeSeconds: rawElapsed,
      });
    }

    const timeScale = desiredEndTime / rawElapsed;
    runner.finishTimeSeconds = desiredEndTime;
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

// Ghi chú: Hàm này tính vị trí tiến độ của runner tại một mốc thời gian replay.
export const progressForRunner = (
  runner: Pick<RaceSimulationRunner, 'finishTimeSeconds' | 'checkpoints'> & {
    distanceMeters?: number;
    incidentDistanceMeters?: number;
    simulationOutcome?: RaceSimulationOutcome;
  },
  elapsedSeconds: number
) => {
  if (elapsedSeconds <= 0) return 0;
  const totalDistanceMeters =
    runner.distanceMeters || runner.checkpoints.at(-1)?.distanceMeters || 1;
  const terminalProgress = runner.simulationOutcome && runner.simulationOutcome !== 'finished'
    ? clamp((runner.incidentDistanceMeters || runner.checkpoints.at(-1)?.distanceMeters || 0) / totalDistanceMeters, 0, 1)
    : 1;

  if (elapsedSeconds >= runner.finishTimeSeconds) return terminalProgress;

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

  return clamp(currentDistance / totalDistanceMeters, 0, terminalProgress);
};

// Ghi chú: Hàm này sắp xếp runner để hiển thị theo thứ hạng hiện tại trên đường đua.
export const sortRaceDisplayRunners = <T extends RaceDisplayRunnerLike>(runners: T[]) =>
  [...runners].sort((a, b) => {
    const progressA = Number(a.progress ?? 0);
    const progressB = Number(b.progress ?? 0);

    if (Math.abs(progressB - progressA) > 0.0001) {
      return progressB - progressA;
    }

    const gateA = Number(a.displayGate ?? a.lane ?? 999);
    const gateB = Number(b.displayGate ?? b.lane ?? 999);

    if (gateA !== gateB) {
      return gateA - gateB;
    }

    const finishTimeA = Number(a.finishTimeSeconds ?? Number.POSITIVE_INFINITY);
    const finishTimeB = Number(b.finishTimeSeconds ?? Number.POSITIVE_INFINITY);

    if (finishTimeA !== finishTimeB) {
      return finishTimeA - finishTimeB;
    }

    return String(a.entryId || a.keyId || '').localeCompare(String(b.entryId || b.keyId || ''));
  });

// Ghi chú: Hàm này chuyển finish time dạng chuỗi về số giây để dựng replay.
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

// Ghi chú: Hàm này dựng checkpoint chính thức cho replay từ dữ liệu kết quả đã duyệt.
const buildOfficialCheckpoints = (
  distanceMeters: number,
  finishTimeSeconds: number,
  positionIndex: number,
  seed: number
) => {
  const checkpointSize = distanceMeters <= 1200 ? 50 : 100;
  const rawCheckpoints = [{ distanceMeters: 0, timeSeconds: 0 }];
  const random = mulberry32(seed || 1);
  const styleRoll = random();
  const phaseShift = random() * Math.PI * 2;
  const burstStart = clamp(0.32 + random() * 0.28, 0.18, 0.72);
  const burstEnd = clamp(burstStart + 0.18 + random() * 0.18, burstStart + 0.08, 0.94);
  const style =
    styleRoll < 0.34
      ? { early: 1.28, middle: 0.92, late: 0.76 }
      : styleRoll < 0.67
        ? { early: 1.0, middle: 1.0, late: 1.0 }
        : { early: 0.82, middle: 0.96, late: 1.24 };
  const laneBias = clamp(1.04 - positionIndex * 0.012 + (random() - 0.5) * 0.04, 0.88, 1.1);
  const fieldBias = clamp(1 + (Math.max(1, positionIndex) - 1) * -0.002 + (random() - 0.5) * 0.03, 0.94, 1.06);

  for (
    let checkpointDistance = checkpointSize;
    checkpointDistance <= distanceMeters;
    checkpointDistance += checkpointSize
  ) {
    const safeDistance = Math.min(checkpointDistance, distanceMeters);
    const progress = safeDistance / distanceMeters;
    const earlyPhase = clamp(1 - progress / 0.38, 0, 1);
    const middlePhase = clamp(1 - Math.abs(progress - 0.56) / 0.22, 0, 1);
    const latePhase = clamp((progress - 0.68) / 0.32, 0, 1);
    const burstPulse =
      progress >= burstStart && progress <= burstEnd
        ? 1.08 + Math.sin(((progress - burstStart) / Math.max(burstEnd - burstStart, 0.001)) * Math.PI) * 0.12
        : 1;
    const tacticalVariation = 1 + Math.sin(progress * Math.PI * 4 + phaseShift) * 0.035;
    const tempoMultiplier = clamp(
      (style.early * earlyPhase) +
        (style.middle * middlePhase * 0.9) +
        (style.late * latePhase * 1.05) +
        0.48,
      0.8,
      1.34
    );
    const previous = rawCheckpoints.at(-1);
    const segmentDistance = safeDistance - (previous?.distanceMeters ?? 0);
    const segmentBaseSpeed =
      Math.max(12, distanceMeters / Math.max(finishTimeSeconds, 1)) * laneBias * fieldBias;
    const segmentSpeed =
      segmentBaseSpeed * tempoMultiplier * burstPulse * tacticalVariation;

    rawCheckpoints.push({
      distanceMeters: safeDistance,
      timeSeconds: (previous?.timeSeconds ?? 0) + segmentDistance / Math.max(segmentSpeed, 0.001),
    });
  }

  if (rawCheckpoints.at(-1)?.distanceMeters !== distanceMeters) {
    rawCheckpoints.push({
      distanceMeters,
      timeSeconds: rawCheckpoints.at(-1)?.timeSeconds || 0,
    });
  } else {
    rawCheckpoints[rawCheckpoints.length - 1] = {
      distanceMeters,
      timeSeconds: rawCheckpoints.at(-1)?.timeSeconds || 0,
    };
  }

  const rawElapsed = rawCheckpoints.at(-1)?.timeSeconds || finishTimeSeconds;
  const timeScale = rawElapsed > 0 ? finishTimeSeconds / rawElapsed : 1;

  return rawCheckpoints.map((checkpoint, index) => ({
    distanceMeters: checkpoint.distanceMeters,
    timeSeconds:
      index === rawCheckpoints.length - 1
        ? finishTimeSeconds
        : checkpoint.timeSeconds * timeScale,
  }));
};

// Ghi chú: Hàm này tính thời gian finish dùng cho hoạt ảnh replay.
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

// Ghi chú: Hàm này chuẩn hóa runner từ kết quả chính thức thành dữ liệu replay hiển thị.
export const normalizeOfficialReplayRunners = (
  runners: RaceReplayRunner[],
  race?: Pick<RaceRecord, 'id' | 'distance' | 'surface'>
) => {
  const sortedRunners = [...(runners || [])].sort((a, b) => {
    if (Number(a.position || 999) !== Number(b.position || 999)) {
      return Number(a.position || 999) - Number(b.position || 999);
    }
    return Number(a.finishTimeSeconds || 0) - Number(b.finishTimeSeconds || 0);
  });
  const distanceMeters = parseRaceDistanceMeters(race?.distance);
  const surface = normalizeRaceSurface(race?.surface);

  const recordedTimes = sortedRunners.map((runner) =>
    parseReplayTimeSeconds(runner.finishTime)
  );
  const hasRecordedTimes = recordedTimes.every(Number.isFinite);
  const rawSpread =
    hasRecordedTimes && recordedTimes.length > 0
      ? Math.max(...recordedTimes) - Math.min(...recordedTimes)
      : Number.POSITIVE_INFINITY;
  const largestGap = sortedRunners.reduce((maxGap, _runner, index) => {
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
      checkpoints: buildOfficialCheckpoints(
        distanceMeters,
        parseReplayTimeSeconds(runner.finishTime),
        index,
        hashRaceSeed(
          [
            race?.id || 'official-replay',
            runner.entryId || '',
            runner.position || index + 1,
            runner.displayGate || runner.lane || index + 1,
            distanceMeters,
            surface,
          ].join(':')
        )
      ),
    }));
  }

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
        index,
        hashRaceSeed(
          [
            race?.id || 'official-replay',
            runner.entryId || '',
            runner.position || index + 1,
            displayGate,
            distanceMeters,
            surface,
          ].join(':')
        )
      ),
      silkColor: silkPalette[index % silkPalette.length],
    };
  });
};
