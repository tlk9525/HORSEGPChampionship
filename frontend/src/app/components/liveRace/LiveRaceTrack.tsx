import { Trophy } from 'lucide-react';
import { raceSimulationOutcomeLabel } from '../../utils/raceSimulation';
import { DisplayRunnerRow } from './liveRaceDisplay';

interface LiveRaceTrackProps {
  officialReplayMode: boolean;
  distance: string;
  surface: string;
  elapsed: string;
  projected: string;
  progressPercent: number;
  raceStatus: string;
  simulationFinishedVisually: boolean;
  runners: DisplayRunnerRow[];
  rankByEntryId: Map<string, number>;
}

// Ghi chú: Render đường đua trực quan cho simulation hoặc official replay.
export default function LiveRaceTrack({
  officialReplayMode,
  distance,
  surface,
  elapsed,
  projected,
  progressPercent,
  raceStatus,
  simulationFinishedVisually,
  runners,
  rankByEntryId,
}: LiveRaceTrackProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#12304f]">
      <div className="border-b border-white/10 bg-[#0b223d] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#d4af37] font-black uppercase tracking-[0.16em] text-sm">
              <Trophy className="w-5 h-5" />
              {officialReplayMode ? 'Official Replay' : 'Live Simulation'}
            </div>
            <p className="mt-2 text-sm text-gray-400">
              {officialReplayMode
                ? 'Uses recorded positions and finish times from the official result set.'
                : 'Uses this race\'s distance, surface, gates, rating snapshots and assigned weights. Visual only until Referee records results.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[
              ['Distance', distance],
              ['Surface', surface],
              ['Elapsed', elapsed],
              ['Projected', projected],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-[#071a2f] px-4 py-3">
                <div className="text-xs text-gray-500">{label}</div>
                <div className="font-black text-white">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/30">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-[#d4af37] to-orange-400"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {raceStatus === 'in-progress' && simulationFinishedVisually && (
          <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm font-semibold text-amber-100">
            Visual race is complete. Waiting for Admin to finish the race before Referee can enter results.
          </div>
        )}
      </div>

      <div className="space-y-2 p-3 sm:p-5">
        {runners.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/15 bg-[#071a2f] p-5 text-center text-gray-500">
            {officialReplayMode
              ? 'This race has no official results yet.'
              : 'Mark at least one approved participant Ready before the race can be simulated.'}
          </div>
        )}

        {runners.map((runner) => {
          const rank = rankByEntryId.get(runner.keyId);
          const markerColor = officialReplayMode ? '#d4af37' : runner.silkColor;

          return (
            <div
              key={runner.keyId}
              className="grid grid-cols-[38px,minmax(0,1fr),44px] items-center gap-2 rounded-2xl border border-white/[0.07] bg-[#071a2f] p-2 sm:grid-cols-[44px,180px,minmax(0,1fr),54px] sm:gap-3 sm:p-3"
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black text-[#071a2f]"
                style={{ backgroundColor: markerColor }}
              >
                {runner.lane || '-'}
              </div>

              <div className="hidden min-w-0 sm:block">
                <div className="truncate font-black text-white">{runner.horseName}</div>
                <div className="truncate text-xs text-gray-400">
                  {officialReplayMode
                    ? `Jockey ${runner.jockeyName} • Official P${runner.position || '-'} • ${runner.finishTime || ''}`
                    : `${runner.jockeyName} • R${runner.rating} • ${runner.carriedWeight}lb • ${raceSimulationOutcomeLabel(runner.simulationOutcome)}`}
                </div>
                {!officialReplayMode && runner.simulationOutcome && runner.simulationOutcome !== 'finished' && (
                  <div className="mt-1 truncate text-[11px] font-bold text-orange-300">
                    {runner.incidentReason || raceSimulationOutcomeLabel(runner.simulationOutcome)}
                  </div>
                )}
              </div>

              <div
                className="relative h-12 overflow-hidden rounded-xl border border-white/10 bg-[#102f31]"
                style={{
                  backgroundImage:
                    'linear-gradient(90deg, transparent 24.7%, rgba(255,255,255,.12) 25%, transparent 25.3%, transparent 49.7%, rgba(255,255,255,.12) 50%, transparent 50.3%, transparent 74.7%, rgba(255,255,255,.12) 75%, transparent 75.3%)',
                }}
              >
                <div className="absolute inset-y-0 left-[18px] right-[18px]">
                  <div className="absolute inset-y-0 right-0 z-20 w-1 translate-x-1/2 bg-[repeating-linear-gradient(0deg,#fff_0_4px,#111_4px_8px)] opacity-80" />
                  <div
                    className="absolute top-1/2 z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white shadow-lg"
                    style={{
                      left: `${runner.progress * 100}%`,
                      backgroundColor: markerColor,
                      boxShadow: `0 0 18px ${markerColor}80`,
                    }}
                    title={officialReplayMode
                      ? `${runner.horseName}: P${rank || '-'}`
                      : `${runner.horseName}: ${Math.round(runner.progress * 100)}%`}
                  >
                    <span className="text-base">♞</span>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className={`text-xl font-black ${rank === 1 ? 'text-[#f6d77a]' : 'text-white'}`}>
                  P{rank}
                </div>
                <div className="text-[10px] uppercase text-gray-500">
                  {runner.simulationOutcome && runner.simulationOutcome !== 'finished'
                    ? raceSimulationOutcomeLabel(runner.simulationOutcome)
                    : `${Math.round(runner.progress * 100)}%`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
