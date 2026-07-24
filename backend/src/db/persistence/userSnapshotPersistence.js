import { SESSION_DAYS } from '../../config/constants.js';
import { addDaysIso, nowIso, rowTimestamps } from './persistenceHelpers.js';

// Ghi snapshot thuộc tài khoản, hồ sơ, thông báo, session và cấu hình.
export const writeUserSnapshot = async ({
  db,
  baselineUsersById,
  writeRows,
}) => {
  await writeRows(
    'users',
    [
      'id',
      'name',
      'email',
      'password',
      'role',
      'status',
      'loginStreak',
      'lastLoginRewardDate',
      'createdAt',
      'updatedAt',
    ],
    (db.users || []).map((user) => ({
      ...user,
      password: user.password ?? baselineUsersById.get(user.id)?.password ?? '',
      loginStreak: Number(user.loginStreak || 0),
      lastLoginRewardDate: user.lastLoginRewardDate || null,
      ...rowTimestamps(user),
    })),
  );

  await writeRows(
    'jockeyProfiles',
    [
      'id',
      'userId',
      'bio',
      'certificate',
      'competitionLevel',
      'weightLb',
      'status',
      'updatedAt',
    ],
    (db.jockeyProfiles || []).map((profile) => ({
      ...profile,
      updatedAt: profile.updatedAt || null,
    })),
  );

  await writeRows(
    'notifications',
    ['id', 'userId', 'type', 'title', 'message', 'isRead', 'createdAt'],
    (db.notifications || []).map((notification) => ({
      ...notification,
      type: notification.type || 'general',
      isRead: Boolean(notification.read),
    })),
  );

  await writeRows(
    'sessions',
    ['token', 'userId', 'createdAt', 'expiresAt'],
    (db.sessions || []).map((session) => ({
      ...session,
      createdAt: session.createdAt || nowIso(),
      expiresAt:
        session.expiresAt || addDaysIso(session.createdAt, SESSION_DAYS),
    })),
  );

  await writeRows(
    'passwordResetRequests',
    [
      'id',
      'userId',
      'tokenHash',
      'status',
      'requestedAt',
      'reviewedAt',
      'reviewedBy',
      'expiresAt',
      'completedAt',
    ],
    db.passwordResetRequests || [],
  );

  await writeRows(
    'systemSettings',
    ['key', 'value', 'updatedBy', 'updatedAt'],
    db.systemSettings || [],
    'key',
  );
};
