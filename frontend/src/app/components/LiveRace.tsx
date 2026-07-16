import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useNavigate,
  useParams,
} from 'react-router-dom';
import { Circle, ShieldCheck, Timer, Trophy } from 'lucide-react';
import {
  AuthUser,
  HorseRecord,
  RaceEntryRecord,
  RaceEntryReadiness,
  RaceRecord,
  getBootstrap,
  getLiveRaceEventsUrl,
  getMe,
  markRaceEntryReadiness,
  recordRaceResult,
  submitRaceResults,
} from '../services/api';
import { formatWeightLb, statusLabel } from '../utils/domain';
import { messageToneClasses } from '../utils/messageTone';
import {
  clamp,
  createRaceSimulationPlan,
  formatRaceSimulationTime,
  hashRaceSeed,
  normalizeRaceSurface,
  normalizeOfficialReplayRunners,
  parseRaceDistanceMeters,
  progressForRunner,
  raceSimulationOutcomeLabel,
  sortRaceDisplayRunners,
} from '../utils/raceSimulation';

interface DisplayRunnerRow {
  keyId: string;
  lane: number | null;
  horseName: string;
  jockeyName: string;
  silkColor: string;
  rating: number;
  carriedWeight: number;
  progress: number;
  position?: number;
  finishTime?: string;
  liveRank?: number;
  simulationOutcome?: ResultOutcome;
  incidentReason?: string;
  nonFinishRisk?: number;
}

type ResultOutcome = 'finished' | 'dnf' | 'fell' | 'injured' | 'disqualified';

const resultOutcomeOptions: Array<{ value: ResultOutcome; label: string }> = [
  { value: 'finished', label: 'Finished normally' },
  { value: 'dnf', label: 'DNF' },
  { value: 'fell', label: 'Fell / Nhao' },
  { value: 'injured', label: 'Injured' },
  { value: 'disqualified', label: 'Disqualified' },
];

const resultOutcomeLabel = (value?: string) =>
  resultOutcomeOptions.find((option) => option.value === value)?.label || 'Finished normally';

// Ghi chú: Hàm này phân tích nghiệp vụ liên quan đến parse finish time seconds.
const parseFinishTimeSeconds = (value?: string) => {
  const raw = String(value || '').trim();
  if (!raw) return Number.NaN;

  const parts = raw.split(':');
  if (parts.length === 2) {
    const [minutes, secondsAndMs] = parts;
    const [seconds, fraction = '0'] = String(secondsAndMs).split('.');
    const parsedMinutes = Number(minutes);
    const parsedSeconds = Number(seconds);
    const parsedFraction = Number(fraction.padEnd(3, '0').slice(0, 3));

    if (
      Number.isFinite(parsedMinutes) &&
      Number.isFinite(parsedSeconds) &&
      Number.isFinite(parsedFraction)
    ) {
      return parsedMinutes * 60 + parsedSeconds + parsedFraction / 1000;
    }
  }

  if (parts.length === 3) {
    const [hours, minutes, secondsAndMs] = parts;
    const [seconds, fraction = '0'] = String(secondsAndMs).split('.');
    const parsedHours = Number(hours);
    const parsedMinutes = Number(minutes);
    const parsedSeconds = Number(seconds);
    const parsedFraction = Number(fraction.padEnd(3, '0').slice(0, 3));

    if (
      Number.isFinite(parsedHours) &&
      Number.isFinite(parsedMinutes) &&
      Number.isFinite(parsedSeconds) &&
      Number.isFinite(parsedFraction)
    ) {
      return parsedHours * 3600 + parsedMinutes * 60 + parsedSeconds + parsedFraction / 1000;
    }
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

// Ghi chú: Hàm này render màn hình race đang chạy và cập nhật tiến độ realtime.
export default function LiveRace() {
  const { raceId } = useParams();
  const routerNavigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [races, setRaces] = useState<RaceRecord[]>([]);
  const [entries, setEntries] = useState<RaceEntryRecord[]>([]);
  const [horses, setHorses] = useState<HorseRecord[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState(
    raceId || sessionStorage.getItem('selectedRaceId') || ''
  );
  const [message, setMessage] = useState('');
  const [resultDrafts, setResultDrafts] = useState<
    Record<string, { resultOutcome: ResultOutcome; position: string; finishTime: string; notes: string; incidentReason: string; violationNotes: string }>
  >({});
  const [recordingEntryId, setRecordingEntryId] = useState('');
  const [readinessEntryId, setReadinessEntryId] = useState('');
  const [publishingResults, setPublishingResults] = useState(false);
  const [simulationNowMs, setSimulationNowMs] = useState(() => Date.now());
  const loadRequestIdRef = useRef(0);

  const selectedRace = useMemo(
    () => races.find((race) => race.id === selectedRaceId) || races[0],
    [races, selectedRaceId]
  );

  const selectedEntries = useMemo(
    () => entries.filter((entry) => entry.raceId === selectedRace?.id),
    [entries, selectedRace?.id]
  );

  const activeEntries = useMemo(
    () => selectedEntries.filter((entry) => entry.status === 'approved'),
    [selectedEntries]
  );

  const competingEntries = useMemo(
    () => activeEntries.filter(
      (entry) => entry.preRaceStatus !== 'absent' && !entry.disqualified
    ),
    [activeEntries]
  );

  const horseById = useMemo(
    () => new Map(horses.map((horse) => [horse.id, horse])),
    [horses]
  );

  const simulationPlan = useMemo(() => {
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
        selectedRace.updatedAt || selectedRace.createdAt || '',
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
          horseHealthRating: horse?.healthRating,
          horseOverallRating: horse?.overallRating,
        };
      }),
    });
  }, [competingEntries, horseById, selectedRace]);

  const raceStartMs = selectedRace?.status === 'in-progress'
    ? Date.parse(selectedRace.updatedAt || '')
    : Number.NaN;
  const simulationElapsedSeconds =
    selectedRace?.status === 'in-progress'
      ? clamp(
        ((simulationNowMs - (Number.isFinite(raceStartMs) ? raceStartMs : simulationNowMs)) / 1000),
        0,
        simulationPlan.durationSeconds
      )
      : ['finished', 'completed'].includes(selectedRace?.status || '')
        ? simulationPlan.durationSeconds
        : 0;
  const simulationProgressPercent = simulationPlan.durationSeconds > 0
    ? clamp((simulationElapsedSeconds / simulationPlan.durationSeconds) * 100, 0, 100)
    : 0;
  const liveSimulationRunners = simulationPlan.runners.map((runner) => ({
    ...runner,
    progress: progressForRunner(runner, simulationElapsedSeconds),
  }));
  const rankedSimulationRunners = [...liveSimulationRunners].sort((a, b) => {
    if (simulationElapsedSeconds === 0) return a.lane - b.lane;
    if (b.progress !== a.progress) return b.progress - a.progress;
    return a.finishTimeSeconds - b.finishTimeSeconds;
  });
  const simulationRankByEntryId = new Map(
    rankedSimulationRunners.map((runner, index) => [runner.entryId, index + 1])
  );
  const simulationFinishedVisually =
    simulationPlan.durationSeconds > 0 &&
    simulationElapsedSeconds >= simulationPlan.durationSeconds;
  const officialTimelineRunners = selectedRace?.replayTimeline?.runners || [];
  const normalizedOfficialTimelineRunners = useMemo(
    () => normalizeOfficialReplayRunners(officialTimelineRunners, selectedRace),
    [officialTimelineRunners, selectedRace?.distance, selectedRace?.surface]
  );
  const officialReplayEntries = useMemo<DisplayRunnerRow[]>(() => {
    if (normalizedOfficialTimelineRunners.length > 0) {
      const rows = normalizedOfficialTimelineRunners.map((runner) => ({
          keyId: runner.entryId,
          lane: runner.lane,
          horseName: runner.horseName,
          jockeyName: runner.jockeyName,
          silkColor: runner.silkColor,
          rating: runner.rating,
          carriedWeight: runner.carriedWeight,
          progress: progressForRunner(runner, simulationElapsedSeconds),
          position: runner.position,
          finishTime: runner.finishTime,
        }));

      const orderedRows =
        simulationElapsedSeconds >= simulationPlan.durationSeconds
          ? [...rows].sort((a, b) => {
            const positionA = Number(a.position || 999);
            const positionB = Number(b.position || 999);

            if (positionA !== positionB) return positionA - positionB;

            return String(a.keyId).localeCompare(String(b.keyId));
          })
          : sortRaceDisplayRunners(rows);

      return orderedRows.map((runner, index) => ({
        ...runner,
        liveRank: index + 1,
      }));
    }

    const fallbackEntries = [...selectedEntries]
      .filter(
        (entry) =>
          entry.status === 'approved' &&
          entry.preRaceStatus !== 'absent' &&
          !entry.disqualified &&
          Number.isFinite(Number(entry.position)) &&
          Boolean(entry.finishTime)
      )
      .sort((a, b) => {
        const positionA = Number(a.position || 999);
        const positionB = Number(b.position || 999);

        if (positionA !== positionB) return positionA - positionB;

        return String(a.finishTime || '').localeCompare(String(b.finishTime || ''));
      });
    const fallbackMaxFinishSeconds = fallbackEntries.reduce((max, entry) => {
      const finishSeconds = parseFinishTimeSeconds(entry.finishTime);
      return Number.isFinite(finishSeconds) ? Math.max(max, finishSeconds) : max;
    }, 0);

    return fallbackEntries.map((entry) => {
      const finishSeconds = parseFinishTimeSeconds(entry.finishTime);

      return {
        keyId: entry.id,
        lane: entry.lane,
        horseName: entry.horseName || 'Unknown horse',
        jockeyName: entry.jockeyName || 'Unknown jockey',
        silkColor: '#d4af37',
        rating: Number(entry.ratingSnapshot || 0),
        carriedWeight: Number(entry.handicap || 0),
        progress:
          fallbackMaxFinishSeconds > 0 && Number.isFinite(finishSeconds)
            ? Math.min(finishSeconds / fallbackMaxFinishSeconds, 1)
            : 0,
        position: Number(entry.position || 0),
        finishTime: entry.finishTime || '',
      };
    });
  }, [normalizedOfficialTimelineRunners, selectedEntries, simulationElapsedSeconds]);
  const hasOfficialReplayData =
    normalizedOfficialTimelineRunners.length > 0 || officialReplayEntries.length > 0;
  const officialReplayMode =
    ['finished', 'completed'].includes(selectedRace?.status || '') && hasOfficialReplayData;
  const displayEntries: DisplayRunnerRow[] = officialReplayMode
    ? officialReplayEntries
    : liveSimulationRunners.map((runner) => ({
      keyId: runner.entryId,
      lane: runner.lane,
      horseName: runner.horseName,
      jockeyName: runner.jockeyName,
      silkColor: runner.silkColor,
      rating: runner.rating,
      carriedWeight: runner.carriedWeight,
      progress: runner.progress,
      simulationOutcome: runner.simulationOutcome,
      incidentReason: runner.incidentReason,
      nonFinishRisk: runner.nonFinishRisk,
    }));
  const displayRankByEntryId = officialReplayMode
    ? new Map(officialReplayEntries.map((entry) => [entry.keyId, entry.liveRank || 0]))
    : simulationRankByEntryId;
  const displayDistance =
    officialReplayMode && selectedRace?.distance
      ? selectedRace.distance
      : `${simulationPlan.distanceMeters.toLocaleString()}m`;
  const displaySurface =
    officialReplayMode && selectedRace?.surface ? selectedRace.surface : simulationPlan.surface;
  const displayElapsed =
    officialReplayMode && selectedRace?.status !== 'in-progress'
      ? (normalizedOfficialTimelineRunners.find((entry) => entry.position === 1)?.finishTime ||
        selectedEntries.find((entry) => entry.position === 1)?.finishTime ||
        '00:00.000')
      : formatRaceSimulationTime(simulationElapsedSeconds);
  const displayProjected =
    officialReplayMode && selectedRace?.status !== 'in-progress'
      ? displayElapsed
      : formatRaceSimulationTime(simulationPlan.durationSeconds);

  const positionOptions = Array.from(
    { length: competingEntries.length },
    (_, index) => String(index + 1)
  );

  const readyEntries = activeEntries.filter(
    (entry) => entry.preRaceStatus === 'ready' && !entry.disqualified
  );

  const absentEntries = selectedEntries.filter(
    (entry) => entry.preRaceStatus === 'absent' || entry.disqualified
  );

  const incidentEntries = activeEntries.filter(
    (entry) => entry.preRaceStatus === 'incident' && !entry.disqualified
  );

  const uncheckedEntries = activeEntries.filter(
    (entry) =>
      !['ready', 'absent'].includes(entry.preRaceStatus) &&
      !entry.disqualified
  );

  const canOperate =
    currentUser?.role === 'referee' &&
    selectedRace &&
    String(selectedRace.refereeUserIds || selectedRace.refereeUserId || '')
      .split(',')
      .map((id) => id.trim())
      .includes(currentUser.id);
  const showRefereeControl = currentUser?.role === 'referee';

  // Ghi chú: Hàm này tải nghiệp vụ liên quan đến load race ops.
  const loadRaceOps = () => {
    const requestId = ++loadRequestIdRef.current;

    Promise.all([getMe().catch(() => ({ user: null as AuthUser | null })), getBootstrap()])
      .then(([me, data]) => {
        if (requestId !== loadRequestIdRef.current) return;

        const authenticatedUser = me.user;
        setCurrentUser(authenticatedUser);
        const visibleRaces =
          authenticatedUser?.role === 'referee'
            ? data.races.filter((race) =>
              String(race.refereeUserIds || race.refereeUserId || '')
                .split(',')
                .map((id) => id.trim())
                .includes(authenticatedUser.id)
            )
            : data.races;

        setRaces(visibleRaces);
        setEntries(data.raceEntries);
        setHorses(data.horses);
        setSelectedRaceId((current) => {
          const next = raceId || current;

          if (next && visibleRaces.some((race) => race.id === next)) {
            sessionStorage.setItem('selectedRaceId', next);
            return next;
          }

          const fallback = visibleRaces[0]?.id || '';

          if (fallback) {
            sessionStorage.setItem('selectedRaceId', fallback);
          }

          return fallback;
        });
      })
      .catch((error) => {
        if (requestId !== loadRequestIdRef.current) return;
        setMessage(error instanceof Error ? error.message : 'Unable to load races');
      });
  };

  useEffect(() => {
    loadRaceOps();
    const timer = window.setInterval(loadRaceOps, 15000);

    return () => window.clearInterval(timer);
  }, [raceId]);

  useEffect(() => {
    if (!selectedRace?.id) return;

    const events = new EventSource(getLiveRaceEventsUrl(selectedRace.id), {
      withCredentials: true,
    });

    events.addEventListener('race-update', () => {
      loadRaceOps();
    });

    events.onerror = () => undefined;

    return () => events.close();
  }, [selectedRace?.id]);

  useEffect(() => {
    if (selectedRace?.status !== 'in-progress') return;

    let frameId = 0;

    // Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến tick.
    const tick = () => {
      setSimulationNowMs(Date.now());
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frameId);
  }, [selectedRace?.status, selectedRace?.updatedAt]);

  // Ghi chú: Hàm này cập nhật bản nháp kết quả trọng tài cho từng race entry.
  const updateDraft = (
    entry: RaceEntryRecord,
    patch: Partial<{ resultOutcome: ResultOutcome; position: string; finishTime: string; notes: string; incidentReason: string; violationNotes: string }>
  ) => {
    setResultDrafts((current) => {
      const existingDraft = current[entry.id];

      return {
        ...current,
        [entry.id]: {
          resultOutcome: existingDraft?.resultOutcome ?? entry.resultOutcome ?? 'finished',
          position: existingDraft?.position ?? (entry.position ? String(entry.position) : ''),
          finishTime: existingDraft?.finishTime ?? entry.finishTime ?? '',
          notes: existingDraft?.notes ?? entry.notes ?? '',
          incidentReason: existingDraft?.incidentReason ?? entry.incidentReason ?? '',
          violationNotes: existingDraft?.violationNotes ?? entry.violationNotes ?? '',
          ...patch,
        },
      };
    });
  };

  // Ghi chú: Hàm này gửi nghiệp vụ liên quan đến submit result.
  const submitResult = (entry: RaceEntryRecord) => {
    const existingDraft = resultDrafts[entry.id];
    const rawDraft = {
      resultOutcome: existingDraft?.resultOutcome ?? entry.resultOutcome ?? 'finished',
      position: existingDraft?.position ?? (entry.position ? String(entry.position) : ''),
      finishTime: existingDraft?.finishTime ?? entry.finishTime ?? '',
      notes: existingDraft?.notes ?? entry.notes ?? '',
      incidentReason: existingDraft?.incidentReason ?? entry.incidentReason ?? '',
      violationNotes: existingDraft?.violationNotes ?? entry.violationNotes ?? '',
    };
    const draft = {
      ...rawDraft,
      position: rawDraft.position,
      finishTime: rawDraft.finishTime,
    };

    if (draft.resultOutcome === 'finished' && !draft.position) {
      setMessage(`Select a position for ${entry.horseName} before recording the result.`);
      return;
    }

    if (draft.resultOutcome === 'finished' && !draft.finishTime) {
      setMessage(`Enter a finish time for ${entry.horseName} before recording the result.`);
      return;
    }

    if (draft.resultOutcome !== 'finished' && !String(draft.incidentReason || draft.notes || draft.violationNotes).trim()) {
      setMessage(`Enter an incident reason for ${entry.horseName} before recording ${resultOutcomeLabel(draft.resultOutcome)}.`);
      return;
    }

    setRecordingEntryId(entry.id);
    setMessage(`Recording ${resultOutcomeLabel(draft.resultOutcome)} for ${entry.horseName}...`);

    recordRaceResult(entry.id, draft)
      .then(() => {
        setMessage(`Result recorded for ${entry.horseName}.`);
        loadRaceOps();
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to record result')
      )
      .finally(() => setRecordingEntryId(''));
  };

  // Ghi chú: Hàm này đánh dấu nghiệp vụ liên quan đến mark readiness.
  const markReadiness = (entry: RaceEntryRecord, readiness: RaceEntryReadiness) => {
    const previousPreRaceStatus = entry.preRaceStatus;
    const previousDisqualified = entry.disqualified;
    const previousStatus = entry.status;
    const previousResultStatus = entry.resultStatus;

    setReadinessEntryId(entry.id);
    setMessage(`Marking ${entry.horseName} ${readiness}...`);
    setEntries((currentEntries) =>
      currentEntries.map((currentEntry) =>
        currentEntry.id === entry.id
          ? {
            ...currentEntry,
            preRaceStatus: readiness,
            disqualified: ['absent', 'scratched'].includes(readiness),
            status: readiness === 'scratched' ? 'scratched' : currentEntry.status,
            resultStatus:
              readiness === 'scratched' ? 'disqualified' : currentEntry.resultStatus,
          }
          : currentEntry
      )
    );

    markRaceEntryReadiness(entry.id, readiness)
      .then(({ entries: updatedRaceEntries }) => {
        const updatedEntriesById = new Map(
          updatedRaceEntries.map((updatedEntry) => [updatedEntry.id, updatedEntry])
        );

        setEntries((currentEntries) =>
          currentEntries.map(
            (currentEntry) => updatedEntriesById.get(currentEntry.id) || currentEntry
          )
        );
        setMessage(`${entry.horseName} marked ${readiness}.`);
      })
      .catch((error) => {
        setEntries((currentEntries) =>
          currentEntries.map((currentEntry) =>
            currentEntry.id === entry.id
              ? {
                ...currentEntry,
                preRaceStatus: previousPreRaceStatus,
                disqualified: previousDisqualified,
                status: previousStatus,
                resultStatus: previousResultStatus,
              }
              : currentEntry
          )
        );
        setMessage(error instanceof Error ? error.message : 'Unable to update readiness');
      })
      .finally(() => setReadinessEntryId(''));
  };

  // Ghi chú: Hàm này gửi nghiệp vụ liên quan đến submit results.
  const submitResults = () => {
    if (!selectedRace) return;

    setPublishingResults(true);
    setMessage('Submitting results for Admin review...');

    submitRaceResults(selectedRace.id)
      .then(({ race, entries }) => {
        if (!race?.id) {
          setMessage('Results were submitted, but the server response did not include the updated race.');
          loadRaceOps();
          return;
        }
        if (
          race.status !== 'finished' ||
          race.resultStatus !== 'submitted' ||
          race.awardsPublished
        ) {
          setMessage('Results were not submitted by the server. Please retry.');
          loadRaceOps();
          return;
        }

        const updatedEntries = Array.isArray(entries) ? entries : [];
        setRaces((current) =>
          current.map((item) => (item.id === race.id ? race : item))
        );
        if (updatedEntries.length > 0) {
          setEntries((current) => {
            const updatedEntryIds = new Set(updatedEntries.map((entry) => entry.id));

            return [
              ...current.filter((entry) => !updatedEntryIds.has(entry.id)),
              ...updatedEntries,
            ];
          });
        }
        setResultDrafts({});
        setMessage('Results submitted. Admin must approve them before the race becomes completed.');
        loadRaceOps();
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to submit results')
      )
      .finally(() => setPublishingResults(false));
  };

  // Ghi chú: Hàm này tải nghiệp vụ liên quan đến load simulation drafts.
  const loadSimulationDrafts = () => {
    if (!selectedRace) return;
    if (selectedRace.status !== 'finished' || selectedRace.resultStatus !== 'draft') {
      setMessage('Admin must finish the race before simulation values can be loaded into referee drafts.');
      return;
    }
    if (simulationPlan.runners.length === 0) {
      setMessage('No competing entries are available for simulation drafts.');
      return;
    }

    const finishedOrder = [...simulationPlan.runners].filter(
      (runner) => runner.simulationOutcome === 'finished'
    ).sort(
      (a, b) => a.finishTimeSeconds - b.finishTimeSeconds
    );

    setResultDrafts((current) => {
      const nextDrafts = { ...current };

      finishedOrder.forEach((runner, index) => {
        const existingDraft = nextDrafts[runner.entryId];
        nextDrafts[runner.entryId] = {
          resultOutcome: existingDraft?.resultOutcome ?? 'finished',
          position: String(index + 1),
          finishTime: formatRaceSimulationTime(runner.finishTimeSeconds),
          notes: existingDraft?.notes ?? '',
          incidentReason: existingDraft?.incidentReason ?? '',
          violationNotes: existingDraft?.violationNotes ?? '',
        };
      });

      simulationPlan.runners
        .filter((runner) => runner.simulationOutcome !== 'finished')
        .forEach((runner) => {
          const existingDraft = nextDrafts[runner.entryId];
          nextDrafts[runner.entryId] = {
            resultOutcome: runner.simulationOutcome,
            position: '',
            finishTime: '',
            notes: existingDraft?.notes ?? '',
            incidentReason: existingDraft?.incidentReason ?? runner.incidentReason,
            violationNotes: existingDraft?.violationNotes ?? '',
          };
        });

      return nextDrafts;
    });
    setMessage('Simulation suggestions loaded. Referee can still edit outcomes before recording each result.');
  };

  return (
    <div className="min-h-screen bg-[#071a2f] pt-24 pb-12">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Circle className="w-3 h-3 fill-[#d4af37] text-[#d4af37]" />
              <span className="text-[#d4af37] font-bold uppercase text-sm">
                Race Operations
              </span>
            </div>

            <h1 className="text-4xl font-black text-white">
              {selectedRace?.name || 'Assigned Races'}
            </h1>

            <p className="text-gray-400 mt-2">
              Referee performs check-in, records draft results, and submits them for Admin review.
            </p>
          </div>

          <select
            value={selectedRace?.id || ''}
            onChange={(event) => {
              const nextRaceId = event.target.value;
              sessionStorage.setItem('selectedRaceId', nextRaceId);
              setSelectedRaceId(nextRaceId);
              routerNavigate(`/live-race/${nextRaceId}`);
            }}
            className="bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white min-w-[280px]"
          >
            {races.map((race) => (
              <option key={race.id} value={race.id}>
                {race.name}
              </option>
            ))}
          </select>
        </div>

        {message && (
          <div className={`mb-6 rounded-2xl border p-4 font-semibold ${messageToneClasses(message)}`}>
            {message}
          </div>
        )}

        {selectedRace && (
          <div
            className={`grid gap-8 ${showRefereeControl
              ? 'lg:grid-cols-[minmax(0,1fr),360px]'
              : 'mx-auto max-w-[1200px] lg:grid-cols-1'
              }`}
          >
            <div className="space-y-5">
              <div className="bg-[#12304f] border border-white/10 rounded-2xl p-6">
                <div className="grid md:grid-cols-4 gap-4">
                  {[
                    ['Status', statusLabel(selectedRace.status)],
                    ['Venue', selectedRace.venue],
                    ['Distance', selectedRace.distance || '-'],
                    ['Referee', selectedRace.referee || '-'],
                    ['Ready', String(readyEntries.length)],
                    ['Absent', String(absentEntries.length)],
                    ['Incident', String(incidentEntries.length)],
                    ['Unchecked', String(uncheckedEntries.length)],
                    ['Can Submit Results', selectedRace.status === 'finished' && selectedRace.resultStatus === 'draft' ? 'Yes' : 'No'],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="bg-[#071a2f] border border-white/10 rounded-xl p-4"
                    >
                      <div className="text-gray-400 text-sm mb-1">{label}</div>
                      <div className="text-white font-bold">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

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
                          : 'Uses this race&apos;s distance, surface, gates, rating snapshots and assigned weights. Visual only until Referee records results.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      {[
                        ['Distance', displayDistance],
                        ['Surface', displaySurface],
                        ['Elapsed', displayElapsed],
                        ['Projected', displayProjected],
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
                      style={{ width: `${simulationProgressPercent}%` }}
                    />
                  </div>

                  {selectedRace.status === 'in-progress' && simulationFinishedVisually && (
                    <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm font-semibold text-amber-100">
                      Visual race is complete. Waiting for Admin to finish the race before Referee can enter results.
                    </div>
                  )}
                </div>

                <div className="space-y-2 p-3 sm:p-5">
                  {displayEntries.length === 0 && (
                    <div className="rounded-xl border border-dashed border-white/15 bg-[#071a2f] p-5 text-center text-gray-500">
                      {officialReplayMode
                        ? 'This race has no official results yet.'
                        : 'Mark at least one approved participant Ready before the race can be simulated.'}
                    </div>
                  )}

                  {displayEntries.map((runner) => {
                    const rank = displayRankByEntryId.get(runner.keyId);

                    return (
                      <div
                        key={runner.keyId}
                        className="grid grid-cols-[38px,minmax(0,1fr),44px] items-center gap-2 rounded-2xl border border-white/[0.07] bg-[#071a2f] p-2 sm:grid-cols-[44px,180px,minmax(0,1fr),54px] sm:gap-3 sm:p-3"
                      >
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black text-[#071a2f]"
                          style={{ backgroundColor: officialReplayMode ? '#d4af37' : runner.silkColor }}
                        >
                          {runner.lane || '-'}
                        </div>

                        <div className="hidden min-w-0 sm:block">
                          <div className="truncate font-black text-white">
                            {runner.horseName}
                          </div>
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
                            {officialReplayMode ? (
                              <div
                                className="absolute top-1/2 z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white shadow-lg"
                                style={{
                                  left: `${runner.progress * 100}%`,
                                  backgroundColor: '#d4af37',
                                  boxShadow: '0 0 18px rgba(212,175,55,0.5)',
                                }}
                                title={`${runner.horseName}: P${rank || '-'}`}
                              >
                                <span className="text-base">♞</span>
                              </div>
                            ) : (
                              <div
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
                            )}
                          </div>
                        </div>

                        <div className="text-center">
                          <div
                            className={`text-xl font-black ${rank === 1 ? 'text-[#f6d77a]' : 'text-white'
                              }`}
                          >
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

              <div className="bg-[#12304f] border border-white/10 rounded-2xl p-6">
                <h2 className="text-2xl font-black text-white mb-5">
                  Race Entries
                </h2>

                <div className="space-y-4">
                  {selectedEntries.length === 0 && (
                    <div className="bg-[#071a2f] border border-white/10 rounded-xl p-4 text-gray-500">
                      No approved entries for this race yet.
                    </div>
                  )}

                  {selectedEntries.map((entry) => {
                    const currentOutcome = resultDrafts[entry.id]?.resultOutcome ?? entry.resultOutcome ?? 'finished';
                    const needsFinishFields = currentOutcome === 'finished';

                    return (
                    <div
                      key={entry.id}
                      className="bg-[#071a2f] border border-white/10 rounded-xl p-4"
                    >
                      <div className="grid lg:grid-cols-[1fr,320px] gap-5">
                        <div>
                          <div className="text-white text-xl font-bold">
                            Gate {entry.lane || 'TBD'} • {entry.horseName}
                          </div>

                          <div className="text-gray-400 mt-1">
                            Jockey: {entry.jockeyName} • Rating {entry.ratingSnapshot ?? 'TBD'} • Assigned Wt. {formatWeightLb(entry.handicap)}
                          </div>

                          <div className="text-[#d4af37] font-bold mt-2">
                            Position: {entry.position || 'Pending'} • Time: {entry.finishTime || 'Pending'}
                          </div>

                          <div className="text-gray-400 text-sm mt-2">
                            Readiness: {statusLabel(entry.preRaceStatus)} • Outcome: {resultOutcomeLabel(entry.resultOutcome)} • Result: {statusLabel(entry.resultStatus || 'draft')}
                          </div>

                          {entry.incidentReason && (
                            <div className="text-orange-300 text-sm mt-2">
                              Incident: {entry.incidentReason}
                            </div>
                          )}

                          {entry.violationNotes && (
                            <div className="text-yellow-400 text-sm mt-2">
                              Violation: {entry.violationNotes}
                            </div>
                          )}
                        </div>

                        {canOperate &&
                          selectedRace.status === 'published' &&
                          entry.status === 'approved' &&
                          !['ready', 'absent'].includes(entry.preRaceStatus) &&
                          !entry.disqualified && (
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                onClick={() => markReadiness(entry, 'ready')}
                                disabled={readinessEntryId === entry.id}
                                className="py-3 bg-green-600/20 text-green-400 border border-green-600/30 disabled:cursor-not-allowed disabled:opacity-60 rounded-xl font-bold"
                              >
                                {readinessEntryId === entry.id ? 'Saving...' : 'Ready'}
                              </button>

                              <button
                                onClick={() => markReadiness(entry, 'absent')}
                                disabled={readinessEntryId === entry.id}
                                className="py-3 bg-red-600/20 text-red-400 border border-red-600/30 disabled:cursor-not-allowed disabled:opacity-60 rounded-xl font-bold"
                              >
                                {readinessEntryId === entry.id ? 'Saving...' : 'Absent'}
                              </button>

                              <button
                                onClick={() => markReadiness(entry, 'incident')}
                                disabled={readinessEntryId === entry.id}
                                className="py-3 bg-yellow-600/20 text-yellow-300 border border-yellow-600/30 disabled:cursor-not-allowed disabled:opacity-60 rounded-xl font-bold"
                              >
                                {readinessEntryId === entry.id ? 'Saving...' : 'Incident'}
                              </button>

                              <button
                                onClick={() => markReadiness(entry, 'scratched')}
                                disabled={readinessEntryId === entry.id}
                                className="py-3 bg-gray-600/20 text-gray-300 border border-gray-500/30 disabled:cursor-not-allowed disabled:opacity-60 rounded-xl font-bold"
                              >
                                {readinessEntryId === entry.id ? 'Saving...' : 'Scratch'}
                              </button>
                            </div>
                          )}

                        {canOperate &&
                          selectedRace.status === 'finished' &&
                          selectedRace.resultStatus === 'draft' &&
                          entry.status === 'approved' &&
                          entry.preRaceStatus !== 'absent' && (
                            <div className="grid grid-cols-2 gap-3">
                              <select
                                aria-label={`Outcome for ${entry.horseName}`}
                                value={currentOutcome}
                                onChange={(event) =>
                                  updateDraft(entry, {
                                    resultOutcome: event.target.value as ResultOutcome,
                                    position: event.target.value === 'finished'
                                      ? resultDrafts[entry.id]?.position ?? (entry.position ? String(entry.position) : '')
                                      : '',
                                    finishTime: event.target.value === 'finished'
                                      ? resultDrafts[entry.id]?.finishTime ?? entry.finishTime ?? ''
                                      : '',
                                  })
                                }
                                className="col-span-2 bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white"
                              >
                                {resultOutcomeOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>

                              {needsFinishFields && (
                                <>
                              <select
                                aria-label={`Position for ${entry.horseName}`}
                                value={
                                  resultDrafts[entry.id]?.position ??
                                  (entry.position ? String(entry.position) : '')
                                }
                                onChange={(event) =>
                                  updateDraft(entry, { position: event.target.value })
                                }
                                className="bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white"
                              >
                                <option value="">Select position</option>
                                {positionOptions.map((position) => (
                                  <option
                                    key={position}
                                    value={position}
                                  >
                                    Position {position}
                                  </option>
                                ))}
                              </select>

                              <input
                                placeholder="Finish time"
                                value={resultDrafts[entry.id]?.finishTime ?? entry.finishTime ?? ''}
                                onChange={(event) =>
                                  updateDraft(entry, { finishTime: event.target.value })
                                }
                                className="bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white"
                              />
                                </>
                              )}

                              {!needsFinishFields && (
                                <input
                                  placeholder="Incident reason (required)"
                                  value={resultDrafts[entry.id]?.incidentReason ?? entry.incidentReason ?? ''}
                                  onChange={(event) =>
                                    updateDraft(entry, { incidentReason: event.target.value })
                                  }
                                  className="col-span-2 bg-[#111] border border-orange-300/30 rounded-xl px-3 py-2 text-white"
                                />
                              )}

                              <input
                                placeholder="Notes"
                                value={resultDrafts[entry.id]?.notes ?? entry.notes ?? ''}
                                onChange={(event) =>
                                  updateDraft(entry, { notes: event.target.value })
                                }
                                className="bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white"
                              />

                              <input
                                placeholder="Violations"
                                value={resultDrafts[entry.id]?.violationNotes ?? entry.violationNotes ?? ''}
                                onChange={(event) =>
                                  updateDraft(entry, { violationNotes: event.target.value })
                                }
                                className="bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white"
                              />

                              <button
                                onClick={() => submitResult(entry)}
                                disabled={recordingEntryId === entry.id}
                                className="col-span-2 py-3 bg-[#d4af37] hover:bg-[#b8892d] disabled:cursor-not-allowed disabled:opacity-60 rounded-xl text-white font-bold"
                              >
                                {recordingEntryId === entry.id ? 'Recording...' : 'Record Result'}
                              </button>
                            </div>
                          )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {showRefereeControl && (
              <div className="space-y-5">
                <div className="bg-[#12304f] border border-white/10 rounded-2xl p-6 sticky top-24">
                  <div className="flex items-center gap-3 mb-5">
                    <ShieldCheck className="w-6 h-6 text-[#d4af37]" />
                    <h2 className="text-2xl font-black text-white">
                      Referee Control
                    </h2>
                  </div>

                  <div className="space-y-3 text-gray-300 text-sm mb-6">
                    <div className="flex justify-between gap-3">
                      <span>Check-in</span>
                      <span className="text-white font-bold">
                        {readyEntries.length}/{activeEntries.length} Ready
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span>Start status</span>
                      <span className="text-white font-bold">
                        {statusLabel(selectedRace.status)}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span>Unchecked</span>
                      <span className="text-white font-bold">
                        {uncheckedEntries.length}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span>Result approval</span>
                      <span className="text-white font-bold">Admin completes</span>
                    </div>
                  </div>

                  {selectedRace.status === 'published' && (
                    <div className="mt-3 rounded-xl border border-white/10 bg-[#071a2f] p-4 text-sm text-gray-400">
                      Check in every participant. Admin starts the race after check-in is complete.
                    </div>
                  )}

                  {selectedRace.status === 'in-progress' && (
                    <div className="mt-3 rounded-xl border border-white/10 bg-[#071a2f] p-4 text-sm text-gray-400">
                      Race is running. Admin must finish the race before Referee can enter results.
                    </div>
                  )}

                  {selectedRace.status === 'finished' && selectedRace.resultStatus === 'draft' && (
                    <button
                      onClick={loadSimulationDrafts}
                      disabled={!canOperate || simulationPlan.runners.length === 0}
                      className="w-full mt-3 flex items-center justify-center gap-2 py-4 bg-[#d4af37] hover:bg-[#e7c95d] disabled:cursor-not-allowed disabled:opacity-50 rounded-xl text-[#071a2f] font-black transition-all"
                    >
                      Load Simulation Drafts
                    </button>
                  )}

                  <button
                    onClick={submitResults}
                    disabled={
                      !canOperate ||
                      publishingResults ||
                      selectedRace.status !== 'finished' ||
                      selectedRace.resultStatus !== 'draft'
                    }
                    className="w-full mt-3 flex items-center justify-center gap-2 py-4 bg-white/10 hover:bg-white/15 disabled:text-gray-500 rounded-xl text-white font-bold transition-all"
                  >
                    {publishingResults ? 'Submitting...' : 'Submit Results for Admin Review'}
                  </button>

                  <div className="mt-5 rounded-xl bg-[#071a2f] border border-white/10 p-4 text-gray-400">
                    <Timer className="inline-block w-4 h-4 mr-2 text-[#d4af37]" />
                    Submitting sends recorded results to Admin. They become official only after Admin approval.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!selectedRace && (
          <div className="bg-[#12304f] border border-white/10 rounded-2xl p-8 text-gray-400">
            No race is available for your role yet.
          </div>
        )}
      </div>
    </div>
  );
}
