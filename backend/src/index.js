import { serve } from '@hono/node-server';
import { API_HOST, API_PORT } from './config/constants.js';
import {
  persistRefereeRaceAction,
  persistRaceEntryReadiness,
  persistRaceEntryResult,
  persistLoginSession,
  persistRegisteredUser,
  deleteSession,
  readDb,
  writeDb,
} from './sqlDb.js';
import { createApp } from './app.js';

const getDb = () => readDb();

const app = createApp({
  getDb,
  writeDb,
  persistRaceEntryResult,
  persistRaceEntryReadiness,
  persistRefereeRaceAction,
  persistLoginSession,
  persistRegisteredUser,
  deleteSession,
});

serve({ fetch: app.fetch, port: API_PORT, hostname: API_HOST }, () => {
  console.log(`API server running at http://${API_HOST}:${API_PORT}`);
});
