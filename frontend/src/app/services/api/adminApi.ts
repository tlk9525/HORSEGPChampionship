import { request } from './client';
import type {
  AdminBettingRaceSummary,
  AdminBettingSpectator,
  ApprovalItem,
  AuthUser,
  NotificationItem,
  SystemSettings,
  TournamentRecord,
  UserRole,
} from './types';

export const getApprovals = async () =>
  request<{ approvals: ApprovalItem[] }>('/admin/approvals');

export const getUsers = async () =>
  request<{ users: AuthUser[] }>('/admin/users');

export const getSystemSettings = async () =>
  request<{ settings: SystemSettings }>('/admin/settings');

export const updateSystemSettings = async (settings: Partial<SystemSettings>) =>
  request<{ settings: SystemSettings }>('/admin/settings', {
    method: 'PATCH',
    body: JSON.stringify(settings),
  });

export const updateUser = async (
  userId: string,
  user: { role: UserRole; status: AuthUser['status'] },
) =>
  request<{ user: AuthUser; users: AuthUser[] }>(`/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(user),
  });

export const disableUser = async (userId: string) =>
  request<{ user: AuthUser; users: AuthUser[] }>(`/admin/users/${userId}`, {
    method: 'DELETE',
  });

export const decideApproval = async (
  entityType: ApprovalItem['entityType'],
  id: string,
  decision: 'approved' | 'rejected',
) =>
  request<{
    ok: boolean;
    approvals: ApprovalItem[];
    notifications: NotificationItem[];
  }>(`/admin/approvals/${entityType}/${id}`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  });

export const createTournament = async (tournament: {
  name: string;
  startDate: string;
  finalDate?: string;
  location: string;
}) =>
  request<{
    tournament: TournamentRecord;
    tournaments: TournamentRecord[];
    notifications: NotificationItem[];
  }>('/admin/tournaments', {
    method: 'POST',
    body: JSON.stringify(tournament),
  });

export const updateTournament = async (
  tournamentId: string,
  tournament: {
    name: string;
    startDate: string;
    finalDate?: string;
    location?: string;
  },
) =>
  request<{
    tournament: TournamentRecord;
    tournaments: TournamentRecord[];
    notifications: NotificationItem[];
  }>(`/admin/tournaments/${tournamentId}`, {
    method: 'PATCH',
    body: JSON.stringify(tournament),
  });

export const deleteTournament = async (tournamentId: string) =>
  request<{
    ok: boolean;
    tournamentId: string;
    raceIds: string[];
    tournaments: TournamentRecord[];
    notifications: NotificationItem[];
  }>(`/admin/tournaments/${tournamentId}`, { method: 'DELETE' });

export const getAdminBetting = () =>
  request<{
    raceSummaries: AdminBettingRaceSummary[];
    spectators: AdminBettingSpectator[];
  }>('/admin/betting');
