import { useEffect, useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import {
  HorseRecord,
  JockeyProfileRecord,
  RaceRecord,
  TournamentRecord,
  createRaceEntry,
  getRaceRegistration,
} from '../services/api';
import { statusLabel } from '../utils/domain';
import { messageToneClasses } from '../utils/messageTone';

interface RaceRegistrationPageProps {
  onNavigate: (page: string) => void;
}

export default function RaceRegistrationPage({ onNavigate }: RaceRegistrationPageProps) {
  const fieldClass =
    'w-full bg-[#071a2f] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#d4af37]';

  const [tournament, setTournament] = useState<TournamentRecord | null>(null);
  const [horses, setHorses] = useState<HorseRecord[]>([]);
  const [races, setRaces] = useState<RaceRecord[]>([]);
  const [jockeys, setJockeys] = useState<JockeyProfileRecord[]>([]);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    horseId: '',
    jockeyUserId: '',
    notes: '',
  });

  const tournamentId = sessionStorage.getItem('selectedTournamentId') || '';

  const loadRegistrationData = () => {
    if (!tournamentId) {
      setMessage('Please select a tournament first.');
      return;
    }

    getRaceRegistration(tournamentId)
      .then((data) => {
        setTournament(data.tournament);
        setHorses(data.horses);
        setRaces(data.races);
        setJockeys(data.jockeyProfiles);
        setForm((current) => ({
          ...current,
          horseId: current.horseId || data.horses[0]?.id || '',
          jockeyUserId: current.jockeyUserId || data.jockeyProfiles[0]?.userId || '',
        }));
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to load registration data')
      );
  };

  useEffect(() => {
    loadRegistrationData();
  }, []);

  const submitRegistration = () => {
    setMessage('');

    if (!form.horseId || !form.jockeyUserId) {
      setMessage('Horse and jockey are required.');
      return;
    }

    createRaceEntry({
      tournamentId,
      horseId: form.horseId,
      jockeyUserId: form.jockeyUserId,
      notes: form.notes,
    })
      .then(() => {
        setMessage('Tournament request sent. This pair will run every race after Jockey and Admin approval.');
        setTimeout(() => onNavigate('tournaments'), 1200);
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to submit registration')
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
              Tournament Horse Registration
            </p>

            <h1 className="text-4xl font-black text-white mt-2">
              {tournament?.name || 'Tournament'}
            </h1>

            <p className="text-gray-400 mt-3">
              Select one approved horse and one approved jockey for this tournament. After Jockey and Admin approval, this fixed pair runs the full race schedule.
            </p>
          </div>

          {message && (
            <div className={`mb-6 rounded-xl border px-4 py-3 font-semibold ${messageToneClasses(message)}`}>
              {message}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-gray-300 mb-2">Horse</label>
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
                {horses.map((horse) => (
                  <option key={horse.id} value={horse.id}>
                    {horse.name} - {statusLabel(horse.status)}
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
                {jockeys.map((jockey) => (
                  <option key={jockey.id} value={jockey.userId}>
                    {jockey.jockeyName} - {jockey.competitionLevel} - {jockey.weight}kg
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-gray-300 mb-2">Additional Notes</label>
              <textarea
                rows={4}
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
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-[#071a2f] p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-white font-bold">Tournament Race Schedule</h2>
              <span className="text-[#d4af37] font-bold">
                {races.length} races
              </span>
            </div>

            <div className="mt-4 grid md:grid-cols-2 gap-3">
              {races.length === 0 && (
                <div className="md:col-span-2 text-gray-500">
                  Admin has not created races for this tournament yet. The pair will be assigned automatically when races are created.
                </div>
              )}

              {races.map((race) => (
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

          <button
            onClick={submitRegistration}
            className="mt-8 flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-[#d4af37] hover:bg-[#b8892d] text-white font-bold transition-all"
          >
            <Send className="w-5 h-5" />
            Register Pair for Tournament
          </button>
        </div>
      </div>
    </div>
  );
}
