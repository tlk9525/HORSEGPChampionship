import {
  Trophy,
  Timer,
  MapPin,
  Circle,
  Activity,
  CloudSun,
  Shield,
  Gauge,
} from 'lucide-react';
import {
  currentTournament,
  raceSchedule,
  tournamentHorses,
} from '../data/tournamentWorkflow';

export default function RaceDetails() {
  const race = raceSchedule[0];

  const horses = [
    {
      no: 1,
      horse: 'MIDNIGHT STORM',
      jockey: 'Marcus Sterling',
      trainer: 'John Carter',
      draw: 2,
      rating: 95,
      ratingChange: '+2',
      weight: 126,
      horseWeight: 1150,
      odds: '3.5',
      form: '1/2/1/3/2/1',
      gear: 'TT',
      priority: '*1',
    },
    {
      no: 2,
      horse: 'SILVER ARROW',
      jockey: 'Sarah Chen',
      trainer: 'Michael Lee',
      draw: 5,
      rating: 91,
      ratingChange: '0',
      weight: 124,
      horseWeight: 1182,
      odds: '5.2',
      form: '3/4/1/2/3/1',
      gear: 'XB',
      priority: '*1',
    },
    {
      no: 3,
      horse: 'THUNDER BOLT',
      jockey: 'Diego Martinez',
      trainer: 'Alex Wong',
      draw: 1,
      rating: 89,
      ratingChange: '-1',
      weight: 127,
      horseWeight: 1201,
      odds: '7.8',
      form: '5/1/2/4/1/2',
      gear: 'CP',
      priority: '+1',
    },
    {
      no: 4,
      horse: 'ROYAL PHANTOM',
      jockey: 'Emily Johnson',
      trainer: 'David Brown',
      draw: 8,
      rating: 93,
      ratingChange: '+1',
      weight: 123,
      horseWeight: 1160,
      odds: '4.1',
      form: '2/2/3/1/2/1',
      gear: 'B',
      priority: '*1',
    },
    {
      no: 5,
      horse: 'GOLDEN SPIRIT',
      jockey: 'James O’Connor',
      trainer: 'William Hart',
      draw: 4,
      rating: 88,
      ratingChange: '-2',
      weight: 121,
      horseWeight: 1129,
      odds: '9.5',
      form: '6/3/2/5/4/2',
      gear: 'CP/TT',
      priority: '*1',
    },
    {
      no: 6,
      horse: 'RACING THUNDER',
      jockey: 'Daniel Ho',
      trainer: 'Chris Yip',
      draw: 9,
      rating: 90,
      ratingChange: '0',
      weight: 122,
      horseWeight: 1170,
      odds: '12.0',
      form: '4/5/2/3/6/1',
      gear: 'B',
      priority: '*1',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-10">

      <div className="max-w-[1850px] mx-auto px-4">

        {/* HEADER */}
        <div className="bg-[#151515] border border-white/10 rounded-2xl overflow-hidden mb-6">

          {/* TOP */}
          <div className="border-b border-white/10 px-6 py-5 bg-[#111]">

            <div className="flex flex-wrap items-center justify-between gap-5">

              <div>

                <div className="flex flex-wrap items-center gap-3 mb-4">

                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#e10600]/15 border border-[#e10600]/30">

                    <Circle className="w-2 h-2 fill-[#e10600] text-[#e10600] animate-pulse" />

                    <span className="text-[#e10600] text-xs font-bold uppercase tracking-wider">
                      Awaiting Confirmations
                    </span>
                  </div>

                  <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm">
                    {currentTournament.name}
                  </div>

                  <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm">
                    {race.name}
                  </div>
                </div>

                <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight">
                  {race.name}
                </h1>

                <div className="flex flex-wrap items-center gap-5 mt-5 text-sm text-gray-400">

                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#e10600]" />
                    {race.venue}
                  </div>

                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-[#e10600]" />
                    {race.distance} {race.surface}
                  </div>

                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-[#e10600]" />
                    Prize Pool: {currentTournament.prizePool}
                  </div>

                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#e10600]" />
                    Good Track
                  </div>
                </div>
              </div>

              {/* RIGHT INFO */}
              <div className="grid grid-cols-2 gap-4 min-w-[340px]">

                <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-gray-500 uppercase mb-2">
                    Owner Confirmed
                  </div>

                  <div className="text-2xl font-black text-[#e10600]">
                    {race.ownerConfirmed}/{race.participants}
                  </div>
                </div>

                <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-gray-500 uppercase mb-2">
                    Jockey Confirmed
                  </div>

                  <div className="text-2xl font-black text-white">
                    {race.jockeyConfirmed}/{race.participants}
                  </div>
                </div>

                <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-gray-500 uppercase mb-2">
                    Weather
                  </div>

                  <div className="flex items-center gap-2 text-white font-bold">
                    <CloudSun className="w-5 h-5 text-[#e10600]" />
                    Sunny
                  </div>
                </div>

                <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-gray-500 uppercase mb-2">
                    Referee
                  </div>

                  <div className="text-lg font-black text-white">
                    {race.referee}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* RACE TABS */}
          <div className="px-6 py-5 border-b border-white/10 bg-[#0f0f0f]">

            <div className="flex flex-wrap items-center gap-3">

              {[1,2,3,4,5,6,7,8].map((race) => (
                <button
                  key={race}
                  className={`w-20 h-16 rounded-2xl font-black text-2xl transition-all duration-300 ${
                    race === 4
                      ? 'bg-[#e10600] text-white shadow-xl shadow-[#e10600]/30'
                      : 'bg-[#1b1b1b] text-gray-400 hover:bg-[#252525]'
                  }`}
                >
                  R{race}
                </button>
              ))}
            </div>
          </div>

          {/* INFO BAR */}
          <div className="px-6 py-4 bg-[#121212] border-b border-white/10">

            <div className="flex flex-wrap items-center justify-between gap-4">

              <div className="flex flex-wrap items-center gap-5 text-sm text-gray-400">

                <span>{race.distance} {race.surface}</span>
                <span>Good Track</span>
                <span>{currentTournament.round}</span>
                <span>{tournamentHorses.length} Horses</span>
              </div>

              <div className="flex items-center gap-3">

                <div className="px-4 py-2 rounded-lg bg-[#e10600]/10 border border-[#e10600]/20 text-[#e10600] font-bold text-sm">
                  RACE CONFIRMATION
                </div>

                <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm">
                  Predictions locked
                </div>
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">

            <table className="w-full min-w-[1600px]">

              <thead className="bg-[#101010] border-b border-white/10">

                <tr>

                  <th className="py-4 px-3 text-left text-gray-400 uppercase text-xs">
                    Horse No.
                  </th>

                  <th className="py-4 px-3 text-left text-gray-400 uppercase text-xs">
                    Last 6 Runs
                  </th>

                  <th className="py-4 px-3 text-left text-gray-400 uppercase text-xs">
                    Horse
                  </th>

                  <th className="py-4 px-3 text-center text-gray-400 uppercase text-xs">
                    Wt.
                  </th>

                  <th className="py-4 px-3 text-left text-gray-400 uppercase text-xs">
                    Jockey
                  </th>

                  <th className="py-4 px-3 text-center text-gray-400 uppercase text-xs">
                    Draw
                  </th>

                  <th className="py-4 px-3 text-left text-gray-400 uppercase text-xs">
                    Trainer
                  </th>

                  <th className="py-4 px-3 text-center text-gray-400 uppercase text-xs">
                    Rtg.
                  </th>

                  <th className="py-4 px-3 text-center text-gray-400 uppercase text-xs">
                    Rtg +/-
                  </th>

                  <th className="py-4 px-3 text-center text-gray-400 uppercase text-xs">
                    Horse Wt.
                  </th>

                  <th className="py-4 px-3 text-center text-gray-400 uppercase text-xs">
                    Priority
                  </th>

                  <th className="py-4 px-3 text-center text-gray-400 uppercase text-xs">
                    Gear
                  </th>

                  <th className="py-4 px-3 text-right text-gray-400 uppercase text-xs">
                    Odds
                  </th>
                </tr>
              </thead>

              <tbody>

                {horses.map((horse) => (

                  <tr
                    key={horse.no}
                    className="border-b border-white/5 hover:bg-white/5 transition-all"
                  >

                    {/* HORSE NO */}
                    <td className="py-5 px-3">

                      <div className="w-11 h-11 rounded-xl bg-[#e10600] flex items-center justify-center text-white font-black shadow-lg shadow-[#e10600]/20">
                        {horse.no}
                      </div>
                    </td>

                    {/* FORM */}
                    <td className="py-5 px-3">

                      <div className="font-mono text-sm text-gray-400">
                        {horse.form}
                      </div>
                    </td>

                    {/* HORSE */}
                    <td className="py-5 px-3">

                      <div className="font-black text-white text-lg">
                        {horse.horse}
                      </div>

                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">

                        <Shield className="w-3 h-3" />

                        Thoroughbred • Age 5
                      </div>
                    </td>

                    {/* WEIGHT */}
                    <td className="py-5 px-3 text-center text-white font-semibold">
                      {horse.weight}
                    </td>

                    {/* JOCKEY */}
                    <td className="py-5 px-3 text-gray-300 font-semibold">
                      {horse.jockey}
                    </td>

                    {/* DRAW */}
                    <td className="py-5 px-3 text-center">

                      <div className="inline-flex w-10 h-10 rounded-lg bg-[#202020] items-center justify-center text-white font-bold border border-white/10">
                        {horse.draw}
                      </div>
                    </td>

                    {/* TRAINER */}
                    <td className="py-5 px-3 text-gray-300">
                      {horse.trainer}
                    </td>

                    {/* RATING */}
                    <td className="py-5 px-3 text-center text-white font-semibold">
                      {horse.rating}
                    </td>

                    {/* RATING CHANGE */}
                    <td
                      className={`py-5 px-3 text-center font-bold ${
                        horse.ratingChange.includes('+')
                          ? 'text-green-500'
                          : horse.ratingChange.includes('-')
                          ? 'text-red-500'
                          : 'text-gray-400'
                      }`}
                    >
                      {horse.ratingChange}
                    </td>

                    {/* HORSE WEIGHT */}
                    <td className="py-5 px-3 text-center text-white">
                      {horse.horseWeight}
                    </td>

                    {/* PRIORITY */}
                    <td className="py-5 px-3 text-center">

                      <div className="inline-flex px-3 py-2 rounded-lg bg-[#1f1f1f] text-gray-300 text-sm font-bold">
                        {horse.priority}
                      </div>
                    </td>

                    {/* GEAR */}
                    <td className="py-5 px-3 text-center">

                      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#222] border border-white/10 text-gray-300 font-semibold">
                        <Gauge className="w-4 h-4 text-[#e10600]" />
                        {horse.gear}
                      </div>
                    </td>

                    {/* ODDS */}
                    <td className="py-5 px-3 text-right">

                      <div className="inline-flex px-5 py-3 rounded-xl bg-[#e10600]/10 border border-[#e10600]/20 text-[#e10600] font-black text-lg">
                        {horse.odds}x
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* FOOTER */}
          <div className="border-t border-white/10 p-6 bg-[#101010]">

            <div className="flex flex-wrap items-center gap-4 text-sm">

              <div className="px-4 py-2 rounded-lg bg-[#1b1b1b] border border-white/10 text-gray-400">
                TT = Tongue Tie
              </div>

              <div className="px-4 py-2 rounded-lg bg-[#1b1b1b] border border-white/10 text-gray-400">
                XB = Cross Nose Band
              </div>

              <div className="px-4 py-2 rounded-lg bg-[#1b1b1b] border border-white/10 text-gray-400">
                CP = Cheek Pieces
              </div>

              <div className="px-4 py-2 rounded-lg bg-[#1b1b1b] border border-white/10 text-gray-400">
                B = Blinkers
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
