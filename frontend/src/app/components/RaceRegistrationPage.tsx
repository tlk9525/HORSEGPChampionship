import { useEffect, useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import {
  HorseRecord,
  JockeyProfileRecord,
  RaceRecord,
  createRaceEntry,
  getRaceRegistration,
} from '../services/api';
import { statusLabel } from '../data/tournamentWorkflow';
import { messageToneClasses } from '../utils/messageTone';

interface RaceRegistrationPageProps {
  onNavigate: (page: string) => void;
}

export default function RaceRegistrationPage({ onNavigate }: RaceRegistrationPageProps) {
  const fieldClass =
    'w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#e10600]';

  const [tournament, setTournament] = useState<any>(null);
  const [horses, setHorses] = useState<HorseRecord[]>([]);
  const [races, setRaces] = useState<RaceRecord[]>([]);
  const [jockeys, setJockeys] = useState<JockeyProfileRecord[]>([]);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    horseId: '',
    raceId: '',
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
          raceId: current.raceId || data.races[0]?.id || '',
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

    if (!form.horseId || !form.raceId || !form.jockeyUserId) {
      setMessage('Horse, race and jockey are required.');
      return;
    }

    createRaceEntry({
      tournamentId,
      horseId: form.horseId,
      raceId: form.raceId,
      jockeyUserId: form.jockeyUserId,
      notes: form.notes,
    })
      .then(() => {
        setMessage('Horse race entry submitted. Admin approval required.');
        setTimeout(() => onNavigate('tournaments'), 900);
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to submit registration')
      );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">
      <div className="max-w-5xl mx-auto px-4">
        <button
          onClick={() => onNavigate('tournaments')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Tournaments
        </button>

        <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-8">
          <div className="mb-8">
            <p className="text-[#e10600] text-sm uppercase tracking-widest">
              Race Registration
            </p>

            <h1 className="text-4xl font-black text-white mt-2">
              {tournament?.name || 'Tournament'}
            </h1>

            <p className="text-gray-400 mt-3">
              Select an owned horse, an open race and a jockey approved for this tournament.
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
              <label className="block text-gray-300 mb-2">Race</label>
              <select
                value={form.raceId}
                onChange={(event) =>
                  setForm({
                    ...form,
                    raceId: event.target.value,
                  })
                }
                className={fieldClass}
              >
                {races.map((race) => (
                  <option key={race.id} value={race.id}>
                    {race.name} - {race.date} {race.time}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
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

          <button
            onClick={submitRegistration}
            className="mt-8 flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-[#e10600] hover:bg-[#c00500] text-white font-bold transition-all"
          >
            <Send className="w-5 h-5" />
            Submit Registration
          </button>
        </div>
      </div>
    </div>
  );
}
