import { request } from './client';
import type { NotificationItem } from './types';

export const getNotifications = async () =>
  request<{ notifications: NotificationItem[] }>('/notifications');

export const markNotificationRead = async (id: string) =>
  request<{ notification: NotificationItem }>(`/notifications/${id}/read`, {
    method: 'POST',
  });
