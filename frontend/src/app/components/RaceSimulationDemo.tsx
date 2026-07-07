import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  RaceEntryRecord,
  RaceRecord,
  getBootstrap,
} from '../services/api';
import {
  formatRaceSimulationTime,
  normalizeOfficialReplayRunners,
  progressForRunner,
} from '../utils/raceSimulation';

type ReplayStatus = 'ready' | 'running' | 'paused' | 'finished';

const raceSortValue = (race: RaceRecord) => {
  const scheduledAt = new Date(
    `${race.date || race.raceDate || ''}T${race.time || race.raceTime || '00:00'}`
  ).getTime();

  return Number.isFinite(scheduledAt) ? scheduledAt : 0;
};

const parseFinishTimeSeconds = (value?: string) => {
  if (!value) return Number.NaN;

  const segments = value.trim().split(':');

  if (segments.length === 3) {
    const [hours, minutes, seconds] = segments.map(Number);
    if ([hours, minutes, seconds].every(Number.isFinite)) {
      return hours * 3600 + minutes * 60 + seconds;
    }
  }

  if (segments.length === 2) {
    const [minutes, seconds] = segments;
    const parsedMinutes = Number(minutes);
    const parsedSeconds = Number(seconds);

    if (Number.isFinite(parsedMinutes) && Number.isFinite(parsedSeconds)) {
      return parsedMinutes * 60 + parsedSeconds;
    }
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const isOfficialReplayEntry = (entry: RaceEntryRecord) =>
  entry.status === 'approved' &&
  entry.preRaceStatus !== 'absent' &&
  !entry.disqualified &&
  Number.isFinite(Number(entry.position)) &&
  Boolean(entry.finishTime);

export default function RaceSimulationDemo() {
  const { raceId } = useParams();
  const routerNavigate = useNavigate();
  const [races, setRaces] = useState<RaceRecord[]>([]);
  const [entries, setEntries] = useState<RaceEntryRecord[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState(
    raceId || sessionStorage.getItem('selectedRaceId') || ''
  );
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<ReplayStatus>('ready');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const frameRef = useRef<number | null>(null);
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

  const replayEntries = useMemo(
    () =>
    selectedEntries
        .filter(isOfficialReplayEntry)
        .map((entry) => ({
          ...entry,
          positionValue: Number(entry.position),
          finishSeconds: parseFinishTimeSeconds(entry.finishTime),
          displayGate: Number(entry.lane || Number(entry.position)),
          silkColor: '#d4af37',
        }))
        .filter((entry) => Number.isFinite(entry.positionValue) && Number.isFinite(entry.finishSeconds))
        .sort((a, b) => {
          if (a.positionValue !== b.positionValue) return a.positionValue - b.positionValue;
          if (a.finishSeconds !== b.finishSeconds) return a.finishSeconds - b.finishSeconds;
          return Number(a.lane || 999) - Number(b.lane || 999);
        }),
    [selectedEntries]
  );
  const replayTimelineRunners = selectedRace?.replayTimeline?.runners || [];
  const normalizedReplayTimelineRunners = useMemo(
    () => normalizeOfficialReplayRunners(replayTimelineRunners, selectedRace),
    [replayTimelineRunners, selectedRace?.distance, selectedRace?.surface]
  );
  const isCompletedReplay =
    ['finished', 'completed'].includes(selectedRace?.status || '') &&
    ((replayTimelineRunners.length > 0 && normalizedReplayTimelineRunners.length > 0) ||
      replayEntries.length > 0);

  const maxFinishSeconds = useMemo(
    () =>
      replayEntries.reduce(
        (max, entry) => Math.max(max, entry.finishSeconds),
        0
      ),
    [replayEntries]
  );
  const timelineDurationSeconds =
    selectedRace?.replayTimeline?.durationSeconds || maxFinishSeconds;

  const selectedEntriesById = useMemo(
    () => new Map(selectedEntries.map((entry) => [entry.id, entry])),
    [selectedEntries]
  );

  const rankByEntryId = useMemo(
    () => new Map(replayEntries.map((entry) => [entry.id, entry.positionValue])),
    [replayEntries]
  );
  const officialRows = useMemo(
    () => {
      if (replayTimelineRunners.length > 0) {
        return [...normalizedReplayTimelineRunners]
          .sort(
            (a, b) =>
              Number(a.displayGate || a.lane || 999) -
              Number(b.displayGate || b.lane || 999)
          )
          .map((runner) => ({
          ...runner,
          id: runner.entryId,
          positionValue: runner.position,
          progress: progressForRunner(runner, elapsedSeconds),
        }));
      }

      return [...replayEntries]
        .sort(
          (a, b) =>
            Number(a.displayGate || a.lane || 999) -
            Number(b.displayGate || b.lane || 999)
        )
          .map((entry) => ({
          ...entry,
          id: entry.id,
          positionValue: entry.positionValue,
          displayGate: entry.displayGate ?? entry.lane ?? entry.positionValue,
          silkColor: entry.silkColor ?? '#d4af37',
          progress:
            maxFinishSeconds > 0
              ? Math.min(elapsedSeconds / entry.finishSeconds, 1)
              : 0,
        }));
    },
    [elapsedSeconds, maxFinishSeconds, normalizedReplayTimelineRunners, replayEntries, replayTimelineRunners]
  );
  const officialFieldCount = replayTimelineRunners.length > 0
    ? normalizedReplayTimelineRunners.length
    : replayEntries.length;

  useEffect(() => {
    getBootstrap()
      .then((data) => {
        const sortedRaces = [...(data.races || [])].sort(
          (a, b) => raceSortValue(a) - raceSortValue(b)
        );

        setRaces(sortedRaces);
        setEntries(data.raceEntries || []);
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
    setStatus(isCompletedReplay ? 'finished' : 'ready');
    setElapsedSeconds(isCompletedReplay ? timelineDurationSeconds : 0);
    previousFrameRef.current = null;

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, [isCompletedReplay, selectedRace?.id, timelineDurationSeconds]);

  useEffect(() => {
    if (status !== 'running') {
      previousFrameRef.current = null;
      return;
    }

    let activeFrameId = 0;

    const advance = (timestamp: number) => {
      const previousTimestamp = previousFrameRef.current ?? timestamp;
      const deltaSeconds = Math.min((timestamp - previousTimestamp) / 1000, 0.25);
      previousFrameRef.current = timestamp;

      setElapsedSeconds((current) =>
        Math.min(timelineDurationSeconds, current + deltaSeconds * playbackSpeed)
      );

      activeFrameId = window.requestAnimationFrame(advance);
    };

    activeFrameId = window.requestAnimationFrame(advance);
    frameRef.current = activeFrameId;

    return () => window.cancelAnimationFrame(activeFrameId);
  }, [playbackSpeed, status, timelineDurationSeconds]);

  useEffect(() => {
    if (status === 'running' && elapsedSeconds >= timelineDurationSeconds && timelineDurationSeconds > 0) {
      setStatus('finished');
    }
  }, [elapsedSeconds, status, timelineDurationSeconds]);

  const progressPercent =
    timelineDurationSeconds > 0
      ? Math.min((elapsedSeconds / timelineDurationSeconds) * 100, 100)
      : 0;

  const summaryCards: Array<{
    label: string;
    value: string;
    Icon: LucideIcon;
  }> = [
    { label: 'Status', value: status === 'running' ? 'Running' : status === 'paused' ? 'Paused' : status === 'finished' ? 'Finished' : 'Ready', Icon: Gauge },
    { label: 'Elapsed', value: formatRaceSimulationTime(elapsedSeconds), Icon: Clock3 },
    {
      label: 'Race status',
      value: selectedRace?.status || '-',
      Icon: Trophy,
    },
    {
      label: 'Official field',
      value: `${officialFieldCount}/${selectedEntries.length}`,
      Icon: ShieldCheck,
    },
  ];

  const resetReplay = () => {
    setStatus('ready');
    setElapsedSeconds(0);
    previousFrameRef.current = null;
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  };

  const primaryActionLabel =
    status === 'running'
      ? 'Pause'
      : status === 'paused'
        ? 'Resume replay'
        : status === 'finished'
          ? 'Replay complete'
          : 'Play replay';

  const selectRace = (nextRaceId: string) => {
    sessionStorage.setItem('selectedRaceId', nextRaceId);
    setSelectedRaceId(nextRaceId);
    routerNavigate(`/simulation-demo/${nextRaceId}`);
  };

  return (
    <div className="min-h-screen bg-[#061526] pb-16 pt-16 text-white">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                <Gauge className="h-4 w-4" />
                Race Replay
              </span>
              <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200">
                Read-only • Official results only
              </span>
            </div>

            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
              {selectedRace?.name || 'Race Replay'}
            </h1>
            <p className="mt-2 max-w-3xl text-gray-400">
              Uses the race&apos;s recorded positions and finish times. The animation is visual only.
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
            No race is available for replay yet.
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),340px]">
            <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b223d] shadow-2xl shadow-black/20">
              <div className="border-b border-white/10 bg-gradient-to-r from-[#12304f] to-[#0b223d] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-black uppercase tracking-[0.2em] text-[#d4af37]">
                      {selectedRace.distance || 'Distance pending'} • {selectedRace.surface || 'Surface pending'} • {selectedRace.raceClass || 'Race class pending'}
                    </div>
                    <div className="mt-1 text-sm text-gray-400">
                      Official replay order comes from saved positions; movement is visual only.
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        setStatus((current) =>
                          current === 'running' ? 'paused' : 'running'
                        )
                      }
                      disabled={replayEntries.length === 0 || status === 'finished'}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#d4af37] px-5 py-3 font-black text-[#071a2f] transition hover:bg-[#e7c95d] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {status === 'running' ? (
                        <CirclePause className="h-5 w-5" />
                      ) : (
                        <CirclePlay className="h-5 w-5" />
                      )}
                      {primaryActionLabel}
                    </button>

                    <button
                      onClick={resetReplay}
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
                {replayEntries.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-[#071a2f] p-6 text-center text-gray-500">
                    This race has no official results yet.
                  </div>
                )}

                  {officialRows.map((runner) => {
                  const visibleEntry = selectedEntriesById.get(runner.id);
                  const rank = runner.positionValue || rankByEntryId.get(runner.id) || Number(visibleEntry?.position || 0);
                  const gateNumber = Number(runner.displayGate || runner.lane || visibleEntry?.lane || 0);
                  const runnerColor = runner.silkColor || '#d4af37';

                  return (
                    <div
                      key={runner.id}
                      className="grid grid-cols-[38px,minmax(0,1fr),54px] items-center gap-2 rounded-2xl border border-white/[0.07] bg-[#071a2f] p-2 sm:grid-cols-[44px,180px,minmax(0,1fr),54px] sm:gap-3 sm:p-3"
                    >
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black text-[#071a2f]"
                        style={{
                          backgroundColor: runnerColor,
                          boxShadow: `0 0 0 1px ${runnerColor}55 inset`,
                        }}
                      >
                        {gateNumber || '-'}
                      </div>

                      <div className="hidden min-w-0 sm:block">
                        <div className="truncate font-black text-white">
                          {visibleEntry?.horseName || runner.horseName}
                        </div>
                        <div className="truncate text-xs text-gray-400">
                          {visibleEntry?.jockeyName || runner.jockeyName} • Position {rank} • {visibleEntry?.finishTime}
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
                            className="absolute inset-y-0 right-0 z-20 w-1 translate-x-1/2 bg-[repeating-linear-gradient(0deg,#fff_0_4px,#111_4px_8px)] opacity-80"
                          />
                          <div
                            className="absolute top-1/2 z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white shadow-lg"
                            style={{
                            left: `${runner.progress * 100}%`,
                              backgroundColor: runnerColor,
                              boxShadow: `0 0 18px ${runnerColor}80`,
                            }}
                            title={`${visibleEntry?.horseName || runner.horseName}: ${Math.round(runner.progress * 100)}%`}
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
                  <h2 className="text-xl font-black">Official leaderboard</h2>
                </div>

                <div className="space-y-2">
                  {replayEntries.length === 0 && (
                    <div className="rounded-xl border border-dashed border-white/15 bg-[#071a2f] p-4 text-sm text-gray-500">
                      Waiting for official results.
                    </div>
                  )}

                  {replayEntries.map((runner, index) => (
                    <div
                      key={runner.id}
                      className={`grid grid-cols-[32px,12px,1fr] items-center gap-3 rounded-xl border p-3 ${
                        index === 0
                          ? 'border-[#d4af37]/30 bg-[#d4af37]/10'
                          : 'border-white/[0.06] bg-[#071a2f]'
                      }`}
                    >
                      <span className="font-black text-white">{runner.positionValue}</span>
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: runner.silkColor || '#d4af37' }} />
                      <span className="truncate text-sm font-bold text-gray-200">
                        {runner.horseName} • {runner.finishTime}
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
                  This replay reads official raceEntries and never changes race status, results, or referee reports.
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
