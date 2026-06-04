import { useState, useEffect } from 'react';

import {
  Menu,
  X,
  TrendingUp,
  Circle,
  LogOut,
} from 'lucide-react';
import { AuthUser } from '../services/api';

interface NavbarProps {
  currentPage: string;
  currentUser: AuthUser | null;
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

export default function Navbar({
  currentPage,
  currentUser,
  onLogout,
  onNavigate,
}: NavbarProps) {

  const [isMenuOpen, setIsMenuOpen] =
    useState(false);

  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {

    const nextRaceDate = new Date();

    nextRaceDate.setDate(
      nextRaceDate.getDate() + 7
    );

    const timer = setInterval(() => {

      const now = new Date().getTime();

      const distance =
        nextRaceDate.getTime() - now;

      const days = Math.floor(
        distance / (1000 * 60 * 60 * 24)
      );

      const hours = Math.floor(
        (distance %
          (1000 * 60 * 60 * 24)) /
          (1000 * 60 * 60)
      );

      const minutes = Math.floor(
        (distance % (1000 * 60 * 60)) /
          (1000 * 60)
      );

      const seconds = Math.floor(
        (distance % (1000 * 60)) / 1000
      );

      setCountdown({
        days,
        hours,
        minutes,
        seconds,
      });

    }, 1000);

    return () => clearInterval(timer);

  }, []);

  const navItems = [
    { name: 'Dashboard', page: 'dashboard', roles: ['admin', 'owner', 'jockey', 'referee', 'spectator'] },
    { name: 'Tournaments', page: 'tournaments', roles: ['admin', 'owner', 'jockey', 'referee', 'spectator'] },
    { name: 'Horses', page: 'horses', roles: ['admin', 'owner'] },
    { name: 'Jockey Profiles', page: 'jockey-profiles', roles: ['admin', 'owner', 'jockey', 'referee', 'spectator'] },
    { name: 'Jockey Portal', page: 'jockeys', roles: ['jockey'] },
    { name: 'Live Race', page: 'live-race', roles: ['admin', 'referee', 'spectator'] },
    { name: 'Rankings', page: 'rankings', roles: ['admin', 'owner', 'jockey', 'referee', 'spectator'] },
    { name: 'Results', page: 'results', roles: ['admin', 'referee', 'spectator'] },
    { name: 'Admin', page: 'admin', roles: ['admin'] },
  ];

  const visibleNavItems = navItems.filter(
    (item) =>
      currentUser &&
      item.roles.includes(currentUser.role)
  );

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
            <div className="flex items-center gap-2 px-4 py-2 bg-[#12304f] rounded-lg border border-[#d4af37]/30">

              <Circle className="w-2 h-2 fill-[#d4af37] text-[#d4af37] animate-pulse" />

              <span className="text-white text-sm font-semibold">
                LIVE
              </span>

            </div>

            {/* COUNTDOWN */}
            <div className="flex items-center gap-4 px-4 py-2 bg-[#12304f] rounded-lg border border-white/10">

              <span className="text-[#d8d2c4] text-xs uppercase tracking-wider">
                Next Race
              </span>

              <div className="flex gap-2">

                {[
                  {
                    value: countdown.days,
                    label: 'D',
                  },
                  {
                    value: countdown.hours,
                    label: 'H',
                  },
                  {
                    value: countdown.minutes,
                    label: 'M',
                  },
                  {
                    value: countdown.seconds,
                    label: 'S',
                  },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2"
                  >

                    <div className="flex flex-col items-center">

                      <span className="text-white font-bold text-sm">
                        {item.value
                          .toString()
                          .padStart(2, '0')}
                      </span>

                      <span className="text-[#d8d2c4] text-xs">
                        {item.label}
                      </span>

                    </div>

                    {index !== 3 && (
                      <span className="text-[#d8d2c4]">
                        :
                      </span>
                    )}

                  </div>
                ))}

              </div>
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
