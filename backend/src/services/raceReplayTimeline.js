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
  const durationSeconds = competingEntries.reduce((max, entry) => {
    const value = finishTimeToSeconds(entry.finishTime);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);

  const horseById = new Map((horses || []).map((horse) => [horse.id, horse]));

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    raceId: race.id,
    distanceMeters,
    surface,
    durationSeconds,
    runners: competingEntries.map((entry, index) => {
      const horse = horseById.get(entry.horseId);
      const finishTimeSeconds = finishTimeToSeconds(entry.finishTime);
      const positionIndex = Math.max(0, Number(entry.position || index + 1) - 1);

      return {
        entryId: entry.id,
        lane: entry.lane || index + 1,
        horseName: entry.horseName || horse?.name || `Horse ${index + 1}`,
        jockeyName: entry.jockeyName || `Jockey ${index + 1}`,
        silkColor: silkPalette[index % silkPalette.length],
        rating: Number(entry.ratingSnapshot || horse?.overallRating || 0),
        carriedWeight: Number(entry.handicap || 0),
        speed: Number(horse?.speedRating || entry.ratingSnapshot || 0),
        stamina: Number(horse?.staminaRating || entry.ratingSnapshot || 0),
        form: Number(horse?.formRating || entry.ratingSnapshot || 0),
        phase: 0,
        performanceScore: Math.max(0, competingEntries.length - positionIndex),
        finishTimeSeconds,
        position: Number(entry.position || index + 1),
        finishTime: entry.finishTime || '',
        checkpoints: buildCheckpoints(distanceMeters, finishTimeSeconds, positionIndex),
      };
    }),
  };
};
