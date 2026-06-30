export const statusLabel = (status: string) =>
  String(status || '')
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const formatWeightLb = (weight?: number | string | null) => {
  const parsed = Number(weight);
  return Number.isFinite(parsed) && parsed > 0
    ? `${Math.round(parsed)} lb`
    : '-';
};
