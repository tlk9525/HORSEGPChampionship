export type UserRole = 'admin' | 'owner' | 'jockey' | 'referee' | 'spectator';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
}

export interface ApprovalItem {
  id: string;
  entityType: 'horse' | 'jockey';
  type: string;
  name: string;
  detail: string;
  date: string;
  targetUserId: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface HorseRecord {
  id: string;
  name: string;
  breed: string;
  age: number;
  ownerUserId: string;
  status: string;
  selectedJockeyUserId: string | null;
  jockeyConfirmation: string;
}

export interface JockeyProfileRecord {
  id: string;
  userId: string;
  jockeyName: string;
  jockeyEmail: string;
  bio: string;
  certificate: string;
  competitionLevel: string;
  weight: number;
  status: string;
}

export interface JockeyInvitation {
  id: string;
  horseId: string;
  ownerUserId: string;
  jockeyUserId: string;
  status: string;
  createdAt: string;
}

const API_URL = 'http://127.0.0.1:4000/api';
const TOKEN_KEY = 'horse-racing-token';

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);

export const storeToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = getStoredToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
};

export const login = async (email: string, password: string) => {
  return request<{ token: string; user: AuthUser }>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const register = async (
  name: string,
  email: string,
  password: string,
  role: UserRole
) => {
  return request<{ user: AuthUser }>('/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role }),
  });
};

export const logout = async () => {
  return request<{ ok: boolean }>('/logout', { method: 'POST' });
};

export const getMe = async () => request<{ user: AuthUser }>('/me');

export const getApprovals = async () =>
  request<{ approvals: ApprovalItem[] }>('/admin/approvals');

export const decideApproval = async (
  entityType: ApprovalItem['entityType'],
  id: string,
  decision: 'approved' | 'rejected'
) =>
  request<{ ok: boolean; approvals: ApprovalItem[]; notifications: NotificationItem[] }>(
    `/admin/approvals/${entityType}/${id}`,
    {
      method: 'POST',
      body: JSON.stringify({ decision }),
    }
  );

export const getNotifications = async () =>
  request<{ notifications: NotificationItem[] }>('/notifications');

export const markNotificationRead = async (id: string) =>
  request<{ notification: NotificationItem }>(`/notifications/${id}/read`, {
    method: 'POST',
  });

export const getAdminDatabase = async () =>
  request<Record<string, unknown>>('/admin/database');

export const getOwnerPortal = async () =>
  request<{
    horses: HorseRecord[];
    jockeyProfiles: JockeyProfileRecord[];
    invitations: JockeyInvitation[];
  }>('/owner/portal');

export const sendJockeyRequest = async (
  horseId: string,
  jockeyUserId: string
) =>
  request<{ invitation: JockeyInvitation }>('/owner/jockey-requests', {
    method: 'POST',
    body: JSON.stringify({ horseId, jockeyUserId }),
  });

export const getJockeyPortal = async () =>
  request<{
    profile: JockeyProfileRecord | null;
    invitations: JockeyInvitation[];
  }>('/jockey/portal');

export const saveJockeyProfile = async (profile: {
  bio: string;
  certificate: string;
  competitionLevel: string;
  weight: string | number;
}) =>
  request<{ profile: JockeyProfileRecord }>('/jockey/profile', {
    method: 'POST',
    body: JSON.stringify(profile),
  });

export const decideJockeyInvitation = async (
  id: string,
  decision: 'accepted' | 'rejected'
) =>
  request<{ invitation: JockeyInvitation }>(`/jockey/invitations/${id}`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  });
