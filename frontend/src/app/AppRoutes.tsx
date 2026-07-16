import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthUser, HorseRecord } from './services/api';

const LandingPage = lazy(() => import('./components/LandingPage'));
const RaceDetails = lazy(() => import('./components/RaceDetails'));
const TournamentPage = lazy(() => import('./components/TournamentPage'));
const TournamentDetails = lazy(() => import('./components/TournamentDetails'));
const HorseManagement = lazy(() => import('./components/HorseManagement'));
const HorseDetails = lazy(() => import('./components/HorseDetails'));
const HorseDirectoryPage = lazy(() => import('./components/HorseDirectoryPage'));
const RegisterHorsePage = lazy(() => import('./components/RegisterHorsePage'));
const RaceRegistrationPage = lazy(() => import('./components/RaceRegistrationPage'));
const JockeyPage = lazy(() => import('./components/JockeyPage'));
const JockeyDirectoryPage = lazy(() => import('./components/JockeyDirectoryPage'));
const LiveRace = lazy(() => import('./components/LiveRace'));
const RaceSimulationDemo = lazy(() => import('./components/RaceSimulationDemo'));
const ResultsPage = lazy(() => import('./components/ResultsPage'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const CreateRacePage = lazy(() => import('./components/CreateRacePage'));
const EditRacePage = lazy(() => import('./components/EditRacePage'));
const LoginPage = lazy(() => import('./components/LoginPage'));

interface AppRoutesProps {
  currentUser: AuthUser | null;
  selectedHorse: HorseRecord | null;
  onNavigate: (page: string) => void;
  onSelectHorse: (horse: HorseRecord | null) => void;
  onLogin: (user: AuthUser) => void;
}

// Ghi chú: Hàm này chọn component màn hình cần render theo page hiện tại.
export default function AppRoutes({
  currentUser,
  selectedHorse,
  onNavigate,
  onSelectHorse,
  onLogin,
}: AppRoutesProps) {
  return (
    <Routes>
      <Route path="/" element={<LandingPage onNavigate={onNavigate} />} />
      <Route
        path="/tournaments"
        element={<TournamentPage currentUser={currentUser} onNavigate={onNavigate} />}
      />
      <Route path="/tournaments/:tournamentId" element={<TournamentDetails onNavigate={onNavigate} />} />
      <Route path="/races" element={<RaceDetails />} />
      <Route path="/races/:raceId" element={<RaceDetails />} />
      <Route
        path="/horses"
        element={<HorseManagement onNavigate={onNavigate} onSelectHorse={onSelectHorse} />}
      />
      <Route path="/horse-profiles" element={<HorseDirectoryPage />} />
      <Route path="/horses/new" element={<RegisterHorsePage onNavigate={onNavigate} />} />
      <Route
        path="/races/:raceId/register"
        element={<RaceRegistrationPage onNavigate={onNavigate} />}
      />
      <Route
        path="/horses/:horseId"
        element={<HorseDetails currentUser={currentUser} horse={selectedHorse} onNavigate={onNavigate} />}
      />
      <Route
        path="/horses/:horseId/edit"
        element={<RegisterHorsePage horse={selectedHorse} mode="edit" onNavigate={onNavigate} />}
      />
      <Route path="/jockey-portal" element={<JockeyPage currentUser={currentUser} onNavigate={onNavigate} />} />
      <Route path="/jockeys" element={<JockeyDirectoryPage />} />
      <Route path="/jockeys/me" element={<Navigate to="/jockey-portal" replace />} />
      <Route path="/live-race" element={<LiveRace />} />
      <Route path="/live-race/:raceId" element={<LiveRace />} />
      <Route path="/simulation-demo" element={<RaceSimulationDemo />} />
      <Route path="/simulation-demo/:raceId" element={<RaceSimulationDemo />} />
      <Route path="/results" element={<ResultsPage />} />
      <Route path="/admin" element={<AdminPanel onNavigate={onNavigate} />} />
      <Route path="/admin/races/new" element={<CreateRacePage onNavigate={onNavigate} />} />
      <Route path="/admin/races/:raceId/edit" element={<EditRacePage onNavigate={onNavigate} />} />
      <Route path="/login" element={<LoginPage onLogin={onLogin} />} />
      <Route path="/register" element={<LoginPage initialMode="register" onLogin={onLogin} />} />
      <Route
        path="*"
        element={
          <Navigate
            to={currentUser ? '/tournaments' : '/login'}
            replace
          />
        }
      />
    </Routes>
  );
}
