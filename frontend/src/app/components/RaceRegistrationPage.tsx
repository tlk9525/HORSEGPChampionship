import { useEffect, useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import {
  HorseRecord,
  HorseRaceRegistration,
  JockeyProfileRecord,
  RaceRecord,
  TournamentRecord,
  getRaceRegistration,
  submitHorseRaceRegistration,
} from '../services/api';
import { useParams } from 'react-router-dom';
import { formatWeightLb, statusLabel } from '../utils/domain';
import { messageToneClasses } from '../utils/messageTone';

interface RaceRegistrationPageProps {
  onNavigate: (page: string) => void;
}

export default function RaceRegistrationPage({ onNavigate }: RaceRegistrationPageProps) {
  const fieldClass =
    'w-full bg-[#071a2f] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#d4af37]';

  const { raceId } = useParams<{ raceId: string }>();
  const [tournament, setTournament] = useState<TournamentRecord | null>(null);
  const [race, setRace] = useState<RaceRecord | null>(null);
  const [tournamentRaces, setTournamentRaces] = useState<RaceRecord[]>([]);
  const [horses, setHorses] = useState<HorseRecord[]>([]);
  const [jockeys, setJockeys] = useState<JockeyProfileRecord[]>([]);
  const [horseRegistrations, setHorseRegistrations] = useState<HorseRaceRegistration[]>([]);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    horseId: '',
    registrationId: '',
    jockeyUserId: '',
    notes: '',
    jockeyNotes: '',
  });

  const now = Date.now();
  const registrationOpensAt = race?.registrationOpensAt
    ? new Date(race.registrationOpensAt).getTime()
    : Number.NEGATIVE_INFINITY;
  const registrationClosesAt = race?.registrationClosesAt
    ? new Date(race.registrationClosesAt).getTime()
    : Number.POSITIVE_INFINITY;
  const registrationOpen = Boolean(
    tournament &&
    race?.status === 'registration-open' &&
    now >= registrationOpensAt &&
    now < registrationClosesAt
  );

  const loadRegistrationData = () => {
    if (!raceId) {
      setMessage('Please select a race first.');
      return;
    }

    getRaceRegistration(raceId)
      .then((data) => {
        const availableHorses = data.horses || [];
        const availableJockeys = data.jockeyProfiles || [];
        const availableRegistrations = data.horseRaceRegistrations || [];
        const scheduleRaces = data.races?.length ? data.races : data.race ? [data.race] : [];

        setTournament(data.tournament);
        setRace(data.race);
        setTournamentRaces(scheduleRaces);
        setHorses(availableHorses);
        setJockeys(availableJockeys);
        setHorseRegistrations(availableRegistrations);
        const approvedHorseRegistrations = availableRegistrations.filter(
          (registration) => registration.status === 'approved' && !registration.jockeyUserId
        );
        setForm((current) => ({
          ...current,
          horseId: availableHorses.some((horse) => horse.id === current.horseId)
            ? current.horseId
            : availableHorses[0]?.id || '',
          registrationId: approvedHorseRegistrations.some(
            (registration) => registration.id === current.registrationId
          )
            ? current.registrationId
            : approvedHorseRegistrations[0]?.id || '',
          jockeyUserId: availableJockeys.some((jockey) => jockey.userId === current.jockeyUserId)
            ? current.jockeyUserId
            : availableJockeys[0]?.userId || '',
        }));
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to load registration data')
      );
  };

  useEffect(() => {
    loadRegistrationData();
  }, []);

  const approvedHorseRegistrations = horseRegistrations.filter(
    (registration) => registration.status === 'approved' && !registration.jockeyUserId
  );
  const selectedRegistration = approvedHorseRegistrations.find(
    (registration) => registration.id === form.registrationId
  );

  const submitHorseRegistration = () => {
    setMessage('');

    if (!form.horseId) {
      setMessage('Horse is required.');
      return;
    }
    if (!registrationOpen) {
      setMessage('This race is outside its registration window.');
      return;
    }

    submitHorseRaceRegistration({
      horseId: form.horseId,
      raceId: raceId!,
      jockeyUserId: undefined,
      notes: form.notes,
    })
      .then(() => {
        setMessage('Horse race registration submitted. Admin must approve before jockey selection.');
        loadRegistrationData();
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to submit registration')
      );
  };

  const submitJockeySelection = () => {
    setMessage('');

    if (!selectedRegistration || !form.jockeyUserId) {
      setMessage('Approved horse registration and jockey are required.');
      return;
    }

    submitHorseRaceRegistration({
      horseId: selectedRegistration.horseId,
      raceId: raceId!,
      jockeyUserId: form.jockeyUserId,
      notes: form.jockeyNotes,
    })
      .then(() => {
        setMessage('Jockey request sent. Waiting for jockey acceptance before final Admin approval.');
        loadRegistrationData();
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to select jockey')
      );
  };

  return (
    <div className="min-h-screen bg-[#071a2f] pt-24 pb-12">
      <div className="max-w-5xl mx-auto px-4">
        <button
          onClick={() => onNavigate('tournaments')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Tournaments
        </button>

        <div className="bg-[#12304f] border border-white/10 rounded-3xl p-8">
          <div className="mb-8">
            <p className="text-[#d4af37] text-sm uppercase tracking-widest">
              Race Registration
            </p>

            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              Register for {race?.name || 'Race'}
            </h1>
            <p className="text-gray-400">
              {tournament?.name}
            </p>
            <p className="text-gray-400 mt-3">
              Register a horse first. After Admin approves the horse, select a jockey approved for this race; the jockey accepts, then Admin gives final approval.
            </p>
          </div>

          {message && (
            <div className={`mb-6 rounded-xl border px-4 py-3 font-semibold ${messageToneClasses(message)}`}>
              {message}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-gray-300 mb-2">Horse for Admin Approval</label>
              <select
                value={form.horseId}
                onChange={(event) =>
                  setForm({
                    ...form,
                    horseId: event.target.value,
                  })
                }
                className={fieldClass}
              >
                {horses.length === 0 && (
                  <option value="">No approved horses available for this tournament</option>
                )}
                {horses.map((horse) => (
                  <option key={horse.id} value={horse.id}>
                    {horse.name} - {statusLabel(horse.status)}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-gray-300 mb-2">Horse Registration Notes</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(event) =>
                  setForm({
                    ...form,
                    notes: event.target.value,
                  })
                }
                className={fieldClass}
                placeholder="Optional notes for Admin review"
              />
            </div>

            <button
              onClick={submitHorseRegistration}
              disabled={!registrationOpen || !form.horseId}
              className="md:col-span-2 flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-[#d4af37] hover:bg-[#b8892d] disabled:bg-white/10 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold transition-all"
            >
              <Send className="w-5 h-5" />
              Register Horse for Race
            </button>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-[#071a2f] p-5">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-white font-bold text-xl">Select Jockey After Admin Approval</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Only horses already approved by Admin and still missing a jockey are listed here.
                </p>
              </div>
              <span className="text-[#d4af37] font-bold">
                {approvedHorseRegistrations.length} ready
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-gray-300 mb-2">Approved Horse</label>
                <select
                  value={form.registrationId}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      registrationId: event.target.value,
                    })
                  }
                  className={fieldClass}
                >
                  {approvedHorseRegistrations.length === 0 && (
                    <option value="">No approved horse waiting for jockey</option>
                  )}
                  {approvedHorseRegistrations.map((registration) => (
                    <option key={registration.id} value={registration.id}>
                      {registration.horseName || 'Horse'} - {statusLabel(registration.status)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Approved Jockey</label>
                <select
                  value={form.jockeyUserId}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      jockeyUserId: event.target.value,
                    })
                  }
                  className={fieldClass}
                >
                  {jockeys.length === 0 && <option value="">No approved jockeys yet</option>}
                  {jockeys.map((jockey) => (
                    <option key={jockey.id} value={jockey.userId}>
                      {jockey.jockeyName} - {jockey.competitionLevel} - {formatWeightLb(jockey.weightLb)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-300 mb-2">Jockey Request Notes</label>
                <textarea
                  rows={3}
                  value={form.jockeyNotes}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      jockeyNotes: event.target.value,
                    })
                  }
                  className={fieldClass}
                  placeholder="Optional notes for the jockey"
                />
              </div>

              <button
                onClick={submitJockeySelection}
                disabled={!selectedRegistration || !form.jockeyUserId}
                className="md:col-span-2 flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-[#d4af37] hover:bg-[#b8892d] disabled:bg-white/10 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold transition-all"
              >
                <Send className="w-5 h-5" />
                Send Jockey Request
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-[#071a2f] p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-white font-bold">Tournament Race Schedule</h2>
              <span className="text-[#d4af37] font-bold">
                {tournamentRaces.length} races
              </span>
            </div>

            <div className="mt-4 grid md:grid-cols-2 gap-3">
              {tournamentRaces.length === 0 && (
                <div className="md:col-span-2 text-gray-500">
                  Admin has not created races for this tournament yet.
                </div>
              )}

              {tournamentRaces.map((race) => (
                <div
                  key={race.id}
                  className="rounded-xl bg-[#12304f] border border-white/10 px-4 py-3"
                >
                  <div className="text-white font-bold">{race.name}</div>
                  <div className="text-gray-400 text-sm mt-1">
                    {race.date} {race.time} • {statusLabel(race.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
