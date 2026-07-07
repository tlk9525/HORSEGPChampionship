import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Award,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Gauge,
  HeartPulse,
  Search,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import {
  HorseRecord,
  RaceEntryRecord,
  getBootstrap,
} from '../services/api';
import { formatWeightLb, statusLabel } from '../utils/domain';
import { officialHorseRating } from '../utils/rating';

export default function HorseDirectoryPage() {
  const navigate = useNavigate();
  const [horses, setHorses] = useState<HorseRecord[]>([]);
  const [raceEntries, setRaceEntries] = useState<RaceEntryRecord[]>([]);
  const [selectedHorseId, setSelectedHorseId] = useState('');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [horseListExpanded, setHorseListExpanded] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  useEffect(() => {
    getBootstrap()
      .then((data) => {
        const visibleHorses = data.horses || [];
        setHorses(visibleHorses);
        setRaceEntries(data.raceEntries || []);
        setSelectedHorseId(visibleHorses[0]?.id || '');
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to load horse profiles')
      );
  }, []);

  const entryCountByHorseId = useMemo(() => {
    const counts = new Map<string, number>();

    raceEntries.forEach((entry) => {
      counts.set(entry.horseId, (counts.get(entry.horseId) || 0) + 1);
    });

    return counts;
  }, [raceEntries]);

  const filteredHorses = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return horses;

    return horses.filter((horse) =>
      [
        horse.name,
        horse.breed,
        horse.species,
        horse.sex,
        horse.color,
        horse.status,
        String(officialHorseRating(horse)),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    );
  }, [horses, query]);

  useEffect(() => {
    setHorseListExpanded(false);
  }, [query]);

  const visibleHorses = horseListExpanded
    ? filteredHorses
    : filteredHorses.slice(0, 8);

  const selectedHorse =
    filteredHorses.find((horse) => horse.id === selectedHorseId) ||
    filteredHorses[0] ||
    horses[0];

  const selectedRaceEntries = useMemo(
    () =>
      selectedHorse
        ? raceEntries
            .filter((entry) => entry.horseId === selectedHorse.id)
            .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
        : [],
    [raceEntries, selectedHorse]
  );

  const visibleRaceEntries = historyExpanded
    ? selectedRaceEntries
    : selectedRaceEntries.slice(0, 5);

  const openHorseProfile = () => {
    if (!selectedHorse) return;

    sessionStorage.setItem('selectedHorseId', selectedHorse.id);
    navigate(`/horses/${selectedHorse.id}`);
  };

  return (
    <div className="min-h-screen bg-[#071a2f] pt-24 pb-12">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-[#d4af37] uppercase tracking-[0.22em] text-sm font-bold mb-3">
            Public Directory
          </p>

          <h1 className="text-4xl md:text-5xl font-black text-white">
            Horse Profiles
          </h1>

          <p className="text-gray-400 text-lg mt-3">
            Review public horse information, official ratings, race readiness and race history.
          </p>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300 font-semibold">
            {message}
          </div>
        )}

        <div className="grid lg:grid-cols-[420px,1fr] gap-8">
          <div className="bg-[#102a46] border border-white/10 rounded-2xl p-6">
            <div className="relative mb-5">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search horse name, breed, rating"
                className="w-full rounded-xl border border-white/10 bg-[#071a2f] py-3 pl-12 pr-4 text-white outline-none focus:border-[#d4af37]"
              />
            </div>

            <div className="mb-3 text-sm text-gray-400">
              Showing {visibleHorses.length}/{filteredHorses.length} profiles
            </div>

            <div className="space-y-3">
              {filteredHorses.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-[#071a2f] p-4 text-gray-500">
                  No horse profiles found.
                </div>
              )}

              {visibleHorses.map((horse) => (
                <button
                  key={horse.id}
                  onClick={() => {
                    setSelectedHorseId(horse.id);
                    setHistoryExpanded(false);
                  }}
                  className={`w-full rounded-xl border p-4 text-left transition-all ${
                    selectedHorse?.id === horse.id
                      ? 'border-[#d4af37]/60 bg-[#d4af37]/10'
                      : 'border-white/10 bg-[#071a2f] hover:border-white/25'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10">
                      <Trophy className="h-6 w-6 text-white" />
                    </div>

                    <div className="min-w-0">
                      <div className="text-white font-bold">
                        {horse.name}
                      </div>

                      <div className="mt-1 text-sm text-gray-400">
                        {horse.breed || 'Breed pending'} • Rating {officialHorseRating(horse)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {filteredHorses.length > 8 && (
              <button
                onClick={() => setHorseListExpanded((current) => !current)}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-3 text-[#d4af37] font-bold hover:bg-[#d4af37]/20 transition-all"
              >
                {horseListExpanded ? 'Show Less' : `View All ${filteredHorses.length}`}
                {horseListExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            )}
          </div>

          <div className="bg-[#102a46] border border-white/10 rounded-2xl p-8">
            {selectedHorse ? (
              <>
                <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6 mb-8">
                  <div className="flex items-start gap-5">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#d4af37]/15 border border-[#d4af37]/30">
                      <Trophy className="h-10 w-10 text-[#f6d77a]" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h2 className="text-4xl font-black text-white">
                          {selectedHorse.name}
                        </h2>

                        <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-bold text-emerald-300">
                          <BadgeCheck className="h-4 w-4" />
                          {statusLabel(selectedHorse.status)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-4 text-gray-400">
                        <span>{selectedHorse.breed || 'Breed pending'}</span>
                        <span>{selectedHorse.sex || 'Sex pending'}</span>
                        <span>{formatWeightLb(selectedHorse.weightLb)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={openHorseProfile}
                    className="inline-flex items-center justify-center rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 px-5 py-3 text-[#d4af37] font-bold hover:bg-[#d4af37]/20 transition-all"
                  >
                    View Full Profile
                  </button>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-8">
                  <div className="rounded-xl border border-white/10 bg-[#071a2f] p-5">
                    <ShieldCheck className="h-6 w-6 text-[#d4af37] mb-3" />
                    <div className="text-gray-500 text-sm">Breed / Species</div>
                    <div className="text-white font-bold mt-1">
                      {selectedHorse.breed || 'Not provided'}
                    </div>
                    <div className="text-gray-400 text-sm mt-1">
                      {selectedHorse.species || 'Species not set'}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#071a2f] p-5">
                    <Gauge className="h-6 w-6 text-[#d4af37] mb-3" />
                    <div className="text-gray-500 text-sm">Official Rating</div>
                    <div className="text-white font-bold mt-1">
                      {officialHorseRating(selectedHorse)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#071a2f] p-5">
                    <Award className="h-6 w-6 text-[#d4af37] mb-3" />
                    <div className="text-gray-500 text-sm">Race History</div>
                    <div className="text-white font-bold mt-1">
                      {entryCountByHorseId.get(selectedHorse.id) || 0} race entries
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-4 gap-4 mb-8">
                  <div className="rounded-xl border border-white/10 bg-[#071a2f] p-5">
                    <Activity className="h-5 w-5 text-[#d4af37] mb-3" />
                    <div className="text-gray-500 text-sm">Age</div>
                    <div className="text-white font-bold mt-1">
                      {selectedHorse.age} years
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#071a2f] p-5">
                    <HeartPulse className="h-5 w-5 text-[#d4af37] mb-3" />
                    <div className="text-gray-500 text-sm">Health Rating</div>
                    <div className="text-white font-bold mt-1">
                      {selectedHorse.healthRating ?? 'Not set'}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#071a2f] p-5">
                    <Gauge className="h-5 w-5 text-[#d4af37] mb-3" />
                    <div className="text-gray-500 text-sm">Speed</div>
                    <div className="text-white font-bold mt-1">
                      {selectedHorse.speedRating ?? 'Not set'}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#071a2f] p-5">
                    <Trophy className="h-5 w-5 text-[#d4af37] mb-3" />
                    <div className="text-gray-500 text-sm">Overall</div>
                    <div className="text-white font-bold mt-1">
                      {selectedHorse.overallRating ?? officialHorseRating(selectedHorse)}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#071a2f] p-6 mb-8">
                  <h3 className="text-2xl font-black text-white mb-3">
                    Notes
                  </h3>

                  <p className="text-gray-400 leading-relaxed">
                    {selectedHorse.profileNotes || 'No profile notes have been added yet.'}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#071a2f] p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                    <div>
                      <h3 className="text-2xl font-black text-white">
                        Race History
                      </h3>

                      <p className="text-gray-400 text-sm mt-1">
                        Showing {visibleRaceEntries.length}/{selectedRaceEntries.length} entries
                      </p>
                    </div>

                    {selectedRaceEntries.length > 5 && (
                      <button
                        onClick={() => setHistoryExpanded((current) => !current)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-2 text-[#d4af37] font-bold hover:bg-[#d4af37]/20 transition-all"
                      >
                        {historyExpanded ? 'Show Less' : `View All ${selectedRaceEntries.length}`}
                        {historyExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {selectedRaceEntries.length === 0 && (
                      <div className="rounded-xl border border-white/10 bg-[#0b223d] p-4 text-gray-500">
                        No race entries have been recorded for this horse yet.
                      </div>
                    )}

                    {visibleRaceEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-xl border border-white/10 bg-[#0b223d] p-4"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div>
                            <div className="text-white font-bold">
                              {entry.raceName || 'Race'}
                            </div>

                            <div className="text-gray-400 text-sm mt-1">
                              Jockey: {entry.jockeyName || 'Pending'} • Gate {entry.lane || 'TBD'} • {statusLabel(entry.status)}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-lg border border-white/10 bg-[#071a2f]/30 px-3 py-1 text-sm text-gray-300">
                              Position {entry.position || 'Pending'}
                            </span>

                            <span className="rounded-lg border border-white/10 bg-[#071a2f]/30 px-3 py-1 text-sm text-gray-300">
                              Time {entry.finishTime || 'Pending'}
                            </span>

                            <span className="rounded-lg border border-white/10 bg-[#071a2f]/30 px-3 py-1 text-sm text-gray-300">
                              Result {statusLabel(entry.resultStatus || 'draft')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-white/10 bg-[#071a2f] p-8 text-gray-500">
                Select a horse profile to view details.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
