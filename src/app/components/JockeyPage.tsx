import { useEffect, useState } from 'react';
import { CheckCircle, Save, XCircle } from 'lucide-react';
import NotificationsPanel from './NotificationsPanel';
import {
  AuthUser,
  JockeyInvitation,
  JockeyProfileRecord,
  decideJockeyInvitation,
  getJockeyPortal,
  saveJockeyProfile,
} from '../services/api';
import { currentTournament, statusLabel } from '../data/tournamentWorkflow';

interface JockeyPageProps {
  currentUser: AuthUser | null;
  onNavigate: (page: string) => void;
}

export default function JockeyPage({
  currentUser,
  onNavigate,
}: JockeyPageProps) {
  const [profile, setProfile] = useState<JockeyProfileRecord | null>(null);
  const [invitations, setInvitations] = useState<JockeyInvitation[]>([]);
  const [bio, setBio] = useState('');
  const [certificate, setCertificate] = useState('');
  const [competitionLevel, setCompetitionLevel] = useState('');
  const [weight, setWeight] = useState('');
  const [message, setMessage] = useState('');

  const loadPortal = () => {
    getJockeyPortal()
      .then((data) => {
        setProfile(data.profile);
        setInvitations(data.invitations);
        setBio(data.profile?.bio || '');
        setCertificate(data.profile?.certificate || '');
        setCompetitionLevel(data.profile?.competitionLevel || '');
        setWeight(data.profile?.weight ? String(data.profile.weight) : '');
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to load jockey portal')
      );
  };

  useEffect(() => {
    if (currentUser?.role === 'jockey') {
      loadPortal();
    }
  }, [currentUser?.role]);

  const publishProfile = () => {
    saveJockeyProfile({
      bio,
      certificate,
      competitionLevel,
      weight,
    })
      .then(({ profile: updatedProfile }) => {
        setProfile(updatedProfile);
        setMessage('Profile published. Owners can now select you.');
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to publish profile')
      );
  };

  const respond = (id: string, decision: 'accepted' | 'rejected') => {
    decideJockeyInvitation(id, decision)
      .then(() => {
        setMessage(`Invitation ${decision}. Owner has been notified.`);
        loadPortal();
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to respond')
      );
  };

  if (currentUser?.role !== 'jockey') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold text-white mb-4">
            Jockey Profiles
          </h1>

          <p className="text-gray-400 mb-8">
            Owners choose jockeys from published profiles inside the Owner Portal.
          </p>

          <button
            onClick={() => onNavigate('horses')}
            className="px-6 py-3 rounded-xl bg-[#e10600] text-white font-bold hover:bg-[#c00500] transition-all"
          >
            Go to Owner Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4">

        <h1 className="text-4xl font-bold text-white mb-3">
          Jockey Portal
        </h1>

        <p className="text-gray-400 mb-8">
          Publish your jockey profile, certificate and competition level so Horse Owners can send riding requests for {currentTournament.name}.
        </p>

        <NotificationsPanel />

        {message && (
          <div className="mb-8 rounded-2xl border border-[#e10600]/30 bg-[#e10600]/10 p-4 text-[#ff6b66] font-semibold">
            {message}
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr,420px] gap-8">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8">
            <h2 className="text-3xl font-black text-white mb-6">
              My Public Profile
            </h2>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-gray-300 mb-2">Bio</label>

                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  rows={5}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#e10600]"
                  placeholder="Describe your racing experience"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Certificate</label>

                <input
                  value={certificate}
                  onChange={(event) => setCertificate(event.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#e10600]"
                  placeholder="Class A Racing License"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Competition Level</label>

                <input
                  value={competitionLevel}
                  onChange={(event) => setCompetitionLevel(event.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#e10600]"
                  placeholder="Elite / Qualifier / Amateur"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Weight</label>

                <input
                  type="number"
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#e10600]"
                  placeholder="54"
                />
              </div>
            </div>

            <button
              onClick={publishProfile}
              className="mt-6 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#e10600] text-white font-bold hover:bg-[#c00500] transition-all"
            >
              <Save className="w-5 h-5" />
              Publish Profile
            </button>

            <div className="mt-6 rounded-xl bg-[#0a0a0a] border border-white/10 p-4 text-gray-400">
              Current status: <span className="text-white font-bold">{profile?.status || 'No profile'}</span>
            </div>
          </div>

          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8">
            <h2 className="text-3xl font-black text-white mb-6">
              Riding Requests
            </h2>

            <div className="space-y-4">
              {invitations.length === 0 && (
                <div className="rounded-xl bg-[#0a0a0a] border border-white/10 p-4 text-gray-500">
                  No owner requests yet.
                </div>
              )}

              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="rounded-xl bg-[#0a0a0a] border border-white/10 p-4"
                >
                  <div className="text-white font-bold">
                    Horse ID: {invitation.horseId}
                  </div>

                  <div className="text-gray-400 text-sm mt-1">
                    Status: {statusLabel(invitation.status)}
                  </div>

                  {invitation.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button
                        onClick={() => respond(invitation.id, 'accepted')}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition-all"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Accept
                      </button>

                      <button
                        onClick={() => respond(invitation.id, 'rejected')}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all"
                      >
                        <XCircle className="w-5 h-5" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
