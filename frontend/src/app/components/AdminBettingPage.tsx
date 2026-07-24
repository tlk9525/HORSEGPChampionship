import { useEffect, useState } from 'react';
import { ArrowLeft, Coins, RefreshCw } from 'lucide-react';
import {
  AdminBettingRaceSummary,
  AdminBettingSpectator,
  getAdminBetting,
  updateRaceBetLimit,
} from '../services/api';
import { statusLabel } from '../utils/domain';
import { messageToneClasses } from '../utils/messageTone';

interface AdminBettingPageProps {
  onNavigate: (page: string) => void;
}

// Ghi chú: Chọn màu badge tương ứng với trạng thái hiện tại của race.
const raceStatusBadgeClass = (status: string) => {
  const classes: Record<string, string> = {
    'registration-open': 'bg-emerald-500/20 text-emerald-300',
    'registration-closed': 'bg-amber-500/20 text-amber-300',
    published: 'bg-sky-500/20 text-sky-300',
    'in-progress': 'bg-violet-500/20 text-violet-300',
    finished: 'bg-orange-500/20 text-orange-300',
    completed: 'bg-emerald-500/20 text-emerald-300',
    cancelled: 'bg-red-500/20 text-red-300',
  };
  return classes[status] || 'bg-white/10 text-gray-300';
};

// Ghi chú: Render trang tổng quan pool cược, giới hạn cược và bảng xếp hạng spectator cho Admin.
export default function AdminBettingPage({ onNavigate }: AdminBettingPageProps) {
  const [bettingRaces, setBettingRaces] = useState<AdminBettingRaceSummary[]>([]);
  const [bettingSpectators, setBettingSpectators] = useState<AdminBettingSpectator[]>([]);
  const [betLimitDrafts, setBetLimitDrafts] = useState<Record<string, string>>({});
  const [savingBetLimitRaceId, setSavingBetLimitRaceId] = useState('');
  const [bettingMessage, setBettingMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Ghi chú: Tải lại thống kê betting và đồng bộ giá trị bet limit vào form chỉnh sửa.
  const loadBetting = () => {
    setLoading(true);
    getAdminBetting()
      .then((data) => {
        const summaries = data.raceSummaries || [];
        setBettingRaces(summaries);
        setBettingSpectators(data.spectators || []);
        setBetLimitDrafts(
          Object.fromEntries(
            summaries.map((race) => [
              race.raceId,
              race.betLimit == null ? '' : String(race.betLimit),
            ])
          )
        );
      })
      .catch((error) =>
        setBettingMessage(
          error instanceof Error ? error.message : 'Unable to load betting overview'
        )
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBetting();
  }, []);

  const totalPoolCredits = bettingRaces.reduce((sum, race) => sum + race.poolTotal, 0);

  // Ghi chú: Kiểm tra và lưu giới hạn tiền cược của một race từ trang Admin.
  const handleSaveBetLimit = (raceId: string) => {
    const raw = betLimitDrafts[raceId] ?? '';
    const betLimit = raw.trim() === '' ? null : Number(raw);
    if (betLimit !== null && (!Number.isInteger(betLimit) || betLimit <= 0)) {
      setBettingMessage('Bet limit must be a positive whole number, or empty for unlimited.');
      return;
    }

    setSavingBetLimitRaceId(raceId);
    setBettingMessage('');
    updateRaceBetLimit(raceId, betLimit)
      .then(({ race }) => {
        setBettingRaces((current) =>
          current.map((item) =>
            item.raceId === raceId
              ? { ...item, betLimit: race.betLimit ?? null }
              : item
          )
        );
        setBetLimitDrafts((current) => ({
          ...current,
          [raceId]: race.betLimit == null ? '' : String(race.betLimit),
        }));
        setBettingMessage(
          race.betLimit == null
            ? `${race.name}: bet limit cleared (unlimited).`
            : `${race.name}: bet limit set to ${race.betLimit} credits.`
        );
      })
      .catch((error) =>
        setBettingMessage(
          error instanceof Error ? error.message : 'Unable to update bet limit'
        )
      )
      .finally(() => setSavingBetLimitRaceId(''));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071a2f] via-[#0b223d] to-[#071a2f] pt-28 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Admin
            </button>
            <h1 className="text-4xl font-black text-white flex items-center gap-3">
              <Coins className="w-9 h-9 text-[#d4af37]" />
              Betting Overview
            </h1>
            <p className="text-gray-400 mt-2">
              View race pools and edit bet limits for each race.
            </p>
          </div>
          <button
            type="button"
            onClick={loadBetting}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {bettingMessage && (
          <div className={`mb-6 rounded-xl border px-4 py-3 font-semibold ${messageToneClasses(bettingMessage)}`}>
            {bettingMessage}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: 'Total Wagered',
              value: bettingRaces.reduce((s, r) => s + r.totalWagered, 0).toFixed(0),
              color: 'text-[#d4af37]',
            },
            {
              label: 'Active Pool',
              value: totalPoolCredits.toFixed(0),
              color: 'text-yellow-400',
            },
            {
              label: 'Total Paid Out',
              value: bettingRaces.reduce((s, r) => s + r.totalPaidOut, 0).toFixed(0),
              color: 'text-emerald-400',
            },
            {
              label: 'Total Refunded',
              value: bettingRaces.reduce((s, r) => s + r.totalRefunded, 0).toFixed(0),
              color: 'text-sky-400',
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#12304f] border border-white/10 rounded-2xl p-4 text-center">
              <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-gray-400 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-[#12304f] border border-white/10 rounded-3xl p-8 mb-8">
          <h2 className="text-xl font-bold text-white mb-2">Race Pools & Bet Limits</h2>
          <p className="text-sm text-gray-400 mb-4">
            Set a max stake per bet for each race. Leave blank for unlimited. Limits can be
            edited until the race is completed or cancelled.
          </p>
          {loading && bettingRaces.length === 0 ? (
            <p className="text-gray-400">Loading betting data…</p>
          ) : bettingRaces.length === 0 ? (
            <p className="text-gray-400">No races available for betting configuration yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-white/10">
                    <th className="pb-3 pr-4">Race</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Bet Limit</th>
                    <th className="pb-3 pr-4 text-right">Pool</th>
                    <th className="pb-3 pr-4 text-right">Bettors</th>
                    <th className="pb-3 pr-4 text-right">Pending</th>
                    <th className="pb-3 pr-4 text-right">Won</th>
                    <th className="pb-3 pr-4 text-right">Lost</th>
                    <th className="pb-3 pr-4 text-right">Refunded</th>
                    <th className="pb-3 text-right">Paid Out</th>
                  </tr>
                </thead>
                <tbody className="text-white">
                  {bettingRaces.map((race) => {
                    const canEditLimit = !['completed', 'cancelled'].includes(race.raceStatus);
                    const isSaving = savingBetLimitRaceId === race.raceId;
                    return (
                      <tr key={race.raceId} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 pr-4 font-semibold">{race.raceName}</td>
                        <td className="py-3 pr-4">
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold ${raceStatusBadgeClass(race.raceStatus)}`}>
                            {statusLabel(race.raceStatus)}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2 min-w-[180px]">
                            <input
                              type="number"
                              min={1}
                              step={1}
                              disabled={!canEditLimit || isSaving}
                              value={betLimitDrafts[race.raceId] ?? ''}
                              onChange={(event) =>
                                setBetLimitDrafts((current) => ({
                                  ...current,
                                  [race.raceId]: event.target.value,
                                }))
                              }
                              placeholder="Unlimited"
                              className="w-24 rounded-lg border border-white/10 bg-[#0b223d] px-2 py-1.5 text-white outline-none focus:border-[#d4af37] disabled:opacity-50"
                            />
                            <button
                              type="button"
                              disabled={!canEditLimit || isSaving}
                              onClick={() => handleSaveBetLimit(race.raceId)}
                              className="rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/40 px-3 py-1.5 text-xs font-bold text-[#d4af37] hover:bg-[#d4af37] hover:text-white transition-all disabled:opacity-50"
                            >
                              {isSaving ? '...' : 'Save'}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-right text-[#d4af37] font-bold">
                          {race.poolTotal.toFixed(0)}
                        </td>
                        <td className="py-3 pr-4 text-right">{race.uniqueBettors}</td>
                        <td className="py-3 pr-4 text-right text-yellow-400">{race.counts.pending}</td>
                        <td className="py-3 pr-4 text-right text-emerald-400">{race.counts.won}</td>
                        <td className="py-3 pr-4 text-right text-red-400">{race.counts.lost}</td>
                        <td className="py-3 pr-4 text-right text-sky-400">{race.counts.refunded}</td>
                        <td className="py-3 text-right text-emerald-400 font-semibold">
                          {race.totalPaidOut.toFixed(0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-[#12304f] border border-white/10 rounded-3xl p-8">
          <h2 className="text-xl font-bold text-white mb-4">Spectator Leaderboard</h2>
          {bettingSpectators.length === 0 ? (
            <p className="text-gray-400">No spectators registered.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-white/10">
                    <th className="pb-3 pr-4">#</th>
                    <th className="pb-3 pr-4">Spectator</th>
                    <th className="pb-3 pr-4 text-right">Credits</th>
                    <th className="pb-3 pr-4 text-right">Login Streak</th>
                    <th className="pb-3 pr-4">Last Reward</th>
                    <th className="pb-3 pr-4 text-right">Total Bets</th>
                    <th className="pb-3 pr-4 text-right">Total Wagered</th>
                    <th className="pb-3 text-right">Total Won</th>
                  </tr>
                </thead>
                <tbody className="text-white">
                  {bettingSpectators.map((spectator, idx) => (
                    <tr key={spectator.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 pr-4 text-gray-500">{idx + 1}</td>
                      <td className="py-3 pr-4 font-semibold">{spectator.name}</td>
                      <td className="py-3 pr-4 text-right text-[#d4af37] font-bold">
                        {spectator.credits.toFixed(0)}
                      </td>
                      <td className="py-3 pr-4 text-right">Day {spectator.loginStreak}</td>
                      <td className="py-3 pr-4 text-gray-300">
                        {spectator.lastLoginRewardDate || '-'}
                      </td>
                      <td className="py-3 pr-4 text-right">{spectator.totalBets}</td>
                      <td className="py-3 pr-4 text-right">{spectator.totalWagered.toFixed(0)}</td>
                      <td className="py-3 text-right text-emerald-400 font-semibold">
                        {spectator.totalWon.toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
