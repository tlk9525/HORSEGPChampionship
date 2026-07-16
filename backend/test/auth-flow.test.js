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
  let starterTransactions;
  const app = new Hono();
  app.route('/api', createAuthRoutes(
    async () => db,
    async () => undefined,
    async () => undefined,
    async (user, _notifications, creditTransactions) => {
      persistedUser = user;
      starterTransactions = creditTransactions;
    },
    async () => undefined
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
  assert.equal(persistedUser.credits, 100);
  assert.equal(persistedUser.loginStreak, 0);
  assert.equal(persistedUser.lastLoginRewardDate, null);
  assert.equal(starterTransactions.length, 1);
  assert.equal(starterTransactions[0].type, 'starter_bonus');
  assert.equal(starterTransactions[0].balanceAfter, 100);
  assert.equal(JSON.stringify(await response.json()).includes('password'), false);
});

test('spectator login claims the daily bonus only once for the current day', async () => {
  const password = await bcrypt.hash('password123', 4);
  const now = new Date().toISOString();
  const db = {
    users: [{
      id: 'spectator-daily',
      name: 'Daily Spectator',
      email: 'daily@example.com',
      password,
      role: 'spectator',
      status: 'active',
      credits: 100,
      loginStreak: 0,
      lastLoginRewardDate: null,
      createdAt: now,
      updatedAt: now,
    }],
    wallets: [{ userId: 'spectator-daily', credits: 100, updatedAt: now }],
    creditTransactions: [],
    sessions: [],
    notifications: [],
  };
  let writes = 0;
  const app = new Hono();
  app.route('/api', createAuthRoutes(
    async () => db,
    async () => { writes += 1; }
  ));

  const loginRequest = () => app.request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'daily@example.com', password: 'password123' }),
  });

  const first = await loginRequest();
  const firstBody = await first.json();
  const second = await loginRequest();
  const secondBody = await second.json();

  assert.equal(first.status, 200);
  assert.deepEqual(firstBody.dailyReward, { claimed: true, amount: 10, streak: 1 });
  assert.equal(firstBody.user.credits, 110);
  assert.equal(second.status, 200);
  assert.equal(secondBody.dailyReward.claimed, false);
  assert.equal(secondBody.dailyReward.amount, 0);
  assert.equal(secondBody.user.credits, 110);
  assert.equal(db.creditTransactions.filter((transaction) => transaction.type === 'daily_login_bonus').length, 1);
  assert.equal(writes, 2);
});
