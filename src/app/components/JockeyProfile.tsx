import {
  ArrowLeft,
  Trophy,
  Award,
  TrendingUp,
  Activity,
} from 'lucide-react';
import {
  currentTournament,
  raceSchedule,
} from '../data/tournamentWorkflow';

interface JockeyProfileProps {
  onNavigate: (page: string) => void;
}

export default function JockeyProfile({
  onNavigate,
}: JockeyProfileProps) {

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <button
          onClick={() => onNavigate('jockeys')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-all mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Jockeys
        </button>

        <div className="grid lg:grid-cols-[400px,1fr] gap-8">

          <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden">

            <img
              src="https://images.unsplash.com/photo-1507514604110-ba3347c457f6?w=1200"
              alt="Jockey"
              className="w-full h-[550px] object-cover"
            />

          </div>

          <div className="bg-[#141414] border border-white/10 rounded-2xl p-8">

            <div className="flex items-center justify-between mb-6">

              <div>

                <p className="text-[#e10600] uppercase tracking-[0.2em] text-sm font-bold mb-2">
                  Professional Jockey
                </p>

                <h1 className="text-5xl font-black text-white mb-3">
                  Marcus Sterling
                </h1>

              </div>

            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

              <div className="bg-[#0a0a0a] rounded-xl p-5 text-center">

                <Trophy className="w-7 h-7 text-[#e10600] mx-auto mb-3" />

                <div className="text-3xl font-black text-white">
                  308
                </div>

                <div className="text-gray-400 text-sm">
                  Wins
                </div>

              </div>

              <div className="bg-[#0a0a0a] rounded-xl p-5 text-center">

                <Award className="w-7 h-7 text-[#e10600] mx-auto mb-3" />

                <div className="text-3xl font-black text-white">
                  8
                </div>

                <div className="text-gray-400 text-sm">
                  Championships
                </div>

              </div>

              <div className="bg-[#0a0a0a] rounded-xl p-5 text-center">

                <TrendingUp className="w-7 h-7 text-[#e10600] mx-auto mb-3" />

                <div className="text-3xl font-black text-white">
                  68%
                </div>

                <div className="text-gray-400 text-sm">
                  Win Rate
                </div>

              </div>

              <div className="bg-[#0a0a0a] rounded-xl p-5 text-center">

                <Activity className="w-7 h-7 text-[#e10600] mx-auto mb-3" />

                <div className="text-3xl font-black text-white">
                  450
                </div>

                <div className="text-gray-400 text-sm">
                  Total Races
                </div>

              </div>

            </div>

            <div className="mt-8 bg-[#0a0a0a] border border-white/10 rounded-2xl p-6">
              <p className="text-[#e10600] uppercase tracking-[0.2em] text-sm font-bold">
                Pending Jockey Action
              </p>

              <h2 className="text-2xl font-black text-white mt-3">
                Confirm pairing for {currentTournament.name}
              </h2>

              <p className="text-gray-400 mt-2">
                Horse Owner selected this jockey for {raceSchedule[0].name}. The race cannot open predictions until the jockey confirmation is completed.
              </p>

              <div className="flex flex-wrap gap-4 mt-6">
                <button
                  onClick={() => onNavigate('race-details')}
                  className="px-6 py-3 rounded-xl bg-white/10 text-white hover:bg-white/15 transition-all"
                >
                  Review Race Card
                </button>

                <button
                  onClick={() => {
                    alert('Jockey confirmed the pairing and race participation.');
                    onNavigate('jockeys');
                  }}
                  className="px-6 py-3 rounded-xl bg-[#e10600] text-white font-bold hover:bg-[#c00500] transition-all"
                >
                  Confirm Pairing
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
