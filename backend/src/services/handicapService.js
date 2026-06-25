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



// Tính điểm rating thay đổi theo chuẩn HKJC:
// 1st: +5 đến +8 tùy field size
// 2nd: +2 đến +4
// 3rd: +1 đến +2
// 4th-5th: 0 (không đổi)
// 6th+: âm tùy vị trí
export const computePostRaceRating = (entry, fieldEntries = []) => {
  const previousRating = Math.round(clamp(numeric(entry?.ratingSnapshot, 0), 0, 140));
  const position = Number(entry?.position);
  const rankedEntries = fieldEntries.filter(
    (item) => Number.isInteger(Number(item.position)) && Number(item.position) > 0
  );
  const fieldSize = rankedEntries.length;

  if (!previousRating || !Number.isInteger(position) || position < 1 || fieldSize < 2) {
    return { previousRating, ratingChange: 0, postRaceRating: previousRating };
  }

  // Scale: bigger field = slightly bigger swings
  const scale = Math.max(1, Math.round(fieldSize / 2));
  let ratingChange;
  let positionLabel;

  if (position === 1) {
    ratingChange = Math.min(5 + Math.floor(scale / 2), 8);
    positionLabel = '1st';
  } else if (position === 2) {
    ratingChange = Math.min(2 + Math.floor(scale / 4), 4);
    positionLabel = '2nd';
  } else if (position === 3) {
    ratingChange = fieldSize >= 8 ? 2 : 1;
    positionLabel = '3rd';
  } else if (position <= Math.ceil(fieldSize * 0.5)) {
    ratingChange = 0;
    positionLabel = 'mid-field';
  } else if (position < fieldSize) {
    ratingChange = fieldSize >= 8 ? -2 : -1;
    positionLabel = 'lower-field';
  } else {
    ratingChange = fieldSize >= 8 ? -5 : (fieldSize >= 6 ? -4 : -3);
    positionLabel = 'last';
  }

  const postRaceRating = Math.round(clamp(previousRating + ratingChange, 0, 140));
  const calcLog = { fieldSize, position, positionLabel, scale, ratingChange, previousRating, postRaceRating };

  return { previousRating, ratingChange, postRaceRating, calcLog };
};
