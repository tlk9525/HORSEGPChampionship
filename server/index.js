import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', 'data', 'db.json');
const port = Number(process.env.API_PORT || 4000);

const readDb = async () => JSON.parse(await readFile(dbPath, 'utf8'));
const writeDb = async (db) => writeFile(dbPath, JSON.stringify(db, null, 2));

const publicUser = ({ password, ...user }) => user;

const send = (res, status, body) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'http://127.0.0.1:5173',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  });
  res.end(JSON.stringify(body));
};

const readBody = async (req) => {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) return {};

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

const authenticate = async (req, db) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const session = db.sessions.find((item) => item.token === token);

  if (!session) return null;

  const user = db.users.find((item) => item.id === session.userId);
  return user ? publicUser(user) : null;
};

const requireRole = async (req, db, roles) => {
  const user = await authenticate(req, db);

  if (!user || !roles.includes(user.role)) {
    return null;
  }

  return user;
};

const createNotification = (db, userId, title, message) => {
  db.notifications = db.notifications || [];
  db.notifications.unshift({
    id: randomUUID(),
    userId,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  });
};

const ownerName = (db, userId) =>
  db.users.find((user) => user.id === userId)?.name || 'Unknown Owner';

const formatApprovals = (db) => [
  ...db.horses
    .filter((horse) => horse.status === 'pending')
    .map((horse) => ({
      id: horse.id,
      entityType: 'horse',
      type: 'Horse Registration',
      name: horse.name,
      detail: `Owner: ${ownerName(db, horse.ownerUserId)}`,
      date: db.tournaments[0]?.registrationWindow || 'Registration window',
      targetUserId: horse.ownerUserId,
    })),
  ...db.users
    .filter((user) => user.role === 'jockey' && user.status === 'pending')
    .map((user) => ({
      id: user.id,
      entityType: 'jockey',
      type: 'Jockey Application',
      name: user.name,
      detail: 'Account approval required',
      date: db.tournaments[0]?.registrationWindow || 'Registration window',
      targetUserId: user.id,
    })),
];

const publicJockeyProfiles = (db) =>
  (db.jockeyProfiles || [])
    .map((profile) => {
      const user = db.users.find((item) => item.id === profile.userId);

      return {
        ...profile,
        jockeyName: user?.name || 'Unknown Jockey',
        jockeyEmail: user?.email || '',
        userStatus: user?.status || 'unknown',
      };
    })
    .filter(
      (profile) =>
        profile.status === 'published' &&
        profile.userStatus === 'active'
    );

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    send(res, 204, {});
    return;
  }

  try {
    const db = await readDb();
    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(302, {
        Location: 'http://127.0.0.1:5173/',
        'Access-Control-Allow-Origin': 'http://127.0.0.1:5173',
      });
      res.end();
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/health') {
      send(res, 200, { ok: true });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/me') {
      const user = await authenticate(req, db);
      send(res, user ? 200 : 401, user ? { user } : { message: 'Not authenticated' });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/login') {
      const { email, password } = await readBody(req);
      const user = db.users.find(
        (item) =>
          item.email.toLowerCase() === String(email || '').toLowerCase() &&
          item.password === password &&
          item.status === 'active'
      );

      if (!user) {
        send(res, 401, { message: 'Invalid email or password' });
        return;
      }

      const token = randomUUID();
      db.sessions.push({
        token,
        userId: user.id,
        createdAt: new Date().toISOString(),
      });
      await writeDb(db);

      send(res, 200, { token, user: publicUser(user) });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/register') {
      const { name, email, password, role } = await readBody(req);
      const allowedRoles = ['admin', 'owner', 'jockey', 'referee', 'spectator'];

      if (!name || !email || !password || !allowedRoles.includes(role)) {
        send(res, 400, { message: 'Name, email, password and role are required' });
        return;
      }

      const exists = db.users.some(
        (item) => item.email.toLowerCase() === String(email).toLowerCase()
      );

      if (exists) {
        send(res, 409, { message: 'Email already exists' });
        return;
      }

      const user = {
        id: randomUUID(),
        name,
        email,
        password,
        role,
        status: 'active',
      };
      db.users.push(user);
      await writeDb(db);

      send(res, 201, { user: publicUser(user) });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/logout') {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : '';
      db.sessions = db.sessions.filter((item) => item.token !== token);
      await writeDb(db);
      send(res, 200, { ok: true });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/bootstrap') {
      send(res, 200, {
        tournaments: db.tournaments,
        horses: db.horses,
        races: db.races,
        jockeyProfiles: publicJockeyProfiles(db),
        jockeyInvitations: db.jockeyInvitations || [],
        users: db.users.map(publicUser),
        notifications: db.notifications || [],
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/owner/portal') {
      const user = await requireRole(req, db, ['owner']);

      if (!user) {
        send(res, 403, { message: 'Owner access required' });
        return;
      }

      send(res, 200, {
        horses: db.horses.filter((horse) => horse.ownerUserId === user.id),
        jockeyProfiles: publicJockeyProfiles(db),
        invitations: (db.jockeyInvitations || []).filter(
          (invitation) => invitation.ownerUserId === user.id
        ),
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/owner/jockey-requests') {
      const user = await requireRole(req, db, ['owner']);

      if (!user) {
        send(res, 403, { message: 'Owner access required' });
        return;
      }

      const { horseId, jockeyUserId } = await readBody(req);
      const horse = db.horses.find(
        (item) => item.id === horseId && item.ownerUserId === user.id
      );
      const jockey = db.users.find(
        (item) =>
          item.id === jockeyUserId &&
          item.role === 'jockey' &&
          item.status === 'active'
      );

      if (!horse || horse.status !== 'approved') {
        send(res, 400, { message: 'Horse must exist and be approved' });
        return;
      }

      if (!jockey) {
        send(res, 400, { message: 'Jockey must exist and be active' });
        return;
      }

      db.jockeyInvitations = db.jockeyInvitations || [];

      const invitation = {
        id: randomUUID(),
        horseId,
        ownerUserId: user.id,
        jockeyUserId,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      db.jockeyInvitations.unshift(invitation);

      horse.selectedJockeyUserId = jockeyUserId;
      horse.jockeyConfirmation = 'pending';

      createNotification(
        db,
        jockeyUserId,
        'New riding request',
        `${user.name} invited you to ride ${horse.name}.`
      );

      await writeDb(db);
      send(res, 201, { invitation });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/jockey/portal') {
      const user = await requireRole(req, db, ['jockey']);

      if (!user) {
        send(res, 403, { message: 'Jockey access required' });
        return;
      }

      const profile =
        (db.jockeyProfiles || []).find((item) => item.userId === user.id) ||
        null;

      send(res, 200, {
        profile,
        invitations: (db.jockeyInvitations || []).filter(
          (invitation) => invitation.jockeyUserId === user.id
        ),
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/jockey/profile') {
      const user = await requireRole(req, db, ['jockey']);

      if (!user) {
        send(res, 403, { message: 'Jockey access required' });
        return;
      }

      const { bio, certificate, competitionLevel, weight } = await readBody(req);
      db.jockeyProfiles = db.jockeyProfiles || [];

      let profile = db.jockeyProfiles.find((item) => item.userId === user.id);

      if (!profile) {
        profile = {
          id: randomUUID(),
          userId: user.id,
        };
        db.jockeyProfiles.unshift(profile);
      }

      profile.bio = bio || '';
      profile.certificate = certificate || '';
      profile.competitionLevel = competitionLevel || '';
      profile.weight = Number(weight) || 0;
      profile.status = 'published';
      profile.updatedAt = new Date().toISOString();

      await writeDb(db);
      send(res, 200, { profile });
      return;
    }

    const invitationDecisionMatch = url.pathname.match(
      /^\/api\/jockey\/invitations\/([^/]+)$/
    );

    if (req.method === 'POST' && invitationDecisionMatch) {
      const user = await requireRole(req, db, ['jockey']);

      if (!user) {
        send(res, 403, { message: 'Jockey access required' });
        return;
      }

      const { decision } = await readBody(req);

      if (!['accepted', 'rejected'].includes(decision)) {
        send(res, 400, { message: 'Decision must be accepted or rejected' });
        return;
      }

      const invitation = (db.jockeyInvitations || []).find(
        (item) => item.id === invitationDecisionMatch[1] && item.jockeyUserId === user.id
      );

      if (!invitation) {
        send(res, 404, { message: 'Invitation not found' });
        return;
      }

      invitation.status = decision;
      invitation.respondedAt = new Date().toISOString();

      const horse = db.horses.find((item) => item.id === invitation.horseId);

      if (horse) {
        horse.jockeyConfirmation =
          decision === 'accepted' ? 'confirmed' : 'rejected';
      }

      createNotification(
        db,
        invitation.ownerUserId,
        decision === 'accepted' ? 'Jockey accepted request' : 'Jockey rejected request',
        `${user.name} ${decision} the request${horse ? ` for ${horse.name}` : ''}.`
      );

      await writeDb(db);
      send(res, 200, { invitation });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/admin/approvals') {
      const user = await requireRole(req, db, ['admin']);

      if (!user) {
        send(res, 403, { message: 'Admin access required' });
        return;
      }

      send(res, 200, { approvals: formatApprovals(db) });
      return;
    }

    const approvalMatch = url.pathname.match(
      /^\/api\/admin\/approvals\/(horse|jockey)\/([^/]+)$/
    );

    if (req.method === 'POST' && approvalMatch) {
      const user = await requireRole(req, db, ['admin']);

      if (!user) {
        send(res, 403, { message: 'Admin access required' });
        return;
      }

      const [, entityType, id] = approvalMatch;
      const { decision } = await readBody(req);

      if (!['approved', 'rejected'].includes(decision)) {
        send(res, 400, { message: 'Decision must be approved or rejected' });
        return;
      }

      if (entityType === 'horse') {
        const horse = db.horses.find((item) => item.id === id);

        if (!horse) {
          send(res, 404, { message: 'Horse approval not found' });
          return;
        }

        horse.status = decision;

        createNotification(
          db,
          horse.ownerUserId,
          decision === 'approved' ? 'Horse approved' : 'Horse rejected',
          `${horse.name} has been ${decision} by Admin.`
        );
      }

      if (entityType === 'jockey') {
        const jockey = db.users.find((item) => item.id === id && item.role === 'jockey');

        if (!jockey) {
          send(res, 404, { message: 'Jockey approval not found' });
          return;
        }

        jockey.status = decision === 'approved' ? 'active' : 'rejected';

        createNotification(
          db,
          jockey.id,
          decision === 'approved' ? 'Jockey account approved' : 'Jockey account rejected',
          `Your jockey application has been ${decision} by Admin.`
        );
      }

      await writeDb(db);
      send(res, 200, {
        ok: true,
        approvals: formatApprovals(db),
        notifications: db.notifications || [],
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/notifications') {
      const user = await authenticate(req, db);

      if (!user) {
        send(res, 401, { message: 'Not authenticated' });
        return;
      }

      send(res, 200, {
        notifications: (db.notifications || []).filter(
          (notification) => notification.userId === user.id
        ),
      });
      return;
    }

    const notificationMatch = url.pathname.match(/^\/api\/notifications\/([^/]+)\/read$/);

    if (req.method === 'POST' && notificationMatch) {
      const user = await authenticate(req, db);

      if (!user) {
        send(res, 401, { message: 'Not authenticated' });
        return;
      }

      const notification = (db.notifications || []).find(
        (item) => item.id === notificationMatch[1] && item.userId === user.id
      );

      if (!notification) {
        send(res, 404, { message: 'Notification not found' });
        return;
      }

      notification.read = true;
      await writeDb(db);
      send(res, 200, { notification });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/admin/database') {
      const user = await requireRole(req, db, ['admin']);

      if (!user) {
        send(res, 403, { message: 'Admin access required' });
        return;
      }

      send(res, 200, {
        ...db,
        users: db.users.map(publicUser),
      });
      return;
    }

    send(res, 404, { message: 'Not found' });
  } catch (error) {
    console.error(error);
    send(res, 500, { message: 'Server error' });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`API server running at http://127.0.0.1:${port}`);
});
