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

export const MIN_CARRIED_WEIGHT_LB = 115;
export const MAX_CARRIED_WEIGHT_LB = 135;

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
  const storedRating = numeric(horse.overallRating, 0);
  return Math.round(clamp(storedRating > 0 ? storedRating : horseOverallRating(horse), 0, 140));
};

// HKJC-style allocation: top-rated horse receives top weight and every
// rating point below it removes one pound, subject to the race limits.
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
  if (fieldRatings.length <= 1) return 0.5;

  const scores = fieldRatings.map(
    (opponentRating) => 1 / (1 + 10 ** ((opponentRating - rating) / 16))
  );
  return scores.reduce((total, score) => total + score, 0) / scores.length;
};

// HKJC does not publish a fixed reassessment formula. This deterministic
// proposal uses performance versus field expectation and enforces its public
// limits: places 2-5 gain at most 5 points; place 6 or lower cannot gain.
export const computePostRaceRating = (entry, fieldEntries = []) => {
  const previousRating = Math.round(clamp(numeric(entry?.ratingSnapshot, 0), 0, 140));
  const position = Number(entry?.position);
  const rankedEntries = fieldEntries.filter(
    (item) => Number.isInteger(Number(item.position)) && numeric(item.ratingSnapshot, 0) > 0
  );
  const fieldSize = rankedEntries.length;

  if (!previousRating || !Number.isInteger(position) || fieldSize < 2) {
    return { previousRating, ratingChange: 0, postRaceRating: previousRating };
  }

  const opponentRatings = rankedEntries
    .filter((item) => item.id !== entry.id)
    .map((item) => numeric(item.ratingSnapshot, previousRating));
  const expected = expectedFieldScore(previousRating, opponentRatings);
  const actual = (fieldSize - position) / (fieldSize - 1);
  const performanceDelta = Math.round(8 * (actual - expected));

  let ratingChange;
  if (position === 1) {
    ratingChange = clamp(performanceDelta, 3, 10);
  } else if (position <= 5) {
    ratingChange = clamp(performanceDelta, 0, 5);
  } else {
    ratingChange = clamp(performanceDelta, -5, 0);
  }

  const postRaceRating = Math.round(clamp(previousRating + ratingChange, 0, 140));
  return { previousRating, ratingChange, postRaceRating };
};
