// Ghi chú: Hàm này đổi status kỹ thuật sang nhãn dễ đọc trên giao diện.
export const statusLabel = (status: string) =>
  String(status || '')
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

// Ghi chú: Hàm này định dạng cân nặng theo đơn vị lb để hiển thị.
export const formatWeightLb = (weight?: number | string | null) => {
  const parsed = Number(weight);
  return Number.isFinite(parsed) && parsed > 0
    ? `${Math.round(parsed)} lb`
    : '-';
};
