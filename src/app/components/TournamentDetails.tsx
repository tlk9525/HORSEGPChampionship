import { Calendar, MapPin, Trophy, Users } from 'lucide-react';
import {
  currentTournament,
  raceSchedule,
  tournamentHorses,
  statusLabel,
} from '../data/tournamentWorkflow';

export default function TournamentDetails() {
  const race = raceSchedule[0];

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">
      <div className="max-w-6xl mx-auto px-4 space-y-8">

        <div className="bg-[#111111] border border-white/10 rounded-2xl p-8">

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
            <div>
              <p className="text-[#e10600] text-sm uppercase tracking-widest">
                Tournament
              </p>

              <h1 className="text-4xl font-black text-white mt-2">
                {currentTournament.name}
              </h1>

              <p className="text-gray-400 mt-3">
                Current phase: {currentTournament.phase}
              </p>
            </div>

            <div className="px-4 py-2 bg-yellow-500/15 border border-yellow-500/30 rounded-xl text-yellow-400 font-bold">
              {statusLabel(currentTournament.status)}
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-5">
            {[
              {
                icon: Calendar,
                label: 'Registration',
                value: currentTournament.registrationWindow,
              },
              {
                icon: MapPin,
                label: 'Location',
                value: currentTournament.location,
              },
              {
                icon: Trophy,
                label: 'Prize Pool',
                value: currentTournament.prizePool,
              },
              {
                icon: Users,
                label: 'Approved Horses',
                value: `${tournamentHorses.filter((horse) => horse.profileStatus === 'approved').length}/${tournamentHorses.length}`,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-[#1a1a1a] rounded-xl p-5 border border-white/10"
              >
                <item.icon className="w-5 h-5 text-[#e10600] mb-3" />

                <p className="text-gray-400 text-sm mb-2">{item.label}</p>

                <h3 className="text-white text-lg font-bold">
                  {item.value}
                </h3>
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">
              Race Schedule & Referee
            </h2>

            <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-white text-xl font-bold">
                    {race.name}
                  </h3>

                  <p className="text-gray-400 mt-2">
                    {race.date} • {race.time} • {race.venue}
                  </p>
                </div>

                <span className="px-3 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm font-bold">
                  {statusLabel(race.status)}
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-5 text-sm">
                <div className="text-gray-400">
                  Referee
                  <div className="text-white font-bold mt-1">{race.referee}</div>
                </div>

                <div className="text-gray-400">
                  Confirmation
                  <div className="text-white font-bold mt-1">
                    Owner {race.ownerConfirmed}/{race.participants} • Jockey {race.jockeyConfirmed}/{race.participants}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">
              Entries
            </h2>

            <div className="space-y-4">
              {tournamentHorses.map((horse) => (
                <div
                  key={horse.id}
                  className="flex items-center justify-between bg-[#0a0a0a] border border-white/10 rounded-xl p-4"
                >
                  <div>
                    <h3 className="text-white font-semibold">
                      {horse.name}
                    </h3>

                    <p className="text-gray-400 text-sm">
                      Owner: {horse.owner} • Jockey: {horse.selectedJockey}
                    </p>
                  </div>

                  <div className="text-right text-sm">
                    <div className="text-[#e10600] font-bold">
                      {statusLabel(horse.profileStatus)}
                    </div>

                    <div className="text-gray-400">
                      Jockey {statusLabel(horse.jockeyStatus)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
