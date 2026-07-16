import { HorseRecord } from '../services/api';

// Ghi chú: Hàm này chuẩn hóa điểm thành phần khi tính rating fallback.
const component = (value: number | undefined, fallback = 75) => {
  const parsed = Number(value ?? fallback);
  return Math.min(100, Math.max(0, Number.isFinite(parsed) ? parsed : fallback));
};

// Ghi chú: Hàm này tính rating mặc định cho ngựa ở frontend từ các chỉ số nhập vào.
export const initialHorseRating = (horse: Partial<HorseRecord>) =>
  Math.round(
    component(horse.speedRating) * 0.35 +
      component(horse.staminaRating) * 0.25 +
      component(horse.formRating) * 0.3 +
      component(horse.healthRating) * 0.1
  );

// Ghi chú: Hàm này lấy rating chính thức của ngựa, ưu tiên giá trị đã lưu từ backend.
export const officialHorseRating = (horse?: HorseRecord) => {
  if (!horse) return 0;
  const storedRating: unknown = horse.overallRating;
  const hasStoredRating =
    storedRating !== null &&
    storedRating !== undefined &&
    storedRating !== '' &&
    Number.isFinite(Number(storedRating));
  const rating = hasStoredRating
    ? Number(storedRating)
    : initialHorseRating(horse);

  return Math.round(Math.min(140, Math.max(0, rating)));
};
