import {
  Activity,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  Gauge,
  HeartPulse,
  Pencil,
  Scale,
  ShieldCheck,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AuthUser,
  HorseRecord,
  RaceEntryRecord,
  getBootstrap,
} from '../services/api';
import { formatWeightLb, statusLabel } from '../utils/domain';
import { officialHorseRating } from '../utils/rating';

interface HorseDetailsProps {
  currentUser: AuthUser | null;
  horse: HorseRecord | null;
  onNavigate: (page: string) => void;
}

const value = (input: string | number | null | undefined, suffix = '') =>
  input === null || input === undefined || input === '' || Number(input) === 0
    ? 'Not set'
    : `${input}${suffix}`;

const overall = officialHorseRating;

interface RatingHistoryPoint {
  entryId: string;
  raceName: string;
  jockeyName: string;
  finishTime: string;
  position: string;
  sortKey: string;
  beforeRating: number;
  ratingChange: number;
  afterRating: number;
}

interface RatingTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: RatingHistoryPoint }>;
}

const toFiniteNumber = (input: number | string | null | undefined) => {
  if (input === null || input === undefined || input === '') return null;

  const numeric = Number(input);
  return Number.isFinite(numeric) ? numeric : null;
};

const formatRating = (input: number) =>
  Number.isInteger(input) ? String(input) : input.toFixed(2);

const formatRatingChange = (input: number) => {
  const formatted = formatRating(Math.abs(input));
  if (input > 0) return `+${formatted}`;
  if (input < 0) return `-${formatted}`;
  return '0';
};

const buildRatingHistory = (entries: RaceEntryRecord[]): RatingHistoryPoint[] =>
  entries
    .filter((entry) => entry.resultStatus === 'official')
    .map((entry, index) => {
      const snapshot = toFiniteNumber(entry.ratingSnapshot);
      const change = toFiniteNumber(entry.ratingChange) ?? 0;
      const postRace = toFiniteNumber(entry.postRaceRating);
      const beforeRating = snapshot ?? (postRace !== null ? postRace - change : null);
      const afterRating = postRace ?? (beforeRating !== null ? beforeRating + change : null);

      if (beforeRating === null || afterRating === null) return null;

      return {
        entryId: entry.id,
        raceName: entry.raceName || `Race ${index + 1}`,
        jockeyName: entry.jockeyName || 'Pending',
        finishTime: entry.finishTime || 'Pending',
        position: entry.position ? String(entry.position) : 'Pending',
        sortKey: entry.createdAt || entry.id,
        beforeRating,
        ratingChange: afterRating - beforeRating,
        afterRating,
      };
    })
    .filter((point): point is RatingHistoryPoint => Boolean(point))
    .sort(
      (first, second) =>
        first.sortKey.localeCompare(second.sortKey) ||
        first.entryId.localeCompare(second.entryId)
    );

function RatingTooltip({ active, payload }: RatingTooltipProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload;

  return (
    <div className="rounded-xl border border-white/10 bg-[#071a2f] p-4 shadow-2xl">
      <div className="text-white font-bold">{point.raceName}</div>
      <div className="mt-1 text-sm text-gray-400">
        Jockey: {point.jockeyName} • Position {point.position}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div>
          <div className="text-gray-500">Before</div>
          <div className="text-white font-bold">
            {formatRating(point.beforeRating)}
          </div>
        </div>

        <div>
          <div className="text-gray-500">Change</div>
          <div
            className={`font-bold ${
              point.ratingChange >= 0 ? 'text-emerald-300' : 'text-red-300'
            }`}
          >
            {formatRatingChange(point.ratingChange)}
          </div>
        </div>

        <div>
          <div className="text-gray-500">After</div>
          <div className="text-[#d4af37] font-bold">
            {formatRating(point.afterRating)}
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        Time {point.finishTime}
      </div>
    </div>
  );
}

export default function HorseDetails({
  currentUser,
  horse,
  onNavigate,
}: HorseDetailsProps) {
  const { horseId } = useParams();
  const [loadedHorse, setLoadedHorse] = useState<HorseRecord | null>(null);
  const [raceEntries, setRaceEntries] = useState<RaceEntryRecord[]>([]);
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [raceHistoryExpanded, setRaceHistoryExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const activeHorse = horse || loadedHorse;
  const canOpenHorseList = currentUser?.role === 'owner';

  useEffect(() => {
    const activeHorseId = horse?.id || horseId;

    if (!activeHorseId) return;

    getBootstrap()
      .then((data) => {
        if (!horse) {
          setLoadedHorse(
            data.horses.find((item) => item.id === activeHorseId) || null
          );
        }

        setRaceEntries(
          (data.raceEntries || [])
            .filter((entry) => entry.horseId === activeHorseId)
            .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
        );
        setRaceHistoryExpanded(false);
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to load horse')
      );
  }, [horse, horseId]);

  if (!activeHorse) {
    return (
      <div className="min-h-screen bg-[#071a2f] pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => onNavigate(canOpenHorseList ? 'horses' : 'tournaments')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            {canOpenHorseList ? 'Back to Horses' : 'Back to Tournaments'}
          </button>

          <div className="rounded-2xl border border-white/10 bg-[#0b223d] p-8 text-gray-300">
            {message || 'Select a horse from the Horses page to view its details.'}
          </div>
        </div>
      </div>
    );
  }

  const profileCards: Array<[string, string | number, LucideIcon]> = [
    ['Breed', activeHorse.breed, Trophy],
    ['Species', activeHorse.species || 'Not set', Activity],
    ['Sex', activeHorse.sex || 'Not set', ShieldCheck],
    ['Color', activeHorse.color || 'Not set', FileText],
    ['Age', `${activeHorse.age} years`, Activity],
    ['Weight', formatWeightLb(activeHorse.weightLb), Scale],
    ['Official Rating', value(overall(activeHorse)), Trophy],
    ['Speed Rating', value(activeHorse.speedRating), Gauge],
    ['Stamina Rating', value(activeHorse.staminaRating), Activity],
    ['Form Rating', value(activeHorse.formRating), Trophy],
    ['Health Rating', value(activeHorse.healthRating), HeartPulse],
  ];
  const compactProfileLabels = new Set([
    'Breed',
    'Sex',
    'Age',
    'Weight',
    'Official Rating',
  ]);
  const visibleProfileCards = profileExpanded
    ? profileCards
    : profileCards.filter(([label]) => compactProfileLabels.has(label));
  const visibleRaceEntries = raceHistoryExpanded
    ? raceEntries
    : raceEntries.slice(0, 5);
  const ratingHistory = buildRatingHistory(raceEntries);
  const firstRating = ratingHistory[0]?.beforeRating ?? null;
  const latestRating = ratingHistory[ratingHistory.length - 1]?.afterRating ?? null;
  const totalRatingChange =
    firstRating !== null && latestRating !== null ? latestRating - firstRating : null;
  const ratingValues = ratingHistory.flatMap((point) => [
    point.beforeRating,
    point.afterRating,
  ]);
  const ratingDomain =
    ratingValues.length > 0
      ? ([
          Math.max(0, Math.floor(Math.min(...ratingValues) - 2)),
          Math.ceil(Math.max(...ratingValues) + 2),
        ] as [number, number])
      : ([0, 100] as [number, number]);
  const canEditHorse =
    currentUser?.role === 'owner' && activeHorse.ownerUserId === currentUser.id;

  return (
    <div className="min-h-screen bg-[#071a2f] pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <button
            onClick={() => onNavigate(canOpenHorseList ? 'horses' : 'tournaments')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {canOpenHorseList ? 'Back to Horses' : 'Back to Tournaments'}
          </button>

          {canEditHorse && (
            <button
              onClick={() => {
                sessionStorage.setItem('selectedHorseId', activeHorse.id);
                onNavigate('edit-horse');
              }}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 px-5 py-3 text-[#d4af37] font-bold hover:bg-[#d4af37]/20"
            >
              <Pencil className="w-4 h-4" />
              Edit Horse
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0b223d] overflow-hidden mb-8">
          <div className="relative min-h-[340px]">
            <img
              src="https://images.unsplash.com/photo-1507514604110-ba3347c457f6?w=1600"
              alt={activeHorse.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b223d] via-[#0b223d]/50 to-[#071a2f]/20" />

            <div className="relative z-10 p-8 lg:p-10 flex flex-col justify-end min-h-[340px]">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="px-4 py-2 bg-[#d4af37] rounded-lg text-white font-bold text-sm">
                  {statusLabel(activeHorse.status)}
                </span>

                <span className="px-4 py-2 bg-[#071a2f]/50 border border-white/10 rounded-lg text-white font-semibold text-sm">
                  Official Rating {overall(activeHorse)}
                </span>
              </div>

              <h1 className="text-5xl font-black text-white mb-3">
                {activeHorse.name}
              </h1>

              <p className="text-gray-300 text-lg">
                {activeHorse.breed} • {activeHorse.species || 'Species not set'} • {activeHorse.age} years old
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr,380px] gap-8">
          <div className="space-y-8">
            <div className="relative rounded-2xl border border-white/10 bg-[#0b223d] p-8 pb-10">
              <h2 className="text-3xl font-bold text-white mb-6">
                Horse Profile
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                {visibleProfileCards.map(([label, content, Icon]) => (
                  <div
                    key={String(label)}
                    className="rounded-xl border border-white/10 bg-[#12304f] p-5"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="w-5 h-5 text-[#d4af37]" />
                      <span className="text-gray-400 text-sm">{label}</span>
                    </div>

                    <div className="text-white text-lg font-bold">
                      {content}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setProfileExpanded((current) => !current)}
                aria-label={
                  profileExpanded
                    ? 'Collapse full horse profile'
                    : 'Expand full horse profile'
                }
                title={
                  profileExpanded
                    ? 'Collapse full horse profile'
                    : 'Expand full horse profile'
                }
                className="absolute left-1/2 bottom-0 flex h-9 w-9 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border border-[#d4af37]/40 bg-[#071a2f] text-[#d4af37] shadow-lg shadow-black/20 hover:bg-[#12304f] focus:outline-none focus:ring-2 focus:ring-[#d4af37]/60"
              >
                {profileExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0b223d] p-8">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-white">
                    Rating Trend
                  </h2>

                  <p className="text-gray-400 text-sm mt-1">
                    Based on official race results
                  </p>
                </div>

                {ratingHistory.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-white/10 bg-[#12304f] px-4 py-3">
                      <div className="text-xs text-gray-400">Start</div>
                      <div className="text-white text-lg font-bold">
                        {formatRating(firstRating ?? 0)}
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-[#12304f] px-4 py-3">
                      <div className="text-xs text-gray-400">Latest</div>
                      <div className="text-[#d4af37] text-lg font-bold">
                        {formatRating(latestRating ?? 0)}
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-[#12304f] px-4 py-3">
                      <div className="text-xs text-gray-400">Total</div>
                      <div
                        className={`text-lg font-bold ${
                          (totalRatingChange ?? 0) >= 0
                            ? 'text-emerald-300'
                            : 'text-red-300'
                        }`}
                      >
                        {formatRatingChange(totalRatingChange ?? 0)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {ratingHistory.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-[#12304f] p-5 text-gray-400">
                  No official rating history has been recorded for this horse yet.
                </div>
              ) : (
                <div className="h-80 rounded-xl border border-white/10 bg-[#071a2f]/60 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={ratingHistory}
                      margin={{ top: 12, right: 16, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                      <XAxis
                        dataKey="raceName"
                        interval="preserveStartEnd"
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: 'rgba(255,255,255,0.14)' }}
                      />
                      <YAxis
                        domain={ratingDomain}
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: 'rgba(255,255,255,0.14)' }}
                        width={40}
                      />
                      <Tooltip content={<RatingTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="afterRating"
                        name="Post-race rating"
                        stroke="#d4af37"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#d4af37', stroke: '#071a2f', strokeWidth: 2 }}
                        activeDot={{ r: 7, fill: '#f4d35e', stroke: '#ffffff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0b223d] p-8">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-3xl font-bold text-white">
                    Race History
                  </h2>

                  <p className="text-gray-400 text-sm mt-1">
                    Showing {visibleRaceEntries.length}/{raceEntries.length} entries
                  </p>
                </div>

                {raceEntries.length > 5 && (
                  <button
                    onClick={() => setRaceHistoryExpanded((current) => !current)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-2 text-[#d4af37] font-bold hover:bg-[#d4af37]/20 transition-all"
                  >
                    {raceHistoryExpanded ? 'Show Less' : `View All ${raceEntries.length}`}
                    {raceHistoryExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {raceEntries.length === 0 && (
                  <div className="rounded-xl border border-white/10 bg-[#12304f] p-5 text-gray-400">
                    No race entries have been recorded for this horse yet.
                  </div>
                )}

                {visibleRaceEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-white/10 bg-[#12304f] p-5"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <div className="text-white text-lg font-bold">
                          {entry.raceName || 'Race'}
                        </div>

                        <div className="mt-1 text-sm text-gray-400">
                          Jockey: {entry.jockeyName || 'Pending'} • Gate {entry.lane || 'TBD'} • {statusLabel(entry.status)}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-lg border border-white/10 bg-[#071a2f]/40 px-3 py-2 text-sm text-gray-300">
                          Position {entry.position || 'Pending'}
                        </span>

                        <span className="rounded-lg border border-white/10 bg-[#071a2f]/40 px-3 py-2 text-sm text-gray-300">
                          Time {entry.finishTime || 'Pending'}
                        </span>

                        <span className="rounded-lg border border-white/10 bg-[#071a2f]/40 px-3 py-2 text-sm text-gray-300">
                          Result {statusLabel(entry.resultStatus || 'draft')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="rounded-2xl border border-white/10 bg-[#0b223d] p-8">
              <h2 className="text-2xl font-bold text-white mb-5">
                Notes
              </h2>

              <p className="text-gray-300 leading-8">
                {activeHorse.profileNotes || 'No profile notes have been added yet.'}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0b223d] p-8">
              <h2 className="text-2xl font-bold text-white mb-6">
                Documents
              </h2>

              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-[#12304f] p-5">
                  <div className="text-gray-400 text-sm mb-2">
                    Veterinary Certificate
                  </div>

                  <div className="text-white font-semibold break-words">
                    {activeHorse.veterinaryCertificateUrl || 'Not uploaded'}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#12304f] p-5">
                  <div className="text-gray-400 text-sm mb-2">
                    Owner name
                  </div>

                  <div className="text-white font-semibold">
                    {activeHorse.ownerName || 'Unknown Owner'}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0b223d] p-8">
              <h2 className="text-2xl font-bold text-white mb-6">
                Race Readiness
              </h2>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">Admin status</span>
                  <span className="text-white font-bold">{statusLabel(activeHorse.status)}</span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">Health</span>
                  <span className="text-white font-bold">{activeHorse.healthStatus || 'Not set'}</span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">Official Rating</span>
                  <span className="text-white font-bold">{overall(activeHorse)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
