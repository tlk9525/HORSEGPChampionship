import {
  Activity,
  ArrowLeft,
  FileText,
  HeartPulse,
  Pencil,
  Ruler,
  Scale,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import { HorseRecord } from '../services/api';
import { statusLabel } from '../data/tournamentWorkflow';

interface HorseDetailsProps {
  horse: HorseRecord | null;
  onNavigate: (page: string) => void;
}

const value = (input: string | number | null | undefined, suffix = '') =>
  input === null || input === undefined || input === '' || Number(input) === 0
    ? 'Not set'
    : `${input}${suffix}`;

export default function HorseDetails({ horse, onNavigate }: HorseDetailsProps) {
  if (!horse) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => onNavigate('horses')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Horses
          </button>

          <div className="rounded-2xl border border-white/10 bg-[#111] p-8 text-gray-300">
            Select a horse from the Horses page to view its details.
          </div>
        </div>
      </div>
    );
  }

  const profileCards = [
    ['Breed', horse.breed, Trophy],
    ['Species', horse.species || 'Not set', Activity],
    ['Sex', horse.sex || 'Not set', ShieldCheck],
    ['Color', horse.color || 'Not set', FileText],
    ['Age', `${horse.age} years`, Activity],
    ['Weight', value(horse.weightKg, 'kg'), Scale],
    ['Height', value(horse.heightCm, 'cm'), Ruler],
    ['Base Handicap', value(horse.baseHandicap), Trophy],
    ['Health Status', horse.healthStatus || 'Not set', HeartPulse],
    ['Jockey Pairing', statusLabel(horse.jockeyConfirmation), ShieldCheck],
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">
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
            onClick={() => onNavigate('edit-horse')}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#e10600]/30 bg-[#e10600]/10 px-5 py-3 text-[#ff4b45] font-bold hover:bg-[#e10600]/20"
          >
            <Pencil className="w-4 h-4" />
            Edit Horse
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111111] overflow-hidden mb-8">
          <div className="relative min-h-[340px]">
            <img
              src="https://images.unsplash.com/photo-1507514604110-ba3347c457f6?w=1600"
              alt={horse.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/50 to-black/20" />

            <div className="relative z-10 p-8 lg:p-10 flex flex-col justify-end min-h-[340px]">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="px-4 py-2 bg-[#e10600] rounded-lg text-white font-bold text-sm">
                  {statusLabel(horse.status)}
                </span>

                <span className="px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white font-semibold text-sm">
                  Handicap {horse.baseHandicap || 0}
                </span>

                <span className="px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white font-semibold text-sm">
                  {horse.healthStatus || 'Health not set'}
                </span>
              </div>

              <h1 className="text-5xl font-black text-white mb-3">
                {horse.name}
              </h1>

              <p className="text-gray-300 text-lg">
                {horse.breed} • {horse.species || 'Species not set'} • {horse.age} years old
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr,380px] gap-8">
          <div className="space-y-8">
            <div className="rounded-2xl border border-white/10 bg-[#111111] p-8">
              <h2 className="text-3xl font-bold text-white mb-6">
                Horse Profile
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                {profileCards.map(([label, content, Icon]) => (
                  <div
                    key={String(label)}
                    className="rounded-xl border border-white/10 bg-[#1a1a1a] p-5"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="w-5 h-5 text-[#e10600]" />
                      <span className="text-gray-400 text-sm">{label}</span>
                    </div>

                    <div className="text-white text-lg font-bold">
                      {content}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#111111] p-8">
              <h2 className="text-3xl font-bold text-white mb-5">
                Notes
              </h2>

              <p className="text-gray-300 leading-8">
                {horse.profileNotes || 'No profile notes have been added yet.'}
              </p>
            </div>
          </div>

          <div className="space-y-8">
            <div className="rounded-2xl border border-white/10 bg-[#111111] p-8">
              <h2 className="text-2xl font-bold text-white mb-6">
                Documents
              </h2>

              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-[#1a1a1a] p-5">
                  <div className="text-gray-400 text-sm mb-2">
                    Veterinary Certificate
                  </div>

                  <div className="text-white font-semibold break-words">
                    {horse.veterinaryCertificateUrl || 'Not uploaded'}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#1a1a1a] p-5">
                  <div className="text-gray-400 text-sm mb-2">
                    Owner ID
                  </div>

                  <div className="text-white font-semibold">
                    {horse.ownerUserId}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#111111] p-8">
              <h2 className="text-2xl font-bold text-white mb-6">
                Race Readiness
              </h2>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">Admin status</span>
                  <span className="text-white font-bold">{statusLabel(horse.status)}</span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">Health</span>
                  <span className="text-white font-bold">{horse.healthStatus || 'Not set'}</span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">Handicap</span>
                  <span className="text-white font-bold">{horse.baseHandicap || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
