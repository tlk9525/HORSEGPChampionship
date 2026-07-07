const positiveWords = [
  'accepted',
  'approved',
  'completed',
  'confirmed',
  'created',
  'opened',
  'published',
  'ready',
  'recorded',
  'saved',
  'sent',
  'started',
  'submitted',
  'success',
  'updated',
];

const positivePhrases = [
  'registration submitted',
  'request submitted',
  'results submitted',
];

const negativeWords = [
  'absent',
  'blocked',
  'cannot',
  'disqualified',
  'error',
  'failed',
  'invalid',
  'missing',
  'must',
  'not found',
  'reject',
  'rejected',
  'unable',
];

const validationWords = ['required'];

// Xác định điệu cảm của một thông điệp: 'error' nếu có từ âm, 'success' nếu tích cực, 'info' cho tổng quát
export const messageTone = (text: string) => {
  const normalized = text.toLowerCase();

  if (positivePhrases.some((phrase) => normalized.includes(phrase))) {
    return 'success';
  }

  if (negativeWords.some((word) => normalized.includes(word))) {
    return 'error';
  }

  if (positiveWords.some((word) => normalized.includes(word))) {
    return 'success';
  }

  if (validationWords.some((word) => normalized.includes(word))) {
    return 'error';
  }

  return 'info';
};

// Trả về CSS class tương ứng với điệu cảm thông điệp (xanh lá/đỏ/vàng)
export const messageToneClasses = (text: string) => {
  const tone = messageTone(text);

  if (tone === 'success') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }

  if (tone === 'error') {
    return 'border-red-500/30 bg-red-500/10 text-red-300';
  }

  return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
};
