import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readDb, writeDb } from './sqlDb.js';

const port = Number(process.env.API_PORT || 4000);
const publicUser = ({ password, ...user }) => user;

const send = (res, status, body) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
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

const jockeyName = (db, userId) =>
  db.users.find((user) => user.id === userId)?.name || 'Unknown Jockey';

const horseName = (db, horseId) =>
  db.horses.find((horse) => horse.id === horseId)?.name || 'Unknown Horse';

const raceName = (db, raceId) =>
  db.races.find((race) => race.id === raceId)?.name || 'Unassigned race';

const notifyAdmins = (db, title, message) => {
  db.users
    .filter((user) => user.role === 'admin')
    .forEach((admin) => createNotification(db, admin.id, title, message));
};

const activeTournament = (db) =>
  db.tournaments.find((tournament) =>
    ['registration', 'approvals', 'active'].includes(tournament.status)
  ) || null;

const defaultRaceForTournament = (db, tournamentId) =>
  db.races.find(
    (race) =>
      race.tournamentId === tournamentId &&
      race.status === 'registration-open'
  ) || null;

const findEntry = (db, entryId) =>
  (db.raceEntries || []).find((entry) => entry.id === entryId);

const publicRaceEntries = (db) =>
  (db.raceEntries || []).map((entry) => ({
    ...entry,
    horseName: horseName(db, entry.horseId),
    jockeyName: jockeyName(db, entry.jockeyUserId),
    ownerName: ownerName(
      db,
      db.horses.find((horse) => horse.id === entry.horseId)?.ownerUserId
    ),
    raceName: raceName(db, entry.raceId),
  }));

const publicTournamentJockeyProfiles = (db, tournamentId) => {
  const approvedJockeyIds = new Set(
    (db.jockeyTournamentRegistrations || [])
      .filter(
        (registration) =>
          registration.tournamentId === tournamentId &&
          registration.status === 'approved'
      )
      .map((registration) => registration.jockeyUserId)
  );

  return publicJockeyProfiles(db).filter((profile) =>
    approvedJockeyIds.has(profile.userId)
  );
};

const canRefereeRace = (race, user) =>
  user?.role === 'admin' ||
  race?.refereeUserId === user?.id ||
  String(race?.refereeUserIds || '')
    .split(',')
    .map((id) => id.trim())
    .includes(user?.id);

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
  ...(db.jockeyTournamentRegistrations || [])
    .filter((registration) => registration.status === 'pending')
    .map((registration) => ({
      id: registration.id,
      entityType: 'jockeyTournament',
      type: 'Jockey Tournament Registration',
      name: jockeyName(db, registration.jockeyUserId),
      detail: `Tournament: ${
        db.tournaments.find((tournament) => tournament.id === registration.tournamentId)?.name ||
        'Tournament'
      }`,
      date: registration.createdAt,
      targetUserId: registration.jockeyUserId,
    })),
  ...(db.raceEntries || [])
    .filter((entry) => entry.status === 'pending-approval')
    .map((entry) => {
      const horse = db.horses.find((item) => item.id === entry.horseId);

      return {
        id: entry.id,
        entityType: 'raceEntry',
        type: 'Horse Race Entry',
        name: `${horseName(db, entry.horseId)} + ${jockeyName(db, entry.jockeyUserId)}`,
        detail: `Race: ${raceName(db, entry.raceId)} • Owner: ${ownerName(db, horse?.ownerUserId)}`,
        date: entry.createdAt,
        targetUserId: horse?.ownerUserId,
      };
    }),
  ...(db.jockeyInvitations || [])
    .filter(
      (invitation) =>
        invitation.status === 'accepted' && invitation.adminStatus === 'pending'
    )
    .map((invitation) => ({
      id: invitation.id,
      entityType: 'pairing',
      type: 'Race Entry Registration',
      name: `${horseName(db, invitation.horseId)} + ${jockeyName(db, invitation.jockeyUserId)}`,
      detail: `Race: ${raceName(db, invitation.raceId)} • Owner: ${ownerName(db, invitation.ownerUserId)}`,
      date:
        db.races.find((race) => race.id === invitation.raceId)?.date ||
        activeTournament(db)?.startDate ||
        'Race schedule',
      targetUserId: invitation.ownerUserId,
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
        'Access-Control-Allow-Origin': '*',
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
        status: role === 'jockey' ? 'pending' : 'active',
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
        jockeyTournamentRegistrations: db.jockeyTournamentRegistrations || [],
        jockeyInvitations: db.jockeyInvitations || [],
        raceEntries: publicRaceEntries(db),
        users: db.users.map(publicUser),
        notifications: db.notifications || [],
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/jockey/tournament-registrations') {
      const user = await requireRole(req, db, ['jockey']);

      if (!user) {
        send(res, 403, { message: 'Jockey access required' });
        return;
      }

      const { tournamentId } = await readBody(req);
      const tournament = db.tournaments.find((item) => item.id === tournamentId);

      if (!tournament) {
        send(res, 404, { message: 'Tournament not found' });
        return;
      }

      db.jockeyTournamentRegistrations = db.jockeyTournamentRegistrations || [];

      const existing = db.jockeyTournamentRegistrations.find(
        (registration) =>
          registration.tournamentId === tournament.id &&
          registration.jockeyUserId === user.id
      );

      if (existing) {
        send(res, 409, {
          message: `You already have a ${existing.status} registration for this tournament.`,
        });
        return;
      }

      const registration = {
        id: randomUUID(),
        tournamentId: tournament.id,
        jockeyUserId: user.id,
        status: 'pending',
        createdAt: new Date().toISOString(),
        reviewedAt: null,
      };

      db.jockeyTournamentRegistrations.unshift(registration);

      notifyAdmins(
        db,
        'Jockey tournament registration',
        `${user.name} requested to join ${tournament.name}.`
      );

      createNotification(
        db,
        user.id,
        'Tournament registration submitted',
        `${tournament.name} is waiting for Admin approval.`
      );

      await writeDb(db);
      send(res, 201, {
        registration,
        jockeyTournamentRegistrations: db.jockeyTournamentRegistrations,
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
        raceEntries: publicRaceEntries(db).filter((entry) => {
          const horse = db.horses.find((item) => item.id === entry.horseId);
          return horse?.ownerUserId === user.id;
        }),
        jockeyProfiles: [],
        invitations: (db.jockeyInvitations || []).filter(
          (invitation) => invitation.ownerUserId === user.id
        ),
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/owner/race-registration') {
      const user = await requireRole(req, db, ['owner']);

      if (!user) {
        send(res, 403, { message: 'Owner access required' });
        return;
      }

      const tournamentId = url.searchParams.get('tournamentId') || '';
      const tournament = db.tournaments.find((item) => item.id === tournamentId);

      if (!tournament) {
        send(res, 404, { message: 'Tournament not found' });
        return;
      }

      send(res, 200, {
        tournament,
        horses: db.horses.filter(
          (horse) => horse.ownerUserId === user.id && horse.status === 'approved'
        ),
        races: db.races.filter(
          (race) =>
            race.tournamentId === tournament.id &&
            race.status === 'registration-open'
        ),
        jockeyProfiles: publicTournamentJockeyProfiles(db, tournament.id),
        raceEntries: publicRaceEntries(db).filter((entry) => {
          const horse = db.horses.find((item) => item.id === entry.horseId);
          return horse?.ownerUserId === user.id;
        }),
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/owner/horses') {
      const user = await requireRole(req, db, ['owner']);

      if (!user) {
        send(res, 403, { message: 'Owner access required' });
        return;
      }

      if (!activeTournament(db)) {
        send(res, 400, {
          message: 'Admin must create and open a tournament before owners can register horses.',
        });
        return;
      }

      const ownerHorses = db.horses.filter((horse) => horse.ownerUserId === user.id);
      const maxHorses = 5;

      if (ownerHorses.length >= maxHorses) {
        send(res, 400, {
          message: `Each owner can register up to ${maxHorses} horses.`,
        });
        return;
      }

      const {
        name,
        breed,
        species,
        age,
        sex,
        color,
        weightKg,
        heightCm,
        baseHandicap,
        healthStatus,
        profileNotes,
        veterinaryCertificateUrl,
      } = await readBody(req);

      if (!name || !breed || !age || Number(age) <= 0) {
        send(res, 400, { message: 'Horse name, breed and age are required' });
        return;
      }

      const horse = {
        id: randomUUID(),
        name,
        breed,
        species: species || '',
        age: Number(age),
        sex: sex || '',
        color: color || '',
        weightKg: Number(weightKg) || 0,
        heightCm: Number(heightCm) || 0,
        baseHandicap: Number(baseHandicap) || 0,
        healthStatus: healthStatus || '',
        profileNotes: profileNotes || '',
        ownerUserId: user.id,
        status: 'pending',
        selectedJockeyUserId: null,
        jockeyConfirmation: 'waiting-owner',
        veterinaryCertificateUrl: veterinaryCertificateUrl || '',
        createdAt: new Date().toISOString(),
      };

      db.horses.unshift(horse);

      notifyAdmins(
        db,
        'New horse registration',
        `${user.name} submitted ${horse.name} for admin approval.`
      );

      createNotification(
        db,
        user.id,
        'Horse registration submitted',
        `${horse.name} is waiting for admin approval.`
      );

      await writeDb(db);
      send(res, 201, {
        horse,
        horseCount: ownerHorses.length + 1,
        maxHorses,
      });
      return;
    }

    const ownerHorseEditMatch = url.pathname.match(
      /^\/api\/owner\/horses\/([^/]+)$/
    );

    if (req.method === 'POST' && ownerHorseEditMatch) {
      const user = await requireRole(req, db, ['owner', 'admin']);

      if (!user) {
        send(res, 403, { message: 'Owner access required' });
        return;
      }

      const horse = db.horses.find((item) => item.id === ownerHorseEditMatch[1]);

      if (!horse || (user.role === 'owner' && horse.ownerUserId !== user.id)) {
        send(res, 404, { message: 'Horse not found' });
        return;
      }

      const {
        name,
        breed,
        species,
        age,
        sex,
        color,
        weightKg,
        heightCm,
        baseHandicap,
        healthStatus,
        profileNotes,
        veterinaryCertificateUrl,
      } = await readBody(req);

      if (!name || !breed || !age || Number(age) <= 0) {
        send(res, 400, { message: 'Horse name, breed and age are required' });
        return;
      }

      horse.name = name;
      horse.breed = breed;
      horse.species = species || '';
      horse.age = Number(age);
      horse.sex = sex || '';
      horse.color = color || '';
      horse.weightKg = Number(weightKg) || 0;
      horse.heightCm = Number(heightCm) || 0;
      horse.baseHandicap = Number(baseHandicap) || 0;
      horse.healthStatus = healthStatus || '';
      horse.profileNotes = profileNotes || '';
      horse.veterinaryCertificateUrl = veterinaryCertificateUrl || '';

      createNotification(
        db,
        horse.ownerUserId,
        'Horse profile updated',
        `${horse.name} profile information has been updated.`
      );

      await writeDb(db);
      send(res, 200, { horse });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/owner/jockey-requests') {
      const user = await requireRole(req, db, ['owner']);

      if (!user) {
        send(res, 403, { message: 'Owner access required' });
        return;
      }

      const { horseId, jockeyUserId, raceId } = await readBody(req);
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

      const tournament = activeTournament(db);
      const race =
        db.races.find(
          (item) =>
            item.id === raceId &&
            item.status === 'registration-open'
        ) ||
        (tournament ? defaultRaceForTournament(db, tournament.id) : null);

      if (!race) {
        send(res, 400, { message: 'Race registration is not open' });
        return;
      }

      const duplicateEntry = (db.jockeyInvitations || []).some(
        (item) =>
          item.raceId === race.id &&
          item.horseId === horseId &&
          item.status !== 'cancelled'
      );

      if (duplicateEntry) {
        send(res, 409, { message: 'This horse is already registered for this race' });
        return;
      }

      const invitation = {
        id: randomUUID(),
        horseId,
        ownerUserId: user.id,
        jockeyUserId,
        tournamentId: tournament?.id || null,
        raceId: race.id,
        status: 'pending',
        adminStatus: null,
        createdAt: new Date().toISOString(),
      };
      db.jockeyInvitations.unshift(invitation);

      horse.selectedJockeyUserId = jockeyUserId;
      horse.jockeyConfirmation = 'pending';

      createNotification(
        db,
        jockeyUserId,
        'New race participation request',
        `${user.name} registered ${horse.name} for ${race.name} and selected you as jockey.`
      );

      await writeDb(db);
      send(res, 201, { invitation });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/owner/race-entries') {
      const user = await requireRole(req, db, ['owner']);

      if (!user) {
        send(res, 403, { message: 'Owner access required' });
        return;
      }

      const { tournamentId, raceId, horseId, jockeyUserId, notes } = await readBody(req);
      const horse = db.horses.find(
        (item) =>
          item.id === horseId &&
          item.ownerUserId === user.id &&
          item.status === 'approved'
      );
      const race = db.races.find(
        (item) =>
          item.id === raceId &&
          item.tournamentId === tournamentId &&
          item.status === 'registration-open'
      );
      const jockeyApproved = (db.jockeyTournamentRegistrations || []).some(
        (registration) =>
          registration.tournamentId === tournamentId &&
          registration.jockeyUserId === jockeyUserId &&
          registration.status === 'approved'
      );

      if (!horse) {
        send(res, 400, { message: 'Owner can only register approved horses they own' });
        return;
      }

      if (!race) {
        send(res, 400, { message: 'Race registration is not open' });
        return;
      }

      if (!jockeyApproved) {
        send(res, 400, { message: 'Jockey must be approved for the same tournament' });
        return;
      }

      db.raceEntries = db.raceEntries || [];

      const duplicate = db.raceEntries.some(
        (entry) =>
          entry.raceId === race.id &&
          entry.horseId === horse.id &&
          entry.status !== 'rejected'
      );

      if (duplicate) {
        send(res, 409, { message: 'This horse already has a race entry for this race' });
        return;
      }

      const jockeyAlreadyAssigned = db.raceEntries.some(
        (entry) =>
          entry.raceId === race.id &&
          entry.jockeyUserId === jockeyUserId &&
          entry.status !== 'rejected'
      );

      if (jockeyAlreadyAssigned) {
        send(res, 409, {
          message: 'A jockey cannot be assigned to multiple horses in the same race',
        });
        return;
      }

      const entry = {
        id: randomUUID(),
        raceId: race.id,
        horseId: horse.id,
        jockeyUserId,
        invitationId: null,
        status: 'pending-approval',
        lane: null,
        handicap: 0,
        ownerConfirmed: true,
        jockeyConfirmed: true,
        preRaceStatus: 'pending',
        disqualified: false,
        resultStatus: 'draft',
        notes: notes || '',
        violationNotes: '',
        finishTime: '',
        position: null,
        createdAt: new Date().toISOString(),
      };

      db.raceEntries.unshift(entry);

      notifyAdmins(
        db,
        'Horse race entry pending approval',
        `${user.name} registered ${horse.name} with ${jockeyName(db, jockeyUserId)} for ${race.name}.`
      );

      createNotification(
        db,
        jockeyUserId,
        'Race entry submitted',
        `${horse.name} was registered for ${race.name} with you as jockey.`
      );

      await writeDb(db);
      send(res, 201, { entry });
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
        horses: db.horses,
        races: db.races,
        raceEntries: publicRaceEntries(db).filter(
          (entry) => entry.jockeyUserId === user.id
        ),
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

      if (!activeTournament(db)) {
        send(res, 400, {
          message: 'Admin must create and open a tournament before jockeys can publish profiles.',
        });
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
      const raceLabel = raceName(db, invitation.raceId);

      if (decision === 'accepted') {
        invitation.adminStatus = 'pending';

        if (horse) {
          horse.jockeyConfirmation = 'pending-admin';
        }

        createNotification(
          db,
          invitation.ownerUserId,
          'Jockey accepted race participation',
          `${user.name} accepted riding ${horse?.name || 'your horse'} for ${raceLabel}. Waiting for Admin approval.`
        );

        notifyAdmins(
          db,
          'Race entry needs approval',
          `${ownerName(db, invitation.ownerUserId)} registered ${horse?.name || 'Horse'} + ${user.name} for ${raceLabel}.`
        );
      } else {
        invitation.adminStatus = null;

        if (horse) {
          horse.selectedJockeyUserId = null;
          horse.jockeyConfirmation = 'waiting-owner';
        }

        createNotification(
          db,
          invitation.ownerUserId,
          'Jockey rejected request',
          `${user.name} rejected the request${horse ? ` for ${horse.name}` : ''}.`
        );
      }

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

    if (req.method === 'POST' && url.pathname === '/api/admin/tournaments') {
      const user = await requireRole(req, db, ['admin']);

      if (!user) {
        send(res, 403, { message: 'Admin access required' });
        return;
      }

      const {
        name,
        registrationWindow,
        startDate,
        finalDate,
        location,
        prizePool,
      } = await readBody(req);

      if (!name || !startDate || !location) {
        send(res, 400, {
          message: 'Tournament name, start date and location are required',
        });
        return;
      }

      const tournament = {
        id: randomUUID(),
        name,
        status: 'registration',
        registrationWindow: registrationWindow || 'Open Registration',
        startDate,
        finalDate: finalDate || '',
        location,
        prizePool: Number(prizePool) || 0,
      };

      db.tournaments.unshift(tournament);

      notifyAdmins(
        db,
        'Tournament registration opened',
        `${tournament.name} has been created and opened for Owner/Jockey registration.`
      );

      await writeDb(db);
      send(res, 201, {
        tournament,
        tournaments: db.tournaments,
        notifications: db.notifications || [],
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/admin/race-builder') {
      const user = await requireRole(req, db, ['admin']);

      if (!user) {
        send(res, 403, { message: 'Admin access required' });
        return;
      }

      const referees = db.users
        .filter((item) => item.role === 'referee' && item.status === 'active')
        .map((item) => ({
          id: item.id,
          name: item.name,
        }));

      send(res, 200, {
        tournaments: db.tournaments,
        races: db.races || [],
        referees,
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/admin/races') {
      const user = await requireRole(req, db, ['admin']);

      if (!user) {
        send(res, 403, { message: 'Admin access required' });
        return;
      }

      const {
        tournamentId,
        raceNumber,
        name,
        round,
        date,
        time,
        venue,
        distance,
        surface,
        raceClass,
        handicapMin,
        handicapMax,
        totalPrize,
        refereeUserId,
        refereeUserIds,
        registrationPeriodMinutes,
        registrationOpenTime,
        registrationCloseTime,
      } = await readBody(req);

      if (!name || !date || !time || !venue || !distance || !refereeUserId) {
        send(res, 400, {
          message: 'Race name, date, time, venue, distance and referee are required',
        });
        return;
      }

      const selectedRefereeIds = Array.from(
        new Set([refereeUserId, ...(Array.isArray(refereeUserIds) ? refereeUserIds : [])].filter(Boolean))
      );
      const selectedReferees = selectedRefereeIds
        .map((id) =>
          db.users.find(
            (item) =>
              item.id === id &&
              item.role === 'referee' &&
              item.status === 'active'
          )
        )
        .filter(Boolean);
      const referee = selectedReferees[0];

      if (selectedReferees.length !== selectedRefereeIds.length || !referee) {
        send(res, 400, { message: 'Assigned referee must be active' });
        return;
      }

      if (!tournamentId) {
        send(res, 400, { message: 'Create and select a tournament before creating races' });
        return;
      }

      const tournament = db.tournaments.find(
        (item) =>
          item.id === tournamentId &&
          ['registration', 'approvals', 'active'].includes(item.status)
      );

      if (!tournament) {
        send(res, 400, { message: 'Selected tournament must exist and be open before creating races' });
        return;
      }

      const now = new Date();
      const minutes = Math.max(1, Number(registrationPeriodMinutes) || 10);
      const registrationOpensAt = registrationOpenTime || now.toISOString();
      const registrationClosesAt =
        registrationCloseTime ||
        new Date(now.getTime() + minutes * 60 * 1000).toISOString();

      const race = {
        id: randomUUID(),
        tournamentId: tournament.id,
        raceNumber: raceNumber || '',
        name,
        round: round || 'Qualifier',
        date,
        time,
        venue,
        distance: `${distance}m`,
        surface: surface || 'Turf',
        raceClass: raceClass || '',
        handicapMin: Number(handicapMin) || 0,
        handicapMax: Number(handicapMax) || 0,
        totalPrize: Number(totalPrize) || 0,
        refereeUserId: referee.id,
        refereeUserIds: selectedRefereeIds.join(','),
        referee: selectedReferees.map((item) => item.name).join(', '),
        status: 'registration-open',
        participants: 0,
        ownerConfirmed: 0,
        jockeyConfirmed: 0,
        registrationPeriodMinutes: minutes,
        registrationOpensAt,
        registrationClosesAt,
        resultStatus: 'draft',
        awardsPublished: false,
        createdBy: user.id,
        createdAt: now.toISOString(),
      };

      db.races.unshift(race);

      selectedReferees.forEach((item) =>
        createNotification(
          db,
          item.id,
          'Race assigned',
          `${race.name} has been created. Registration closes at ${race.registrationClosesAt}.`
        )
      );

      await writeDb(db);
      send(res, 201, {
        race,
        entries: [],
        notifications: db.notifications || [],
      });
      return;
    }

    const adminRaceActionMatch = url.pathname.match(
      /^\/api\/admin\/races\/([^/]+)\/(close-registration|publish|confirm-results|reject-results|complete)$/
    );

    if (req.method === 'POST' && adminRaceActionMatch) {
      const user = await requireRole(req, db, ['admin']);

      if (!user) {
        send(res, 403, { message: 'Admin access required' });
        return;
      }

      const [, raceId, action] = adminRaceActionMatch;
      const race = db.races.find((item) => item.id === raceId);

      if (!race) {
        send(res, 404, { message: 'Race not found' });
        return;
      }

      const entries = (db.raceEntries || []).filter(
        (entry) => entry.raceId === race.id && entry.status === 'approved'
      );

      if (action === 'close-registration') {
        race.status = 'registration-closed';
        race.participants = entries.length;
        race.ownerConfirmed = entries.length;
        race.jockeyConfirmed = entries.length;

        const sortedEntries = [...entries].sort((a, b) => {
          const horseA = db.horses.find((horse) => horse.id === a.horseId);
          const horseB = db.horses.find((horse) => horse.id === b.horseId);
          return String(horseA?.breed || '').localeCompare(String(horseB?.breed || ''));
        });

        sortedEntries.forEach((entry, index) => {
          const profile = (db.jockeyProfiles || []).find(
            (item) => item.userId === entry.jockeyUserId
          );
          entry.lane = index + 1;
          const computedHandicap = profile?.weight
            ? Math.max(0, Number((58 - Number(profile.weight)).toFixed(1)))
            : 0;
          const min = Number(race.handicapMin) || 0;
          const max = Number(race.handicapMax) || 0;
          entry.handicap = max > 0
            ? Math.min(max, Math.max(min, computedHandicap))
            : Math.max(min, computedHandicap);
          entry.preRaceStatus = 'ready-for-referee';
        });

        String(race.refereeUserIds || race.refereeUserId || '')
          .split(',')
          .filter(Boolean)
          .forEach((refereeId) =>
            createNotification(
              db,
              refereeId,
              'Race registration closed',
              `${race.name} is ready for referee review. Starting gates and handicap have been assigned.`
            )
          );
      }

      if (action === 'publish') {
        if (!['registration-closed', 'published'].includes(race.status)) {
          send(res, 400, { message: 'Close registration before publishing the race' });
          return;
        }

        race.status = 'published';
        entries.forEach((entry) => {
          const horse = db.horses.find((item) => item.id === entry.horseId);
          createNotification(
            db,
            horse?.ownerUserId,
            'Race published',
            `${race.name} has been published. Gate ${entry.lane}, handicap ${entry.handicap}kg.`
          );
          createNotification(
            db,
            entry.jockeyUserId,
            'Race published',
            `${race.name} has been published. Gate ${entry.lane}, handicap ${entry.handicap}kg.`
          );
        });
      }

      if (action === 'confirm-results') {
        if (race.resultStatus !== 'submitted') {
          send(res, 400, { message: 'Referee must submit results before Admin confirmation' });
          return;
        }

        race.status = 'finished';
        race.resultStatus = 'approved';
      }

      if (action === 'reject-results') {
        race.resultStatus = 'rejected';
      }

      if (action === 'complete') {
        if (race.status !== 'finished') {
          send(res, 400, { message: 'Confirm results before completing awards' });
          return;
        }

        race.status = 'completed';
        race.awardsPublished = true;
      }

      await writeDb(db);
      send(res, 200, {
        race,
        entries: publicRaceEntries(db).filter((entry) => entry.raceId === race.id),
        notifications: db.notifications || [],
      });
      return;
    }

    const refereeRaceActionMatch = url.pathname.match(
      /^\/api\/referee\/races\/([^/]+)\/(start|submit-results)$/
    );

    if (req.method === 'POST' && refereeRaceActionMatch) {
      const user = await requireRole(req, db, ['admin', 'referee']);

      if (!user) {
        send(res, 403, { message: 'Referee access required' });
        return;
      }

      const [, raceId, action] = refereeRaceActionMatch;
      const race = db.races.find((item) => item.id === raceId);

      if (!race || !canRefereeRace(race, user)) {
        send(res, 404, { message: 'Assigned race not found' });
        return;
      }

      if (action === 'start') {
        if (race.status !== 'published') {
          send(res, 400, { message: 'Race must be published before it can start' });
          return;
        }

        race.status = 'in-progress';
      }

      if (action === 'submit-results') {
        if (race.status !== 'in-progress') {
          send(res, 400, { message: 'Race must be in progress before results are submitted' });
          return;
        }

        race.resultStatus = 'submitted';
        notifyAdmins(
          db,
          'Race results submitted',
          `${race.name} results are ready for Admin confirmation.`
        );
      }

      await writeDb(db);
      send(res, 200, { race });
      return;
    }

    const refereeEntryReadinessMatch = url.pathname.match(
      /^\/api\/referee\/race-entries\/([^/]+)\/(ready|absent)$/
    );

    if (req.method === 'POST' && refereeEntryReadinessMatch) {
      const user = await requireRole(req, db, ['admin', 'referee']);

      if (!user) {
        send(res, 403, { message: 'Referee access required' });
        return;
      }

      const [, entryId, readiness] = refereeEntryReadinessMatch;
      const entry = findEntry(db, entryId);
      const race = db.races.find((item) => item.id === entry?.raceId);

      if (!entry || !race || !canRefereeRace(race, user)) {
        send(res, 404, { message: 'Race entry not found' });
        return;
      }

      entry.preRaceStatus = readiness === 'ready' ? 'ready' : 'absent';
      entry.disqualified = readiness === 'absent';

      await writeDb(db);
      send(res, 200, {
        entry,
        entries: publicRaceEntries(db).filter((item) => item.raceId === race.id),
      });
      return;
    }

    const refereeEntryResultMatch = url.pathname.match(
      /^\/api\/referee\/race-entries\/([^/]+)\/result$/
    );

    if (req.method === 'POST' && refereeEntryResultMatch) {
      const user = await requireRole(req, db, ['admin', 'referee']);

      if (!user) {
        send(res, 403, { message: 'Referee access required' });
        return;
      }

      const entry = findEntry(db, refereeEntryResultMatch[1]);
      const race = db.races.find((item) => item.id === entry?.raceId);

      if (!entry || !race || !canRefereeRace(race, user)) {
        send(res, 404, { message: 'Race entry not found' });
        return;
      }

      if (entry.preRaceStatus === 'absent' || entry.disqualified) {
        send(res, 400, { message: 'Absent participants cannot compete' });
        return;
      }

      const { position, finishTime, notes, violationNotes } = await readBody(req);

      entry.position = Number(position) || null;
      entry.finishTime = finishTime || '';
      entry.notes = notes || '';
      entry.violationNotes = violationNotes || '';
      entry.resultStatus = 'draft';

      await writeDb(db);
      send(res, 200, {
        entry,
        entries: publicRaceEntries(db).filter((item) => item.raceId === race.id),
      });
      return;
    }

    const approvalMatch = url.pathname.match(
      /^\/api\/admin\/approvals\/(horse|jockey|jockeyTournament|raceEntry|pairing)\/([^/]+)$/
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

      if (entityType === 'jockeyTournament') {
        const registration = (db.jockeyTournamentRegistrations || []).find(
          (item) => item.id === id && item.status === 'pending'
        );

        if (!registration) {
          send(res, 404, { message: 'Jockey tournament registration not found' });
          return;
        }

        registration.status = decision;
        registration.reviewedAt = new Date().toISOString();

        const tournament = db.tournaments.find(
          (item) => item.id === registration.tournamentId
        );

        createNotification(
          db,
          registration.jockeyUserId,
          decision === 'approved'
            ? 'Tournament participation approved'
            : 'Tournament participation rejected',
          `${tournament?.name || 'Tournament'} participation has been ${decision}.`
        );
      }

      if (entityType === 'raceEntry') {
        const entry = (db.raceEntries || []).find(
          (item) => item.id === id && item.status === 'pending-approval'
        );

        if (!entry) {
          send(res, 404, { message: 'Horse race entry not found' });
          return;
        }

        entry.status = decision === 'approved' ? 'approved' : 'rejected';

        const horse = db.horses.find((item) => item.id === entry.horseId);
        const race = db.races.find((item) => item.id === entry.raceId);

        if (race) {
          race.participants = (db.raceEntries || []).filter(
            (item) => item.raceId === race.id && item.status === 'approved'
          ).length;
        }

        createNotification(
          db,
          horse?.ownerUserId,
          decision === 'approved' ? 'Race entry approved' : 'Race entry rejected',
          `${horse?.name || 'Horse'} for ${race?.name || 'race'} has been ${decision}.`
        );

        createNotification(
          db,
          entry.jockeyUserId,
          decision === 'approved' ? 'Race entry approved' : 'Race entry rejected',
          `${horse?.name || 'Horse'} for ${race?.name || 'race'} has been ${decision}.`
        );
      }

      if (entityType === 'pairing') {
        const invitation = (db.jockeyInvitations || []).find(
          (item) =>
            item.id === id &&
            item.status === 'accepted' &&
            item.adminStatus === 'pending'
        );

        if (!invitation) {
          send(res, 404, { message: 'Horse-Jockey pairing approval not found' });
          return;
        }

        const horse = db.horses.find((item) => item.id === invitation.horseId);
        const raceLabel = raceName(db, invitation.raceId);

        invitation.adminStatus = decision;

        if (decision === 'approved') {
          if (horse) {
            horse.jockeyConfirmation = 'confirmed';
          }

          if (invitation.raceId) {
            db.raceEntries = db.raceEntries || [];

            const alreadyEntered = db.raceEntries.some(
              (entry) =>
                entry.raceId === invitation.raceId &&
                entry.horseId === invitation.horseId
            );

            if (!alreadyEntered) {
              db.raceEntries.push({
                id: randomUUID(),
                raceId: invitation.raceId,
                horseId: invitation.horseId,
                jockeyUserId: invitation.jockeyUserId,
                invitationId: invitation.id,
                status: 'approved',
                lane: null,
                handicap: 0,
                ownerConfirmed: false,
                jockeyConfirmed: false,
                preRaceStatus: 'pending',
                disqualified: false,
                createdAt: new Date().toISOString(),
              });
            }

            const race = db.races.find((item) => item.id === invitation.raceId);
            if (race) {
              race.participants = (db.raceEntries || []).filter(
                (entry) => entry.raceId === race.id && entry.status === 'approved'
              ).length;
            }
          }

          createNotification(
            db,
            invitation.ownerUserId,
            'Pairing approved for race',
            `Admin approved ${horse?.name || 'your horse'} with ${jockeyName(db, invitation.jockeyUserId)} for ${raceLabel}.`
          );

          createNotification(
            db,
            invitation.jockeyUserId,
            'You are approved for the race',
            `Admin approved your assignment to ride ${horse?.name || 'the horse'} in ${raceLabel}.`
          );
        } else {
          if (horse) {
            horse.selectedJockeyUserId = null;
            horse.jockeyConfirmation = 'waiting-owner';
          }

          createNotification(
            db,
            invitation.ownerUserId,
            'Pairing rejected for race',
            `Admin rejected the ${horse?.name || 'horse'} + ${jockeyName(db, invitation.jockeyUserId)} assignment for ${raceLabel}.`
          );

          createNotification(
            db,
            invitation.jockeyUserId,
            'Race assignment rejected',
            `Admin rejected your assignment for ${horse?.name || 'the horse'} in ${raceLabel}.`
          );
        }
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

    send(res, 404, { message: 'Not found' });
  } catch (error) {
    console.error(error);
    send(res, 500, { message: 'Server error' });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`API server running at http://127.0.0.1:${port}`);
});
