import {
  ArrowLeft,
  Trophy,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  HorseRecord,
  RaceEntryRecord,
  RaceRecord,
  createHorse,
  getBootstrap,
  updateHorse,
} from '../services/api';
import { messageToneClasses } from '../utils/messageTone';
import { initialHorseRating, officialHorseRating } from '../utils/rating';

const formatRating = (value: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '-';
  return String(Math.round(parsed));
};

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
  const { horseId } = useParams();
  const [loadedHorse, setLoadedHorse] = useState<HorseRecord | null>(null);
  const [raceEntries, setRaceEntries] = useState<RaceEntryRecord[]>([]);
  const [races, setRaces] = useState<RaceRecord[]>([]);
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [species, setSpecies] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [color, setColor] = useState('');
  const [weightLb, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [speedRating, setSpeedRating] = useState('75');
  const [staminaRating, setStaminaRating] = useState('75');
  const [formRating, setFormRating] = useState('75');
  const [healthRating, setHealthRating] = useState('75');
  const [healthStatus, setHealthStatus] = useState('');
  const [profileNotes, setProfileNotes] = useState('');
  const [veterinaryCertificateUrl, setVeterinaryCertificateUrl] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const activeHorse = horse || loadedHorse;
  const isEdit = mode === 'edit' && Boolean(activeHorse);
  const fieldClass =
    'w-full h-12 px-4 bg-[#071a2f] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#d4af37]';
  const ratingValue = (value: string, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const overallRating = initialHorseRating({
    speedRating: ratingValue(speedRating, 75),
    staminaRating: ratingValue(staminaRating, 75),
    formRating: ratingValue(formRating, 75),
    healthRating: ratingValue(healthRating, 75),
  });
  const displayedRating = isEdit && activeHorse
    ? officialHorseRating(activeHorse)
    : overallRating;
  const latestAdjustment = activeHorse
    ? raceEntries
        .filter((entry) => {
          const postRaceRating = Number(entry.postRaceRating || 0);
          const ratingChange = Number(entry.ratingChange || 0);
          return (
            entry.horseId === activeHorse.id &&
            entry.resultStatus === 'official' &&
            (postRaceRating > 0 || ratingChange !== 0)
          );
        })
        .map((entry) => {
          const race = races.find((item) => item.id === entry.raceId);
          const ratingSnapshot = Number(entry.ratingSnapshot || 0);
          const ratingChange = Number(entry.ratingChange || 0);
          const postRaceRating =
            Number(entry.postRaceRating || 0) || ratingSnapshot + ratingChange;
          const sortTime = race
            ? Date.parse(`${race.raceDate}T${race.raceTime || '00:00'}`)
            : 0;

          return {
            raceName: race?.name || entry.raceName || 'Race',
            ratingSnapshot,
            ratingChange,
            postRaceRating,
            sortTime: Number.isFinite(sortTime) ? sortTime : 0,
          };
        })
        .sort((a, b) => b.sortTime - a.sortTime)[0]
    : null;

  useEffect(() => {
    if (mode !== 'edit') return;

    getBootstrap()
      .then((data) => {
        setRaceEntries(data.raceEntries || []);
        setRaces(data.races || []);

        if (!horse && horseId) {
          const foundHorse = data.horses.find((item) => item.id === horseId) || null;
          setLoadedHorse(foundHorse);

          if (!foundHorse) {
            setMessage('Horse not found or not available for this account.');
          }
        }
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to load horse')
      );
  }, [horse, horseId, mode]);

  useEffect(() => {
    if (!activeHorse) return;

    setName(activeHorse.name || '');
    setBreed(activeHorse.breed || '');
    setSpecies(activeHorse.species || '');
    setAge(activeHorse.age ? String(activeHorse.age) : '');
    setSex(activeHorse.sex || '');
    setColor(activeHorse.color || '');
    setWeightKg(activeHorse.weightLb ? String(activeHorse.weightLb) : '');
    setHeightCm(activeHorse.heightCm ? String(activeHorse.heightCm) : '');
    setSpeedRating(activeHorse.speedRating ? String(activeHorse.speedRating) : '75');
    setStaminaRating(activeHorse.staminaRating ? String(activeHorse.staminaRating) : '75');
    setFormRating(activeHorse.formRating ? String(activeHorse.formRating) : '75');
    setHealthRating(activeHorse.healthRating ? String(activeHorse.healthRating) : '75');
    setHealthStatus(activeHorse.healthStatus || '');
    setProfileNotes(activeHorse.profileNotes || '');
    setVeterinaryCertificateUrl(activeHorse.veterinaryCertificateUrl || '');
  }, [activeHorse]);

  const submit = () => {
    setMessage('');

    if (mode === 'edit' && !activeHorse) {
      setMessage('Load a horse before saving changes.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name,
      breed,
      species,
      age,
      sex,
      color,
      weightLb,
      heightCm,
      speedRating,
      staminaRating,
      formRating,
      healthRating,
      healthStatus,
      profileNotes,
      veterinaryCertificateUrl,
    };

    const request = mode === 'edit' && activeHorse
      ? updateHorse(activeHorse.id, payload).then(() => null)
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
    <div className="min-h-screen bg-[#071a2f] pt-24 pb-12">

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
        <div className="bg-[#0b223d] border border-white/10 rounded-2xl p-8">

          {/* HEADER */}
          <div className="flex items-center gap-4 mb-10">

            <div className="w-16 h-16 rounded-2xl bg-[#d4af37]/20 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-[#d4af37]" />
            </div>

            <div>
              <p className="text-[#d4af37] uppercase tracking-[0.2em] text-sm font-bold">
                {isEdit ? 'Horse Owner Profile' : 'Horse Owner Registration'}
              </p>

              <h1 className="text-4xl font-black text-white mt-2">
                {isEdit ? 'Edit Horse Profile' : 'Register New Horse'}
              </h1>

              <p className="text-gray-400 mt-2">
                Approved horses are eligible for active tournament race schedules.
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
                value={weightLb}
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

            <div className="md:col-span-2 rounded-2xl border border-white/10 bg-[#12304f] p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-xl font-black text-white">
                    Performance Rating
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Attribute scores set the initial rating. Race results update the official rating afterward.
                  </p>
                </div>

                <div className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-3">
                  <div className="text-[#f6d77a] text-xs uppercase font-bold">
                    {isEdit ? 'Official Rating' : 'Initial Rating Estimate'}
                  </div>
                  <div className="text-white text-2xl font-black">
                    {formatRating(displayedRating)}
                  </div>
                </div>
              </div>

              {isEdit && (
                <div className="grid md:grid-cols-3 gap-4 mb-5">
                  <div className="rounded-xl border border-white/10 bg-[#071a2f] p-4">
                    <div className="text-gray-400 text-xs uppercase font-bold">
                      Current Official
                    </div>
                    <div className="text-white text-xl font-black mt-1">
                      {formatRating(displayedRating)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#071a2f] p-4">
                    <div className="text-gray-400 text-xs uppercase font-bold">
                      Attribute Estimate
                    </div>
                    <div className="text-white text-xl font-black mt-1">
                      {formatRating(overallRating)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#071a2f] p-4">
                    <div className="text-gray-400 text-xs uppercase font-bold">
                      Last Race Adjustment
                    </div>
                    {latestAdjustment ? (
                      <>
                        <div className="text-white text-sm font-bold mt-1 truncate">
                          {latestAdjustment.raceName}
                        </div>
                        <div className="text-gray-300 text-sm mt-1">
                          {formatRating(latestAdjustment.ratingSnapshot)} to{' '}
                          {formatRating(latestAdjustment.postRaceRating)}
                          <span
                            className={
                              latestAdjustment.ratingChange > 0
                                ? 'text-green-400 font-bold'
                                : latestAdjustment.ratingChange < 0
                                  ? 'text-red-400 font-bold'
                                  : 'text-gray-400 font-bold'
                            }
                          >
                            {' '}
                            ({latestAdjustment.ratingChange > 0 ? '+' : ''}
                            {formatRating(latestAdjustment.ratingChange)})
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-gray-300 text-sm mt-1">
                        No race adjustment recorded yet.
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-4 gap-4">
                {[
                  ['Speed', speedRating, setSpeedRating],
                  ['Stamina', staminaRating, setStaminaRating],
                  ['Current Form', formRating, setFormRating],
                  ['Health', healthRating, setHealthRating],
                ].map(([label, value, setter]) => (
                  <div key={String(label)}>
                    <label className="block text-gray-300 mb-2">
                      {String(label)}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={String(value)}
                      onChange={(event) =>
                        (setter as (next: string) => void)(event.target.value)
                      }
                      className={fieldClass}
                    />
                  </div>
                ))}
              </div>
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
              className="w-full min-h-[120px] px-4 py-3 bg-[#071a2f] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#d4af37]"
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
              className="px-6 py-3 rounded-xl bg-[#d4af37] hover:bg-[#b8892d] disabled:opacity-60 text-white font-semibold transition-all"
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Submit for Approval'}
            </button>

          </div>

        </div>

      </div>
    </div>
  );
}
