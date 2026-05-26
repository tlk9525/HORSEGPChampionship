import { Link } from 'react-router-dom';

import {
  Trophy,
  Users,
  Calendar,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Circle,
  Crown,
} from 'lucide-react';

export default function Dashboard() {
  const upcomingRaces = [
    { id: 1, name: 'Championship Grand Prix', date: 'May 20, 2026', time: '14:00', location: 'Churchill Downs', status: 'upcoming' },
    { id: 2, name: 'Elite Cup Qualifier', date: 'May 22, 2026', time: '16:30', location: 'Ascot Racecourse', status: 'upcoming' },
    { id: 3, name: 'Spring Derby Finals', date: 'May 25, 2026', time: '15:00', location: 'Epsom Downs', status: 'upcoming' },
    { id: 4, name: 'Metropolitan Stakes', date: 'May 27, 2026', time: '13:45', location: 'Belmont Park', status: 'live' },
  ];

  const topJockeys = [
    { rank: 1, name: 'Marcus Sterling', wins: 45, winRate: 68.5, change: 'up' },
    { rank: 2, name: 'Sarah Chen', wins: 42, winRate: 65.2, change: 'up' },
    { rank: 3, name: 'Diego Martinez', wins: 38, winRate: 62.8, change: 'down' },
    { rank: 4, name: 'Emily Johnson', wins: 35, winRate: 59.4, change: 'up' },
    { rank: 5, name: 'James O\'Connor', wins: 33, winRate: 57.1, change: 'same' },
  ];

  const recentResults = [
    { race: 'Thunder Valley Sprint', winner: 'Midnight Storm', jockey: 'Marcus Sterling', time: '1:42.35', prize: '$125,000' },
    { race: 'Golden Gate Classic', winner: 'Silver Bullet', jockey: 'Sarah Chen', time: '2:01.78', prize: '$100,000' },
    { race: 'Coastal Championship', winner: 'Racing Thunder', jockey: 'Diego Martinez', time: '1:55.42', prize: '$95,000' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Racing Command Center</h1>
          <p className="text-gray-400">Real-time tournament analytics and race management</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Horses */}
          <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-6 hover:border-[#e10600]/50 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#e10600]/10 rounded-lg flex items-center justify-center group-hover:bg-[#e10600]/20 transition-colors">
                <Trophy className="w-6 h-6 text-[#e10600]" />
              </div>
              <div className="flex items-center gap-1 text-green-500 text-sm">
                <ArrowUp className="w-4 h-4" />
                <span>12%</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">250</div>
            <div className="text-gray-400 text-sm uppercase tracking-wider">Total Horses</div>
            <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#e10600] w-3/4"></div>
            </div>
          </div>

          {/* Active Jockeys */}
          <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-6 hover:border-[#e10600]/50 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#e10600]/10 rounded-lg flex items-center justify-center group-hover:bg-[#e10600]/20 transition-colors">
                <Users className="w-6 h-6 text-[#e10600]" />
              </div>
              <div className="flex items-center gap-1 text-green-500 text-sm">
                <ArrowUp className="w-4 h-4" />
                <span>8%</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">180</div>
            <div className="text-gray-400 text-sm uppercase tracking-wider">Active Jockeys</div>
            <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#e10600] w-4/5"></div>
            </div>
          </div>

          {/* Upcoming Races */}
          <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-6 hover:border-[#e10600]/50 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#e10600]/10 rounded-lg flex items-center justify-center group-hover:bg-[#e10600]/20 transition-colors">
                <Calendar className="w-6 h-6 text-[#e10600]" />
              </div>
              <div className="flex items-center gap-1 text-yellow-500 text-sm">
                <Circle className="w-3 h-3 fill-yellow-500" />
                <span>4 Live</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">24</div>
            <div className="text-gray-400 text-sm uppercase tracking-wider">Upcoming Races</div>
            <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#e10600] w-1/2"></div>
            </div>
          </div>

          {/* Total Prize Pool */}
          <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-6 hover:border-[#e10600]/50 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#e10600]/10 rounded-lg flex items-center justify-center group-hover:bg-[#e10600]/20 transition-colors">
                <TrendingUp className="w-6 h-6 text-[#e10600]" />
              </div>
              <div className="flex items-center gap-1 text-green-500 text-sm">
                <ArrowUp className="w-4 h-4" />
                <span>25%</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">$2.5M</div>
            <div className="text-gray-400 text-sm uppercase tracking-wider">Total Prize Pool</div>
            <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#e10600] w-full"></div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Upcoming Races */}
            <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Upcoming Races</h2>
                <Link
                  to="/tournaments"
                  className="text-[#e10600] hover:text-[#c00500] text-sm font-semibold"
                >
                  View All
                </Link>              </div>
              <div className="space-y-4">
                {upcomingRaces.map((race) => (
                  <div
                    key={race.id}
                    className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4 hover:border-[#e10600]/50 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {race.status === 'live' ? (
                          <div className="flex items-center gap-2 px-3 py-1 bg-[#e10600]/20 border border-[#e10600] rounded">
                            <Circle className="w-2 h-2 fill-[#e10600] text-[#e10600] animate-pulse" />
                            <span className="text-[#e10600] text-xs font-bold uppercase">Live</span>
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-[#e10600]/10 rounded flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-[#e10600]" />
                          </div>
                        )}
                        <div>
                          <h3 className="text-white font-semibold group-hover:text-[#e10600] transition-colors">
                            {race.name}
                          </h3>
                          <p className="text-gray-400 text-sm">{race.location}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">{race.date}</div>
                        <div className="text-gray-400 text-sm">{race.time}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Results */}
            <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Recent Results</h2>
                <Link
                  to="/results"
                  className="text-[#e10600] hover:text-[#c00500] text-sm font-semibold"
                >
                  View All
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-gray-400 text-sm font-semibold py-3 px-4">Race</th>
                      <th className="text-left text-gray-400 text-sm font-semibold py-3 px-4">Winner</th>
                      <th className="text-left text-gray-400 text-sm font-semibold py-3 px-4">Jockey</th>
                      <th className="text-left text-gray-400 text-sm font-semibold py-3 px-4">Time</th>
                      <th className="text-right text-gray-400 text-sm font-semibold py-3 px-4">Prize</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentResults.map((result, index) => (
                      <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4 text-white">{result.race}</td>
                        <td className="py-4 px-4 text-white font-semibold">{result.winner}</td>
                        <td className="py-4 px-4 text-gray-400">{result.jockey}</td>
                        <td className="py-4 px-4 text-gray-400">{result.time}</td>
                        <td className="py-4 px-4 text-[#e10600] font-semibold text-right">{result.prize}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Top Jockeys Leaderboard */}
            <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Top Jockeys</h2>
                <Crown className="w-6 h-6 text-[#e10600]" />
              </div>
              <div className="space-y-4">
                {topJockeys.map((jockey) => (
                  <div
                    key={jockey.rank}
                    className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4 hover:border-[#e10600]/50 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded flex items-center justify-center font-bold ${jockey.rank === 1
                          ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black'
                          : jockey.rank === 2
                            ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black'
                            : jockey.rank === 3
                              ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black'
                              : 'bg-[#2a2a2a] text-white'
                          }`}
                      >
                        {jockey.rank}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-white font-semibold">{jockey.name}</h3>
                          {jockey.change === 'up' && <ArrowUp className="w-4 h-4 text-green-500" />}
                          {jockey.change === 'down' && <ArrowDown className="w-4 h-4 text-red-500" />}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">{jockey.wins} Wins</span>
                          <span className="text-[#e10600] font-semibold">{jockey.winRate}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Chart Placeholder */}
            <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Performance Overview</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Win Rate</span>
                    <span className="text-white font-semibold">68.5%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#e10600] to-[#ff4500] w-[68.5%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Podium Finish</span>
                    <span className="text-white font-semibold">82.3%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#e10600] to-[#ff4500] w-[82.3%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Track Record</span>
                    <span className="text-white font-semibold">91.7%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#e10600] to-[#ff4500] w-[91.7%]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
