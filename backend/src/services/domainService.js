import { ACTIVE_TOURNAMENT_STATUSES, USER_ROLES } from '../config/constants.js';

// Lấy tên chủ ngựa (owner) từ userId, trả về 'Unknown Owner' nếu không tìm thấy
export const ownerName = (db, userId) =>
  db.users.find((user) => user.id === userId)?.name || 'Unknown Owner';

// Lấy tên jockey từ userId, trả về 'Unknown Jockey' nếu không tìm thấy
export const jockeyName = (db, userId) =>
  userId
    ? db.users.find((user) => user.id === userId)?.name || 'Unknown Jockey'
    : 'Jockey pending';

// Lấy tên ngựa từ horseId, trả về 'Unknown Horse' nếu không tìm thấy
export const horseName = (db, horseId) =>
  db.horses.find((horse) => horse.id === horseId)?.name || 'Unknown Horse';

// Lấy tên cuộc đua từ raceId, trả về 'Unassigned race' nếu không tìm thấy
export const raceName = (db, raceId) =>
  db.races.find((race) => race.id === raceId)?.name || 'Unassigned race';

const asLb = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
};

const horseWeightLb = (db, horseId) => {
  const horse = db.horses.find((item) => item.id === horseId);
  if (!horse) return null;

  return asLb(horse.weightLb);
};

const jockeyWeightLb = (db, jockeyUserId) => {
  const profile = (db.jockeyProfiles || []).find(
    (item) => item.userId === jockeyUserId
  );

  return asLb(profile?.weightLb);
};

// Lấy tên giải đấu từ tournamentId, trả về 'Tournament' nếu không tìm thấy
export const tournamentName = (db, tournamentId) =>
  db.tournaments.find((tournament) => tournament.id === tournamentId)?.name ||
  'Tournament';

// Tìm giải đấu đang diễn ra (có trạng thái active), trả về null nếu không có
export const activeTournament = (db) =>
  db.tournaments.find((tournament) =>
    ACTIVE_TOURNAMENT_STATUSES.includes(tournament.status)
  ) || null;

// Lấy danh sách tất cả các cuộc đua thuộc một giải đấu cụ thể
export const tournamentRaces = (db, tournamentId) =>
  (db.races || []).filter((race) => race.tournamentId === tournamentId);

export const isRaceRegistrationOpen = (race, at = Date.now()) => {
  if (!race || race.status !== 'registration-open') return false;

  const hasOpenTime = Boolean(race.registrationOpensAt);
  const hasCloseTime = Boolean(race.registrationClosesAt);
  const opensAt = race.registrationOpensAt
    ? new Date(race.registrationOpensAt).getTime()
    : Number.NEGATIVE_INFINITY;
  const closesAt = race.registrationClosesAt
    ? new Date(race.registrationClosesAt).getTime()
    : Number.POSITIVE_INFINITY;

  return (
    Number.isFinite(at) &&
    (!hasOpenTime || Number.isFinite(opensAt)) &&
    (!hasCloseTime || Number.isFinite(closesAt)) &&
    at >= opensAt &&
    at < closesAt
  );
};

export const activeRace = (race) =>
  race && !['finished', 'completed', 'cancelled'].includes(race.status);

// Lấy danh sách đăng ký ngựa theo từng race (loại bỏ các mục bị từ chối hoặc hủy bỏ)
export const activeHorseRaceRegistrations = (db, tournamentId) =>
  (db.horseRaceRegistrations || []).filter(
    (registration) =>
      registration.tournamentId === tournamentId &&
      !['rejected', 'cancelled'].includes(registration.status)
  );

// Tìm một race entry theo ID cụ thể
export const findEntry = (db, entryId) =>
  (db.raceEntries || []).find((entry) => entry.id === entryId);

// Lấy danh sách entry đã được phê duyệt (status = 'approved') cho một cuộc đua
export const approvedRaceEntries = (db, raceId) =>
  (db.raceEntries || []).filter(
    (entry) => entry.raceId === raceId && entry.status === 'approved'
  );

// Trả về danh sách tất cả race entries kèm thông tin tên ngựa, jockey, owner và cuộc đua
export const publicRaceEntries = (db) =>
  (db.raceEntries || []).map((entry) => ({
    ...entry,
    horseName: horseName(db, entry.horseId),
    jockeyName: jockeyName(db, entry.jockeyUserId),
    ownerName: ownerName(
      db,
      db.horses.find((horse) => horse.id === entry.horseId)?.ownerUserId
    ),
    horseWeightLb: horseWeightLb(db, entry.horseId),
    jockeyWeightLb: jockeyWeightLb(db, entry.jockeyUserId),
    raceName: raceName(db, entry.raceId),
  }));

// Lấy danh sách hồ sơ jockey công khai (chỉ lấy profile đã publish và user có trạng thái active)
export const publicJockeyProfiles = (db, { includeEmail = false } = {}) =>
  (db.jockeyProfiles || [])
    .map((profile) => {
      const user = db.users.find((item) => item.id === profile.userId);

      return {
        ...profile,
        jockeyName: user?.name || 'Unknown Jockey',
        ...(includeEmail ? { jockeyEmail: user?.email || '' } : {}),
        userStatus: user?.status || 'unknown',
      };
    })
    .filter(
      (profile) =>
        profile.status === 'published' &&
        profile.userStatus === 'active'
    );

// Lấy danh sách jockey công khai đã được phê duyệt tham gia một giải đấu cụ thể
export const publicTournamentJockeyProfiles = (db, tournamentId, raceId) => {
  const approvedJockeyIds = new Set(
    (db.jockeyRaceRegistrations || [])
      .filter(
        (registration) =>
          db.races.some(
            (race) =>
              race.id === registration.raceId &&
              race.tournamentId === tournamentId &&
              (!raceId || race.id === raceId)
          ) &&
          registration.status === 'approved'
      )
      .map((registration) => registration.jockeyUserId)
  );

  return publicJockeyProfiles(db).filter((profile) =>
    approvedJockeyIds.has(profile.userId)
  );
};

// Lấy danh sách ID của các trọng tài được phân công cho một cuộc đua (kết hợp nhiều nguồn)
export const raceRefereeIds = (db, race) => {
  const assignmentIds = (db?.raceRefereeAssignments || [])
    .filter(
      (assignment) =>
        assignment.raceId === race?.id && assignment.status !== 'removed'
    )
    .map((assignment) => assignment.refereeUserId);

  return Array.from(
    new Set([
      ...assignmentIds,
      race?.refereeUserId,
      ...String(race?.refereeUserIds || '')
        .split(',')
        .map((id) => id.trim()),
    ].filter(Boolean))
  );
};

// Kiểm tra xem người dùng có quyền điều hành cuộc đua không (admin hoặc trọng tài của race)
export const canRefereeRace = (race, user, db) =>
  user?.role === USER_ROLES.ADMIN ||
  raceRefereeIds(db, race).includes(user?.id);

// Tạo danh sách các mục cần phê duyệt: ngựa chờ, tài khoản chờ, đăng ký jockey, và đăng ký race
export const formatApprovals = (db) => [
  ...db.horses
    .filter((horse) => horse.status === 'pending')
    .map((horse) => ({
      id: horse.id,
      entityType: 'horse',
      type: 'Horse Registration',
      name: horse.name,
      detail: `Owner: ${ownerName(db, horse.ownerUserId)}`,
      date: horse.createdAt || 'Submitted',
      targetUserId: horse.ownerUserId,
    })),
  ...db.users
    .filter(
      (user) =>
        [USER_ROLES.OWNER, USER_ROLES.JOCKEY, USER_ROLES.REFEREE].includes(user.role) &&
        user.status === 'pending'
    )
    .map((user) => ({
      id: user.id,
      entityType: 'account',
      type: `${user.role.charAt(0).toUpperCase()}${user.role.slice(1)} Account Request`,
      name: user.name,
      detail: `Email: ${user.email} • Role: ${user.role}`,
      date: user.createdAt || 'Submitted',
      targetUserId: user.id,
    })),
  ...(db.jockeyRaceRegistrations || [])
    .filter((registration) => registration.status === 'pending')
    .map((registration) => ({
      id: registration.id,
      entityType: 'jockeyRace',
      type: 'Jockey Race Registration',
      name: jockeyName(db, registration.jockeyUserId),
      detail: `Race: ${raceName(db, registration.raceId)}`,
      date: registration.createdAt,
      targetUserId: registration.jockeyUserId,
    })),
  ...(db.horseRaceRegistrations || [])
    .filter(
      (registration) =>
        registration.status === 'pending-admin' &&
        !registration.invitationId &&
        !registration.jockeyUserId
    )
    .map((registration) => ({
      id: registration.id,
      entityType: 'horseRace',
      type: 'Horse Race Registration',
      name: horseName(db, registration.horseId),
      detail: `Race: ${raceName(db, registration.raceId)} • Owner: ${ownerName(db, registration.ownerUserId)}`,
      date: registration.createdAt,
      targetUserId: registration.ownerUserId,
    })),
  ...(db.jockeyInvitations || [])
    .filter(
      (invitation) =>
        invitation.status === 'accepted' && invitation.adminStatus === 'pending'
    )
    .map((invitation) => ({
      id: invitation.id,
      entityType: 'pairing',
      type: 'Race Entry Registration',
      name: `${horseName(db, invitation.horseId)} + ${jockeyName(db, invitation.jockeyUserId)}`,
      detail: `Race: ${raceName(db, invitation.raceId)} • Owner: ${ownerName(db, invitation.ownerUserId)}`,
      date:
        db.races.find((race) => race.id === invitation.raceId)?.date ||
        'Race schedule',
      targetUserId: invitation.ownerUserId,
    })),
];
