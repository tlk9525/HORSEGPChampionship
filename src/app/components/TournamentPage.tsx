import {
  Trophy,
  Calendar,
  MapPin,
  DollarSign,
  Users,
  Clock,
} from 'lucide-react';
import {
  currentTournament,
  raceSchedule,
  tournamentHorses,
  statusLabel,
} from '../data/tournamentWorkflow';

interface TournamentPageProps {
  onNavigate: (page: string) => void;
}

export default function TournamentPage({
  onNavigate,
}: TournamentPageProps) {
  const tournaments = [
    {
      id: currentTournament.id,
      name: currentTournament.name,
      status: currentTournament.status,
      startDate: currentTournament.startDate,
      endDate: currentTournament.finalDate,
      location: currentTournament.location,
      prizePool: currentTournament.prizePool,
      participants: tournamentHorses.length,
      rounds: 6,
      image: currentTournament.image,
    },
    {
      id: 2,
      name: 'Elite Cup Grand Prix',
      status: 'upcoming',
      startDate: 'June 10, 2026',
      endDate: 'July 25, 2026',
      location: 'Churchill Downs',
      prizePool: '$750,000',
      participants: 32,
      rounds: 6,
      image:
        'https://images.unsplash.com/photo-1526094633853-031707a44819?w=1200',
    },
    {
      id: 3,
      name: 'Summer Derby Classic',
      status: 'upcoming',
      startDate: 'July 5, 2026',
      endDate: 'August 20, 2026',
      location: 'Ascot Racecourse',
      prizePool: '$1,000,000',
      participants: 64,
      rounds: 10,
      image:
        'https://images.unsplash.com/flagged/photo-1569319388901-605a6d2d1299?w=1200',
    },
    {
      id: 4,
      name: 'Regional Qualifier Series',
      status: 'registration',
      startDate: 'August 1, 2026',
      endDate: 'September 15, 2026',
      location: 'Belmont Park',
      prizePool: '$350,000',
      participants: 28,
      rounds: 5,
      image:
        'https://images.unsplash.com/photo-1495543377553-b2aba1f925d7?w=1200',
    },
  ];

  const upcomingRaces = raceSchedule.map((race) => ({
    round: `${currentTournament.round} • ${statusLabel(race.status)}`,
    date: race.date,
    time: race.time,
    venue: race.venue,
  }));

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Tournaments
          </h1>

          <p className="text-gray-400 text-lg">
            Explore and manage all racing tournaments
          </p>
        </div>

        {/* Tournament Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-14">

          {tournaments.map((tournament) => (
            <div
              key={tournament.id}
              className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden hover:border-[#e10600]/50 transition-all duration-300 group"
            >

              {/* Image */}
              <div className="relative h-60 overflow-hidden">

                <img
                  src={tournament.image}
                  alt={tournament.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/40 to-transparent" />

                {/* Status */}
                <div className="absolute top-5 right-5">

                  {tournament.status === 'live' && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-[#e10600] rounded-lg shadow-lg">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />

                      <span className="text-white text-xs font-bold uppercase">
                        Live
                      </span>
                    </div>
                  )}

                  {tournament.status === 'upcoming' && (
                    <div className="px-4 py-2 bg-blue-600 rounded-lg shadow-lg">
                      <span className="text-white text-xs font-bold uppercase">
                        Upcoming
                      </span>
                    </div>
                  )}

                  {tournament.status === 'registration' && (
                    <div className="px-4 py-2 bg-green-600 rounded-lg shadow-lg">
                      <span className="text-white text-xs font-bold uppercase">
                        Open
                      </span>
                    </div>
                  )}

                  {tournament.status === 'approvals' && (
                    <div className="px-4 py-2 bg-yellow-600 rounded-lg shadow-lg">
                      <span className="text-white text-xs font-bold uppercase">
                        Approvals
                      </span>
                    </div>
                  )}

                </div>

                {/* Overlay title */}
                <div className="absolute bottom-6 left-6">
                  <h2 className="text-3xl font-bold text-white">
                    {tournament.name}
                  </h2>
                </div>

              </div>

              {/* Content */}
              <div className="p-7">

                <div className="grid grid-cols-2 gap-5 mb-8">

                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-[#e10600] mt-1" />

                    <div>
                      <p className="text-gray-500 text-xs uppercase">
                        Start Date
                      </p>

                      <p className="text-white font-semibold mt-1">
                        {tournament.startDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[#e10600] mt-1" />

                    <div>
                      <p className="text-gray-500 text-xs uppercase">
                        Location
                      </p>

                      <p className="text-white font-semibold mt-1">
                        {tournament.location}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-[#e10600] mt-1" />

                    <div>
                      <p className="text-gray-500 text-xs uppercase">
                        Prize Pool
                      </p>

                      <p className="text-[#e10600] font-bold mt-1">
                        {tournament.prizePool}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-[#e10600] mt-1" />

                    <div>
                      <p className="text-gray-500 text-xs uppercase">
                        Participants
                      </p>

                      <p className="text-white font-semibold mt-1">
                        {tournament.participants}
                      </p>
                    </div>
                  </div>

                </div>

                {/* Button */}
                <button
                  onClick={() => onNavigate('tournament-details')}
                  className="w-full py-4 bg-[#e10600] hover:bg-[#c00500] text-white rounded-xl transition-all duration-300 font-bold text-lg"
                >
                  View Tournament
                </button>

              </div>
            </div>
          ))}

        </div>

        {/* Bottom */}
        <div className="grid lg:grid-cols-3 gap-8">

          {/* Schedule */}
          <div className="lg:col-span-2 bg-[#1a1a1a] border border-white/10 rounded-2xl p-8">

            <div className="flex items-center justify-between mb-8">

              <h2 className="text-3xl font-bold text-white">
                Race Schedule
              </h2>

              <button className="text-[#e10600] hover:text-[#ff2a2a] font-semibold">
                View Calendar
              </button>

            </div>

            <div className="space-y-5">

              {upcomingRaces.map((race, index) => (
                <div
                  key={index}
                  className="bg-[#0a0a0a] border border-white/10 rounded-xl p-5 hover:border-[#e10600]/50 transition-all"
                >

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-5">

                      <div className="w-14 h-14 bg-[#e10600]/10 rounded-xl flex items-center justify-center">
                        <Trophy className="w-7 h-7 text-[#e10600]" />
                      </div>

                      <div>
                        <h3 className="text-white font-bold text-xl">
                          {race.round}
                        </h3>

                        <div className="flex items-center gap-2 text-gray-400 text-sm mt-2">
                          <MapPin className="w-4 h-4" />
                          {race.venue}
                        </div>
                      </div>

                    </div>

                    <div className="text-right">

                      <div className="text-white font-semibold text-lg">
                        {race.date}
                      </div>

                      <div className="text-gray-400 text-sm flex items-center justify-end gap-2 mt-2">
                        <Clock className="w-4 h-4" />
                        {race.time}
                      </div>

                    </div>

                  </div>
                </div>
              ))}

            </div>
          </div>

          {/* Stats */}
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8">

            <h2 className="text-3xl font-bold text-white mb-8">
              Tournament Stats
            </h2>

            <div className="space-y-8">

              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400">
                    Active Tournaments
                  </span>

                  <span className="text-white font-bold text-2xl">
                    12
                  </span>
                </div>

                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#e10600] w-3/4 rounded-full" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400">
                    Total Prize Money
                  </span>

                  <span className="text-[#e10600] font-bold text-2xl">
                    $5.2M
                  </span>
                </div>

                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#e10600] to-[#ff4500] w-full rounded-full" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400">
                    Registered Teams
                  </span>

                  <span className="text-white font-bold text-2xl">
                    248
                  </span>
                </div>

                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#e10600] w-4/5 rounded-full" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400">
                    Completed Races
                  </span>

                  <span className="text-white font-bold text-2xl">
                    156
                  </span>
                </div>

                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#e10600] w-2/3 rounded-full" />
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
