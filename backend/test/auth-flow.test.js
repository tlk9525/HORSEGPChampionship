import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { Hono } from 'hono';
import { createAuthRoutes } from '../src/routes/authRoutes.js';

test('auth uses an HttpOnly cookie and upgrades a legacy plaintext password', async () => {
  const now = new Date().toISOString();
  const db = {
    users: [{
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'spectator',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }],
    sessions: [],
    notifications: [],
  };
  let persistedSession;
  let deletedToken = '';

  const app = new Hono();
  app.route('/api', createAuthRoutes(
    async () => db,
    async () => undefined,
    async (user, session) => {
      persistedSession = session;
      assert.equal(await bcrypt.compare('password123', user.password), true);
    },
    async () => undefined,
    async (token) => {
      deletedToken = token;
    }
  ));

  const loginResponse = await app.request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
  });
  assert.equal(loginResponse.status, 200);
  assert.equal('token' in await loginResponse.json(), false);

  const setCookie = loginResponse.headers.get('set-cookie') || '';
  assert.match(setCookie, /horse-racing-session=/);
  assert.match(setCookie, /HttpOnly/i);
  assert.ok(persistedSession?.token);

  const cookie = setCookie.split(';')[0];
  assert.equal((await app.request('/api/me', { headers: { Cookie: cookie } })).status, 200);
  assert.equal((await app.request('/api/logout', {
    method: 'POST',
    headers: { Cookie: cookie },
  })).status, 200);
  assert.equal(deletedToken, persistedSession.token);
});

test('registration hashes passwords before persistence', async () => {
  const db = { users: [], sessions: [], notifications: [] };
  let persistedUser;
  let sentVerification;
  const app = new Hono();
  app.route('/api', createAuthRoutes(
    async () => db,
    async () => undefined,
    async () => undefined,
    async (user) => {
      persistedUser = user;
    },
    async () => undefined,
    async (message) => {
      sentVerification = message;
    }
  ));

  const response = await app.request('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'New Spectator',
      email: 'new@example.com',
      password: 'password123',
      role: 'spectator',
    }),
  });

  assert.equal(response.status, 201);
  assert.equal(await bcrypt.compare('password123', persistedUser.password), true);
  assert.ok(persistedUser.emailVerificationTokenHash);
  assert.equal(sentVerification.email, 'new@example.com');
  assert.equal(JSON.stringify(await response.json()).includes('password'), false);
});

test('spectator email verification is single-use and persisted', async () => {
  const db = { users: [], sessions: [], notifications: [] };
  let verificationToken = '';
  let writeCount = 0;
  const app = new Hono();
  app.route('/api', createAuthRoutes(
    async () => db,
    async () => {
      writeCount += 1;
    },
    async () => undefined,
    async () => undefined,
    async () => undefined,
    async ({ token }) => {
      verificationToken = token;
    }
  ));

  const registerResponse = await app.request('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Verified Spectator',
      email: 'verified@example.com',
      password: 'password123',
      role: 'spectator',
    }),
  });
  assert.equal(registerResponse.status, 201);
  assert.ok(verificationToken);

  const verifyResponse = await app.request('/api/verify-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: verificationToken }),
  });
  assert.equal(verifyResponse.status, 200);
  const body = await verifyResponse.json();
  assert.ok(body.user.emailVerifiedAt);
  assert.equal('emailVerificationTokenHash' in body.user, false);
  assert.equal(db.users[0].emailVerificationTokenHash, null);
  assert.equal(writeCount, 1);

  const reusedResponse = await app.request('/api/verify-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: verificationToken }),
  });
  assert.equal(reusedResponse.status, 400);
});
