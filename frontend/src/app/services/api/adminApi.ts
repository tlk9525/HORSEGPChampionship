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

// Lấy danh sách yêu cầu đang chờ Admin phê duyệt.
export const getApprovals = async () =>
  request<{ approvals: ApprovalItem[] }>('/admin/approvals');

// Lấy toàn bộ tài khoản để Admin quản lý.
export const getUsers = async () =>
  request<{ users: AuthUser[] }>('/admin/users');

// Lấy cấu hình vận hành hiện tại của hệ thống.
export const getSystemSettings = async () =>
  request<{ settings: SystemSettings }>('/admin/settings');

// Cập nhật một phần cấu hình vận hành của hệ thống.
export const updateSystemSettings = async (settings: Partial<SystemSettings>) =>
  request<{ settings: SystemSettings }>('/admin/settings', {
    method: 'PATCH',
    body: JSON.stringify(settings),
  });

// Cập nhật vai trò và trạng thái của một tài khoản.
export const updateUser = async (
  userId: string,
  user: { role: UserRole; status: AuthUser['status'] },
) =>
  request<{ user: AuthUser; users: AuthUser[] }>(`/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(user),
  });

// Vô hiệu hóa tài khoản theo mã người dùng.
export const disableUser = async (userId: string) =>
  request<{ user: AuthUser; users: AuthUser[] }>(`/admin/users/${userId}`, {
    method: 'DELETE',
  });

// Phê duyệt hoặc từ chối một yêu cầu quản trị.
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

// Tạo giải đấu mới từ thông tin Admin nhập.
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

// Cập nhật thông tin của một giải đấu đã có.
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

// Xóa giải đấu và nhận lại danh sách dữ liệu liên quan đã cập nhật.
export const deleteTournament = async (tournamentId: string) =>
  request<{
    ok: boolean;
    tournamentId: string;
    raceIds: string[];
    tournaments: TournamentRecord[];
    notifications: NotificationItem[];
  }>(`/admin/tournaments/${tournamentId}`, { method: 'DELETE' });

// Lấy tổng quan pool cược và bảng xếp hạng khán giả cho Admin.
export const getAdminBetting = () =>
  request<{
    raceSummaries: AdminBettingRaceSummary[];
    spectators: AdminBettingSpectator[];
  }>('/admin/betting');
