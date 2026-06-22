import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { API_HOST, API_PORT, FRONTEND_URL } from './config/constants.js';
import {
  persistOfficialRaceResults,
  persistRaceEntryResult,
  readDb,
  writeDb,
} from './sqlDb.js';
import { createAdminRoutes } from './routes/adminRoutes.js';
import { createAuthRoutes } from './routes/authRoutes.js';
import { createJockeyRoutes } from './routes/jockeyRoutes.js';
import { createNotificationRoutes } from './routes/notificationRoutes.js';
import { createOwnerRoutes } from './routes/ownerRoutes.js';
import { createPublicRoutes } from './routes/publicRoutes.js';
import { createRefereeRoutes } from './routes/refereeRoutes.js';

// Hàm factory để lấy database mới nhất cho mỗi request
const getDb = () => readDb();

const app = new Hono();

// Cho phép CORS từ frontend
app.use(
  '*',
  cors({
    origin: [FRONTEND_URL, 'http://127.0.0.1:5173', 'http://localhost:5173'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// Đăng ký các nhóm route
app.route('/api', createPublicRoutes(getDb));
app.route('/api', createAuthRoutes(getDb, writeDb));
app.route('/api/owner', createOwnerRoutes(getDb, writeDb));
app.route('/api/jockey', createJockeyRoutes(getDb, writeDb));
app.route('/api/admin', createAdminRoutes(getDb, writeDb));
app.route(
  '/api/referee',
  createRefereeRoutes(getDb, writeDb, persistOfficialRaceResults, persistRaceEntryResult)
);
app.route('/api/notifications', createNotificationRoutes(getDb, writeDb));

// Bắt đầu lắng nghe kết nối tại host và port đã cấu hình
serve({ fetch: app.fetch, port: API_PORT, hostname: API_HOST }, () => {
  console.log(`API server running at http://${API_HOST}:${API_PORT}`);
});
