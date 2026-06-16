import { useEffect, useState } from 'react';

import {
  Users,
  Shield,
  Calendar,
  CheckCircle,
  XCircle,
  Settings,
  BarChart3,
  ChevronDown,
  ChevronUp,
  FileText,
  Eye,
  Pencil,
  Plus,
} from 'lucide-react';
import {
  ApprovalItem,
  RaceRecord,
  TournamentRecord,
  adminRaceAction,
  createTournament,
  decideApproval,
  getApprovals,
  getBootstrap,
} from '../services/api';
import { statusLabel } from '../utils/domain';
import { messageToneClasses } from '../utils/messageTone';

interface AdminPanelProps {
  onNavigate: (page: string) => void;
}

const formatDateInput = (value: string) => {
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  const digits = value.replace(/\D/g, '').slice(0, 8);
  const parts = [
    digits.slice(0, 2),
    digits.slice(2, 4),
    digits.slice(4, 8),
  ].filter(Boolean);

  return parts.join('/');
};

const dateInputToIso = (value: string) => {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!match) return '';

  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const isValidDate =
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day);

  return isValidDate ? `${year}-${month}-${day}` : '';
};

export default function AdminPanel({ onNavigate }: AdminPanelProps) {

  const [pendingApprovals, setPendingApprovals] = useState<ApprovalItem[]>([]);
  const [approvalMessage, setApprovalMessage] = useState('');
  const [isLoadingApprovals, setIsLoadingApprovals] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [races, setRaces] = useState<RaceRecord[]>([]);
  const [showCreateTournament, setShowCreateTournament] = useState(false);
  const [tournamentMessage, setTournamentMessage] = useState('');
  const [scheduleExpanded, setScheduleExpanded] = useState(false);
  const [tournamentForm, setTournamentForm] = useState({
    name: '',
    registrationWindow: '',
    startDate: '',
    finalDate: '',
    location: '',
    prizePool: '',
  });

  const loadApprovals = () => {
    setIsLoadingApprovals(true);

    getApprovals()
      .then((approvalResult) => {
        setPendingApprovals(approvalResult.approvals);
      })
      .catch((error) => {
        setApprovalMessage(
          error instanceof Error ? error.message : 'Unable to load approvals'
        );
      })
      .finally(() => setIsLoadingApprovals(false));
  };

  useEffect(() => {
    loadApprovals();
    getBootstrap()
      .then((data) => {
        setRaces(data.races || []);
        setTotalUsers(data.users.length);
        setTournaments(data.tournaments || []);
      })
      .catch(() => undefined);
  }, []);

  const handleDecision = (
    item: ApprovalItem,
    decision: 'approved' | 'rejected'
  ) => {
    decideApproval(item.entityType, item.id, decision)
      .then((result) => {
        setPendingApprovals(result.approvals);
        setApprovalMessage(
          `${item.name} has been ${decision}. Notification sent.`
        );
      })
      .catch((error) => {
        setApprovalMessage(
          error instanceof Error ? error.message : 'Approval action failed'
        );
      });
  };

  const activeTournament =
    tournaments.find((tournament) => tournament.status !== 'completed') ||
    tournaments[0];
  const primaryRace = races[0];
  const confirmationTotal = Number(primaryRace?.participants || 0) * 2;
  const confirmationReady =
    Number(primaryRace?.ownerConfirmed || 0) + Number(primaryRace?.jockeyConfirmed || 0);

  const systemStats = [
    {
      label: 'Total Users',
      value: String(totalUsers),
      change: 'Accounts',
      icon: Users,
    },

    {
      label: 'Active Tournaments',
      value: String(tournaments.length || 0),
      change: activeTournament ? statusLabel(activeTournament.status) : 'None',
      icon: Calendar,
    },

    {
      label: 'Pending Approvals',
      value: String(pendingApprovals.length),
      change: 'Review now',
      icon: Shield,
    },

    {
      label: 'Race Confirmations',
      value: `${confirmationReady}/${confirmationTotal}`,
      change: 'Owner + Jockey',
      icon: BarChart3,
    },
  ];

  const visibleRaces = scheduleExpanded ? races : races.slice(0, 4);

  const [showViewModal, setShowViewModal] =
    useState<RaceRecord | null>(null);

  const [editRace, setEditRace] =
    useState<RaceRecord | null>(null);

  const tournamentNameById = (tournamentId?: string | null) =>
    tournaments.find((tournament) => tournament.id === tournamentId)?.name ||
    'No tournament selected';

  const updateRace = () => {
    if (!editRace) return;

    const raceDate = editRace.date ? dateInputToIso(editRace.date) : '';

    if (editRace.date && !raceDate) {
      setApprovalMessage('Race date must use dd/MM/yyyy format.');
      return;
    }

    setRaces((prev) =>
      prev.map((race) =>
        race.id === editRace.id
          ? { ...editRace, date: raceDate }
          : race
      )
    );

    setEditRace(null);
  };

  const handleRaceAction = (
    raceId: string,
    action: 'close-registration' | 'publish' | 'confirm-results' | 'reject-results' | 'complete'
  ) => {
    adminRaceAction(raceId, action)
      .then((result) => {
        setRaces((current) =>
          current.map((race) => (race.id === result.race.id ? result.race : race))
        );
        setApprovalMessage(
          action === 'confirm-results'
            ? 'Official results approved and published to Owner, Jockey, Referee and Spectator pages.'
            : `Race status updated to ${statusLabel(result.race.status)}.`
        );
      })
      .catch((error) =>
        setApprovalMessage(
          error instanceof Error ? error.message : 'Race action failed'
        )
      );
  };

  const handleCreateTournament = () => {
    setTournamentMessage('');
    const startDate = dateInputToIso(tournamentForm.startDate);
    const finalDate = tournamentForm.finalDate
      ? dateInputToIso(tournamentForm.finalDate)
      : '';

    if (!tournamentForm.name || !tournamentForm.startDate || !tournamentForm.location) {
      setTournamentMessage('Tournament name, start date and location are required.');
      return;
    }

    if (!startDate || (tournamentForm.finalDate && !finalDate)) {
      setTournamentMessage('Dates must use dd/MM/yyyy format.');
      return;
    }

    createTournament({
      ...tournamentForm,
      startDate,
      finalDate,
    })
      .then((result) => {
        setTournaments(result.tournaments);
        setTournamentMessage('Tournament created and registration opened.');
        setTournamentForm({
          name: '',
          registrationWindow: '',
          startDate: '',
          finalDate: '',
          location: '',
          prizePool: '',
        });
        setTimeout(() => {
          setShowCreateTournament(false);
          setTournamentMessage('');
        }, 900);
      })
      .catch((error) =>
        setTournamentMessage(
          error instanceof Error ? error.message : 'Unable to create tournament'
        )
      );
  };

  return (
    <div className="min-h-screen bg-[#071a2f] pt-24 pb-12">

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* HEADER */}

        <div className="mb-8">

          <h1 className="text-5xl font-black text-white mb-3">
            Admin Control Center
          </h1>

          <p className="text-gray-400 text-lg">
            System management and administrative controls
          </p>
        </div>

        {/* STATS */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

          {systemStats.map((stat, index) => {

            const Icon = stat.icon;

            return (

              <div
                key={index}
                className="bg-[#12304f] border border-white/10 rounded-3xl p-6"
              >

                <div className="flex items-center justify-between mb-4">

                  <div className="w-14 h-14 bg-[#d4af37]/10 rounded-2xl flex items-center justify-center">
                    <Icon className="w-7 h-7 text-[#d4af37]" />
                  </div>

                  <span className="text-green-500 font-bold">
                    {stat.change}
                  </span>
                </div>

                <div className="text-4xl font-black text-white mb-2">
                  {stat.value}
                </div>

                <div className="text-gray-400">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* MAIN */}

          <div className="lg:col-span-2 space-y-8">

            {/* PENDING */}

            <div className="bg-[#12304f] border border-white/10 rounded-3xl p-8">

              <div className="flex items-center justify-between mb-8">

                <h2 className="text-3xl font-black text-white">
                  Pending Approvals
                </h2>

                <div className="px-4 py-2 bg-[#d4af37]/20 border border-[#d4af37] rounded-xl text-[#d4af37] font-bold">
                  {pendingApprovals.length} Pending
                </div>
              </div>

              {approvalMessage && (
                <div className={`mb-5 rounded-xl border px-4 py-3 font-semibold ${messageToneClasses(approvalMessage)}`}>
                  {approvalMessage}
                </div>
              )}

              <div className="space-y-5">

                {isLoadingApprovals && (
                  <div className="bg-[#071a2f] border border-white/10 rounded-2xl p-5 text-gray-400">
                    Loading approvals from API...
                  </div>
                )}

                {!isLoadingApprovals && pendingApprovals.length === 0 && (
                  <div className="bg-[#071a2f] border border-white/10 rounded-2xl p-5 text-gray-400">
                    No pending approvals.
                  </div>
                )}

                {pendingApprovals.map((item) => (

                  <div
                    key={item.id}
                    className="bg-[#071a2f] border border-white/10 rounded-2xl p-5"
                  >

                    <div className="flex items-center justify-between mb-4">

                      <div>

                        <div className="flex items-center gap-3 mb-2">

                          <span className="px-3 py-1 bg-blue-600/20 border border-blue-600/30 rounded-xl text-blue-500 text-sm font-bold">
                            {item.type}
                          </span>

                          <span className="text-gray-400 text-sm">
                            {item.date}
                          </span>
                        </div>

                        <h3 className="text-white text-2xl font-bold mb-2">
                          {item.name}
                        </h3>

                        <p className="text-gray-400">
                          {item.detail}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">

                      <button
                        onClick={() => handleDecision(item, 'approved')}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 rounded-xl hover:bg-green-700 transition-all text-white font-bold"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Approve
                      </button>

                      <button
                        onClick={() => handleDecision(item, 'rejected')}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 rounded-xl hover:bg-red-700 transition-all text-white font-bold"
                      >
                        <XCircle className="w-5 h-5" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RACES */}

            <div className="bg-[#12304f] border border-white/10 rounded-3xl p-8">

              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-8">

                <div>
                  <h2 className="text-3xl font-black text-white">
                    Race Schedule
                  </h2>

                  <p className="text-gray-400 mt-2">
                    Showing {visibleRaces.length}/{races.length} races
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {races.length > 4 && (
                    <button
                      onClick={() => setScheduleExpanded((current) => !current)}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37] font-bold hover:bg-[#d4af37]/20 transition-all"
                    >
                      {scheduleExpanded ? 'Show Less' : 'View All'}
                      {scheduleExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => tournaments.length > 0 && onNavigate('create-race')}
                    disabled={tournaments.length === 0}
                    className="flex items-center gap-2 px-5 py-3 bg-[#d4af37] disabled:bg-white/10 disabled:text-gray-500 rounded-xl hover:bg-[#b8892d] transition-all text-white font-bold"
                  >
                    <Plus className="w-5 h-5" />
                    Create Race
                  </button>
                </div>
              </div>

              <div className="space-y-5">

                {visibleRaces.map((race) => (

                  <div
                    key={race.id}
                    className="bg-[#071a2f] border border-white/10 rounded-2xl p-5"
                  >

                    <div className="flex items-center justify-between">

                      <div>

                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-3 py-1 rounded-xl bg-blue-600/15 border border-blue-600/30 text-blue-300 text-xs font-bold">
                            {race.raceNumber || 'Race'}
                          </span>

                          <h3 className="text-2xl font-bold text-white">
                            {race.name}
                          </h3>

                          <span
                            className={`px-3 py-1 rounded-xl text-xs font-bold ${
                              race.status ===
                              'scheduled'
                                ? 'bg-green-600/20 border border-green-600/30 text-green-500'
                                : 'bg-yellow-600/20 border border-yellow-600/30 text-yellow-500'
                            }`}
                          >
                            {statusLabel(race.status)}
                          </span>
                        </div>

                        <div className="mb-3 text-sm text-gray-300">
                          Tournament:{' '}
                          <span className="text-white font-semibold">
                            {tournamentNameById(race.tournamentId)}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-gray-400">

                          <span>
                            {race.date}
                          </span>

                          <span>•</span>

                          <span>
                            {race.time}
                          </span>

                          <span>•</span>

                          <span>
                            {race.participants}{' '}
                            participants
                          </span>

                          {'referee' in race && (
                            <>
                              <span>•</span>

                              <span>
                                {race.referee}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3">

                        {race.status === 'registration-open' && (
                          <button
                            onClick={() =>
                              handleRaceAction(race.id, 'close-registration')
                            }
                            className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 text-yellow-400 rounded-xl hover:bg-yellow-500/20 transition-all border border-yellow-500/30"
                          >
                            Close Registration
                          </button>
                        )}

                        {race.status === 'registration-closed' && (
                          <button
                            onClick={() =>
                              handleRaceAction(race.id, 'publish')
                            }
                            className="flex items-center gap-2 px-4 py-2 bg-green-600/10 text-green-400 rounded-xl hover:bg-green-600/20 transition-all border border-green-600/30"
                          >
                            Publish
                          </button>
                        )}

                        {race.status === 'in-progress' && race.resultStatus === 'submitted' && (
                          <button
                            onClick={() =>
                              handleRaceAction(race.id, 'confirm-results')
                            }
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 text-blue-400 rounded-xl hover:bg-blue-600/20 transition-all border border-blue-600/30"
                          >
                            Confirm Results
                          </button>
                        )}

                        {race.status === 'in-progress' && race.resultStatus === 'submitted' && (
                          <button
                            onClick={() =>
                              handleRaceAction(race.id, 'reject-results')
                            }
                            className="flex items-center gap-2 px-4 py-2 bg-red-600/10 text-red-400 rounded-xl hover:bg-red-600/20 transition-all border border-red-600/30"
                          >
                            Reject Results
                          </button>
                        )}

                        {race.status === 'finished' && (
                          <button
                            onClick={() =>
                              handleRaceAction(race.id, 'complete')
                            }
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600/10 text-purple-300 rounded-xl hover:bg-purple-600/20 transition-all border border-purple-600/30"
                          >
                            Complete Awards
                          </button>
                        )}

                        <button
                          onClick={() =>
                            setEditRace({
                              ...race,
                              date: formatDateInput(race.date || ''),
                            })
                          }
                          className="flex items-center gap-2 px-4 py-2 bg-[#d4af37]/10 text-[#d4af37] rounded-xl hover:bg-[#d4af37] hover:text-white transition-all border border-[#d4af37]/30"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit
                        </button>

                        <button
                          onClick={() =>
                            setShowViewModal(
                              race
                            )
                          }
                          className="flex items-center gap-2 px-4 py-2 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-all"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SIDEBAR */}

          <div className="space-y-8">

            {/* QUICK ACTIONS */}

            <div className="bg-[#12304f] border border-white/10 rounded-3xl p-8">

              <h2 className="text-3xl font-black text-white mb-8">
                Quick Actions
              </h2>

              <div className="space-y-4">

                {[
                  {
                    icon: Calendar,
                    label: 'Create Tournament',
                    onClick: () => setShowCreateTournament(true),
                  },

                  {
                    icon: Users,
                    label: 'Manage Users',
                  },

                  {
                    icon: Shield,
                    label: 'User Roles',
                  },

                  {
                    icon: Calendar,
                    label:
                      'Open Registration',
                  },

                  {
                    icon: FileText,
                    label: 'Publish Results',
                  },

                  {
                    icon: Settings,
                    label: 'System Settings',
                  },
                ].map((action, index) => {

                  const Icon = action.icon;

                  return (

                    <button
                      key={index}
                      onClick={action.onClick}
                      className="w-full flex items-center gap-4 px-5 py-4 bg-[#071a2f] border border-white/10 rounded-2xl hover:bg-[#d4af37]/10 hover:border-[#d4af37]/50 transition-all text-white"
                    >

                      <Icon className="w-6 h-6 text-[#d4af37]" />

                      <span className="font-semibold">
                        {action.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RECENT ACTIVITY */}

            <div className="bg-[#12304f] border border-white/10 rounded-3xl p-8">

              <h2 className="text-3xl font-black text-white mb-8">
                Recent Activity
              </h2>

              <div className="space-y-5">

                {[
                  'New horse registration approved',
                  'Race results published',
                  'Tournament schedule updated',
                  '3 new jockey applications received',
                ].map((activity, index) => (

                  <div
                    key={index}
                    className="border-l-2 border-[#d4af37] pl-4"
                  >

                    <div className="text-gray-400 text-xs mb-1">
                      {index + 1} hours ago
                    </div>

                    <div className="text-white">
                      {activity}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* EDIT MODAL */}

        {editRace && (

          <div className="fixed inset-0 bg-[#071a2f]/80 flex items-center justify-center z-50">

            <div className="bg-[#12304f] p-8 rounded-3xl w-full max-w-lg border border-white/10">

              <h2 className="text-3xl font-black text-white mb-8">
                Edit Race
              </h2>

              <div className="space-y-5">

                <input
                  type="text"
                  value={editRace.name}
                  onChange={(e) =>
                    setEditRace({
                      ...editRace,
                      name:
                        e.target.value,
                    })
                  }
                  className="w-full bg-[#071a2f] border border-white/10 rounded-2xl px-5 py-4 text-white"
                />

                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Race date (dd/MM/yyyy)"
                  value={editRace.date}
                  onChange={(e) =>
                    setEditRace({
                      ...editRace,
                      date:
                        formatDateInput(e.target.value),
                    })
                  }
                  maxLength={10}
                  className="w-full bg-[#071a2f] border border-white/10 rounded-2xl px-5 py-4 text-white"
                />

                <input
                  type="time"
                  value={editRace.time}
                  onChange={(e) =>
                    setEditRace({
                      ...editRace,
                      time:
                        e.target.value,
                    })
                  }
                  className="w-full bg-[#071a2f] border border-white/10 rounded-2xl px-5 py-4 text-white"
                />
              </div>

              <div className="flex gap-4 mt-8">

                <button
                  onClick={() =>
                    setEditRace(null)
                  }
                  className="flex-1 py-4 bg-white/10 rounded-2xl text-white"
                >
                  Cancel
                </button>

                <button
                  onClick={updateRace}
                  className="flex-1 py-4 bg-[#d4af37] rounded-2xl text-white font-bold"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {showCreateTournament && (

          <div className="fixed inset-0 bg-[#071a2f]/80 flex items-center justify-center z-50 p-4">

            <div className="bg-[#12304f] p-8 rounded-3xl w-full max-w-2xl border border-white/10">

              <h2 className="text-3xl font-black text-white mb-2">
                Create Tournament
              </h2>

              <p className="text-gray-400 mb-6">
                Tạo giải đấu trước, mở đăng ký, sau đó Owner/Jockey mới gửi hồ sơ để Admin duyệt.
              </p>

              {tournamentMessage && (
                <div className={`mb-5 rounded-xl border px-4 py-3 font-semibold ${messageToneClasses(tournamentMessage)}`}>
                  {tournamentMessage}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-5">
                <input
                  type="text"
                  placeholder="Tournament name"
                  value={tournamentForm.name}
                  onChange={(event) =>
                    setTournamentForm({
                      ...tournamentForm,
                      name: event.target.value,
                    })
                  }
                  className="w-full bg-[#071a2f] border border-white/10 rounded-2xl px-5 py-4 text-white"
                />

                <input
                  type="text"
                  placeholder="Registration window"
                  value={tournamentForm.registrationWindow}
                  onChange={(event) =>
                    setTournamentForm({
                      ...tournamentForm,
                      registrationWindow: event.target.value,
                    })
                  }
                  className="w-full bg-[#071a2f] border border-white/10 rounded-2xl px-5 py-4 text-white"
                />

                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Start date (dd/MM/yyyy)"
                  value={tournamentForm.startDate}
                  onChange={(event) =>
                    setTournamentForm({
                      ...tournamentForm,
                      startDate: formatDateInput(event.target.value),
                    })
                  }
                  maxLength={10}
                  className="w-full bg-[#071a2f] border border-white/10 rounded-2xl px-5 py-4 text-white"
                />

                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Final date (dd/MM/yyyy)"
                  value={tournamentForm.finalDate}
                  onChange={(event) =>
                    setTournamentForm({
                      ...tournamentForm,
                      finalDate: formatDateInput(event.target.value),
                    })
                  }
                  maxLength={10}
                  className="w-full bg-[#071a2f] border border-white/10 rounded-2xl px-5 py-4 text-white"
                />

                <input
                  type="text"
                  placeholder="Location"
                  value={tournamentForm.location}
                  onChange={(event) =>
                    setTournamentForm({
                      ...tournamentForm,
                      location: event.target.value,
                    })
                  }
                  className="w-full bg-[#071a2f] border border-white/10 rounded-2xl px-5 py-4 text-white"
                />

                <input
                  type="number"
                  min="0"
                  placeholder="Prize pool"
                  value={tournamentForm.prizePool}
                  onChange={(event) =>
                    setTournamentForm({
                      ...tournamentForm,
                      prizePool: event.target.value,
                    })
                  }
                  className="w-full bg-[#071a2f] border border-white/10 rounded-2xl px-5 py-4 text-white"
                />
              </div>

              <div className="flex gap-4 mt-8">

                <button
                  onClick={() => setShowCreateTournament(false)}
                  className="flex-1 py-4 bg-white/10 rounded-2xl text-white"
                >
                  Cancel
                </button>

                <button
                  onClick={handleCreateTournament}
                  className="flex-1 py-4 bg-[#d4af37] rounded-2xl text-white font-bold"
                >
                  Create & Open Registration
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW MODAL */}

        {showViewModal && (

          <div className="fixed inset-0 bg-[#071a2f]/80 flex items-center justify-center z-50">

            <div className="bg-[#12304f] p-8 rounded-3xl w-full max-w-lg border border-white/10">

              <h2 className="text-3xl font-black text-white mb-8">
                Race Details
              </h2>

              <div className="space-y-5">

                <div>

                  <div className="text-gray-400 text-sm">
                    Race Name
                  </div>

                  <div className="text-white text-2xl font-bold">
                    {showViewModal.name}
                  </div>
                </div>

                <div>

                  <div className="text-gray-400 text-sm">
                    Date
                  </div>

                  <div className="text-white">
                    {showViewModal.date}
                  </div>
                </div>

                <div>

                  <div className="text-gray-400 text-sm">
                    Time
                  </div>

                  <div className="text-white">
                    {showViewModal.time}
                  </div>
                </div>

                <div>

                  <div className="text-gray-400 text-sm">
                    Participants
                  </div>

                  <div className="text-white">
                    {
                      showViewModal.participants
                    }
                  </div>
                </div>

                <div>

                  <div className="text-gray-400 text-sm">
                    Status
                  </div>

                  <div className="text-green-500 font-bold">
                    {
                      showViewModal.status
                    }
                  </div>
                </div>
              </div>

              <button
                onClick={() =>
                  setShowViewModal(null)
                }
                className="w-full mt-8 py-4 bg-[#d4af37] rounded-2xl text-white font-bold"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
