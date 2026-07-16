import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { secureHeaders } from 'hono/secure-headers';
import { FRONTEND_URL } from './config/constants.js';
import { createAdminRoutes } from './routes/adminRoutes.js';
import { createAuthRoutes } from './routes/authRoutes.js';
import { createJockeyRoutes } from './routes/jockeyRoutes.js';
import { createNotificationRoutes } from './routes/notificationRoutes.js';
import { createOwnerRoutes } from './routes/ownerRoutes.js';
import { createPublicRoutes } from './routes/publicRoutes.js';
import { createRefereeRoutes } from './routes/refereeRoutes.js';
import { createSpectatorRoutes } from './routes/spectatorRoutes.js';

// Ghi chú: Hàm này khởi tạo Hono app, gắn middleware, route và xử lý lỗi chung cho backend.
export const createApp = ({
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
}) => {
  const app = new Hono();

  app.use('*', secureHeaders());
  app.use(
    '*',
    bodyLimit({
      maxSize: 1024 * 1024,
      onError: (c) => c.json({ message: 'Request body is too large' }, 413),
    })
  );
  app.use(
    '*',
    cors({
      origin: [
        FRONTEND_URL.replace(/\/$/, ''),
        'http://127.0.0.1:5173',
        'http://localhost:5173',
      ],
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })
  );

  app.onError((error, c) => {
    console.error(error);
    return c.json({ message: 'Internal server error' }, 500);
  });

  app.route('/api', createPublicRoutes(getDb));
  app.route(
    '/api',
    createAuthRoutes(
      getDb,
      writeDb,
      persistLoginSession,
      persistRegisteredUser,
      deleteSession
    )
  );
  app.route('/api/owner', createOwnerRoutes(getDb, writeDb));
  app.route('/api/jockey', createJockeyRoutes(getDb, writeDb));
  app.route('/api/admin', createAdminRoutes(getDb, writeDb, persistAdminRaceAction, persistSystemSettings));
  app.route(
    '/api/referee',
    createRefereeRoutes(
      getDb,
      writeDb,
      persistRaceEntryResult,
      persistRaceEntryReadiness,
      persistRefereeRaceAction
    )
  );
  app.route('/api/notifications', createNotificationRoutes(getDb, writeDb));
  app.route('/api/spectator', createSpectatorRoutes(getDb, writeDb));

  return app;
};
