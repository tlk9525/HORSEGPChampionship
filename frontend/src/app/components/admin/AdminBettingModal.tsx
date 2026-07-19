import { Coins } from 'lucide-react';
import {
  AdminBettingRaceSummary,
  AdminBettingSpectator,
} from '../../services/api';
import { statusLabel } from '../../utils/domain';
import { raceStatusBadgeClass } from '../../utils/raceDisplay';

interface AdminBettingModalProps {
  races: AdminBettingRaceSummary[];
  spectators: AdminBettingSpectator[];
  activePoolCredits: number;
  onClose: () => void;
}

// Ghi chú: Hiển thị thống kê pool cược và spectator leaderboard cho Admin.
export default function AdminBettingModal({
  races,
  spectators,
  activePoolCredits,
  onClose,
}: AdminBettingModalProps) {
  const summary = [
    {
      label: 'Total Wagered',
      value: races.reduce((sum, race) => sum + race.totalWagered, 0).toFixed(0),
      color: 'text-[#d4af37]',
    },
    { label: 'Active Pool', value: activePoolCredits.toFixed(0), color: 'text-yellow-400' },
    {
      label: 'Total Paid Out',
      value: races.reduce((sum, race) => sum + race.totalPaidOut, 0).toFixed(0),
      color: 'text-emerald-400',
    },
    {
      label: 'Total Refunded',
      value: races.reduce((sum, race) => sum + race.totalRefunded, 0).toFixed(0),
      color: 'text-sky-400',
    },
  ];

  return (
    <div className="fixed inset-0 bg-[#071a2f]/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#12304f] p-8 rounded-3xl w-full max-w-5xl border border-white/10 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-black text-white flex items-center gap-3">
            <Coins className="w-8 h-8 text-[#d4af37]" />
            Betting Overview
          </h2>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {summary.map((stat) => (
            <div key={stat.label} className="bg-[#071a2f] border border-white/10 rounded-2xl p-4 text-center">
              <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-gray-400 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-bold text-white mb-4">Race Pools</h3>
          {races.length === 0 ? (
            <p className="text-gray-400">No bets placed yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-white/10">
                    <th className="pb-3 pr-4">Race</th>
                    <th className="pb-3 pr-4">Status</th>
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
                  {races.map((race) => (
                    <tr key={race.raceId} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 pr-4 font-semibold">{race.raceName}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${raceStatusBadgeClass(race.raceStatus)}`}>
                          {statusLabel(race.raceStatus)}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right text-[#d4af37] font-bold">{race.poolTotal.toFixed(0)}</td>
                      <td className="py-3 pr-4 text-right">{race.uniqueBettors}</td>
                      <td className="py-3 pr-4 text-right text-yellow-400">{race.counts.pending}</td>
                      <td className="py-3 pr-4 text-right text-emerald-400">{race.counts.won}</td>
                      <td className="py-3 pr-4 text-right text-red-400">{race.counts.lost}</td>
                      <td className="py-3 pr-4 text-right text-sky-400">{race.counts.refunded}</td>
                      <td className="py-3 text-right text-emerald-400 font-semibold">{race.totalPaidOut.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-xl font-bold text-white mb-4">Spectator Leaderboard</h3>
          {spectators.length === 0 ? (
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
                  {spectators.map((spectator, index) => (
                    <tr key={spectator.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 pr-4 text-gray-500">{index + 1}</td>
                      <td className="py-3 pr-4 font-semibold">{spectator.name}</td>
                      <td className="py-3 pr-4 text-right text-[#d4af37] font-bold">{spectator.credits.toFixed(0)}</td>
                      <td className="py-3 pr-4 text-right">Day {spectator.loginStreak}</td>
                      <td className="py-3 pr-4 text-gray-300">{spectator.lastLoginRewardDate || '-'}</td>
                      <td className="py-3 pr-4 text-right">{spectator.totalBets}</td>
                      <td className="py-3 pr-4 text-right">{spectator.totalWagered.toFixed(0)}</td>
                      <td className="py-3 text-right text-emerald-400 font-semibold">{spectator.totalWon.toFixed(0)}</td>
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
