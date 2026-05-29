import { useState } from 'react';

import {
  Trophy,
  Users,
  Calendar,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Circle,
  Crown,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock3,
  Activity,
  Flag,
  Medal,
} from 'lucide-react';
import {
  currentTournament,
  raceSchedule,
  tournamentHorses,
  statusLabel,
} from '../data/tournamentWorkflow';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export default function Dashboard({
  onNavigate,
}: DashboardProps) {

  const [showAllRaces, setShowAllRaces] =
    useState(false);

  const upcomingRaces = [
    ...raceSchedule.map((race) => ({
      id: race.id,
      name: race.name,
      date: race.date,
      time: race.time,
      location: race.venue,
      status: race.status,
      horses: race.participants,
      prize: currentTournament.prizePool,
    })),
    {
      id: 2,
      name: 'Championship Grand Prix',
      date: 'May 20, 2026',
      time: '14:00',
      location: 'Churchill Downs',
      status: 'upcoming',
      horses: 12,
      prize: '$500,000',
    },
    {
      id: 3,
      name: 'Spring Derby Finals',
      date: 'May 25, 2026',
      time: '15:00',
      location: 'Epsom Downs',
      status: 'upcoming',
      horses: 14,
      prize: '$420,000',
    },
    {
      id: 4,
      name: 'Metropolitan Stakes',
      date: 'May 27, 2026',
      time: '13:45',
      location: 'Belmont Park',
      status: 'live',
      horses: 11,
      prize: '$600,000',
    },
  ];

  const topJockeys = [
    {
      rank: 1,
      name: 'Marcus Sterling',
      wins: 45,
      winRate: 68.5,
      change: 'up',
    },
    {
      rank: 2,
      name: 'Sarah Chen',
      wins: 42,
      winRate: 65.2,
      change: 'up',
    },
    {
      rank: 3,
      name: 'Diego Martinez',
      wins: 38,
      winRate: 62.8,
      change: 'down',
    },
    {
      rank: 4,
      name: 'Emily Johnson',
      wins: 35,
      winRate: 59.4,
      change: 'up',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">

      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* HERO */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#111111] via-[#161616] to-[#0b0b0b] p-8 mb-10">

          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#e10600]/10 blur-3xl rounded-full"></div>

          <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-10">

            {/* LEFT */}
            <div>

              <div className="flex items-center gap-3 mb-5">

                <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#e10600]/30 bg-[#e10600]/10">

                  <Circle className="w-3 h-3 fill-[#e10600] text-[#e10600] animate-pulse" />

                  <span className="text-[#e10600] text-sm font-bold uppercase">
                    Live Racing
                  </span>

                </div>

                <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white text-sm">
                  Current phase: {currentTournament.phase}
                </div>

              </div>

              <h1 className="text-6xl font-black text-white leading-tight mb-5">
                Racing Command
                <span className="block text-[#e10600]">
                  Center
                </span>
              </h1>

              <p className="text-lg text-gray-400 max-w-2xl">
                Manage approvals, owner and jockey confirmations, referee checks, predictions, official results, rankings and awards.
              </p>

            </div>

            {/* RIGHT */}
            <div className="grid grid-cols-2 gap-5 min-w-[340px]">

              {[
                {
                  label: 'Live Races',
                  value: String(raceSchedule.length),
                },
                {
                  label: 'Prize Pool',
                  value: '$2.5M',
                },
                {
                  label: 'Horses',
                  value: String(tournamentHorses.length),
                },
                {
                  label: 'Jockeys',
                  value: '03',
                },
              ].map((item, index) => (

                <div
                  key={index}
                  className="bg-black/40 border border-white/10 rounded-2xl p-6"
                >

                  <div className="text-[#e10600] uppercase tracking-wider text-sm mb-2">
                    {item.label}
                  </div>

                  <div className="text-4xl font-black text-white">
                    {item.value}
                  </div>

                </div>

              ))}

            </div>

          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">

          {[
            {
              icon: Trophy,
              title: 'Total Horses',
              value: String(tournamentHorses.length),
              growth: 'Registration',
            },
            {
              icon: Users,
              title: 'Active Jockeys',
              value: '03',
              growth: 'Pairing',
            },
            {
              icon: Flag,
              title: 'Upcoming Races',
              value: String(raceSchedule.length),
              growth: 'Confirming',
            },
            {
              icon: TrendingUp,
              title: 'Total Prize',
              value: currentTournament.prizePool,
              growth: 'Awards',
            },
          ].map((item, index) => (

            <div
              key={index}
              className="bg-[#151515] border border-white/10 rounded-2xl p-6 hover:border-[#e10600]/40 transition-all"
            >

              <div className="flex items-center justify-between mb-6">

                <div className="w-14 h-14 rounded-xl bg-[#e10600]/10 flex items-center justify-center">
                  <item.icon className="w-7 h-7 text-[#e10600]" />
                </div>

                <div className="flex items-center gap-1 text-green-500">
                  <ArrowUp className="w-4 h-4" />
                  <span className="font-semibold text-sm">
                    {item.growth}
                  </span>
                </div>

              </div>

              <div className="text-4xl font-black text-white mb-2">
                {item.value}
              </div>

              <div className="text-gray-400 uppercase tracking-widest text-sm">
                {item.title}
              </div>

            </div>

          ))}

        </div>

        {/* MAIN */}
        <div className="grid xl:grid-cols-3 gap-8">

          {/* LEFT */}
          <div className="xl:col-span-2 space-y-8">

            {/* UPCOMING RACES */}
            <div className="bg-[#151515] border border-white/10 rounded-2xl p-6">

              <div className="flex items-center justify-between mb-8">

                <div>

                  <h2 className="text-3xl font-black text-white">
                    Upcoming Races
                  </h2>

                  <p className="text-gray-400 mt-2">
                    Race schedules and live events
                  </p>

                </div>

                <button
                  onClick={() =>
                    setShowAllRaces(!showAllRaces)
                  }
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#e10600]/30 bg-[#e10600]/10 text-[#e10600]"
                >

                  {showAllRaces
                    ? 'Show Less'
                    : 'View All'}

                  {showAllRaces
                    ? <ChevronUp className="w-4 h-4" />
                    : <ChevronDown className="w-4 h-4" />
                  }

                </button>

              </div>

              <div className="space-y-5">

                {(showAllRaces
                  ? upcomingRaces
                  : upcomingRaces.slice(0, 4)
                ).map((race) => (

                  <div
                    key={race.id}
                    className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-5 hover:border-[#e10600]/40 transition-all"
                  >

                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">

                      {/* LEFT */}
                      <div className="flex items-start gap-4">

                        {race.status === 'live' ? (

                          <div className="flex items-center gap-2 px-3 py-2 bg-[#e10600]/20 border border-[#e10600] rounded-lg">

                            <Circle className="w-2 h-2 fill-[#e10600] text-[#e10600] animate-pulse" />

                            <span className="text-[#e10600] text-xs font-bold uppercase">
                              {statusLabel(race.status)}
                            </span>

                          </div>

                        ) : (

                          <div className="w-14 h-14 rounded-xl bg-[#e10600]/10 flex items-center justify-center">
                            <Calendar className="w-7 h-7 text-[#e10600]" />
                          </div>

                        )}

                        <div>

                          <h3 className="text-xl font-bold text-white mb-3">
                            {race.name}
                          </h3>

                          <div className="flex flex-wrap items-center gap-5 text-sm text-gray-400">

                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {race.location}
                            </div>

                            <div className="flex items-center gap-1">
                              <Trophy className="w-4 h-4" />
                              {race.horses} Horses
                            </div>

                            <div className="flex items-center gap-1">
                              <Medal className="w-4 h-4" />
                              {race.prize}
                            </div>

                          </div>

                        </div>

                      </div>

                      {/* RIGHT */}
                      <div className="relative z-50 flex items-center justify-between xl:justify-end gap-10">

                        <div className="text-right">

                          <div className="text-white font-bold text-lg">
                            {race.date}
                          </div>

                          <div className="flex items-center justify-end gap-1 text-gray-400 text-sm mt-1">

                            <Clock3 className="w-4 h-4" />

                            {race.time}

                          </div>

                        </div>

                        <button
                          type="button"
                          onClick={(e) => {

                            e.preventDefault();
                            e.stopPropagation();

                            console.log(
                              'RACE CARD CLICKED'
                            );

                            onNavigate(
                              'race-details'
                            );

                          }}
                          className="relative z-[9999] px-5 py-3 rounded-xl bg-[#e10600] hover:bg-[#ff2a2a] text-white font-semibold transition-all cursor-pointer"
                        >
                          Race Card
                        </button>

                      </div>

                    </div>

                  </div>

                ))}

              </div>

            </div>

          </div>

          {/* RIGHT */}
          <div className="space-y-8">

            {/* TOP JOCKEYS */}
            <div className="bg-[#151515] border border-white/10 rounded-2xl p-6">

              <div className="flex items-center justify-between mb-8">

                <div>

                  <h2 className="text-3xl font-black text-white">
                    Top Jockeys
                  </h2>

                  <p className="text-gray-400 mt-2">
                    Seasonal leaderboard
                  </p>

                </div>

                <Crown className="w-7 h-7 text-[#e10600]" />

              </div>

              <div className="space-y-4">

                {topJockeys.map((jockey) => (

                  <div
                    key={jockey.rank}
                    className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-5"
                  >

                    <div className="flex items-center gap-4">

                      <div className="w-12 h-12 rounded-xl bg-[#222] text-white flex items-center justify-center font-black text-lg">
                        {jockey.rank}
                      </div>

                      <div className="flex-1">

                        <div className="flex items-center justify-between mb-2">

                          <h3 className="text-white font-bold">
                            {jockey.name}
                          </h3>

                          {jockey.change === 'up' && (
                            <ArrowUp className="w-4 h-4 text-green-500" />
                          )}

                          {jockey.change === 'down' && (
                            <ArrowDown className="w-4 h-4 text-red-500" />
                          )}

                        </div>

                        <div className="flex items-center justify-between text-sm">

                          <span className="text-gray-400">
                            {jockey.wins} Wins
                          </span>

                          <span className="text-[#e10600] font-bold">
                            {jockey.winRate}%
                          </span>

                        </div>

                      </div>

                    </div>

                  </div>

                ))}

              </div>

            </div>

            {/* PERFORMANCE */}
            <div className="bg-[#151515] border border-white/10 rounded-2xl p-6">

              <h2 className="text-3xl font-black text-white mb-8">
                Performance Overview
              </h2>

              <div className="space-y-6">

                {[
                  {
                    label: 'Win Rate',
                    value: '68.5%',
                    width: '68.5%',
                  },
                  {
                    label: 'Podium Finish',
                    value: '82.3%',
                    width: '82.3%',
                  },
                  {
                    label: 'Track Record',
                    value: '91.7%',
                    width: '91.7%',
                  },
                ].map((item, index) => (

                  <div key={index}>

                    <div className="flex items-center justify-between mb-3">

                      <span className="text-gray-400">
                        {item.label}
                      </span>

                      <span className="text-white font-bold">
                        {item.value}
                      </span>

                    </div>

                    <div className="h-3 bg-white/5 rounded-full overflow-hidden">

                      <div
                        className="h-full bg-gradient-to-r from-[#e10600] to-[#ff4500]"
                        style={{
                          width: item.width,
                        }}
                      ></div>

                    </div>

                  </div>

                ))}

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
