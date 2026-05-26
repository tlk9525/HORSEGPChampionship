import { Trophy } from 'lucide-react';

interface JockeyPageProps {
  onNavigate: (page: string) => void;
}

export default function JockeyPage({
  onNavigate,
}: JockeyPageProps) {

  const jockeys = [
    {
      id: 1,
      name: 'Marcus Sterling',
      nationality: 'USA',
      age: 32,
      experience: '12 years',
      championships: 8,
      currentHorse: 'Midnight Storm',
      image:
        'https://images.unsplash.com/photo-1507514604110-ba3347c457f6?w=400',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">

      <div className="max-w-7xl mx-auto px-4">

        <h1 className="text-4xl font-bold text-white mb-8">
          Professional Jockeys
        </h1>

        {jockeys.map((jockey, index) => (
          <div
            key={jockey.id}
            className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/10"
          >

            <div className="grid md:grid-cols-[300px,1fr]">

              <img
                src={jockey.image}
                alt={jockey.name}
                className="w-full h-full object-cover"
              />

              <div className="p-6">

                <div className="flex items-center justify-between mb-6">

                  <div>

                    <h2 className="text-3xl font-bold text-white mb-2">
                      {jockey.name}
                    </h2>

                    <p className="text-gray-400">
                      {jockey.nationality} • {jockey.age} years
                    </p>

                  </div>

                  <div className="flex items-center gap-2 px-4 py-2 bg-[#e10600]/10 rounded-xl">

                    <Trophy className="w-4 h-4 text-[#e10600]" />

                    <span className="text-[#e10600] font-bold">
                      #{index + 1}
                    </span>

                  </div>

                </div>

                <div className="bg-[#0a0a0a] rounded-xl p-4 flex items-center justify-between">

                  <div>

                    <p className="text-gray-400 text-sm">
                      Currently Riding
                    </p>

                    <h3 className="text-white text-xl font-bold">
                      {jockey.currentHorse}
                    </h3>

                  </div>

                  <button
                    onClick={() => onNavigate('jockey-profile')}
                    className="px-5 py-3 bg-[#e10600] hover:bg-[#c00500] text-white rounded-xl font-bold transition-all"
                  >
                    View Profile
                  </button>

                </div>

              </div>

            </div>

          </div>
        ))}

      </div>

    </div>
  );
}