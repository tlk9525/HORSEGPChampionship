// App.tsx

import { useEffect, useState } from 'react';
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import Navbar from './app/components/Navbar';
import Footer from './app/components/Footer';

import LandingPage from './app/components/LandingPage';
import RaceDetails from './app/components/RaceDetails';

import TournamentPage from './app/components/TournamentPage';
import TournamentDetails from './app/components/TournamentDetails';

import HorseManagement from './app/components/HorseManagement';
import HorseDetails from './app/components/HorseDetails';
import RegisterHorsePage from './app/components/RegisterHorsePage';
import RaceRegistrationPage from './app/components/RaceRegistrationPage';

import JockeyPage from './app/components/JockeyPage';
import JockeyDirectoryPage from './app/components/JockeyDirectoryPage';

import LiveRace from './app/components/LiveRace';
import ResultsPage from './app/components/ResultsPage';
import AdminPanel from './app/components/AdminPanel';
import CreateRacePage from './app/components/CreateRacePage';

import LoginPage from './app/components/LoginPage';
import { AuthUser, HorseRecord, getMe, logout } from './app/services/api';

const roleHome: Record<string, string> = {
  admin: 'admin',
  owner: 'horses',
  jockey: 'jockeys',
  referee: 'live-race',
  spectator: 'tournaments',
};

const protectedPages: Record<string, string[]> = {
  tournaments: ['admin', 'owner', 'jockey', 'referee', 'spectator'],
  'tournament-details': ['admin', 'owner', 'jockey', 'referee', 'spectator'],
  'race-details': ['admin', 'owner', 'jockey', 'referee', 'spectator'],
  admin: ['admin'],
  'create-race': ['admin'],
  horses: ['admin', 'owner'],
  'register-horse': ['owner'],
  'race-registration': ['owner'],
  'edit-horse': ['owner'],
  'horse-details': ['admin', 'owner'],
  'jockey-profiles': ['admin', 'owner', 'jockey', 'referee', 'spectator'],
  jockeys: ['jockey'],
  'live-race': ['admin', 'referee', 'spectator'],
};

const pageFromPath = (pathname: string) => {
  const path = pathname.replace(/\/+$/, '') || '/';

  if (path === '/') return 'home';
  if (path === '/login') return 'login';
  if (path === '/register') return 'register';
  if (path === '/tournaments') return 'tournaments';
  if (/^\/races\/[^/]+\/register$/.test(path)) return 'race-registration';
  if (path.startsWith('/tournaments/')) return 'tournament-details';
  if (path === '/races' || path.startsWith('/races/')) return 'race-details';
  if (path === '/horses') return 'horses';
  if (path === '/horses/new') return 'register-horse';
  if (/^\/horses\/[^/]+\/edit$/.test(path)) return 'edit-horse';
  if (/^\/horses\/[^/]+$/.test(path)) return 'horse-details';
  if (path === '/jockey-portal') return 'jockeys';
  if (path === '/jockeys/me') return 'jockeys';
  if (path === '/jockeys') return 'jockey-profiles';
  if (path === '/live-race' || path.startsWith('/live-race/')) return 'live-race';
  if (path === '/results') return 'results';
  if (path === '/admin') return 'admin';
  if (path === '/admin/races/new') return 'create-race';

  return 'tournaments';
};

export default function App() {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const currentPage = pageFromPath(location.pathname);

  const [currentUser, setCurrentUser] =
    useState<AuthUser | null>(null);
  const [selectedHorse, setSelectedHorse] =
    useState<HorseRecord | null>(null);
  const [authChecked, setAuthChecked] =
    useState(false);

  const pathForPage = (page: string) => {
    const selectedTournamentId =
      sessionStorage.getItem('selectedTournamentId') || '';
    const selectedRaceId =
      sessionStorage.getItem('selectedRaceId') || '';
    const selectedHorseId =
      selectedHorse?.id || sessionStorage.getItem('selectedHorseId') || '';

    const paths: Record<string, string> = {
      home: '/',
      tournaments: '/tournaments',
      'tournament-details': selectedTournamentId
        ? `/tournaments/${selectedTournamentId}`
        : '/tournaments',
      'race-details': selectedRaceId
        ? `/races/${selectedRaceId}`
        : '/races',
      horses: '/horses',
      'register-horse': '/horses/new',
      'race-registration': selectedRaceId
        ? `/races/${selectedRaceId}/register`
        : '/tournaments',
      'horse-details': selectedHorseId
        ? `/horses/${selectedHorseId}`
        : '/horses',
      'edit-horse': selectedHorseId
        ? `/horses/${selectedHorseId}/edit`
        : '/horses',
      'jockey-profiles': '/jockeys',
      jockeys: '/jockey-portal',
      'live-race': selectedRaceId
        ? `/live-race/${selectedRaceId}`
        : '/live-race',
      results: '/results',
      admin: '/admin',
      'create-race': '/admin/races/new',
      login: '/login',
      register: '/register',
    };

    return paths[page] || '/tournaments';
  };

  useEffect(() => {
    getMe()
      .then(({ user }) => {
        setCurrentUser(user);
        if (['login', 'register'].includes(currentPage)) {
          routerNavigate(pathForPage(roleHome[user.role] || 'tournaments'), {
            replace: true,
          });
        }
      })
      .catch(() => undefined)
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!authChecked) return;

    const allowedRoles = protectedPages[currentPage];

    if (allowedRoles && !currentUser) {
      routerNavigate('/login', { replace: true });
      return;
    }

    if (
      allowedRoles &&
      currentUser &&
      !allowedRoles.includes(currentUser.role)
    ) {
          routerNavigate(pathForPage(roleHome[currentUser.role] || 'tournaments'), {
        replace: true,
      });
    }
  }, [authChecked, currentPage, currentUser, location.pathname]);

  const navigate = (page: string) => {
    const allowedRoles = protectedPages[page];

    if (allowedRoles && !currentUser) {
      routerNavigate('/login');
      return;
    }

    if (
      allowedRoles &&
      currentUser &&
      !allowedRoles.includes(currentUser.role)
    ) {
      routerNavigate(pathForPage(roleHome[currentUser.role] || 'tournaments'));
      return;
    }

    routerNavigate(pathForPage(page));
  };

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

        {!authChecked && protectedPages[currentPage] ? (
          <div className="min-h-screen bg-[#071a2f] pt-24 px-4 text-gray-300">
            <div className="max-w-4xl mx-auto rounded-xl border border-white/10 bg-[#0b223d] p-8">
              Loading secure race data...
            </div>
          </div>
        ) : (
          <Routes>
            <Route
              path="/"
              element={<LandingPage onNavigate={navigate} />}
            />
            <Route
              path="/tournaments"
              element={
                <TournamentPage
                  currentUser={currentUser}
                  onNavigate={navigate}
                />
              }
            />
            <Route
              path="/tournaments/:tournamentId"
              element={<TournamentDetails onNavigate={navigate} />}
            />
            <Route path="/races" element={<RaceDetails />} />
            <Route path="/races/:raceId" element={<RaceDetails />} />
            <Route
              path="/horses"
              element={
                <HorseManagement
                  onNavigate={navigate}
                  onSelectHorse={setSelectedHorse}
                />
              }
            />
            <Route
              path="/horses/new"
              element={<RegisterHorsePage onNavigate={navigate} />}
            />
            <Route
              path="/races/:raceId/register"
              element={<RaceRegistrationPage onNavigate={navigate} />}
            />
            <Route
              path="/horses/:horseId"
              element={
                <HorseDetails
                  horse={selectedHorse}
                  onNavigate={navigate}
                />
              }
            />
            <Route
              path="/horses/:horseId/edit"
              element={
                <RegisterHorsePage
                  horse={selectedHorse}
                  mode="edit"
                  onNavigate={navigate}
                />
              }
            />
            <Route
              path="/jockey-portal"
              element={
                <JockeyPage
                  currentUser={currentUser}
                  onNavigate={navigate}
                />
              }
            />
            <Route path="/jockeys" element={<JockeyDirectoryPage />} />
            <Route path="/jockeys/me" element={<Navigate to="/jockey-portal" replace />} />
            <Route path="/live-race" element={<LiveRace />} />
            <Route path="/live-race/:raceId" element={<LiveRace />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route
              path="/admin"
              element={<AdminPanel onNavigate={navigate} />}
            />
            <Route
              path="/admin/races/new"
              element={<CreateRacePage onNavigate={navigate} />}
            />
            <Route
              path="/login"
              element={
                <LoginPage
                  onLogin={(user) => {
                    setCurrentUser(user);
                    routerNavigate(
                      pathForPage(roleHome[user.role] || 'tournaments'),
                      { replace: true }
                    );
                  }}
                  onNavigate={navigate}
                />
              }
            />
            <Route
              path="/register"
              element={
                <LoginPage
                  initialMode="register"
                  onLogin={(user) => {
                    setCurrentUser(user);
                    routerNavigate(
                      pathForPage(roleHome[user.role] || 'tournaments'),
                      { replace: true }
                    );
                  }}
                  onNavigate={navigate}
                />
              }
            />
            <Route
              path="*"
              element={
                <Navigate
                  to={
                    currentUser
                      ? pathForPage(roleHome[currentUser.role] || 'tournaments')
                      : '/login'
                  }
                  replace
                />
              }
            />
          </Routes>
        )}

      </main>

      {/* FOOTER */}
      <Footer />

    </div>
  );
}
