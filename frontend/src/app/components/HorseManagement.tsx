import { useEffect, useState } from 'react';
import {
  Award,
  Edit3,
  Eye,
  Plus,
  Search,
} from 'lucide-react';
import {
  ActivePairing,
  HorseRecord,
  RaceEntryRecord,
  getOwnerPortal,
} from '../services/api';
import { formatWeightLb, statusLabel } from '../utils/domain';
import { messageToneClasses } from '../utils/messageTone';
import { officialHorseRating } from '../utils/rating';

interface HorseManagementProps {
  onNavigate: (page: string) => void;
  onSelectHorse: (horse: HorseRecord) => void;
}

// Ghi chú: Hàm này render màn hình owner quản lý danh sách ngựa của mình.
export default function HorseManagement({
  onNavigate,
  onSelectHorse,
}: HorseManagementProps) {
  const [horses, setHorses] = useState<HorseRecord[]>([]);
  const [raceEntries, setRaceEntries] = useState<RaceEntryRecord[]>([]);
  const [activePairings, setActivePairings] = useState<ActivePairing[]>([]);
  const [maxHorses, setMaxHorses] = useState(0);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [message, setMessage] = useState('');

  // Ghi chú: Hàm này tải nghiệp vụ liên quan đến load portal.
  const loadPortal = () => {
    getOwnerPortal()
      .then((data) => {
        setHorses(data.horses);
        setRaceEntries(data.raceEntries);
        setActivePairings(data.activePairings || []);
        setMaxHorses(data.limits.maxOwnerHorses);
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to load horses')
      );
  };

  useEffect(() => {
    loadPortal();
  }, []);

  const canAddHorse = maxHorses > 0 && horses.length < maxHorses;

  // Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến horse entry count.
  const horseEntryCount = (horseId: string) =>
    raceEntries.filter((entry) => entry.horseId === horseId).length;

  // Ghi chú: Hàm này lọc dữ liệu đang hoạt động nghiệp vụ liên quan đến active pairing for horse.
  const activePairingForHorse = (horseId: string) =>
    activePairings.find((pairing) => pairing.horseId === horseId);

  const filteredHorses = horses.filter((horse) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery =
      !normalizedQuery ||
      [
        horse.name,
        horse.breed,
        horse.species,
        horse.healthStatus,
        horse.jockeyConfirmation,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    const matchesStatus = !statusFilter || horse.status === statusFilter;

    return matchesQuery && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#071a2f] pt-24 pb-12">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Horses
            </h1>

            <p className="text-gray-400">
              Manage owned horses and horse profiles. Approved horses are entered for the full tournament race schedule.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="rounded-xl border border-white/10 bg-[#102a46] px-4 py-3 text-gray-300">
              Horses: <span className="font-bold text-white">{horses.length}/{maxHorses}</span>
            </div>

            <button
              onClick={() => {
                if (!canAddHorse) {
                  setMessage(`Each owner can register up to ${maxHorses} horses.`);
                  return;
                }

                onNavigate('register-horse');
              }}
              className={`flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold transition-all ${
                canAddHorse
                  ? 'bg-[#d4af37] text-white hover:bg-[#b8892d]'
                  : 'bg-white/10 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Plus className="w-5 h-5" />
              Add Horse
            </button>
          </div>
        </div>

        {message && (
          <div className={`mb-8 rounded-2xl border p-4 font-semibold ${messageToneClasses(message)}`}>
            {message}
          </div>
        )}

        <div className="mb-8 grid gap-4 rounded-2xl border border-white/10 bg-[#102a46] p-5 md:grid-cols-[1fr,240px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search horse, breed, health, pairing"
              className="h-12 w-full rounded-xl border border-white/10 bg-[#071a2f] pl-12 pr-4 text-white outline-none focus:border-[#d4af37]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-12 rounded-xl border border-white/10 bg-[#071a2f] px-4 text-white outline-none focus:border-[#d4af37]"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="retired">Retired</option>
          </select>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredHorses.length === 0 && (
            <div className="sm:col-span-2 xl:col-span-3 2xl:col-span-4 rounded-2xl border border-white/10 bg-[#102a46] p-8 text-gray-400">
              No horses match the current filters.
            </div>
          )}

          {filteredHorses.map((horse) => {
            const activePairing = activePairingForHorse(horse.id);

            return (
            <div
              key={horse.id}
              className="flex h-full flex-col rounded-2xl border border-white/10 bg-[#102a46] p-6"
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/15">
                  <Award className="h-8 w-8 text-[#d4af37]" />
                </div>

                <h2 className="text-2xl font-bold text-white">
                  {horse.name}
                </h2>

                <p className="mt-2 text-gray-400">
                  {horse.breed} • {horse.age} years old
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {horse.species || 'Species not set'} • {formatWeightLb(horse.weightLb)}
                </p>

                <span className="mt-4 px-3 py-1 rounded-xl bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/30 text-sm font-bold">
                  {statusLabel(horse.status)}
                </span>
              </div>

              <div className="mt-6 grid flex-1 grid-cols-2 gap-3 border-t border-white/10 pt-5">
                <div className="rounded-xl border border-white/10 bg-[#071a2f] p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                    <Award className="h-4 w-4" />
                    Race Entries
                  </div>
                  <div className="text-lg font-bold text-white">
                    {horseEntryCount(horse.id)}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#071a2f] p-4">
                  <div className="mb-2 text-xs uppercase tracking-wide text-gray-500">
                    Health
                  </div>
                  <div className="text-sm font-bold text-white">
                    {horse.healthStatus || 'Not set'}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#071a2f] p-4">
                  <div className="mb-2 text-xs uppercase tracking-wide text-gray-500">
                    Height
                  </div>
                  <div className="text-lg font-bold text-white">
                    {horse.heightCm ? `${horse.heightCm}cm` : 'Not set'}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#071a2f] p-4">
                  <div className="mb-2 text-xs uppercase tracking-wide text-gray-500">
                    Overall Rating
                  </div>
                  <div className="text-lg font-bold text-white">
                    {officialHorseRating(horse)}
                  </div>
                </div>

                <div className="col-span-2 rounded-xl border border-white/10 bg-[#071a2f] p-4">
                  <div className="mb-2 text-xs uppercase tracking-wide text-gray-500">
                    Jockey Pairing
                  </div>
                  <div className="text-sm font-bold text-white">
                    {activePairing
                      ? `${activePairing.jockeyName} • ${activePairing.tournamentName}`
                      : 'No active pairing'}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={() => {
                    sessionStorage.setItem('selectedHorseId', horse.id);
                    onSelectHorse(horse);
                    onNavigate('horse-details');
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-3 font-semibold text-white transition-all hover:bg-white/15"
                >
                  <Eye className="w-4 h-4" />
                  Details
                </button>

                <button
                  onClick={() => {
                    sessionStorage.setItem('selectedHorseId', horse.id);
                    onSelectHorse(horse);
                    onNavigate('edit-horse');
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 py-3 font-semibold text-[#d4af37] transition-all hover:bg-[#d4af37]/20"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
