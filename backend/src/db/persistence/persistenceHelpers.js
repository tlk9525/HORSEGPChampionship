// Trả về thời điểm hiện tại theo định dạng ISO để dùng thống nhất khi ghi database.
export const nowIso = () => new Date().toISOString();

// Cộng số ngày vào một thời điểm rồi trả về kết quả theo định dạng ISO.
export const addDaysIso = (dateValue, days) =>
  new Date(
    new Date(dateValue || nowIso()).getTime() + days * 24 * 60 * 60 * 1000,
  ).toISOString();

// Chuẩn hóa createdAt và updatedAt của một row với thời điểm dự phòng.
export const rowTimestamps = (row, fallbackCreatedAt = nowIso()) => ({
  createdAt: row.createdAt || fallbackCreatedAt,
  updatedAt: row.updatedAt || row.createdAt || fallbackCreatedAt,
});

// Ghi notification theo cùng một mapping ở mọi transaction row-level.
export const insertNotifications = async (
  client,
  notifications = [],
  { ignoreConflicts = true } = {},
) => {
  for (const notification of notifications) {
    await client.query(
      `INSERT INTO "notifications" (
        "id", "userId", "type", "title", "message", "isRead", "createdAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ${ignoreConflicts ? 'ON CONFLICT ("id") DO NOTHING' : ''}`,
      [
        notification.id,
        notification.userId,
        notification.type || 'general',
        notification.title || '',
        notification.message || '',
        Boolean(notification.read),
        notification.createdAt || nowIso(),
      ],
    );
  }
};

// Ghi audit log theo cùng một mapping ở các transaction xử lý race.
export const insertRaceActionLogs = async (client, actionLogs = []) => {
  for (const log of actionLogs) {
    await client.query(
      `INSERT INTO "raceActionLogs" (
        "id", "raceId", "userId", "action", "fromStatus", "toStatus", "details", "createdAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT ("id") DO NOTHING`,
      [
        log.id,
        log.raceId,
        log.userId || null,
        log.action,
        log.fromStatus || null,
        log.toStatus || null,
        log.details || '',
        log.createdAt || nowIso(),
      ],
    );
  }
};
