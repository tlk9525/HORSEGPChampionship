import { ArrowRight, Play, Trophy, Users, Calendar, TrendingUp } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#071a2f]">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1495543377553-b2aba1f925d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920"
            alt="Horse Racing"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#071a2f]/70 via-[#071a2f]/50 to-[#071a2f]"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#d4af37]/20 to-transparent"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-full backdrop-blur-sm">
            <div className="w-2 h-2 bg-[#d4af37] rounded-full animate-pulse"></div>
            <span className="text-[#d4af37] text-sm font-semibold tracking-wider">SEASON 2026 LIVE</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-8xl font-bold text-white mb-6 tracking-tight">
            HORSE RACING
            <br />
            <span className="text-[#d4af37]">TOURNAMENT SYSTEM</span>
          </h1>

          <p className="text-xl sm:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto">
            Manage tournaments, horses, jockeys, race cards and live results.
            <br />
            Experience the future of competitive horse racing.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <button
              onClick={() => onNavigate('tournaments')}
              className="group px-8 py-4 bg-[#d4af37] text-white rounded hover:bg-[#b8892d] transition-all flex items-center gap-2 min-w-[200px] justify-center"
            >
              <Trophy className="w-5 h-5" />
              View Tournaments
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => onNavigate('live-race')}
              className="group px-8 py-4 bg-white/10 text-white rounded hover:bg-white/20 transition-all flex items-center gap-2 min-w-[200px] justify-center backdrop-blur-sm border border-white/20"
            >
              <Play className="w-5 h-5" />
              Open Race Operations
            </button>
          </div>

        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-3 bg-white/50 rounded-full"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gradient-to-b from-[#071a2f] to-[#071a2f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              Premium Racing <span className="text-[#d4af37]">Platform</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Built for the modern era of competitive horse racing with cutting-edge technology
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature Card 1 */}
            <div className="group bg-[#12304f] border border-white/10 rounded-lg p-8 hover:border-[#d4af37]/50 transition-all hover:shadow-lg hover:shadow-[#d4af37]/10">
              <div className="w-14 h-14 bg-[#d4af37]/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-[#d4af37]/20 transition-colors">
                <Trophy className="w-7 h-7 text-[#d4af37]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Tournament Management</h3>
              <p className="text-gray-400">
                Organize and manage multi-stage tournaments with advanced bracket systems and real-time scheduling.
              </p>
            </div>

            {/* Feature Card 2 */}
            <div className="group bg-[#12304f] border border-white/10 rounded-lg p-8 hover:border-[#d4af37]/50 transition-all hover:shadow-lg hover:shadow-[#d4af37]/10">
              <div className="w-14 h-14 bg-[#d4af37]/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-[#d4af37]/20 transition-colors">
                <TrendingUp className="w-7 h-7 text-[#d4af37]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Race Operations Monitoring</h3>
              <p className="text-gray-400">
                Monitor races in real time with advanced telemetry, live positions, and instant result updates.
              </p>
            </div>

            {/* Feature Card 3 */}
            <div className="group bg-[#12304f] border border-white/10 rounded-lg p-8 hover:border-[#d4af37]/50 transition-all hover:shadow-lg hover:shadow-[#d4af37]/10">
              <div className="w-14 h-14 bg-[#d4af37]/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-[#d4af37]/20 transition-colors">
                <Users className="w-7 h-7 text-[#d4af37]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Jockey & Horse Profiles</h3>
              <p className="text-gray-400">
                Comprehensive statistics, performance history, and career analytics for every competitor.
              </p>
            </div>

            {/* Feature Card 4 */}
            <div className="group bg-[#12304f] border border-white/10 rounded-lg p-8 hover:border-[#d4af37]/50 transition-all hover:shadow-lg hover:shadow-[#d4af37]/10">
              <div className="w-14 h-14 bg-[#d4af37]/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-[#d4af37]/20 transition-colors">
                <Calendar className="w-7 h-7 text-[#d4af37]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Race Calendar</h3>
              <p className="text-gray-400">
                Never miss a race with our comprehensive calendar system and automated notifications.
              </p>
            </div>

            {/* Feature Card 5 */}
            <div className="group bg-[#12304f] border border-white/10 rounded-lg p-8 hover:border-[#d4af37]/50 transition-all hover:shadow-lg hover:shadow-[#d4af37]/10">
              <div className="w-14 h-14 bg-[#d4af37]/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-[#d4af37]/20 transition-colors">
                <TrendingUp className="w-7 h-7 text-[#d4af37]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Race Cards & Standings</h3>
              <p className="text-gray-400">
                Review race cards, line assignments, results, awards, and tournament ranking updates.
              </p>
            </div>

            {/* Feature Card 6 */}
            <div className="group bg-[#12304f] border border-white/10 rounded-lg p-8 hover:border-[#d4af37]/50 transition-all hover:shadow-lg hover:shadow-[#d4af37]/10">
              <div className="w-14 h-14 bg-[#d4af37]/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-[#d4af37]/20 transition-colors">
                <Trophy className="w-7 h-7 text-[#d4af37]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Rankings & Results</h3>
              <p className="text-gray-400">
                Race cards, historical results, and comprehensive performance analytics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-b from-[#071a2f] to-[#071a2f]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Experience the Future?
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            Join thousands of racing enthusiasts on the most advanced tournament platform.
          </p>
          <button
            onClick={() => onNavigate('tournaments')}
            className="group px-10 py-5 bg-[#d4af37] text-white rounded-lg hover:bg-[#b8892d] transition-all text-lg font-semibold flex items-center gap-3 mx-auto"
          >
            Get Started Now
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>
    </div>
  );
}
