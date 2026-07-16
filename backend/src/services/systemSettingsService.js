import {
  MAX_RACE_FIELD_SIZE,
  MAX_OWNER_HORSES,
  MAX_TOURNAMENT_RACES,
  MIN_READIED_PARTICIPANTS,
} from '../config/constants.js';

const DEFAULT_SYSTEM_SETTINGS = Object.freeze({
  maxOwnerHorses: MAX_OWNER_HORSES,
  defaultDistanceMeters: 1600,
  maxHorsesPerRace: MAX_RACE_FIELD_SIZE,
  minReadiedParticipants: MIN_READIED_PARTICIPANTS,
  maxRacesPerTournament: MAX_TOURNAMENT_RACES,
  closeRegistrationHours: 24,
  autoPublishResults: false,
  requireOwnerApproval: true,
  requireJockeyApproval: true,
  requireRefereeApproval: true,
  allowSelfRegistration: true,
  notifyHorseRegistration: true,
  notifyJockeyRegistration: true,
  notifyRaceResults: true,
  notifyAdmins: true,
  notifyReferees: true,
  notifyOwners: true,
  notifyJockeys: true,
  maintenanceMode: false,
  auditSettingsChanges: true,
  archiveCompletedAfterDays: 90,
});

const numericSettingKeys = new Set([
  'maxOwnerHorses',
  'defaultDistanceMeters',
  'maxHorsesPerRace',
  'minReadiedParticipants',
  'maxRacesPerTournament',
  'closeRegistrationHours',
  'archiveCompletedAfterDays',
]);

const booleanSettingKeys = new Set(
  Object.keys(DEFAULT_SYSTEM_SETTINGS).filter(
    (key) => typeof DEFAULT_SYSTEM_SETTINGS[key] === 'boolean'
  )
);

// Ghi chú: Hàm này chuẩn hóa hoặc tính toán dữ liệu cho parseSettingValue.
const parseSettingValue = (key, value) => {
  if (numericSettingKeys.has(key)) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : DEFAULT_SYSTEM_SETTINGS[key];
  }

  if (booleanSettingKeys.has(key)) {
    return value === true || value === 'true';
  }

  return value;
};

// Ghi chú: Hàm này chuẩn hóa hoặc tính toán dữ liệu cho systemSettingsFromDb.
export const systemSettingsFromDb = (db = {}) => {
  const persisted =
    Array.isArray(db.systemSettings)
      ? Object.fromEntries(
          db.systemSettings.map((setting) => [
            setting.key,
            parseSettingValue(setting.key, setting.value),
          ])
        )
      : db.systemSettings || {};

  return {
    ...DEFAULT_SYSTEM_SETTINGS,
    ...Object.fromEntries(
      Object.entries(persisted)
        .filter(([key]) => key in DEFAULT_SYSTEM_SETTINGS)
        .map(([key, value]) => [key, parseSettingValue(key, value)])
    ),
  };
};

// Ghi chú: Hàm này chuẩn hóa hoặc tính toán dữ liệu cho sanitizeSystemSettings.
export const sanitizeSystemSettings = (input = {}, current = DEFAULT_SYSTEM_SETTINGS) => {
  const next = { ...current };

  for (const key of Object.keys(DEFAULT_SYSTEM_SETTINGS)) {
    if (!(key in input)) continue;

    if (numericSettingKeys.has(key)) {
      const parsed = Math.round(Number(input[key]));
      if (Number.isFinite(parsed)) {
        next[key] = parsed;
      }
      continue;
    }

    if (booleanSettingKeys.has(key)) {
      next[key] = Boolean(input[key]);
    }
  }

  next.defaultDistanceMeters = Math.min(Math.max(next.defaultDistanceMeters, 400), 10000);
  next.maxOwnerHorses = Math.min(Math.max(next.maxOwnerHorses, 1), 100);
  next.maxHorsesPerRace = Math.min(Math.max(next.maxHorsesPerRace, 2), 24);
  next.minReadiedParticipants = Math.min(
    Math.max(next.minReadiedParticipants, 1),
    next.maxHorsesPerRace
  );
  next.maxRacesPerTournament = Math.min(Math.max(next.maxRacesPerTournament, 1), 100);
  next.closeRegistrationHours = Math.min(Math.max(next.closeRegistrationHours, 0), 720);
  next.archiveCompletedAfterDays = Math.min(Math.max(next.archiveCompletedAfterDays, 1), 3650);

  return next;
};

// Ghi chú: Hàm này chuẩn hóa hoặc tính toán dữ liệu cho settingsToRows.
export const settingsToRows = (settings, updatedBy = null, updatedAt = new Date().toISOString()) =>
  Object.entries(settings).map(([key, value]) => ({
    key,
    value: String(value),
    updatedBy,
    updatedAt,
  }));
