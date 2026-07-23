import { Hono } from 'hono';
import {
  FRONTEND_URL,
} from '../config/constants.js';
import { authenticate } from '../services/authService.js';
import {
  bootstrapTablesForScope,
  buildBootstrapPayload,
} from '../services/bootstrapService.js';
import { streamRaceUpdates } from '../services/liveRaceEvents.js';

// Ghi chú: Hàm này tạo nhóm route public routes cho backend.
export const createPublicRoutes = (getDb) => {
  const app = new Hono();

  // Xác thực người gọi rồi trả bootstrap payload đúng với scope được yêu cầu.
  const sendBootstrap = async (c, scope = 'full') => {
    const includeTables = scope === 'full' ? null : bootstrapTablesForScope(scope);
    if (scope !== 'full' && !includeTables) {
      return c.json({ message: 'Unknown bootstrap scope' }, 404);
    }

    const db = await getDb(includeTables ? { includeTables } : undefined);
    const user = await authenticate(c.req.raw, db);
    return c.json(buildBootstrapPayload(db, user, scope));
  };

  // Redirect trang gốc về frontend
  app.get('/', (c) => {
    return c.redirect(FRONTEND_URL, 302);
  });

  // Health check endpoint
  app.get('/health', (c) => c.json({ ok: true }));

  // SSE stream theo dõi đua trực tiếp
  app.get('/live/races/:raceId/events', (c) => {
    const raceId = c.req.param('raceId');
    return streamRaceUpdates(c.req.raw, raceId);
  });

  // Tải toàn bộ dữ liệu khởi động cho frontend
  app.get('/bootstrap', (c) => sendBootstrap(c));
  app.get('/bootstrap/:scope', (c) => sendBootstrap(c, c.req.param('scope')));

  return app;
};
