import { randomUUID } from 'node:crypto';

// Ghi chú: Hàm này ghi lại lịch sử hành động trên race để phục vụ audit và truy vết.
export const recordRaceAction = (
  db,
  { raceId, userId, action, fromStatus, toStatus, details = '' }
) => {
  db.raceActionLogs = db.raceActionLogs || [];
  db.raceActionLogs.unshift({
    id: randomUUID(),
    raceId,
    userId,
    action,
    fromStatus: fromStatus || '',
    toStatus: toStatus || '',
    details,
    createdAt: new Date().toISOString(),
  });
};
