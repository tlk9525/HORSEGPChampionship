import {
  Trophy,
  Activity,
  DollarSign,
  Calendar,
  User,
  Flag,
  Crown,
} from 'lucide-react';
import {
  currentTournament,
  tournamentHorses,
  statusLabel,
} from '../data/tournamentWorkflow';

export default function HorseDetails() {
  const entry = tournamentHorses[0];

  const raceHistory = [
    {
      race: 'Spring Derby Finals',
      position: '1st',
      time: '1:42.35',
      date: 'May 12, 2026',
    },
    {
      race: 'Golden Cup Championship',
      position: '2nd',
      time: '1:44.02',
      date: 'April 28, 2026',
    },
    {
      race: 'Elite Racing League',
      position: '1st',
      time: '1:41.89',
      date: 'April 15, 2026',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* HERO */}
        <div className="bg-[#111111] border border-white/10 rounded-2xl overflow-hidden mb-10">

          <div className="relative h-[400px]">

            <img
              src="https://images.unsplash.com/photo-1507514604110-ba3347c457f6?w=1600"
              alt="Horse"
              className="w-full h-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/40 to-transparent" />

            <div className="absolute bottom-8 left-8">

              <div className="flex items-center gap-3 mb-4">

                <div className="px-4 py-2 bg-[#e10600] rounded-lg text-white font-bold text-sm">
                  {statusLabel(entry.profileStatus)}
                </div>

                <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500 rounded-lg">
                  <Crown className="w-4 h-4 text-yellow-400" />

                  <span className="text-yellow-400 font-semibold">
                    Rank #1
                  </span>
                </div>

              </div>

              <h1 className="text-5xl font-bold text-white mb-2">
                Midnight Storm
              </h1>

              <p className="text-gray-300 text-lg">
                Thoroughbred • United States 🇺🇸
              </p>

              <p className="text-gray-300 mt-2">
                Tournament entry: {currentTournament.name} • Jockey: {entry.selectedJockey} • Race confirmation: {statusLabel(entry.raceConfirmation)}
              </p>

            </div>
          </div>

          {/* STATS */}
          <div className="grid md:grid-cols-4 gap-6 p-8">

            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">

              <div className="flex items-center gap-3 mb-3">
                <Trophy className="w-6 h-6 text-[#e10600]" />

                <span className="text-gray-400 text-sm">
                  Total Wins
                </span>
              </div>

              <h2 className="text-3xl font-bold text-white">
                18
              </h2>

            </div>

            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">

              <div className="flex items-center gap-3 mb-3">
                <Activity className="w-6 h-6 text-[#e10600]" />

                <span className="text-gray-400 text-sm">
                  Win Rate
                </span>
              </div>

              <h2 className="text-3xl font-bold text-white">
                75%
              </h2>

            </div>

            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">

              <div className="flex items-center gap-3 mb-3">
                <DollarSign className="w-6 h-6 text-[#e10600]" />

                <span className="text-gray-400 text-sm">
                  Earnings
                </span>
              </div>

              <h2 className="text-3xl font-bold text-white">
                $1.2M
              </h2>

            </div>

            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">

              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-6 h-6 text-[#e10600]" />

                <span className="text-gray-400 text-sm">
                  Age
                </span>
              </div>

              <h2 className="text-3xl font-bold text-white">
                5 Years
              </h2>

            </div>

          </div>
        </div>

        {/* CONTENT */}
        <div className="grid lg:grid-cols-3 gap-8">

          {/* LEFT */}
          <div className="lg:col-span-2 space-y-8">

            {/* OVERVIEW */}
            <div className="bg-[#111111] border border-white/10 rounded-2xl p-8">

              <h2 className="text-3xl font-bold text-white mb-6">
                Horse Overview
              </h2>

              <p className="text-gray-400 leading-8 text-lg">
                This profile is part of the active tournament. After Admin approval, the Owner selects a Jockey, the Jockey confirms the pairing, then both parties confirm the scheduled race before spectator predictions can open.
              </p>

            </div>

            {/* RACE HISTORY */}
            <div className="bg-[#111111] border border-white/10 rounded-2xl p-8">

              <h2 className="text-3xl font-bold text-white mb-8">
                Recent Race History
              </h2>

              <div className="space-y-5">

                {raceHistory.map((race, index) => (
                  <div
                    key={index}
                    className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5 hover:border-[#e10600]/50 transition-all"
                  >

                    <div className="flex items-center justify-between">

                      <div>

                        <h3 className="text-white text-xl font-bold mb-2">
                          {race.race}
                        </h3>

                        <p className="text-gray-400">
                          Race Date: {race.date}
                        </p>

                      </div>

                      <div className="text-right">

                        <div className="text-[#e10600] text-2xl font-bold">
                          {race.position}
                        </div>

                        <div className="text-gray-400 mt-1">
                          {race.time}
                        </div>

                      </div>

                    </div>

                  </div>
                ))}

              </div>
            </div>

          </div>

          {/* RIGHT */}
          <div className="space-y-8">

            {/* PROFILE */}
            <div className="bg-[#111111] border border-white/10 rounded-2xl p-8">

              <h2 className="text-2xl font-bold text-white mb-6">
                Horse Profile
              </h2>

              <div className="space-y-6">

                <div className="flex items-center gap-4">

                  <User className="w-6 h-6 text-[#e10600]" />

                  <div>
                    <p className="text-gray-400 text-sm">
                      Trainer
                    </p>

                    <h3 className="text-white font-bold text-lg">
                      Robert Hayes
                    </h3>
                  </div>

                </div>

                <div className="flex items-center gap-4">

                  <Flag className="w-6 h-6 text-[#e10600]" />

                  <div>
                    <p className="text-gray-400 text-sm">
                      Nationality
                    </p>

                    <h3 className="text-white font-bold text-lg">
                      United States 🇺🇸
                    </h3>
                  </div>

                </div>

                <div className="flex items-center gap-4">

                  <Trophy className="w-6 h-6 text-[#e10600]" />

                  <div>
                    <p className="text-gray-400 text-sm">
                      Championships
                    </p>

                    <h3 className="text-white font-bold text-lg">
                      6 Titles
                    </h3>
                  </div>

                </div>

                <div className="flex items-center gap-4">

                  <User className="w-6 h-6 text-[#e10600]" />

                  <div>
                    <p className="text-gray-400 text-sm">
                      Owner
                    </p>

                    <h3 className="text-white font-bold text-lg">
                      {entry.owner}
                    </h3>
                  </div>

                </div>

              </div>
            </div>

            {/* PERFORMANCE */}
            <div className="bg-[#111111] border border-white/10 rounded-2xl p-8">

              <h2 className="text-2xl font-bold text-white mb-6">
                Performance
              </h2>

              <div className="space-y-6">

                <div>

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">
                      Speed
                    </span>

                    <span className="text-white font-bold">
                      96%
                    </span>
                  </div>

                  <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#e10600] w-[96%] rounded-full" />
                  </div>

                </div>

                <div>

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">
                      Stamina
                    </span>

                    <span className="text-white font-bold">
                      91%
                    </span>
                  </div>

                  <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#e10600] w-[91%] rounded-full" />
                  </div>

                </div>

                <div>

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">
                      Agility
                    </span>

                    <span className="text-white font-bold">
                      89%
                    </span>
                  </div>

                  <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#e10600] w-[89%] rounded-full" />
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
