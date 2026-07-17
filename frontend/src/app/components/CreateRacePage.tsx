import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bell, CalendarClock } from 'lucide-react';
import {
  RaceBuilderReferee,
  RaceRecord,
  TournamentRecord,
  createRace,
  getRaceBuilder,
} from '../services/api';
import { messageToneClasses } from '../utils/messageTone';

interface CreateRacePageProps {
  onNavigate: (page: string) => void;
}

const RACE_CLASS_SETTINGS: Record<
  string,
  { minWeightLb: string; topWeightLb: string; ratingMin: string; ratingMax: string }
> = {
  'Class 1': { topWeightLb: '135', minWeightLb: '115', ratingMin: '101', ratingMax: '140' },
  'Class 2': { topWeightLb: '135', minWeightLb: '115', ratingMin: '81', ratingMax: '100' },
  'Class 3': { topWeightLb: '133', minWeightLb: '113', ratingMin: '61', ratingMax: '80' },
  'Class 4': { topWeightLb: '132', minWeightLb: '112', ratingMin: '41', ratingMax: '60' },
  'Class 5': { topWeightLb: '130', minWeightLb: '110', ratingMin: '0', ratingMax: '40' },
  Open: { topWeightLb: '135', minWeightLb: '110', ratingMin: '0', ratingMax: '140' },
};

// Ghi chú: Hàm này chuẩn hóa hoặc tính toán dữ liệu cho raceDateWithinTournamentMessage.
const raceDateWithinTournamentMessage = (
  tournament: TournamentRecord | undefined,
  raceDate: string
) => {
  if (!tournament) return '';
  if (tournament.startDate && raceDate < tournament.startDate) {
    return 'Race date must be on or after tournament start date.';
  }
  if (tournament.finalDate && raceDate > tournament.finalDate) {
    return 'Race date must be on or before tournament end date.';
  }
  return '';
};

// Ghi chú: Hàm này chuẩn hóa hoặc tính toán dữ liệu cho formatDatetimeLocal.
const formatDatetimeLocal = (date: Date) => {
  // Ghi chú: Hàm này chuẩn hóa hoặc tính toán dữ liệu cho pad.
  const pad = (value: number) => String(value).padStart(2, '0');

  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ].join('T');
};

// Ghi chú: Hàm này chuẩn hóa hoặc tính toán dữ liệu cho suggestedRegistrationClose.
const suggestedRegistrationClose = (
  raceDate: string,
  startTime: string,
  closeRegistrationHours: number
) => {
  if (!raceDate || !startTime) return '';

  const raceStartsAt = new Date(`${raceDate}T${startTime}`);
  if (!Number.isFinite(raceStartsAt.getTime())) return '';

  return formatDatetimeLocal(
    new Date(raceStartsAt.getTime() - closeRegistrationHours * 60 * 60 * 1000)
  );
};

// Ghi chú: Hàm này render form tạo race mới cho admin.
export default function CreateRacePage({
  onNavigate,
}: CreateRacePageProps) {
  const fieldClass =
    'min-h-[54px] w-full bg-[#071a2f] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 outline-none focus:border-[#d4af37]/70 focus:ring-2 focus:ring-[#d4af37]/20 disabled:cursor-not-allowed disabled:opacity-60';

  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [races, setRaces] = useState<RaceRecord[]>([]);
  const [referees, setReferees] = useState<RaceBuilderReferee[]>([]);
  const [maxRacesPerTournament, setMaxRacesPerTournament] = useState(0);
  const [closeRegistrationHours, setCloseRegistrationHours] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

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
    ratingMin: '',
    ratingMax: '',
    handicapMin: '',
    handicapMax: '',
    totalPrize: '',
    refereeUserIds: [] as string[],
  });

  const selectedTournament = useMemo(
    () => tournaments.find((tournament) => tournament.id === form.tournamentId),
    [form.tournamentId, tournaments]
  );

  const tournamentOptions = useMemo(() => tournaments, [tournaments]);

  // Ghi chú: Hàm này lấy nghiệp vụ liên quan đến get next race number.
  const getNextRaceNumber = (tournamentId: string) => {
    const usedNumbers = races
      .filter((race) => race.tournamentId === tournamentId)
      .map((race) => Number(String(race.raceNumber || '').replace(/^R/i, '')))
      .filter((number) => Number.isFinite(number));

    const nextNumber = usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : 1;

    return `R${nextNumber}`;
  };

  useEffect(() => {
    setIsLoading(true);
    setLoadError(false);
    getRaceBuilder()
      .then((data) => {
        setTournaments(data.tournaments);
        setRaces(data.races || []);
        setReferees(data.referees);
        const nextMaxRacesPerTournament = data.maxRacesPerTournament ?? 0;
        const nextDefaultDistanceMeters = data.defaultDistanceMeters ?? 0;
        const nextCloseRegistrationHours = data.closeRegistrationHours ?? 0;

        setMaxRacesPerTournament(nextMaxRacesPerTournament);
        setCloseRegistrationHours(nextCloseRegistrationHours);

        const existingRaces = data.races || [];
        const firstTournament = data.tournaments.find(
          (tournament) =>
            existingRaces.filter((race) => race.tournamentId === tournament.id).length <
            nextMaxRacesPerTournament
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
          distance: current.distance || String(nextDefaultDistanceMeters || ''),
          refereeUserIds: data.referees[0] ? [data.referees[0].id] : [],
        }));
        setLoadError(false);
      })
      .catch((error) => {
        setLoadError(true);
        setMessage(error instanceof Error ? error.message : 'Unable to load race builder');
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến handle submit.
  const handleSubmit = () => {
    setSubmitAttempted(true);
    setMessage('');

    const tournamentRaceCount = races.filter(
      (race) => race.tournamentId === form.tournamentId
    ).length;
    if (tournamentRaceCount >= maxRacesPerTournament) {
      setMessage(`This tournament already has the maximum ${maxRacesPerTournament} races.`);
      return;
    }

    const missingFields = [
      !form.tournamentId && 'Tournament',
      !form.raceName && 'Race name',
      !form.raceDate && 'Race date',
      !form.startTime && 'Start time',
      !form.venue && 'Venue',
      !form.distance && 'Distance',
      !form.surfaceType && 'Surface',
      form.handicapMin === '' && 'Minimum weight',
      form.handicapMax === '' && 'Top weight',
      form.refereeUserIds.length === 0 && 'Assigned referees',
    ].filter(Boolean);

    if (missingFields.length > 0) {
      setMessage(`Please complete: ${missingFields.join(', ')}.`);
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
    const raceDateError = raceDateWithinTournamentMessage(selectedTournament, form.raceDate);
    if (raceDateError) {
      setMessage(raceDateError);
      return;
    }
    if (Number(form.distance) < 400 || Number(form.distance) > 10000) {
      setMessage('Race distance must be between 400m and 10,000m.');
      return;
    }
    if (
      Number(form.ratingMin) < 0 ||
      Number(form.ratingMax) > 140 ||
      Number(form.ratingMin) > Number(form.ratingMax) ||
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
      ratingMin: form.ratingMin,
      ratingMax: form.ratingMax,
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

  // Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến handle tournament change.
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

  // Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến handle race class change.
  const handleRaceClassChange = (raceClass: string) => {
    const preset = RACE_CLASS_SETTINGS[raceClass];

    setForm((current) => ({
      ...current,
      raceClass,
      ratingMin: preset?.ratingMin || current.ratingMin,
      ratingMax: preset?.ratingMax || current.ratingMax,
      handicapMin: preset?.minWeightLb || current.handicapMin,
      handicapMax: preset?.topWeightLb || current.handicapMax,
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
              <h1 className="text-4xl font-black text-white">Create Race</h1>
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
          ) : loadError ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
              <h2 className="text-2xl font-black text-white mb-2">Unable to Load Race Builder</h2>
              <p className="text-red-200/90 mb-5">
                {message || 'The admin race builder could not be loaded right now.'}
              </p>
              <button
                onClick={() => onNavigate('admin')}
                className="px-5 py-3 rounded-xl bg-[#d4af37] text-white font-bold hover:bg-[#b8892d]"
              >
                Back to Admin Panel
              </button>
            </div>
          ) : tournaments.length === 0 ? (
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
                    onChange={(event) => {
                      const nextRaceDate = event.target.value;
                      setForm({
                        ...form,
                        raceDate: nextRaceDate,
                        registrationClosesAt:
                          form.registrationClosesAt ||
                          suggestedRegistrationClose(
                            nextRaceDate,
                            form.startTime,
                            closeRegistrationHours
                          ),
                      });
                    }}
                  />
                </div>

                <div className="min-w-0">
                  <label className="block text-gray-300 mb-2">Start Time</label>
                  <input
                    type="time"
                    className={fieldClass}
                    value={form.startTime}
                    onChange={(event) => {
                      const nextStartTime = event.target.value;
                      setForm({
                        ...form,
                        startTime: nextStartTime,
                        registrationClosesAt:
                          form.registrationClosesAt ||
                          suggestedRegistrationClose(
                            form.raceDate,
                            nextStartTime,
                            closeRegistrationHours
                          ),
                      });
                    }}
                  />
                </div>

                <div className="min-w-0">
                  <label className="block text-gray-300 mb-2">Registration Opens</label>
                  <input
                    type="datetime-local"
                    className={fieldClass}
                    value={form.registrationOpensAt}
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
                    className={`${fieldClass} ${submitAttempted && !form.surfaceType
                      ? 'border-amber-400/70 ring-2 ring-amber-400/20 text-amber-100'
                      : ''
                    }`}
                    value={form.surfaceType}
                    aria-invalid={submitAttempted && !form.surfaceType}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        surfaceType: event.target.value,
                      })
                    }
                  >
                    <option value="" disabled>Select surface</option>
                    <option>Turf</option>
                    <option>Dirt</option>
                    <option>Synthetic</option>
                  </select>
                  {submitAttempted && !form.surfaceType && (
                    <p className="mt-2 text-sm font-semibold text-amber-200">
                      Surface is required.
                    </p>
                  )}
                </div>

                <div className="min-w-0">
                  <label className="block text-gray-300 mb-2">Race Class</label>
                  <select
                    className={fieldClass}
                    value={form.raceClass}
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
                  <label className="block text-gray-300 mb-2">Minimum Rating</label>
                  <input
                    type="number"
                    min="0"
                    max="140"
                    step="1"
                    className={fieldClass}
                    value={form.ratingMin}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        ratingMin: event.target.value,
                      })
                    }
                  />
                </div>

                <div className="min-w-0">
                  <label className="block text-gray-300 mb-2">Maximum Rating</label>
                  <input
                    type="number"
                    min="0"
                    max="140"
                    step="1"
                    className={fieldClass}
                    value={form.ratingMax}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        ratingMax: event.target.value,
                      })
                    }
                  />
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
                        {form.registrationOpensAt &&
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
                      !form.tournamentId ||
                      races.filter((race) => race.tournamentId === form.tournamentId).length >=
                      maxRacesPerTournament
                    }
                    className="w-full px-8 py-4 bg-[#d4af37] hover:bg-[#b8892d] disabled:opacity-60 rounded-2xl text-white font-bold transition-all"
                  >
                    <CalendarClock className="inline-block w-5 h-5 mr-2" />
                    {isSubmitting ? 'Creating Race...' : 'Create Race'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
