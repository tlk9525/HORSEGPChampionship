import {
  Activity,
  Circle,
  CloudSun,
  Gauge,
  MapPin,
  Shield,
  Timer,
  Trophy,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  useNavigate,
  useParams,
} from 'react-router-dom';
import {
  HorseRecord,
  JockeyProfileRecord,
  RaceEntryRecord,
  RaceRecord,
  TournamentRecord,
  getBootstrap,
} from '../services/api';
import { statusLabel } from '../utils/domain';

const raceSortValue = (race: RaceRecord) => {
  const parsed = Number(String(race.raceNumber || '').replace(/\D/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 999;
};

const ratingForHorse = (horse?: HorseRecord) =>
  Number(
    (
      Number(horse?.overallRating || 0) ||
      Number(horse?.speedRating || 75) * 0.4 +
        Number(horse?.staminaRating || 75) * 0.25 +
        Number(horse?.formRating || 75) * 0.2 +
        Number(horse?.healthRating || 80) * 0.15
    ).toFixed(2)
  );

const trackCondition = (race?: RaceRecord) =>
  race?.surface === 'Dirt' ? 'Fast Dirt' : 'Good Track';

const canShowRaceCardData = (race?: RaceRecord) =>
  Boolean(
    race &&
      [
        'registration-closed',
        'published',
        'in-progress',
        'finished',
        'completed',
      ].includes(race.status)
  );

export default function RaceDetails() {
  const { raceId } = useParams();
  const routerNavigate = useNavigate();
  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [races, setRaces] = useState<RaceRecord[]>([]);
  const [entries, setEntries] = useState<RaceEntryRecord[]>([]);
  const [horses, setHorses] = useState<HorseRecord[]>([]);
  const [jockeyProfiles, setJockeyProfiles] = useState<JockeyProfileRecord[]>([]);
  const [maxRaceFieldSize, setMaxRaceFieldSize] = useState(10);
  const [selectedRaceId, setSelectedRaceId] = useState(
    raceId || sessionStorage.getItem('selectedRaceId') || ''
  );
  const [entriesExpanded, setEntriesExpanded] = useState(false);
  const [message, setMessage] = useState('');

  const loadRaceData = () => {
    getBootstrap()
      .then((data) => {
        const sortedRaces = [...(data.races || [])].sort(
          (a, b) => raceSortValue(a) - raceSortValue(b)
        );

        setTournaments(data.tournaments || []);
        setRaces(sortedRaces);
        setEntries(data.raceEntries || []);
        setHorses(data.horses || []);
        setJockeyProfiles(data.jockeyProfiles || []);
        setMaxRaceFieldSize(data.limits?.maxRaceFieldSize || 10);
        setSelectedRaceId((current) => {
          const next = raceId || current;

          if (next && sortedRaces.some((race) => race.id === next)) {
            sessionStorage.setItem('selectedRaceId', next);
            return next;
          }

          const fallback = sortedRaces[0]?.id || '';

          if (fallback) {
            sessionStorage.setItem('selectedRaceId', fallback);
          }

          return fallback;
        });
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to load race card')
      );
  };

  useEffect(() => {
    loadRaceData();
    const timer = window.setInterval(loadRaceData, 5000);

    return () => window.clearInterval(timer);
  }, [raceId]);

  const selectedRace =
    races.find((race) => race.id === selectedRaceId) || races[0];
  const tournamentRaces = races.filter(
    (race) => race.tournamentId === selectedRace?.tournamentId
  );
  const tournament =
    tournaments.find((item) => item.id === selectedRace?.tournamentId) ||
    tournaments[0];

  const selectedEntries = useMemo(
    () =>
      entries
        .filter(
          (entry) =>
            entry.raceId === selectedRace?.id &&
            !['rejected', 'withdrawn'].includes(entry.status)
        )
        .sort((a, b) => (a.lane || 999) - (b.lane || 999)),
    [entries, selectedRace?.id]
  );

  const showData = canShowRaceCardData(selectedRace) && selectedEntries.length > 0;

  const rows = selectedEntries.map((entry, index) => {
    const horse = horses.find((item) => item.id === entry.horseId);
    const jockeyProfile = jockeyProfiles.find(
      (profile) => profile.userId === entry.jockeyUserId
    );
    const rating = Number(entry.ratingSnapshot || 0) || ratingForHorse(horse);

    return {
      id: entry.id,
      no: entry.lane || index + 1,
      form: '-',
      colour: horse?.color || '-',
      horse: entry.horseName || horse?.name || 'Horse',
      breed: horse?.breed || 'Breed not set',
      age: horse?.age || '-',
      weightKg: Number(entry.handicap || horse?.baseHandicap || 0).toFixed(1),
      jockey: entry.jockeyName || 'Jockey pending',
      jockeyWeightKg: jockeyProfile?.weight
        ? Number(jockeyProfile.weight).toFixed(1)
        : '-',
      draw: entry.lane || 'TBD',
      owner: entry.ownerName || 'Owner pending',
      rating,
      ratingChange: '0',
      horseWeightKg: Number(horse?.weightKg || 0).toFixed(1),
      priority: '-',
      gear: '-',
    };
  });
  const visibleRows = entriesExpanded ? rows : rows.slice(0, 4);

  const selectRace = (raceId: string) => {
    sessionStorage.setItem('selectedRaceId', raceId);
    setSelectedRaceId(raceId);
    setEntriesExpanded(false);
    routerNavigate(`/races/${raceId}`);
  };

  if (!selectedRace) {
    return (
      <div className="min-h-screen bg-[#071a2f] pt-24 pb-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="rounded-2xl border border-white/10 bg-[#0b223d] p-8 text-gray-300">
            No races have been created yet.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#071a2f] pt-24 pb-10">
      <div className="max-w-[1850px] mx-auto px-4">
        <div className="bg-[#102a46] border border-white/10 rounded-2xl overflow-hidden mb-6">
          <div className="border-b border-white/10 px-6 py-5 bg-[#0b223d]">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#d4af37]/15 border border-[#d4af37]/30">
                    <Circle className="w-2 h-2 fill-[#d4af37] text-[#d4af37]" />

                    <span className="text-[#d4af37] text-xs font-bold uppercase tracking-wider">
                      {statusLabel(selectedRace.status)}
                    </span>
                  </div>

                  <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm">
                    {tournament?.name || 'Tournament'}
                  </div>

                  <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm">
                    {selectedRace.raceNumber || selectedRace.round || 'Race'}
                  </div>
                </div>

                <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight">
                  {selectedRace.name}
                </h1>

                <div className="flex flex-wrap items-center gap-5 mt-5 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#d4af37]" />
                    {selectedRace.venue}
                  </div>

                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-[#d4af37]" />
                    {selectedRace.date} • {selectedRace.time}
                  </div>

                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-[#d4af37]" />
                    Prize Pool: ${Number(selectedRace.totalPrize || 0).toLocaleString()}
                  </div>

                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#d4af37]" />
                    {trackCondition(selectedRace)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 min-w-[340px]">
                <div className="bg-[#071a2f]/40 border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-gray-500 uppercase mb-2">
                    Owner Confirmed
                  </div>

                  <div className="text-2xl font-black text-[#d4af37]">
                    {selectedRace.ownerConfirmed}/{selectedRace.participants || selectedEntries.length}
                  </div>
                </div>

                <div className="bg-[#071a2f]/40 border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-gray-500 uppercase mb-2">
                    Jockey Confirmed
                  </div>

                  <div className="text-2xl font-black text-white">
                    {selectedRace.jockeyConfirmed}/{selectedRace.participants || selectedEntries.length}
                  </div>
                </div>

                <div className="bg-[#071a2f]/40 border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-gray-500 uppercase mb-2">
                    Weather
                  </div>

                  <div className="flex items-center gap-2 text-white font-bold">
                    <CloudSun className="w-5 h-5 text-[#d4af37]" />
                    Sunny
                  </div>
                </div>

                <div className="bg-[#071a2f]/40 border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-gray-500 uppercase mb-2">
                    Referee
                  </div>

                  <div className="text-lg font-black text-white">
                    {selectedRace.referee || 'Not assigned'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 border-b border-white/10 bg-[#071a2f]">
            <div className="flex flex-wrap items-center gap-3">
              {tournamentRaces.map((race) => (
                <button
                  key={race.id}
                  onClick={() => selectRace(race.id)}
                  className={`w-20 h-16 rounded-2xl font-black text-2xl transition-all duration-300 ${
                    race.id === selectedRace.id
                      ? 'bg-[#d4af37] text-white shadow-xl shadow-[#d4af37]/30'
                      : 'bg-[#12304f] text-gray-300 hover:bg-[#1f3a5c]'
                  }`}
                >
                  {race.raceNumber || 'Race'}
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 py-4 bg-[#102a46] border-b border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-5 text-sm text-gray-400">
                <span>{selectedRace.distance || '-'} {selectedRace.surface || ''}</span>
                <span>{trackCondition(selectedRace)}</span>
                <span>{selectedRace.round || selectedRace.raceClass || 'Round pending'}</span>
                <span>{selectedEntries.length}/{maxRaceFieldSize} Horses</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-4 py-2 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#d4af37] font-bold text-sm">
                  REAL-TIME RACE CARD
                </div>

                <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm">
                  Updates every 5s
                </div>
              </div>
            </div>
          </div>

          {message && (
            <div className="m-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300 font-semibold">
              {message}
            </div>
          )}

          {!showData ? (
            <div className="p-8">
              <div className="rounded-2xl border border-white/10 bg-[#071a2f] p-8 text-center">
                <h2 className="text-3xl font-black text-white">
                  No race card entries yet
                </h2>

                <p className="text-gray-400 mt-3 max-w-2xl mx-auto">
                  This race has not been prepared yet, or no owner and jockey pair
                  has been approved for this race. Once entries are approved and
                  registration is closed or published, the race card appears here
                  automatically.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 bg-[#071a2f] px-6 py-4">
                <div>
                  <h2 className="text-xl font-black text-white">
                    Race Entries
                  </h2>

                  <p className="text-gray-400 text-sm mt-1">
                    Showing {visibleRows.length}/{rows.length} entries
                  </p>
                </div>

                {rows.length > 4 && (
                  <button
                    onClick={() => setEntriesExpanded((expanded) => !expanded)}
                    className="rounded-lg border border-[#d4af37]/40 bg-[#d4af37] px-5 py-2 text-sm font-bold text-[#071a2f] hover:bg-[#f0d66c]"
                  >
                    {entriesExpanded
                      ? 'Show first 4 entries'
                      : `View all ${rows.length} entries`}
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1600px]">
                  <thead className="bg-[#071a2f] border-b border-white/10">
                    <tr>
                      <th className="py-4 px-3 text-left text-gray-400 uppercase text-xs">Horse No.</th>
                      <th className="py-4 px-3 text-left text-gray-400 uppercase text-xs">Last 6 Runs</th>
                      <th className="py-4 px-3 text-left text-gray-400 uppercase text-xs">Colour</th>
                      <th className="py-4 px-3 text-left text-gray-400 uppercase text-xs">Horse</th>
                      <th className="py-4 px-3 text-center text-gray-400 uppercase text-xs">Wt. (kg)</th>
                      <th className="py-4 px-3 text-left text-gray-400 uppercase text-xs">Jockey</th>
                      <th className="py-4 px-3 text-center text-gray-400 uppercase text-xs">Jockey Wt. (kg)</th>
                      <th className="py-4 px-3 text-center text-gray-400 uppercase text-xs">Draw</th>
                      <th className="py-4 px-3 text-left text-gray-400 uppercase text-xs">Owner</th>
                      <th className="py-4 px-3 text-center text-gray-400 uppercase text-xs">Rtg.</th>
                      <th className="py-4 px-3 text-center text-gray-400 uppercase text-xs">Rtg +/-</th>
                      <th className="py-4 px-3 text-center text-gray-400 uppercase text-xs">Horse Wt. (kg)</th>
                      <th className="py-4 px-3 text-center text-gray-400 uppercase text-xs">Priority</th>
                      <th className="py-4 px-3 text-center text-gray-400 uppercase text-xs">Gear</th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleRows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-white/5 hover:bg-white/5 transition-all"
                      >
                        <td className="py-5 px-3">
                          <div className="w-11 h-11 rounded-xl bg-[#d4af37] flex items-center justify-center text-white font-black shadow-lg shadow-[#d4af37]/20">
                            {row.no}
                          </div>
                        </td>

                        <td className="py-5 px-3">
                          <div className="font-mono text-sm text-gray-400">
                            {row.form}
                          </div>
                        </td>

                        <td className="py-5 px-3">
                          <div className="inline-flex px-3 py-2 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#f6d77a] text-sm font-bold">
                            {row.colour}
                          </div>
                        </td>

                        <td className="py-5 px-3">
                          <div className="font-black text-white text-lg">
                            {row.horse}
                          </div>

                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <Shield className="w-3 h-3" />
                            {row.breed} • Age {row.age}
                          </div>
                        </td>

                        <td className="py-5 px-3 text-center text-white font-semibold">
                          {row.weightKg}kg
                        </td>

                        <td className="py-5 px-3 text-gray-300 font-semibold">
                          {row.jockey}
                        </td>

                        <td className="py-5 px-3 text-center text-white font-semibold">
                          {row.jockeyWeightKg === '-' ? '-' : `${row.jockeyWeightKg}kg`}
                        </td>

                        <td className="py-5 px-3 text-center">
                          <div className="inline-flex w-10 h-10 rounded-lg bg-[#12304f] items-center justify-center text-white font-bold border border-white/10">
                            {row.draw}
                          </div>
                        </td>

                        <td className="py-5 px-3 text-gray-300">
                          {row.owner}
                        </td>

                        <td className="py-5 px-3 text-center text-white font-semibold">
                          {row.rating}
                        </td>

                        <td
                          className={`py-5 px-3 text-center font-bold ${
                            row.ratingChange.includes('+')
                              ? 'text-green-500'
                              : row.ratingChange.includes('-')
                                ? 'text-red-500'
                                : 'text-gray-400'
                          }`}
                        >
                          {row.ratingChange}
                        </td>

                        <td className="py-5 px-3 text-center text-white">
                          {row.horseWeightKg}kg
                        </td>

                        <td className="py-5 px-3 text-center">
                          <div className="inline-flex px-3 py-2 rounded-lg bg-[#12304f] text-gray-300 text-sm font-bold">
                            {row.priority}
                          </div>
                        </td>

                        <td className="py-5 px-3 text-center">
                          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#12304f] border border-white/10 text-gray-300 font-semibold">
                            <Gauge className="w-4 h-4 text-[#d4af37]" />
                            {row.gear}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="border-t border-white/10 p-6 bg-[#071a2f]">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="px-4 py-2 rounded-lg bg-[#12304f] border border-white/10 text-gray-400">
                TT = Tongue Tie
              </div>

              <div className="px-4 py-2 rounded-lg bg-[#12304f] border border-white/10 text-gray-400">
                XB = Cross Nose Band
              </div>

              <div className="px-4 py-2 rounded-lg bg-[#12304f] border border-white/10 text-gray-400">
                CP = Cheek Pieces
              </div>

              <div className="px-4 py-2 rounded-lg bg-[#12304f] border border-white/10 text-gray-400">
                B = Blinkers
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
