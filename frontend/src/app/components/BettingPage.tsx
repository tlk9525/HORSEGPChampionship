import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  Coins,
  Flag,
  Gauge,
  MapPin,
  Trophy,
  Users,
} from 'lucide-react';
import {
  AuthUser,
  BetRecord,
  RaceEntryRecord,
  RaceRecord,
  TournamentRecord,
  getBootstrap,
  getRacePots,
  getSpectatorWallet,
  placeBet,
  RacePot,
} from '../services/api';
import { formatWeightLb, statusLabel } from '../utils/domain';
import { messageToneClasses } from '../utils/messageTone';

interface BettingPageProps {
  currentUser: AuthUser | null;
  onNavigate: (page: string) => void;
  onUserUpdate?: (user: AuthUser) => void;
}

const BETTING_CLOSE_MS = 60 * 1000;

const raceStartMs = (race: RaceRecord) => {
  const date = race.date || race.raceDate || '';
  const time = race.time || race.raceTime || '';
  return new Date(`${date}T${time}`).getTime();
};

const isBettingOpen = (race: RaceRecord) => {
  if (race.status !== 'published') return false;
  const startMs = raceStartMs(race);
  if (!Number.isFinite(startMs)) return false;
  return Date.now() < startMs - BETTING_CLOSE_MS;
};

const formatCountdown = (race: RaceRecord) => {
  const startMs = raceStartMs(race);
  if (!Number.isFinite(startMs)) return 'Start time unavailable';

  const closeMs = startMs - BETTING_CLOSE_MS;
  const remaining = closeMs - Date.now();

  if (remaining <= 0) return 'Betting closed';

  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m until betting closes`;
  }

  return `${minutes}m ${seconds}s until betting closes`;
};

export default function BettingPage({
  currentUser,
  onNavigate,
  onUserUpdate,
}: BettingPageProps) {
  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [races, setRaces] = useState<RaceRecord[]>([]);
  const [raceEntries, setRaceEntries] = useState<RaceEntryRecord[]>([]);
  const [credits, setCredits] = useState(currentUser?.credits ?? 0);
  const [bets, setBets] = useState<BetRecord[]>([]);
  const [potsByRaceId, setPotsByRaceId] = useState<Record<string, number>>({});
  const [betAmounts, setBetAmounts] = useState<Record<string, string>>({});
  const [submittingEntryId, setSubmittingEntryId] = useState('');
  const [message, setMessage] = useState('');
  const [now, setNow] = useState(Date.now());

  const loadData = () => {
    Promise.all([getBootstrap(), getSpectatorWallet(), getRacePots()])
      .then(([bootstrap, wallet, { pots }]) => {
        setTournaments(bootstrap.tournaments);
        setRaces(bootstrap.races);
        setRaceEntries(bootstrap.raceEntries || []);
        setCredits(wallet.credits);
        setBets(wallet.bets);
        setPotsByRaceId(
          Object.fromEntries(pots.map((pot: RacePot) => [pot.raceId, pot.total]))
        );
        if (currentUser && onUserUpdate) {
          onUserUpdate({ ...currentUser, credits: wallet.credits });
        }
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to load betting data')
      );
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const betsByEntryId = useMemo(() => {
    const map = new Map<string, BetRecord>();
    bets.forEach((bet) => map.set(bet.raceEntryId, bet));
    return map;
  }, [bets]);

  const bettableRaces = useMemo(
    () =>
      races
        .filter((race) => race.status === 'published' || bets.some((bet) => bet.raceId === race.id))
        .sort((a, b) => {
          const startA = raceStartMs(a);
          const startB = raceStartMs(b);
          return (Number.isFinite(startA) ? startA : Infinity) -
            (Number.isFinite(startB) ? startB : Infinity);
        }),
    [bets, races, now]
  );

  const tournamentNameById = useMemo(() => {
    const map = new Map<string, string>();
    tournaments.forEach((tournament) => map.set(tournament.id, tournament.name));
    return map;
  }, [tournaments]);

  const handlePlaceBet = (entry: RaceEntryRecord, race: RaceRecord) => {
    const amount = Number(betAmounts[entry.id] || 0);
    if (!Number.isInteger(amount) || amount <= 0) {
      setMessage('Enter a whole number of credits to bet.');
      return;
    }

    if (amount > credits) {
      setMessage('You do not have enough credits for this bet.');
      return;
    }

    setSubmittingEntryId(entry.id);
    setMessage('');

    placeBet(entry.id, amount)
      .then(({ bet, credits: nextCredits }) => {
        setCredits(nextCredits);
        setBets((current) => [...current.filter((item) => item.id !== bet.id), bet]);
        setBetAmounts((current) => ({ ...current, [entry.id]: '' }));
        setPotsByRaceId((current) => ({
          ...current,
          [race.id]: (current[race.id] || 0) + amount,
        }));
        setMessage(`Bet placed: ${amount} credits on ${entry.horseName || 'horse'}.`);
        if (currentUser && onUserUpdate) {
          onUserUpdate({ ...currentUser, credits: nextCredits });
        }
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to place bet')
      )
      .finally(() => setSubmittingEntryId(''));
  };

  return (
    <div className="min-h-screen bg-[#071a2f] pt-24 pb-12">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Betting</h1>
            <p className="text-gray-400 text-lg max-w-3xl">
              All bets go into a shared pot. After official results are published, everyone who bet on the 1st-place horse splits the pot in proportion to their wager.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-[#d4af37]/30 bg-[#12304f] px-5 py-4">
            <Coins className="h-6 w-6 text-[#d4af37]" />
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400">Available Credits</p>
              <p className="text-2xl font-black text-white">{credits}</p>
            </div>
          </div>
        </div>

        {message && (
          <div className={`mb-8 rounded-2xl border p-4 font-semibold ${messageToneClasses(message)}`}>
            {message}
          </div>
        )}

        {bettableRaces.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#12304f] p-10 text-center">
            <Trophy className="mx-auto mb-4 h-12 w-12 text-[#d4af37]" />
            <h2 className="text-2xl font-bold text-white">No races open for betting</h2>
            <p className="mt-2 text-gray-400">
              Published races with an official start list will appear here.
            </p>
            <button
              onClick={() => onNavigate('tournaments')}
              className="mt-6 rounded-lg bg-[#d4af37] px-6 py-3 font-semibold text-white hover:bg-[#b8892d] transition-all"
            >
              Browse Tournaments
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {bettableRaces.map((race) => {
              const entries = raceEntries
                .filter((entry) => entry.raceId === race.id)
                .sort((a, b) => (a.lane || 999) - (b.lane || 999));
              const open = isBettingOpen(race);
              const tournamentName = tournamentNameById.get(race.tournamentId || '') || 'Tournament';
              const potTotal = potsByRaceId[race.id] || 0;

              return (
                <article
                  key={race.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-[#12304f]"
                >
                  <div className="border-b border-white/10 p-6 lg:p-8">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-[#d4af37]">
                          {tournamentName}
                        </p>
                        <h2 className="mt-2 text-3xl font-bold text-white">{race.name}</h2>
                        <p className="mt-2 text-sm text-gray-400">
                          Race {race.raceNumber || '-'} · {statusLabel(race.status)}
                        </p>
                      </div>

                      <div
                        className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                          open
                            ? 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                            : 'border border-red-400/30 bg-red-500/10 text-red-300'
                        }`}
                      >
                        {open ? formatCountdown(race) : 'Betting closed'}
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="flex items-start gap-3 rounded-xl bg-[#071a2f]/60 p-4">
                        <Calendar className="mt-1 h-5 w-5 text-[#d4af37]" />
                        <div>
                          <p className="text-xs uppercase text-gray-500">Date</p>
                          <p className="mt-1 font-semibold text-white">{race.date || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 rounded-xl bg-[#071a2f]/60 p-4">
                        <Clock className="mt-1 h-5 w-5 text-[#d4af37]" />
                        <div>
                          <p className="text-xs uppercase text-gray-500">Start Time</p>
                          <p className="mt-1 font-semibold text-white">{race.time || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 rounded-xl bg-[#071a2f]/60 p-4">
                        <MapPin className="mt-1 h-5 w-5 text-[#d4af37]" />
                        <div>
                          <p className="text-xs uppercase text-gray-500">Venue</p>
                          <p className="mt-1 font-semibold text-white">{race.venue || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 rounded-xl bg-[#071a2f]/60 p-4">
                        <Flag className="mt-1 h-5 w-5 text-[#d4af37]" />
                        <div>
                          <p className="text-xs uppercase text-gray-500">Distance</p>
                          <p className="mt-1 font-semibold text-white">{race.distance || '-'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-4">
                      <div className="flex items-center gap-3 text-sm text-gray-300">
                        <Users className="h-4 w-4 text-[#d4af37]" />
                        {entries.length} horses entered
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-300">
                        <Gauge className="h-4 w-4 text-[#d4af37]" />
                        Class {race.raceClass || '-'}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-300">
                        <Trophy className="h-4 w-4 text-[#d4af37]" />
                        Prize {race.totalPrize ? `$${race.totalPrize}` : '-'}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-[#f6d77a]">
                        <Coins className="h-4 w-4 text-[#d4af37]" />
                        Pot {potTotal} credits
                      </div>
                    </div>
                  </div>

                  <div className="p-6 lg:p-8">
                    <h3 className="mb-4 text-lg font-bold text-white">Place Your Bets</h3>

                    {entries.length === 0 ? (
                      <p className="text-gray-400">No published entries for this race yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {entries.map((entry) => {
                          const existingBet = betsByEntryId.get(entry.id);
                          const isSubmitting = submittingEntryId === entry.id;

                          return (
                            <div
                              key={entry.id}
                              className="rounded-xl border border-white/10 bg-[#071a2f]/70 p-4 lg:p-5"
                            >
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                  <div>
                                    <p className="text-xs uppercase text-gray-500">Lane</p>
                                    <p className="mt-1 font-semibold text-white">
                                      {entry.lane ?? '-'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs uppercase text-gray-500">Horse</p>
                                    <p className="mt-1 font-semibold text-white">
                                      {entry.horseName || '-'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs uppercase text-gray-500">Jockey</p>
                                    <p className="mt-1 font-semibold text-white">
                                      {entry.jockeyName || '-'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs uppercase text-gray-500">Rating / Weight</p>
                                    <p className="mt-1 font-semibold text-white">
                                      {entry.ratingSnapshot ?? '-'} · {formatWeightLb(entry.horseWeightLb)}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[260px]">
                                  {existingBet ? (
                                    <div className="rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-3 text-sm text-[#f6d77a]">
                                      {existingBet.status === 'pending' && (
                                        <>Bet placed: {existingBet.amount} credits</>
                                      )}
                                      {existingBet.status === 'won' && (
                                        <>Won {existingBet.payout ?? 0} credits from the pot</>
                                      )}
                                      {existingBet.status === 'lost' && (
                                        <>Lost {existingBet.amount} credits</>
                                      )}
                                    </div>
                                  ) : open ? (
                                    <>
                                      <label className="text-xs uppercase text-gray-500">
                                        Credits to bet
                                      </label>
                                      <div className="flex gap-2">
                                        <input
                                          type="number"
                                          min={1}
                                          max={credits}
                                          step={1}
                                          value={betAmounts[entry.id] || ''}
                                          onChange={(event) =>
                                            setBetAmounts((current) => ({
                                              ...current,
                                              [entry.id]: event.target.value,
                                            }))
                                          }
                                          placeholder="Amount"
                                          className="w-full rounded-lg border border-white/10 bg-[#0b223d] px-4 py-2 text-white outline-none focus:border-[#d4af37]"
                                        />
                                        <button
                                          onClick={() => handlePlaceBet(entry, race)}
                                          disabled={isSubmitting}
                                          className="rounded-lg bg-[#d4af37] px-4 py-2 font-semibold text-white hover:bg-[#b8892d] disabled:opacity-60 transition-all"
                                        >
                                          {isSubmitting ? '...' : 'Bet'}
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="rounded-lg border border-white/10 px-4 py-3 text-sm text-gray-400">
                                      Betting closed for this race
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {bets.length > 0 && (
          <section className="mt-12 rounded-2xl border border-white/10 bg-[#12304f] p-6 lg:p-8">
            <h2 className="mb-6 text-2xl font-bold text-white">Your Bets</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-white/10 text-gray-400">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Race</th>
                    <th className="px-3 py-3 font-semibold">Horse</th>
                    <th className="px-3 py-3 font-semibold">Jockey</th>
                    <th className="px-3 py-3 font-semibold">Amount</th>
                    <th className="px-3 py-3 font-semibold">Payout</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Placed</th>
                  </tr>
                </thead>
                <tbody>
                  {bets.map((bet) => (
                    <tr key={bet.id} className="border-b border-white/5 text-gray-200">
                      <td className="px-3 py-4">{bet.raceName || bet.raceId}</td>
                      <td className="px-3 py-4">{bet.horseName || '-'}</td>
                      <td className="px-3 py-4">{bet.jockeyName || '-'}</td>
                      <td className="px-3 py-4 font-semibold text-[#d4af37]">{bet.amount}</td>
                      <td className="px-3 py-4 font-semibold text-emerald-300">
                        {bet.status === 'won' ? bet.payout ?? 0 : '-'}
                      </td>
                      <td className="px-3 py-4">{statusLabel(bet.status)}</td>
                      <td className="px-3 py-4">
                        {new Date(bet.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
