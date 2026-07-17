import test from 'node:test';
import assert from 'node:assert/strict';
import {
  racePotTotal,
  raceStartMs,
  refundRaceBets,
  settleRaceBets,
} from '../src/services/bettingService.js';

const buildSettlementDb = () => {
  const now = new Date().toISOString();

  return {
    users: [
      {
        id: 'spectator-a',
        role: 'spectator',
        credits: 50,
        updatedAt: now,
      },
      {
        id: 'spectator-b',
        role: 'spectator',
        credits: 20,
        updatedAt: now,
      },
      {
        id: 'spectator-c',
        role: 'spectator',
        credits: 30,
        updatedAt: now,
      },
    ],
    bets: [
      {
        id: 'bet-a',
        userId: 'spectator-a',
        raceId: 'race-1',
        raceEntryId: 'entry-winner',
        amount: 20,
        status: 'pending',
      },
      {
        id: 'bet-b',
        userId: 'spectator-b',
        raceId: 'race-1',
        raceEntryId: 'entry-winner',
        amount: 30,
        status: 'pending',
      },
      {
        id: 'bet-c',
        userId: 'spectator-c',
        raceId: 'race-1',
        raceEntryId: 'entry-loser',
        amount: 50,
        status: 'pending',
      },
    ],
    notifications: [],
    wallets: [],
    creditTransactions: [],
    raceEntries: [],
    races: [],
    horses: [],
  };
};

test('racePotTotal sums pending bets for a race', () => {
  const db = buildSettlementDb();
  assert.equal(racePotTotal(db, 'race-1'), 100);
});

test('settleRaceBets splits the pot among winning horse bettors', () => {
  const db = buildSettlementDb();
  const entries = [
    {
      id: 'entry-winner',
      position: 1,
      disqualified: false,
      preRaceStatus: 'ready',
    },
    {
      id: 'entry-loser',
      position: 2,
      disqualified: false,
      preRaceStatus: 'ready',
    },
  ];

  const result = settleRaceBets(db, 'race-1', entries);

  assert.equal(result.pot, 100);
  assert.equal(result.settled, 3);
  assert.equal(result.winnerEntryId, 'entry-winner');

  const betA = db.bets.find((bet) => bet.id === 'bet-a');
  const betB = db.bets.find((bet) => bet.id === 'bet-b');
  const betC = db.bets.find((bet) => bet.id === 'bet-c');

  assert.equal(betA.status, 'won');
  assert.equal(betB.status, 'won');
  assert.equal(betC.status, 'lost');
  assert.equal(betA.payout + betB.payout, 100);
  assert.equal(betA.payout, 40);
  assert.equal(betB.payout, 60);
  assert.equal(betC.payout, 0);

  assert.equal(db.users.find((user) => user.id === 'spectator-a').credits, 90);
  assert.equal(db.users.find((user) => user.id === 'spectator-b').credits, 80);
  assert.equal(db.users.find((user) => user.id === 'spectator-c').credits, 30);
  assert.equal(
    db.creditTransactions.filter((transaction) => transaction.type === 'bet_payout').length,
    2
  );
  assert.equal(
    db.creditTransactions.reduce((sum, transaction) => sum + transaction.amount, 0),
    100
  );
});

test('settleRaceBets marks all bets lost when nobody picked the winner', () => {
  const db = buildSettlementDb();
  db.bets = db.bets.map((bet) =>
    bet.raceEntryId === 'entry-winner'
      ? { ...bet, raceEntryId: 'entry-other' }
      : bet
  );

  settleRaceBets(db, 'race-1', [
    {
      id: 'entry-winner',
      position: 1,
      disqualified: false,
      preRaceStatus: 'ready',
    },
  ]);

  assert.ok(db.bets.every((bet) => bet.status === 'lost'));
  assert.ok(db.bets.every((bet) => bet.payout === 0));
});

test('raceStartMs parses date and time as Vietnam time (+07:00)', () => {
  const ms = raceStartMs({ date: '2099-01-15', time: '14:30' });
  assert.equal(ms, Date.parse('2099-01-15T14:30:00+07:00'));
});

test('refundRaceBets returns credits when a race is cancelled', () => {
  const db = buildSettlementDb();
  const result = refundRaceBets(db, 'race-1', 'Feature Race was cancelled');

  assert.equal(result.refunded, 3);
  assert.equal(db.users.find((user) => user.id === 'spectator-a').credits, 70);
  assert.equal(db.users.find((user) => user.id === 'spectator-b').credits, 50);
  assert.equal(db.users.find((user) => user.id === 'spectator-c').credits, 80);
  assert.ok(db.bets.every((bet) => bet.status === 'refunded'));
  assert.equal(db.bets.find((bet) => bet.id === 'bet-a').payout, 20);
  assert.equal(racePotTotal(db, 'race-1'), 0);
  assert.equal(db.creditTransactions.length, 3);
  assert.ok(db.creditTransactions.every((transaction) => transaction.type === 'bet_refunded'));
  assert.equal(
    db.creditTransactions.reduce((sum, transaction) => sum + transaction.amount, 0),
    100
  );
});
