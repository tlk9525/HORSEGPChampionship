import {
  ArrowLeft,
  Trophy,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { currentTournament } from '../data/tournamentWorkflow';
import { HorseRecord, createHorse, updateHorse } from '../services/api';
import { messageToneClasses } from '../utils/messageTone';

interface RegisterHorsePageProps {
  onNavigate: (page: string) => void;
  horse?: HorseRecord | null;
  mode?: 'create' | 'edit';
}

export default function RegisterHorsePage({
  onNavigate,
  horse,
  mode = 'create',
}: RegisterHorsePageProps) {
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [species, setSpecies] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [color, setColor] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [baseHandicap, setBaseHandicap] = useState('');
  const [healthStatus, setHealthStatus] = useState('');
  const [profileNotes, setProfileNotes] = useState('');
  const [veterinaryCertificateUrl, setVeterinaryCertificateUrl] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = mode === 'edit' && horse;
  const fieldClass =
    'w-full h-12 px-4 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#e10600]';

  useEffect(() => {
    if (!horse) return;

    setName(horse.name || '');
    setBreed(horse.breed || '');
    setSpecies(horse.species || '');
    setAge(horse.age ? String(horse.age) : '');
    setSex(horse.sex || '');
    setColor(horse.color || '');
    setWeightKg(horse.weightKg ? String(horse.weightKg) : '');
    setHeightCm(horse.heightCm ? String(horse.heightCm) : '');
    setBaseHandicap(horse.baseHandicap ? String(horse.baseHandicap) : '');
    setHealthStatus(horse.healthStatus || '');
    setProfileNotes(horse.profileNotes || '');
    setVeterinaryCertificateUrl(horse.veterinaryCertificateUrl || '');
  }, [horse]);

  const submit = () => {
    setMessage('');
    setIsSubmitting(true);

    const payload = {
      name,
      breed,
      species,
      age,
      sex,
      color,
      weightKg,
      heightCm,
      baseHandicap,
      healthStatus,
      profileNotes,
      veterinaryCertificateUrl,
    };

    const request = isEdit
      ? updateHorse(horse.id, payload).then(() => null)
      : createHorse(payload).then(({ horseCount, maxHorses }) => ({
          horseCount,
          maxHorses,
        }));

    request
      .then((result) => {
        setMessage(
          result
            ? `Horse registration submitted. Owner horse limit: ${result.horseCount}/${result.maxHorses}.`
            : 'Horse profile updated.'
        );
        setTimeout(() => onNavigate('horses'), 700);
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : 'Unable to save horse');
      })
      .finally(() => setIsSubmitting(false));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">

      <div className="max-w-4xl mx-auto px-4">

        {/* BACK BUTTON */}
        <button
          onClick={() => onNavigate('horses')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Horses
        </button>

        {/* CARD */}
        <div className="bg-[#111111] border border-white/10 rounded-2xl p-8">

          {/* HEADER */}
          <div className="flex items-center gap-4 mb-10">

            <div className="w-16 h-16 rounded-2xl bg-[#e10600]/20 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-[#e10600]" />
            </div>

            <div>
              <p className="text-[#e10600] uppercase tracking-[0.2em] text-sm font-bold">
                {isEdit ? 'Horse Owner Profile' : 'Horse Owner Registration'}
              </p>

              <h1 className="text-4xl font-black text-white mt-2">
                {isEdit ? 'Edit Horse Profile' : 'Register New Horse'}
              </h1>

              <p className="text-gray-400 mt-2">
                Tournament: {currentTournament.name} • registration window {currentTournament.registrationWindow}
              </p>
            </div>

          </div>

          {/* FORM */}
          <div className="grid md:grid-cols-2 gap-6">

            <div>
              <label className="block text-gray-300 mb-2">
                Horse Name
              </label>

              <input
                type="text"
                placeholder="Midnight Storm"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">
                Breed
              </label>

              <input
                type="text"
                placeholder="Thoroughbred"
                value={breed}
                onChange={(event) => setBreed(event.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">
                Species
              </label>

              <input
                type="text"
                placeholder="Equus ferus caballus"
                value={species}
                onChange={(event) => setSpecies(event.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">
                Age
              </label>

              <input
                type="number"
                placeholder="4"
                min="1"
                value={age}
                onChange={(event) => setAge(event.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">
                Sex
              </label>

              <select
                value={sex}
                onChange={(event) => setSex(event.target.value)}
                className={fieldClass}
              >
                <option value="">Select sex</option>
                <option>Stallion</option>
                <option>Mare</option>
                <option>Gelding</option>
                <option>Colt</option>
                <option>Filly</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 mb-2">
                Color / Markings
              </label>

              <input
                type="text"
                placeholder="Black, Bay, Chestnut..."
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">
                Weight (kg)
              </label>

              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="485"
                value={weightKg}
                onChange={(event) => setWeightKg(event.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">
                Height (cm)
              </label>

              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="164"
                value={heightCm}
                onChange={(event) => setHeightCm(event.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">
                Base Handicap
              </label>

              <input
                type="number"
                min="0"
                step="0.5"
                placeholder="5"
                value={baseHandicap}
                onChange={(event) => setBaseHandicap(event.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">
                Health Status
              </label>

              <input
                type="text"
                placeholder="Cleared / Needs inspection"
                value={healthStatus}
                onChange={(event) => setHealthStatus(event.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">
                Veterinary Certificate URL
              </label>

              <input
                type="text"
                placeholder="https://..."
                value={veterinaryCertificateUrl}
                onChange={(event) => setVeterinaryCertificateUrl(event.target.value)}
                className={fieldClass}
              />
            </div>

          </div>

          <div className="mt-6">
            <label className="block text-gray-300 mb-2">
              Profile Notes
            </label>

            <textarea
              placeholder="Training notes, running style, medical notes..."
              value={profileNotes}
              onChange={(event) => setProfileNotes(event.target.value)}
              className="w-full min-h-[120px] px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#e10600]"
            />
          </div>

          {message && (
            <div className={`mt-6 rounded-xl border px-4 py-3 font-semibold ${messageToneClasses(message)}`}>
              {message}
            </div>
          )}

          {/* BUTTONS */}
          <div className="flex items-center justify-end gap-4 mt-10">

            <button
              onClick={() => onNavigate('horses')}
              className="px-6 py-3 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition-all"
            >
              Cancel
            </button>

            <button
              onClick={submit}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl bg-[#e10600] hover:bg-[#c00500] disabled:opacity-60 text-white font-semibold transition-all"
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Submit for Approval'}
            </button>

          </div>

        </div>

      </div>
    </div>
  );
}
