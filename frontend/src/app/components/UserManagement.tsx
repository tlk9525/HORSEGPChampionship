import {
  ArrowLeft,
  Ban,
  Check,
  Edit2,
  RefreshCw,
  Search,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  AuthUser,
  UserRole,
  disableUser,
  getUsers,
  updateUser,
} from '../services/api';

const roleOptions: UserRole[] = ['admin', 'owner', 'jockey', 'referee', 'spectator'];
const statusOptions: AuthUser['status'][] = [
  'pending',
  'active',
  'rejected',
  'suspended',
  'locked',
];

// Ghi chú: Hàm này chuẩn hóa hoặc tính toán dữ liệu cho statusBadgeClass.
const statusBadgeClass = (status: AuthUser['status']) => {
  const classes: Record<AuthUser['status'], string> = {
    pending: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
    active: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    rejected: 'bg-red-500/15 text-red-300 border-red-500/30',
    suspended: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
    locked: 'bg-red-500/15 text-red-300 border-red-500/30',
  };

  return classes[status] || classes.pending;
};

interface UserManagementProps {
  currentUser: AuthUser | null;
  onNavigate: (page: string) => void;
}

// Ghi chú: Component này hiển thị và điều phối giao diện UserManagement.
export default function UserManagement({ currentUser, onNavigate }: UserManagementProps) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState('');
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AuthUser['status'] | 'all'>('all');
  const [message, setMessage] = useState('');

  // Ghi chú: Hàm này lấy và chuẩn hóa dữ liệu cho loadUsers.
  const loadUsers = () => {
    setLoading(true);
    setMessage('');
    getUsers()
      .then((data) => setUsers(data.users || []))
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to load users')
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query);
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [roleFilter, searchTerm, statusFilter, users]);

  // Ghi chú: Hàm này xử lý thao tác saveUser trong luồng nghiệp vụ.
  const saveUser = () => {
    if (!editingUser) return;

    setSavingUserId(editingUser.id);
    setMessage('');
    updateUser(editingUser.id, {
      role: editingUser.role,
      status: editingUser.status,
    })
      .then((data) => {
        setUsers(data.users || []);
        setEditingUser(null);
        setMessage('User updated.');
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to update user')
      )
      .finally(() => setSavingUserId(''));
  };

  // Ghi chú: Hàm này xử lý thao tác suspendUser trong luồng nghiệp vụ.
  const suspendUser = (user: AuthUser) => {
    const confirmed = window.confirm(`Disable ${user.name}?`);
    if (!confirmed) return;

    setSavingUserId(user.id);
    setMessage('');
    disableUser(user.id)
      .then((data) => {
        setUsers(data.users || []);
        setMessage(`${user.name} disabled.`);
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to disable user')
      )
      .finally(() => setSavingUserId(''));
  };

  return (
    <div className="min-h-screen bg-[#071a2f] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <button
              onClick={() => onNavigate('admin')}
              className="inline-flex items-center gap-2 text-gray-300 hover:text-white mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Admin Dashboard
            </button>
            <h1 className="text-4xl font-black text-white flex items-center gap-3">
              <Shield className="w-9 h-9 text-[#d4af37]" />
              Manage Users
            </h1>
          </div>

          <button
            onClick={loadUsers}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/15 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="bg-[#12304f] border border-white/10 rounded-3xl p-5 sm:p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_180px_180px] gap-4">
            <label className="relative block">
              <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search name or email"
                className="w-full bg-[#071a2f] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-gray-500"
              />
            </label>

            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as UserRole | 'all')}
              className="bg-[#071a2f] border border-white/10 rounded-xl px-4 py-3 text-white"
            >
              <option value="all">All roles</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as AuthUser['status'] | 'all')
              }
              className="bg-[#071a2f] border border-white/10 rounded-xl px-4 py-3 text-white"
            >
              <option value="all">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-white">
            {message}
          </div>
        )}

        <div className="bg-[#12304f] border border-white/10 rounded-3xl overflow-hidden">
          <div className="px-5 sm:px-6 py-5 border-b border-white/10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-white font-bold">
              <Users className="w-5 h-5 text-[#d4af37]" />
              {filteredUsers.length}/{users.length} users
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-gray-300">Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left">
                <thead className="bg-[#071a2f] text-xs uppercase text-gray-400">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredUsers.map((user) => {
                    const isSelf = currentUser?.id === user.id;

                    return (
                      <tr key={user.id} className="hover:bg-white/[0.03]">
                        <td className="px-6 py-5">
                          <div className="font-bold text-white">{user.name}</div>
                          <div className="text-sm text-gray-400">{user.email}</div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="inline-flex px-3 py-1 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/30 text-[#d4af37] text-sm font-bold">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full border text-sm font-bold ${statusBadgeClass(user.status)}`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => setEditingUser(user)}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/15"
                            >
                              <Edit2 className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => suspendUser(user)}
                              disabled={isSelf || savingUserId === user.id || user.status === 'suspended'}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/15 text-red-200 border border-red-500/30 hover:bg-red-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Ban className="w-4 h-4" />
                              Disable
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-[70] bg-[#071a2f]/85 flex items-center justify-center p-4">
          <div className="bg-[#12304f] border border-white/10 rounded-3xl p-6 w-full max-w-lg">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-black text-white">Edit User</h2>
                <p className="text-gray-400 mt-1">{editingUser.email}</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/15"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              <label className="block">
              <span className="block text-gray-300 mb-2 font-semibold">Name</span>
              <div className="w-full bg-[#071a2f] border border-white/10 rounded-xl px-4 py-3 text-white">
                {editingUser.name}
              </div>
            </label>

            <label className="block">
              <span className="block text-gray-300 mb-2 font-semibold">Role</span>
              <div className="w-full bg-[#071a2f] border border-white/10 rounded-xl px-4 py-3 text-white">
                {editingUser.role}
              </div>
            </label>

              <label className="block">
                <span className="block text-gray-300 mb-2 font-semibold">Status</span>
                <select
                  value={editingUser.status}
                  onChange={(event) =>
                    setEditingUser({
                      ...editingUser,
                      status: event.target.value as AuthUser['status'],
                    })
                  }
                  className="w-full bg-[#071a2f] border border-white/10 rounded-xl px-4 py-3 text-white"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/15"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={saveUser}
                disabled={savingUserId === editingUser.id}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#d4af37] text-[#071a2f] font-black hover:bg-[#f0c94a] disabled:opacity-60"
              >
                <Check className="w-4 h-4" />
                {savingUserId === editingUser.id ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
