import { serve } from '@hono/node-server';
import { API_HOST, API_PORT } from './config/constants.js';
import {
  persistAdminRaceAction,
  persistRefereeRaceAction,
  persistRaceEntryReadiness,
  persistRaceEntryResult,
  persistLoginSession,
  persistRegisteredUser,
  persistSystemSettings,
  deleteSession,
  readDb,
  writeDb,
} from './sqlDb.js';
import { createApp } from './app.js';

// Ghi chú: Hàm này đọc dữ liệu hiện tại để các route dùng chung một nguồn dữ liệu.
const getDb = () => readDb();

const app = createApp({
  getDb,
  writeDb,
  persistRaceEntryResult,
  persistRaceEntryReadiness,
  persistRefereeRaceAction,
  persistAdminRaceAction,
  persistLoginSession,
  persistRegisteredUser,
  persistSystemSettings,
  deleteSession,
});

serve({ fetch: app.fetch, port: API_PORT, hostname: API_HOST }, () => {
  console.log(`API server running at http://${API_HOST}:${API_PORT}`);
});
