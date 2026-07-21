import { request } from './client';
import type { NotificationItem } from './types';

// Lấy danh sách thông báo của người dùng đang đăng nhập.
export const getNotifications = async () =>
  request<{ notifications: NotificationItem[] }>('/notifications');

// Đánh dấu một thông báo đã được đọc.
export const markNotificationRead = async (id: string) =>
  request<{ notification: NotificationItem }>(`/notifications/${id}/read`, {
    method: 'POST',
  });
