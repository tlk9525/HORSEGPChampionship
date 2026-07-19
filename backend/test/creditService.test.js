import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CREDIT_TRANSACTION_TYPES,
  awardDailyLoginBonus,
  grantStarterCredits,
} from '../src/services/creditService.js';

const buildDb = () => ({
  users: [
    {
      id: 'spectator-1',
      role: 'spectator',
      credits: 0,
      loginStreak: 0,
      lastLoginRewardDate: null,
    },
  ],
  wallets: [],
  creditTransactions: [],
});

test('new spectator receives 100 starter credits with a ledger entry', () => {
  const db = buildDb();
  grantStarterCredits(db, 'spectator-1', 100, '2026-07-16T02:00:00.000Z');

  assert.equal(db.users[0].credits, 100);
  assert.equal(db.wallets[0].credits, 100);
  assert.equal(db.creditTransactions[0].type, CREDIT_TRANSACTION_TYPES.STARTER_BONUS);
  assert.equal(db.creditTransactions[0].amount, 100);
  assert.equal(db.creditTransactions[0].balanceAfter, 100);
});

test('daily login reward claims once per Vietnam calendar day', () => {
  const db = buildDb();
  grantStarterCredits(db, 'spectator-1', 100, '2026-07-15T02:00:00.000Z');

  const first = awardDailyLoginBonus(db, 'spectator-1', new Date('2026-07-16T02:00:00.000Z'));
  const repeated = awardDailyLoginBonus(db, 'spectator-1', new Date('2026-07-16T12:00:00.000Z'));

  assert.deepEqual(first, {
    claimed: true,
    amount: 10,
    streak: 1,
    rewardDate: '2026-07-16',
  });
  assert.deepEqual(repeated, {
    claimed: false,
    amount: 0,
    streak: 1,
    rewardDate: '2026-07-16',
  });
  assert.equal(db.users[0].credits, 110);
  assert.equal(
    db.creditTransactions.filter(
      (transaction) => transaction.type === CREDIT_TRANSACTION_TYPES.DAILY_LOGIN_BONUS
    ).length,
    1
  );
});

test('PostgreSQL DATE object does not grant the same daily bonus twice', () => {
  const db = buildDb();
  db.users[0].credits = 110;
  db.users[0].loginStreak = 1;
  db.users[0].lastLoginRewardDate = new Date('2026-07-16T17:00:00.000Z');

  const repeated = awardDailyLoginBonus(
    db,
    'spectator-1',
    new Date('2026-07-17T06:00:00.000Z')
  );

  assert.deepEqual(repeated, {
    claimed: false,
    amount: 0,
    streak: 1,
    rewardDate: '2026-07-17',
  });
  assert.equal(db.users[0].credits, 110);
  assert.equal(db.creditTransactions.length, 0);
});

test('consecutive login increases reward and a missed day resets the streak', () => {
  const db = buildDb();
  grantStarterCredits(db, 'spectator-1', 100, '2026-07-15T02:00:00.000Z');

  awardDailyLoginBonus(db, 'spectator-1', new Date('2026-07-16T02:00:00.000Z'));
  const second = awardDailyLoginBonus(db, 'spectator-1', new Date('2026-07-17T02:00:00.000Z'));
  const reset = awardDailyLoginBonus(db, 'spectator-1', new Date('2026-07-19T02:00:00.000Z'));

  assert.equal(second.amount, 15);
  assert.equal(second.streak, 2);
  assert.equal(reset.amount, 10);
  assert.equal(reset.streak, 1);
  assert.equal(db.users[0].credits, 135);
});

test('daily reward is capped at 50 credits', () => {
  const db = buildDb();
  db.users[0].credits = 100;
  db.users[0].loginStreak = 20;
  db.users[0].lastLoginRewardDate = '2026-07-15';

  const reward = awardDailyLoginBonus(db, 'spectator-1', new Date('2026-07-16T02:00:00.000Z'));

  assert.equal(reward.amount, 50);
  assert.equal(reward.streak, 21);
  assert.equal(db.users[0].credits, 150);
});
