import { useState } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { currentTournament } from '../data/tournamentWorkflow';

interface CreateRacePageProps {
  onNavigate: (page: string) => void;
}

export default function CreateRacePage({ onNavigate }: CreateRacePageProps) {
  const fieldClass =
    'w-full bg-[#0a0a0a] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-gray-500 outline-none focus:border-[#e10600]/70 focus:ring-2 focus:ring-[#e10600]/20';

  const [form, setForm] = useState({
    raceNumber: '',
    raceName: '',
    tournament: currentTournament.name,
    round: '',
    raceDate: '',
    startTime: '',
    venue: '',
    distance: '',
    surfaceType: 'Turf',
    horseLimit: '',
    raceClass: '',
    totalPrize: '',
    referee: '',
    ownerConfirmDeadline: '',
    jockeyConfirmDeadline: '',
    predictionOpenTime: '',
    predictionCloseTime: '',
  });

  const handleSubmit = () => {
    if (
      !form.raceName ||
      !form.tournament ||
      !form.raceDate ||
      !form.startTime ||
      !form.referee
    ) {
      alert('Please complete race name, tournament, date, start time and referee.');
      return;
    }

    console.log(form);

    onNavigate('admin');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-10 px-6">

      <div className="max-w-5xl mx-auto">

        <button
          onClick={() => onNavigate('admin')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-8">

          <h1 className="text-4xl font-black text-white mb-8">
            Create Race
          </h1>

          <div className="mb-6 rounded-2xl border border-[#e10600]/30 bg-[#e10600]/10 p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-[#e10600] mt-0.5" />

              <div>
                <div className="text-white font-bold">
                  Race scheduling is the next admin phase.
                </div>

                <p className="text-gray-400 mt-1">
                  Sau khi tạo race, Owner và Jockey phải xác nhận race trước khi Spectator được dự đoán và Referee kiểm tra trước đua.
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">

            <input
              placeholder="Race Number"
              className={fieldClass}
              value={form.raceNumber}
              onChange={(e) =>
                setForm({
                  ...form,
                  raceNumber: e.target.value,
                })
              }
            />

            <input
              placeholder="Race Name"
              className={fieldClass}
              value={form.raceName}
              onChange={(e) =>
                setForm({
                  ...form,
                  raceName: e.target.value,
                })
              }
            />

            <input
              placeholder="Tournament"
              className={fieldClass}
              value={form.tournament}
              onChange={(e) =>
                setForm({
                  ...form,
                  tournament: e.target.value,
                })
              }
            />

            <select
              className={fieldClass}
              value={form.round}
              onChange={(e) =>
                setForm({
                  ...form,
                  round: e.target.value,
                })
              }
            >
              <option value="">
                Select Round
              </option>
              <option>
                Qualifier
              </option>
              <option>
                Semi Final
              </option>
              <option>
                Final
              </option>
            </select>

            <input
              type="date"
              className={fieldClass}
              value={form.raceDate}
              onChange={(e) =>
                setForm({
                  ...form,
                  raceDate: e.target.value,
                })
              }
            />

            <input
              type="time"
              className={fieldClass}
              value={form.startTime}
              onChange={(e) =>
                setForm({
                  ...form,
                  startTime: e.target.value,
                })
              }
            />

            <input
              placeholder="Venue"
              className={fieldClass}
              value={form.venue}
              onChange={(e) =>
                setForm({
                  ...form,
                  venue: e.target.value,
                })
              }
            />

            <input
              type="number"
              placeholder="Distance (m)"
              className={fieldClass}
              value={form.distance}
              onChange={(e) =>
                setForm({
                  ...form,
                  distance: e.target.value,
                })
              }
            />

            <select
              className={fieldClass}
              value={form.surfaceType}
              onChange={(e) =>
                setForm({
                  ...form,
                  surfaceType:
                    e.target.value,
                })
              }
            >
              <option>
                Turf
              </option>
              <option>
                Dirt
              </option>
              <option>
                Synthetic
              </option>
            </select>

            <input
              type="number"
              placeholder="Horse Limit"
              className={fieldClass}
              value={form.horseLimit}
              onChange={(e) =>
                setForm({
                  ...form,
                  horseLimit:
                    e.target.value,
                })
              }
            />

            <input
              placeholder="Race Class"
              className={fieldClass}
              value={form.raceClass}
              onChange={(e) =>
                setForm({
                  ...form,
                  raceClass:
                    e.target.value,
                })
              }
            />

            <input
              type="number"
              placeholder="Total Prize"
              className={fieldClass}
              value={form.totalPrize}
              onChange={(e) =>
                setForm({
                  ...form,
                  totalPrize:
                    e.target.value,
                })
              }
            />

            <input
              placeholder="Assigned Referee"
              className={fieldClass}
              value={form.referee}
              onChange={(e) =>
                setForm({
                  ...form,
                  referee: e.target.value,
                })
              }
            />

            <input
              type="datetime-local"
              aria-label="Owner confirmation deadline"
              className={fieldClass}
              value={form.ownerConfirmDeadline}
              onChange={(e) =>
                setForm({
                  ...form,
                  ownerConfirmDeadline: e.target.value,
                })
              }
            />

            <input
              type="datetime-local"
              aria-label="Jockey confirmation deadline"
              className={fieldClass}
              value={form.jockeyConfirmDeadline}
              onChange={(e) =>
                setForm({
                  ...form,
                  jockeyConfirmDeadline: e.target.value,
                })
              }
            />

            <input
              type="time"
              aria-label="Prediction open time"
              className={fieldClass}
              value={
                form.predictionOpenTime
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  predictionOpenTime:
                    e.target.value,
                })
              }
            />

            <input
              type="time"
              aria-label="Prediction close time"
              className={fieldClass}
              value={
                form.predictionCloseTime
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  predictionCloseTime:
                    e.target.value,
                })
              }
            />

          </div>

          <div className="flex justify-end mt-8">

            <button
              onClick={handleSubmit}
              className="px-8 py-4 bg-[#e10600] rounded-2xl text-white font-bold"
            >
              Create Race
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}
