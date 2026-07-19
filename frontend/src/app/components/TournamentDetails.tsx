import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Calendar,
  Flag,
  MapPin,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  HorseRecord,
  RaceEntryRecord,
  RaceRecord,
  TournamentRecord,
  getBootstrap,
} from '../services/api';
import { statusLabel } from '../utils/domain';
import { raceNumberValue, raceRegistrationOpen } from '../utils/raceSchedule';

interface TournamentDetailsProps {
  onNavigate: (page: string) => void;
}

// Ghi chú: Hàm này render chi tiết tournament cùng danh sách race thuộc tournament.
export default function TournamentDetails({ onNavigate }: TournamentDetailsProps) {
  const { tournamentId } = useParams();
  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [races, setRaces] = useState<RaceRecord[]>([]);
  const [raceEntries, setRaceEntries] = useState<RaceEntryRecord[]>([]);
  const [horses, setHorses] = useState<HorseRecord[]>([]);
  const [maxRaceFieldSize, setMaxRaceFieldSize] = useState(0);
  const [selectedTournamentId, setSelectedTournamentId] = useState(
    tournamentId || sessionStorage.getItem('selectedTournamentId') || ''
  );
  const [raceListExpanded, setRaceListExpanded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getBootstrap({ scope: 'tournaments' })
      .then((data) => {
        setTournaments(data.tournaments || []);
        setRaces(data.races || []);
        setRaceEntries(data.raceEntries || []);
        setHorses(data.horses || []);
        setMaxRaceFieldSize(data.limits?.maxRaceFieldSize ?? 0);

        setSelectedTournamentId((current) => {
          const next = tournamentId || current || data.tournaments?.[0]?.id || '';

          if (next) {
            sessionStorage.setItem('selectedTournamentId', next);
          }

          return next;
        });
      })
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : 'Unable to load tournament')
      );
  }, [tournamentId]);

  const tournament =
    tournaments.find((item) => item.id === selectedTournamentId) || tournaments[0];

  const tournamentRaces = useMemo(
    () =>
      races
        .filter((race) => race.tournamentId === tournament?.id)
        .sort((a, b) => raceNumberValue(a.raceNumber) - raceNumberValue(b.raceNumber)),
    [races, tournament?.id]
  );

  const tournamentEntries = useMemo(() => {
    const raceIds = new Set(tournamentRaces.map((race) => race.id));

    return raceEntries.filter((entry) => raceIds.has(entry.raceId));
  }, [raceEntries, tournamentRaces]);

  const isCompleted = tournament?.status === 'completed';
  const visibleRaces = raceListExpanded ? tournamentRaces : tournamentRaces.slice(0, 4);
  const openRaceCount = tournamentRaces.filter(raceRegistrationOpen).length;

  // Ghi chú: Hàm này mở nghiệp vụ liên quan đến open race.
  const openRace = (raceId: string) => {
    sessionStorage.setItem('selectedRaceId', raceId);
    onNavigate('race-details');
  };

  // Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến horse name.
  const horseName = (horseId: string) =>
    horses.find((horse) => horse.id === horseId)?.name || horseId;

  return (
    <div className="min-h-screen bg-[#071a2f] pt-24 pb-12">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        )}

        <div className="bg-[#0b223d] border border-white/10 rounded-2xl p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
            <div>
              <p className="text-[#d4af37] text-sm uppercase tracking-widest">
                Tournament Detail
              </p>

              <h1 className="text-4xl font-black text-white mt-2">
                {tournament?.name || 'Tournament'}
              </h1>

              <p className="text-gray-400 mt-3">
                {isCompleted
                  ? 'This tournament is completed and locked. All roles can only view details and race cards.'
                  : 'Registration and race operations follow the active workflow.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={tournament?.id || ''}
                onChange={(event) => {
                  setSelectedTournamentId(event.target.value);
                  setRaceListExpanded(false);
                  sessionStorage.setItem('selectedTournamentId', event.target.value);
                  onNavigate('tournament-details');
                }}
                className="bg-[#12304f] border border-white/10 rounded-xl px-4 py-3 text-white"
              >
                {tournaments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>

              <div className="px-4 py-3 bg-yellow-500/15 border border-yellow-500/30 rounded-xl text-yellow-300 font-bold">
                {statusLabel(tournament?.status || 'draft')}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-5">
            {[
              {
                icon: Calendar,
                label: 'Date',
                value: `${tournament?.startDate || '-'} - ${tournament?.finalDate || '-'}`,
              },
              {
                icon: MapPin,
                label: 'Location',
                value: tournament?.location || '-',
              },

              {
                icon: Users,
                label: 'Race Registration',
                value: `${openRaceCount} open / ${tournamentRaces.length} races`,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-[#12304f] rounded-xl p-5 border border-white/10"
              >
                <item.icon className="w-5 h-5 text-[#d4af37] mb-3" />

                <p className="text-gray-400 text-sm mb-2">{item.label}</p>

                <h3 className="text-white text-lg font-bold">
                  {item.value}
                </h3>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0b223d] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Race List
              </h2>

              <p className="text-gray-400 mt-1">
                Every completed tournament should contain the configured race schedule. Showing {visibleRaces.length}/{tournamentRaces.length}.
              </p>
            </div>

            <div className="text-[#d4af37] font-black">
              {tournamentRaces.length} races
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {visibleRaces.map((race) => {
              const entries = tournamentEntries.filter((entry) => entry.raceId === race.id);
              const officialEntries = entries.filter((entry) => entry.position);

              return (
                <div
                  key={race.id}
                  className="rounded-xl border border-white/10 bg-[#071a2f] p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-[#d4af37] font-black">
                        <Flag className="w-4 h-4" />
                        {race.raceNumber || 'Race'}
                      </div>

                      <h3 className="text-white text-xl font-bold mt-2">
                        {race.name}
                      </h3>

                      <p className="text-gray-400 mt-2">
                        {race.date} • {race.time} • {race.venue}
                      </p>
                    </div>

                    <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/10 text-white text-sm font-bold">
                      {statusLabel(race.status)}
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3 mt-5 text-sm">
                    <div className="rounded-lg bg-[#12304f] p-3">
                      <div className="text-gray-400">Entries</div>
                      <div className="text-white font-bold">{entries.length}/{maxRaceFieldSize}</div>
                    </div>

                    <div className="rounded-lg bg-[#12304f] p-3">
                      <div className="text-gray-400">Official</div>
                      <div className="text-white font-bold">{officialEntries.length}</div>
                    </div>

                    <div className="rounded-lg bg-[#12304f] p-3">
                      <div className="text-gray-400">Referee</div>
                      <div className="text-white font-bold">{race.referee || '-'}</div>
                    </div>
                  </div>

                  {officialEntries[0] && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-gray-300">
                      <ShieldCheck className="w-4 h-4 text-emerald-300" />
                      Winner: {horseName(officialEntries[0].horseId)}
                    </div>
                  )}

                  <button
                    onClick={() => openRace(race.id)}
                    className="mt-5 w-full rounded-lg bg-[#d4af37] px-4 py-3 font-bold text-[#071a2f] hover:bg-[#f0d66c]"
                  >
                    View Race
                  </button>
                </div>
              );
            })}

            {visibleRaces.length === 0 && (
              <div className="lg:col-span-2 rounded-xl border border-white/10 bg-[#071a2f] p-8 text-center text-gray-400">
                This tournament has no races yet.
              </div>
            )}
          </div>

          {tournamentRaces.length > 4 && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setRaceListExpanded((expanded) => !expanded)}
                className="rounded-xl border border-[#d4af37]/40 bg-[#d4af37] px-8 py-4 font-bold text-[#071a2f] hover:bg-[#f0d66c]"
              >
                {raceListExpanded
                  ? 'Show first 4 races'
                  : `View all ${tournamentRaces.length} races`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
