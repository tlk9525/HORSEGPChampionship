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
  Trash2,
  Coins,
  TrendingUp,
  Layers3,
} from 'lucide-react';
import {
  AdminBettingRaceSummary,
  ApprovalItem,
  HorseRaceRegistration,
  RaceEntryRecord,
  RaceRecord,
  SystemSettings,
  TournamentRecord,
  adminRaceAction,
  createTournament,
  decideApproval,
  deleteTournament,
  getAdminBetting,
  getApprovals,
  getBootstrap,
  getSystemSettings,
  updateTournament,
  updateSystemSettings,
} from '../services/api';
import { statusLabel } from '../utils/domain';
import { messageToneClasses } from '../utils/messageTone';
import { raceStatusBadgeClass } from '../utils/raceDisplay';
import SystemSettingsModal, {
  SystemSettingsTab,
} from './admin/SystemSettingsModal';

interface AdminPanelProps {
  onNavigate: (page: string) => void;
}

// Ghi chú: Hàm này đổi ngày từ input date sang ISO để gửi backend.
const dateInputToIso = (value: string) => {
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    const isValidDate =
      date.getUTCFullYear() === Number(year) &&
      date.getUTCMonth() === Number(month) - 1 &&
      date.getUTCDate() === Number(day);

    return isValidDate ? value : '';
  }

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

// Ghi chú: Hàm này render dashboard admin để duyệt hồ sơ, quản lý tournament và điều phối race.
export default function AdminPanel({ onNavigate }: AdminPanelProps) {

  const [pendingApprovals, setPendingApprovals] = useState<ApprovalItem[]>([]);
  const [approvalMessage, setApprovalMessage] = useState('');
  const [isLoadingApprovals, setIsLoadingApprovals] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [races, setRaces] = useState<RaceRecord[]>([]);
  const [pairings, setPairings] = useState<HorseRaceRegistration[]>([]);
  const [raceEntries, setRaceEntries] = useState<RaceEntryRecord[]>([]);
  const [maxRaceFieldSize, setMaxRaceFieldSize] = useState(0);
  const [minReadiedParticipants, setMinReadiedParticipants] = useState(0);
  const [maxRacesPerTournament, setMaxRacesPerTournament] = useState(0);
  const [showCreateTournament, setShowCreateTournament] = useState(false);
  const [tournamentMessage, setTournamentMessage] = useState('');
  const [editTournament, setEditTournament] = useState<TournamentRecord | null>(null);
  const [deleteTournamentTarget, setDeleteTournamentTarget] = useState<TournamentRecord | null>(null);
  const [cancelRaceTarget, setCancelRaceTarget] = useState<RaceRecord | null>(null);
  const [isCancellingRace, setIsCancellingRace] = useState(false);
  const [showSystemSettings, setShowSystemSettings] = useState(false);
  const [systemSettingsTab, setSystemSettingsTab] = useState<SystemSettingsTab>('race');
  const [systemSettingsMessage, setSystemSettingsMessage] = useState('');
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    maxOwnerHorses: 0,
    defaultDistanceMeters: 1600,
    maxHorsesPerRace: 0,
    minReadiedParticipants: 0,
    maxRacesPerTournament: 0,
    closeRegistrationHours: 24,
    autoPublishResults: false,
    requireOwnerApproval: true,
    requireJockeyApproval: true,
    requireRefereeApproval: true,
    allowSelfRegistration: true,
    notifyHorseRegistration: true,
    notifyJockeyRegistration: true,
    notifyRaceResults: true,
    notifyAdmins: true,
    notifyReferees: true,
    notifyOwners: true,
    notifyJockeys: true,
    maintenanceMode: false,
    auditSettingsChanges: true,
    archiveCompletedAfterDays: 90,
  });

  const [bettingRaces, setBettingRaces] = useState<AdminBettingRaceSummary[]>([]);

  const [expandedTournaments, setExpandedTournaments] = useState<Record<string, boolean>>({});
  // Ghi chú: Hàm này bật/tắt nghiệp vụ liên quan đến toggle tournament.
  const toggleTournament = (tournamentId: string) => {
    setExpandedTournaments((prev) => ({ ...prev, [tournamentId]: !prev[tournamentId] }));
  };
  const [tournamentForm, setTournamentForm] = useState({
    name: '',
    startDate: '',
    finalDate: '',
    location: '',
  });

  // Ghi chú: Hàm này tải nghiệp vụ liên quan đến load approvals.
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
    getBootstrap({ scope: 'admin' })
      .then((data) => {
        setRaces(data.races || []);
        setPairings(data.horseRaceRegistrations || []);
        setRaceEntries(data.raceEntries || []);
        const nextSettings = data.systemSettings;
        const nextMaxRaceFieldSize =
          nextSettings?.maxHorsesPerRace ?? data.limits?.maxRaceFieldSize ?? 0;
        const nextMinReadiedParticipants =
          nextSettings?.minReadiedParticipants ?? data.limits?.minReadiedParticipants ?? 0;
        const nextMaxRacesPerTournament =
          nextSettings?.maxRacesPerTournament ?? data.limits?.maxRacesPerTournament ?? 0;

        setMaxRaceFieldSize(nextMaxRaceFieldSize);
        setMinReadiedParticipants(nextMinReadiedParticipants);
        setMaxRacesPerTournament(nextMaxRacesPerTournament);
        setSystemSettings((current) => ({
          ...current,
          ...(nextSettings || {}),
          maxHorsesPerRace: nextMaxRaceFieldSize,
          minReadiedParticipants: nextMinReadiedParticipants,
          maxRacesPerTournament: nextMaxRacesPerTournament,
        }));
        setTotalUsers(data.users.length);
        setTournaments(data.tournaments || []);
      })
      .catch(() => undefined);
    getAdminBetting()
      .then((data) => {
        setBettingRaces(data.raceSummaries || []);
      })
      .catch(() => undefined);
  }, []);

  // Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến handle decision.
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

  const activeTournaments = tournaments.filter(
    (tournament) => tournament.status !== 'completed'
  );
  const activeTournamentIds = new Set(activeTournaments.map((item) => item.id));
  const registeredPairKeys = pairings.filter(
    (pairing) =>
      pairing.status === 'approved' &&
      Boolean(pairing.jockeyUserId) &&
      activeTournamentIds.has(pairing.tournamentId)
  ).map((pairing) => `${pairing.horseId}:${pairing.jockeyUserId}`);
  const activeRaceIds = new Set(
    races
      .filter((race) => !['finished', 'completed'].includes(race.status))
      .map((race) => race.id)
  );
  const activeEntryPairKeys = raceEntries
    .filter(
      (entry) => entry.status === 'approved' && activeRaceIds.has(entry.raceId)
    )
    .map((entry) => `${entry.horseId}:${entry.jockeyUserId}`);
  const activePairingCount = new Set([
    ...registeredPairKeys,
    ...activeEntryPairKeys,
  ]).size;

  const totalPoolCredits = bettingRaces.reduce((sum, race) => sum + race.poolTotal, 0);
  const totalActiveBets = bettingRaces.reduce((sum, race) => sum + race.counts.pending, 0);

  const systemStats = [
    {
      label: 'Total Users',
      value: String(totalUsers),
      change: 'Accounts',
      icon: Users,
    },

    {
      label: 'Active Tournaments',
      value: String(activeTournaments.length),
      change: activeTournaments[0]
        ? statusLabel(activeTournaments[0].status)
        : 'None',
      icon: Calendar,
    },

    {
      label: 'Pending Approvals',
      value: String(pendingApprovals.length),
      change: 'Review now',
      icon: Shield,
    },

    {
      label: 'Active Pairings',
      value: String(activePairingCount),
      change: 'Matched Owner + Jockey',
      icon: BarChart3,
    },

    {
      label: 'Betting Pool',
      value: `${totalPoolCredits.toFixed(0)}`,
      change: `${totalActiveBets} active bets`,
      icon: Coins,
    },
  ];


  const canCreateRace = tournaments.some(
    (tournament) =>
      tournament.status !== 'completed' &&
      races.filter((race) => race.tournamentId === tournament.id).length <
        maxRacesPerTournament
  );

  // Ghi chú: Hàm này xử lý thao tác updateSystemSetting trong luồng nghiệp vụ.
  const updateSystemSetting = <Key extends keyof SystemSettings>(
    key: Key,
    value: SystemSettings[Key]
  ) => {
    setSystemSettings((current) => ({
      ...current,
      [key]: value,
    }));
    setSystemSettingsMessage('');
  };

  // Ghi chú: Hàm này xử lý thao tác saveSystemSettingsDraft trong luồng nghiệp vụ.
  const saveSystemSettingsDraft = () => {
    updateSystemSettings(systemSettings)
      .then(({ settings }) => {
        setSystemSettings(settings);
        setMaxRaceFieldSize(settings.maxHorsesPerRace);
        setMinReadiedParticipants(settings.minReadiedParticipants);
        setMaxRacesPerTournament(settings.maxRacesPerTournament);
        setSystemSettingsMessage('System settings saved.');
      })
      .catch((error) =>
        setSystemSettingsMessage(
          error instanceof Error ? error.message : 'Unable to save settings'
        )
      );
  };

  // Ghi chú: Đồng bộ race và entry trả về sau mọi thao tác Admin trên race.
  const applyRaceActionResult = (
    result: Awaited<ReturnType<typeof adminRaceAction>>
  ) => {
    setRaces((current) =>
      current.map((race) => (race.id === result.race.id ? result.race : race))
    );
    if (Array.isArray(result.entries)) {
      setRaceEntries((current) => {
        const updatedEntryIds = new Set(result.entries.map((entry) => entry.id));

        return [
          ...current.filter((entry) => !updatedEntryIds.has(entry.id)),
          ...result.entries,
        ];
      });
    }
  };

  // Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến handle race action.
  const handleRaceAction = (
    raceId: string,
    action:
      | 'close-registration'
      | 'publish'
      | 'start-race'
      | 'finish-race'
      | 'complete-results'
      | 'cancel-race'
  ) => {
    adminRaceAction(raceId, action)
      .then((result) => {
        applyRaceActionResult(result);
        setApprovalMessage(`Race status updated to ${statusLabel(result.race.status)}.`);
      })
      .catch((error) =>
        setApprovalMessage(
          error instanceof Error ? error.message : 'Race action failed'
        )
      );
  };

  // Ghi chú: Hàm này hủy race rồi chuyển sang màn reset lịch.
  const confirmCancelRace = () => {
    if (!cancelRaceTarget) return;

    setIsCancellingRace(true);
    adminRaceAction(cancelRaceTarget.id, 'cancel-race')
      .then((result) => {
        applyRaceActionResult(result);
        setApprovalMessage('Race cancelled. Set a new registration window and start time to reset it.');
        sessionStorage.setItem('selectedRaceId', result.race.id);
        setCancelRaceTarget(null);
        onNavigate('edit-race');
      })
      .catch((error) =>
        setApprovalMessage(
          error instanceof Error ? error.message : 'Race action failed'
        )
      )
      .finally(() => setIsCancellingRace(false));
  };

  // Ghi chú: Hàm này mở trang chi tiết race từ Admin Panel.
  const openRaceDetails = (raceId: string) => {
    sessionStorage.setItem('selectedRaceId', raceId);
    onNavigate('race-details');
  };

  // Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến race readiness.
  const raceReadiness = (raceId: string) => {
    const entries = raceEntries.filter(
      (entry) => entry.raceId === raceId && entry.status === 'approved'
    );
    const ready = entries.filter(
      (entry) => entry.preRaceStatus === 'ready' && !entry.disqualified
    ).length;
    const unchecked = entries.filter(
      (entry) => !['ready', 'absent'].includes(entry.preRaceStatus) && !entry.disqualified
    ).length;

    return { total: entries.length, ready, unchecked };
  };

  // Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến approved pair count.
  const approvedPairCount = (raceId: string) => {
    const entries = raceEntries.filter(
      (entry) =>
        entry.raceId === raceId &&
        entry.status === 'approved' &&
        entry.horseId &&
        entry.jockeyUserId
    );

    return Math.min(
      entries.length,
      new Set(entries.map((entry) => entry.horseId)).size,
      new Set(entries.map((entry) => entry.jockeyUserId)).size
    );
  };

  // Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến handle create tournament.
  const handleCreateTournament = () => {
    setTournamentMessage('');
    const startDate = dateInputToIso(tournamentForm.startDate);
    const finalDate = tournamentForm.finalDate
      ? dateInputToIso(tournamentForm.finalDate)
      : '';

    if (
      !tournamentForm.name ||
      !tournamentForm.startDate ||
      !tournamentForm.location
    ) {
      setTournamentMessage('Tournament name, start date and location are required.');
      return;
    }

    if (!startDate || (tournamentForm.finalDate && !finalDate)) {
      setTournamentMessage('Tournament dates must be valid.');
      return;
    }
    if (finalDate && finalDate < startDate) {
      setTournamentMessage('End date must be after start date.');
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
          startDate: '',
          finalDate: '',
          location: '',
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

  // Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến handle update tournament.
  const handleUpdateTournament = () => {
    if (!editTournament) return;

    setTournamentMessage('');

    const startDate = dateInputToIso(editTournament.startDate || '');
    const finalDate = editTournament.finalDate
      ? dateInputToIso(editTournament.finalDate)
      : '';

    if (!editTournament.name || !editTournament.startDate) {
      setTournamentMessage('Tournament name and start date are required.');
      return;
    }

    if (!startDate || (editTournament.finalDate && !finalDate)) {
      setTournamentMessage('Tournament dates must be valid.');
      return;
    }
    if (finalDate && finalDate < startDate) {
      setTournamentMessage('End date must be after start date.');
      return;
    }

    updateTournament(editTournament.id, {
      name: editTournament.name,
      startDate,
      finalDate,
      location: editTournament.location,
    })
      .then((result) => {
        setTournaments(result.tournaments);
        setEditTournament(null);
        setTournamentMessage('');
        setApprovalMessage('Tournament saved.');
      })
      .catch((error) =>
        setTournamentMessage(
          error instanceof Error ? error.message : 'Unable to save tournament'
        )
      );
  };

  // Ghi chú: Hàm này gửi request nghiệp vụ liên quan đến request delete tournament.
  const requestDeleteTournament = () => {
    if (!editTournament) return;
    setDeleteTournamentTarget(editTournament);
  };

  // Ghi chú: Hàm này xác nhận nghiệp vụ liên quan đến confirm delete tournament.
  const confirmDeleteTournament = () => {
    if (!deleteTournamentTarget) return;

    deleteTournament(deleteTournamentTarget.id)
      .then((result) => {
        const deletedRaceIds = new Set(result.raceIds);

        setTournaments(result.tournaments);
        setRaces((current) =>
          current.filter((race) => race.tournamentId !== result.tournamentId)
        );
        setRaceEntries((current) =>
          current.filter((entry) => !deletedRaceIds.has(entry.raceId))
        );
        setPairings((current) =>
          current.filter(
            (pairing) =>
              pairing.tournamentId !== result.tournamentId &&
              !deletedRaceIds.has(pairing.raceId)
          )
        );
        setEditTournament(null);
        setDeleteTournamentTarget(null);
        setTournamentMessage('');
        setApprovalMessage('Tournament deleted.');
      })
      .catch((error) =>
        setTournamentMessage(
          error instanceof Error ? error.message : 'Unable to delete tournament'
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">

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

                    <div className="mb-5 rounded-2xl border border-white/10 bg-[#0b2540] p-4">
                      <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-[#d4af37]">
                        <FileText className="h-4 w-4" />
                        Review information
                      </div>

                      <div className="grid gap-4 xl:grid-cols-2">
                        {item.reviewSections.map((section) => (
                          <div
                            key={`${item.id}-${section.title}`}
                            className="rounded-xl border border-white/10 bg-[#071a2f] p-4"
                          >
                            <h4 className="mb-3 text-base font-black text-white">
                              {section.title}
                            </h4>

                            <dl className="space-y-2">
                              {section.fields.map((field) => (
                                <div
                                  key={`${section.title}-${field.label}`}
                                  className="grid grid-cols-[minmax(110px,0.8fr)_minmax(0,1.2fr)] gap-3 text-sm"
                                >
                                  <dt className="text-gray-500">{field.label}</dt>
                                  <dd className="break-words text-right font-semibold text-gray-200">
                                    {field.value}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        ))}
                      </div>

                      {item.warnings.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {item.warnings.map((warning) => (
                            <div
                              key={warning}
                              className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-300"
                            >
                              Check before approval: {warning}
                            </div>
                          ))}
                        </div>
                      )}
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
                    Showing {tournaments.length} tournaments
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">

                  <button
                    onClick={() => canCreateRace && onNavigate('create-race')}
                    disabled={!canCreateRace}
                    title={
                      canCreateRace
                        ? undefined
                        : `Every active tournament already has ${maxRacesPerTournament} races`
                    }
                    className="flex items-center gap-2 px-5 py-3 bg-[#d4af37] disabled:bg-white/10 disabled:text-gray-500 rounded-xl hover:bg-[#b8892d] transition-all text-white font-bold"
                  >
                    <Plus className="w-5 h-5" />
                    Create Race
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {tournaments
                  .map((tournament) => {
                    const tournamentRaces = races.filter((r) => r.tournamentId === tournament.id);
                    const isExpanded = expandedTournaments[tournament.id];

                    return (
                      <div key={tournament.id} className="bg-[#071a2f] border border-white/10 rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between gap-4 p-5 hover:bg-white/5 transition-colors">
                          <button
                            onClick={() => toggleTournament(tournament.id)}
                            className="flex-1 flex items-center justify-between gap-4 text-left"
                          >
                            <div>
                              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                {tournament.name}
                                <span className="text-xs font-semibold px-2 py-1 bg-[#d4af37]/20 text-[#d4af37] rounded-lg">
                                  {tournamentRaces.length} races
                                </span>
                              </h3>
                            </div>
                            {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                          </button>

                          <button
                            onClick={() =>
                              setEditTournament({
                                ...tournament,
                                startDate: tournament.startDate || '',
                                finalDate: tournament.finalDate || '',
                              })
                            }
                            className="flex items-center gap-2 px-4 py-2 bg-[#d4af37]/10 text-[#d4af37] rounded-xl hover:bg-[#d4af37] hover:text-white transition-all border border-[#d4af37]/30 text-sm font-semibold"
                          >
                            <Pencil className="w-4 h-4" />
                            Edit
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="p-5 border-t border-white/10 space-y-4 bg-[#0a1e35]/50">
                            {tournamentRaces.length === 0 && (
                              <div className="bg-[#071a2f] border border-dashed border-white/15 rounded-xl p-5">
                                <p className="text-white font-bold">
                                  No races yet
                                </p>
                                <p className="text-gray-400 text-sm mt-1">
                                  This tournament is visible in Admin and ready for race creation.
                                </p>
                              </div>
                            )}

                            {tournamentRaces.map((race) => (
                              <div
                                key={race.id}
                                className="bg-[#071a2f] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="flex items-center gap-3 mb-2">
                                      <span className="px-3 py-1 rounded-xl bg-blue-600/15 border border-blue-600/30 text-blue-300 text-xs font-bold">
                                        {race.raceNumber || 'Race'}
                                      </span>

                                      <h3 className="text-xl font-bold text-white">
                                        {race.name}
                                      </h3>

                                      <span
                                        className={`px-3 py-1 rounded-xl text-xs font-bold ${raceStatusBadgeClass(race.status)}`}
                                      >
                                        {statusLabel(race.status)}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-4 text-gray-400 text-sm mt-3">
                                      <span>{race.date}</span>
                                      <span>•</span>
                                      <span>{race.time}</span>
                                      <span>•</span>
                                      <span>{race.participants} participants</span>
                                      {'referee' in race && (
                                        <>
                                          <span>•</span>
                                          <span>{race.referee}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex gap-3">
                                    {race.status === 'registration-open' && (
                                      <button
                                        onClick={() => handleRaceAction(race.id, 'close-registration')}
                                        disabled={approvedPairCount(race.id) !== maxRaceFieldSize}
                                        title={
                                          approvedPairCount(race.id) === maxRaceFieldSize
                                            ? undefined
                                            : `Admin must approve ${maxRaceFieldSize} horse-jockey pairs before closing registration. Current: ${approvedPairCount(race.id)}/${maxRaceFieldSize}.`
                                        }
                                        className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 text-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl hover:bg-yellow-500/20 transition-all border border-yellow-500/30 text-sm font-semibold"
                                      >
                                        Close Registration ({approvedPairCount(race.id)}/{maxRaceFieldSize})
                                      </button>
                                    )}

                                    {race.status === 'registration-closed' && (
                                      <button
                                        onClick={() => handleRaceAction(race.id, 'publish')}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600/10 text-green-400 rounded-xl hover:bg-green-600/20 transition-all border border-green-600/30 text-sm font-semibold"
                                      >
                                        Publish
                                      </button>
                                    )}

                                    {race.status === 'published' && (() => {
                                      const readiness = raceReadiness(race.id);
                                      const disabled =
                                        readiness.ready < minReadiedParticipants ||
                                        readiness.unchecked > 0;

                                      return (
                                        <button
                                          onClick={() => handleRaceAction(race.id, 'start-race')}
                                          disabled={disabled}
                                          title={
                                            disabled
                                              ? `Need at least ${minReadiedParticipants} Ready participants and 0 unchecked. Current: ${readiness.ready} ready, ${readiness.unchecked} unchecked.`
                                              : undefined
                                          }
                                          className="flex items-center gap-2 px-4 py-2 bg-[#d4af37]/10 text-[#d4af37] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl hover:bg-[#d4af37]/20 transition-all border border-[#d4af37]/30 text-sm font-semibold"
                                        >
                                          Start Race
                                        </button>
                                      );
                                    })()}

                                    {race.status === 'in-progress' && (
                                      <button
                                        onClick={() => handleRaceAction(race.id, 'finish-race')}
                                        className="flex items-center gap-2 px-4 py-2 bg-purple-600/10 text-purple-300 rounded-xl hover:bg-purple-600/20 transition-all border border-purple-600/30 text-sm font-semibold"
                                      >
                                        Finish Race
                                      </button>
                                    )}

                                    {race.status === 'finished' && race.resultStatus === 'submitted' && (
                                      <button
                                        onClick={() => handleRaceAction(race.id, 'complete-results')}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600/10 text-green-400 rounded-xl hover:bg-green-600/20 transition-all border border-green-600/30 text-sm font-semibold"
                                      >
                                        Approve Results / Complete Race
                                      </button>
                                    )}

                                    <button
                                      onClick={() => setCancelRaceTarget(race)}
                                      disabled={['in-progress', 'finished', 'completed', 'cancelled'].includes(race.status)}
                                      className="flex items-center gap-2 px-4 py-2 bg-red-600/10 text-red-300 rounded-xl hover:bg-red-600/20 transition-all border border-red-600/30 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <XCircle className="w-4 h-4" />
                                      Cancel Race
                                    </button>

                                    <button
                                      onClick={() => {
                                        sessionStorage.setItem('selectedRaceId', race.id);
                                        onNavigate('edit-race');
                                      }}
                                      disabled={!['registration-open', 'registration-closed', 'cancelled'].includes(race.status)}
                                      className="flex items-center gap-2 px-4 py-2 bg-[#d4af37]/10 text-[#d4af37] rounded-xl hover:bg-[#d4af37] hover:text-white transition-all border border-[#d4af37]/30 text-sm font-semibold disabled:opacity-50 disabled:hover:bg-[#d4af37]/10 disabled:hover:text-[#d4af37]"
                                    >
                                      <Pencil className="w-4 h-4" />
                                      Edit
                                    </button>

                                    <button
                                      onClick={() => openRaceDetails(race.id)}
                                      className="flex items-center gap-2 px-4 py-2 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-all text-sm font-semibold"
                                    >
                                      <Eye className="w-4 h-4" />
                                      View
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                
                {/* Fallback for races without a tournament */}
                {races.filter((r) => !r.tournamentId || !tournaments.some((t) => t.id === r.tournamentId)).length > 0 && (
                  <div className="bg-[#071a2f] border border-white/10 rounded-2xl p-5">
                    <h3 className="text-xl font-bold text-white mb-4">Other Races</h3>
                    <div className="space-y-4">
                      {races.filter((r) => !r.tournamentId || !tournaments.some((t) => t.id === r.tournamentId)).map((race) => (
                        <div key={race.id} className="bg-[#0a1e35]/50 border border-white/10 rounded-xl p-5">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 rounded-xl bg-blue-600/15 border border-blue-600/30 text-blue-300 text-xs font-bold">
                                  {race.raceNumber || 'Race'}
                                </span>
                                <h3 className="text-xl font-bold text-white">{race.name}</h3>
                              </div>
                            </div>
                            <button
                              onClick={() => openRaceDetails(race.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-all text-sm font-semibold"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                    onClick: () => onNavigate('manage-users'),
                  },

                  {
                    icon: Calendar,
                    label: 'Race Builder',
                    onClick: () => canCreateRace && onNavigate('create-race'),
                  },

                  {
                    icon: Layers3,
                    label: 'Race Class Catalog',
                    onClick: () => onNavigate('race-classes'),
                  },

                  {
                    icon: Settings,
                    label: 'System Settings',
                    onClick: () => {
                      getSystemSettings()
                        .then(({ settings }) => setSystemSettings(settings))
                        .catch(() => undefined);
                      setShowSystemSettings(true);
                    },
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

            {/* BETTING ACTIVITY */}

            <div className="bg-[#12304f] border border-white/10 rounded-3xl p-8">

              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black text-white">
                  Betting Activity
                </h2>
                <button
                  onClick={() => onNavigate('admin-betting')}
                  className="px-4 py-2 bg-[#d4af37]/20 border border-[#d4af37] rounded-xl text-[#d4af37] font-bold text-sm hover:bg-[#d4af37] hover:text-white transition-all"
                >
                  View All
                </button>
              </div>

              {bettingRaces.length === 0 ? (
                <p className="text-gray-400">No betting activity yet.</p>
              ) : (
                <div className="space-y-4">
                  {bettingRaces.slice(0, 5).map((race) => (
                    <div
                      key={race.raceId}
                      className="bg-[#071a2f] border border-white/10 rounded-2xl p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-white font-bold truncate">
                          {race.raceName}
                        </h4>
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${raceStatusBadgeClass(race.raceStatus)}`}>
                          {statusLabel(race.raceStatus)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Pool</span>
                          <span className="block text-[#d4af37] font-bold">
                            {race.poolTotal.toFixed(0)} credits
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Max Bet</span>
                          <span className="block text-white font-bold">
                            {race.betLimit == null ? 'Unlimited' : `${race.betLimit} credits`}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Bettors</span>
                          <span className="block text-white font-bold">
                            {race.uniqueBettors}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Pending</span>
                          <span className="block text-yellow-400 font-bold">
                            {race.counts.pending}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Settled</span>
                          <span className="block text-emerald-400 font-bold">
                            {race.counts.won + race.counts.lost}
                          </span>
                        </div>
                      </div>

                      {race.totalPaidOut > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-1 text-sm text-emerald-400">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span className="font-semibold">{race.totalPaidOut.toFixed(0)}</span> credits paid out
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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

        {showSystemSettings && (
          <SystemSettingsModal
            settings={systemSettings}
            tab={systemSettingsTab}
            message={systemSettingsMessage}
            onTabChange={(tab) => {
              setSystemSettingsTab(tab);
              setSystemSettingsMessage('');
            }}
            onSettingChange={updateSystemSetting}
            onSave={saveSystemSettingsDraft}
            onClose={() => {
              setShowSystemSettings(false);
              setSystemSettingsMessage('');
            }}
          />
        )}

        {deleteTournamentTarget && (
          <div className="fixed inset-0 bg-[#071a2f]/80 flex items-center justify-center z-[60] p-4">
            <div className="bg-[#12304f] p-8 rounded-3xl w-full max-w-lg border border-red-500/30">
              <div className="flex items-center gap-3 text-red-300 mb-4">
                <Trash2 className="w-6 h-6" />
                <h2 className="text-2xl font-black text-white">
                  Delete Tournament?
                </h2>
              </div>

              <p className="text-gray-300 leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-white">{deleteTournamentTarget.name}</span>? This will delete the tournament and all races, entries, registrations, referee assignments and reports under it.
              </p>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setDeleteTournamentTarget(null)}
                  className="flex-1 py-4 bg-white/10 rounded-2xl text-white"
                >
                  Cancel
                </button>

                <button
                  onClick={confirmDeleteTournament}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-red-600 hover:bg-red-700 rounded-2xl text-white font-bold"
                >
                  <Trash2 className="w-5 h-5" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {cancelRaceTarget && (
          <div className="fixed inset-0 bg-[#071a2f]/80 flex items-center justify-center z-[60] p-4">
            <div className="bg-[#12304f] p-8 rounded-3xl w-full max-w-lg border border-red-500/30">
              <div className="flex items-center gap-3 text-red-300 mb-4">
                <XCircle className="w-6 h-6" />
                <h2 className="text-2xl font-black text-white">
                  Cancel Race?
                </h2>
              </div>

              <p className="text-gray-300 leading-relaxed">
                Cancel <span className="font-bold text-white">{cancelRaceTarget.name}</span> now?
                The race will be kept for audit/testing, then you will be taken to reset its
                registration window and start time before running it again.
              </p>

              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 mt-5 text-sm text-amber-100">
                Existing race registrations and entries are not reset until you submit the reset
                form on the next screen.
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setCancelRaceTarget(null)}
                  disabled={isCancellingRace}
                  className="flex-1 py-4 bg-white/10 rounded-2xl text-white disabled:opacity-60"
                >
                  Keep Race
                </button>

                <button
                  onClick={confirmCancelRace}
                  disabled={isCancellingRace}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-2xl text-white font-bold"
                >
                  <XCircle className="w-5 h-5" />
                  {isCancellingRace ? 'Cancelling...' : 'Cancel & Reset'}
                </button>
              </div>
            </div>
          </div>
        )}

        {editTournament && (
          <div className="fixed inset-0 bg-[#071a2f]/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#12304f] p-8 rounded-3xl w-full max-w-2xl border border-white/10">
              <h2 className="text-3xl font-black text-white mb-2">
                Edit Tournament
              </h2>

              <p className="text-gray-400 mb-6">
                Update tournament name and schedule dates.
              </p>

              {tournamentMessage && (
                <div className={`mb-5 rounded-xl border px-4 py-3 font-semibold ${messageToneClasses(tournamentMessage)}`}>
                  {tournamentMessage}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-5">
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-bold uppercase tracking-[0.16em] text-[#d4af37]">
                    Tournament name
                  </span>
                  <input
                    type="text"
                    value={editTournament.name}
                    onChange={(event) =>
                      setEditTournament({
                        ...editTournament,
                        name: event.target.value,
                      })
                    }
                    className="w-full bg-[#071a2f] border border-white/10 rounded-2xl px-5 py-4 text-white"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold uppercase tracking-[0.16em] text-[#d4af37]">
                    Start date
                  </span>
                  <input
                    type="date"
                    value={editTournament.startDate || ''}
                    onChange={(event) =>
                      setEditTournament({
                        ...editTournament,
                        startDate: event.target.value,
                      })
                    }
                    className="w-full bg-[#071a2f] border border-white/10 rounded-2xl px-5 py-4 text-white"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold uppercase tracking-[0.16em] text-[#d4af37]">
                    End date
                  </span>
                  <input
                    type="date"
                    value={editTournament.finalDate || ''}
                    onChange={(event) =>
                      setEditTournament({
                        ...editTournament,
                        finalDate: event.target.value,
                      })
                    }
                    className="w-full bg-[#071a2f] border border-white/10 rounded-2xl px-5 py-4 text-white"
                  />
                </label>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={requestDeleteTournament}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-red-600 hover:bg-red-700 rounded-2xl text-white font-bold"
                >
                  <Trash2 className="w-5 h-5" />
                  Delete
                </button>

                <button
                  onClick={() => {
                    setEditTournament(null);
                    setTournamentMessage('');
                  }}
                  className="flex-1 py-4 bg-white/10 rounded-2xl text-white"
                >
                  Cancel
                </button>

                <button
                  onClick={handleUpdateTournament}
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
                <label className="space-y-2">
                  <span className="text-sm font-bold uppercase tracking-[0.16em] text-[#d4af37]">
                    Tournament name
                  </span>
                  <input
                    type="text"
                    placeholder="Giải Demo Tiếng Việt"
                    value={tournamentForm.name}
                    onChange={(event) =>
                      setTournamentForm({
                        ...tournamentForm,
                        name: event.target.value,
                      })
                    }
                    className="w-full bg-[#071a2f] border border-white/10 rounded-2xl px-5 py-4 text-white"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold uppercase tracking-[0.16em] text-[#d4af37]">
                    Start date
                  </span>
                  <input
                    type="date"
                    value={tournamentForm.startDate}
                    onChange={(event) =>
                      setTournamentForm({
                        ...tournamentForm,
                        startDate: event.target.value,
                      })
                    }
                    className="w-full bg-[#071a2f] border border-white/10 rounded-2xl px-5 py-4 text-white"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold uppercase tracking-[0.16em] text-[#d4af37]">
                    End date
                  </span>
                  <input
                    type="date"
                    value={tournamentForm.finalDate}
                    onChange={(event) =>
                      setTournamentForm({
                        ...tournamentForm,
                        finalDate: event.target.value,
                      })
                    }
                    className="w-full bg-[#071a2f] border border-white/10 rounded-2xl px-5 py-4 text-white"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold uppercase tracking-[0.16em] text-[#d4af37]">
                    Location
                  </span>
                  <input
                    type="text"
                    placeholder="Sân đua Đại học"
                    value={tournamentForm.location}
                    onChange={(event) =>
                      setTournamentForm({
                        ...tournamentForm,
                        location: event.target.value,
                      })
                    }
                    className="w-full bg-[#071a2f] border border-white/10 rounded-2xl px-5 py-4 text-white"
                  />
                </label>

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
      </div>
    </div>
  );
}
