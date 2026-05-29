import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import {
  NotificationItem,
  getNotifications,
  markNotificationRead,
} from '../services/api';

export default function NotificationsPanel() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const loadNotifications = () => {
    getNotifications()
      .then(({ notifications: items }) => setNotifications(items))
      .catch(() => setNotifications([]));
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 mb-8">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-[#e10600]" />

          <div>
            <h2 className="text-2xl font-black text-white">
              Notifications
            </h2>

            <p className="text-gray-400">
              Role-specific updates from Admin and race operations.
            </p>
          </div>
        </div>

        <span className="px-4 py-2 rounded-xl bg-[#e10600]/10 border border-[#e10600]/30 text-[#e10600] font-bold">
          {unreadCount} unread
        </span>
      </div>

      {notifications.length === 0 ? (
        <div className="text-gray-500 bg-[#0a0a0a] border border-white/10 rounded-xl p-4">
          No notifications yet.
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.slice(0, 5).map((notification) => (
            <button
              key={notification.id}
              onClick={() =>
                markNotificationRead(notification.id).then(loadNotifications)
              }
              className={`w-full text-left rounded-xl border p-4 transition-all ${
                notification.read
                  ? 'bg-[#0a0a0a] border-white/10 text-gray-400'
                  : 'bg-[#e10600]/10 border-[#e10600]/30 text-white'
              }`}
            >
              <div className="font-bold">
                {notification.title}
              </div>

              <div className="text-sm mt-1 opacity-80">
                {notification.message}
              </div>

              <div className="text-xs text-gray-500 mt-2">
                {new Date(notification.createdAt).toLocaleString()}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
