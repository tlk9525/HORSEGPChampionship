import { Hono } from 'hono';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import {
  ACCOUNT_APPROVAL_ROLES,
  COOKIE_SAME_SITE,
  COOKIE_SECURE,
  SELF_REGISTRATION_ROLES,
  SESSION_COOKIE_NAME,
  SESSION_DAYS,
  SPECTATOR_STARTING_CREDITS,
  USER_ROLES,
} from '../config/constants.js';
import { authenticate, publicUser } from '../services/authService.js';
import {
  awardDailyLoginBonus,
  grantStarterCredits,
} from '../services/creditService.js';
import {
  createNotification,
  notifyAdmins,
} from '../services/notificationService.js';
import { passwordValidationError } from '../services/passwordPolicy.js';

const resetTokenHash = (token) =>
  createHash('sha256').update(String(token || '')).digest('hex');

// Ghi chú: Hàm này tạo nhóm route auth routes cho backend.
export const createAuthRoutes = (
  getDb,
  writeDb,
  persistLoginSession,
  persistRegisteredUser,
  deleteSession
) => {
  const app = new Hono();

  // Tạo một phiên đăng nhập mới với token ngẫu nhiên và lưu vào database
  const createSession = (db, userId) => {
    const token = randomUUID();
    const createdAt = new Date();
    db.sessions.push({
      token,
      userId,
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(
        createdAt.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000
      ).toISOString(),
    });
    return token;
  };

  const sessionCookieOptions = {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAME_SITE,
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };

  // Trả về thông tin user đang đăng nhập
  app.get('/me', async (c) => {
    const db = await getDb();
    const user = await authenticate(c.req.raw, db);
    return user
      ? c.json({ user })
      : c.json({ message: 'Not authenticated' }, 401);
  });

  // Đăng nhập bằng email/password và đặt session token trong HttpOnly cookie.
  app.post('/login', async (c) => {
    const db = await getDb();
    const { email, password } = await c.req.json();
    const user = db.users.find(
      (item) => item.email.toLowerCase() === String(email || '').toLowerCase()
    );
    const passwordMatches = user
      ? String(user.password || '').startsWith('$2')
        ? await bcrypt.compare(String(password || ''), user.password)
        : user.password === password
      : false;

    if (!user || !passwordMatches) {
      return c.json({ message: 'Invalid email or password' }, 401);
    }

    if (user.status !== 'active') {
      return c.json(
        {
          message:
            user.status === 'pending'
              ? 'Your account is waiting for Admin approval.'
              : `Your account is ${user.status}. Please contact Admin.`,
        },
        403
      );
    }

    const expiresAt = new Date();
    db.sessions = (db.sessions || []).filter(
      (session) =>
        !session.expiresAt || new Date(session.expiresAt).getTime() > expiresAt.getTime()
    );

    if (!String(user.password || '').startsWith('$2')) {
      user.password = await bcrypt.hash(String(password), 12);
      user.updatedAt = new Date().toISOString();
    }

    const token = createSession(db, user.id);
    const session = db.sessions.find((item) => item.token === token);
    const loginAt = new Date();
    let dailyReward = null;

    if (persistLoginSession) {
      const persisted = await persistLoginSession(
        user,
        session,
        expiresAt.toISOString(),
        loginAt.toISOString()
      );
      if (persisted?.user) Object.assign(user, persisted.user);
      dailyReward = persisted?.dailyReward || null;
    } else {
      dailyReward = awardDailyLoginBonus(db, user.id, loginAt);
      await writeDb(db);
    }

    setCookie(c, SESSION_COOKIE_NAME, token, sessionCookieOptions);
    return c.json({
      user: publicUser(user),
      ...(user.role === USER_ROLES.SPECTATOR
        ? {
            dailyReward: dailyReward
              ? {
                  claimed: dailyReward.claimed,
                  amount: dailyReward.amount,
                  streak: dailyReward.streak,
                }
              : {
                  claimed: false,
                  amount: 0,
                  streak: Number(user.loginStreak || 0),
                },
          }
        : {}),
    });
  });

  // Đăng ký tài khoản mới, trả về thông tin user và trạng thái phê duyệt
  app.post('/register', async (c) => {
    const db = await getDb();
    const { name, email, password, role } = await c.req.json();

    if (!name || !email || !password || !SELF_REGISTRATION_ROLES.includes(role)) {
      return c.json(
        { message: 'Name, email, password and role are required. Admin accounts cannot self-register.' },
        400
      );
    }
    const passwordError = passwordValidationError(password);
    if (passwordError) return c.json({ message: passwordError }, 400);

    const exists = db.users.some(
      (item) => item.email.toLowerCase() === String(email).toLowerCase()
    );
    if (exists) return c.json({ message: 'Email already exists' }, 409);

    const needsApproval = ACCOUNT_APPROVAL_ROLES.includes(role);
    const createdAt = new Date().toISOString();
    const user = {
      id: randomUUID(),
      name,
      email,
      password: await bcrypt.hash(String(password), 12),
      role,
      status: needsApproval ? 'pending' : 'active',
      credits: role === USER_ROLES.SPECTATOR ? SPECTATOR_STARTING_CREDITS : null,
      loginStreak: 0,
      lastLoginRewardDate: null,
      createdAt,
      updatedAt: createdAt,
    };
    db.users.push(user);
    let starterTransactions = [];
    if (role === USER_ROLES.SPECTATOR) {
      const starterTransaction = grantStarterCredits(
        db,
        user.id,
        SPECTATOR_STARTING_CREDITS,
        createdAt
      );
      starterTransactions = starterTransaction ? [starterTransaction] : [];
    }
    const existingNotificationIds = new Set(
      (db.notifications || []).map((notification) => notification.id)
    );

    if (needsApproval) {
      notifyAdmins(
        db,
        'Account approval request',
        `${name} registered as ${role}. Please approve the account before this user can log in.`
      );
      createNotification(
        db,
        user.id,
        'Account request submitted',
        'Your account is waiting for Admin approval before you can log in.'
      );
    }

    const createdNotifications = (db.notifications || []).filter(
      (notification) => !existingNotificationIds.has(notification.id)
    );
    if (persistRegisteredUser) {
      await persistRegisteredUser(user, createdNotifications, starterTransactions);
    } else {
      await writeDb(db);
    }
    return c.json(
      {
        user: publicUser(user),
        requiresApproval: needsApproval,
        message: needsApproval
          ? 'Account request submitted. Please wait for Admin approval before logging in.'
          : 'Account created. You can log in now.',
      },
      201
    );
  });

  // Đăng xuất, xóa phiên làm việc khỏi database
  app.patch('/account/name', async (c) => {
    const db = await getDb();
    const authenticatedUser = await authenticate(c.req.raw, db);
    if (!authenticatedUser) {
      return c.json({ message: 'Authentication required' }, 401);
    }

    const { name } = await c.req.json();
    const normalizedName = String(name || '').trim().replace(/\s+/g, ' ');
    if (normalizedName.length < 2) {
      return c.json({ message: 'Name must contain at least 2 characters' }, 400);
    }
    if (normalizedName.length > 100) {
      return c.json({ message: 'Name must not exceed 100 characters' }, 400);
    }

    const user = db.users.find((item) => item.id === authenticatedUser.id);
    if (!user) return c.json({ message: 'Account not found' }, 404);

    user.name = normalizedName;
    user.updatedAt = new Date().toISOString();
    await writeDb(db);
    return c.json({
      user: publicUser(user),
      message: 'Name updated successfully',
    });
  });

  // Signed-in users can change their password after confirming the current one.
  app.post('/change-password', async (c) => {
    const db = await getDb();
    const authenticatedUser = await authenticate(c.req.raw, db);
    if (!authenticatedUser) {
      return c.json({ message: 'Authentication required' }, 401);
    }

    const { currentPassword, newPassword } = await c.req.json();
    const user = db.users.find((item) => item.id === authenticatedUser.id);
    const currentMatches = user
      ? String(user.password || '').startsWith('$2')
        ? await bcrypt.compare(String(currentPassword || ''), user.password)
        : user.password === currentPassword
      : false;

    if (!currentMatches) {
      return c.json({ message: 'Current password is incorrect' }, 400);
    }

    const passwordError = passwordValidationError(newPassword);
    if (passwordError) return c.json({ message: passwordError }, 400);
    const repeatsCurrent = String(user.password || '').startsWith('$2')
      ? await bcrypt.compare(String(newPassword), user.password)
      : user.password === newPassword;
    if (repeatsCurrent) {
      return c.json(
        { message: 'New password must be different from the current password' },
        400
      );
    }

    const activeToken =
      getCookie(c, SESSION_COOKIE_NAME) ||
      (c.req.header('Authorization') || '').replace(/^Bearer\s+/i, '');
    user.password = await bcrypt.hash(String(newPassword), 12);
    user.updatedAt = new Date().toISOString();
    db.sessions = (db.sessions || []).filter(
      (session) => session.userId !== user.id || session.token === activeToken
    );
    await writeDb(db);
    return c.json({ ok: true, message: 'Password changed successfully' });
  });

  // Create an admin-reviewed recovery request without revealing whether the email exists.
  app.post('/password-reset-requests', async (c) => {
    const db = await getDb();
    const { email } = await c.req.json();
    const token = randomBytes(32).toString('hex');
    const tokenHash = resetTokenHash(token);
    const user = db.users.find(
      (item) =>
        item.email.toLowerCase() === String(email || '').trim().toLowerCase() &&
        item.status === 'active'
    );

    if (user) {
      const requestedAt = new Date();
      const expiresAt = new Date(requestedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      db.passwordResetRequests = db.passwordResetRequests || [];
      const existing = db.passwordResetRequests.find(
        (request) =>
          request.userId === user.id &&
          ['pending', 'approved'].includes(request.status)
      );
      const request = existing || { id: randomUUID(), userId: user.id };
      Object.assign(request, {
        tokenHash,
        status: 'pending',
        requestedAt: requestedAt.toISOString(),
        reviewedAt: null,
        reviewedBy: null,
        expiresAt: expiresAt.toISOString(),
        completedAt: null,
      });
      if (!existing) db.passwordResetRequests.push(request);

      notifyAdmins(
        db,
        'Password reset approval request',
        `${user.name} requested approval to reset their password.`
      );
      createNotification(
        db,
        user.id,
        'Password reset requested',
        'Your password reset request is waiting for Admin approval.'
      );
      await writeDb(db);
    }

    return c.json({
      recoveryCode: token,
      message:
        'If an active account matches that email, its password reset request was sent to Admin for approval.',
    });
  });

  // The opaque recovery code lets the requester check the Admin decision.
  app.get('/password-reset-requests/:token/status', async (c) => {
    const db = await getDb();
    const tokenHash = resetTokenHash(c.req.param('token'));
    const request = (db.passwordResetRequests || []).find(
      (item) => item.tokenHash === tokenHash
    );

    if (!request) return c.json({ status: 'unknown' });
    if (
      ['pending', 'approved'].includes(request.status) &&
      new Date(request.expiresAt).getTime() <= Date.now()
    ) {
      request.status = 'expired';
      await writeDb(db);
    }
    return c.json({ status: request.status });
  });

  // Complete an approved recovery request and revoke every existing session.
  app.post('/password-reset-requests/:token/complete', async (c) => {
    const db = await getDb();
    const tokenHash = resetTokenHash(c.req.param('token'));
    const request = (db.passwordResetRequests || []).find(
      (item) => item.tokenHash === tokenHash
    );
    if (!request || request.status !== 'approved') {
      return c.json({ message: 'This password reset request is not approved' }, 400);
    }
    if (new Date(request.expiresAt).getTime() <= Date.now()) {
      request.status = 'expired';
      await writeDb(db);
      return c.json({ message: 'This password reset request has expired' }, 400);
    }

    const { newPassword } = await c.req.json();
    const passwordError = passwordValidationError(newPassword);
    if (passwordError) return c.json({ message: passwordError }, 400);
    const user = db.users.find((item) => item.id === request.userId);
    if (!user) return c.json({ message: 'Account not found' }, 404);

    user.password = await bcrypt.hash(String(newPassword), 12);
    user.updatedAt = new Date().toISOString();
    request.status = 'completed';
    request.completedAt = user.updatedAt;
    db.sessions = (db.sessions || []).filter(
      (session) => session.userId !== user.id
    );
    createNotification(
      db,
      user.id,
      'Password reset complete',
      'Your password was reset. You can now sign in with the new password.'
    );
    await writeDb(db);
    return c.json({ ok: true, message: 'Password reset successfully' });
  });

  app.post('/logout', async (c) => {
    const db = await getDb();
    const header = c.req.header('Authorization') || '';
    const token =
      getCookie(c, SESSION_COOKIE_NAME) ||
      (header.startsWith('Bearer ') ? header.slice(7) : '');
    db.sessions = db.sessions.filter((item) => item.token !== token);
    if (deleteSession) {
      await deleteSession(token);
    } else {
      await writeDb(db);
    }
    deleteCookie(c, SESSION_COOKIE_NAME, {
      path: '/',
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAME_SITE,
    });
    return c.json({ ok: true });
  });

  return app;
};
