// App.tsx

<<<<<<< Updated upstream
import { Suspense, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
=======
import { Suspense, lazy, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
>>>>>>> Stashed changes

import Navbar from './app/components/Navbar';
import Footer from './app/components/Footer';
import AppRoutes from './app/AppRoutes';
import { AuthUser, HorseRecord, getMe, logout } from './app/services/api';
import {
  canAccessPage,
<<<<<<< Updated upstream
  isProtectedPage,
  protectedPages,
  pageFromPath,
  pathForPage,
  roleHome,
} from './app/routing';
=======
  isPageProtected,
  roleHome,
} from './app/config/accessControl';

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
const LoginPage = lazy(() => import('./app/components/LoginPage'));

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
>>>>>>> Stashed changes

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

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [selectedHorse, setSelectedHorse] = useState<HorseRecord | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const getRouteContext = () => ({
    selectedTournamentId: sessionStorage.getItem('selectedTournamentId') || '',
    selectedRaceId: sessionStorage.getItem('selectedRaceId') || '',
    selectedHorseId: sessionStorage.getItem('selectedHorseId') || '',
  });

  const secureElement = (page: string, element: ReactElement) => {
    if (!isPageProtected(page)) return element;

    if (!authChecked) {
      return (
        <div className="min-h-screen bg-[#071a2f] pt-24 px-4 text-gray-300">
          <div className="max-w-4xl mx-auto rounded-xl border border-white/10 bg-[#0b223d] p-8">
            Loading secure race data...
          </div>
        </div>
      );
    }

    if (!currentUser) {
      return <Navigate to="/login" replace />;
    }

    if (!canAccessPage(page, currentUser.role)) {
      return (
        <Navigate
          to={pathForPage(roleHome[currentUser.role] || 'tournaments')}
          replace
        />
      );
    }

    return element;
  };

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

<<<<<<< Updated upstream
    if (isProtectedPage(currentPage) && !currentUser) {
=======
    if (isPageProtected(currentPage) && !currentUser) {
>>>>>>> Stashed changes
      routerNavigate('/login', { replace: true });
      return;
    }

<<<<<<< Updated upstream
    if (currentUser && !canAccessPage(currentPage, currentUser)) {
      routerNavigate(pathForPage(roleHome[currentUser.role], getRouteContext(), selectedHorse), {
=======
    if (currentUser && !canAccessPage(currentPage, currentUser.role)) {
      routerNavigate(pathForPage(roleHome[currentUser.role] || 'tournaments'), {
>>>>>>> Stashed changes
        replace: true,
      });
    }
  }, [authChecked, currentPage, currentUser, location.pathname, selectedHorse]);

  const navigate = (page: string) => {
<<<<<<< Updated upstream
    const routePage = page as keyof typeof protectedPages;
    if (isProtectedPage(routePage) && !currentUser) {
=======
    if (isPageProtected(page) && !currentUser) {
>>>>>>> Stashed changes
      routerNavigate('/login');
      return;
    }

<<<<<<< Updated upstream
    if (currentUser && !canAccessPage(routePage, currentUser)) {
      routerNavigate(pathForPage(roleHome[currentUser.role], getRouteContext(), selectedHorse));
=======
    if (currentUser && !canAccessPage(page, currentUser.role)) {
      routerNavigate(pathForPage(roleHome[currentUser.role] || 'tournaments'));
>>>>>>> Stashed changes
      return;
    }

    routerNavigate(pathForPage(page, getRouteContext(), selectedHorse));
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

        {!authChecked && isPageProtected(currentPage) ? (
          <div className="min-h-screen bg-[#071a2f] pt-24 px-4 text-gray-300">
            <div className="max-w-4xl mx-auto rounded-xl border border-white/10 bg-[#0b223d] p-8">
              Loading secure race data...
            </div>
          </div>
        ) : (
          <Suspense fallback={<RouteFallback />}>
<<<<<<< Updated upstream
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
=======
            <Routes>
              <Route
                path="/"
                element={<LandingPage onNavigate={navigate} />}
              />
              <Route
                path="/tournaments"
                element={secureElement(
                  'tournaments',
                  <TournamentPage
                    currentUser={currentUser}
                    onNavigate={navigate}
                  />
                )}
              />
              <Route
                path="/tournaments/:tournamentId"
                element={secureElement(
                  'tournament-details',
                  <TournamentDetails onNavigate={navigate} />
                )}
              />
              <Route
                path="/races"
                element={secureElement('race-details', <RaceDetails />)}
              />
              <Route
                path="/races/:raceId"
                element={secureElement('race-details', <RaceDetails />)}
              />
              <Route
                path="/horses"
                element={secureElement(
                  'horses',
                  <HorseManagement
                    onNavigate={navigate}
                    onSelectHorse={setSelectedHorse}
                  />
                )}
              />
              <Route
                path="/horse-profiles"
                element={secureElement('horse-profiles', <HorseDirectoryPage />)}
              />
              <Route
                path="/horses/new"
                element={secureElement(
                  'register-horse',
                  <RegisterHorsePage onNavigate={navigate} />
                )}
              />
              <Route
                path="/races/:raceId/register"
                element={secureElement(
                  'race-registration',
                  <RaceRegistrationPage onNavigate={navigate} />
                )}
              />
              <Route
                path="/horses/:horseId"
                element={secureElement(
                  'horse-details',
                  <HorseDetails
                    currentUser={currentUser}
                    horse={selectedHorse}
                    onNavigate={navigate}
                  />
                )}
              />
              <Route
                path="/horses/:horseId/edit"
                element={secureElement(
                  'edit-horse',
                  <RegisterHorsePage
                    horse={selectedHorse}
                    mode="edit"
                    onNavigate={navigate}
                  />
                )}
              />
              <Route
                path="/jockey-portal"
                element={secureElement(
                  'jockeys',
                  <JockeyPage
                    currentUser={currentUser}
                    onNavigate={navigate}
                  />
                )}
              />
              <Route
                path="/jockeys"
                element={secureElement('jockey-profiles', <JockeyDirectoryPage />)}
              />
              <Route path="/jockeys/me" element={<Navigate to="/jockey-portal" replace />} />
              <Route
                path="/live-race"
                element={secureElement('live-race', <LiveRace />)}
              />
              <Route
                path="/live-race/:raceId"
                element={secureElement('live-race', <LiveRace />)}
              />
              <Route
                path="/simulation-demo"
                element={secureElement('simulation-demo', <RaceSimulationDemo />)}
              />
              <Route
                path="/simulation-demo/:raceId"
                element={secureElement('simulation-demo', <RaceSimulationDemo />)}
              />
              <Route path="/results" element={<ResultsPage />} />
              <Route
                path="/admin"
                element={secureElement('admin', <AdminPanel onNavigate={navigate} />)}
              />
              <Route
                path="/admin/races/new"
                element={secureElement(
                  'create-race',
                  <CreateRacePage onNavigate={navigate} />
                )}
              />
              <Route
                path="/admin/races/:raceId/edit"
                element={secureElement(
                  'edit-race',
                  <CreateRacePage mode="edit" onNavigate={navigate} />
                )}
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
>>>>>>> Stashed changes
          </Suspense>
        )}

      </main>

      {/* FOOTER */}
      <Footer />

    </div>
  );
}
