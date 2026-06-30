import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CirclePause,
  CirclePlay,
  Clock3,
  FlaskConical,
  Gauge,
  RefreshCcw,
  ShieldCheck,
  Trophy,
  type LucideIcon,
} from 'lucide-react';

type RaceStatus = 'ready' | 'running' | 'paused' | 'finished';
type RaceSurface = 'Turf' | 'Dirt' | 'Synthetic';

interface RaceCheckpoint {
  distanceMeters: number;
  timeSeconds: number;
}

interface DemoRunner {
  id: string;
  lane: number;
  horseName: string;
  jockeyName: string;
  silkColor: string;
  rating: number;
  carriedWeight: number;
  speed: number;
  stamina: number;
  form: number;
  phase: number;
  performanceScore: number;
  finishTimeSeconds: number;
  checkpoints: RaceCheckpoint[];
}

interface RacePlan {
  seed: number;
  distanceMeters: number;
  surface: RaceSurface;
  durationSeconds: number;
  runners: DemoRunner[];
}

interface RefereeDraft {
  id: string;
  position: number;
  finishTime: string;
  notes: string;
}

const demoField = [
  ['Golden Arrow', 'Minh Anh', '#f4c542', 86, 132, 91, 80, 88],
  ['Crimson Wind', 'Gia Huy', '#ef4444', 83, 129, 87, 84, 82],
  ['Emerald Flash', 'Quang Vinh', '#22c55e', 79, 125, 85, 78, 81],
  ['Midnight Star', 'Tuấn Kiệt', '#6366f1', 88, 135, 90, 89, 85],
  ['Silver Comet', 'Hoàng Nam', '#cbd5e1', 81, 127, 84, 86, 79],
  ['Ocean Spirit', 'Đức Phúc', '#38bdf8', 77, 121, 82, 76, 84],
  ['Royal Flame', 'Thanh Tùng', '#f97316', 84, 130, 88, 83, 86],
  ['Purple Crown', 'Khánh Duy', '#a855f7', 80, 126, 83, 85, 78],
] as const;

const baseSpeedBySurface: Record<RaceSurface, number> = {
  Turf: 17,
  Dirt: 16,
  Synthetic: 16.5,
};

const mulberry32 = (seed: number) => {
  let value = seed;

  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const formatRaceTime = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = Math.floor(safeSeconds % 60);
  const milliseconds = Math.floor((safeSeconds % 1) * 1000);

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
};

const createRacePlan = (
  seed: number,
  distanceMeters: number,
  surface: RaceSurface
): RacePlan => {
  const random = mulberry32(seed);

  const scoredRunners = demoField.map((runner, index) => {
    const [
      horseName,
      jockeyName,
      silkColor,
      rating,
      carriedWeight,
      speed,
      stamina,
      form,
    ] = runner;
    const weightPenalty = (carriedWeight - 115) * 0.16;
    const raceVariance = (random() - 0.5) * 7;
    const performanceScore =
      rating * 0.45 +
      speed * 0.2 +
      stamina * 0.2 +
      form * 0.15 -
      weightPenalty +
      raceVariance;

    return {
      id: `demo-entry-${index + 1}`,
      lane: index + 1,
      horseName,
      jockeyName,
      silkColor,
      rating,
      carriedWeight,
      speed,
      stamina,
      form,
      phase: random() * Math.PI * 2,
      performanceScore,
      finishTimeSeconds: 0,
      checkpoints: [] as RaceCheckpoint[],
    };
  });

  const fieldAverageScore =
    scoredRunners.reduce((total, runner) => total + runner.performanceScore, 0) /
    scoredRunners.length;
  const baseFinishTime = distanceMeters / baseSpeedBySurface[surface];
  const checkpointSize = distanceMeters <= 1200 ? 50 : 100;

  scoredRunners.forEach((runner) => {
    const abilitySpeedFactor =
      1 + (runner.performanceScore - fieldAverageScore) * 0.004;
    const desiredFinishTime =
      baseFinishTime / abilitySpeedFactor + (random() - 0.5) * 0.12;
    const rawCheckpoints: RaceCheckpoint[] = [
      { distanceMeters: 0, timeSeconds: 0 },
    ];
    let rawElapsed = 0;

    for (
      let checkpointDistance = checkpointSize;
      checkpointDistance <= distanceMeters;
      checkpointDistance += checkpointSize
    ) {
      const segmentEnd = Math.min(checkpointDistance, distanceMeters);
      const segmentStart = rawCheckpoints.at(-1)?.distanceMeters ?? 0;
      const segmentDistance = segmentEnd - segmentStart;
      const raceProgress = (segmentStart + segmentDistance / 2) / distanceMeters;
      const accelerationFactor =
        raceProgress < 0.12 ? 0.7 + raceProgress * 2.5 : 1;
      const staminaFactor =
        raceProgress > 0.65
          ? 1 +
            ((runner.stamina - 80) / 420) *
              ((raceProgress - 0.65) / 0.35)
          : 1;
      const closingKick =
        raceProgress > 0.84
          ? 1 +
            ((runner.form - 80) / 300) *
              ((raceProgress - 0.84) / 0.16)
          : 1;
      const tacticalVariation =
        1 + Math.sin(raceProgress * Math.PI * 4 + runner.phase) * 0.012;
      const segmentSpeed =
        baseSpeedBySurface[surface] *
        accelerationFactor *
        staminaFactor *
        closingKick *
        tacticalVariation;

      rawElapsed += segmentDistance / segmentSpeed;
      rawCheckpoints.push({
        distanceMeters: segmentEnd,
        timeSeconds: rawElapsed,
      });
    }

    if (rawCheckpoints.at(-1)?.distanceMeters !== distanceMeters) {
      const segmentStart = rawCheckpoints.at(-1)?.distanceMeters ?? 0;
      rawElapsed +=
        (distanceMeters - segmentStart) / baseSpeedBySurface[surface];
      rawCheckpoints.push({
        distanceMeters,
        timeSeconds: rawElapsed,
      });
    }

    const timeScale = desiredFinishTime / rawElapsed;
    runner.finishTimeSeconds = desiredFinishTime;
    runner.checkpoints = rawCheckpoints.map((checkpoint) => ({
      ...checkpoint,
      timeSeconds: checkpoint.timeSeconds * timeScale,
    }));
  });

  return {
    seed,
    distanceMeters,
    surface,
    durationSeconds: Math.max(
      ...scoredRunners.map((runner) => runner.finishTimeSeconds)
    ),
    runners: scoredRunners,
  };
};

const progressForRunner = (runner: DemoRunner, elapsedSeconds: number) => {
  if (elapsedSeconds <= 0) return 0;
  if (elapsedSeconds >= runner.finishTimeSeconds) return 1;

  const nextCheckpointIndex = runner.checkpoints.findIndex(
    (checkpoint) => checkpoint.timeSeconds >= elapsedSeconds
  );

  if (nextCheckpointIndex <= 0) return 0;

  const previousCheckpoint = runner.checkpoints[nextCheckpointIndex - 1];
  const nextCheckpoint = runner.checkpoints[nextCheckpointIndex];
  const checkpointDuration =
    nextCheckpoint.timeSeconds - previousCheckpoint.timeSeconds;
  const checkpointProgress =
    checkpointDuration > 0
      ? (elapsedSeconds - previousCheckpoint.timeSeconds) / checkpointDuration
      : 1;
  const currentDistance =
    previousCheckpoint.distanceMeters +
    (nextCheckpoint.distanceMeters - previousCheckpoint.distanceMeters) *
      checkpointProgress;

  return clamp(currentDistance / runner.checkpoints.at(-1)!.distanceMeters, 0, 1);
};

const statusLabel: Record<RaceStatus, string> = {
  ready: 'Ready to preview',
  running: 'Simulation running',
  paused: 'Simulation paused',
  finished: 'Simulation finished',
};

export default function RaceSimulationDemo() {
  const [seed, setSeed] = useState(20260630);
  const [distanceMeters, setDistanceMeters] = useState(1600);
  const [surface, setSurface] = useState<RaceSurface>('Turf');
  const [status, setStatus] = useState<RaceStatus>('ready');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [refereeDrafts, setRefereeDrafts] = useState<RefereeDraft[]>([]);
  const previousFrameRef = useRef<number | null>(null);
  const plan = useMemo(
    () => createRacePlan(seed, distanceMeters, surface),
    [distanceMeters, seed, surface]
  );

  useEffect(() => {
    if (status !== 'running') {
      previousFrameRef.current = null;
      return;
    }

    let frameId = 0;

    const advance = (timestamp: number) => {
      const previousTimestamp = previousFrameRef.current ?? timestamp;
      const deltaSeconds = Math.min((timestamp - previousTimestamp) / 1000, 0.25);
      previousFrameRef.current = timestamp;

      setElapsedSeconds((current) =>
        Math.min(plan.durationSeconds, current + deltaSeconds * playbackSpeed)
      );
      frameId = window.requestAnimationFrame(advance);
    };

    frameId = window.requestAnimationFrame(advance);

    return () => window.cancelAnimationFrame(frameId);
  }, [plan.durationSeconds, playbackSpeed, status]);

  useEffect(() => {
    if (status === 'running' && elapsedSeconds >= plan.durationSeconds) {
      setStatus('finished');
    }
  }, [elapsedSeconds, plan.durationSeconds, status]);

  const liveRunners = plan.runners.map((runner) => ({
    ...runner,
    progress: progressForRunner(runner, elapsedSeconds),
  }));

  const rankedRunners = [...liveRunners].sort((a, b) => {
    if (elapsedSeconds === 0) return a.lane - b.lane;
    if (b.progress !== a.progress) return b.progress - a.progress;
    return a.finishTimeSeconds - b.finishTimeSeconds;
  });

  const rankByRunnerId = new Map(
    rankedRunners.map((runner, index) => [runner.id, index + 1])
  );
  const progressPercent = clamp(
    (elapsedSeconds / plan.durationSeconds) * 100,
    0,
    100
  );
  const summaryCards: Array<{
    label: string;
    value: string;
    Icon: LucideIcon;
  }> = [
    { label: 'Status', value: statusLabel[status], Icon: Gauge },
    { label: 'Elapsed', value: formatRaceTime(elapsedSeconds), Icon: Clock3 },
    {
      label: 'Race duration (1×)',
      value: formatRaceTime(plan.durationSeconds),
      Icon: Clock3,
    },
    { label: 'Simulation seed', value: String(plan.seed), Icon: FlaskConical },
  ];

  const resetRace = (newSeed = seed) => {
    setSeed(newSeed);
    setStatus('ready');
    setElapsedSeconds(0);
    setRefereeDrafts([]);
    previousFrameRef.current = null;
  };

  const loadRefereeDraft = () => {
    const finalOrder = [...plan.runners].sort(
      (a, b) => a.finishTimeSeconds - b.finishTimeSeconds
    );

    setRefereeDrafts(
      finalOrder.map((runner, index) => ({
        id: runner.id,
        position: index + 1,
        finishTime: formatRaceTime(runner.finishTimeSeconds),
        notes: '',
      }))
    );
  };

  const updateDraft = (
    runnerId: string,
    patch: Partial<Omit<RefereeDraft, 'id'>>
  ) => {
    setRefereeDrafts((current) =>
      current.map((draft) =>
        draft.id === runnerId ? { ...draft, ...patch } : draft
      )
    );
  };

  return (
    <div className="min-h-screen bg-[#061526] pb-16 pt-16 text-white">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                <FlaskConical className="h-4 w-4" />
                Standalone prototype
              </span>
              <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200">
                No API • No database writes
              </span>
            </div>

            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
              Saigon Championship
            </h1>
            <p className="mt-2 max-w-3xl text-gray-400">
              Distance-based checkpoint simulation. Results stay provisional until
              a referee reviews them.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Distance
              <select
                value={distanceMeters}
                disabled={status === 'running'}
                onChange={(event) => {
                  setDistanceMeters(Number(event.target.value));
                  resetRace();
                }}
                className="mt-1 block rounded-xl border border-white/10 bg-[#0d2945] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
              >
                {[1000, 1200, 1600, 2000, 2400].map((distance) => (
                  <option key={distance} value={distance}>
                    {distance.toLocaleString()}m
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Surface
              <select
                value={surface}
                disabled={status === 'running'}
                onChange={(event) => {
                  setSurface(event.target.value as RaceSurface);
                  resetRace();
                }}
                className="mt-1 block rounded-xl border border-white/10 bg-[#0d2945] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
              >
                {(['Turf', 'Dirt', 'Synthetic'] as RaceSurface[]).map(
                  (surfaceOption) => (
                    <option key={surfaceOption} value={surfaceOption}>
                      {surfaceOption}
                    </option>
                  )
                )}
              </select>
            </label>

            <div className="flex gap-2">
              {[1, 2, 4].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`rounded-xl border px-4 py-2.5 text-sm font-black transition ${
                    playbackSpeed === speed
                      ? 'border-[#d4af37] bg-[#d4af37] text-[#071a2f]'
                      : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {speed}×
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(({ label, value, Icon }) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-[#0d2945] p-4"
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                <Icon className="h-4 w-4 text-[#d4af37]" />
                {label}
              </div>
              <div className="mt-2 text-xl font-black text-white">{value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),340px]">
          <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b223d] shadow-2xl shadow-black/20">
            <div className="border-b border-white/10 bg-gradient-to-r from-[#12304f] to-[#0b223d] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-black uppercase tracking-[0.2em] text-[#d4af37]">
                    {plan.distanceMeters.toLocaleString()}m • {plan.surface} • Demo Race
                  </div>
                  <div className="mt-1 text-sm text-gray-400">
                    Checkpoints every {plan.distanceMeters <= 1200 ? 50 : 100}m •
                    live order is visual only on this branch.
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      setStatus((current) =>
                        current === 'running' ? 'paused' : 'running'
                      )
                    }
                    disabled={status === 'finished'}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#d4af37] px-5 py-3 font-black text-[#071a2f] transition hover:bg-[#e7c95d] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {status === 'running' ? (
                      <CirclePause className="h-5 w-5" />
                    ) : (
                      <CirclePlay className="h-5 w-5" />
                    )}
                    {status === 'running'
                      ? 'Pause'
                      : status === 'paused'
                        ? 'Resume'
                        : 'Start preview'}
                  </button>

                  <button
                    onClick={() => resetRace()}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-white hover:bg-white/10"
                  >
                    <RefreshCcw className="h-5 w-5" />
                    Reset
                  </button>

                  <button
                    onClick={() => resetRace(Date.now() % 2147483647)}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-white hover:bg-white/10"
                  >
                    New seed
                  </button>
                </div>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/30">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-[#d4af37] to-orange-400"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="space-y-2 p-3 sm:p-5">
              {liveRunners.map((runner) => {
                const rank = rankByRunnerId.get(runner.id);

                return (
                  <div
                    key={runner.id}
                    className="grid grid-cols-[38px,minmax(0,1fr),44px] items-center gap-2 rounded-2xl border border-white/[0.07] bg-[#071a2f] p-2 sm:grid-cols-[44px,180px,minmax(0,1fr),54px] sm:gap-3 sm:p-3"
                  >
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black text-[#071a2f]"
                      style={{ backgroundColor: runner.silkColor }}
                    >
                      {runner.lane}
                    </div>

                    <div className="hidden min-w-0 sm:block">
                      <div className="truncate font-black text-white">
                        {runner.horseName}
                      </div>
                      <div className="truncate text-xs text-gray-400">
                        {runner.jockeyName} • R{runner.rating} • {runner.carriedWeight}lb
                      </div>
                    </div>

                    <div
                      className="relative h-12 overflow-hidden rounded-xl border border-white/10 bg-[#102f31]"
                      style={{
                        backgroundImage:
                          'linear-gradient(90deg, transparent 24.7%, rgba(255,255,255,.12) 25%, transparent 25.3%, transparent 49.7%, rgba(255,255,255,.12) 50%, transparent 50.3%, transparent 74.7%, rgba(255,255,255,.12) 75%, transparent 75.3%)',
                      }}
                    >
                      <div className="absolute inset-y-0 left-[18px] right-[18px]">
                        <div
                          data-finish-line
                          className="absolute inset-y-0 right-0 z-20 w-1 translate-x-1/2 bg-[repeating-linear-gradient(0deg,#fff_0_4px,#111_4px_8px)] opacity-80"
                        />
                        <div
                          data-runner-marker={runner.id}
                          className="absolute top-1/2 z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white shadow-lg"
                          style={{
                            left: `${runner.progress * 100}%`,
                            backgroundColor: runner.silkColor,
                            boxShadow: `0 0 18px ${runner.silkColor}80`,
                          }}
                          title={`${runner.horseName}: ${Math.round(runner.progress * 100)}%`}
                        >
                          <span className="text-base">♞</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-center">
                      <div
                        className={`text-xl font-black ${
                          rank === 1 ? 'text-[#f6d77a]' : 'text-white'
                        }`}
                      >
                        P{rank}
                      </div>
                      <div className="text-[10px] uppercase text-gray-500">
                        {Math.round(runner.progress * 100)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="space-y-5">
            <div className="rounded-3xl border border-white/10 bg-[#0b223d] p-5">
              <div className="mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-[#d4af37]" />
                <h2 className="text-xl font-black">Live leaderboard</h2>
              </div>

              <div className="space-y-2">
                {rankedRunners.map((runner, index) => (
                  <div
                    key={runner.id}
                    className={`grid grid-cols-[32px,12px,1fr] items-center gap-3 rounded-xl border p-3 ${
                      index === 0
                        ? 'border-[#d4af37]/30 bg-[#d4af37]/10'
                        : 'border-white/[0.06] bg-[#071a2f]'
                    }`}
                  >
                    <span className="font-black text-white">{index + 1}</span>
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: runner.silkColor }}
                    />
                    <span className="truncate text-sm font-bold text-gray-200">
                      {runner.horseName}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-cyan-400/15 bg-cyan-400/[0.06] p-5">
              <div className="flex items-center gap-2 text-cyan-300">
                <ShieldCheck className="h-5 w-5" />
                <h2 className="font-black">Integration boundary</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-300">
                This preview never changes race status, official rating, handicap,
                results, or referee reports.
              </p>
            </div>
          </aside>
        </div>

        <section className="mt-6 rounded-3xl border border-white/10 bg-[#0b223d] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-[#d4af37]" />
                <h2 className="text-2xl font-black">Referee draft preview</h2>
              </div>
              <p className="mt-2 text-sm text-gray-400">
                Load provisional values after the simulation, then edit them locally.
              </p>
            </div>

            <button
              onClick={loadRefereeDraft}
              disabled={status !== 'finished'}
              className="rounded-xl bg-white px-5 py-3 font-black text-[#071a2f] transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Load provisional results
            </button>
          </div>

          {refereeDrafts.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-[#071a2f] p-6 text-center text-gray-500">
              Finish the preview to inspect the referee form.
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-3 py-3">Horse</th>
                    <th className="px-3 py-3">Position</th>
                    <th className="px-3 py-3">Finish time</th>
                    <th className="px-3 py-3">Referee notes</th>
                  </tr>
                </thead>
                <tbody>
                  {refereeDrafts.map((draft) => {
                    const runner = plan.runners.find((item) => item.id === draft.id);

                    if (!runner) return null;

                    return (
                      <tr key={draft.id} className="border-t border-white/[0.07]">
                        <td className="px-3 py-3 font-bold text-white">
                          {runner.horseName}
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min={1}
                            max={plan.runners.length}
                            value={draft.position}
                            onChange={(event) =>
                              updateDraft(draft.id, {
                                position: Number(event.target.value),
                              })
                            }
                            className="w-24 rounded-xl border border-white/10 bg-[#071a2f] px-3 py-2 text-white"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            value={draft.finishTime}
                            onChange={(event) =>
                              updateDraft(draft.id, {
                                finishTime: event.target.value,
                              })
                            }
                            className="w-36 rounded-xl border border-white/10 bg-[#071a2f] px-3 py-2 text-white"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            value={draft.notes}
                            onChange={(event) =>
                              updateDraft(draft.id, { notes: event.target.value })
                            }
                            placeholder="Incident or correction"
                            className="w-full min-w-[240px] rounded-xl border border-white/10 bg-[#071a2f] px-3 py-2 text-white"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm font-semibold text-amber-100">
                Preview only: there is intentionally no submit endpoint on this branch.
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
