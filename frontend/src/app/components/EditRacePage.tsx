import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Trash2 } from 'lucide-react';
import {
  RaceRecord,
  TournamentRecord,
  deleteRace,
  getRaceBuilder,
  updateRace,
} from '../services/api';
import { messageToneClasses } from '../utils/messageTone';

interface EditRacePageProps {
  onNavigate: (page: string) => void;
}

const EDITABLE_RACE_STATUSES = ['registration-open', 'registration-closed'];

const raceDateWithinTournamentMessage = (
  tournament: TournamentRecord | null,
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

// Ghi chú: Hàm này đổi thời gian ISO sang định dạng input datetime-local.
const toDatetimeLocal = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';

  // Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến pad.
  const pad = (part: number) => String(part).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// Ghi chú: Hàm này render form chỉnh sửa hoặc xóa race hiện có.
export default function EditRacePage({
  onNavigate,
}: EditRacePageProps) {
  const { raceId } = useParams();
  const fieldClass =
    'min-h-[54px] w-full bg-[#071a2f] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 outline-none focus:border-[#d4af37]/70 focus:ring-2 focus:ring-[#d4af37]/20 disabled:cursor-not-allowed disabled:opacity-60';

  const [editingRace, setEditingRace] = useState<RaceRecord | null>(null);
  const [editingTournament, setEditingTournament] = useState<TournamentRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    raceName: '',
    raceDate: '',
    startTime: '',
    registrationOpensAt: '',
    registrationClosesAt: '',
  });

  useEffect(() => {
    getRaceBuilder()
      .then((data) => {
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
        setEditingTournament(
          (data.tournaments || []).find((item) => item.id === race.tournamentId) || null
        );
        setForm({
          raceName: race.name,
          raceDate: race.date || '',
          startTime: race.time || '',
          registrationOpensAt: toDatetimeLocal(race.registrationOpensAt),
          registrationClosesAt: toDatetimeLocal(race.registrationClosesAt),
        });
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to load race details')
      )
      .finally(() => setIsLoading(false));
  }, [raceId]);

  // Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến handle delete.
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
    const raceDateError = raceDateWithinTournamentMessage(editingTournament, form.raceDate);
    if (raceDateError) {
      setMessage(raceDateError);
      return;
    }

    setIsSubmitting(true);
    updateRace(raceId, {
      name: form.raceName,
      date: form.raceDate,
      time: form.startTime,
      registrationOpensAt: regOpens.toISOString(),
      registrationClosesAt: regCloses.toISOString(),
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

                  <div className="space-y-3 text-sm text-gray-300 mb-6">
                    <div className="flex justify-between gap-3">
                      <span>Current status</span>
                      <span className="text-white font-bold">
                        {editingRace.status || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !editingRace}
                    className="w-full px-8 py-4 bg-[#d4af37] hover:bg-[#b8892d] disabled:opacity-60 rounded-2xl text-white font-bold transition-all"
                  >
                    <CalendarClock className="inline-block w-5 h-5 mr-2" />
                    {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                  </button>

                  {editingRace && (
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
