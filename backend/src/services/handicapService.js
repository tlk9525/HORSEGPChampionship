// Chuyển đổi giá trị sang số, trả về fallback nếu giá trị null, undefined, rỗng hoặc không phải số hữu hạn
export const numeric = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// Giới hạn giá trị trong khoảng [min, max]; nếu max <= 0 thì chỉ áp dụng giới hạn dưới
export const clamp = (value, min, max) => {
  if (max > 0) return Math.min(max, Math.max(min, value));
  return Math.max(min, value);
};

export const MIN_CARRIED_WEIGHT_LB = 110;
export const MAX_CARRIED_WEIGHT_LB = 135;
const RATING_K_FACTOR = 10;
const MIN_RATED_FIELD_SIZE = 4;
const LEGACY_RACE_CLASS_RATING_RANGES = {
  'Class 1': { min: 101, max: 140 },
  'Class 2': { min: 81, max: 100 },
  'Class 3': { min: 61, max: 80 },
  'Class 4': { min: 41, max: 60 },
  'Class 5': { min: 0, max: 40 },
  Open: { min: 0, max: 140 },
};

const ratingComponent = (value, fallback = 75) =>
  clamp(numeric(value, fallback), 0, 100);

// Thuộc tính chỉ được dùng để cấp rating ban đầu. Sau khi ngựa đã thi đấu,
// overallRating là rating chính thức và được điều chỉnh từ kết quả race.
export const horseOverallRating = (horse = {}) => {
  const speed = ratingComponent(horse.speedRating);
  const stamina = ratingComponent(horse.staminaRating);
  const form = ratingComponent(horse.formRating);
  const health = ratingComponent(horse.healthRating);

  return Math.round(speed * 0.35 + stamina * 0.25 + form * 0.3 + health * 0.1);
};

export const officialHorseRating = (horse = {}) => {
  const hasStoredRating =
    horse.overallRating !== null &&
    horse.overallRating !== undefined &&
    horse.overallRating !== '' &&
    Number.isFinite(Number(horse.overallRating));
  const rating = hasStoredRating
    ? Number(horse.overallRating)
    : horseOverallRating(horse);

  return Math.round(clamp(rating, 0, 140));
};

export const raceEligibilityRange = (race = {}) => {
  const minFromRace = Number(race.ratingMin);
  const maxFromRace = Number(race.ratingMax);
  const hasStoredRange =
    Number.isFinite(minFromRace) && Number.isFinite(maxFromRace);

  if (hasStoredRange) {
    return {
      min: Math.round(clamp(minFromRace, 0, 140)),
      max: Math.round(clamp(Math.max(minFromRace, maxFromRace), 0, 140)),
    };
  }

  const legacyRange = LEGACY_RACE_CLASS_RATING_RANGES[race.raceClass];
  if (legacyRange) {
    return legacyRange;
  }

  return LEGACY_RACE_CLASS_RATING_RANGES.Open;
};

export const computeRaceHandicap = (horse, race, highestFieldRating) => {
  const rating = officialHorseRating(horse);
  const min = clamp(
    numeric(race?.handicapMin, MIN_CARRIED_WEIGHT_LB),
    MIN_CARRIED_WEIGHT_LB,
    MAX_CARRIED_WEIGHT_LB
  );
  const max = clamp(
    numeric(race?.handicapMax, MAX_CARRIED_WEIGHT_LB),
    min,
    MAX_CARRIED_WEIGHT_LB
  );
  const topRating = Math.max(rating, numeric(highestFieldRating, rating));
  const assignedWeightLb = max - (topRating - rating);

  return {
    rating,
    handicap: Math.round(clamp(assignedWeightLb, min, max)),
  };
};

const expectedFieldScore = (rating, fieldRatings) => {
  if (fieldRatings.length === 0) return 0.5;

  const scores = fieldRatings.map(
    (opponentRating) => 1 / (1 + 10 ** ((opponentRating - rating) / 16))
  );
  return scores.reduce((total, score) => total + score, 0) / scores.length;
};

const ratedFieldFactor = (fieldSize) => {
  if (fieldSize >= 8) return 1;
  if (fieldSize >= 6) return 0.75;
  if (fieldSize >= MIN_RATED_FIELD_SIZE) return 0.5;
  return 0;
};

const roundRatingChange = (value) =>
  value < 0 ? -Math.round(Math.abs(value)) : Math.round(value);

const ratingSnapshotValue = (entry) => {
  if (
    entry?.ratingSnapshot === null ||
    entry?.ratingSnapshot === undefined ||
    entry?.ratingSnapshot === ''
  ) {
    return null;
  }

  const parsed = Number(entry.ratingSnapshot);
  return Number.isFinite(parsed)
    ? Math.round(clamp(parsed, 0, 140))
    : null;
};

// Rating compares the actual finishing score with the score expected from
// ratingSnapshot against every other classified starter in the field.
export const computePostRaceRating = (entry, fieldEntries = []) => {
  const previousRating = ratingSnapshotValue(entry);
  const position = Number(entry?.position);
  const rankedEntries = fieldEntries.filter(
    (item) => Number.isInteger(Number(item.position)) && Number(item.position) > 0
  );
  const fieldSize = rankedEntries.length;

  if (
    previousRating === null ||
    !Number.isInteger(position) ||
    position < 1 ||
    position > fieldSize ||
    fieldSize < MIN_RATED_FIELD_SIZE
  ) {
    return { previousRating, ratingChange: 0, postRaceRating: previousRating };
  }

  const opponentRatings = rankedEntries
    .filter((item) => item !== entry && (!entry?.id || item.id !== entry.id))
    .map(ratingSnapshotValue);
  if (
    opponentRatings.length !== fieldSize - 1 ||
    opponentRatings.some((rating) => rating === null)
  ) {
    return { previousRating, ratingChange: 0, postRaceRating: previousRating };
  }

  const expectedScore = expectedFieldScore(previousRating, opponentRatings);
  const actualScore = (fieldSize - position) / (fieldSize - 1);
  const fieldFactor = ratedFieldFactor(fieldSize);
  const rawRatingChange = RATING_K_FACTOR * (actualScore - expectedScore) * fieldFactor;
  const ratingChange = roundRatingChange(clamp(rawRatingChange, -8, 8));
  const postRaceRating = Math.round(clamp(previousRating + ratingChange, 0, 140));
  const calcLog = {
    fieldSize,
    position,
    expectedScore,
    actualScore,
    fieldFactor,
    rawRatingChange,
    ratingChange,
    previousRating,
    postRaceRating,
  };

  return { previousRating, ratingChange, postRaceRating, calcLog };
};
