import React, { useState } from 'react';
import {
  Trophy,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Minus,
  Medal,
  Star,
  Crown,
  Award,
} from 'lucide-react';
import {
  currentTournament,
  resultPipeline,
} from '../data/tournamentWorkflow';

type Tab = 'horses' | 'jockeys' | 'trainers' | 'stables';

export default function RankingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('horses');
  const [season, setSeason] = useState('2026');

  const horseRankings = [
    {
      rank: 1,
      name: 'Midnight Storm',
      nationality: '🇺🇸',
      wins: 18,
      races: 24,
      points: 2850,
      change: 'up',
      prev: 2,
    },
    {
      rank: 2,
      name: 'Silver Bullet',
      nationality: '🇬🇧',
      wins: 22,
      races: 30,
      points: 2720,
      change: 'down',
      prev: 1,
    },
    {
      rank: 3,
      name: 'Racing Thunder',
      nationality: '🇪🇸',
      wins: 15,
      races: 20,
      points: 2580,
      change: 'same',
      prev: 3,
    },
  ];

  const jockeyRankings = [
    {
      rank: 1,
      name: 'Marcus Sterling',
      nationality: '🇺🇸',
      wins: 45,
      races: 66,
      points: 3200,
      change: 'up',
      prev: 2,
    },
    {
      rank: 2,
      name: 'Sarah Chen',
      nationality: '🇨🇳',
      wins: 42,
      races: 64,
      points: 3050,
      change: 'same',
      prev: 2,
    },
  ];

  const trainerRankings = [
    {
      rank: 1,
      name: 'Robert Hayes',
      nationality: '🇺🇸',
      wins: 48,
      races: 78,
      points: 3800,
      change: 'up',
      prev: 2,
    },
  ];

  const stableRankings = [
    {
      rank: 1,
      name: 'Black Pearl Stables',
      nationality: '🇺🇸',
      wins: 72,
      races: 120,
      points: 5400,
      change: 'up',
      prev: 2,
    },
  ];

  const tabs = [
    {
      key: 'horses' as Tab,
      label: 'Horses',
      icon: <Trophy className="w-4 h-4" />,
    },
    {
      key: 'jockeys' as Tab,
      label: 'Jockeys',
      icon: <Medal className="w-4 h-4" />,
    },
    {
      key: 'trainers' as Tab,
      label: 'Trainers',
      icon: <Award className="w-4 h-4" />,
    },
    {
      key: 'stables' as Tab,
      label: 'Stables',
      icon: <Star className="w-4 h-4" />,
    },
  ];

  const getActiveData = () => {
    switch (activeTab) {
      case 'horses':
        return horseRankings;

      case 'jockeys':
        return jockeyRankings;

      case 'trainers':
        return trainerRankings;

      case 'stables':
        return stableRankings;

      default:
        return horseRankings;
    }
  };

  const data = getActiveData();
  const top3 = data.slice(0, 3);

  const changeIcon = (change: string) => {
    if (change === 'up') {
      return <ArrowUp className="w-3 h-3 text-green-400" />;
    }

    if (change === 'down') {
      return <ArrowDown className="w-3 h-3 text-red-400" />;
    }

    return <Minus className="w-3 h-3 text-gray-500" />;
  };

  const rankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-amber-600';

    return 'text-gray-500';
  };

  const podiumBg = (rank: number) => {
    if (rank === 1) return 'border-yellow-400/40 bg-yellow-400/5';
    if (rank === 2) return 'border-gray-300/40 bg-gray-300/5';

    return 'border-amber-600/40 bg-amber-600/5';
  };

  const podiumHeight = (rank: number) => {
    if (rank === 1) return 'h-24';
    if (rank === 2) return 'h-16';

    return 'h-12';
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-6 h-6 text-[#e10600]" />

              <h1 className="text-4xl font-bold">
                World Rankings
              </h1>
            </div>

            <p className="text-gray-400">
              Official championship standings for {currentTournament.name}. Rankings update after Admin publishes referee-confirmed results.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm">
              Season
            </span>

            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-sm"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
        </div>

        <div className="mb-8 border border-white/10 bg-[#111111] rounded-lg p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-white font-bold">
                Ranking update gate
              </div>

              <p className="text-gray-400 mt-1">
                Referee confirmed: {resultPipeline.refereeConfirmed ? 'Yes' : 'No'} • Admin published: {resultPipeline.adminPublished ? 'Yes' : 'No'} • Rewards calculated: {resultPipeline.rewardsCalculated ? 'Yes' : 'No'}
              </p>
            </div>

            <span className="px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-bold">
              Awaiting Official Result
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-10">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2 rounded transition-all ${
                activeTab === tab.key
                  ? 'bg-[#e10600] text-white'
                  : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#252525]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Podium */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">

          {top3.map((item, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 flex flex-col items-center justify-end ${podiumBg(
                item.rank
              )}`}
            >
              <div className="text-3xl mb-2">
                {item.rank === 1
                  ? '🥇'
                  : item.rank === 2
                  ? '🥈'
                  : '🥉'}
              </div>

              <div className="font-bold text-lg">
                {item.name}
              </div>

              <div className="text-gray-400 text-sm mb-3">
                {item.points.toLocaleString()} pts
              </div>

              <div
                className={`w-full rounded flex items-center justify-center ${podiumHeight(
                  item.rank
                )} bg-white/5`}
              >
                <span
                  className={`text-3xl font-bold ${rankColor(item.rank)}`}
                >
                  {item.rank}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Rankings Table */}
        <div className="bg-[#111111] border border-white/10 rounded-lg overflow-hidden">

          <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#e10600]" />

            <h2 className="font-semibold">
              {tabs.find((t) => t.key === activeTab)?.label} Rankings
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">

              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-xs uppercase">
                  <th className="text-left px-6 py-3">Rank</th>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-center px-4 py-3">Wins</th>
                  <th className="text-center px-4 py-3">Races</th>
                  <th className="text-right px-4 py-3">Points</th>
                  <th className="text-center px-4 py-3">Change</th>
                </tr>
              </thead>

              <tbody>
                {data.map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span
                        className={`text-xl font-bold ${rankColor(
                          row.rank
                        )}`}
                      >
                        {row.rank}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span>{row.nationality}</span>

                        <span className="font-semibold">
                          {row.name}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-center">
                      {row.wins}
                    </td>

                    <td className="px-4 py-4 text-center text-gray-400">
                      {row.races}
                    </td>

                    <td className="px-4 py-4 text-right font-bold">
                      {row.points.toLocaleString()}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-1">
                        {changeIcon(row.change)}

                        {row.change !== 'same' && (
                          <span
                            className={`text-xs ${
                              row.change === 'up'
                                ? 'text-green-400'
                                : 'text-red-400'
                            }`}
                          >
                            {Math.abs(row.rank - row.prev)}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr> 
                ))}
              </tbody>

            </table>
          </div>

          <div className="px-6 py-3 border-t border-white/10 flex justify-between items-center text-xs text-gray-500">
            <span>
              Last updated: {new Date().toLocaleDateString()}
            </span>

            <span>
              Showing {data.length} entries
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
