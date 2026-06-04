export const API_HOST =
  process.env.API_HOST ||
  process.env.HOST ||
  (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
export const API_PORT = Number(process.env.PORT || process.env.API_PORT || 4000);
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://127.0.0.1:5173/';
export const MAX_RACE_FIELD_SIZE = 10;
export const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';
