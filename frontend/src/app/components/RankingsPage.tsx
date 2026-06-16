import { useEffect, useMemo, useState } from 'react';
import {
  Crown,
  Medal,
  Star,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import {
  HorseRecord,
  RaceEntryRecord,
  RaceRecord,
  getBootstrap,
} from '../services/api';
import { statusLabel } from '../utils/domain';

type Tab = 'horses' | 'jockeys' | 'owners';

type TournamentRecord = {
  id: string;
  name: string;
  status: string;
  location?: string;
  startDate?: string;
  finalDate?: string;
};

type RankingRow = {
  key: string;
  rank: number;
  name: string;
  detail: string;
  races: number;
  wins: number;
  seconds: number;
  totalScore: number;
  totalTime: number;
};

const scoreByPosition = (position?: number | null) => {
  if (position === 1) return 10;
  if (position === 2) return 7;
  if (position === 3) return 5;
  if (position === 4) return 3;
  if (position === 5) return 2;
  if (position === 6) return 1;

  return 0;
};

const parseFinishTime = (finishTime?: string) => {
  if (!finishTime) return 0;

  const [minutes = '0', secondsPart = '0'] = finishTime.split(':');
  const [seconds = '0', centiseconds = '0'] = secondsPart.split('.');

  return (
    Number(minutes) * 60 +
    Number(seconds) +
    Number(centiseconds.padEnd(2, '0').slice(0, 2)) / 100
  );
};

const formatTime = (seconds: number) => {
  if (!seconds) return '-';

  const minutes = Math.floor(seconds / 60);
  const remaining = seconds - minutes * 60;

  return `${minutes}:${remaining.toFixed(2).padStart(5, '0')}`;
};

const buildRankings = (
  entries: RaceEntryRecord[],
  horses: HorseRecord[],
  activeTab: Tab
) => {
  const horseById = new Map(horses.map((horse) => [horse.id, horse]));
  const rows = new Map<string, RankingRow>();

  entries.forEach((entry) => {
    if (!entry.position) return;

    const horse = horseById.get(entry.horseId);
    const key =
      activeTab === 'horses'
        ? entry.horseId
        : activeTab === 'jockeys'
        ? entry.jockeyUserId
        : horse?.ownerUserId || entry.ownerName || 'unknown-owner';

    const fallbackName =
      activeTab === 'horses'
        ? entry.horseName || horse?.name || 'Unknown Horse'
        : activeTab === 'jockeys'
        ? entry.jockeyName || 'Unknown Jockey'
        : entry.ownerName || 'Unknown Owner';

    const detail =
      activeTab === 'horses'
        ? `Owner: ${entry.ownerName || 'Unknown'}`
        : activeTab === 'jockeys'
        ? `Horse: ${entry.horseName || horse?.name || 'Multiple'}`
        : 'Owner stable performance';

    const current =
      rows.get(key) ||
      ({
        key,
        rank: 0,
        name: fallbackName,
        detail,
        races: 0,
        wins: 0,
        seconds: 0,
        totalScore: 0,
        totalTime: 0,
      } satisfies RankingRow);

    current.races += 1;
    current.wins += entry.position === 1 ? 1 : 0;
    current.seconds += entry.position === 2 ? 1 : 0;
    current.totalScore += scoreByPosition(entry.position);
    current.totalTime += parseFinishTime(entry.finishTime);

    rows.set(key, current);
  });

  return Array.from(rows.values())
    .sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.seconds !== a.seconds) return b.seconds - a.seconds;

      return a.totalTime - b.totalTime;
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));
};

const rankColor = (rank: number) => {
  if (rank === 1) return 'text-[#d4af37]';
  if (rank === 2) return 'text-gray-200';
  if (rank === 3) return 'text-[#b9824b]';

  return 'text-gray-400';
};

export default function RankingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('horses');
  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [races, setRaces] = useState<RaceRecord[]>([]);
  const [raceEntries, setRaceEntries] = useState<RaceEntryRecord[]>([]);
  const [horses, setHorses] = useState<HorseRecord[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getBootstrap()
      .then((data) => {
        const loadedTournaments = data.tournaments || [];

        setTournaments(loadedTournaments);
        setRaces(data.races || []);
        setRaceEntries(data.raceEntries || []);
        setHorses(data.horses || []);

        setSelectedTournamentId((current) => {
          if (current) return current;

          const stored = sessionStorage.getItem('selectedTournamentId');
          const fallback =
            loadedTournaments.find((item) => item.status !== 'completed') ||
            loadedTournaments.find((item) => item.status === 'completed') ||
            loadedTournaments[0];

          return stored || fallback?.id || '';
        });
      })
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : 'Unable to load rankings')
      );
  }, []);

  const selectedTournament = tournaments.find(
    (tournament) => tournament.id === selectedTournamentId
  );

  const tournamentRaces = useMemo(
    () => races.filter((race) => race.tournamentId === selectedTournamentId),
    [races, selectedTournamentId]
  );

  const tournamentEntries = useMemo(() => {
    const raceIds = new Set(tournamentRaces.map((race) => race.id));

    return raceEntries.filter(
      (entry) =>
        raceIds.has(entry.raceId) &&
        entry.status === 'approved' &&
        Boolean(entry.position)
    );
  }, [raceEntries, tournamentRaces]);

  const rankings = useMemo(
    () => buildRankings(tournamentEntries, horses, activeTab),
    [activeTab, horses, tournamentEntries]
  );

  const top3 = rankings.slice(0, 3);

  const tabs = [
    { key: 'horses' as Tab, label: 'Horse Rankings', icon: Trophy },
    { key: 'jockeys' as Tab, label: 'Jockey Rankings', icon: Medal },
    { key: 'owners' as Tab, label: 'Owner Rankings', icon: Star },
  ];

  return (
    <div className="min-h-screen bg-[#071a2f] pt-24 pb-12 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Crown className="w-7 h-7 text-[#d4af37]" />

              <h1 className="text-4xl font-black">
                Tournament Rankings
              </h1>
            </div>

          </div>

          <div className="min-w-full sm:min-w-[360px]">
            <label className="block text-sm text-gray-400 mb-2">
              Select Tournament
            </label>

            <select
              value={selectedTournamentId}
              onChange={(event) => {
                setSelectedTournamentId(event.target.value);
                sessionStorage.setItem('selectedTournamentId', event.target.value);
              }}
              className="w-full bg-[#12304f] border border-white/10 rounded-lg px-4 py-3 text-white"
            >
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name} - {statusLabel(tournament.status)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        )}

        <div className="mb-8 grid md:grid-cols-4 gap-4">
          {[
            ['Tournament', selectedTournament?.name || '-'],
            ['Status', selectedTournament ? statusLabel(selectedTournament.status) : '-'],
            ['Race Count', `${tournamentRaces.length}/10 races`],
            ['Official Entries', `${tournamentEntries.length} results`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-white/10 bg-[#0b223d] p-5"
            >
              <p className="text-gray-400 text-sm uppercase tracking-wide">
                {label}
              </p>

              <div className="mt-2 text-xl font-bold">
                {value}
              </div>
            </div>
          ))}
        </div>

        <div className="mb-8 rounded-lg border border-[#d4af37]/30 bg-[#2b2110] p-5">
          <div className="font-bold text-[#f6d77a] mb-2">
            Scoring and Ranking Rule
          </div>

          <p className="text-gray-200">
            Position scores: 1st 10, 2nd 7, 3rd 5, 4th 3, 5th 2, 6th 1, 7th-10th 0. Tie-breakers: total score, number of 1st places, number of 2nd places, then lower total finish time.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3 rounded-lg transition-all ${
                  activeTab === tab.key
                    ? 'bg-[#d4af37] text-[#071a2f]'
                    : 'bg-[#12304f] text-gray-300 hover:bg-[#1f3a5c]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {top3.length > 0 && (
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {top3.map((item) => (
              <div
                key={item.key}
                className="rounded-lg border border-[#d4af37]/25 bg-[#0b223d] p-5"
              >
                <div className={`text-4xl font-black ${rankColor(item.rank)}`}>
                  #{item.rank}
                </div>

                <div className="mt-4 text-xl font-bold">
                  {item.name}
                </div>

                <div className="text-gray-400 text-sm">
                  {item.detail}
                </div>

                <div className="mt-4 text-[#d4af37] font-black">
                  {item.totalScore} pts
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-[#0b223d] border border-white/10 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#d4af37]" />

            <h2 className="font-semibold">
              {tabs.find((tab) => tab.key === activeTab)?.label}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-xs uppercase">
                  <th className="text-left px-6 py-3">Rank</th>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-center px-4 py-3">Races</th>
                  <th className="text-center px-4 py-3">1st</th>
                  <th className="text-center px-4 py-3">2nd</th>
                  <th className="text-right px-4 py-3">Total Time</th>
                  <th className="text-right px-6 py-3">Score</th>
                </tr>
              </thead>

              <tbody>
                {rankings.map((row) => (
                  <tr
                    key={row.key}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className={`text-xl font-bold ${rankColor(row.rank)}`}>
                        {row.rank}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-semibold">{row.name}</div>
                      <div className="text-gray-400 text-sm">{row.detail}</div>
                    </td>

                    <td className="px-4 py-4 text-center">{row.races}</td>
                    <td className="px-4 py-4 text-center">{row.wins}</td>
                    <td className="px-4 py-4 text-center">{row.seconds}</td>
                    <td className="px-4 py-4 text-right">{formatTime(row.totalTime)}</td>
                    <td className="px-6 py-4 text-right font-black text-[#d4af37]">
                      {row.totalScore}
                    </td>
                  </tr>
                ))}

                {rankings.length === 0 && (
                  <tr>
                    <td className="px-6 py-10 text-center text-gray-400" colSpan={7}>
                      No official result data for this tournament yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-3 border-t border-white/10 flex justify-between items-center text-xs text-gray-500">
            <span>Source: official race entries</span>
            <span>Showing {rankings.length} entries</span>
          </div>
        </div>
      </div>
    </div>
  );
}
