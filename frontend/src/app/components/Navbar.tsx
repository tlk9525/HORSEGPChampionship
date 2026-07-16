import { useEffect, useRef, useState } from 'react';

import {
  Bell,
  ChevronDown,
  Menu,
  X,
  TrendingUp,
  Circle,
  LogOut,
} from 'lucide-react';
import {
  AuthUser,
  NotificationItem,
  getNotifications,
  markNotificationRead,
} from '../services/api';
import { messageTone } from '../utils/messageTone';

interface NavbarProps {
  currentPage: string;
  currentUser: AuthUser | null;
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

// Ghi chú: Hàm này render thanh điều hướng theo trạng thái đăng nhập và role.
export default function Navbar({
  currentPage,
  currentUser,
  onLogout,
  onNavigate,
}: NavbarProps) {

  const [isMenuOpen, setIsMenuOpen] =
    useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  // Ghi chú: Hàm này tải nghiệp vụ liên quan đến load notifications.
  const loadNotifications = () => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    getNotifications()
      .then(({ notifications: items }) => setNotifications(items))
      .catch(() => setNotifications([]));
  };

  useEffect(() => {
    loadNotifications();
    if (!currentUser) return;

    const intervalId = window.setInterval(() => {
      loadNotifications();
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!isNotificationsOpen) return;
    loadNotifications();
  }, [isNotificationsOpen]);

  useEffect(() => {
    // Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến handle click outside.
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { name: 'Tournaments', page: 'tournaments', roles: ['admin', 'owner', 'jockey', 'referee', 'spectator'] },
    { name: 'Horses', page: 'horses', roles: ['admin', 'owner'] },
    { name: 'Horse Profiles', page: 'horse-profiles', roles: ['admin', 'owner', 'jockey', 'referee', 'spectator'] },
    { name: 'Jockey Profiles', page: 'jockey-profiles', roles: ['admin', 'owner', 'jockey', 'referee', 'spectator'] },
    { name: 'Jockey Portal', page: 'jockeys', roles: ['jockey'] },
    { name: 'Race Operations', page: 'live-race', roles: ['admin', 'referee', 'spectator'] },
    { name: 'Race Replay', page: 'simulation-demo', roles: ['admin', 'owner', 'jockey', 'referee', 'spectator'] },
    { name: 'Results', page: 'results', roles: ['admin', 'owner', 'jockey', 'referee', 'spectator'], public: true },
    { name: 'Admin', page: 'admin', roles: ['admin'] },
  ];

  const visibleNavItems = navItems.filter(
    (item) =>
      item.public ||
      (currentUser && item.roles.includes(currentUser.role))
  );
  const unreadCount = notifications.filter((item) => !item.read).length;
  const visibleNotifications = notifications.slice(0, 6);

  // Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến read notification.
  const readNotification = (notificationId: string) => {
    markNotificationRead(notificationId).then(loadNotifications);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-[9999] bg-[#071a2f]/95 backdrop-blur-lg border-b border-white/10">

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex items-center justify-between h-20">

          {/* LOGO */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => onNavigate('home')}
          >

            <div className="w-12 h-12 bg-gradient-to-br from-[#d4af37] to-[#7a4a24] rounded-md flex items-center justify-center group-hover:scale-105 transition-transform">

              <TrendingUp className="w-7 h-7 text-white" />

            </div>

            <div className="hidden lg:block">

              <div className="text-white font-bold text-xl tracking-tight">
                HORSE RACING
              </div>

              <div className="text-[#d8d2c4] text-xs tracking-widest">
                TOURNAMENT SYSTEM
              </div>

            </div>
          </div>

          {/* DESKTOP NAV */}
          <div className="hidden xl:flex items-center gap-1">

            {visibleNavItems.map((item) => (
              <button
                key={item.page}
                onClick={() =>
                  onNavigate(item.page)
                }
                className={`px-4 py-2 rounded-lg transition-all font-medium ${
                  currentPage === item.page
                    ? 'bg-[#d4af37] text-white'
                    : 'text-[#d8d2c4] hover:text-white hover:bg-white/5'
                }`}
              >
                {item.name}
              </button>
            ))}

          </div>

          {/* RIGHT */}
          <div className="hidden lg:flex items-center gap-5">

            {/* LIVE */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-[#12304f] rounded-lg border border-[#d4af37]/30">

                <Circle className="w-2 h-2 fill-[#d4af37] text-[#d4af37] animate-pulse" />

                <span className="text-white text-sm font-semibold">
                  LIVE
                </span>

              </div>

              {currentUser && (
                <div className="relative" ref={notificationsRef}>
                  <button
                    onClick={() =>
                      setIsNotificationsOpen((current) => !current)
                    }
                    className={`relative flex h-11 w-11 items-center justify-center rounded-full border transition-all ${
                      isNotificationsOpen
                        ? 'border-[#d4af37]/40 bg-[#d4af37]/20 text-[#f6d77a]'
                        : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                    }`}
                    aria-label="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#d4af37] px-1.5 py-0.5 text-[11px] font-black text-[#071a2f]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {isNotificationsOpen && (
                    <div className="absolute right-0 mt-3 w-[380px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b223d] shadow-2xl shadow-black/40">
                      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                        <div>
                          <h2 className="text-xl font-black text-white">
                            Notifications
                          </h2>
                          <p className="text-xs text-gray-400">
                            {unreadCount} unread
                          </p>
                        </div>

                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      </div>

                      <div className="max-h-[520px] overflow-y-auto p-3">
                        {visibleNotifications.length === 0 ? (
                          <div className="rounded-xl border border-white/10 bg-[#071a2f] p-4 text-sm text-gray-400">
                            No notifications yet.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {visibleNotifications.map((notification) => {
                              const tone = messageTone(
                                `${notification.title} ${notification.message}`
                              );
                              const dotClass =
                                tone === 'success'
                                  ? 'bg-emerald-400'
                                  : tone === 'error'
                                    ? 'bg-red-400'
                                    : 'bg-[#d4af37]';

                              return (
                                <button
                                  key={notification.id}
                                  onClick={() => readNotification(notification.id)}
                                  className={`grid w-full grid-cols-[10px,1fr] gap-3 rounded-xl p-3 text-left transition-all hover:bg-white/5 ${
                                    notification.read ? 'opacity-60' : 'bg-white/[0.03]'
                                  }`}
                                >
                                  <span className={`mt-2 h-2.5 w-2.5 rounded-full ${dotClass}`} />

                                  <span>
                                    <span className="block text-sm font-bold text-white">
                                      {notification.title}
                                    </span>
                                    <span className="mt-1 line-clamp-2 block text-sm text-gray-300">
                                      {notification.message}
                                    </span>
                                    <span className="mt-2 block text-xs text-[#d4af37]">
                                      {new Date(notification.createdAt).toLocaleString()}
                                    </span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-white text-sm font-bold">
                    {currentUser.name}
                  </div>

                  <div className="text-[#d8d2c4] text-xs uppercase">
                    {currentUser.role}
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  className="p-2 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-all"
                  aria-label="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onNavigate('login')}
                className="px-6 py-2 bg-[#d4af37] text-white rounded-lg hover:bg-[#b8892d] transition-all font-semibold"
              >
                Login
              </button>
            )}

          </div>

          {/* MOBILE BUTTON */}
          <button
            onClick={() =>
              setIsMenuOpen(!isMenuOpen)
            }
            className="xl:hidden text-white hover:text-[#d4af37] transition-colors"
          >

            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}

          </button>

        </div>

        {/* MOBILE MENU */}
        {isMenuOpen && (

          <div className="xl:hidden py-4 border-t border-white/10">

            <div className="flex flex-col gap-2">

              {visibleNavItems.map((item) => (
                <button
                  key={item.page}
                  onClick={() => {

                    onNavigate(item.page);

                    setIsMenuOpen(false);

                  }}
                  className={`px-4 py-3 rounded-lg text-left transition-all ${
                    currentPage === item.page
                      ? 'bg-[#d4af37] text-white'
                      : 'text-[#d8d2c4] hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.name}
                </button>
              ))}

              {/* MOBILE LOGIN */}
              {currentUser ? (
                <button
                  onClick={() => {
                    onLogout();
                    setIsMenuOpen(false);
                  }}
                  className="mt-2 px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/15 transition-all font-semibold"
                >
                  Logout {currentUser.name}
                </button>
              ) : (
                <button
                  onClick={() => {
                    onNavigate('login');
                    setIsMenuOpen(false);
                  }}
                  className="mt-2 px-4 py-3 bg-[#d4af37] text-white rounded-lg hover:bg-[#b8892d] transition-all font-semibold"
                >
                  Login / Register
                </button>
              )}

            </div>
          </div>
        )}

      </div>
    </nav>
  );
}
