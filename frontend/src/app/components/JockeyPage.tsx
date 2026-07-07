import { useEffect, useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  HeartPulse,
  Flag,
  Gauge,
  MapPin,
  Save,
  Scale,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  AuthUser,
  HorseRecord,
  JockeyInvitation,
  JockeyProfileRecord,
  RaceEntryRecord,
  RaceRecord,
  TournamentRecord,
  decideJockeyInvitation,
  getJockeyPortal,
  saveJockeyProfile,
} from '../services/api';
import { formatWeightLb, statusLabel } from '../utils/domain';
import { messageToneClasses } from '../utils/messageTone';

interface JockeyPageProps {
  currentUser: AuthUser | null;
  onNavigate: (page: string) => void;
}

const numberLabel = (value?: number | null, suffix = '') => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 'Not set';
  return `${parsed.toFixed(0)}${suffix}`;
};

const horseRatingLabel = (horse?: HorseRecord) => {
  const rating = horse?.overallRating ?? horse?.baseHandicap;
  return Number.isFinite(Number(rating)) ? Number(rating).toFixed(0) : 'TBD';
};

export default function JockeyPage({
  currentUser,
  onNavigate,
}: JockeyPageProps) {
  const [profile, setProfile] = useState<JockeyProfileRecord | null>(null);
  const [horses, setHorses] = useState<HorseRecord[]>([]);
  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [races, setRaces] = useState<RaceRecord[]>([]);
  const [raceEntries, setRaceEntries] = useState<RaceEntryRecord[]>([]);
  const [invitations, setInvitations] = useState<JockeyInvitation[]>([]);
  const [bio, setBio] = useState('');
  const [certificate, setCertificate] = useState('');
  const [competitionLevel, setCompetitionLevel] = useState('');
  const [weightLb, setWeightLb] = useState('');
  const [message, setMessage] = useState('');
  const [participationExpanded, setParticipationExpanded] = useState(false);
  const [assignedExpanded, setAssignedExpanded] = useState(false);
  const [expandedHorseInfoKeys, setExpandedHorseInfoKeys] = useState<Set<string>>(
    new Set()
  );

  const loadPortal = () => {
    getJockeyPortal()
      .then((data) => {
        setProfile(data.profile);
        setHorses(data.horses);
        setTournaments(data.tournaments);
        setRaces(data.races);
        setRaceEntries(data.raceEntries);
        setInvitations(data.invitations);
        setParticipationExpanded(false);
        setAssignedExpanded(false);
        setExpandedHorseInfoKeys(new Set());
        setBio(data.profile?.bio || '');
        setCertificate(data.profile?.certificate || '');
        setCompetitionLevel(data.profile?.competitionLevel || '');
        setWeightLb(data.profile?.weightLb ? String(data.profile.weightLb) : '');
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to load jockey portal')
      );
  };

  useEffect(() => {
    if (currentUser?.role === 'jockey') {
      loadPortal();
    }
  }, [currentUser?.role]);

  const publishProfile = () => {
    saveJockeyProfile({
      bio,
      certificate,
      competitionLevel,
      weightLb,
    })
      .then(({ profile: updatedProfile }) => {
        setProfile(updatedProfile);
        setMessage('Profile published. Join a tournament so owners can select you after Admin approves their horses.');
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to publish profile')
      );
  };

  const respond = (id: string, decision: 'accepted' | 'rejected') => {
    decideJockeyInvitation(id, decision)
      .then(() => {
        setMessage(
          decision === 'accepted'
            ? 'Invitation accepted. Admin has been notified to approve your race assignment.'
            : 'Invitation rejected. Owner has been notified.'
        );
        loadPortal();
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to respond')
      );
  };

  const raceById = (raceId: string) =>
    races.find((race) => race.id === raceId);
  const horseById = (horseId: string) =>
    horses.find((horse) => horse.id === horseId);
  const tournamentById = (tournamentId?: string | null) =>
    tournaments.find((tournament) => tournament.id === tournamentId);
  const needsJockeyResponse = (invitation: JockeyInvitation) =>
    invitation.status === 'pending';

  const visibleInvitations = participationExpanded
    ? invitations
    : invitations.slice(0, 4);

  const visibleAssignedEntries = assignedExpanded
    ? raceEntries
    : raceEntries.slice(0, 3);

  const canViewLine = (race?: RaceRecord) =>
    Boolean(
      race &&
        ['published', 'in-progress', 'finished', 'completed'].includes(race.status)
    );
  const toggleHorseInfo = (key: string) => {
    setExpandedHorseInfoKeys((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  };

  const renderHorseInformation = (
    horse?: HorseRecord,
    ratingSnapshot?: number,
    informationKey?: string
  ) => {
    if (!horse) {
      return (
        <div className="mt-4 rounded-xl border border-white/10 bg-[#0b223d] p-4 text-gray-400 text-sm">
          Horse information is not available yet.
        </div>
      );
    }

    const profileItems = [
      { label: 'Breed', value: horse.breed || 'Not set', icon: Activity },
      { label: 'Age', value: numberLabel(horse.age, ' years'), icon: Activity },
      { label: 'Sex', value: horse.sex || 'Not set', icon: ShieldCheck },
      { label: 'Color', value: horse.color || 'Not set', icon: ShieldCheck },
      { label: 'Horse Weight', value: formatWeightLb(horse.weightLb), icon: Scale },
      {
        label: 'Official Rating',
        value: ratingSnapshot ?? horseRatingLabel(horse),
        icon: Gauge,
      },
      { label: 'Speed', value: numberLabel(horse.speedRating), icon: Gauge },
      { label: 'Stamina', value: numberLabel(horse.staminaRating), icon: HeartPulse },
    ];
    const compactLabels = new Set([
      'Breed',
      'Age',
      'Sex',
      'Color',
      'Horse Weight',
      'Official Rating',
    ]);
    const expandKey = informationKey || horse.id;
    const isExpanded = expandedHorseInfoKeys.has(expandKey);
    const visibleProfileItems = isExpanded
      ? profileItems
      : profileItems.filter(({ label }) => compactLabels.has(label));

    return (
      <div className="relative mt-4 rounded-xl border border-white/10 bg-[#0b223d] p-4 pb-7">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="text-gray-300 text-xs uppercase font-bold">
            Horse Information
          </div>

          <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-bold text-gray-300">
            {statusLabel(horse.status)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {visibleProfileItems.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
            >
              <div className="flex items-center gap-1.5 text-[11px] uppercase font-bold text-gray-500">
                <Icon className="h-3.5 w-3.5 text-[#d4af37]" />
                {label}
              </div>

              <div className="mt-1 text-sm font-bold text-white">
                {value}
              </div>
            </div>
          ))}
        </div>

        {isExpanded && (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-gray-300">
                Health: <span className="font-bold text-white">{horse.healthStatus || 'Not set'}</span>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-gray-300">
                Species: <span className="font-bold text-white">{horse.species || 'Not set'}</span>
              </div>
            </div>

            {horse.profileNotes && (
              <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300">
                {horse.profileNotes}
              </p>
            )}
          </>
        )}

        <button
          type="button"
          onClick={() => toggleHorseInfo(expandKey)}
          aria-label={
            isExpanded
              ? `Collapse full information for ${horse.name}`
              : `Expand full information for ${horse.name}`
          }
          title={
            isExpanded
              ? `Collapse full information for ${horse.name}`
              : `Expand full information for ${horse.name}`
          }
          className="absolute left-1/2 bottom-0 flex h-8 w-8 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border border-[#d4af37]/40 bg-[#071a2f] text-[#d4af37] shadow-lg shadow-black/20 hover:bg-[#12304f] focus:outline-none focus:ring-2 focus:ring-[#d4af37]/60"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  };

  if (currentUser?.role !== 'jockey') {
    return (
      <div className="min-h-screen bg-[#071a2f] pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold text-white mb-4">
            Jockey Profiles
          </h1>

          <p className="text-gray-400 mb-8">
            Owners choose jockeys from published profiles inside the Owner Portal.
          </p>

          <button
            onClick={() => onNavigate('horses')}
            className="px-6 py-3 rounded-xl bg-[#d4af37] text-white font-bold hover:bg-[#b8892d] transition-all"
          >
            Go to Owner Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#071a2f] pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4">

        <h1 className="text-4xl font-bold text-white mb-3">
          Jockey Portal
        </h1>

        <p className="text-gray-400 mb-8">
          Publish your profile, join races, then accept owner requests after their horses are approved by Admin.
        </p>

        {message && (
          <div className={`mb-8 rounded-2xl border p-4 font-semibold ${messageToneClasses(message)}`}>
            {message}
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr,420px] gap-8">
          <div className="bg-[#12304f] border border-white/10 rounded-2xl p-8">
            <h2 className="text-3xl font-black text-white mb-6">
              My Public Profile
            </h2>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-gray-300 mb-2">Bio</label>

                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  rows={5}
                  className="w-full bg-[#071a2f] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#d4af37]"
                  placeholder="Describe your racing experience"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Certificate</label>

                <input
                  value={certificate}
                  onChange={(event) => setCertificate(event.target.value)}
                  className="w-full bg-[#071a2f] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#d4af37]"
                  placeholder="Class A Racing License"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Competition Level</label>

                <input
                  value={competitionLevel}
                  onChange={(event) => setCompetitionLevel(event.target.value)}
                  className="w-full bg-[#071a2f] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#d4af37]"
                  placeholder="Elite / Qualifier / Amateur"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Weight (lb)</label>

                <input
                  type="number"
                  value={weightLb}
                  onChange={(event) => setWeightLb(event.target.value)}
                  className="w-full bg-[#071a2f] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#d4af37]"
                  placeholder="120"
                />
              </div>
            </div>

            <button
              onClick={publishProfile}
              className="mt-6 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#d4af37] text-white font-bold hover:bg-[#b8892d] transition-all"
            >
              <Save className="w-5 h-5" />
              Publish Profile
            </button>

            <div className="mt-6 rounded-xl bg-[#071a2f] border border-white/10 p-4 text-gray-400">
              Current status: <span className="text-white font-bold">{profile?.status || 'No profile'}</span>
            </div>
          </div>

          <div className="bg-[#12304f] border border-white/10 rounded-2xl p-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-3xl font-black text-white">
                  Race Participation
                </h2>

                <p className="text-gray-400 text-sm mt-1">
                  Showing {visibleInvitations.length}/{invitations.length} requests
                </p>
              </div>

              {invitations.length > 4 && (
                <button
                  onClick={() => setParticipationExpanded((current) => !current)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-2 text-[#d4af37] font-bold hover:bg-[#d4af37]/20 transition-all"
                >
                  {participationExpanded ? 'Show Less' : `View All ${invitations.length}`}
                  {participationExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>

            <div className="space-y-4">
              {invitations.length === 0 && (
                <div className="rounded-xl bg-[#071a2f] border border-white/10 p-4 text-gray-500">
                  No owner requests yet.
                </div>
              )}

              {visibleInvitations.map((invitation) => {
                const horse = horseById(invitation.horseId);

                return (
                  <div
                    key={invitation.id}
                    className="rounded-xl bg-[#071a2f] border border-white/10 p-4"
                  >
                    <div className="text-white font-bold">
                      {horse?.name || 'Horse'}
                    </div>

                    <div className="text-gray-400 text-sm mt-1">
                      {invitation.raceId
                        ? `Race: ${races.find((race) => race.id === invitation.raceId)?.name || 'Race'}`
                        : `Tournament: ${tournamentById(invitation.tournamentId)?.name || 'Tournament'}`}{' '}
                      • Status: {statusLabel(invitation.status)}
                    </div>

                    {needsJockeyResponse(invitation) && (
                      <div className="text-blue-300 text-sm mt-2 font-semibold">
                        Owner selected you after Admin approved the horse. Accept to send this pairing to final Admin approval.
                      </div>
                    )}

                    {renderHorseInformation(horse, undefined, `invitation-${invitation.id}`)}

                    {invitation.status === 'accepted' && (
                      <div className="text-yellow-400 text-sm mt-2 font-semibold">
                        Admin approval:{' '}
                        {statusLabel(invitation.adminStatus || 'pending')}
                      </div>
                    )}

                    {needsJockeyResponse(invitation) && (
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <button
                          onClick={() => respond(invitation.id, 'accepted')}
                          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition-all"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Accept
                        </button>

                        <button
                          onClick={() => respond(invitation.id, 'rejected')}
                          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all"
                        >
                          <XCircle className="w-5 h-5" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 border-t border-white/10 pt-6">
              <h3 className="text-2xl font-black text-white mb-4">
                Assigned Horses
              </h3>

              <div className="space-y-4">
                {raceEntries.length === 0 && (
                  <div className="rounded-xl bg-[#071a2f] border border-white/10 p-4 text-gray-500">
                    No approved assignments yet.
                  </div>
                )}

                {visibleAssignedEntries.map((entry) => {
                  const race = raceById(entry.raceId);
                  const horse = horseById(entry.horseId);
                  const lineVisible = canViewLine(race);

                  return (
                    <div
                      key={entry.id}
                      className="rounded-xl bg-[#071a2f] border border-white/10 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-white font-bold">
                            {entry.horseName}
                          </div>

                          <div className="text-gray-400 text-sm mt-1">
                            {entry.raceName} • {statusLabel(race?.status || entry.status)}
                          </div>
                        </div>

                        <span className="px-3 py-1 rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#f6d77a] text-xs font-bold">
                          {race?.raceNumber || 'Race'}
                        </span>
                      </div>

                      {renderHorseInformation(horse, entry.ratingSnapshot, `entry-${entry.id}`)}

                      <div className="mt-4 rounded-xl border border-white/10 bg-[#0b223d] p-4">
                        <div className="flex items-center gap-2 text-gray-400 text-xs uppercase font-bold mb-3">
                          <Flag className="w-4 h-4 text-[#d4af37]" />
                          Starting Line / Gate Assignment
                        </div>

                        {lineVisible ? (
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <p className="text-gray-500 text-xs">Gate / Line</p>
                              <p className="text-white text-2xl font-black">
                                {entry.lane || 'TBD'}
                              </p>
                            </div>

                            <div>
                              <p className="text-gray-500 text-xs">Rating</p>
                              <p className="text-white text-2xl font-black">
                                {entry.ratingSnapshot ?? 'TBD'}
                              </p>
                            </div>

                            <div>
                              <p className="text-gray-500 text-xs">Assigned Wt. (lb)</p>
                              <p className="text-white text-2xl font-black">
                                {formatWeightLb(entry.handicap)}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-400 text-sm">
                            Line/gate is hidden until Admin closes registration and publishes this race.
                          </p>
                        )}
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3 mt-3 text-sm">
                        <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-gray-300">
                          <MapPin className="inline-block w-4 h-4 mr-1 text-[#d4af37]" />
                          {race?.venue || 'Venue pending'}
                        </div>

                        <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-gray-300">
                          <Gauge className="inline-block w-4 h-4 mr-1 text-[#d4af37]" />
                          {race?.distance || 'Distance pending'}
                        </div>
                      </div>

                      <button
                        onClick={() => onNavigate('live-race')}
                        className="mt-4 w-full rounded-xl bg-white/10 px-4 py-3 text-white font-bold hover:bg-white/15 transition-all"
                      >
                        View Race Operations
                      </button>
                    </div>
                  );
                })}
              </div>

              {raceEntries.length > 3 && (
                <button
                  onClick={() => setAssignedExpanded((current) => !current)}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-3 text-[#d4af37] font-bold hover:bg-[#d4af37]/20 transition-all"
                >
                  {assignedExpanded ? 'Show Less' : `View All ${raceEntries.length}`}
                  {assignedExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
