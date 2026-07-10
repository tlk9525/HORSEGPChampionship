// App.tsx

import { Suspense, lazy, useEffect, useState } from 'react';
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import Navbar from './app/components/Navbar';
import Footer from './app/components/Footer';

import { AuthUser, HorseRecord, getMe, logout } from './app/services/api';

const LandingPage = lazy(() => import('./app/components/LandingPage'));
const RaceDetails = lazy(() => import('./app/components/RaceDetails'));
const TournamentPage = lazy(() => import('./app/components/TournamentPage'));
const TournamentDetails = lazy(() => import('./app/components/TournamentDetails'));
const HorseManagement = lazy(() => import('./app/components/HorseManagement'));
const HorseDetails = lazy(() => import('./app/components/HorseDetails'));
const HorseDirectoryPage = lazy(() => import('./app/components/HorseDirectoryPage'));
const RegisterHorsePage = lazy(() => import('./app/components/RegisterHorsePage'));
const RaceRegistrationPage = lazy(() => import('./app/components/RaceRegistrationPage'));
const JockeyPage = lazy(() => import('./app/components/JockeyPage'));
const JockeyDirectoryPage = lazy(() => import('./app/components/JockeyDirectoryPage'));
const LiveRace = lazy(() => import('./app/components/LiveRace'));
const RaceSimulationDemo = lazy(() => import('./app/components/RaceSimulationDemo'));
const ResultsPage = lazy(() => import('./app/components/ResultsPage'));
const AdminPanel = lazy(() => import('./app/components/AdminPanel'));
const CreateRacePage = lazy(() => import('./app/components/CreateRacePage'));
const EditRacePage = lazy(() => import('./app/components/EditRacePage'));
const LoginPage = lazy(() => import('./app/components/LoginPage'));

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
  'edit-race': ['admin'],
  horses: ['admin', 'owner'],
  'register-horse': ['owner'],
  'race-registration': ['owner'],
  'edit-horse': ['owner'],
  'horse-details': ['admin', 'owner', 'jockey', 'referee', 'spectator'],
  'horse-profiles': ['admin', 'owner', 'jockey', 'referee', 'spectator'],
  'jockey-profiles': ['admin', 'owner', 'jockey', 'referee', 'spectator'],
  jockeys: ['jockey'],
  'live-race': ['admin', 'referee', 'spectator'],
  'simulation-demo': ['admin', 'owner', 'jockey', 'referee', 'spectator'],
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
  if (path === '/horse-profiles') return 'horse-profiles';
  if (path === '/horses/new') return 'register-horse';
  if (/^\/horses\/[^/]+\/edit$/.test(path)) return 'edit-horse';
  if (/^\/horses\/[^/]+$/.test(path)) return 'horse-details';
  if (path === '/jockey-portal') return 'jockeys';
  if (path === '/jockeys/me') return 'jockeys';
  if (path === '/jockeys') return 'jockey-profiles';
  if (path === '/live-race' || path.startsWith('/live-race/')) return 'live-race';
  if (path === '/simulation-demo' || path.startsWith('/simulation-demo/')) return 'simulation-demo';
  if (path === '/results') return 'results';
  if (path === '/admin') return 'admin';
  if (path === '/admin/races/new') return 'create-race';
  if (/^\/admin\/races\/[^/]+\/edit$/.test(path)) return 'edit-race';

  return 'tournaments';
};

const RouteFallback = () => (
  <div className="min-h-screen bg-[#071a2f] pt-24 px-4 text-gray-300">
    <div className="max-w-4xl mx-auto rounded-xl border border-white/10 bg-[#0b223d] p-8">
      Loading race workspace...
    </div>
  </div>
);

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
      'horse-profiles': '/horse-profiles',
      'edit-horse': selectedHorseId
        ? `/horses/${selectedHorseId}/edit`
        : '/horses',
      'jockey-profiles': '/jockeys',
      jockeys: '/jockey-portal',
      'live-race': selectedRaceId
        ? `/live-race/${selectedRaceId}`
        : '/live-race',
      'simulation-demo': selectedRaceId
        ? `/simulation-demo/${selectedRaceId}`
        : '/simulation-demo',
      results: '/results',
      admin: '/admin',
      'create-race': '/admin/races/new',
      'edit-race': selectedRaceId
        ? `/admin/races/${selectedRaceId}/edit`
        : '/admin',
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
          <Suspense fallback={<RouteFallback />}>
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
              <Route path="/horse-profiles" element={<HorseDirectoryPage />} />
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
                    currentUser={currentUser}
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
              <Route
                path="/simulation-demo"
                element={<RaceSimulationDemo />}
              />
              <Route
                path="/simulation-demo/:raceId"
                element={<RaceSimulationDemo />}
              />
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
                path="/admin/races/:raceId/edit"
                element={<EditRacePage onNavigate={navigate} />}
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
          </Suspense>
        )}

      </main>

      {/* FOOTER */}
      <Footer />

    </div>
  );
}
