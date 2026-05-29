import {
  ArrowLeft,
  Trophy,
} from 'lucide-react';
import { currentTournament } from '../data/tournamentWorkflow';

interface RegisterHorsePageProps {
  onNavigate: (page: string) => void;
}

export default function RegisterHorsePage({
  onNavigate,
}: RegisterHorsePageProps) {

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
                Horse Owner Registration
              </p>

              <h1 className="text-4xl font-black text-white mt-2">
                Register New Horse
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
                className="w-full h-12 px-4 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#e10600]"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">
                Breed
              </label>

              <input
                type="text"
                placeholder="Thoroughbred"
                className="w-full h-12 px-4 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#e10600]"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">
                Age
              </label>

              <input
                type="number"
                placeholder="4"
                className="w-full h-12 px-4 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#e10600]"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">
                Owner
              </label>

              <input
                type="text"
                placeholder="Sterling Stables"
                className="w-full h-12 px-4 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#e10600]"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">
                Preferred Jockey
              </label>

              <input
                type="text"
                placeholder="Marcus Sterling"
                className="w-full h-12 px-4 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#e10600]"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">
                Veterinary Certificate URL
              </label>

              <input
                type="text"
                placeholder="https://..."
                className="w-full h-12 px-4 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#e10600]"
              />
            </div>

          </div>

          {/* BUTTONS */}
          <div className="flex items-center justify-end gap-4 mt-10">

            <button
              onClick={() => onNavigate('horses')}
              className="px-6 py-3 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition-all"
            >
              Cancel
            </button>

            <button
              onClick={() => {
                alert('Horse registration submitted. Status: pending admin approval.');
                onNavigate('horses');
              }}
              className="px-6 py-3 rounded-xl bg-[#e10600] hover:bg-[#c00500] text-white font-semibold transition-all"
            >
              Submit for Approval
            </button>

          </div>

        </div>

      </div>
    </div>
  );
}
