import { useState, useEffect } from 'react';
import { Circle, Flag, Trophy, Zap, Clock } from 'lucide-react';
import {
  raceSchedule,
  refereeChecklist,
} from '../data/tournamentWorkflow';
import NotificationsPanel from './NotificationsPanel';

export default function LiveRace() {
  const [raceTime, setRaceTime] = useState({ minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      setRaceTime((prev) => {
        const newSeconds = prev.seconds + 1;
        if (newSeconds >= 60) {
          return { minutes: prev.minutes + 1, seconds: 0 };
        }
        return { ...prev, seconds: newSeconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const raceData = {
    name: raceSchedule[0].name,
    track: raceSchedule[0].venue,
    distance: raceSchedule[0].distance,
    surface: raceSchedule[0].surface,
    weather: 'Clear',
  };

  const positions = [
    {
      position: 1,
      horse: 'Midnight Storm',
      jockey: 'M. Sterling',
      speed: 58.5,
      distance: 1850,
      gap: 'LEAD',
      trend: 'up',
    },
    {
      position: 2,
      horse: 'Silver Bullet',
      jockey: 'S. Chen',
      speed: 57.8,
      distance: 1835,
      gap: '+0.8s',
      trend: 'same',
    },
    {
      position: 3,
      horse: 'Racing Thunder',
      jockey: 'D. Martinez',
      speed: 57.2,
      distance: 1820,
      gap: '+1.5s',
      trend: 'down',
    },
    {
      position: 4,
      horse: 'Golden Spirit',
      jockey: 'E. Johnson',
      speed: 56.9,
      distance: 1810,
      gap: '+2.1s',
      trend: 'up',
    },
    {
      position: 5,
      horse: 'Thunder Bolt',
      jockey: 'J. O\'Connor',
      speed: 56.5,
      distance: 1800,
      gap: '+2.8s',
      trend: 'same',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        <NotificationsPanel />

        {/* Live Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-[#e10600] rounded">
              <Circle className="w-3 h-3 fill-white text-white animate-pulse" />
              <span className="text-white font-bold uppercase text-sm">Live Now</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{raceData.name}</h1>
              <p className="text-gray-400">
                {raceData.track} • Referee: {raceSchedule[0].referee}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-gray-400 text-sm">Race Time</div>
              <div className="text-white font-mono text-2xl font-bold">
                {raceTime.minutes.toString().padStart(2, '0')}:{raceTime.seconds.toString().padStart(2, '0')}
              </div>
            </div>
          </div>
        </div>

        {/* Race Info Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Distance</div>
            <div className="text-white font-bold text-xl">{raceData.distance}</div>
          </div>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Surface</div>
            <div className="text-white font-bold text-xl">{raceData.surface}</div>
          </div>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Weather</div>
            <div className="text-white font-bold text-xl">{raceData.weather}</div>
          </div>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Competitors</div>
            <div className="text-white font-bold text-xl">{positions.length}</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Live Positions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Track Visualization */}
            <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Live Track Position</h2>

              <div className="relative h-32 bg-[#0a0a0a] rounded-lg overflow-hidden border border-white/10 mb-6">
                <div className="absolute inset-0">
                  {/* Track lines */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/20"></div>
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-[#e10600]"></div>

                  {/* Horse positions */}
                  {positions.map((pos, index) => (
                    <div
                      key={pos.position}
                      className="absolute flex items-center gap-2 transition-all duration-1000"
                      style={{
                        left: `${(pos.distance / 2000) * 100}%`,
                        top: `${index * 24 + 10}px`,
                      }}
                    >
                      <div className="w-8 h-8 bg-[#e10600] rounded flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-[#e10600]/50">
                        {pos.position}
                      </div>
                      <div className="text-white text-sm font-semibold whitespace-nowrap hidden md:block">
                        {pos.horse}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Position Table */}
              <div className="space-y-2">
                {positions.map((pos) => (
                  <div
                    key={pos.position}
                    className={`bg-[#0a0a0a] border rounded-lg p-4 transition-all ${
                      pos.position === 1 ? 'border-[#e10600]' : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Position */}
                      <div
                        className={`w-12 h-12 rounded flex items-center justify-center font-bold text-xl ${
                          pos.position === 1
                            ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black'
                            : pos.position === 2
                            ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black'
                            : pos.position === 3
                            ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black'
                            : 'bg-[#2a2a2a] text-white'
                        }`}
                      >
                        {pos.position}
                      </div>

                      {/* Horse & Jockey */}
                      <div className="flex-1">
                        <div className="text-white font-bold text-lg">{pos.horse}</div>
                        <div className="text-gray-400 text-sm">{pos.jockey}</div>
                      </div>

                      {/* Speed */}
                      <div className="text-center hidden md:block">
                        <div className="flex items-center gap-1 text-[#e10600] font-mono font-bold text-lg">
                          <Zap className="w-4 h-4" />
                          {pos.speed} km/h
                        </div>
                        <div className="text-gray-400 text-xs">Current Speed</div>
                      </div>

                      {/* Distance */}
                      <div className="text-center hidden lg:block">
                        <div className="text-white font-bold text-lg">{pos.distance}m</div>
                        <div className="text-gray-400 text-xs">Distance Covered</div>
                      </div>

                      {/* Gap */}
                      <div className="text-right">
                        <div className={`font-bold text-lg ${pos.gap === 'LEAD' ? 'text-[#e10600]' : 'text-white'}`}>
                          {pos.gap}
                        </div>
                        <div className="text-gray-400 text-xs">Gap</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Race Progress */}
            <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Referee Pre-Race Check</h2>

              <div className="space-y-3">
                {refereeChecklist.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-4 bg-[#0a0a0a] border border-white/10 rounded-lg p-3"
                  >
                    <span className="text-gray-300 text-sm">{item.label}</span>

                    <span className="text-yellow-400 text-xs font-bold uppercase">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => alert('Referee checklist marked as passed. Race can start.')}
                className="w-full mt-5 py-3 bg-[#e10600] hover:bg-[#c00500] text-white rounded-xl font-bold transition-all"
              >
                Mark Pre-Race Check Passed
              </button>
            </div>

            {/* Race Progress */}
            <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Race Progress</h2>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Completion</span>
                  <span className="text-white font-bold">92.5%</span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#e10600] to-[#ff4500] w-[92.5%] animate-pulse"></div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Remaining Distance</span>
                  <span className="text-white font-bold">150m</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Estimated Finish</span>
                  <span className="text-white font-bold">30s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Average Speed</span>
                  <span className="text-white font-bold">57.4 km/h</span>
                </div>
              </div>
            </div>

            {/* Live Commentary */}
            <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Live Commentary</h2>

              <div className="space-y-4">
                <div className="border-l-2 border-[#e10600] pl-4">
                  <div className="text-gray-400 text-xs mb-1">2:05</div>
                  <div className="text-white text-sm">Midnight Storm takes the lead in the final stretch!</div>
                </div>
                <div className="border-l-2 border-white/20 pl-4">
                  <div className="text-gray-400 text-xs mb-1">1:58</div>
                  <div className="text-white text-sm">Silver Bullet closing the gap, intense battle ahead.</div>
                </div>
                <div className="border-l-2 border-white/20 pl-4">
                  <div className="text-gray-400 text-xs mb-1">1:45</div>
                  <div className="text-white text-sm">Racing Thunder making a strong push from third position.</div>
                </div>
                <div className="border-l-2 border-white/20 pl-4">
                  <div className="text-gray-400 text-xs mb-1">1:32</div>
                  <div className="text-white text-sm">All horses entering the final lap, crowd on their feet!</div>
                </div>
              </div>
            </div>

            {/* Fastest Lap */}
            <div className="bg-[#1a1a1a] border border-[#e10600]/50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#e10600]/20 rounded flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-[#e10600]" />
                </div>
                <h3 className="text-white font-bold text-lg">Fastest Speed</h3>
              </div>
              <div className="text-[#e10600] font-bold text-3xl mb-1">58.5 km/h</div>
              <div className="text-gray-400 text-sm">Midnight Storm • Lap 3</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
