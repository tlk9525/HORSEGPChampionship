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
  HorseRecord,
  HorseTournamentRegistration,
  JockeyTournamentRegistration,
  RaceEntryRecord,
  RaceRecord,
  TournamentRecord,
  getBootstrap,
  joinTournamentAsJockey,
} from '../services/api';
import { statusLabel } from '../utils/domain';
import { messageToneClasses } from '../utils/messageTone';

interface TournamentPageProps {
  currentUser: AuthUser | null;
  onNavigate: (page: string) => void;
}

const raceNumberValue = (raceNumber?: string) =>
  Number(String(raceNumber || '').replace(/\D/g, '')) || 999;

export default function TournamentPage({
  currentUser,
  onNavigate,
}: TournamentPageProps) {
  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [horses, setHorses] = useState<HorseRecord[]>([]);
  const [races, setRaces] = useState<RaceRecord[]>([]);
  const [raceEntries, setRaceEntries] = useState<RaceEntryRecord[]>([]);
  const [registrations, setRegistrations] = useState<JockeyTournamentRegistration[]>([]);
  const [horseTournamentRegistrations, setHorseTournamentRegistrations] =
    useState<HorseTournamentRegistration[]>([]);
  const [maxRaceFieldSize, setMaxRaceFieldSize] = useState(10);
  const [selectedTournamentId, setSelectedTournamentId] = useState(
    sessionStorage.getItem('selectedTournamentId') || ''
  );
  const [scheduleExpanded, setScheduleExpanded] = useState(false);
  const [expandedGateRaceIds, setExpandedGateRaceIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  const loadTournaments = () => {
    getBootstrap()
      .then((data) => {
        setTournaments(data.tournaments);
        setHorses(data.horses || []);
        setRaces(data.races);
        setRaceEntries(data.raceEntries || []);
        setRegistrations(data.jockeyTournamentRegistrations || []);
        setHorseTournamentRegistrations(data.horseTournamentRegistrations || []);
        setMaxRaceFieldSize(data.limits?.maxRaceFieldSize || 10);
        setSelectedTournamentId((current) => {
          const stored = sessionStorage.getItem('selectedTournamentId');
          const next = current || stored || data.tournaments?.[0]?.id || '';

          if (next) {
            sessionStorage.setItem('selectedTournamentId', next);
          }

          return next;
        });
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

  const selectTournament = (tournamentId: string) => {
    setSelectedTournamentId(tournamentId);
    setScheduleExpanded(false);
    setExpandedGateRaceIds([]);
    sessionStorage.setItem('selectedTournamentId', tournamentId);
  };

  const toggleGateAssignments = (raceId: string) => {
    setExpandedGateRaceIds((current) =>
      current.includes(raceId)
        ? current.filter((id) => id !== raceId)
        : [...current, raceId]
    );
  };

  const openTournamentDetails = (tournamentId: string) => {
    selectTournament(tournamentId);
    onNavigate('tournament-details');
  };

  const openTournamentRaces = (tournamentId: string) => {
    selectTournament(tournamentId);

    const firstRace = races
      .filter((race) => race.tournamentId === tournamentId)
      .sort((a, b) => {
        return raceNumberValue(a.raceNumber) - raceNumberValue(b.raceNumber);
      })[0];

    if (firstRace) {
      sessionStorage.setItem('selectedRaceId', firstRace.id);
    } else {
      sessionStorage.removeItem('selectedRaceId');
      setMessage('This tournament does not have races yet.');
      return;
    }

    onNavigate('race-details');
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
      'in-progress': 'border-[#d4af37]/30 bg-[#d4af37]/10 text-[#f6d77a]',
      finished: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
      completed: 'border-white/20 bg-white/10 text-white',
    };

    return tones[status] || tones.draft;
  };

  const raceAction = (race: RaceRecord) => {
    const tournament = tournaments.find((item) => item.id === race.tournamentId);

    if (race.status === 'completed' || tournament?.status === 'completed') {
      return { label: 'View Race', page: 'race-details' };
    }

    if (currentUser?.role === 'owner') {
      return { label: 'View Race', page: 'race-details' };
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

  const displayTournaments = tournaments;

  const selectedTournament =
    displayTournaments.find((tournament) => tournament.id === selectedTournamentId) ||
    displayTournaments[0];

  const selectedTournamentRaces = races
    .filter((race) => race.tournamentId === selectedTournament?.id)
    .sort((a, b) => raceNumberValue(a.raceNumber) - raceNumberValue(b.raceNumber));

  const visibleScheduleRaces = scheduleExpanded
    ? selectedTournamentRaces
    : selectedTournamentRaces.slice(0, 4);

  return (
    <div className="min-h-screen bg-[#071a2f] pt-24 pb-12">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Tournaments
          </h1>

          <p className="text-gray-400 text-lg">
            Jockeys join tournaments here. Owners register horses once for a tournament, then approved horses run the full race schedule.
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
            const isCompletedTournament = tournament.status === 'completed';
            const hasTournamentRaces = tournamentRaces.length > 0;
            const activeHorseRegistrations = horseTournamentRegistrations.filter(
              (registration) =>
                registration.tournamentId === tournament.id &&
                !['rejected', 'cancelled'].includes(registration.status)
            );
            const registeredHorseIds = new Set(
              activeHorseRegistrations.map((registration) => registration.horseId)
            );
            const registeredJockeyIds = new Set(
              activeHorseRegistrations.map((registration) => registration.jockeyUserId)
            );
            const availableOwnerHorseCount = horses.filter(
              (horse) =>
                horse.ownerUserId === currentUser?.id &&
                horse.status === 'approved' &&
                !registeredHorseIds.has(horse.id)
            ).length;
            const availableApprovedJockeyCount = registrations.filter(
              (registration) =>
                registration.tournamentId === tournament.id &&
                registration.status === 'approved' &&
                !registeredJockeyIds.has(registration.jockeyUserId)
            ).length;
            const canRegisterTournamentHorse =
              currentUser?.role === 'owner' &&
              !isCompletedTournament &&
              availableOwnerHorseCount > 0 &&
              availableApprovedJockeyCount > 0;

            return (
              <div
                key={tournament.id}
                onClick={() => selectTournament(tournament.id)}
                className={`bg-[#12304f] border rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer ${
                  selectedTournament?.id === tournament.id
                    ? 'border-[#d4af37] shadow-[0_0_0_1px_rgba(212,175,55,0.35)]'
                    : 'border-white/10 hover:border-[#d4af37]/50'
                }`}
              >
                <div className="h-52 bg-[url('https://images.unsplash.com/photo-1507514604110-ba3347c457f6?w=1200')] bg-cover bg-center relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-[#111]/50 to-transparent" />

                  <div className="absolute top-5 right-5 px-4 py-2 bg-[#d4af37] rounded-lg text-white text-xs font-bold uppercase">
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
                      <Calendar className="w-5 h-5 text-[#d4af37] mt-1" />
                      <div>
                        <p className="text-gray-500 text-xs uppercase">Start Date</p>
                        <p className="text-white font-semibold mt-1">
                          {tournament.startDate || '-'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-[#d4af37] mt-1" />
                      <div>
                        <p className="text-gray-500 text-xs uppercase">Location</p>
                        <p className="text-white font-semibold mt-1">
                          {tournament.location || '-'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <DollarSign className="w-5 h-5 text-[#d4af37] mt-1" />
                      <div>
                        <p className="text-gray-500 text-xs uppercase">Prize Pool</p>
                        <p className="text-[#d4af37] font-bold mt-1">
                          {Number(tournament.prizePool || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Users className="w-5 h-5 text-[#d4af37] mt-1" />
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
                      onClick={(event) => {
                        event.stopPropagation();
                        openTournamentDetails(tournament.id);
                      }}
                      className="py-4 bg-white/10 hover:bg-white/15 text-white rounded-xl transition-all font-bold"
                    >
                      View Details
                    </button>

                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        openTournamentRaces(tournament.id);
                      }}
                      disabled={!hasTournamentRaces}
                      className="py-4 bg-[#d4af37] hover:bg-[#b8892d] disabled:bg-white/10 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-xl transition-all font-bold"
                    >
                      View Races
                    </button>

                    {!isCompletedTournament && currentUser?.role === 'jockey' && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          selectTournament(tournament.id);
                          handleJoinTournament(tournament.id);
                        }}
                        disabled={Boolean(jockeyRegistration)}
                        className="py-4 bg-[#d4af37] hover:bg-[#b8892d] disabled:bg-white/10 disabled:text-gray-500 text-white rounded-xl transition-all font-bold"
                      >
                        {jockeyRegistration
                          ? statusLabel(jockeyRegistration.status)
                          : 'Join Tournament'}
                      </button>
                    )}

                    {canRegisterTournamentHorse && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          selectTournament(tournament.id);
                          onNavigate('tournament-registration');
                        }}
                        className="py-4 bg-[#d4af37] hover:bg-[#b8892d] text-white rounded-xl transition-all font-bold"
                      >
                        Register Tournament Horse
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-[#12304f] border border-white/10 rounded-2xl p-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3">
                <Trophy className="w-7 h-7 text-[#d4af37]" />
                <h2 className="text-3xl font-bold text-white">Race Schedule</h2>
              </div>

              <p className="text-gray-400 mt-2">
                {selectedTournament?.name || 'Select a tournament'} • Showing {visibleScheduleRaces.length}/{selectedTournamentRaces.length} races
              </p>
            </div>

            <div className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-3 text-[#f6d77a] font-bold">
              Selected: {selectedTournament?.name || '-'}
            </div>
          </div>

          <div className="grid xl:grid-cols-2 gap-5">
            {visibleScheduleRaces.map((race) => {
              const approvedEntries = raceEntries.filter(
                (entry) => entry.raceId === race.id && entry.status === 'approved'
              );
              const gateExpanded = expandedGateRaceIds.includes(race.id);
              const visibleGateEntries = gateExpanded
                ? approvedEntries
                : approvedEntries.slice(0, 4);
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
                  className="bg-[#071a2f] border border-white/10 rounded-xl p-5 hover:border-[#d4af37]/40 transition-all"
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
                        openRaceView(race.id, action.page);
                      }}
                      disabled={currentUser?.role === 'owner' && !race.tournamentId}
                      className="shrink-0 px-5 py-3 bg-[#d4af37] hover:bg-[#b8892d] disabled:bg-white/10 disabled:text-gray-500 text-white rounded-xl transition-all font-bold"
                    >
                      {action.label}
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
                    <div className="border border-white/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-bold">
                        <Clock className="w-4 h-4 text-[#d4af37]" />
                        Start
                      </div>
                      <p className="text-white font-semibold mt-2">
                        {race.date} • {race.time}
                      </p>
                    </div>

                    <div className="border border-white/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-bold">
                        <MapPin className="w-4 h-4 text-[#d4af37]" />
                        Venue
                      </div>
                      <p className="text-white font-semibold mt-2">{race.venue || '-'}</p>
                    </div>

                    <div className="border border-white/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-bold">
                        <Flag className="w-4 h-4 text-[#d4af37]" />
                        Distance
                      </div>
                      <p className="text-white font-semibold mt-2">
                        {race.distance || '-'}
                      </p>
                    </div>

                    <div className="border border-white/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-bold">
                        <Gauge className="w-4 h-4 text-[#d4af37]" />
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
                          {approvedEntries.length || race.participants || 0}/{maxRaceFieldSize} horses
                        </p>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">
                        Track limit: {maxRaceFieldSize} horses / {maxRaceFieldSize} jockeys
                      </p>
                    </div>

                    <div className="border border-white/10 rounded-xl p-4">
                      <p className="text-gray-500 text-xs uppercase font-bold mb-2">
                        Referee
                      </p>
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="w-5 h-5 text-[#d4af37]" />
                        <p className="text-white font-semibold">{race.referee || '-'}</p>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">
                        Assigned after race creation
                      </p>
                    </div>
                  </div>

                  {gateVisible ? (
                    <div className="mt-4 border border-[#d4af37]/25 bg-[#d4af37]/5 rounded-xl p-4">
                      <p className="text-[#f6d77a] text-xs uppercase font-bold mb-3">
                        Gate Assignments • Showing {visibleGateEntries.length}/{approvedEntries.length}
                      </p>
                      {approvedEntries.length > 0 ? (
                        <>
                          <div className="flex flex-wrap gap-2">
                            {visibleGateEntries.map((entry) => (
                              <span
                                key={entry.id}
                                className="px-3 py-2 rounded-lg bg-[#071a2f]/40 border border-white/10 text-sm text-white"
                              >
                                Gate {entry.lane || '-'} • {entry.horseName || 'Horse'} • Rating {entry.ratingSnapshot || 'TBD'} • Handicap {entry.handicap || 0}kg
                              </span>
                            ))}
                          </div>

                          {approvedEntries.length > 4 && (
                            <button
                              onClick={() => toggleGateAssignments(race.id)}
                              className="mt-4 rounded-lg border border-[#d4af37]/40 bg-[#d4af37] px-5 py-2 text-sm font-bold text-[#071a2f] hover:bg-[#f0d66c]"
                            >
                              {gateExpanded
                                ? 'Show first 4 gates'
                                : `View all ${approvedEntries.length} gates`}
                            </button>
                          )}
                        </>
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

            {visibleScheduleRaces.length === 0 && (
              <div className="xl:col-span-2 rounded-xl border border-white/10 bg-[#071a2f] p-8 text-center text-gray-400">
                This tournament has no races yet.
              </div>
            )}
          </div>

          {selectedTournamentRaces.length > 4 && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setScheduleExpanded((expanded) => !expanded)}
                className="rounded-xl border border-[#d4af37]/40 bg-[#d4af37] px-8 py-4 font-bold text-[#071a2f] hover:bg-[#f0d66c]"
              >
                {scheduleExpanded
                  ? 'Show first 4 races'
                  : `View all ${selectedTournamentRaces.length} races`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
