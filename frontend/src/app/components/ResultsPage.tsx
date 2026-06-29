import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Clock,
  Search,
} from 'lucide-react';
import {
  RaceEntryRecord,
  RaceRecord,
  TournamentRecord,
  getBootstrap,
} from '../services/api';
import { statusLabel } from '../utils/domain';



export default function ResultsPage() {
  const [races, setRaces] = useState<RaceRecord[]>([]);
  const [entries, setEntries] = useState<RaceEntryRecord[]>([]);
  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [raceSearch, setRaceSearch] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    getBootstrap()
      .then((data) => {
        setTournaments(data.tournaments || []);
        setRaces(data.races || []);
        setEntries(data.raceEntries || []);
        setSelectedTournamentId(
          (current) => current || data.tournaments?.[0]?.id || ''
        );
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to load results')
      );
  }, []);

  const tournamentRaces = useMemo(
    () => races.filter((race) => race.tournamentId === selectedTournamentId),
    [races, selectedTournamentId]
  );

  const completedRaces = useMemo(
    () =>
      tournamentRaces.filter((race) =>
        race.status === 'completed' && race.resultStatus === 'official'
      ),
    [tournamentRaces]
  );

  const raceIds = useMemo(
    () => new Set(tournamentRaces.map((race) => race.id)),
    [tournamentRaces]
  );

  const tournamentEntries = useMemo(
    () =>
      entries.filter(
        (entry) =>
          raceIds.has(entry.raceId) &&
          entry.status === 'approved' &&
          entry.resultStatus === 'official'
      ),
    [entries, raceIds]
  );

  const recentResults = useMemo(
    () =>
      completedRaces
        .map((race) => {
          const raceEntries = tournamentEntries
            .filter((entry) => entry.raceId === race.id && entry.position)
            .sort((a, b) => Number(a.position || 99) - Number(b.position || 99));

          return {
            race,
            entries: raceEntries,
          };
        })
        .filter((item) => item.entries.length > 0),
    [completedRaces, tournamentEntries]
  );

  const visibleResults = useMemo(() => {
    const normalized = raceSearch.trim().toLowerCase();

    if (!normalized) return recentResults;

    return recentResults.filter(({ race, entries: raceEntries }) => {
      const searchableText = [
        race.raceNumber,
        race.name,
        race.date,
        race.time,
        ...raceEntries.slice(0, 3).flatMap((entry) => [
          entry.horseName,
          entry.jockeyName,
          entry.finishTime,
          String(entry.position || ''),
        ]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalized);
    });
  }, [raceSearch, recentResults]);

  return (
    <div className="min-h-screen bg-[#071a2f] pt-24 pb-12">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-black text-white mb-2">
              Results Publishing
            </h1>

            <p className="text-gray-400">
              Official results are published directly after the assigned Referee confirms the outcome.
            </p>
          </div>

          <select
            value={selectedTournamentId}
            onChange={(event) => {
              setSelectedTournamentId(event.target.value);
              setRaceSearch('');
            }}
            className="bg-[#12304f] border border-white/10 rounded-xl px-4 py-3 text-white min-w-[280px]"
          >
            {tournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>
                {tournament.name}
              </option>
            ))}
          </select>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300 font-semibold">
            {message}
          </div>
        )}

        <div className="grid md:grid-cols-4 gap-5 mb-8">
          {[
            ['Tournament Races', `${tournamentRaces.length}/10`],
            ['Completed Races', String(completedRaces.length)],
            ['Official Entries', String(tournamentEntries.length)],
            ['Status', tournaments.find((item) => item.id === selectedTournamentId)?.status || '-'],
          ].map(([label, value]) => (
            <div key={label} className="bg-[#12304f] border border-white/10 rounded-2xl p-5">
              <div className="text-gray-400 text-sm mb-2">{label}</div>
              <div className="text-white text-2xl font-black">
                {label === 'Status' ? statusLabel(value) : value}
              </div>
            </div>
          ))}
        </div>

        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-black text-white">
                Recent Race Results
              </h2>

              <p className="text-gray-400 text-sm mt-1">
                Showing {visibleResults.length}/{recentResults.length} races
              </p>
            </div>

            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
              <input
                value={raceSearch}
                onChange={(event) => setRaceSearch(event.target.value)}
                placeholder="Search race, horse, jockey, time"
                className="w-full rounded-xl border border-white/10 bg-[#12304f] py-3 pl-12 pr-4 text-white outline-none focus:border-[#d4af37]"
              />
            </div>
          </div>

          <div className="space-y-6">
            {recentResults.length === 0 && (
              <div className="bg-[#12304f] border border-white/10 rounded-2xl p-6 text-gray-400">
                No official results have been published for this tournament yet.
              </div>
            )}

            {recentResults.length > 0 && visibleResults.length === 0 && (
              <div className="bg-[#12304f] border border-white/10 rounded-2xl p-6 text-gray-400">
                No race results match this search in the selected tournament.
              </div>
            )}

            {visibleResults.map(({ race, entries: raceEntries }) => {
              const winner = raceEntries[0];

              return (
                <div key={race.id} className="bg-[#12304f] border border-white/10 rounded-2xl p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-2 text-[#d4af37] font-bold uppercase text-sm mb-2">
                        <Award className="w-4 h-4" />
                        {race.raceNumber || 'Race'} • {statusLabel(race.status)}
                      </div>

                      <h3 className="text-2xl font-black text-white mb-1">
                        {race.name}
                      </h3>

                      <div className="flex items-center gap-3 text-gray-400 text-sm">
                        <span>{race.date}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {winner?.finishTime || race.time}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[#d4af37] font-black text-2xl">
                        {winner?.horseName || '-'}
                      </div>
                      <div className="text-gray-400 text-sm">Winner</div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    {raceEntries.slice(0, 3).map((entry) => (
                      <div
                        key={entry.id}
                        className={`rounded-xl p-4 border-2 ${
                          entry.position === 1
                            ? 'bg-yellow-500/10 border-yellow-500'
                            : entry.position === 2
                            ? 'bg-gray-300/10 border-gray-400'
                            : 'bg-orange-500/10 border-orange-500'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-[#d4af37] text-[#071a2f] flex items-center justify-center font-black text-2xl">
                            {entry.position}
                          </div>

                          <div>
                            <div className="text-white font-bold text-lg">
                              {entry.horseName}
                            </div>
                            <div className="text-gray-400 text-sm">
                              {entry.jockeyName}
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-white/10 text-white font-mono font-bold">
                          {entry.finishTime || '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

              </div>
    </div>
  );
}
