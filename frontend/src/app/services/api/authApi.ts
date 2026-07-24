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

// Đăng xuất và yêu cầu backend hủy session hiện tại.
export const logout = async () =>
  request<{ ok: boolean }>('/logout', { method: 'POST' });

// Lấy người dùng đang đăng nhập từ session cookie.
export const getMe = async () => request<{ user: AuthUser }>('/me');

export const updateAccountName = async (name: string) =>
  request<{ user: AuthUser; message: string }>('/account/name', {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });

export const changePassword = async (
  currentPassword: string,
  newPassword: string,
) =>
  request<{ ok: boolean; message: string }>('/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });

export type PasswordResetStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'expired'
  | 'unknown';

export const requestPasswordReset = async (email: string) =>
  request<{ recoveryCode: string; message: string }>('/password-reset-requests', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

export const getPasswordResetStatus = async (recoveryCode: string) =>
  request<{ status: PasswordResetStatus }>(
    `/password-reset-requests/${encodeURIComponent(recoveryCode)}/status`,
  );

export const completePasswordReset = async (
  recoveryCode: string,
  newPassword: string,
) =>
  request<{ ok: boolean; message: string }>(
    `/password-reset-requests/${encodeURIComponent(recoveryCode)}/complete`,
    {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    },
  );
