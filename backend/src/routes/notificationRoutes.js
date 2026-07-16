import { Hono } from 'hono';
import { authenticate } from '../services/authService.js';

// Ghi chú: Hàm này tạo nhóm route notification routes cho backend.
export const createNotificationRoutes = (getDb, writeDb) => {
  const app = new Hono();

  // Middleware xác thực cho tất cả notification routes
  app.use('*', async (c, next) => {
    const db = await getDb();
    const user = await authenticate(c.req.raw, db);
    if (!user) return c.json({ message: 'Not authenticated' }, 401);
    c.set('user', user);
    c.set('db', db);
    await next();
  });

  // Lấy danh sách thông báo của người dùng hiện tại
  app.get('/', (c) => {
    const user = c.get('user');
    const db = c.get('db');
    return c.json({
      notifications: (db.notifications || []).filter(
        (n) => n.userId === user.id
      ),
    });
  });

  // Đánh dấu một thông báo cụ thể là đã đọc
  app.post('/:id/read', async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const id = c.req.param('id');

    const notification = (db.notifications || []).find(
      (item) => item.id === id && item.userId === user.id
    );

    if (!notification) return c.json({ message: 'Notification not found' }, 404);

    notification.read = true;
    await writeDb(db);
    return c.json({ notification });
  });

  return app;
};
