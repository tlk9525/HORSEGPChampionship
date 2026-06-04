// App.tsx

import { useEffect, useState } from 'react';

import Navbar from './app/components/Navbar';
import Footer from './app/components/Footer';

import LandingPage from './app/components/LandingPage';
import Dashboard from './app/components/Dashboard';
import RaceDetails from './app/components/RaceDetails';

import TournamentPage from './app/components/TournamentPage';
import TournamentDetails from './app/components/TournamentDetails';
import RaceRegistrationPage from './app/components/RaceRegistrationPage';

import HorseManagement from './app/components/HorseManagement';
import HorseDetails from './app/components/HorseDetails';
import RegisterHorsePage from './app/components/RegisterHorsePage';

import JockeyPage from './app/components/JockeyPage';
import JockeyProfile from './app/components/JockeyProfile';
import JockeyDirectoryPage from './app/components/JockeyDirectoryPage';

import LiveRace from './app/components/LiveRace';
import ResultsPage from './app/components/ResultsPage';
import RankingsPage from './app/components/RankingsPage';
import AdminPanel from './app/components/AdminPanel';
import CreateRacePage from './app/components/CreateRacePage';

import LoginPage from './app/components/LoginPage';
import RegisterPage from './app/components/RegisterPage';
import { AuthUser, HorseRecord, clearToken, getMe, logout } from './app/services/api';

const roleHome: Record<string, string> = {
  admin: 'admin',
  owner: 'horses',
  jockey: 'jockeys',
  referee: 'live-race',
  spectator: 'tournaments',
};

const protectedPages: Record<string, string[]> = {
  admin: ['admin'],
  'create-race': ['admin'],
  'race-registration': ['owner'],
  horses: ['admin', 'owner'],
  'register-horse': ['owner'],
  'edit-horse': ['owner'],
  'horse-details': ['admin', 'owner'],
  'jockey-profiles': ['admin', 'owner', 'jockey', 'referee', 'spectator'],
  jockeys: ['jockey'],
  'jockey-profile': ['jockey', 'admin'],
  'live-race': ['admin', 'referee', 'spectator'],
  results: ['admin', 'owner', 'jockey', 'referee', 'spectator'],
  rankings: ['admin', 'owner', 'jockey', 'referee', 'spectator'],
};

export default function App() {

  const [currentPage, setCurrentPage] =
    useState('login');

  const [currentUser, setCurrentUser] =
    useState<AuthUser | null>(null);
  const [selectedHorse, setSelectedHorse] =
    useState<HorseRecord | null>(null);

  useEffect(() => {
    getMe()
      .then(({ user }) => {
        setCurrentUser(user);
        setCurrentPage(roleHome[user.role] || 'dashboard');
      })
      .catch(() => clearToken());
  }, []);

  const navigate = (page: string) => {
    const allowedRoles = protectedPages[page];

    if (allowedRoles && !currentUser) {
      setCurrentPage('login');
      return;
    }

    if (
      allowedRoles &&
      currentUser &&
      !allowedRoles.includes(currentUser.role)
    ) {
      setCurrentPage(roleHome[currentUser.role] || 'dashboard');
      return;
    }

    setCurrentPage(page);
  };

  const handleLogout = async () => {
    await logout().catch(() => undefined);
    clearToken();
    setCurrentUser(null);
    setCurrentPage('login');
  };

  const renderPage = () => {

    switch (currentPage) {

      case 'home':
        return (
          <LandingPage
            onNavigate={navigate}
          />
        );

      case 'dashboard':
        return (
          <Dashboard
            onNavigate={navigate}
          />
        );

      case 'tournaments':
        return (
          <TournamentPage
            currentUser={currentUser}
            onNavigate={navigate}
          />
        );

      case 'race-registration':
        return (
          <RaceRegistrationPage
            onNavigate={navigate}
          />
        );

      case 'tournament-details':
        return (
          <TournamentDetails
            onNavigate={navigate}
          />
        );

      case 'race-details':
        return (
          <RaceDetails />
        );

      case 'horses':
        return (
          <HorseManagement
            onNavigate={navigate}
            onSelectHorse={setSelectedHorse}
          />
        );

      case 'horse-details':
        return (
          <HorseDetails
            horse={selectedHorse}
            onNavigate={navigate}
          />
        );

      case 'register-horse':
        return (
          <RegisterHorsePage
            onNavigate={navigate}
          />
        );

      case 'edit-horse':
        return (
          <RegisterHorsePage
            horse={selectedHorse}
            mode="edit"
            onNavigate={navigate}
          />
        );

      case 'jockeys':
        return (
          <JockeyPage
            currentUser={currentUser}
            onNavigate={navigate}
          />
        );

      case 'jockey-profiles':
        return (
          <JockeyDirectoryPage />
        );

      case 'jockey-profile':
        return (
          <JockeyProfile
            onNavigate={navigate}
          />
        );

      case 'live-race':
        return (
          <LiveRace />
        );

      case 'results':
        return (
          <ResultsPage />
        );

      case 'rankings':
        return (
          <RankingsPage />
        );

      case 'admin':
        return (
          <AdminPanel
            onNavigate={navigate}
          />
        );

      case 'create-race':
        return (
          <CreateRacePage
            onNavigate={navigate}
          />
        );

      case 'login':
        return (
          <LoginPage
            onLogin={(user) => {
              setCurrentUser(user);
              setCurrentPage(roleHome[user.role] || 'dashboard');
            }}
            onNavigate={navigate}
          />
        );

      case 'register':
        return (
          <RegisterPage
            onNavigate={navigate}
          />
        );

      default:
        return (
          <Dashboard
            onNavigate={navigate}
          />
        );
    }
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

        {renderPage()}

      </main>

      {/* FOOTER */}
      <Footer />

    </div>
  );
}
