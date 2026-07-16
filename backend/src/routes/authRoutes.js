import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
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
  createNotification,
  notifyAdmins,
} from '../services/notificationService.js';

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

    if (persistLoginSession) {
      await persistLoginSession(user, session, expiresAt.toISOString());
    } else {
      await writeDb(db);
    }

    setCookie(c, SESSION_COOKIE_NAME, token, sessionCookieOptions);
    return c.json({ user: publicUser(user) });
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
    if (String(password).length < 8) {
      return c.json({ message: 'Password must contain at least 8 characters' }, 400);
    }

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
      createdAt,
      updatedAt: createdAt,
    };
    db.users.push(user);
    if (role === USER_ROLES.SPECTATOR) {
      db.wallets = [
        ...(db.wallets || []),
        {
          userId: user.id,
          credits: SPECTATOR_STARTING_CREDITS,
          updatedAt: createdAt,
        },
      ];
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
      await persistRegisteredUser(user, createdNotifications);
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
