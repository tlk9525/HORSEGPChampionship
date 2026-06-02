import { Trophy, TrendingUp, ArrowUp, ArrowDown, Clock } from 'lucide-react';
import { currentTournament } from '../data/tournamentWorkflow';

export default function ResultsPage() {
  const recentResults = [
    {
      id: 1,
      race: 'Thunder Valley Sprint',
      date: 'May 15, 2026',
      winner: 'Midnight Storm',
      jockey: 'Marcus Sterling',
      time: '1:42.35',
      prize: '$125,000',
      podium: [
        { position: 1, horse: 'Midnight Storm', jockey: 'M. Sterling', time: '1:42.35' },
        { position: 2, horse: 'Silver Bullet', jockey: 'S. Chen', time: '1:42.89' },
        { position: 3, horse: 'Racing Thunder', jockey: 'D. Martinez', time: '1:43.12' },
      ],
    },
    {
      id: 2,
      race: 'Golden Gate Classic',
      date: 'May 12, 2026',
      winner: 'Silver Bullet',
      jockey: 'Sarah Chen',
      time: '2:01.78',
      prize: '$100,000',
      podium: [
        { position: 1, horse: 'Silver Bullet', jockey: 'S. Chen', time: '2:01.78' },
        { position: 2, horse: 'Golden Spirit', jockey: 'E. Johnson', time: '2:02.15' },
        { position: 3, horse: 'Thunder Bolt', jockey: 'J. O\'Connor', time: '2:02.48' },
      ],
    },
  ];

  const horseRankings = [
    { rank: 1, horse: 'Midnight Storm', wins: 18, races: 24, winRate: 75.0, points: 2850, change: 'up' },
    { rank: 2, horse: 'Silver Bullet', wins: 22, races: 30, winRate: 73.3, points: 2720, change: 'up' },
    { rank: 3, horse: 'Racing Thunder', wins: 15, races: 20, winRate: 75.0, points: 2580, change: 'same' },
    { rank: 4, horse: 'Golden Spirit', wins: 20, races: 28, winRate: 71.4, points: 2450, change: 'down' },
    { rank: 5, horse: 'Thunder Bolt', wins: 16, races: 22, winRate: 72.7, points: 2390, change: 'up' },
  ];

  const jockeyRankings = [
    { rank: 1, jockey: 'Marcus Sterling', wins: 45, races: 66, winRate: 68.2, earnings: '$4.2M', change: 'up' },
    { rank: 2, jockey: 'Sarah Chen', wins: 42, races: 64, winRate: 65.6, earnings: '$3.8M', change: 'same' },
    { rank: 3, jockey: 'Diego Martinez', wins: 38, races: 61, winRate: 62.3, earnings: '$3.5M', change: 'down' },
    { rank: 4, jockey: 'Emily Johnson', wins: 35, races: 59, winRate: 59.3, earnings: '$3.2M', change: 'up' },
    { rank: 5, jockey: 'James O\'Connor', wins: 33, races: 58, winRate: 56.9, earnings: '$3.0M', change: 'up' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Results Publishing</h1>
          <p className="text-gray-400">
            Referee confirms results, Admin publishes them, then rankings and prediction rewards are updated for {currentTournament.name}.
          </p>
        </div>

        {/* Recent Results */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Recent Race Results</h2>
          <div className="space-y-6">
            {recentResults.map((result) => (
              <div key={result.id} className="bg-[#1a1a1a] border border-white/10 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-1">{result.race}</h3>
                    <div className="flex items-center gap-3 text-gray-400 text-sm">
                      <span>{result.date}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {result.time}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#e10600] font-bold text-2xl">{result.prize}</div>
                    <div className="text-gray-400 text-sm">Prize Money</div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  {result.podium.map((pos) => (
                    <div
                      key={pos.position}
                      className={`rounded-lg p-4 ${
                        pos.position === 1
                          ? 'bg-gradient-to-br from-yellow-900/20 to-yellow-600/20 border-2 border-yellow-500'
                          : pos.position === 2
                          ? 'bg-gradient-to-br from-gray-800/20 to-gray-500/20 border-2 border-gray-400'
                          : 'bg-gradient-to-br from-orange-900/20 to-orange-600/20 border-2 border-orange-500'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-2xl ${
                            pos.position === 1
                              ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black'
                              : pos.position === 2
                              ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black'
                              : 'bg-gradient-to-br from-orange-400 to-orange-600 text-black'
                          }`}
                        >
                          {pos.position}
                        </div>
                        <div className="flex-1">
                          <div className="text-white font-bold text-lg">{pos.horse}</div>
                          <div className="text-gray-400 text-sm">{pos.jockey}</div>
                        </div>
                      </div>
                      <div className="text-center pt-3 border-t border-white/10">
                        <div className="text-white font-mono font-bold text-lg">{pos.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rankings */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Horse Rankings */}
          <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <Trophy className="w-6 h-6 text-[#e10600]" />
              <h2 className="text-2xl font-bold text-white">Horse Rankings</h2>
            </div>

            <div className="space-y-3">
              {horseRankings.map((entry) => (
                <div
                  key={entry.rank}
                  className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4 hover:border-[#e10600]/50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded flex items-center justify-center font-bold text-xl ${
                        entry.rank === 1
                          ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black'
                          : entry.rank === 2
                          ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black'
                          : entry.rank === 3
                          ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black'
                          : 'bg-[#2a2a2a] text-white'
                      }`}
                    >
                      {entry.rank}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-bold text-lg">{entry.horse}</span>
                        {entry.change === 'up' && <ArrowUp className="w-4 h-4 text-green-500" />}
                        {entry.change === 'down' && <ArrowDown className="w-4 h-4 text-red-500" />}
                      </div>
                      <div className="text-gray-400 text-sm">
                        {entry.wins}W / {entry.races}R • {entry.winRate.toFixed(1)}% win rate
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[#e10600] font-bold text-xl">{entry.points}</div>
                      <div className="text-gray-400 text-xs">Points</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full mt-6 py-3 bg-[#e10600]/10 text-[#e10600] rounded hover:bg-[#e10600] hover:text-white transition-all font-semibold border border-[#e10600]/30">
              View Full Rankings
            </button>
          </div>

          {/* Jockey Rankings */}
          <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-6 h-6 text-[#e10600]" />
              <h2 className="text-2xl font-bold text-white">Jockey Rankings</h2>
            </div>

            <div className="space-y-3">
              {jockeyRankings.map((entry) => (
                <div
                  key={entry.rank}
                  className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4 hover:border-[#e10600]/50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded flex items-center justify-center font-bold text-xl ${
                        entry.rank === 1
                          ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black'
                          : entry.rank === 2
                          ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black'
                          : entry.rank === 3
                          ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black'
                          : 'bg-[#2a2a2a] text-white'
                      }`}
                    >
                      {entry.rank}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-bold text-lg">{entry.jockey}</span>
                        {entry.change === 'up' && <ArrowUp className="w-4 h-4 text-green-500" />}
                        {entry.change === 'down' && <ArrowDown className="w-4 h-4 text-red-500" />}
                      </div>
                      <div className="text-gray-400 text-sm">
                        {entry.wins}W / {entry.races}R • {entry.winRate.toFixed(1)}% win rate
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[#e10600] font-bold text-lg">{entry.earnings}</div>
                      <div className="text-gray-400 text-xs">Earnings</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full mt-6 py-3 bg-[#e10600]/10 text-[#e10600] rounded hover:bg-[#e10600] hover:text-white transition-all font-semibold border border-[#e10600]/30">
              View Full Rankings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
