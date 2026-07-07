import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Bell, CalendarClock, Trash2 } from 'lucide-react';
import {
  RaceBuilderReferee,
  RaceRecord,
  TournamentRecord,
  createRace,
  deleteRace,
  getRaceBuilder,
  updateRace,
} from '../services/api';
import { messageToneClasses } from '../utils/messageTone';

interface CreateRacePageProps {
  onNavigate: (page: string) => void;
  mode?: 'create' | 'edit';
}

const EDITABLE_RACE_STATUSES = ['registration-open', 'registration-closed'];

const toDatetimeLocal = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';

  const pad = (part: number) => String(part).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const parseRefereeUserIds = (value?: string | string[]) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseDistanceMeters = (value?: string) => value?.replace(/m$/i, '') || '';

const RACE_CLASS_WEIGHT_RANGES: Record<string, { minWeightLb: string; topWeightLb: string }> = {
  'Class 1': { topWeightLb: '135', minWeightLb: '115' },
  'Class 2': { topWeightLb: '135', minWeightLb: '115' },
  'Class 3': { topWeightLb: '133', minWeightLb: '113' },
  'Class 4': { topWeightLb: '132', minWeightLb: '112' },
  'Class 5': { topWeightLb: '130', minWeightLb: '110' },
  Open: { topWeightLb: '135', minWeightLb: '110' },
};

export default function CreateRacePage({
  onNavigate,
  mode = 'create',
}: CreateRacePageProps) {
  const { raceId } = useParams();
  const isEdit = mode === 'edit';
  const fieldClass =
    'min-h-[54px] w-full bg-[#071a2f] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 outline-none focus:border-[#d4af37]/70 focus:ring-2 focus:ring-[#d4af37]/20 disabled:cursor-not-allowed disabled:opacity-60';

  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [races, setRaces] = useState<RaceRecord[]>([]);
  const [referees, setReferees] = useState<RaceBuilderReferee[]>([]);
  const [maxRacesPerTournament, setMaxRacesPerTournament] = useState(10);
  const [editingRace, setEditingRace] = useState<RaceRecord | null>(null);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    tournamentId: '',
    raceNumber: '',
    raceName: '',
    raceDate: '',
    startTime: '',
    registrationOpensAt: '',
    registrationClosesAt: '',
    venue: '',
    distance: '',
    surfaceType: '',
    raceClass: '',
    handicapMin: '',
    handicapMax: '',
    totalPrize: '',
    refereeUserIds: [] as string[],
  });

  const selectedTournament = useMemo(
    () => tournaments.find((tournament) => tournament.id === form.tournamentId),
    [form.tournamentId, tournaments]
  );

  const tournamentOptions = useMemo(() => {
    if (!isEdit || !form.tournamentId) return tournaments;
    if (tournaments.some((tournament) => tournament.id === form.tournamentId)) {
      return tournaments;
    }

    return [
      {
        id: form.tournamentId,
        name: 'Assigned tournament',
        status: 'active',
      },
      ...tournaments,
    ];
  }, [form.tournamentId, isEdit, tournaments]);

  const getNextRaceNumber = (tournamentId: string) => {
    const usedNumbers = races
      .filter((race) => race.tournamentId === tournamentId)
      .map((race) => Number(String(race.raceNumber || '').replace(/^R/i, '')))
      .filter((number) => Number.isFinite(number));

    const nextNumber = usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : 1;

    return `R${nextNumber}`;
  };

  useEffect(() => {
    getRaceBuilder()
      .then((data) => {
        setTournaments(data.tournaments);
        setRaces(data.races || []);
        setReferees(data.referees);
        setMaxRacesPerTournament(data.maxRacesPerTournament || 10);

        if (isEdit) {
          const race = (data.races || []).find((item) => item.id === raceId);

          if (!race) {
            setMessage('Race not found.');
            return;
          }

          if (!EDITABLE_RACE_STATUSES.includes(race.status)) {
            setMessage('Only unpublished races can be edited.');
            return;
          }

          setEditingRace(race);
          setForm({
            tournamentId: race.tournamentId || '',
            raceNumber: race.raceNumber || '',
            raceName: race.name,
            raceDate: race.date || '',
            startTime: race.time || '',
            registrationOpensAt: toDatetimeLocal(race.registrationOpensAt),
            registrationClosesAt: toDatetimeLocal(race.registrationClosesAt),
            venue: race.venue || '',
            distance: parseDistanceMeters(race.distance),
            surfaceType: race.surface || '',
            raceClass: race.raceClass || '',
            handicapMin: race.handicapMin != null ? String(race.handicapMin) : '',
            handicapMax: race.handicapMax != null ? String(race.handicapMax) : '',
            totalPrize: race.totalPrize != null ? String(race.totalPrize) : '',
            refereeUserIds: parseRefereeUserIds(race.refereeUserIds),
          });
          return;
        }

        const existingRaces = data.races || [];
        const firstTournament = data.tournaments.find(
          (tournament) =>
            existingRaces.filter((race) => race.tournamentId === tournament.id).length <
            (data.maxRacesPerTournament || 10)
        );
        const usedNumbers = firstTournament
          ? existingRaces
              .filter((race) => race.tournamentId === firstTournament.id)
              .map((race) => Number(String(race.raceNumber || '').replace(/^R/i, '')))
              .filter((number) => Number.isFinite(number))
          : [];
        const nextRaceNumber = firstTournament
          ? `R${usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : 1}`
          : '';

        setForm((current) => ({
          ...current,
          tournamentId: firstTournament?.id || '',
          raceNumber: current.raceNumber || nextRaceNumber,
          venue: current.venue || firstTournament?.location || '',
          refereeUserIds: data.referees[0] ? [data.referees[0].id] : [],
        }));
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to load race builder')
      )
      .finally(() => setIsLoading(false));
  }, [isEdit, raceId]);

  const handleDelete = () => {
    if (!raceId) return;

    setIsSubmitting(true);
    deleteRace(raceId)
      .then(() => {
        setMessage('Race deleted.');
        setTimeout(() => onNavigate('admin'), 900);
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to delete race')
      )
      .finally(() => {
        setIsSubmitting(false);
        setShowDeleteConfirm(false);
      });
  };

  const handleSubmit = () => {
    setMessage('');

    if (isEdit) {
      if (!raceId || !form.raceName || !form.raceDate || !form.startTime) {
        setMessage('Please complete the race name, date and time.');
        return;
      }

      setIsSubmitting(true);
      updateRace(raceId, {
        name: form.raceName,
        date: form.raceDate,
        time: form.startTime,
      })
        .then(() => {
          setMessage('Race schedule saved.');
          setTimeout(() => onNavigate('admin'), 900);
        })
        .catch((error) =>
          setMessage(error instanceof Error ? error.message : 'Unable to save race')
        )
        .finally(() => setIsSubmitting(false));
      return;
    }

    const tournamentRaceCount = races.filter(
      (race) => race.tournamentId === form.tournamentId
    ).length;
    if (tournamentRaceCount >= maxRacesPerTournament) {
      setMessage(`This tournament already has the maximum ${maxRacesPerTournament} races.`);
      return;
    }

    if (
      !form.tournamentId ||
      !form.raceName ||
      !form.raceDate ||
      !form.startTime ||
      !form.venue ||
      !form.distance ||
      !form.surfaceType ||
      !form.raceClass ||
      form.handicapMin === '' ||
      form.handicapMax === '' ||
      form.refereeUserIds.length === 0
    ) {
      setMessage('Please complete the race schedule, venue, distance and referees.');
      return;
    }

    if (!form.registrationOpensAt || !form.registrationClosesAt) {
      setMessage('Registration open and close times are required.');
      return;
    }
    const regOpens = new Date(form.registrationOpensAt);
    const regCloses = new Date(form.registrationClosesAt);
    const raceStartsAt = new Date(`${form.raceDate}T${form.startTime}`);
    if (
      !Number.isFinite(regOpens.getTime()) ||
      !Number.isFinite(regCloses.getTime()) ||
      !Number.isFinite(raceStartsAt.getTime())
    ) {
      setMessage('Race and registration times must be valid.');
      return;
    }
    if (regOpens >= regCloses) {
      setMessage('Registration close time must be after open time.');
      return;
    }
    if (regCloses > raceStartsAt) {
      setMessage('Registration must close before the race starts.');
      return;
    }
    if (Number(form.distance) < 400 || Number(form.distance) > 10000) {
      setMessage('Race distance must be between 400m and 10,000m.');
      return;
    }
    if (
      Number(form.handicapMin) < 110 ||
      Number(form.handicapMax) > 135 ||
      Number(form.handicapMin) > Number(form.handicapMax)
    ) {
      setMessage('Assigned weight must stay between 110 lb and 135 lb.');
      return;
    }

    setIsSubmitting(true);

    createRace({
      tournamentId: form.tournamentId,
      raceNumber: form.raceNumber,
      name: form.raceName,
      date: form.raceDate,
      time: form.startTime,
      registrationOpensAt: new Date(form.registrationOpensAt).toISOString(),
      registrationClosesAt: new Date(form.registrationClosesAt).toISOString(),
      venue: form.venue,
      distance: form.distance,
      surface: form.surfaceType,
      raceClass: form.raceClass,
      handicapMin: form.handicapMin,
      handicapMax: form.handicapMax,
      totalPrize: form.totalPrize,
      refereeUserIds: form.refereeUserIds,
      refereeUserId: form.refereeUserIds[0],
    })
      .then(() => {
        setMessage('Race created. Registration is open for Owners/Jockeys.');
        setTimeout(() => onNavigate('admin'), 900);
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to create race')
      )
      .finally(() => setIsSubmitting(false));
  };

  const handleTournamentChange = (tournamentId: string) => {
    const tournament = tournaments.find((item) => item.id === tournamentId);
    const nextRaceNumber = getNextRaceNumber(tournamentId);

    setForm((current) => ({
      ...current,
      tournamentId,
      raceNumber: nextRaceNumber,
      venue: tournament?.location || current.venue,
    }));
  };

  const handleRaceClassChange = (raceClass: string) => {
    const weightRange = RACE_CLASS_WEIGHT_RANGES[raceClass];

    setForm((current) => ({
      ...current,
      raceClass,
      handicapMin: weightRange?.minWeightLb || current.handicapMin,
      handicapMax: weightRange?.topWeightLb || current.handicapMax,
    }));
  };

  return (
    <div className="min-h-screen bg-[#071a2f] py-10 px-6">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => onNavigate('admin')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <div className="bg-[#12304f] border border-white/10 rounded-3xl p-8">
          <div className="mb-8">
            <div>
              <h1 className="text-4xl font-black text-white">
                {isEdit ? 'Edit Race' : 'Create Race'}
              </h1>
              {isEdit && editingRace && (
                <p className="text-gray-400 mt-2">
                  {editingRace.raceNumber || 'Race'} · Schedule fields can be updated before publish.
                </p>
              )}

            </div>
          </div>

          {message && (
            <div className={`mb-6 rounded-xl border px-4 py-3 font-semibold ${messageToneClasses(message)}`}>
              {message}
            </div>
          )}

          {isLoading ? (
            <div className="rounded-2xl border border-white/10 bg-[#0b223d] p-6 text-gray-300">
              Loading race details...
            </div>
          ) : isEdit && !editingRace ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
              <h2 className="text-2xl font-black text-white mb-2">Unable to Edit Race</h2>
              <p className="text-amber-200/90 mb-5">{message || 'This race cannot be edited.'}</p>
              <button
                onClick={() => onNavigate('admin')}
                className="px-5 py-3 rounded-xl bg-[#d4af37] text-white font-bold hover:bg-[#b8892d]"
              >
                Back to Admin Panel
              </button>
            </div>
          ) : tournaments.length === 0 && !isEdit ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
              <h2 className="text-2xl font-black text-white mb-2">
                Create Tournament First
              </h2>

              <p className="text-amber-200/90 mb-5">
                Chưa có tournament mở đăng ký. Hãy quay lại Admin Panel và tạo tournament trước, sau đó mới tạo race R1, R2, R3, R4.
              </p>

              <button
                onClick={() => onNavigate('admin')}
                className="px-5 py-3 rounded-xl bg-[#d4af37] text-white font-bold hover:bg-[#b8892d]"
              >
                Back to Admin Panel
              </button>
            </div>
          ) : (
          <div className="grid lg:grid-cols-[minmax(0,1fr),360px] gap-8">
            <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Tournament</label>
                <select
                  className={fieldClass}
                  value={form.tournamentId}
                  disabled={isEdit}
                  onChange={(event) => handleTournamentChange(event.target.value)}
                >
                  {tournamentOptions.map((tournament) => (
                    <option
                      key={tournament.id}
                      value={tournament.id}
                      disabled={
                        races.filter((race) => race.tournamentId === tournament.id).length >=
                        maxRacesPerTournament
                      }
                    >
                      {tournament.name} ({races.filter((race) => race.tournamentId === tournament.id).length}/{maxRacesPerTournament})
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Race Number</label>
                <input
                  placeholder={form.tournamentId ? getNextRaceNumber(form.tournamentId) : 'R1'}
                  className={fieldClass}
                  value={form.raceNumber}
                  disabled={isEdit}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      raceNumber: event.target.value,
                    })
                  }
                />
              </div>

              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Race Name</label>
                <input
                  placeholder={`${selectedTournament?.name || 'Tournament'} ${form.raceNumber || 'R1'}`}
                  className={fieldClass}
                  value={form.raceName}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      raceName: event.target.value,
                    })
                  }
                />
              </div>

              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Race Date</label>
                <input
                  type="date"
                  className={fieldClass}
                  value={form.raceDate}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      raceDate: event.target.value,
                    })
                  }
                />
              </div>

              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Start Time</label>
                <input
                  type="time"
                  className={fieldClass}
                  value={form.startTime}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      startTime: event.target.value,
                    })
                  }
                />
              </div>

              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Registration Opens</label>
                <input
                  type="datetime-local"
                  className={fieldClass}
                  value={form.registrationOpensAt}
                  disabled={isEdit}
                  onChange={(event) =>
                    setForm({ ...form, registrationOpensAt: event.target.value })
                  }
                />
              </div>

              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Registration Closes</label>
                <input
                  type="datetime-local"
                  className={fieldClass}
                  value={form.registrationClosesAt}
                  disabled={isEdit}
                  onChange={(event) =>
                    setForm({ ...form, registrationClosesAt: event.target.value })
                  }
                />
              </div>

              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Prize Pool (USD)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 150000"
                  className={fieldClass}
                  value={form.totalPrize}
                  disabled={isEdit}
                  onChange={(event) =>
                    setForm({ ...form, totalPrize: event.target.value })
                  }
                />
              </div>

              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Venue</label>
                <input
                  placeholder="Churchill Downs"
                  className={fieldClass}
                  value={form.venue}
                  disabled={isEdit}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      venue: event.target.value,
                    })
                  }
                />
              </div>

              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Distance (m)</label>
                <input
                  type="number"
                  min="1"
                  className={fieldClass}
                  value={form.distance}
                  disabled={isEdit}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      distance: event.target.value,
                    })
                  }
                />
              </div>

              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Surface</label>
                <select
                  className={fieldClass}
                  value={form.surfaceType}
                  disabled={isEdit}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      surfaceType: event.target.value,
                    })
                  }
                >
                  <option value="">Select surface</option>
                  <option>Turf</option>
                  <option>Dirt</option>
                  <option>Synthetic</option>
                </select>
              </div>

              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Race Class</label>
                <select
                  className={fieldClass}
                  value={form.raceClass}
                  disabled={isEdit}
                  onChange={(event) => handleRaceClassChange(event.target.value)}
                >
                  <option value="">Select class</option>
                  <option value="Class 1">Class 1 (101-140)</option>
                  <option value="Class 2">Class 2 (81-100)</option>
                  <option value="Class 3">Class 3 (61-80)</option>
                  <option value="Class 4">Class 4 (41-60)</option>
                  <option value="Class 5">Class 5 (0-40)</option>
                  <option value="Open">Open (0-140)</option>
                </select>
              </div>

              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Minimum Weight (lb)</label>
                <input
                  type="number"
                  min="110"
                  max="135"
                  step="1"
                  className={fieldClass}
                  value={form.handicapMin}
                  disabled={isEdit}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      handicapMin: event.target.value,
                    })
                  }
                />
              </div>

              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Top Weight (lb)</label>
                <input
                  type="number"
                  min="110"
                  max="135"
                  step="1"
                  className={fieldClass}
                  value={form.handicapMax}
                  disabled={isEdit}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      handicapMax: event.target.value,
                    })
                  }
                />
              </div>

              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Assigned Referees (Hold Cmd/Ctrl to select multiple)</label>
                <select
                  multiple
                  className={`${fieldClass} min-h-[120px]`}
                  value={form.refereeUserIds}
                  disabled={isEdit}
                  onChange={(event) => {
                    const options = Array.from(event.target.selectedOptions);
                    setForm({
                      ...form,
                      refereeUserIds: options.map(opt => opt.value),
                    });
                  }}
                >
                  {referees.map((referee) => (
                    <option key={referee.id} value={referee.id} className="p-1">
                      {referee.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-[#0b223d] p-6 sticky top-24">
                <div className="flex items-center gap-3 mb-4">
                  <Bell className="w-6 h-6 text-[#d4af37]" />

                  <h2 className="text-2xl font-black text-white">
                    Race Registration Window
                  </h2>
                </div>

                <p className="text-gray-400 mb-5">
                  Each race has its own registration window. Owners can register horses once the window opens. Prize is awarded per race.
                </p>

                <div className="space-y-3 text-sm text-gray-300 mb-6">
                  <div className="flex justify-between gap-3">
                    <span>Race registration opens</span>
                    <span className="text-white font-bold text-right">
                      {form.registrationOpensAt
                        ? new Date(form.registrationOpensAt).toLocaleString()
                        : 'Not set'}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span>Race registration closes</span>
                    <span className="text-white font-bold text-right">
                      {form.registrationClosesAt
                        ? new Date(form.registrationClosesAt).toLocaleString()
                        : 'Not set'}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span>Initial status</span>
                    <span className="text-white font-bold">
                      {isEdit
                        ? editingRace?.status || 'Unknown'
                        : form.registrationOpensAt &&
                            Date.now() < new Date(form.registrationOpensAt).getTime()
                          ? 'Registration Scheduled'
                          : 'Registration Open'}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span>Entry approval</span>
                    <span className="text-white font-bold">Admin</span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span>Gate + assigned weight</span>
                    <span className="text-white font-bold">System</span>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={
                    isSubmitting ||
                    (isEdit
                      ? !editingRace
                      : !form.tournamentId ||
                        races.filter((race) => race.tournamentId === form.tournamentId).length >=
                          maxRacesPerTournament)
                  }
                  className="w-full px-8 py-4 bg-[#d4af37] hover:bg-[#b8892d] disabled:opacity-60 rounded-2xl text-white font-bold transition-all"
                >
                  <CalendarClock className="inline-block w-5 h-5 mr-2" />
                  {isSubmitting
                    ? isEdit
                      ? 'Saving Changes...'
                      : 'Creating Race...'
                    : isEdit
                      ? 'Save Changes'
                      : 'Create Race'}
                </button>

                {isEdit && editingRace && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isSubmitting}
                    className="w-full mt-4 flex items-center justify-center gap-2 px-8 py-4 bg-red-600/90 hover:bg-red-700 disabled:opacity-60 rounded-2xl text-white font-bold transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                    Delete Race
                  </button>
                )}
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {showDeleteConfirm && editingRace && (
        <div className="fixed inset-0 bg-[#071a2f]/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#12304f] p-8 rounded-3xl w-full max-w-lg border border-red-500/30">
            <div className="flex items-center gap-3 text-red-300 mb-4">
              <Trash2 className="w-6 h-6" />
              <h2 className="text-2xl font-black text-white">Delete Race?</h2>
            </div>

            <p className="text-gray-300 leading-relaxed">
              Are you sure you want to delete{' '}
              <span className="font-bold text-white">{editingRace.name}</span>? This action cannot
              be undone.
            </p>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-4 bg-white/10 rounded-2xl text-white"
              >
                Cancel
              </button>

              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-2xl text-white font-bold"
              >
                <Trash2 className="w-5 h-5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
