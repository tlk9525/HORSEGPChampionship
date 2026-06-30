import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useNavigate,
  useParams,
} from 'react-router-dom';
import { Circle, ShieldCheck, Timer } from 'lucide-react';
import {
  AuthUser,
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

export default function LiveRace() {
  const { raceId } = useParams();
  const routerNavigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [races, setRaces] = useState<RaceRecord[]>([]);
  const [entries, setEntries] = useState<RaceEntryRecord[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState(
    raceId || sessionStorage.getItem('selectedRaceId') || ''
  );
  const [message, setMessage] = useState('');
  const [resultDrafts, setResultDrafts] = useState<
    Record<string, { position: string; finishTime: string; notes: string; violationNotes: string }>
  >({});
  const [recordingEntryId, setRecordingEntryId] = useState('');
  const [readinessEntryId, setReadinessEntryId] = useState('');
  const [publishingResults, setPublishingResults] = useState(false);
  const loadRequestIdRef = useRef(0);

  const selectedRace = useMemo(
    () => races.find((race) => race.id === selectedRaceId) || races[0],
    [races, selectedRaceId]
  );

  const selectedEntries = entries.filter(
    (entry) => entry.raceId === selectedRace?.id
  );
  const activeEntries = selectedEntries.filter(
    (entry) => entry.status === 'approved'
  );

  const competingEntries = activeEntries.filter(
    (entry) => entry.preRaceStatus !== 'absent' && !entry.disqualified
  );

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

  const updateDraft = (
    entry: RaceEntryRecord,
    patch: Partial<{ position: string; finishTime: string; notes: string; violationNotes: string }>
  ) => {
    setResultDrafts((current) => {
      const existingDraft = current[entry.id];

      return {
        ...current,
        [entry.id]: {
          position: existingDraft?.position ?? (entry.position ? String(entry.position) : ''),
          finishTime: existingDraft?.finishTime ?? entry.finishTime ?? '',
          notes: existingDraft?.notes ?? entry.notes ?? '',
          violationNotes: existingDraft?.violationNotes ?? entry.violationNotes ?? '',
          ...patch,
        },
      };
    });
  };

  const submitResult = (entry: RaceEntryRecord) => {
    const existingDraft = resultDrafts[entry.id];
    const rawDraft = {
      position: existingDraft?.position ?? (entry.position ? String(entry.position) : ''),
      finishTime: existingDraft?.finishTime ?? entry.finishTime ?? '',
      notes: existingDraft?.notes ?? entry.notes ?? '',
      violationNotes: existingDraft?.violationNotes ?? entry.violationNotes ?? '',
    };
    const draft = {
      ...rawDraft,
      position: rawDraft.position,
      finishTime: rawDraft.finishTime,
    };

    if (!draft.position) {
      setMessage(`Select a position for ${entry.horseName} before recording the result.`);
      return;
    }

    if (!draft.finishTime) {
      setMessage(`Enter a finish time for ${entry.horseName} before recording the result.`);
      return;
    }

    setRecordingEntryId(entry.id);
    setMessage(`Recording result for ${entry.horseName}...`);

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
            className={`grid gap-8 ${
              showRefereeControl
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

                  {selectedEntries.map((entry) => (
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
                            Readiness: {statusLabel(entry.preRaceStatus)} • Result: {statusLabel(entry.resultStatus || 'draft')}
                          </div>

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
                  ))}
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
