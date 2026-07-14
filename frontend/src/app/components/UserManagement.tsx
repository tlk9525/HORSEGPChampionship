import { useEffect, useState } from "react";
import { Shield, Edit2, Trash2 } from "lucide-react";
import { getUsers, updateUser, deleteUser } from "../services/api";

const roles = ['admin', 'owner', 'jockey', 'referee', 'spectator'];

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data.users || []);
    } catch (err: any) {
      console.error('Error loading users:', err);
      setError('Không thể tải danh sách users');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (userId: string) => {
    if (!editingUser) return;
    try {
      await updateUser(userId, {
        role: editingUser.role,
        status: editingUser.status
      });
      setMessage('Cập nhật thành công!');
      loadUsers();
      setEditingUser(null);
    } catch (err) {
      setMessage('Lỗi khi cập nhật');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Xóa user này?')) return;
    try {
      await deleteUser(userId);
      setMessage('Đã xóa user');
      loadUsers();
    } catch (err) {
      console.error(err);
      setMessage('Lỗi khi xóa');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#071a2f] pt-24 text-white text-center">Đang tải danh sách users...</div>;
  }

  if (error) {
    return <div className="min-h-screen bg-[#071a2f] pt-24 text-red-400 text-center">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-[#071a2f] pt-24 pb-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="bg-[#12304f] border border-white/10 rounded-3xl p-8">
          <h2 className="text-3xl font-black text-white mb-6 flex items-center gap-3">
            <Shield className="w-8 h-8" /> Quản lý Users & Roles
          </h2>

          {message && (
            <div className="mb-6 p-4 bg-green-600/20 border border-green-500/30 rounded-2xl text-green-400">
              {message}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-white">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="py-4 px-4">Tên</th>
                  <th className="py-4 px-4">Email</th>
                  <th className="py-4 px-4">Role</th>
                  <th className="py-4 px-4">Trạng thái</th>
                  <th className="py-4 px-4 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-white/10 hover:bg-white/5">
                    <td className="py-4 px-4">{user.name}</td>
                    <td className="py-4 px-4 text-gray-400">{user.email}</td>
                    <td className="py-4 px-4">
                      <span className="px-3 py-1 bg-[#d4af37]/20 text-[#d4af37] rounded-full text-sm font-medium">
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${user.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button 
                        onClick={() => setEditingUser(user)} 
                        className="text-[#d4af37] hover:text-white mr-4"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(user.id)} 
                        className="text-red-400 hover:text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Edit */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#12304f] p-8 rounded-3xl w-full max-w-md border border-white/10">
            <h3 className="text-2xl font-bold mb-6 text-white">Chỉnh sửa User</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full bg-[#071a2f] border border-white/10 rounded-2xl p-4 text-white"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-1">Status</label>
                <select
                  value={editingUser.status}
                  onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                  className="w-full bg-[#071a2f] border border-white/10 rounded-2xl p-4 text-white"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 py-4 bg-white/10 rounded-2xl text-white hover:bg-white/20"
              >
                Hủy
              </button>
              <button
                onClick={() => handleUpdate(editingUser.id)}
                className="flex-1 py-4 bg-[#d4af37] rounded-2xl font-bold text-black"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}