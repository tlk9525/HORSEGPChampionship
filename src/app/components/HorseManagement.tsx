import { useEffect, useState } from 'react';
import { Award, Send, User } from 'lucide-react';
import NotificationsPanel from './NotificationsPanel';
import {
  HorseRecord,
  JockeyInvitation,
  JockeyProfileRecord,
  getOwnerPortal,
  sendJockeyRequest,
} from '../services/api';
import { currentTournament, statusLabel } from '../data/tournamentWorkflow';

interface HorseManagementProps {
  onNavigate: (page: string) => void;
}

export default function HorseManagement({ onNavigate }: HorseManagementProps) {
  const [horses, setHorses] = useState<HorseRecord[]>([]);
  const [jockeyProfiles, setJockeyProfiles] = useState<JockeyProfileRecord[]>([]);
  const [invitations, setInvitations] = useState<JockeyInvitation[]>([]);
  const [selectedHorseId, setSelectedHorseId] = useState('');
  const [selectedJockeyId, setSelectedJockeyId] = useState('');
  const [message, setMessage] = useState('');

  const loadPortal = () => {
    getOwnerPortal()
      .then((data) => {
        setHorses(data.horses);
        setJockeyProfiles(data.jockeyProfiles);
        setInvitations(data.invitations);
        setSelectedHorseId(data.horses[0]?.id || '');
        setSelectedJockeyId(data.jockeyProfiles[0]?.userId || '');
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to load owner portal')
      );
  };

  useEffect(() => {
    loadPortal();
  }, []);

  const submitRequest = () => {
    if (!selectedHorseId || !selectedJockeyId) {
      setMessage('Please select both horse and jockey.');
      return;
    }

    sendJockeyRequest(selectedHorseId, selectedJockeyId)
      .then(() => {
        setMessage('Request sent to jockey. Notification has been created.');
        loadPortal();
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to send request')
      );
  };

  const jockeyName = (userId: string | null) =>
    jockeyProfiles.find((profile) => profile.userId === userId)?.jockeyName ||
    'Not selected';

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">

        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-2">
            Owner Portal
          </h1>

          <p className="text-gray-400">
            Select an approved horse, choose a published jockey profile, then send a riding request for {currentTournament.name}.
          </p>
        </div>

        <NotificationsPanel />

        {message && (
          <div className="mb-8 rounded-2xl border border-[#e10600]/30 bg-[#e10600]/10 p-4 text-[#ff6b66] font-semibold">
            {message}
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr,420px] gap-8">
          <div className="space-y-8">
            <div className="bg-[#141414] border border-white/10 rounded-2xl p-6">
              <h2 className="text-2xl font-black text-white mb-6">
                My Horses
              </h2>

              <div className="grid xl:grid-cols-2 gap-5">
                {horses.map((horse) => (
                  <button
                    key={horse.id}
                    onClick={() => setSelectedHorseId(horse.id)}
                    className={`text-left rounded-2xl border p-5 transition-all ${
                      selectedHorseId === horse.id
                        ? 'border-[#e10600] bg-[#e10600]/10'
                        : 'border-white/10 bg-[#0a0a0a] hover:border-[#e10600]/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold text-white">
                          {horse.name}
                        </h3>

                        <p className="text-gray-400 mt-2">
                          {horse.breed} • {horse.age} years old
                        </p>
                      </div>

                      <span className="px-3 py-1 rounded-xl bg-[#e10600]/10 text-[#e10600] border border-[#e10600]/30 text-sm font-bold">
                        {statusLabel(horse.status)}
                      </span>
                    </div>

                    <div className="mt-5 space-y-3 border-t border-white/10 pt-4">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-gray-400">
                          <Award className="w-4 h-4" />
                          Selected Jockey
                        </span>

                        <span className="text-white font-semibold">
                          {jockeyName(horse.selectedJockeyUserId)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">
                          Jockey Response
                        </span>

                        <span className="text-white font-semibold">
                          {statusLabel(horse.jockeyConfirmation)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#141414] border border-white/10 rounded-2xl p-6">
              <h2 className="text-2xl font-black text-white mb-6">
                Published Jockey Profiles
              </h2>

              <div className="grid xl:grid-cols-2 gap-5">
                {jockeyProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => setSelectedJockeyId(profile.userId)}
                    className={`text-left rounded-2xl border p-5 transition-all ${
                      selectedJockeyId === profile.userId
                        ? 'border-[#e10600] bg-[#e10600]/10'
                        : 'border-white/10 bg-[#0a0a0a] hover:border-[#e10600]/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold text-white">
                          {profile.jockeyName}
                        </h3>

                        <p className="text-gray-400 mt-2">
                          {profile.competitionLevel} • {profile.weight}kg
                        </p>
                      </div>

                      <User className="w-6 h-6 text-[#e10600]" />
                    </div>

                    <p className="text-gray-400 mt-4">
                      {profile.bio}
                    </p>

                    <div className="mt-4 rounded-xl bg-black/40 border border-white/10 p-3 text-sm text-gray-300">
                      {profile.certificate}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 sticky top-24">
              <h2 className="text-2xl font-black text-white mb-5">
                Send Riding Request
              </h2>

              <div className="space-y-4">
                <select
                  value={selectedHorseId}
                  onChange={(event) => setSelectedHorseId(event.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white"
                >
                  {horses.map((horse) => (
                    <option key={horse.id} value={horse.id}>
                      {horse.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedJockeyId}
                  onChange={(event) => setSelectedJockeyId(event.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white"
                >
                  {jockeyProfiles.map((profile) => (
                    <option key={profile.id} value={profile.userId}>
                      {profile.jockeyName}
                    </option>
                  ))}
                </select>

                <button
                  onClick={submitRequest}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-[#e10600] hover:bg-[#c00500] text-white font-bold transition-all"
                >
                  <Send className="w-5 h-5" />
                  Send Request
                </button>
              </div>
            </div>

            <div className="bg-[#141414] border border-white/10 rounded-2xl p-6">
              <h2 className="text-2xl font-black text-white mb-5">
                Request History
              </h2>

              <div className="space-y-3">
                {invitations.length === 0 && (
                  <div className="text-gray-500 bg-[#0a0a0a] border border-white/10 rounded-xl p-4">
                    No requests sent yet.
                  </div>
                )}

                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4"
                  >
                    <div className="text-white font-bold">
                      {horses.find((horse) => horse.id === invitation.horseId)?.name || 'Horse'}
                    </div>

                    <div className="text-gray-400 text-sm mt-1">
                      To: {jockeyName(invitation.jockeyUserId)}
                    </div>

                    <div className="text-[#e10600] font-bold mt-2">
                      {statusLabel(invitation.status)}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => onNavigate('horse-details')}
                className="w-full mt-5 py-3 rounded-xl bg-white/10 text-white hover:bg-white/15 transition-all font-semibold"
              >
                View Horse Details
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
