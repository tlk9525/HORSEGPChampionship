import { Settings } from 'lucide-react';
import { SystemSettings } from '../../services/api';
import { messageToneClasses } from '../../utils/messageTone';

export type SystemSettingsTab = 'race' | 'approval' | 'notifications' | 'system';

const settingTabLabels: Record<SystemSettingsTab, string> = {
  race: 'Race Rules',
  approval: 'Approvals',
  notifications: 'Notifications',
  system: 'System',
};

interface SystemSettingsModalProps {
  settings: SystemSettings;
  tab: SystemSettingsTab;
  message: string;
  onTabChange: (tab: SystemSettingsTab) => void;
  onSettingChange: <Key extends keyof SystemSettings>(
    key: Key,
    value: SystemSettings[Key]
  ) => void;
  onSave: () => void;
  onClose: () => void;
}

// Manages race rules, approvals, notifications, and system settings.
export default function SystemSettingsModal({
  settings,
  tab,
  message,
  onTabChange,
  onSettingChange,
  onSave,
  onClose,
}: SystemSettingsModalProps) {
  // Renders a numeric setting and converts its input to the expected setting type.
  const renderNumberSetting = (
    label: string,
    description: string,
    key: keyof SystemSettings,
    min = 0
  ) => (
    <label className="block min-h-[118px] rounded-2xl border border-white/10 bg-[#071a2f] p-5">
      <span className="block text-white font-bold">{label}</span>
      <span className="block text-sm text-gray-400 mt-1">{description}</span>
      <input
        type="number"
        min={min}
        value={Number(settings[key])}
        onChange={(event) =>
          onSettingChange(
            key,
            Number(event.target.value) as SystemSettings[typeof key]
          )
        }
        className="mt-4 w-full bg-[#102945] border border-white/10 rounded-xl px-4 py-3 text-white"
      />
    </label>
  );

  // Renders an on/off control for a boolean system setting.
  const renderToggleSetting = (
    label: string,
    description: string,
    key: keyof SystemSettings
  ) => (
    <button
      type="button"
      onClick={() =>
        onSettingChange(key, !settings[key] as SystemSettings[typeof key])
      }
      className="w-full min-h-[96px] flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-[#071a2f] p-5 text-left hover:border-[#d4af37]/50 transition-all"
    >
      <span className="min-w-0">
        <span className="block text-white font-bold">{label}</span>
        <span className="block text-sm text-gray-400 mt-1">{description}</span>
      </span>
      <span
        className={`mt-1 h-7 w-12 shrink-0 rounded-full p-1 transition-all ${
          settings[key] ? 'bg-[#d4af37]' : 'bg-white/15'
        }`}
      >
        <span
          className={`block h-5 w-5 rounded-full bg-white transition-all ${
            settings[key] ? 'translate-x-5' : ''
          }`}
        />
      </span>
    </button>
  );

  return (
    <div className="fixed inset-0 bg-[#071a2f]/80 flex items-center justify-center z-[60] p-4 overflow-y-auto">
      <div className="bg-[#12304f] p-6 sm:p-8 rounded-3xl w-full max-w-[920px] h-auto lg:h-[560px] max-h-[calc(100vh-2rem)] border border-white/10 flex flex-col overflow-hidden">
        <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div>
            <h2 className="text-3xl font-black text-white">System Settings</h2>
            <p className="text-gray-400 mt-2">
              Configure system operations. Saved changes will apply to upcoming races.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-3 bg-white/10 rounded-2xl text-white font-semibold"
          >
            Close
          </button>
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[180px,minmax(0,1fr)] gap-5">
          <div className="space-y-3">
            {(Object.keys(settingTabLabels) as SystemSettingsTab[]).map((settingTab) => (
              <button
                key={settingTab}
                onClick={() => onTabChange(settingTab)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left font-bold transition-all ${
                  tab === settingTab
                    ? 'bg-[#d4af37] border-[#d4af37] text-[#071a2f]'
                    : 'bg-[#071a2f] border-white/10 text-white hover:border-[#d4af37]/50'
                }`}
              >
                <Settings className="w-5 h-5" />
                {settingTabLabels[settingTab]}
              </button>
            ))}
          </div>

          <div className="min-w-0 min-h-0 flex flex-col gap-5">
            {message && (
              <div className={`shrink-0 rounded-xl border px-4 py-3 font-semibold ${messageToneClasses(message)}`}>
                {message}
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {tab === 'race' && (
                <div className="grid md:grid-cols-2 gap-4">
                  {renderNumberSetting('Default race distance', 'Automatically suggested when an admin creates a new race.', 'defaultDistanceMeters', 400)}
                  {renderNumberSetting('Max horses per race', 'Maximum number of horse-jockey pairs that can be published in a race.', 'maxHorsesPerRace', 2)}
                  {renderNumberSetting('Minimum ready horses per race', 'Minimum number of horses the referee must mark as Ready before a race can start.', 'minReadiedParticipants', 1)}
                  {renderNumberSetting('Max races per tournament', 'Maximum number of races allowed in a tournament.', 'maxRacesPerTournament', 1)}
                  {renderNumberSetting('Close registration before race', 'Number of hours before the race when registration closes.', 'closeRegistrationHours')}
                  <div className="md:col-span-2">
                    {renderToggleSetting('Auto publish results', 'Automatically publish results after the referee completes the race report.', 'autoPublishResults')}
                  </div>
                </div>
              )}

              {tab === 'approval' && (
                <div className="grid md:grid-cols-2 gap-4">
                  {renderToggleSetting('Allow self-registration', 'Allow owners, jockeys, and referees to create their own accounts.', 'allowSelfRegistration')}
                  {renderToggleSetting('Owner requires admin approval', 'New owners must be approved by an admin before using the system.', 'requireOwnerApproval')}
                  {renderToggleSetting('Jockey requires admin approval', 'New jockeys must be approved before accepting invitations or registering for races.', 'requireJockeyApproval')}
                  {renderToggleSetting('Referee requires admin approval', 'New referees must be approved before they can be assigned to races.', 'requireRefereeApproval')}
                </div>
              )}

              {tab === 'notifications' && (
                <div className="space-y-5">
                  <div className="grid md:grid-cols-3 gap-4">
                    {renderToggleSetting('Horse registration', 'Send a notification when an owner registers a new horse.', 'notifyHorseRegistration')}
                    {renderToggleSetting('Jockey registration', 'Send a notification when a jockey registers or responds to an invitation.', 'notifyJockeyRegistration')}
                    {renderToggleSetting('Race result', 'Send a notification when race results or awards are published.', 'notifyRaceResults')}
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#071a2f]/70 p-5">
                    <h3 className="text-white font-black mb-4">Recipient roles</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {renderToggleSetting('Admins', 'Receive profile approval alerts.', 'notifyAdmins')}
                      {renderToggleSetting('Referees', 'Receive race assignments.', 'notifyReferees')}
                      {renderToggleSetting('Owners', 'Receive horse and race status updates.', 'notifyOwners')}
                      {renderToggleSetting('Jockeys', 'Receive invitations and race results.', 'notifyJockeys')}
                    </div>
                  </div>
                </div>
              )}

              {tab === 'system' && (
                <div className="grid md:grid-cols-2 gap-4">
                  {renderToggleSetting('Maintenance mode', 'Restrict system access to admins during maintenance.', 'maintenanceMode')}
                  {renderToggleSetting('Audit settings changes', 'Record which admin changed each setting and when it was changed.', 'auditSettingsChanges')}
                  {renderNumberSetting('Archive completed tournaments', 'Number of days after completion before a tournament is archived.', 'archiveCompletedAfterDays', 1)}
                </div>
              )}
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row gap-4 pt-2">
              <button onClick={onClose} className="flex-1 py-4 bg-white/10 rounded-2xl text-white">
                Cancel
              </button>
              <button onClick={onSave} className="flex-1 py-4 bg-[#d4af37] rounded-2xl text-white font-bold">
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
