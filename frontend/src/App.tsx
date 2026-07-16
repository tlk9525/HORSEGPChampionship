// App.tsx

import { Suspense, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import Navbar from './app/components/Navbar';
import Footer from './app/components/Footer';
import AppRoutes from './app/AppRoutes';
import { AuthUser, HorseRecord, getMe, logout } from './app/services/api';
import {
  canAccessPage,
  isProtectedPage,
  protectedPages,
  pageFromPath,
  pathForPage,
  roleHome,
} from './app/routing';

// Ghi chú: Hàm này hiển thị trạng thái chờ khi route đang lazy load.
const RouteFallback = () => (
  <div className="min-h-screen bg-[#071a2f] pt-24 px-4 text-gray-300">
    <div className="max-w-4xl mx-auto rounded-xl border border-white/10 bg-[#0b223d] p-8">
      Loading race workspace...
    </div>
  </div>
);

// Ghi chú: Hàm này là component gốc, quản lý user, route hiện tại và layout chính.
export default function App() {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const currentPage = pageFromPath(location.pathname);

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [selectedHorse, setSelectedHorse] = useState<HorseRecord | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Ghi chú: Hàm này lấy nghiệp vụ liên quan đến get route context.
  const getRouteContext = () => ({
    selectedTournamentId: sessionStorage.getItem('selectedTournamentId') || '',
    selectedRaceId: sessionStorage.getItem('selectedRaceId') || '',
    selectedHorseId: sessionStorage.getItem('selectedHorseId') || '',
  });

  useEffect(() => {
    getMe()
      .then(({ user }) => {
        setCurrentUser(user);
        if (['login', 'register'].includes(currentPage)) {
          routerNavigate(pathForPage(roleHome[user.role], getRouteContext(), selectedHorse), {
            replace: true,
          });
        }
      })
      .catch(() => undefined)
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!authChecked) return;

    if (isProtectedPage(currentPage) && !currentUser) {
      routerNavigate('/login', { replace: true });
      return;
    }

    if (currentUser && !canAccessPage(currentPage, currentUser)) {
      routerNavigate(pathForPage(roleHome[currentUser.role], getRouteContext(), selectedHorse), {
        replace: true,
      });
    }
  }, [authChecked, currentPage, currentUser, location.pathname, selectedHorse]);

  // Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến navigate.
  const navigate = (page: string) => {
    const routePage = page as keyof typeof protectedPages;
    if (isProtectedPage(routePage) && !currentUser) {
      routerNavigate('/login');
      return;
    }

    if (currentUser && !canAccessPage(routePage, currentUser)) {
      routerNavigate(pathForPage(roleHome[currentUser.role], getRouteContext(), selectedHorse));
      return;
    }

    routerNavigate(pathForPage(page, getRouteContext(), selectedHorse));
  };

  // Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến handle logout.
  const handleLogout = async () => {
    await logout().catch(() => undefined);
    setCurrentUser(null);
    routerNavigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#071a2f] dark overflow-x-hidden">

      {/* NAVBAR */}
      <Navbar
        currentPage={currentPage}
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigate={navigate}
      />

      {/* PAGE CONTENT */}
      <main className="pt-16 min-h-screen">

        {!authChecked && isProtectedPage(currentPage) ? (
          <div className="min-h-screen bg-[#071a2f] pt-24 px-4 text-gray-300">
            <div className="max-w-4xl mx-auto rounded-xl border border-white/10 bg-[#0b223d] p-8">
              Loading secure race data...
            </div>
          </div>
        ) : (
          <Suspense fallback={<RouteFallback />}>
            <AppRoutes
              currentUser={currentUser}
              selectedHorse={selectedHorse}
              onNavigate={navigate}
              onSelectHorse={setSelectedHorse}
              onLogin={(user) => {
                setCurrentUser(user);
                routerNavigate(pathForPage(roleHome[user.role], getRouteContext(), selectedHorse), {
                  replace: true,
                });
              }}
            />
          </Suspense>
        )}

      </main>

      {/* FOOTER */}
      <Footer />

    </div>
  );
}
