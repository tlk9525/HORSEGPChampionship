import { request } from './client';
import type { AuthUser, DailyReward, UserRole } from './types';

// Đăng nhập bằng email/password; session được backend lưu trong HttpOnly cookie.
export const login = async (email: string, password: string) =>
  request<{ user: AuthUser; dailyReward?: DailyReward }>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

// Đăng ký tài khoản mới và trả trạng thái cần phê duyệt nếu có.
export const register = async (
  name: string,
  email: string,
  password: string,
  role: UserRole,
) =>
  request<{
    user: AuthUser;
    requiresApproval?: boolean;
    message?: string;
  }>('/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role }),
  });

export const logout = async () =>
  request<{ ok: boolean }>('/logout', { method: 'POST' });

export const getMe = async () => request<{ user: AuthUser }>('/me');
