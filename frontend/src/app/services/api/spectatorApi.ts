import { request } from './client';
import type { BetRecord, RacePot, SpectatorWallet } from './types';

// Lấy số dư và lịch sử cược của khán giả hiện tại.
export const getSpectatorWallet = () =>
  request<SpectatorWallet>('/spectator/wallet');

// Lấy tổng pool cược theo cuộc đua và từng ngựa tham gia.
export const getRacePots = () =>
  request<{ pots: RacePot[]; entryTotals: Record<string, number> }>(
    '/spectator/pots',
  );

// Đặt cược một số credit vào ngựa được chọn.
export const placeBet = (raceEntryId: string, amount: number) =>
  request<{ bet: BetRecord; credits: number }>('/spectator/bets', {
    method: 'POST',
    body: JSON.stringify({ raceEntryId, amount }),
  });

// Hủy vé cược còn hợp lệ và hoàn credit cho khán giả.
export const cancelBet = (betId: string) =>
  request<{ ok: boolean; credits: number }>(`/spectator/bets/${betId}/cancel`, {
    method: 'POST',
  });
