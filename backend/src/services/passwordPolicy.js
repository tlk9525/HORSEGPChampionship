const SPECIAL_CHARACTER_PATTERN = /[!@#$%^&*()_+\-={}\[\]:;"'<>,.?/\\|`~]/;

export const passwordValidationError = (password) => {
  const value = String(password || '');
  if (value.length < 8) return 'Password must contain at least 8 characters';
  if (!/[A-Za-z]/.test(value)) return 'Password must contain at least 1 letter';
  if (!/\d/.test(value)) return 'Password must contain at least 1 number';
  if (!SPECIAL_CHARACTER_PATTERN.test(value)) {
    return 'Password must contain at least 1 special character';
  }
  if (/\s/.test(value)) return 'Password must not contain a whitespace character';
  return '';
};
