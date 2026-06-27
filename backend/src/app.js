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
import { broadcastRaceUpdate } from './services/liveRaceEvents.js';
export const createApp = ({
  getDb,
  writeDb,
  persistRaceEntryResult,
  persistRaceEntryReadiness,
  persistRefereeRaceAction,
  persistLoginSession,
  persistRegisteredUser,
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
  app.route('/api/admin', createAdminRoutes(getDb, writeDb));
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

  return app;
};

setInterval(async () => {
  try {
    const db = await getDb();
    const now = new Date();
    let changed = false;

    for (const race of db.races) {
      if (
        race.status === 'registration-open' &&
        race.registrationClosesAt &&
        now >= new Date(race.registrationClosesAt)
      ) {
        const entries = (db.raceEntries || []).filter(
          (e) => e.raceId === race.id && e.status === 'approved'
        );
        // Only auto-close if there's at least one participant (same rule as manual)
        if (entries.length > 0) {
          race.status = 'registration-closed';
          race.updatedAt = now.toISOString();
          changed = true;
          broadcastRaceUpdate(race.id);
        }
      }
    }

    if (changed) await writeDb(db);
  } catch (err) {
    console.error('Auto-close registration error:', err);
  }
}, 60_000); // runs every 60 seconds
