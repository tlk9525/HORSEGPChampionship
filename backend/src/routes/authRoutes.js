import { randomUUID } from 'node:crypto';
import { GOOGLE_CLIENT_ID } from '../config/constants.js';
import {
  authenticate,
  publicUser,
} from '../services/authService.js';

const allowedSelfRegistrationRoles = ['owner', 'jockey', 'referee', 'spectator'];

const normalizeRole = (role) =>
  allowedSelfRegistrationRoles.includes(role) ? role : 'spectator';

const createSession = (db, userId) => {
  const token = randomUUID();
  db.sessions.push({
    token,
    userId,
    createdAt: new Date().toISOString(),
  });
  return token;
};

const verifyGoogleCredential = async (credential) => {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google login is not configured. Set GOOGLE_CLIENT_ID and VITE_GOOGLE_CLIENT_ID.');
  }

  if (!credential) {
    throw new Error('Google credential is required.');
  }

  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
  );
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error_description || 'Unable to verify Google credential.');
  }

  if (payload.aud !== GOOGLE_CLIENT_ID) {
    throw new Error('Google credential audience does not match this application.');
  }

  if (payload.email_verified !== 'true' && payload.email_verified !== true) {
    throw new Error('Google email is not verified.');
  }

  return payload;
};

export const handleAuthRoutes = async ({
  req,
  res,
  url,
  db,
  send,
  readBody,
  writeDb,
}) => {
  if (req.method === 'GET' && url.pathname === '/api/me') {
    const user = await authenticate(req, db);
    send(res, user ? 200 : 401, user ? { user } : { message: 'Not authenticated' });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/login') {
    const { email, password } = await readBody(req);
    const user = db.users.find(
      (item) =>
        item.email.toLowerCase() === String(email || '').toLowerCase() &&
        item.password === password &&
        item.status === 'active'
    );

    if (!user) {
      send(res, 401, { message: 'Invalid email or password' });
      return true;
    }

    const token = createSession(db, user.id);
    await writeDb(db);

    send(res, 200, { token, user: publicUser(user) });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/register') {
    const { name, email, password, role } = await readBody(req);

    if (!name || !email || !password || !allowedSelfRegistrationRoles.includes(role)) {
      send(res, 400, { message: 'Name, email, password and role are required. Admin accounts cannot self-register.' });
      return true;
    }

    const exists = db.users.some(
      (item) => item.email.toLowerCase() === String(email).toLowerCase()
    );

    if (exists) {
      send(res, 409, { message: 'Email already exists' });
      return true;
    }

    const user = {
      id: randomUUID(),
      name,
      email,
      password,
      role,
      status: 'active',
      authProvider: 'password',
      googleId: null,
      avatarUrl: '',
    };
    db.users.push(user);
    await writeDb(db);

    send(res, 201, { user: publicUser(user) });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/google') {
    try {
      const { credential, role } = await readBody(req);
      const googleUser = await verifyGoogleCredential(credential);
      const email = String(googleUser.email || '').toLowerCase();

      if (!email) {
        send(res, 400, { message: 'Google account does not include an email.' });
        return true;
      }

      let user = db.users.find(
        (item) => item.email.toLowerCase() === email
      );

      if (user && user.status !== 'active') {
        send(res, 403, { message: `Your account is ${user.status}. Please contact Admin.` });
        return true;
      }

      if (!user) {
        user = {
          id: randomUUID(),
          name: googleUser.name || email,
          email,
          password: `google:${googleUser.sub}`,
          role: normalizeRole(role),
          status: 'active',
          authProvider: 'google',
          googleId: googleUser.sub,
          avatarUrl: googleUser.picture || '',
        };
        db.users.push(user);
      } else {
        user.authProvider = user.authProvider || 'google';
        user.googleId = user.googleId || googleUser.sub;
        user.avatarUrl = googleUser.picture || user.avatarUrl || '';
      }

      const token = createSession(db, user.id);
      await writeDb(db);

      send(res, 200, { token, user: publicUser(user) });
    } catch (error) {
      send(res, 400, {
        message: error instanceof Error ? error.message : 'Google login failed',
      });
    }

    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/logout') {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    db.sessions = db.sessions.filter((item) => item.token !== token);
    await writeDb(db);
    send(res, 200, { ok: true });
    return true;
  }

  return false;
};
