import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bell, CalendarClock } from 'lucide-react';
import {
  RaceBuilderReferee,
  RaceRecord,
  TournamentRecord,
  createRace,
  getRaceBuilder,
} from '../services/api';
import { messageToneClasses } from '../utils/messageTone';

interface CreateRacePageProps {
  onNavigate: (page: string) => void;
}

export default function CreateRacePage({ onNavigate }: CreateRacePageProps) {
  const fieldClass =
    'min-h-[54px] w-full bg-[#071a2f] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 outline-none focus:border-[#d4af37]/70 focus:ring-2 focus:ring-[#d4af37]/20';

  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [races, setRaces] = useState<RaceRecord[]>([]);
  const [referees, setReferees] = useState<RaceBuilderReferee[]>([]);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    tournamentId: '',
    raceNumber: '',
    raceName: '',
    raceDate: '',
    startTime: '',
    venue: '',
    distance: '1400',
    surfaceType: 'Turf',
    raceClass: 'Open',
    handicapMin: '0',
    handicapMax: '10',
    refereeUserId: '',
    registrationOpenTime: '',
    registrationCloseTime: '',
    registrationPeriodMinutes: '',
  });

  const selectedTournament = useMemo(
    () => tournaments.find((tournament) => tournament.id === form.tournamentId),
    [form.tournamentId, tournaments]
  );

  const getNextRaceNumber = (tournamentId: string) => {
    const usedNumbers = races
      .filter((race) => race.tournamentId === tournamentId)
      .map((race) => Number(String(race.raceNumber || '').replace(/^R/i, '')))
      .filter((number) => Number.isFinite(number));

    const nextNumber = usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : 1;

    return `R${nextNumber}`;
  };

  useEffect(() => {
    getRaceBuilder()
      .then((data) => {
        setTournaments(data.tournaments);
        setRaces(data.races || []);
        setReferees(data.referees);

        const firstTournament = data.tournaments[0];
        const existingRaces = data.races || [];
        const usedNumbers = firstTournament
          ? existingRaces
              .filter((race) => race.tournamentId === firstTournament.id)
              .map((race) => Number(String(race.raceNumber || '').replace(/^R/i, '')))
              .filter((number) => Number.isFinite(number))
          : [];
        const nextRaceNumber = firstTournament
          ? `R${usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : 1}`
          : '';

        setForm((current) => ({
          ...current,
          tournamentId: firstTournament?.id || '',
          raceNumber: current.raceNumber || nextRaceNumber,
          venue: current.venue || firstTournament?.location || '',
          refereeUserId: data.referees[0]?.id || '',
        }));
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to load race builder')
      );
  }, []);

  const handleSubmit = () => {
    setMessage('');

    if (
      !form.tournamentId ||
      !form.raceName ||
      !form.raceDate ||
      !form.startTime ||
      !form.venue ||
      !form.distance ||
      !form.refereeUserId ||
      !form.registrationPeriodMinutes ||
      Number(form.registrationPeriodMinutes) <= 0
    ) {
      setMessage('Please create/select tournament first, then complete race name, date, start time, venue, distance, registration minutes and referee.');
      return;
    }

    setIsSubmitting(true);

    createRace({
      tournamentId: form.tournamentId,
      raceNumber: form.raceNumber,
      name: form.raceName,
      date: form.raceDate,
      time: form.startTime,
      venue: form.venue,
      distance: form.distance,
      surface: form.surfaceType,
      raceClass: form.raceClass,
      handicapMin: form.handicapMin,
      handicapMax: form.handicapMax,
      refereeUserId: form.refereeUserId,
      registrationPeriodMinutes: form.registrationPeriodMinutes,
      registrationOpenTime: form.registrationOpenTime,
      registrationCloseTime: form.registrationCloseTime,
    })
      .then(() => {
        setMessage('Race created. Registration is open for Owners/Jockeys.');
        setTimeout(() => onNavigate('admin'), 900);
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to create race')
      )
      .finally(() => setIsSubmitting(false));
  };

  const handleTournamentChange = (tournamentId: string) => {
    const tournament = tournaments.find((item) => item.id === tournamentId);
    const nextRaceNumber = getNextRaceNumber(tournamentId);

    setForm((current) => ({
      ...current,
      tournamentId,
      raceNumber: nextRaceNumber,
      venue: tournament?.location || current.venue,
    }));
  };

  return (
    <div className="min-h-screen bg-[#071a2f] py-10 px-6">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => onNavigate('admin')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <div className="bg-[#12304f] border border-white/10 rounded-3xl p-8">
          <div className="mb-8">
            <div>
              <h1 className="text-4xl font-black text-white">
                Create Race
              </h1>

              <p className="text-gray-400 mt-2">
                Step 1: create a tournament. Step 2: create R1, R2, R3, R4 inside that tournament.
              </p>
            </div>
          </div>

          {message && (
            <div className={`mb-6 rounded-xl border px-4 py-3 font-semibold ${messageToneClasses(message)}`}>
              {message}
            </div>
          )}

          {tournaments.length === 0 ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
              <h2 className="text-2xl font-black text-white mb-2">
                Create Tournament First
              </h2>

              <p className="text-amber-200/90 mb-5">
                Chưa có tournament mở đăng ký. Hãy quay lại Admin Panel và tạo tournament trước, sau đó mới tạo race R1, R2, R3, R4.
              </p>

              <button
                onClick={() => onNavigate('admin')}
                className="px-5 py-3 rounded-xl bg-[#d4af37] text-white font-bold hover:bg-[#b8892d]"
              >
                Back to Admin Panel
              </button>
            </div>
          ) : (
          <div className="grid lg:grid-cols-[minmax(0,1fr),360px] gap-8">
            <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Tournament</label>
                <select
                  className={fieldClass}
                  value={form.tournamentId}
                  onChange={(event) => handleTournamentChange(event.target.value)}
                >
                  {tournaments.map((tournament) => (
                    <option key={tournament.id} value={tournament.id}>
                      {tournament.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Race Number</label>
                <input
                  placeholder={form.tournamentId ? getNextRaceNumber(form.tournamentId) : 'R1'}
                  className={fieldClass}
                  value={form.raceNumber}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      raceNumber: event.target.value,
                    })
                  }
                />
              </div>

              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Race Name</label>
                <input
                  placeholder={`${selectedTournament?.name || 'Tournament'} ${form.raceNumber || 'R1'}`}
                  className={fieldClass}
                  value={form.raceName}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      raceName: event.target.value,
                    })
                  }
                />
              </div>

              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Registration Minutes</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Enter minutes"
                  className={fieldClass}
                  value={form.registrationPeriodMinutes}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      registrationPeriodMinutes: event.target.value,
                    })
                  }
                />
              </div>

              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Registration Open Time</label>
                <input
                  type="datetime-local"
                  className={fieldClass}
                  value={form.registrationOpenTime}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      registrationOpenTime: event.target.value,
                    })
                  }
                />
              </div>

              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Registration Close Time</label>
                <input
                  type="datetime-local"
                  className={fieldClass}
                  value={form.registrationCloseTime}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      registrationCloseTime: event.target.value,
                    })
                  }
                />
              </div>

              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Race Date</label>
                <input
                  type="date"
                  className={fieldClass}
                  value={form.raceDate}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      raceDate: event.target.value,
                    })
                  }
                />
              </div>

              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Start Time</label>
                <input
                  type="time"
                  className={fieldClass}
                  value={form.startTime}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      startTime: event.target.value,
                    })
                  }
                />
              </div>

              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Venue</label>
                <input
                  placeholder="Churchill Downs"
                  className={fieldClass}
                  value={form.venue}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      venue: event.target.value,
                    })
                  }
                />
              </div>

              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Distance (m)</label>
                <input
                  type="number"
                  min="1"
                  className={fieldClass}
                  value={form.distance}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      distance: event.target.value,
                    })
                  }
                />
              </div>

              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Surface</label>
                <select
                  className={fieldClass}
                  value={form.surfaceType}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      surfaceType: event.target.value,
                    })
                  }
                >
                  <option>Turf</option>
                  <option>Dirt</option>
                  <option>Synthetic</option>
                </select>
              </div>

              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Race Class</label>
                <input
                  placeholder="Open"
                  className={fieldClass}
                  value={form.raceClass}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      raceClass: event.target.value,
                    })
                  }
                />
              </div>

              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Handicap Min</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  className={fieldClass}
                  value={form.handicapMin}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      handicapMin: event.target.value,
                    })
                  }
                />
              </div>

              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Handicap Max</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  className={fieldClass}
                  value={form.handicapMax}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      handicapMax: event.target.value,
                    })
                  }
                />
              </div>

              <div className="min-w-0">
                <label className="block text-gray-300 mb-2">Assigned Referee</label>
                <select
                  className={fieldClass}
                  value={form.refereeUserId}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      refereeUserId: event.target.value,
                    })
                  }
                >
                  {referees.map((referee) => (
                    <option key={referee.id} value={referee.id}>
                      {referee.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-[#0b223d] p-6 sticky top-24">
                <div className="flex items-center gap-3 mb-4">
                  <Bell className="w-6 h-6 text-[#d4af37]" />

                  <h2 className="text-2xl font-black text-white">
                    Open Registration
                  </h2>
                </div>

                <p className="text-gray-400 mb-5">
                  Owner horse registration is tournament-wide; jockey approvals and race publication prepare the full race schedule.
                </p>

                <div className="space-y-3 text-sm text-gray-300 mb-6">
                  <div className="flex justify-between gap-3">
                    <span>Initial status</span>
                    <span className="text-white font-bold">Registration Open</span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span>Entry approval</span>
                    <span className="text-white font-bold">Admin</span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span>Gate + handicap</span>
                    <span className="text-white font-bold">System</span>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || tournaments.length === 0}
                  className="w-full px-8 py-4 bg-[#d4af37] hover:bg-[#b8892d] disabled:opacity-60 rounded-2xl text-white font-bold transition-all"
                >
                  <CalendarClock className="inline-block w-5 h-5 mr-2" />
                  {isSubmitting ? 'Creating Race...' : 'Create Race'}
                </button>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
