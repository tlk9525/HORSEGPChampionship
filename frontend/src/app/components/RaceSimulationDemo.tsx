import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useNavigate,
  useParams,
} from 'react-router-dom';
import {
  CirclePause,
  CirclePlay,
  Clock3,
  Gauge,
  RefreshCcw,
  ShieldCheck,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import {
  AuthUser,
  HorseRecord,
  RaceEntryRecord,
  RaceRecord,
  getBootstrap,
} from '../services/api';
import { statusLabel as domainStatusLabel } from '../utils/domain';
import {
  clamp,
  createRaceSimulationPlan,
  formatRaceSimulationTime,
  hashRaceSeed,
  normalizeRaceSurface,
  parseRaceDistanceMeters,
  progressForRunner,
} from '../utils/raceSimulation';

type PreviewStatus = 'ready' | 'running' | 'paused' | 'finished';

interface RefereeDraft {
  id: string;
  position: number;
  finishTime: string;
  notes: string;
}

interface RaceSimulationDemoProps {
  currentUser: AuthUser | null;
}

const previewStatusLabel: Record<PreviewStatus, string> = {
  ready: 'Ready to replay',
  running: 'Simulation running',
  paused: 'Simulation paused',
  finished: 'Simulation finished',
};

const raceSortValue = (race: RaceRecord) => {
  const scheduledAt = new Date(`${race.date || race.raceDate || ''}T${race.time || race.raceTime || '00:00'}`).getTime();

  return Number.isFinite(scheduledAt) ? scheduledAt : 0;
};

export default function RaceSimulationDemo({
  currentUser,
}: RaceSimulationDemoProps) {
  const { raceId } = useParams();
  const routerNavigate = useNavigate();
  const [races, setRaces] = useState<RaceRecord[]>([]);
  const [entries, setEntries] = useState<RaceEntryRecord[]>([]);
  const [horses, setHorses] = useState<HorseRecord[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState(
    raceId || sessionStorage.getItem('selectedRaceId') || ''
  );
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<PreviewStatus>('ready');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [refereeDrafts, setRefereeDrafts] = useState<RefereeDraft[]>([]);
  const previousFrameRef = useRef<number | null>(null);

  const selectedRace = useMemo(
    () => races.find((race) => race.id === selectedRaceId) || races[0],
    [races, selectedRaceId]
  );

  const selectedEntries = useMemo(
    () =>
      entries
        .filter((entry) => entry.raceId === selectedRace?.id)
        .sort((a, b) => Number(a.lane || 999) - Number(b.lane || 999)),
    [entries, selectedRace?.id]
  );

  const competingEntries = useMemo(
    () =>
      selectedEntries.filter(
        (entry) =>
          entry.status === 'approved' &&
          entry.preRaceStatus !== 'absent' &&
          !entry.disqualified
      ),
    [selectedEntries]
  );

  const recordedDraftEntries = useMemo(
    () =>
      competingEntries.filter(
        (entry) =>
          Number.isFinite(Number(entry.position)) && Boolean(entry.finishTime)
      ),
    [competingEntries]
  );

  const horseById = useMemo(
    () => new Map(horses.map((horse) => [horse.id, horse])),
    [horses]
  );

  const plan = useMemo(() => {
    if (!selectedRace) {
      return createRaceSimulationPlan({
        seed: 1,
        distanceMeters: 1600,
        surface: 'Turf',
        entries: [],
      });
    }

    const seed = hashRaceSeed(
      [
        selectedRace.id,
        selectedRace.createdAt || selectedRace.updatedAt || '',
        selectedRace.distance || '',
        selectedRace.surface || '',
      ].join(':')
    );

    return createRaceSimulationPlan({
      seed,
      distanceMeters: parseRaceDistanceMeters(selectedRace.distance),
      surface: normalizeRaceSurface(selectedRace.surface),
      entries: competingEntries.map((entry) => {
        const horse = horseById.get(entry.horseId);

        return {
          id: entry.id,
          lane: entry.lane,
          horseName: entry.horseName,
          jockeyName: entry.jockeyName,
          ratingSnapshot: entry.ratingSnapshot,
          handicap: entry.handicap,
          horseWeightLb: entry.horseWeightLb,
          jockeyWeightLb: entry.jockeyWeightLb,
          horseSpeedRating: horse?.speedRating,
          horseStaminaRating: horse?.staminaRating,
          horseFormRating: horse?.formRating,
          horseOverallRating: horse?.overallRating,
        };
      }),
    });
  }, [competingEntries, horseById, selectedRace]);

  useEffect(() => {
    getBootstrap()
      .then((data) => {
        const sortedRaces = [...(data.races || [])].sort(
          (a, b) => raceSortValue(a) - raceSortValue(b)
        );

        setRaces(sortedRaces);
        setEntries(data.raceEntries || []);
        setHorses(data.horses || []);
        setSelectedRaceId((current) => {
          const next = raceId || current;

          if (next && sortedRaces.some((race) => race.id === next)) {
            sessionStorage.setItem('selectedRaceId', next);
            return next;
          }

          const fallback = sortedRaces[0]?.id || '';

          if (fallback) {
            sessionStorage.setItem('selectedRaceId', fallback);
          }

          return fallback;
        });
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to load race data')
      );
  }, [raceId]);

  useEffect(() => {
    setStatus('ready');
    setElapsedSeconds(0);
    setRefereeDrafts([]);
    previousFrameRef.current = null;
  }, [selectedRace?.id]);

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
    rankedRunners.map((runner, index) => [runner.entryId, index + 1])
  );
  const progressPercent = plan.durationSeconds > 0
    ? clamp((elapsedSeconds / plan.durationSeconds) * 100, 0, 100)
    : 0;
  const summaryCards: Array<{
    label: string;
    value: string;
    Icon: LucideIcon;
  }> = [
    { label: 'Status', value: previewStatusLabel[status], Icon: Gauge },
    { label: 'Elapsed', value: formatRaceSimulationTime(elapsedSeconds), Icon: Clock3 },
    {
      label: 'Race status',
      value: selectedRace ? domainStatusLabel(selectedRace.status) : '-',
      Icon: Trophy,
    },
    {
      label: 'Field',
      value: `${plan.runners.length}/${selectedEntries.length}`,
      Icon: ShieldCheck,
    },
  ];
  const assignedRefereeIds = String(
    selectedRace?.refereeUserIds || selectedRace?.refereeUserId || ''
  )
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const canPreviewRefereeDraft =
    currentUser?.role === 'referee' &&
    Boolean(selectedRace?.id) &&
    assignedRefereeIds.includes(currentUser.id) &&
    selectedRace?.status === 'finished' &&
    selectedRace?.resultStatus === 'draft';
  const canRunPreview = plan.runners.length > 0;

  const resetRace = () => {
    setStatus('ready');
    setElapsedSeconds(0);
    setRefereeDrafts([]);
    previousFrameRef.current = null;
  };

  const selectRace = (nextRaceId: string) => {
    sessionStorage.setItem('selectedRaceId', nextRaceId);
    setSelectedRaceId(nextRaceId);
    routerNavigate(`/simulation-demo/${nextRaceId}`);
  };

  const loadRefereeDraft = () => {
    if (recordedDraftEntries.length === 0) {
      setRefereeDrafts([]);
      setMessage('No provisional results have been recorded for this race yet.');
      return;
    }

    const sourceRows = [...recordedDraftEntries].sort((a, b) => {
      const positionA = Number(a.position || 999);
      const positionB = Number(b.position || 999);

      if (positionA !== positionB) return positionA - positionB;

      return String(a.finishTime || '').localeCompare(String(b.finishTime || ''));
    });

    setRefereeDrafts(
      sourceRows.map((runner, index) => ({
        id: runner.id,
        position: Number.isFinite(Number(runner.position)) ? Number(runner.position) : index + 1,
        finishTime: runner.finishTime || '',
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
                <Gauge className="h-4 w-4" />
                Race-linked replay
              </span>
              <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200">
                Read-only • No database writes
              </span>
            </div>

            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
              {selectedRace?.name || 'Race Simulation'}
            </h1>
            <p className="mt-2 max-w-3xl text-gray-400">
              Uses the selected race&apos;s distance, surface, gates, ratings and assigned weights.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[280px] text-xs font-bold uppercase tracking-wider text-gray-400">
              Race
              <select
                value={selectedRace?.id || ''}
                disabled={status === 'running'}
                onChange={(event) => selectRace(event.target.value)}
                className="mt-1 block w-full rounded-xl border border-white/10 bg-[#0d2945] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
              >
                {races.map((race) => (
                  <option key={race.id} value={race.id}>
                    {race.name}
                  </option>
                ))}
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

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 font-semibold text-red-200">
            {message}
          </div>
        )}

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

        {!selectedRace ? (
          <div className="rounded-3xl border border-white/10 bg-[#0b223d] p-8 text-gray-400">
            No race is available for this role yet.
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),340px]">
            <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b223d] shadow-2xl shadow-black/20">
              <div className="border-b border-white/10 bg-gradient-to-r from-[#12304f] to-[#0b223d] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-black uppercase tracking-[0.2em] text-[#d4af37]">
                      {plan.distanceMeters.toLocaleString()}m • {plan.surface} • {selectedRace.raceClass || 'Race class pending'}
                    </div>
                    <div className="mt-1 text-sm text-gray-400">
                      Checkpoints every {plan.distanceMeters <= 1200 ? 50 : 100}m • live order is visual only.
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        setStatus((current) =>
                          current === 'running' ? 'paused' : 'running'
                        )
                      }
                      disabled={status === 'finished' || !canRunPreview}
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
                          ? 'Resume replay'
                          : 'Play replay'}
                    </button>

                    <button
                      onClick={resetRace}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-white hover:bg-white/10"
                    >
                      <RefreshCcw className="h-5 w-5" />
                      Restart replay
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
                {liveRunners.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-[#071a2f] p-6 text-center text-gray-500">
                    This race has no visible approved runners to simulate yet.
                  </div>
                )}

                {liveRunners.map((runner) => {
                  const rank = rankByRunnerId.get(runner.entryId);

                  return (
                    <div
                      key={runner.entryId}
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
                            data-runner-marker={runner.entryId}
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
                  {rankedRunners.length === 0 && (
                    <div className="rounded-xl border border-dashed border-white/15 bg-[#071a2f] p-4 text-sm text-gray-500">
                      Waiting for race entries.
                    </div>
                  )}

                  {rankedRunners.map((runner, index) => (
                    <div
                      key={runner.entryId}
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
                  This preview reads race data but never changes race status,
                  official rating, handicap, results, or referee reports.
                </p>
              </div>
            </aside>
          </div>
        )}

        {selectedRace && canPreviewRefereeDraft && (
          <section className="mt-6 rounded-3xl border border-white/10 bg-[#0b223d] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-6 w-6 text-[#d4af37]" />
                  <h2 className="text-2xl font-black">Referee confirmation box</h2>
                </div>
                <p className="mt-2 text-sm text-gray-400">
                  Only the referee assigned to this race can load and confirm the provisional rank and time saved on this race.
                </p>
              </div>

              <button
                onClick={loadRefereeDraft}
                disabled={status !== 'finished' || !canRunPreview}
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
                      const runner = plan.runners.find((item) => item.entryId === draft.id);

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
        )}
      </div>
    </div>
  );
}
