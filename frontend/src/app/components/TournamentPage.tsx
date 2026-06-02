import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Flag,
  DollarSign,
  Gauge,
  MapPin,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react';
import {
  AuthUser,
  JockeyTournamentRegistration,
  RaceEntryRecord,
  RaceRecord,
  getBootstrap,
  joinTournamentAsJockey,
} from '../services/api';
import { currentTournament, statusLabel } from '../data/tournamentWorkflow';
import { messageToneClasses } from '../utils/messageTone';

interface TournamentPageProps {
  currentUser: AuthUser | null;
  onNavigate: (page: string) => void;
}

export default function TournamentPage({
  currentUser,
  onNavigate,
}: TournamentPageProps) {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [races, setRaces] = useState<RaceRecord[]>([]);
  const [raceEntries, setRaceEntries] = useState<RaceEntryRecord[]>([]);
  const [registrations, setRegistrations] = useState<JockeyTournamentRegistration[]>([]);
  const [message, setMessage] = useState('');

  const loadTournaments = () => {
    getBootstrap()
      .then((data) => {
        setTournaments(data.tournaments);
        setRaces(data.races);
        setRaceEntries(data.raceEntries || []);
        setRegistrations(data.jockeyTournamentRegistrations || []);
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to load tournaments')
      );
  };

  useEffect(() => {
    loadTournaments();
  }, []);

  const jockeyRegistrationByTournament = useMemo(() => {
    const map = new Map<string, JockeyTournamentRegistration>();

    registrations
      .filter((registration) => registration.jockeyUserId === currentUser?.id)
      .forEach((registration) => map.set(registration.tournamentId, registration));

    return map;
  }, [currentUser?.id, registrations]);

  const handleJoinTournament = (tournamentId: string) => {
    joinTournamentAsJockey(tournamentId)
      .then(() => {
        setMessage('Tournament join request submitted. Admin approval required.');
        loadTournaments();
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to join tournament')
      );
  };

  const openRaceRegistration = (tournamentId: string) => {
    sessionStorage.setItem('selectedTournamentId', tournamentId);
    onNavigate('race-registration');
  };

  const openRaceView = (raceId: string, page = 'race-details') => {
    sessionStorage.setItem('selectedRaceId', raceId);
    onNavigate(page);
  };

  const statusTone = (status: string) => {
    const tones: Record<string, string> = {
      draft: 'border-gray-500/30 bg-gray-500/10 text-gray-300',
      'registration-open': 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
      'registration-closed': 'border-amber-500/30 bg-amber-500/10 text-amber-300',
      published: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
      'in-progress': 'border-[#e10600]/30 bg-[#e10600]/10 text-[#ff6b66]',
      finished: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
      completed: 'border-white/20 bg-white/10 text-white',
    };

    return tones[status] || tones.draft;
  };

  const raceAction = (race: RaceRecord) => {
    if (currentUser?.role === 'owner') {
      return race.status === 'registration-open'
        ? { label: 'Register Horse', page: 'race-registration' }
        : { label: 'View Race', page: 'race-details' };
    }

    if (currentUser?.role === 'jockey') {
      return { label: 'View Assignment', page: 'jockeys' };
    }

    if (currentUser?.role === 'referee') {
      return { label: 'Inspect / Start', page: 'live-race' };
    }

    if (currentUser?.role === 'admin') {
      return { label: 'Manage Race', page: 'admin' };
    }

    return { label: 'View Race', page: 'race-details' };
  };

  const displayTournaments =
    tournaments.length > 0
      ? tournaments
      : [
          {
            id: currentTournament.id,
            name: currentTournament.name,
            status: currentTournament.status,
            startDate: currentTournament.startDate,
            finalDate: currentTournament.finalDate,
            location: currentTournament.location,
            prizePool: currentTournament.prizePool,
          },
        ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Tournaments
          </h1>

          <p className="text-gray-400 text-lg">
            Jockeys join tournaments here. Owners register horses for races from a tournament.
          </p>
        </div>

        {message && (
          <div className={`mb-8 rounded-2xl border p-4 font-semibold ${messageToneClasses(message)}`}>
            {message}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 mb-14">
          {displayTournaments.map((tournament) => {
            const tournamentRaces = races.filter(
              (race) => race.tournamentId === tournament.id
            );
            const openRaceCount = tournamentRaces.filter(
              (race) => race.status === 'registration-open'
            ).length;
            const jockeyRegistration = jockeyRegistrationByTournament.get(tournament.id);

            return (
              <div
                key={tournament.id}
                className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden hover:border-[#e10600]/50 transition-all duration-300"
              >
                <div className="h-52 bg-[url('https://images.unsplash.com/photo-1507514604110-ba3347c457f6?w=1200')] bg-cover bg-center relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-[#111]/50 to-transparent" />

                  <div className="absolute top-5 right-5 px-4 py-2 bg-[#e10600] rounded-lg text-white text-xs font-bold uppercase">
                    {statusLabel(tournament.status || 'registration')}
                  </div>

                  <div className="absolute bottom-6 left-6">
                    <h2 className="text-3xl font-bold text-white">
                      {tournament.name}
                    </h2>
                  </div>
                </div>

                <div className="p-7">
                  <div className="grid grid-cols-2 gap-5 mb-8">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-[#e10600] mt-1" />
                      <div>
                        <p className="text-gray-500 text-xs uppercase">Start Date</p>
                        <p className="text-white font-semibold mt-1">
                          {tournament.startDate || '-'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-[#e10600] mt-1" />
                      <div>
                        <p className="text-gray-500 text-xs uppercase">Location</p>
                        <p className="text-white font-semibold mt-1">
                          {tournament.location || '-'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <DollarSign className="w-5 h-5 text-[#e10600] mt-1" />
                      <div>
                        <p className="text-gray-500 text-xs uppercase">Prize Pool</p>
                        <p className="text-[#e10600] font-bold mt-1">
                          {Number(tournament.prizePool || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Users className="w-5 h-5 text-[#e10600] mt-1" />
                      <div>
                        <p className="text-gray-500 text-xs uppercase">Open Races</p>
                        <p className="text-white font-semibold mt-1">
                          {openRaceCount}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => onNavigate('tournament-details')}
                      className="py-4 bg-white/10 hover:bg-white/15 text-white rounded-xl transition-all font-bold"
                    >
                      View Details
                    </button>

                    {currentUser?.role === 'jockey' && (
                      <button
                        onClick={() => handleJoinTournament(tournament.id)}
                        disabled={Boolean(jockeyRegistration)}
                        className="py-4 bg-[#e10600] hover:bg-[#c00500] disabled:bg-white/10 disabled:text-gray-500 text-white rounded-xl transition-all font-bold"
                      >
                        {jockeyRegistration
                          ? statusLabel(jockeyRegistration.status)
                          : 'Join Tournament'}
                      </button>
                    )}

                    {currentUser?.role === 'owner' && (
                      <button
                        onClick={() => openRaceRegistration(tournament.id)}
                        className="py-4 bg-[#e10600] hover:bg-[#c00500] text-white rounded-xl transition-all font-bold"
                      >
                        Register Horse
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="w-7 h-7 text-[#e10600]" />
            <h2 className="text-3xl font-bold text-white">Race Schedule</h2>
          </div>

          <div className="grid xl:grid-cols-2 gap-5">
            {races.map((race) => {
              const approvedEntries = raceEntries.filter(
                (entry) => entry.raceId === race.id && entry.status === 'approved'
              );
              const gateVisible = ['published', 'in-progress', 'finished', 'completed'].includes(
                race.status
              );
              const action = raceAction(race);
              const tournamentName =
                displayTournaments.find((item) => item.id === race.tournamentId)?.name ||
                'Tournament';

              return (
                <div
                  key={race.id}
                  className="bg-[#0a0a0a] border border-white/10 rounded-xl p-5 hover:border-[#e10600]/40 transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span
                          className={`px-3 py-1 rounded-lg border text-xs font-bold uppercase ${statusTone(
                            race.status
                          )}`}
                        >
                          {statusLabel(race.status)}
                        </span>

                        <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs font-semibold">
                          {race.raceNumber || race.round || 'Race'}
                        </span>
                      </div>

                      <h3 className="text-white font-bold text-2xl leading-tight">
                        {race.name}
                      </h3>

                      <p className="text-gray-400 mt-2">{tournamentName}</p>
                    </div>

                    <button
                      onClick={() => {
                        if (currentUser?.role === 'owner' && action.page === 'race-registration') {
                          openRaceRegistration(race.tournamentId || '');
                          return;
                        }

                        openRaceView(race.id, action.page);
                      }}
                      disabled={currentUser?.role === 'owner' && !race.tournamentId}
                      className="shrink-0 px-5 py-3 bg-[#e10600] hover:bg-[#c00500] disabled:bg-white/10 disabled:text-gray-500 text-white rounded-xl transition-all font-bold"
                    >
                      {action.label}
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
                    <div className="border border-white/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-bold">
                        <Clock className="w-4 h-4 text-[#e10600]" />
                        Start
                      </div>
                      <p className="text-white font-semibold mt-2">
                        {race.date} • {race.time}
                      </p>
                    </div>

                    <div className="border border-white/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-bold">
                        <MapPin className="w-4 h-4 text-[#e10600]" />
                        Venue
                      </div>
                      <p className="text-white font-semibold mt-2">{race.venue || '-'}</p>
                    </div>

                    <div className="border border-white/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-bold">
                        <Flag className="w-4 h-4 text-[#e10600]" />
                        Distance
                      </div>
                      <p className="text-white font-semibold mt-2">
                        {race.distance || '-'}
                      </p>
                    </div>

                    <div className="border border-white/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-bold">
                        <Gauge className="w-4 h-4 text-[#e10600]" />
                        Handicap
                      </div>
                      <p className="text-white font-semibold mt-2">
                        {race.handicapMin ?? 0} - {race.handicapMax ?? 0}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mt-4">
                    <div className="border border-white/10 rounded-xl p-4">
                      <p className="text-gray-500 text-xs uppercase font-bold mb-2">
                        Class / Registration
                      </p>
                      <p className="text-white font-semibold">
                        {race.raceClass || 'Open Class'}
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        Closes: {race.registrationClosesAt || 'Not set'}
                      </p>
                    </div>

                    <div className="border border-white/10 rounded-xl p-4">
                      <p className="text-gray-500 text-xs uppercase font-bold mb-2">
                        Approved Entries
                      </p>
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <p className="text-white font-semibold">
                          {approvedEntries.length || race.participants || 0} horses
                        </p>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">
                        Owner {race.ownerConfirmed}/{race.participants || approvedEntries.length || 0} • Jockey{' '}
                        {race.jockeyConfirmed}/{race.participants || approvedEntries.length || 0}
                      </p>
                    </div>

                    <div className="border border-white/10 rounded-xl p-4">
                      <p className="text-gray-500 text-xs uppercase font-bold mb-2">
                        Referee
                      </p>
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="w-5 h-5 text-[#e10600]" />
                        <p className="text-white font-semibold">{race.referee || '-'}</p>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">
                        Assigned after race creation
                      </p>
                    </div>
                  </div>

                  {gateVisible ? (
                    <div className="mt-4 border border-[#e10600]/25 bg-[#e10600]/5 rounded-xl p-4">
                      <p className="text-[#ff6b66] text-xs uppercase font-bold mb-3">
                        Gate Assignments
                      </p>
                      {approvedEntries.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {approvedEntries.map((entry) => (
                            <span
                              key={entry.id}
                              className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm text-white"
                            >
                              Gate {entry.lane || '-'} • {entry.horseName || 'Horse'}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm">
                          Gate assignments will appear after approved entries are collected.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 border border-white/10 rounded-xl p-4">
                      <p className="text-gray-400 text-sm">
                        Gate assignments are hidden until registration closes and Admin publishes the race.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
