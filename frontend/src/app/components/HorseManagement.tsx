import { useEffect, useState } from 'react';
import { Award, Edit3, Eye, Plus } from 'lucide-react';
import NotificationsPanel from './NotificationsPanel';
import {
  HorseRecord,
  RaceEntryRecord,
  getOwnerPortal,
} from '../services/api';
import { statusLabel } from '../data/tournamentWorkflow';
import { messageToneClasses } from '../utils/messageTone';

interface HorseManagementProps {
  onNavigate: (page: string) => void;
  onSelectHorse: (horse: HorseRecord) => void;
}

export default function HorseManagement({
  onNavigate,
  onSelectHorse,
}: HorseManagementProps) {
  const [horses, setHorses] = useState<HorseRecord[]>([]);
  const [raceEntries, setRaceEntries] = useState<RaceEntryRecord[]>([]);
  const [message, setMessage] = useState('');

  const loadPortal = () => {
    getOwnerPortal()
      .then((data) => {
        setHorses(data.horses);
        setRaceEntries(data.raceEntries);
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to load horses')
      );
  };

  useEffect(() => {
    loadPortal();
  }, []);

  const maxHorses = 5;
  const canAddHorse = horses.length < maxHorses;

  const horseEntryCount = (horseId: string) =>
    raceEntries.filter((entry) => entry.horseId === horseId).length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Horses
            </h1>

            <p className="text-gray-400">
              Manage owned horses and horse profiles. Tournament and race registration are handled from the Tournaments page.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="rounded-xl border border-white/10 bg-[#141414] px-4 py-3 text-gray-300">
              Horses: <span className="font-bold text-white">{horses.length}/{maxHorses}</span>
            </div>

            <button
              onClick={() => {
                if (!canAddHorse) {
                  setMessage('Each owner can register up to 5 horses.');
                  return;
                }

                onNavigate('register-horse');
              }}
              className={`flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold transition-all ${
                canAddHorse
                  ? 'bg-[#e10600] text-white hover:bg-[#c00500]'
                  : 'bg-white/10 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Plus className="w-5 h-5" />
              Add Horse
            </button>
          </div>
        </div>

        <NotificationsPanel />

        {message && (
          <div className={`mb-8 rounded-2xl border p-4 font-semibold ${messageToneClasses(message)}`}>
            {message}
          </div>
        )}

        <div className="grid xl:grid-cols-3 md:grid-cols-2 gap-6">
          {horses.length === 0 && (
            <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-white/10 bg-[#141414] p-8 text-gray-400">
              No horses yet. Add a horse profile before joining race registrations.
            </div>
          )}

          {horses.map((horse) => (
            <div
              key={horse.id}
              className="rounded-2xl border border-white/10 bg-[#141414] p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {horse.name}
                  </h2>

                  <p className="text-gray-400 mt-2">
                    {horse.breed} • {horse.age} years old
                  </p>

                  <p className="text-gray-500 mt-1">
                    {horse.species || 'Species not set'} • {horse.weightKg || 0}kg • Handicap {horse.baseHandicap || 0}
                  </p>
                </div>

                <span className="px-3 py-1 rounded-xl bg-[#e10600]/10 text-[#e10600] border border-[#e10600]/30 text-sm font-bold">
                  {statusLabel(horse.status)}
                </span>
              </div>

              <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-gray-400">
                    <Award className="w-4 h-4" />
                    Race Entries
                  </span>

                  <span className="text-white font-semibold">
                    {horseEntryCount(horse.id)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Health</span>
                  <span className="text-white font-semibold">
                    {horse.healthStatus || 'Not set'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Height</span>
                  <span className="text-white font-semibold">
                    {horse.heightCm ? `${horse.heightCm}cm` : 'Not set'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Jockey Pairing</span>
                  <span className="text-white font-semibold">
                    {statusLabel(horse.jockeyConfirmation)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => {
                    onSelectHorse(horse);
                    onNavigate('horse-details');
                  }}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-white hover:bg-white/15 transition-all font-semibold"
                >
                  <Eye className="w-4 h-4" />
                  Details
                </button>

                <button
                  onClick={() => {
                    onSelectHorse(horse);
                    onNavigate('edit-horse');
                  }}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#e10600]/10 text-[#e10600] hover:bg-[#e10600]/20 transition-all font-semibold border border-[#e10600]/30"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
