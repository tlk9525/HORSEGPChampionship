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

// Ghi chú: Modal quản lý rule race, approval, notification và system setting.
export default function SystemSettingsModal({
  settings,
  tab,
  message,
  onTabChange,
  onSettingChange,
  onSave,
  onClose,
}: SystemSettingsModalProps) {
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
              Cấu hình vận hành hệ thống. Lưu xong sẽ áp dụng cho các race tiếp theo.
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
                  {renderNumberSetting('Default race distance', 'Distance tự động đề xuất khi admin tạo race mới.', 'defaultDistanceMeters', 400)}
                  {renderNumberSetting('Max horses per race', 'Giới hạn số horse-jockey pair được publish trong một race.', 'maxHorsesPerRace', 2)}
                  {renderNumberSetting('Minimum ready horses per race', 'Số horse tối thiểu phải được referee đánh dấu Ready trước khi start race.', 'minReadiedParticipants', 1)}
                  {renderNumberSetting('Max races per tournament', 'Giới hạn số race tối đa trong một tournament.', 'maxRacesPerTournament', 1)}
                  {renderNumberSetting('Close registration before race', 'Số giờ khóa đăng ký trước giờ race bắt đầu.', 'closeRegistrationHours')}
                  <div className="md:col-span-2">
                    {renderToggleSetting('Auto publish results', 'Tự publish kết quả sau khi referee hoàn tất race report.', 'autoPublishResults')}
                  </div>
                </div>
              )}

              {tab === 'approval' && (
                <div className="grid md:grid-cols-2 gap-4">
                  {renderToggleSetting('Allow self-registration', 'Cho phép owner, jockey, referee tự tạo tài khoản.', 'allowSelfRegistration')}
                  {renderToggleSetting('Owner requires admin approval', 'Owner mới phải chờ admin duyệt trước khi dùng hệ thống.', 'requireOwnerApproval')}
                  {renderToggleSetting('Jockey requires admin approval', 'Jockey mới phải chờ admin duyệt trước khi nhận lời mời hoặc đăng ký race.', 'requireJockeyApproval')}
                  {renderToggleSetting('Referee requires admin approval', 'Referee mới phải được duyệt trước khi được assign race.', 'requireRefereeApproval')}
                </div>
              )}

              {tab === 'notifications' && (
                <div className="space-y-5">
                  <div className="grid md:grid-cols-3 gap-4">
                    {renderToggleSetting('Horse registration', 'Gửi thông báo khi owner đăng ký horse mới.', 'notifyHorseRegistration')}
                    {renderToggleSetting('Jockey registration', 'Gửi thông báo khi jockey đăng ký hoặc phản hồi lời mời.', 'notifyJockeyRegistration')}
                    {renderToggleSetting('Race result', 'Gửi thông báo khi race có kết quả hoặc award được publish.', 'notifyRaceResults')}
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#071a2f]/70 p-5">
                    <h3 className="text-white font-black mb-4">Recipient roles</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {renderToggleSetting('Admins', 'Nhận cảnh báo duyệt hồ sơ.', 'notifyAdmins')}
                      {renderToggleSetting('Referees', 'Nhận race assignment.', 'notifyReferees')}
                      {renderToggleSetting('Owners', 'Nhận trạng thái horse/race.', 'notifyOwners')}
                      {renderToggleSetting('Jockeys', 'Nhận lời mời và kết quả race.', 'notifyJockeys')}
                    </div>
                  </div>
                </div>
              )}

              {tab === 'system' && (
                <div className="grid md:grid-cols-2 gap-4">
                  {renderToggleSetting('Maintenance mode', 'Khóa người dùng thường, chỉ admin vào được hệ thống.', 'maintenanceMode')}
                  {renderToggleSetting('Audit settings changes', 'Ghi lại admin nào đổi setting nào và thời điểm thay đổi.', 'auditSettingsChanges')}
                  {renderNumberSetting('Archive completed tournaments', 'Số ngày sau khi completed thì tournament được đưa vào archive.', 'archiveCompletedAfterDays', 1)}
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
