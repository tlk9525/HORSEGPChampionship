import { useMemo, useState } from 'react';

import {
  TrendingUp,
  Trophy,
  Target,
  Award,
  Wallet,
  Clock3,
  DollarSign,
  Check,
  CircleDollarSign,
} from 'lucide-react';

import {
  PayPalScriptProvider,
  PayPalButtons,
} from '@paypal/react-paypal-js';
import {
  predictionMarkets,
  resultPipeline,
  statusLabel,
} from '../data/tournamentWorkflow';
import NotificationsPanel from './NotificationsPanel';

export default function PredictionPage() {
  const upcomingRaces = predictionMarkets.map((market) => ({
    id: market.id,
    name: market.raceName,
    date: market.window,
    time: 'Prediction window',
    status: market.status,
    horses: market.horses,
  }));

  const leaderboard = [
    {
      rank: 1,
      user: 'RacingPro2026',
      points: 2450,
      predictions: 45,
      accuracy: 82,
    },

    {
      rank: 2,
      user: 'HorseWhisperer',
      points: 2380,
      predictions: 48,
      accuracy: 79,
    },

    {
      rank: 3,
      user: 'SpeedDemon',
      points: 2290,
      predictions: 42,
      accuracy: 81,
    },

    {
      rank: 4,
      user: 'TrackMaster',
      points: 2150,
      predictions: 50,
      accuracy: 75,
    },

    {
      rank: 5,
      user: 'You',
      points: 1850,
      predictions: 38,
      accuracy: 73,
    },
  ];

  const [wallet, setWallet] =
    useState(5000);

  const [depositAmount, setDepositAmount] =
    useState('');

  const [selectedHorse, setSelectedHorse] =
    useState<any>(null);

  const [betAmount, setBetAmount] =
    useState('');

  const [transactions, setTransactions] =
    useState<any[]>([
      {
        type: 'Deposit',
        amount: 1000,
        date: 'Today',
      },

      {
        type: 'Win Reward',
        amount: 250,
        date: 'Yesterday',
      },
    ]);

  const [myBets, setMyBets] = useState<any[]>([
    {
      race: 'Thunder Valley Sprint',
      horse: 'Midnight Storm',
      amount: 100,
      odds: 2.5,
      status: 'won',
      payout: 250,
    },

    {
      race: 'Golden Gate Classic',
      horse: 'Silver Bullet',
      amount: 50,
      odds: 3.2,
      status: 'lost',
      payout: 0,
    },
  ]);

  const potentialWin = useMemo(() => {
    if (!selectedHorse || !betAmount)
      return 0;

    return (
      Number(betAmount) *
      Number(selectedHorse.odds)
    ).toFixed(2);
  }, [selectedHorse, betAmount]);

  const placeBet = () => {
    if (!selectedHorse) {
      alert('Please select a horse');
      return;
    }

    if (!betAmount) {
      alert('Please enter prediction stake');
      return;
    }

    const amount = Number(betAmount);

    if (amount > wallet) {
      alert('Insufficient balance');
      return;
    }

    setWallet((prev) => prev - amount);

    setMyBets((prev) => [
      {
        race: selectedHorse.raceName,
        horse: selectedHorse.name,
        amount,
        odds: selectedHorse.odds,
        status: 'pending',
        payout: Number(potentialWin),
      },

      ...prev,
    ]);

    setTransactions((prev) => [
      {
        type: 'Bet',
        amount: -amount,
        date: 'Now',
      },

      ...prev,
    ]);

    alert(
      `Prediction submitted for ${selectedHorse.name}`
    );

    setBetAmount('');
  };

  return (
    <div className="min-h-screen bg-black pt-24 pb-12 text-white">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
        <NotificationsPanel />

        {/* HEADER */}

        <div className="flex items-center justify-between mb-10">

          <div>
              <h1 className="text-5xl font-black mb-3">
              Race Predictions
            </h1>

            <p className="text-gray-400 text-lg">
              Spectators predict results after Owner and Jockey confirmations. Rewards are calculated only after Admin publishes official results.
            </p>
          </div>

          <div className="text-right">
            <div className="text-green-500 text-4xl font-black">
              ${wallet}
            </div>

            <div className="text-gray-400">
              Wallet Balance
            </div>
          </div>
        </div>

        {/* STATS */}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">

          <div className="bg-[#121212] border border-white/10 rounded-3xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-[#e10600]/10 rounded-2xl flex items-center justify-center">
                <Trophy className="text-[#e10600]" />
              </div>

              <div>
                <div className="text-gray-400 text-sm">
                  Total Points
                </div>

                <div className="text-3xl font-black">
                  1,850
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#121212] border border-white/10 rounded-3xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-[#e10600]/10 rounded-2xl flex items-center justify-center">
                  <Target className="text-[#e10600]" />
              </div>

              <div>
                <div className="text-gray-400 text-sm">
                  Prediction Accuracy
                </div>

                <div className="text-3xl font-black text-[#e10600]">
                  73%
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#121212] border border-white/10 rounded-3xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-[#e10600]/10 rounded-2xl flex items-center justify-center">
                <TrendingUp className="text-[#e10600]" />
              </div>

              <div>
                <div className="text-gray-400 text-sm">
                  Reward Queue
                </div>

                <div className="text-3xl font-black">
                  {resultPipeline.rewardsCalculated ? 'Paid' : 'Pending'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#121212] border border-white/10 rounded-3xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-[#e10600]/10 rounded-2xl flex items-center justify-center">
                <Award className="text-[#e10600]" />
              </div>

              <div>
                <div className="text-gray-400 text-sm">
                  Spectator Rank
                </div>

                <div className="text-3xl font-black">
                  #5
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* LEFT */}

          <div className="lg:col-span-2 space-y-8">

            {/* RACES */}

            <div className="bg-[#121212] border border-white/10 rounded-3xl p-8">

              <div className="flex items-center justify-between mb-8">

                <h2 className="text-3xl font-black">
                  Prediction Arena
                </h2>

                <div className="flex items-center gap-2 text-red-500 animate-pulse font-bold">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  LOCKED
                </div>
              </div>

              <div className="space-y-8">

                {upcomingRaces.map((race) => (

                  <div
                    key={race.id}
                    className="bg-black border border-white/10 rounded-3xl p-6"
                  >

                    <div className="flex items-center justify-between mb-6">

                      <div>

                        <div className="flex items-center gap-3 mb-2">

                          <h3 className="text-2xl font-bold">
                            {race.name}
                          </h3>

                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                              race.status === 'live'
                                ? 'bg-red-600/20 text-red-500 border border-red-500/30'
                                : 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/30'
                            }`}
                          >
                            {statusLabel(race.status)}
                          </span>
                        </div>

                        <div className="text-gray-400 flex items-center gap-2">
                          <Clock3 className="w-4 h-4" />
                          {race.date} • {race.time}
                        </div>
                      </div>

                      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl px-5 py-4">
                        <div className="text-yellow-500 text-sm">
                          Predictions open after
                        </div>

                        <div className="text-2xl font-black">
                          race confirmations
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                      {race.horses.map((horse, index) => {

                        const isSelected =
                          selectedHorse?.name ===
                          horse.name;

                        return (

                          <button
                            key={index}
                            onClick={() =>
                              setSelectedHorse({
                                ...horse,
                                raceId: race.id,
                                raceName: race.name,
                              })
                            }
                            className={`rounded-2xl border p-5 transition-all text-left ${
                              isSelected
                                ? 'border-[#e10600] bg-[#e10600]/10'
                                : 'border-white/10 bg-[#121212] hover:border-[#e10600]/50'
                            }`}
                          >

                            <div className="flex items-center justify-between">

                              <div>

                                <div className="text-xl font-bold">
                                  {horse.name}
                                </div>

                                <div className="text-gray-400 mt-2">
                                  Odds: {horse.odds}x
                                </div>
                              </div>

                              <div
                                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                                  isSelected
                                    ? 'border-[#e10600] bg-[#e10600]'
                                    : 'border-white/20'
                                }`}
                              >
                                {isSelected && (
                                  <Check className="w-5 h-5" />
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BET HISTORY */}

            <div className="bg-[#121212] border border-white/10 rounded-3xl p-8">

              <div className="flex items-center gap-3 mb-8">

                <CircleDollarSign className="text-[#e10600]" />

                <h2 className="text-3xl font-black">
                  My Prediction History
                </h2>
              </div>

              <div className="space-y-4">

                {myBets.map((bet, index) => (

                  <div
                    key={index}
                    className="bg-black border border-white/10 rounded-2xl p-5"
                  >

                    <div className="flex items-center justify-between">

                      <div>

                        <div className="text-xl font-bold mb-2">
                          {bet.race}
                        </div>

                        <div className="text-gray-400">
                          Horse: {bet.horse}
                        </div>
                      </div>

                      <div className="flex items-center gap-8">

                        <div>
                          <div className="text-gray-400 text-sm">
                            Stake
                          </div>

                          <div className="font-bold">
                            ${bet.amount}
                          </div>
                        </div>

                        <div>
                          <div className="text-gray-400 text-sm">
                            Odds
                          </div>

                          <div className="text-[#e10600] font-bold">
                            {bet.odds}x
                          </div>
                        </div>

                        <div>
                          <div className="text-gray-400 text-sm">
                            Status
                          </div>

                          <div
                            className={`font-bold ${
                              bet.status === 'won'
                                ? 'text-green-500'
                                : bet.status === 'lost'
                                ? 'text-red-500'
                                : 'text-yellow-500'
                            }`}
                          >
                            {bet.status}
                          </div>
                        </div>

                        <div>
                          <div className="text-gray-400 text-sm">
                            Payout
                          </div>

                          <div className="text-green-500 font-black">
                            ${bet.payout}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT */}

          <div className="space-y-8">

            {/* BET SLIP */}

            <div className="bg-[#121212] border border-white/10 rounded-3xl p-8 sticky top-24">

              <div className="flex items-center gap-3 mb-8">

                <DollarSign className="text-[#e10600]" />

                <h2 className="text-3xl font-black">
                  Prediction Slip
                </h2>
              </div>

              {selectedHorse ? (

                <div className="space-y-6">

                  <div className="bg-black border border-white/10 rounded-2xl p-5">

                    <div className="text-gray-400 text-sm mb-2">
                      Selected Horse
                    </div>

                    <div className="text-2xl font-black text-[#e10600]">
                      {selectedHorse.name}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">

                    <div className="bg-black border border-white/10 rounded-2xl p-5">

                      <div className="text-gray-400 text-sm mb-2">
                      Multiplier
                      </div>

                      <div className="text-2xl font-black">
                        {selectedHorse.odds}x
                      </div>
                    </div>

                    <div className="bg-black border border-white/10 rounded-2xl p-5">

                      <div className="text-gray-400 text-sm mb-2">
                      Potential Reward
                      </div>

                      <div className="text-2xl font-black text-green-500">
                        ${potentialWin}
                      </div>
                    </div>
                  </div>

                  <div>

                    <label className="block text-sm text-gray-400 mb-3">
                      Prediction Stake
                    </label>

                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) =>
                        setBetAmount(
                          e.target.value
                        )
                      }
                      placeholder="Enter amount"
                      className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[#e10600]"
                    />
                  </div>

                  <button
                    onClick={placeBet}
                    className="w-full py-4 bg-[#e10600] hover:bg-[#c00500] rounded-2xl text-lg font-black transition-all"
                  >
                    Submit Prediction
                  </button>
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500">
                  Select a horse to predict the winner.
                </div>
              )}
            </div>

            {/* PAYPAL SANDBOX */}

            <div className="bg-[#121212] border border-white/10 rounded-3xl p-8">

              <div className="flex items-center gap-3 mb-8">

                <Wallet className="text-[#e10600]" />

                <h2 className="text-3xl font-black">
                  Deposit Funds
                </h2>
              </div>

              <div className="space-y-5">

                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) =>
                    setDepositAmount(
                      e.target.value
                    )
                  }
                  placeholder="Enter amount"
                  className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[#e10600]"
                />

                <PayPalScriptProvider
                  options={{
                    clientId:
                      'YOUR_SANDBOX_CLIENT_ID',
                    currency: 'USD',
                    intent: 'capture',
                  }}
                >

                  <PayPalButtons
                    style={{
                      layout: 'vertical',
                      color: 'gold',
                      shape: 'rect',
                      label: 'paypal',
                    }}

                    createOrder={(
                      _,
                      actions
                    ) => {
                      return actions.order.create({
                        purchase_units: [
                          {
                            amount: {
                              value:
                                depositAmount ||
                                '1',
                            },
                          },
                        ],
                      });
                    }}

                    onApprove={async (
                      _,
                      actions
                    ) => {

                      const details =
                        await actions.order?.capture();

                      alert(
                        `Payment completed by ${details?.payer?.name?.given_name}`
                      );

                      const amount =
                        Number(
                          depositAmount
                        );

                      setWallet(
                        (prev) =>
                          prev + amount
                      );

                      setTransactions(
                        (prev) => [
                          {
                            type:
                              'PayPal Deposit',

                            amount,

                            date: 'Now',
                          },

                          ...prev,
                        ]
                      );

                      setDepositAmount('');
                    }}

                    onError={(err) => {
                      console.error(err);

                      alert(
                        'PayPal payment failed'
                      );
                    }}
                  />
                </PayPalScriptProvider>

                <div className="bg-green-600/10 border border-green-500/20 rounded-2xl p-5">

                  <div className="text-green-500 font-bold mb-2">
                    SANDBOX MODE
                  </div>

                  <div className="text-sm text-gray-300">
                    Use PayPal Sandbox test accounts.
                  </div>
                </div>
              </div>
            </div>

            {/* LEADERBOARD */}

            <div className="bg-[#121212] border border-white/10 rounded-3xl p-8">

              <div className="flex items-center gap-3 mb-8">

                <Trophy className="text-[#e10600]" />

                <h2 className="text-3xl font-black">
                  Global Leaderboard
                </h2>
              </div>

              <div className="space-y-4">

                {leaderboard.map((entry) => (

                  <div
                    key={entry.rank}
                    className={`rounded-2xl p-5 border ${
                      entry.user === 'You'
                        ? 'border-[#e10600] bg-[#e10600]/10'
                        : 'border-white/10 bg-black'
                    }`}
                  >

                    <div className="flex items-center gap-4">

                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-black ${
                          entry.rank === 1
                            ? 'bg-yellow-400 text-black'
                            : entry.rank === 2
                            ? 'bg-gray-300 text-black'
                            : entry.rank === 3
                            ? 'bg-orange-500 text-black'
                            : 'bg-[#1a1a1a]'
                        }`}
                      >
                        {entry.rank}
                      </div>

                      <div className="flex-1">

                        <div className="font-bold text-lg">
                          {entry.user}
                        </div>

                        <div className="text-gray-400 text-sm">
                          {entry.predictions}{' '}
                          predictions •{' '}
                          {entry.accuracy}%
                          accuracy
                        </div>
                      </div>

                      <div className="text-right">

                        <div className="text-[#e10600] text-xl font-black">
                          {entry.points}
                        </div>

                        <div className="text-gray-400 text-xs">
                          pts
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TRANSACTIONS */}

            <div className="bg-[#121212] border border-white/10 rounded-3xl p-8">

              <h2 className="text-3xl font-black mb-8">
                Transactions
              </h2>

              <div className="space-y-4">

                {transactions.map((tx, index) => (

                  <div
                    key={index}
                    className="bg-black border border-white/10 rounded-2xl p-5 flex items-center justify-between"
                  >

                    <div>

                      <div className="font-bold">
                        {tx.type}
                      </div>

                      <div className="text-gray-400 text-sm">
                        {tx.date}
                      </div>
                    </div>

                    <div
                      className={`font-black text-xl ${
                        tx.amount > 0
                          ? 'text-green-500'
                          : 'text-red-500'
                      }`}
                    >
                      {tx.amount > 0
                        ? '+'
                        : ''}
                      ${tx.amount}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
