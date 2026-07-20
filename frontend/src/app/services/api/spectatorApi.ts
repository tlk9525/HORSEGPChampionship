import { request } from './client';
import type { BetRecord, RacePot, SpectatorWallet } from './types';

export const getSpectatorWallet = () =>
  request<SpectatorWallet>('/spectator/wallet');

export const getRacePots = () =>
  request<{ pots: RacePot[]; entryTotals: Record<string, number> }>(
    '/spectator/pots',
  );

export const placeBet = (raceEntryId: string, amount: number) =>
  request<{ bet: BetRecord; credits: number }>('/spectator/bets', {
    method: 'POST',
    body: JSON.stringify({ raceEntryId, amount }),
  });

export const cancelBet = (betId: string) =>
  request<{ ok: boolean; credits: number }>(`/spectator/bets/${betId}/cancel`, {
    method: 'POST',
  });
