import { useEffect, useMemo, useState } from 'react';
import { Circle, Flag, ShieldCheck, Timer } from 'lucide-react';
import NotificationsPanel from './NotificationsPanel';
import {
  AuthUser,
  RaceEntryRecord,
  RaceRecord,
  getBootstrap,
  getMe,
  markRaceEntryReadiness,
  recordRaceResult,
  startRace,
  submitRaceResults,
} from '../services/api';
import { statusLabel } from '../data/tournamentWorkflow';
import { messageToneClasses } from '../utils/messageTone';

export default function LiveRace() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [races, setRaces] = useState<RaceRecord[]>([]);
  const [entries, setEntries] = useState<RaceEntryRecord[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState('');
  const [message, setMessage] = useState('');
  const [resultDrafts, setResultDrafts] = useState<
    Record<string, { position: string; finishTime: string; notes: string; violationNotes: string }>
  >({});

  const selectedRace = useMemo(
    () => races.find((race) => race.id === selectedRaceId) || races[0],
    [races, selectedRaceId]
  );

  const selectedEntries = entries.filter(
    (entry) => entry.raceId === selectedRace?.id
  );

  const canOperate =
    currentUser?.role === 'admin' ||
    (currentUser?.role === 'referee' &&
      selectedRace &&
      String(selectedRace.refereeUserIds || selectedRace.refereeUserId || '')
        .split(',')
        .includes(currentUser.id));

  const loadRaceOps = () => {
    Promise.all([getMe().catch(() => ({ user: null as any })), getBootstrap()])
      .then(([me, data]) => {
        setCurrentUser(me.user);
        setRaces(data.races);
        setEntries(data.raceEntries);
        setSelectedRaceId((current) => current || data.races[0]?.id || '');
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to load races')
      );
  };

  useEffect(() => {
    loadRaceOps();
  }, []);

  const handleStart = () => {
    if (!selectedRace) return;

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
    entryId: string,
    patch: Partial<{ position: string; finishTime: string; notes: string; violationNotes: string }>
  ) => {
    setResultDrafts((current) => ({
      ...current,
      [entryId]: {
        position: '',
        finishTime: '',
        notes: '',
        violationNotes: '',
        ...current[entryId],
        ...patch,
      },
    }));
  };

  const submitResult = (entry: RaceEntryRecord) => {
    const draft = resultDrafts[entry.id] || {
      position: '',
      finishTime: '',
      notes: '',
      violationNotes: '',
    };

    recordRaceResult(entry.id, draft)
      .then(() => {
        setMessage(`Result recorded for ${entry.horseName}.`);
        loadRaceOps();
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to record result')
      );
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
      .then(() => {
        setMessage('Results submitted to Admin for confirmation.');
        loadRaceOps();
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to submit results')
      );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
        <NotificationsPanel />

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Circle className="w-3 h-3 fill-[#e10600] text-[#e10600]" />
              <span className="text-[#e10600] font-bold uppercase text-sm">
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
            onChange={(event) => setSelectedRaceId(event.target.value)}
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
          <div className="grid lg:grid-cols-[1fr,360px] gap-8">
            <div className="space-y-5">
              <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6">
                <div className="grid md:grid-cols-4 gap-4">
                  {[
                    ['Status', statusLabel(selectedRace.status)],
                    ['Venue', selectedRace.venue],
                    ['Distance', selectedRace.distance || '-'],
                    ['Referee', selectedRace.referee || '-'],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4"
                    >
                      <div className="text-gray-400 text-sm mb-1">{label}</div>
                      <div className="text-white font-bold">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6">
                <h2 className="text-2xl font-black text-white mb-5">
                  Race Entries
                </h2>

                <div className="space-y-4">
                  {selectedEntries.length === 0 && (
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4 text-gray-500">
                      No approved entries for this race yet.
                    </div>
                  )}

                  {selectedEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4"
                    >
                      <div className="grid lg:grid-cols-[1fr,320px] gap-5">
                        <div>
                          <div className="text-white text-xl font-bold">
                            Gate {entry.lane || 'TBD'} • {entry.horseName}
                          </div>

                          <div className="text-gray-400 mt-1">
                            Jockey: {entry.jockeyName} • Handicap {entry.handicap || 0}kg
                          </div>

                          <div className="text-[#e10600] font-bold mt-2">
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
                            <input
                              placeholder="Position"
                              value={resultDrafts[entry.id]?.position || ''}
                              onChange={(event) =>
                                updateDraft(entry.id, { position: event.target.value })
                              }
                              className="bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white"
                            />

                            <input
                              placeholder="Finish time"
                              value={resultDrafts[entry.id]?.finishTime || ''}
                              onChange={(event) =>
                                updateDraft(entry.id, { finishTime: event.target.value })
                              }
                              className="bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white"
                            />

                            <input
                              placeholder="Notes"
                              value={resultDrafts[entry.id]?.notes || ''}
                              onChange={(event) =>
                                updateDraft(entry.id, { notes: event.target.value })
                              }
                              className="bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white"
                            />

                            <input
                              placeholder="Violations"
                              value={resultDrafts[entry.id]?.violationNotes || ''}
                              onChange={(event) =>
                                updateDraft(entry.id, { violationNotes: event.target.value })
                              }
                              className="bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white"
                            />

                            <button
                              onClick={() => submitResult(entry)}
                              className="col-span-2 py-3 bg-[#e10600] hover:bg-[#c00500] rounded-xl text-white font-bold"
                            >
                              Record Result
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 sticky top-24">
                <div className="flex items-center gap-3 mb-5">
                  <ShieldCheck className="w-6 h-6 text-[#e10600]" />
                  <h2 className="text-2xl font-black text-white">
                    Referee Control
                  </h2>
                </div>

                <div className="space-y-3 text-gray-300 text-sm mb-6">
                  <div className="flex justify-between gap-3">
                    <span>Readiness check</span>
                    <span className="text-white font-bold">Required</span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span>Start status</span>
                    <span className="text-white font-bold">Published</span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span>Result review</span>
                    <span className="text-white font-bold">Admin confirms</span>
                  </div>
                </div>

                <button
                  onClick={handleStart}
                  disabled={!canOperate || selectedRace.status !== 'published'}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-[#e10600] hover:bg-[#c00500] disabled:bg-white/10 disabled:text-gray-500 rounded-xl text-white font-bold transition-all"
                >
                  <Flag className="w-5 h-5" />
                  Start Race
                </button>

                <button
                  onClick={submitResults}
                  disabled={!canOperate || selectedRace.status !== 'in-progress'}
                  className="w-full mt-3 flex items-center justify-center gap-2 py-4 bg-white/10 hover:bg-white/15 disabled:text-gray-500 rounded-xl text-white font-bold transition-all"
                >
                  Submit Results
                </button>

                <div className="mt-5 rounded-xl bg-[#0a0a0a] border border-white/10 p-4 text-gray-400">
                  <Timer className="inline-block w-4 h-4 mr-2 text-[#e10600]" />
                  Admin confirms results after referee submits outcome.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
