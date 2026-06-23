import { HorseRecord } from '../services/api';

const component = (value: number | undefined, fallback = 75) => {
  const parsed = Number(value ?? fallback);
  return Math.min(100, Math.max(0, Number.isFinite(parsed) ? parsed : fallback));
};

export const initialHorseRating = (horse: Partial<HorseRecord>) =>
  Math.round(
    component(horse.speedRating) * 0.35 +
      component(horse.staminaRating) * 0.25 +
      component(horse.formRating) * 0.3 +
      component(horse.healthRating) * 0.1
  );

export const officialHorseRating = (horse?: HorseRecord) => {
  if (!horse) return 0;
  const stored = Number(horse.overallRating || 0);
  return Math.round(stored > 0 ? stored : initialHorseRating(horse));
};
