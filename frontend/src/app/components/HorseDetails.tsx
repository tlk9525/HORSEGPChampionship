import {
  Activity,
  ArrowLeft,
  FileText,
  Gauge,
  HeartPulse,
  Pencil,
  Ruler,
  Scale,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  HorseRecord,
  RaceEntryRecord,
  getBootstrap,
} from '../services/api';
import { statusLabel } from '../utils/domain';
import { officialHorseRating } from '../utils/rating';

interface HorseDetailsProps {
  horse: HorseRecord | null;
  onNavigate: (page: string) => void;
}

const value = (input: string | number | null | undefined, suffix = '') =>
  input === null || input === undefined || input === '' || Number(input) === 0
    ? 'Not set'
    : `${input}${suffix}`;

const overall = officialHorseRating;

export default function HorseDetails({ horse, onNavigate }: HorseDetailsProps) {
  const { horseId } = useParams();
  const [loadedHorse, setLoadedHorse] = useState<HorseRecord | null>(null);
  const [raceEntries, setRaceEntries] = useState<RaceEntryRecord[]>([]);
  const [message, setMessage] = useState('');
  const activeHorse = horse || loadedHorse;

  useEffect(() => {
    const activeHorseId = horse?.id || horseId;

    if (!activeHorseId) return;

    getBootstrap()
      .then((data) => {
        if (!horse) {
          setLoadedHorse(
            data.horses.find((item) => item.id === activeHorseId) || null
          );
        }

        setRaceEntries(
          (data.raceEntries || [])
            .filter((entry) => entry.horseId === activeHorseId)
            .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
        );
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to load horse')
      );
  }, [horse, horseId]);

  if (!activeHorse) {
    return (
      <div className="min-h-screen bg-[#071a2f] pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => onNavigate('horses')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Horses
          </button>

          <div className="rounded-2xl border border-white/10 bg-[#0b223d] p-8 text-gray-300">
            {message || 'Select a horse from the Horses page to view its details.'}
          </div>
        </div>
      </div>
    );
  }

  const profileCards = [
    ['Breed', activeHorse.breed, Trophy],
    ['Species', activeHorse.species || 'Not set', Activity],
    ['Sex', activeHorse.sex || 'Not set', ShieldCheck],
    ['Color', activeHorse.color || 'Not set', FileText],
    ['Age', `${activeHorse.age} years`, Activity],
    ['Weight', value(activeHorse.weightLb, 'kg'), Scale],
    ['Height', value(activeHorse.heightCm, 'cm'), Ruler],
    ['Official Rating', value(overall(activeHorse)), Trophy],
    ['Speed Rating', value(activeHorse.speedRating), Gauge],
    ['Stamina Rating', value(activeHorse.staminaRating), Activity],
    ['Form Rating', value(activeHorse.formRating), Trophy],
    ['Health Rating', value(activeHorse.healthRating), HeartPulse],
    ['Overall Rating', overall(activeHorse), Gauge],
    ['Health Status', activeHorse.healthStatus || 'Not set', HeartPulse],
    ['Jockey Pairing', statusLabel(activeHorse.jockeyConfirmation), ShieldCheck],
  ];

  return (
    <div className="min-h-screen bg-[#071a2f] pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <button
            onClick={() => onNavigate('horses')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Horses
          </button>

          <button
            onClick={() => {
              sessionStorage.setItem('selectedHorseId', activeHorse.id);
              onNavigate('edit-horse');
            }}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 px-5 py-3 text-[#d4af37] font-bold hover:bg-[#d4af37]/20"
          >
            <Pencil className="w-4 h-4" />
            Edit Horse
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0b223d] overflow-hidden mb-8">
          <div className="relative min-h-[340px]">
            <img
              src="https://images.unsplash.com/photo-1507514604110-ba3347c457f6?w=1600"
              alt={activeHorse.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b223d] via-[#0b223d]/50 to-[#071a2f]/20" />

            <div className="relative z-10 p-8 lg:p-10 flex flex-col justify-end min-h-[340px]">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="px-4 py-2 bg-[#d4af37] rounded-lg text-white font-bold text-sm">
                  {statusLabel(activeHorse.status)}
                </span>

                <span className="px-4 py-2 bg-[#071a2f]/50 border border-white/10 rounded-lg text-white font-semibold text-sm">
                  Official Rating {overall(activeHorse)}
                </span>

                <span className="px-4 py-2 bg-[#071a2f]/50 border border-white/10 rounded-lg text-white font-semibold text-sm">
                  Rating {overall(activeHorse)}
                </span>

                <span className="px-4 py-2 bg-[#071a2f]/50 border border-white/10 rounded-lg text-white font-semibold text-sm">
                  {activeHorse.healthStatus || 'Health not set'}
                </span>
              </div>

              <h1 className="text-5xl font-black text-white mb-3">
                {activeHorse.name}
              </h1>

              <p className="text-gray-300 text-lg">
                {activeHorse.breed} • {activeHorse.species || 'Species not set'} • {activeHorse.age} years old
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr,380px] gap-8">
          <div className="space-y-8">
            <div className="rounded-2xl border border-white/10 bg-[#0b223d] p-8">
              <h2 className="text-3xl font-bold text-white mb-6">
                Horse Profile
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                {profileCards.map(([label, content, Icon]) => (
                  <div
                    key={String(label)}
                    className="rounded-xl border border-white/10 bg-[#12304f] p-5"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="w-5 h-5 text-[#d4af37]" />
                      <span className="text-gray-400 text-sm">{label}</span>
                    </div>

                    <div className="text-white text-lg font-bold">
                      {content}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0b223d] p-8">
              <h2 className="text-3xl font-bold text-white mb-5">
                Notes
              </h2>

              <p className="text-gray-300 leading-8">
                {activeHorse.profileNotes || 'No profile notes have been added yet.'}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0b223d] p-8">
              <h2 className="text-3xl font-bold text-white mb-5">
                Race History
              </h2>

              <div className="space-y-4">
                {raceEntries.length === 0 && (
                  <div className="rounded-xl border border-white/10 bg-[#12304f] p-5 text-gray-400">
                    No race entries have been recorded for this horse yet.
                  </div>
                )}

                {raceEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-white/10 bg-[#12304f] p-5"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <div className="text-white text-lg font-bold">
                          {entry.raceName || 'Race'}
                        </div>

                        <div className="mt-1 text-sm text-gray-400">
                          Jockey: {entry.jockeyName || 'Pending'} • Gate {entry.lane || 'TBD'} • {statusLabel(entry.status)}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-lg border border-white/10 bg-[#071a2f]/40 px-3 py-2 text-sm text-gray-300">
                          Position {entry.position || 'Pending'}
                        </span>

                        <span className="rounded-lg border border-white/10 bg-[#071a2f]/40 px-3 py-2 text-sm text-gray-300">
                          Time {entry.finishTime || 'Pending'}
                        </span>

                        <span className="rounded-lg border border-white/10 bg-[#071a2f]/40 px-3 py-2 text-sm text-gray-300">
                          Result {statusLabel(entry.resultStatus || 'draft')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="rounded-2xl border border-white/10 bg-[#0b223d] p-8">
              <h2 className="text-2xl font-bold text-white mb-6">
                Documents
              </h2>

              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-[#12304f] p-5">
                  <div className="text-gray-400 text-sm mb-2">
                    Veterinary Certificate
                  </div>

                  <div className="text-white font-semibold break-words">
                    {activeHorse.veterinaryCertificateUrl || 'Not uploaded'}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#12304f] p-5">
                  <div className="text-gray-400 text-sm mb-2">
                    Owner ID
                  </div>

                  <div className="text-white font-semibold">
                    {activeHorse.ownerUserId}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0b223d] p-8">
              <h2 className="text-2xl font-bold text-white mb-6">
                Race Readiness
              </h2>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">Admin status</span>
                  <span className="text-white font-bold">{statusLabel(activeHorse.status)}</span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">Health</span>
                  <span className="text-white font-bold">{activeHorse.healthStatus || 'Not set'}</span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">Official Rating</span>
                  <span className="text-white font-bold">{overall(activeHorse)}</span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">Overall rating</span>
                  <span className="text-white font-bold">{overall(activeHorse)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
