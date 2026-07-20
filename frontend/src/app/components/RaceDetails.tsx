import {
  Activity,
  Circle,
  CloudSun,
  MapPin,
  Shield,
  Timer,
  DollarSign,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  useNavigate,
  useParams,
} from 'react-router-dom';
import {
  HorseRecord,
  JockeyProfileRecord,
  RaceEntryRecord,
  RaceRecord,
  TournamentRecord,
  getBootstrap,
} from '../services/api';
import { formatWeightLb, statusLabel } from '../utils/domain';
import { officialHorseRating } from '../utils/rating';

// Ghi chú: Hàm này tạo khóa sắp xếp race theo số race hoặc ngày giờ.
const raceSortValue = (race: RaceRecord) => {
  const parsed = Number(String(race.raceNumber || '').replace(/\D/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 999;
};

const ratingForHorse = officialHorseRating;

// Ghi chú: Hàm này định dạng rating thành chuỗi ngắn gọn để hiển thị.
const formatRating = (value: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '-';
  return String(Math.round(parsed));
};

// Ghi chú: Hàm này định dạng giá trị cân nặng lb trên race card.
const lbValue = (value?: number | string | null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? String(Math.round(parsed)) : '-';
};

// Ghi chú: Hàm này quyết định có được hiển thị dữ liệu race card theo trạng thái race hay không.
const canShowRaceCardData = (race?: RaceRecord) =>
  Boolean(
    race &&
      [
        'registration-closed',
        'published',
        'in-progress',
        'finished',
        'completed',
      ].includes(race.status)
  );

// Ghi chú: Hàm này render thông tin chi tiết race, field và dữ liệu race card.
export default function RaceDetails() {
  const { raceId } = useParams();
  const routerNavigate = useNavigate();
  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [races, setRaces] = useState<RaceRecord[]>([]);
  const [entries, setEntries] = useState<RaceEntryRecord[]>([]);
  const [horses, setHorses] = useState<HorseRecord[]>([]);
  const [jockeyProfiles, setJockeyProfiles] = useState<JockeyProfileRecord[]>([]);
  const [maxRaceFieldSize, setMaxRaceFieldSize] = useState(0);
  const [selectedRaceId, setSelectedRaceId] = useState(
    raceId || sessionStorage.getItem('selectedRaceId') || ''
  );
  const [entriesExpanded, setEntriesExpanded] = useState(false);
  const [message, setMessage] = useState('');

  // Ghi chú: Hàm này tải nghiệp vụ liên quan đến load race data.
  const loadRaceData = () => {
    getBootstrap({ scope: 'race' })
      .then((data) => {
        const sortedRaces = [...(data.races || [])].sort(
          (a, b) => raceSortValue(a) - raceSortValue(b)
        );

        setTournaments(data.tournaments || []);
        setRaces(sortedRaces);
        setEntries(data.raceEntries || []);
        setHorses(data.horses || []);
        setJockeyProfiles(data.jockeyProfiles || []);
        setMaxRaceFieldSize(data.limits?.maxRaceFieldSize ?? 0);
        setSelectedRaceId((current) => {
          const next = raceId || current;

          if (next && sortedRaces.some((race) => race.id === next)) {
            sessionStorage.setItem('selectedRaceId', next);
            return next;
          }

          const fallback = sortedRaces[0]?.id || '';

          if (fallback) {
            sessionStorage.setItem('selectedRaceId', fallback);
          }

          return fallback;
        });
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to load race card')
      );
  };

  useEffect(() => {
    loadRaceData();
    const timer = window.setInterval(loadRaceData, 5000);

    return () => window.clearInterval(timer);
  }, [raceId]);

  const selectedRace =
    races.find((race) => race.id === selectedRaceId) || races[0];
  const tournamentRaces = races.filter(
    (race) => race.tournamentId === selectedRace?.tournamentId
  );
  const tournament =
    tournaments.find((item) => item.id === selectedRace?.tournamentId) ||
    tournaments[0];

  const selectedEntries = useMemo(
    () =>
      entries
        .filter(
          (entry) =>
            entry.raceId === selectedRace?.id &&
            entry.status !== 'rejected'
        )
        .sort((a, b) => (a.lane || 999) - (b.lane || 999)),
    [entries, selectedRace?.id]
  );

  const showData = canShowRaceCardData(selectedRace) && selectedEntries.length > 0;
  const showResultColumns = Boolean(
    selectedRace &&
      (['finished', 'completed'].includes(selectedRace.status) ||
        ['submitted', 'official'].includes(selectedRace.resultStatus || ''))
  );

  const rows = selectedEntries.map((entry, index) => {
    const horse = horses.find((item) => item.id === entry.horseId);
    // Calculate last 6 runs (form)
    const horseEntries = entries
      .filter(e => e.horseId === entry.horseId && e.position !== null && e.resultStatus === 'official' && new Date(e.createdAt || 0) < new Date(entry.createdAt || Date.now()))
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 6)
      .reverse();
    const formString = horseEntries.length > 0 
      ? horseEntries.map(e => e.position && e.position >= 10 ? '0' : String(e.position)).join('/') 
      : '-';

    const jockeyProfile = jockeyProfiles.find(
      (profile) => profile.userId === entry.jockeyUserId
    );
    const hasRatingSnapshot =
      entry.ratingSnapshot !== null &&
      entry.ratingSnapshot !== undefined &&
      Number.isFinite(Number(entry.ratingSnapshot));
    const rating = hasRatingSnapshot
      ? Number(entry.ratingSnapshot)
      : ratingForHorse(horse);
    const ratingChange = Math.round(Number(entry.ratingChange || 0));
    const postRaceRating = Number(entry.postRaceRating || 0);
    const finishPosition = Number(entry.position);

    return {
      id: entry.id,
      no: entry.lane || index + 1,
      form: formString,
      colour: horse?.color || '-',
      horse: entry.horseName || horse?.name || 'Horse',
      breed: horse?.breed || 'Breed not set',
      age: horse?.age || '-',
      assignedWeightLb: Number(entry.handicap || 0).toFixed(0),
      jockey: entry.jockeyName || 'Jockey pending',
      jockeyWeightLb:
        lbValue(entry.jockeyWeightLb) !== '-'
          ? lbValue(entry.jockeyWeightLb)
          : lbValue(jockeyProfile?.weightLb),
      draw: entry.lane || 'TBD',
      finishPosition:
        Number.isInteger(finishPosition) && finishPosition > 0
          ? finishPosition
          : null,
      finishTime: entry.finishTime || '-',
      owner: entry.ownerName || 'Owner pending',
      rating: formatRating(rating),
      ratingChange,
      ratingChangeLabel: `${ratingChange > 0 ? '+' : ''}${ratingChange}`,
      postRaceRating:
        entry.resultStatus === 'official' ? formatRating(postRaceRating) : '-',
      horseWeightLb:
        lbValue(entry.horseWeightLb) !== '-'
          ? lbValue(entry.horseWeightLb)
          : lbValue(horse?.weightLb),
    };
  });
  const visibleRows = entriesExpanded ? rows : rows.slice(0, 4);

  // Ghi chú: Hàm này chọn nghiệp vụ liên quan đến select race.
  const selectRace = (raceId: string) => {
    sessionStorage.setItem('selectedRaceId', raceId);
    setSelectedRaceId(raceId);
    setEntriesExpanded(false);
    routerNavigate(`/races/${raceId}`);
  };

  if (!selectedRace) {
    return (
      <div className="min-h-screen bg-[#071a2f] pt-24 pb-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="rounded-2xl border border-white/10 bg-[#0b223d] p-8 text-gray-300">
            No races have been created yet.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#071a2f] pt-24 pb-10">
      <div className="max-w-[1850px] mx-auto px-4">
        <div className="bg-[#102a46] border border-white/10 rounded-2xl overflow-hidden mb-6">
          <div className="border-b border-white/10 px-6 py-5 bg-[#0b223d]">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#d4af37]/15 border border-[#d4af37]/30">
                    <Circle className="w-2 h-2 fill-[#d4af37] text-[#d4af37]" />

                    <span className="text-[#d4af37] text-xs font-bold uppercase tracking-wider">
                      {statusLabel(selectedRace.status)}
                    </span>
                  </div>

                  <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm">
                    {tournament?.name || 'Tournament'}
                  </div>

                  <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm">
                    {selectedRace.raceNumber || selectedRace.round || 'Race'}
                  </div>
                </div>

                <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight">
                  {selectedRace.name}
                </h1>

                <div className="flex flex-wrap items-center gap-5 mt-5 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#d4af37]" />
                    {selectedRace.venue}
                  </div>

                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-[#d4af37]" />
                    {selectedRace.date} • {selectedRace.time}
                  </div>

                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#d4af37]" />
                    {selectedRace.raceClass || selectedRace.surface || 'Class not set'}
                  </div>

                  {selectedRace.totalPrize && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-[#d4af37]" />
                      ${Number(selectedRace.totalPrize).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 min-w-[340px]">
                <div className="bg-[#071a2f]/40 border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-gray-500 uppercase mb-2">
                    Matched Pairs
                  </div>

                  <div className="text-2xl font-black text-[#d4af37]">
                    {selectedEntries.length}
                  </div>
                </div>

                <div className="bg-[#071a2f]/40 border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-gray-500 uppercase mb-2">
                    Field Capacity
                  </div>

                  <div className="text-2xl font-black text-white">
                    {selectedEntries.length}/{maxRaceFieldSize}
                  </div>
                </div>

                <div className="bg-[#071a2f]/40 border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-gray-500 uppercase mb-2">
                    Registration
                  </div>

                  <div className="flex items-center gap-2 text-white font-bold">
                    <CloudSun className="w-5 h-5 text-[#d4af37]" />
                    {selectedRace.status === 'registration-open' &&
                    selectedRace.registrationClosesAt &&
                    Date.now() < new Date(selectedRace.registrationClosesAt).getTime()
                      ? 'Open'
                      : 'Closed'}
                  </div>
                </div>

                <div className="bg-[#071a2f]/40 border border-white/10 rounded-xl p-4">
                  <div className="text-xs text-gray-500 uppercase mb-2">
                    Referee
                  </div>

                  <div className="text-lg font-black text-white">
                    {selectedRace.referee || 'Not assigned'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 border-b border-white/10 bg-[#071a2f]">
            <div className="flex flex-wrap items-center gap-3">
              {tournamentRaces.map((race) => (
                <button
                  key={race.id}
                  onClick={() => selectRace(race.id)}
                  className={`w-20 h-16 rounded-2xl font-black text-2xl transition-all duration-300 ${
                    race.id === selectedRace.id
                      ? 'bg-[#d4af37] text-white shadow-xl shadow-[#d4af37]/30'
                      : 'bg-[#12304f] text-gray-300 hover:bg-[#1f3a5c]'
                  }`}
                >
                  {race.raceNumber || 'Race'}
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 py-4 bg-[#102a46] border-b border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-5 text-sm text-gray-400">
                <span>{selectedRace.distance || '-'} {selectedRace.surface || ''}</span>
                <span>Track condition not recorded</span>
                <span>{selectedEntries.length}/{maxRaceFieldSize} Horses</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-4 py-2 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#d4af37] font-bold text-sm">
                  REAL-TIME RACE CARD
                </div>

                <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm">
                  Updates every 5s
                </div>
              </div>
            </div>
          </div>

          {message && (
            <div className="m-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300 font-semibold">
              {message}
            </div>
          )}

          {!showData ? (
            <div className="p-8">
              <div className="rounded-2xl border border-white/10 bg-[#071a2f] p-8 text-center">
                <h2 className="text-3xl font-black text-white">
                  No race card entries yet
                </h2>

                <p className="text-gray-400 mt-3 max-w-2xl mx-auto">
                  This race has not been prepared yet, or no owner and jockey pair
                  has been approved for this race. Once entries are approved and
                  registration is closed or published, the race card appears here
                  automatically.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 bg-[#071a2f] px-6 py-4">
                <div>
                  <h2 className="text-xl font-black text-white">
                    Race Entries
                  </h2>

                  <p className="text-gray-400 text-sm mt-1">
                    Showing {visibleRows.length}/{rows.length} entries
                  </p>
                </div>

                {rows.length > 4 && (
                  <button
                    onClick={() => setEntriesExpanded((expanded) => !expanded)}
                    className="rounded-lg border border-[#d4af37]/40 bg-[#d4af37] px-5 py-2 text-sm font-bold text-[#071a2f] hover:bg-[#f0d66c]"
                  >
                    {entriesExpanded
                      ? 'Show first 4 entries'
                      : `View all ${rows.length} entries`}
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className={`w-full ${showResultColumns ? 'min-w-[1520px]' : 'min-w-[1350px]'}`}>
                  <thead className="bg-[#071a2f] border-b border-white/10">
                    <tr>
                      <th className="py-4 px-3 text-left text-gray-400 uppercase text-xs">Horse No.</th>
                      <th className="py-4 px-3 text-left text-gray-400 uppercase text-xs">Last 6 Runs</th>
                      <th className="py-4 px-3 text-left text-gray-400 uppercase text-xs">Colour</th>
                      <th className="py-4 px-3 text-left text-gray-400 uppercase text-xs">Horse</th>
                      <th className="py-4 px-3 text-center text-gray-400 uppercase text-xs">Assigned Wt. (lb)</th>
                      <th className="py-4 px-3 text-left text-gray-400 uppercase text-xs">Jockey</th>
                      <th className="py-4 px-3 text-center text-gray-400 uppercase text-xs">Jockey Wt. (lb)</th>
                      <th className="py-4 px-3 text-center text-gray-400 uppercase text-xs">Draw</th>
                      {showResultColumns && (
                        <>
                          <th className="py-4 px-3 text-center text-gray-400 uppercase text-xs">Pos.</th>
                          <th className="py-4 px-3 text-center text-gray-400 uppercase text-xs">Finish Time</th>
                        </>
                      )}
                      <th className="py-4 px-3 text-left text-gray-400 uppercase text-xs">Owner</th>
                      <th className="py-4 px-3 text-center text-gray-400 uppercase text-xs">Rtg.</th>
                      <th className="py-4 px-3 text-center text-gray-400 uppercase text-xs">Rtg +/-</th>
                      <th className="py-4 px-3 text-center text-gray-400 uppercase text-xs">Post Rtg.</th>
                      <th className="py-4 px-3 text-center text-gray-400 uppercase text-xs">Horse Wt. (lb)</th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleRows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-white/5 hover:bg-white/5 transition-all"
                      >
                        <td className="py-5 px-3">
                          <div className="w-11 h-11 rounded-xl bg-[#d4af37] flex items-center justify-center text-white font-black shadow-lg shadow-[#d4af37]/20">
                            {row.no}
                          </div>
                        </td>

                        <td className="py-5 px-3">
                          <div className="font-mono text-sm text-gray-400">
                            {row.form}
                          </div>
                        </td>

                        <td className="py-5 px-3">
                          <div className="inline-flex px-3 py-2 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#f6d77a] text-sm font-bold">
                            {row.colour}
                          </div>
                        </td>

                        <td className="py-5 px-3">
                          <div className="font-black text-white text-lg">
                            {row.horse}
                          </div>

                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <Shield className="w-3 h-3" />
                            {row.breed} • Age {row.age}
                          </div>
                        </td>

                        <td className="py-5 px-3 text-center text-white font-semibold">
                          {formatWeightLb(row.assignedWeightLb)}
                        </td>

                        <td className="py-5 px-3 text-gray-300 font-semibold">
                          {row.jockey}
                        </td>

                        <td className="py-5 px-3 text-center text-white font-semibold">
                          {formatWeightLb(row.jockeyWeightLb)}
                        </td>

                        <td className="py-5 px-3 text-center">
                          <div className="inline-flex w-10 h-10 rounded-lg bg-[#12304f] items-center justify-center text-white font-bold border border-white/10">
                            {row.draw}
                          </div>
                        </td>

                        {showResultColumns && (
                          <>
                            <td className="py-5 px-3 text-center">
                              <div
                                className={`inline-flex min-w-10 h-10 px-3 rounded-lg items-center justify-center font-black border ${
                                  row.finishPosition === 1
                                    ? 'bg-[#d4af37] text-[#071a2f] border-[#d4af37]'
                                    : 'bg-[#12304f] text-white border-white/10'
                                }`}
                              >
                                {row.finishPosition || '-'}
                              </div>
                            </td>

                            <td className="py-5 px-3 text-center text-white font-mono font-bold">
                              {row.finishTime}
                            </td>
                          </>
                        )}

                        <td className="py-5 px-3 text-gray-300">
                          {row.owner}
                        </td>

                        <td className="py-5 px-3 text-center text-white font-semibold">
                          {row.rating}
                        </td>

                        <td
                          className={`py-5 px-3 text-center font-bold ${
                            row.ratingChange > 0
                              ? 'text-green-500'
                              : row.ratingChange < 0
                                ? 'text-red-500'
                                : 'text-gray-400'
                          }`}
                        >
                          {row.ratingChangeLabel}
                        </td>

                        <td className="py-5 px-3 text-center text-white font-semibold">
                          {row.postRaceRating}
                        </td>

                        <td className="py-5 px-3 text-center text-white">
                          {formatWeightLb(row.horseWeightLb)}
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
