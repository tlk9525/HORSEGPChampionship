import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Mail,
  Scale,
  Search,
  ShieldCheck,
  Trophy,
  UserRound,
} from 'lucide-react';
import {
  JockeyProfileRecord,
  RaceEntryRecord,
  getBootstrap,
} from '../services/api';
import { statusLabel } from '../utils/domain';

const formatWeightLb = (weightLb?: number) => {
  const parsed = Number(weightLb || 0);
  return parsed > 0 ? `${parsed.toFixed(0)}lb` : '-';
};

export default function JockeyDirectoryPage() {
  const [jockeys, setJockeys] = useState<JockeyProfileRecord[]>([]);
  const [raceEntries, setRaceEntries] = useState<RaceEntryRecord[]>([]);
  const [selectedJockeyId, setSelectedJockeyId] = useState('');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [jockeyListExpanded, setJockeyListExpanded] = useState(false);
  const [assignmentsExpanded, setAssignmentsExpanded] = useState(false);

  useEffect(() => {
    getBootstrap()
      .then((data) => {
        setJockeys(data.jockeyProfiles || []);
        setRaceEntries(data.raceEntries || []);
        setSelectedJockeyId(data.jockeyProfiles[0]?.userId || '');
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to load jockey profiles')
      );
  }, []);

  const filteredJockeys = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return jockeys;

    return jockeys.filter((jockey) =>
      [
        jockey.jockeyName,
        jockey.jockeyEmail,
        jockey.competitionLevel,
        jockey.certificate,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    );
  }, [jockeys, query]);

  useEffect(() => {
    setJockeyListExpanded(false);
  }, [query]);

  const visibleJockeys = jockeyListExpanded
    ? filteredJockeys
    : filteredJockeys.slice(0, 8);

  const selectedJockey =
    jockeys.find((jockey) => jockey.userId === selectedJockeyId) ||
    filteredJockeys[0] ||
    jockeys[0];

  const selectedAssignments = selectedJockey
    ? raceEntries.filter((entry) => entry.jockeyUserId === selectedJockey.userId)
    : [];

  const visibleAssignments = assignmentsExpanded
    ? selectedAssignments
    : selectedAssignments.slice(0, 4);

  return (
    <div className="min-h-screen bg-[#071a2f] pt-24 pb-12">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-[#d4af37] uppercase tracking-[0.22em] text-sm font-bold mb-3">
            Public Directory
          </p>

          <h1 className="text-4xl md:text-5xl font-black text-white">
            Jockey Profiles
          </h1>

          <p className="text-gray-400 text-lg mt-3">
            All roles can review published jockey information, licenses, competition level and race assignments.
          </p>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300 font-semibold">
            {message}
          </div>
        )}

        <div className="grid lg:grid-cols-[420px,1fr] gap-8">
          <div className="bg-[#102a46] border border-white/10 rounded-2xl p-6">
            <div className="relative mb-5">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search jockey name, license, level"
                className="w-full rounded-xl border border-white/10 bg-[#071a2f] py-3 pl-12 pr-4 text-white outline-none focus:border-[#d4af37]"
              />
            </div>

            <div className="mb-3 flex items-center justify-between gap-3 text-sm text-gray-400">
              <span>
                Showing {visibleJockeys.length}/{filteredJockeys.length} profiles
              </span>
            </div>

            <div className="space-y-3">
              {filteredJockeys.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-[#071a2f] p-4 text-gray-500">
                  No published jockey profiles found.
                </div>
              )}

              {visibleJockeys.map((jockey) => (
                <button
                  key={jockey.id}
                  onClick={() => {
                    setSelectedJockeyId(jockey.userId);
                    setAssignmentsExpanded(false);
                  }}
                  className={`w-full rounded-xl border p-4 text-left transition-all ${
                    selectedJockey?.userId === jockey.userId
                      ? 'border-[#d4af37]/60 bg-[#d4af37]/10'
                      : 'border-white/10 bg-[#071a2f] hover:border-white/25'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10">
                      <UserRound className="h-6 w-6 text-white" />
                    </div>

                    <div className="min-w-0">
                      <div className="text-white font-bold">
                        {jockey.jockeyName}
                      </div>

                      <div className="mt-1 text-sm text-gray-400">
                        {jockey.competitionLevel || 'Competition level pending'}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {filteredJockeys.length > 8 && (
              <button
                onClick={() => setJockeyListExpanded((current) => !current)}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-3 text-[#d4af37] font-bold hover:bg-[#d4af37]/20 transition-all"
              >
                {jockeyListExpanded ? 'Show Less' : `View All ${filteredJockeys.length}`}
                {jockeyListExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            )}
          </div>

          <div className="bg-[#102a46] border border-white/10 rounded-2xl p-8">
            {selectedJockey ? (
              <>
                <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6 mb-8">
                  <div className="flex items-start gap-5">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#d4af37]/15 border border-[#d4af37]/30">
                      <UserRound className="h-10 w-10 text-[#f6d77a]" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h2 className="text-4xl font-black text-white">
                          {selectedJockey.jockeyName}
                        </h2>

                        <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-bold text-emerald-300">
                          <BadgeCheck className="h-4 w-4" />
                          Published
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-4 text-gray-400">
                        {selectedJockey.jockeyEmail && (
                          <span className="inline-flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {selectedJockey.jockeyEmail}
                          </span>
                        )}

                        <span className="inline-flex items-center gap-2">
                          <Scale className="h-4 w-4" />
                          {formatWeightLb(selectedJockey.weightLb)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-8">
                  <div className="rounded-xl border border-white/10 bg-[#071a2f] p-5">
                    <ShieldCheck className="h-6 w-6 text-[#d4af37] mb-3" />
                    <div className="text-gray-500 text-sm">Certificate</div>
                    <div className="text-white font-bold mt-1">
                      {selectedJockey.certificate || 'Not provided'}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#071a2f] p-5">
                    <Trophy className="h-6 w-6 text-[#d4af37] mb-3" />
                    <div className="text-gray-500 text-sm">Competition Level</div>
                    <div className="text-white font-bold mt-1">
                      {selectedJockey.competitionLevel || 'Not provided'}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#071a2f] p-5">
                    <Award className="h-6 w-6 text-[#d4af37] mb-3" />
                    <div className="text-gray-500 text-sm">Assignments</div>
                    <div className="text-white font-bold mt-1">
                      {selectedAssignments.length} race entries
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#071a2f] p-6 mb-8">
                  <h3 className="text-2xl font-black text-white mb-3">
                    Bio
                  </h3>

                  <p className="text-gray-400 leading-relaxed">
                    {selectedJockey.bio || 'No biography has been published yet.'}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#071a2f] p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                    <div>
                      <h3 className="text-2xl font-black text-white">
                        Race Assignments
                      </h3>

                      <p className="text-gray-400 text-sm mt-1">
                        Showing {visibleAssignments.length}/{selectedAssignments.length} assignments
                      </p>
                    </div>

                    {selectedAssignments.length > 4 && (
                      <button
                        onClick={() => setAssignmentsExpanded((current) => !current)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-2 text-[#d4af37] font-bold hover:bg-[#d4af37]/20 transition-all"
                      >
                        {assignmentsExpanded ? 'Show Less' : 'View All'}
                        {assignmentsExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {selectedAssignments.length === 0 && (
                      <div className="rounded-xl border border-white/10 bg-[#0b223d] p-4 text-gray-500">
                        No race assignments yet.
                      </div>
                    )}

                    {visibleAssignments.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-xl border border-white/10 bg-[#0b223d] p-4"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div>
                            <div className="text-white font-bold">
                              {entry.horseName}
                            </div>

                            <div className="text-gray-400 text-sm mt-1">
                              {entry.raceName}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-lg border border-white/10 bg-[#071a2f]/30 px-3 py-1 text-sm text-gray-300">
                              {statusLabel(entry.status)}
                            </span>

                            <span className="rounded-lg border border-white/10 bg-[#071a2f]/30 px-3 py-1 text-sm text-gray-300">
                              Gate {entry.lane || 'TBD'}
                            </span>

                            <span className="rounded-lg border border-white/10 bg-[#071a2f]/30 px-3 py-1 text-sm text-gray-300">
                              Rating {entry.ratingSnapshot ?? 'TBD'}
                            </span>

                            <span className="rounded-lg border border-white/10 bg-[#071a2f]/30 px-3 py-1 text-sm text-gray-300">
                              Assigned Wt. {Number(entry.handicap || 0).toFixed(0)}lb
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-white/10 bg-[#071a2f] p-8 text-gray-500">
                Select a jockey profile to view details.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
