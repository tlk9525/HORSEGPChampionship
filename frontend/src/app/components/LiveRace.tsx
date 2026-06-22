import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useNavigate,
  useParams,
} from 'react-router-dom';
import { Circle, Flag, ShieldCheck, Timer } from 'lucide-react';
import {
  AuthUser,
  RaceEntryRecord,
  RaceRecord,
  getBootstrap,
  getLiveRaceEventsUrl,
  getMe,
  markRaceEntryReadiness,
  recordRaceResult,
  startRace,
  submitRaceResults,
} from '../services/api';
import { statusLabel } from '../utils/domain';
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
  const loadRequestIdRef = useRef(0);

  const selectedRace = useMemo(
    () => races.find((race) => race.id === selectedRaceId) || races[0],
    [races, selectedRaceId]
  );

  const selectedEntries = entries.filter(
    (entry) => entry.raceId === selectedRace?.id
  );

  const positionOptions = Array.from(
    { length: selectedEntries.length },
    (_, index) => String(index + 1)
  );

  const readyEntries = selectedEntries.filter(
    (entry) => entry.preRaceStatus === 'ready' && !entry.disqualified
  );

  const absentEntries = selectedEntries.filter(
    (entry) => entry.preRaceStatus === 'absent' || entry.disqualified
  );

  const uncheckedEntries = selectedEntries.filter(
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

        setCurrentUser(me.user);
        const visibleRaces =
          me.user?.role === 'referee'
            ? data.races.filter((race) =>
                String(race.refereeUserIds || race.refereeUserId || '')
                  .split(',')
                  .map((id) => id.trim())
                  .includes(me.user.id)
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
    const timer = window.setInterval(loadRaceOps, 3000);

    return () => window.clearInterval(timer);
  }, [raceId]);

  useEffect(() => {
    if (!selectedRace?.id) return;

    const events = new EventSource(getLiveRaceEventsUrl(selectedRace.id));

    events.addEventListener('race-update', () => {
      loadRaceOps();
    });

    events.onerror = () => undefined;

    return () => events.close();
  }, [selectedRace?.id]);

  const handleStart = () => {
    if (!selectedRace) return;

    if (selectedRace.status !== 'published') {
      setMessage('Race must be published before Referee can start it.');
      return;
    }

    if (readyEntries.length === 0) {
      setMessage('Mark at least one participant Ready before starting the race.');
      return;
    }

    if (uncheckedEntries.length > 0) {
      setMessage('Check every participant as Ready or Absent before starting the race.');
      return;
    }

    startRace(selectedRace.id)
      .then(() => {
        setMessage('Race started. Status is now In Progress.');
        loadRaceOps();
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to start race')
      );
  };

  const updateDraft = (
    entry: RaceEntryRecord,
    patch: Partial<{ position: string; finishTime: string; notes: string; violationNotes: string }>
  ) => {
    setResultDrafts((current) => ({
      ...current,
      [entry.id]: {
        position: entry.position ? String(entry.position) : '',
        finishTime: entry.finishTime || '',
        notes: entry.notes || '',
        violationNotes: entry.violationNotes || '',
        ...current[entry.id],
        ...patch,
      },
    }));
  };

  const submitResult = (entry: RaceEntryRecord) => {
    const rawDraft = {
      position: entry.position ? String(entry.position) : '',
      finishTime: entry.finishTime || '',
      notes: entry.notes || '',
      violationNotes: entry.violationNotes || '',
      ...resultDrafts[entry.id],
    };
    const draft = {
      ...rawDraft,
      position: rawDraft.position || (entry.position ? String(entry.position) : ''),
      finishTime: rawDraft.finishTime || entry.finishTime || '',
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

  const markReadiness = (entry: RaceEntryRecord, readiness: 'ready' | 'absent') => {
    markRaceEntryReadiness(entry.id, readiness)
      .then(() => {
        setMessage(`${entry.horseName} marked ${readiness}.`);
        loadRaceOps();
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to update readiness')
      );
  };

  const submitResults = () => {
    if (!selectedRace) return;

    submitRaceResults(selectedRace.id)
      .then(({ race, entries }) => {
        if (!race?.id) {
          setMessage('Results were submitted, but the server response did not include the updated race.');
          loadRaceOps();
          return;
        }
        if (
          race.status !== 'finished' ||
          race.resultStatus !== 'official' ||
          !race.awardsPublished
        ) {
          setMessage('Results were not published by the server. Please retry.');
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
        setMessage('Official results published successfully.');
        loadRaceOps();
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to submit results')
      );
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
              Referee verifies readiness, starts races, records positions, finish times, notes and violations.
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
                    ['Unchecked', String(uncheckedEntries.length)],
                    ['Can Start', selectedRace.status === 'published' && readyEntries.length > 0 && uncheckedEntries.length === 0 ? 'Yes' : 'No'],
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
                            Jockey: {entry.jockeyName} • Rating {entry.ratingSnapshot || 'TBD'} • Handicap {entry.handicap || 0}kg
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

                        {canOperate && selectedRace.status === 'published' && (
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => markReadiness(entry, 'ready')}
                              className="py-3 bg-green-600/20 text-green-400 border border-green-600/30 rounded-xl font-bold"
                            >
                              Ready
                            </button>

                            <button
                              onClick={() => markReadiness(entry, 'absent')}
                              className="py-3 bg-red-600/20 text-red-400 border border-red-600/30 rounded-xl font-bold"
                            >
                              Absent
                            </button>
                          </div>
                        )}

                        {canOperate && selectedRace.status === 'in-progress' && entry.preRaceStatus !== 'absent' && (
                          <div className="grid grid-cols-2 gap-3">
                            <select
                              aria-label={`Position for ${entry.horseName}`}
                              value={
                                resultDrafts[entry.id]?.position ||
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
                              value={resultDrafts[entry.id]?.finishTime || entry.finishTime || ''}
                              onChange={(event) =>
                                updateDraft(entry, { finishTime: event.target.value })
                              }
                              className="bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white"
                            />

                            <input
                              placeholder="Notes"
                              value={resultDrafts[entry.id]?.notes || entry.notes || ''}
                              onChange={(event) =>
                                updateDraft(entry, { notes: event.target.value })
                              }
                              className="bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white"
                            />

                            <input
                              placeholder="Violations"
                              value={resultDrafts[entry.id]?.violationNotes || entry.violationNotes || ''}
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
                    <span>Readiness check</span>
                    <span className="text-white font-bold">
                      {readyEntries.length}/{selectedEntries.length} Ready
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
                    <span>Result publishing</span>
                    <span className="text-white font-bold">Referee publishes</span>
                  </div>
                </div>

                <button
                  onClick={handleStart}
                  disabled={
                    !canOperate ||
                    selectedRace.status !== 'published' ||
                    readyEntries.length === 0 ||
                    uncheckedEntries.length > 0
                  }
                  className="w-full flex items-center justify-center gap-2 py-4 bg-[#d4af37] hover:bg-[#b8892d] disabled:bg-white/10 disabled:text-gray-500 rounded-xl text-white font-bold transition-all"
                >
                  <Flag className="w-5 h-5" />
                  Start Race
                </button>

                {selectedRace.status === 'published' && (
                  <div className="mt-3 rounded-xl border border-white/10 bg-[#071a2f] p-4 text-sm text-gray-400">
                    Start Race is enabled only after every participant is checked and at least one horse is Ready.
                  </div>
                )}

                <button
                  onClick={submitResults}
                  disabled={!canOperate || selectedRace.status !== 'in-progress'}
                  className="w-full mt-3 flex items-center justify-center gap-2 py-4 bg-white/10 hover:bg-white/15 disabled:text-gray-500 rounded-xl text-white font-bold transition-all"
                >
                  Confirm & Publish Results
                </button>

                <div className="mt-5 rounded-xl bg-[#071a2f] border border-white/10 p-4 text-gray-400">
                  <Timer className="inline-block w-4 h-4 mr-2 text-[#d4af37]" />
                  Publishing makes the recorded results official immediately.
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
