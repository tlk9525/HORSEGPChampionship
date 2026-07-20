import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, XCircle } from 'lucide-react';
import {
  RaceRecord,
  TournamentRecord,
  adminRaceAction,
  getRaceBuilder,
  resetRace,
  updateRace,
} from '../services/api';
import { messageToneClasses } from '../utils/messageTone';
import { isoToDatetimeLocal, parseRaceSchedule } from '../utils/raceSchedule';

interface EditRacePageProps {
  onNavigate: (page: string) => void;
}

const EDITABLE_RACE_STATUSES = ['registration-open', 'registration-closed'];
const RESETTABLE_RACE_STATUSES = ['cancelled'];

// Ghi chú: Hàm này render form chỉnh sửa hoặc hủy race hiện có.
export default function EditRacePage({
  onNavigate,
}: EditRacePageProps) {
  const { raceId } = useParams();
  const fieldClass =
    'min-h-[54px] w-full bg-[#071a2f] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 outline-none focus:border-[#d4af37]/70 focus:ring-2 focus:ring-[#d4af37]/20 disabled:cursor-not-allowed disabled:opacity-60';

  const [editingRace, setEditingRace] = useState<RaceRecord | null>(null);
  const [editingTournament, setEditingTournament] = useState<TournamentRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    raceName: '',
    raceDate: '',
    startTime: '',
    registrationOpensAt: '',
    registrationClosesAt: '',
  });
  const isResetMode = editingRace?.status === 'cancelled';

  // Ghi chú: Parse lịch hiện tại của form cho cả thao tác edit và reset.
  const currentSchedule = () =>
    parseRaceSchedule({
      tournament: editingTournament,
      raceDate: form.raceDate,
      startTime: form.startTime,
      registrationOpensAt: form.registrationOpensAt,
      registrationClosesAt: form.registrationClosesAt,
    });

  useEffect(() => {
    getRaceBuilder()
      .then((data) => {
        const race = (data.races || []).find((item) => item.id === raceId);

        if (!race) {
          setMessage('Race not found.');
          return;
        }

        if (
          !EDITABLE_RACE_STATUSES.includes(race.status) &&
          !RESETTABLE_RACE_STATUSES.includes(race.status)
        ) {
          setMessage('Only unpublished races can be edited. Cancelled races can be reset.');
          return;
        }

        setEditingRace(race);
        setEditingTournament(
          (data.tournaments || []).find((item) => item.id === race.tournamentId) || null
        );
        setForm({
          raceName: race.name,
          raceDate: RESETTABLE_RACE_STATUSES.includes(race.status) ? '' : race.date || '',
          startTime: RESETTABLE_RACE_STATUSES.includes(race.status) ? '' : race.time || '',
          registrationOpensAt: RESETTABLE_RACE_STATUSES.includes(race.status)
            ? ''
            : isoToDatetimeLocal(race.registrationOpensAt),
          registrationClosesAt: RESETTABLE_RACE_STATUSES.includes(race.status)
            ? ''
            : isoToDatetimeLocal(race.registrationClosesAt),
        });
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to load race details')
      )
      .finally(() => setIsLoading(false));
  }, [raceId]);

  // Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến handle cancel.
  const handleCancelRace = () => {
    if (!raceId) return;

    setIsSubmitting(true);
    adminRaceAction(raceId, 'cancel-race')
      .then((result) => {
        setEditingRace(result.race);
        setForm((current) => ({
          ...current,
          raceDate: '',
          startTime: '',
          registrationOpensAt: '',
          registrationClosesAt: '',
        }));
        setMessage('Race cancelled. Enter a new registration window and start time to reset it.');
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to cancel race')
      )
      .finally(() => {
        setIsSubmitting(false);
        setShowCancelConfirm(false);
      });
  };

  // Ghi chú: Hàm này reset race đã hủy về trạng thái mở đăng ký với lịch mới.
  const handleResetRace = () => {
    setMessage('');

    if (
      !raceId ||
      !form.raceDate ||
      !form.startTime ||
      !form.registrationOpensAt ||
      !form.registrationClosesAt
    ) {
      setMessage('Please enter the new race date, start time and registration window.');
      return;
    }

    const schedule = currentSchedule();
    if (schedule.error) {
      setMessage(schedule.error);
      return;
    }

    const confirmed = window.confirm(
      'Reset this cancelled race? Existing registrations and race entries for this race will be cleared.'
    );
    if (!confirmed) return;

    setIsSubmitting(true);
    resetRace(raceId, {
      date: form.raceDate,
      time: form.startTime,
      registrationOpensAt: schedule.regOpens.toISOString(),
      registrationClosesAt: schedule.regCloses.toISOString(),
    })
      .then((result) => {
        setEditingRace(result.race);
        setMessage('Race reset. Registration is open again.');
        setTimeout(() => onNavigate('admin'), 900);
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to reset race')
      )
      .finally(() => setIsSubmitting(false));
  };

  // Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến handle submit.
  const handleSubmit = () => {
    setMessage('');

    if (
      !raceId ||
      !form.raceName ||
      !form.raceDate ||
      !form.startTime ||
      !form.registrationOpensAt ||
      !form.registrationClosesAt
    ) {
      setMessage('Please complete the race name, date, time and registration window.');
      return;
    }

    const schedule = currentSchedule();
    if (schedule.error) {
      setMessage(schedule.error);
      return;
    }

    setIsSubmitting(true);
    updateRace(raceId, {
      name: form.raceName,
      date: form.raceDate,
      time: form.startTime,
      registrationOpensAt: schedule.regOpens.toISOString(),
      registrationClosesAt: schedule.regCloses.toISOString(),
    })
      .then(() => {
        setMessage('Race schedule saved.');
        setTimeout(() => onNavigate('admin'), 900);
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to save race')
      )
      .finally(() => setIsSubmitting(false));
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
              <h1 className="text-4xl font-black text-white">Edit Race</h1>
              {editingRace && (
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
          ) : !editingRace ? (
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
          ) : (
            <div className="grid lg:grid-cols-[minmax(0,1fr),360px] gap-8">
              <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
                <div className="min-w-0">
                  <label className="block text-gray-300 mb-2">Tournament</label>
                  <input
                    className={fieldClass}
                    value={editingRace.tournamentId ? `Tournament: ${editingRace.tournamentId}` : 'No Tournament'}
                    disabled={true}
                  />
                </div>

                <div className="min-w-0">
                  <label className="block text-gray-300 mb-2">Race Number</label>
                  <input
                    className={fieldClass}
                    value={editingRace.raceNumber || 'N/A'}
                    disabled={true}
                  />
                </div>

                <div className="min-w-0">
                  <label className="block text-gray-300 mb-2">Race Name</label>
                  <input
                    placeholder="Race name"
                    className={fieldClass}
                    value={form.raceName}
                    disabled={isResetMode}
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
                    onChange={(event) =>
                      setForm({
                        ...form,
                        registrationOpensAt: event.target.value,
                      })
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
                      setForm({
                        ...form,
                        registrationClosesAt: event.target.value,
                      })
                    }
                  />
                </div>

                <div className="min-w-0">
                  <label className="block text-gray-300 mb-2">Venue</label>
                  <input
                    className={fieldClass}
                    value={editingRace.venue || 'N/A'}
                    disabled={true}
                  />
                </div>

                <div className="min-w-0">
                  <label className="block text-gray-300 mb-2">Distance (m)</label>
                  <input
                    type="number"
                    className={fieldClass}
                    value={editingRace.distance ? editingRace.distance.replace('m', '') : 'N/A'}
                    disabled={true}
                  />
                </div>

                <div className="min-w-0">
                  <label className="block text-gray-300 mb-2">Surface</label>
                  <input
                    className={fieldClass}
                    value={editingRace.surface || 'N/A'}
                    disabled={true}
                  />
                </div>

                <div className="min-w-0">
                  <label className="block text-gray-300 mb-2">Race Class</label>
                  <input
                    className={fieldClass}
                    value={editingRace.raceClass || 'N/A'}
                    disabled={true}
                  />
                </div>

                <div className="min-w-0">
                  <label className="block text-gray-300 mb-2">Minimum Weight (lb)</label>
                  <input
                    type="number"
                    className={fieldClass}
                    value={editingRace.handicapMin != null ? editingRace.handicapMin : 'N/A'}
                    disabled={true}
                  />
                </div>

                <div className="min-w-0">
                  <label className="block text-gray-300 mb-2">Top Weight (lb)</label>
                  <input
                    type="number"
                    className={fieldClass}
                    value={editingRace.handicapMax != null ? editingRace.handicapMax : 'N/A'}
                    disabled={true}
                  />
                </div>

                <div className="min-w-0">
                  <label className="block text-gray-300 mb-2">Prize Pool (USD)</label>
                  <input
                    type="number"
                    className={fieldClass}
                    value={editingRace.totalPrize != null ? editingRace.totalPrize : 'N/A'}
                    disabled={true}
                  />
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-white/10 bg-[#0b223d] p-6 sticky top-24">
                  <h2 className="text-2xl font-black text-white mb-4">
                    Race Status
                  </h2>

                  {isResetMode && (
                    <p className="text-sm text-amber-200/90 mb-5">
                      Enter a new registration window and race start time to reset this cancelled
                      race from the beginning.
                    </p>
                  )}

                  <div className="space-y-3 text-sm text-gray-300 mb-6">
                    <div className="flex justify-between gap-3">
                      <span>Current status</span>
                      <span className="text-white font-bold">
                        {editingRace.status || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={isResetMode ? handleResetRace : handleSubmit}
                    disabled={isSubmitting || !editingRace}
                    className="w-full px-8 py-4 bg-[#d4af37] hover:bg-[#b8892d] disabled:opacity-60 rounded-2xl text-white font-bold transition-all"
                  >
                    <CalendarClock className="inline-block w-5 h-5 mr-2" />
                    {isSubmitting
                      ? isResetMode ? 'Resetting Race...' : 'Saving Changes...'
                      : isResetMode ? 'Reset Race' : 'Save Changes'}
                  </button>

                  {editingRace && !isResetMode && (
                    <button
                      type="button"
                      onClick={() => setShowCancelConfirm(true)}
                      disabled={isSubmitting}
                      className="w-full mt-4 flex items-center justify-center gap-2 px-8 py-4 bg-red-600/90 hover:bg-red-700 disabled:opacity-60 rounded-2xl text-white font-bold transition-all"
                    >
                      <XCircle className="w-5 h-5" />
                      Cancel Race
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCancelConfirm && editingRace && (
        <div className="fixed inset-0 bg-[#071a2f]/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#12304f] p-8 rounded-3xl w-full max-w-lg border border-red-500/30">
            <div className="flex items-center gap-3 text-red-300 mb-4">
              <XCircle className="w-6 h-6" />
              <h2 className="text-2xl font-black text-white">Cancel Race?</h2>
            </div>

            <p className="text-gray-300 leading-relaxed">
              Are you sure you want to cancel{' '}
              <span className="font-bold text-white">{editingRace.name}</span>? The race will stay
              in the system with a cancelled status. After cancelling, this page will switch to the
              reset form so you can enter new registration and start times.
            </p>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-4 bg-white/10 rounded-2xl text-white"
              >
                Keep Race
              </button>

              <button
                onClick={handleCancelRace}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-2xl text-white font-bold"
              >
                <XCircle className="w-5 h-5" />
                Cancel Race
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
