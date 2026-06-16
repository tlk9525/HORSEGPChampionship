import pg from 'pg';
import { SESSION_DAYS } from './config/constants.js';

const { Pool } = pg;

const postgresConfig =
  process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL
    ? {
        connectionString:
          process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL,
        ssl:
          process.env.POSTGRES_SSL === 'true'
            ? { rejectUnauthorized: false }
            : undefined,
      }
    : {
        host: process.env.PGHOST || process.env.POSTGRES_HOST || '127.0.0.1',
        port: Number(process.env.PGPORT || process.env.POSTGRES_PORT || 5432),
        database:
          process.env.PGDATABASE ||
          process.env.POSTGRES_DATABASE ||
          'horse_racing',
        user: process.env.PGUSER || process.env.POSTGRES_USER || 'postgres',
        password:
          process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || 'postgres',
        ssl:
          process.env.POSTGRES_SSL === 'true'
            ? { rejectUnauthorized: false }
            : undefined,
      };

let pool;

const getPool = () => {
  if (!pool) {
    pool = new Pool(postgresConfig);
  }

  return pool;
};

const identifier = (name) => `"${String(name).replace(/"/g, '""')}"`;
const columnList = (columns) => columns.map(identifier).join(', ');

const query = async (text, values = []) => {
  const result = await getPool().query(text, values);
  return result.rows;
};

const selectAll = (tableName, orderBy) =>
  query(
    `SELECT * FROM ${identifier(tableName)} ORDER BY ${orderBy
      .map((item) => `${identifier(item.column)} ${item.direction || ''}`.trim())
      .join(', ')}`
  );

const bool = (value) => Boolean(value);
const nowIso = () => new Date().toISOString();

const addDaysIso = (dateValue, days) =>
  new Date(new Date(dateValue || nowIso()).getTime() + days * 24 * 60 * 60 * 1000).toISOString();

const formatRaceTime = (value) => {
  if (!value) return '';
  const [hours = '00', minutes = '00'] = String(value).split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
};

const formatDateOnly = (value) => {
  if (!value) return '';

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const raw = String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : raw;
};

const rowTimestamps = (row, fallbackCreatedAt = nowIso()) => ({
  createdAt: row.createdAt || fallbackCreatedAt,
  updatedAt: row.updatedAt || row.createdAt || fallbackCreatedAt,
});

export const readDb = async () => {
  const [
    users,
    tournaments,
    horses,
    races,
    jockeyProfiles,
    jockeyTournamentRegistrations,
    jockeyInvitations,
    horseTournamentRegistrations,
    raceEntries,
    raceRefereeAssignments,
    refereeReports,
    notifications,
    sessions,
  ] = await Promise.all([
    selectAll('users', [{ column: 'id' }]),
    selectAll('tournaments', [{ column: 'id' }]),
    selectAll('horses', [
      { column: 'createdAt', direction: 'DESC' },
      { column: 'id' },
    ]),
    selectAll('races', [
      { column: 'createdAt', direction: 'DESC' },
      { column: 'id' },
    ]),
    selectAll('jockeyProfiles', [{ column: 'id' }]),
    selectAll('jockeyTournamentRegistrations', [
      { column: 'createdAt', direction: 'DESC' },
      { column: 'id' },
    ]),
    selectAll('jockeyInvitations', [
      { column: 'createdAt', direction: 'DESC' },
      { column: 'id' },
    ]),
    selectAll('horseTournamentRegistrations', [
      { column: 'createdAt', direction: 'DESC' },
      { column: 'id' },
    ]),
    selectAll('raceEntries', [
      { column: 'createdAt', direction: 'DESC' },
      { column: 'id' },
    ]),
    selectAll('raceRefereeAssignments', [
      { column: 'assignedAt', direction: 'DESC' },
      { column: 'id' },
    ]),
    selectAll('refereeReports', [
      { column: 'createdAt', direction: 'DESC' },
      { column: 'id' },
    ]),
    selectAll('notifications', [
      { column: 'createdAt', direction: 'DESC' },
      { column: 'id' },
    ]),
    selectAll('sessions', [
      { column: 'createdAt', direction: 'DESC' },
      { column: 'token' },
    ]),
  ]);

  const racesWithAssignments = races.map((race) => {
    const assignedReferees = raceRefereeAssignments.filter(
      (assignment) =>
        assignment.raceId === race.id && assignment.status !== 'removed'
    );
    const refereeIds = assignedReferees.map((assignment) => assignment.refereeUserId);

    return {
      ...race,
      date: formatDateOnly(race.raceDate || race.date),
      time: formatRaceTime(race.raceTime || race.time),
      refereeUserId: refereeIds[0] || race.refereeUserId || '',
      refereeUserIds: refereeIds.join(',') || race.refereeUserIds || race.refereeUserId || '',
      referee:
        assignedReferees.length > 0
          ? assignedReferees
              .map(
                (assignment) =>
                  users.find((user) => user.id === assignment.refereeUserId)?.name
              )
              .filter(Boolean)
              .join(', ')
          : race.referee,
    };
  });

  return {
    users,
    tournaments: tournaments.map((tournament) => ({
      ...tournament,
      startDate: formatDateOnly(tournament.startDate),
      finalDate: formatDateOnly(tournament.finalDate),
    })),
    horses,
    races: racesWithAssignments,
    jockeyProfiles,
    jockeyTournamentRegistrations,
    jockeyInvitations,
    horseTournamentRegistrations,
    raceEntries: raceEntries.map((entry) => ({
      ...entry,
      ownerConfirmed: bool(entry.ownerConfirmed),
      jockeyConfirmed: bool(entry.jockeyConfirmed),
      disqualified: bool(entry.disqualified),
    })),
    notifications: notifications.map((notification) => ({
      ...notification,
      type: notification.type || 'general',
      read: bool(notification.isRead),
      isRead: undefined,
    })),
    raceRefereeAssignments,
    refereeReports,
    sessions,
  };
};

const insertRows = async (client, tableName, columns, rows = []) => {
  if (!rows.length) return;

  const columnsSql = columnList(columns);
  const params = columns.map((_, index) => `$${index + 1}`).join(', ');

  for (const row of rows) {
    await client.query(
      `INSERT INTO ${identifier(tableName)} (${columnsSql}) VALUES (${params})`,
      columns.map((column) => row[column])
    );
  }
};

const tableDeleteOrder = [
  'notifications',
  'sessions',
  'refereeReports',
  'raceEntries',
  'horseTournamentRegistrations',
  'jockeyInvitations',
  'jockeyTournamentRegistrations',
  'jockeyProfiles',
  'raceRefereeAssignments',
  'races',
  'horses',
  'tournaments',
  'users',
];

export const writeDb = async (db) => {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    for (const tableName of tableDeleteOrder) {
      await client.query(`DELETE FROM ${identifier(tableName)}`);
    }

    await insertRows(
      client,
      'users',
      ['id', 'name', 'email', 'password', 'role', 'status', 'createdAt', 'updatedAt'],
      (db.users || []).map((user) => ({
        ...user,
        ...rowTimestamps(user),
      }))
    );

    await insertRows(
      client,
      'tournaments',
      [
        'id',
        'name',
        'status',
        'registrationWindow',
        'startDate',
        'finalDate',
        'location',
        'prizePool',
        'createdAt',
        'updatedAt',
      ],
      (db.tournaments || []).map((tournament) => ({
        ...tournament,
        startDate: tournament.startDate || null,
        finalDate: tournament.finalDate || null,
        ...rowTimestamps(tournament),
      }))
    );

    await insertRows(
      client,
      'horses',
      [
        'id',
        'name',
        'breed',
        'species',
        'age',
        'sex',
        'color',
        'weightKg',
        'heightCm',
        'baseHandicap',
        'speedRating',
        'staminaRating',
        'formRating',
        'healthRating',
        'overallRating',
        'healthStatus',
        'profileNotes',
        'ownerUserId',
        'status',
        'jockeyConfirmation',
        'veterinaryCertificateUrl',
        'createdAt',
        'updatedAt',
      ],
      (db.horses || []).map((horse) => ({
        ...horse,
        species: horse.species || '',
        sex: horse.sex || '',
        color: horse.color || '',
        weightKg: horse.weightKg ?? 0,
        heightCm: horse.heightCm ?? 0,
        baseHandicap: horse.baseHandicap ?? 0,
        speedRating: horse.speedRating ?? 75,
        staminaRating: horse.staminaRating ?? 75,
        formRating: horse.formRating ?? 75,
        healthRating: horse.healthRating ?? 80,
        overallRating: horse.overallRating ?? 76,
        healthStatus: horse.healthStatus || '',
        profileNotes: horse.profileNotes || '',
        createdAt: horse.createdAt || null,
        updatedAt: horse.updatedAt || horse.createdAt || null,
      }))
    );

    await insertRows(
      client,
      'races',
      [
        'id',
        'tournamentId',
        'name',
        'round',
        'raceNumber',
        'raceDate',
        'raceTime',
        'venue',
        'distance',
        'surface',
        'raceClass',
        'handicapMin',
        'handicapMax',
        'totalPrize',
        'status',
        'participants',
        'ownerConfirmed',
        'jockeyConfirmed',
        'registrationPeriodMinutes',
        'registrationOpensAt',
        'registrationClosesAt',
        'resultStatus',
        'awardsPublished',
        'createdBy',
        'createdAt',
        'updatedAt',
      ],
      (db.races || []).map((race) => ({
        ...race,
        raceDate: race.raceDate || race.date || null,
        raceTime: race.raceTime || race.time || null,
        registrationPeriodMinutes: race.registrationPeriodMinutes || 10,
        registrationOpensAt: race.registrationOpensAt || null,
        registrationClosesAt: race.registrationClosesAt || null,
        resultStatus: race.resultStatus || 'draft',
        awardsPublished: race.awardsPublished ?? false,
        handicapMin: race.handicapMin ?? 0,
        handicapMax: race.handicapMax ?? 0,
        raceNumber: race.raceNumber || '',
        createdAt: race.createdAt || null,
        updatedAt: race.updatedAt || race.createdAt || null,
      }))
    );

    await insertRows(
      client,
      'jockeyProfiles',
      [
        'id',
        'userId',
        'bio',
        'certificate',
        'competitionLevel',
        'weight',
        'status',
        'updatedAt',
      ],
      (db.jockeyProfiles || []).map((profile) => ({
        ...profile,
        updatedAt: profile.updatedAt || null,
      }))
    );

    await insertRows(
      client,
      'jockeyTournamentRegistrations',
      ['id', 'tournamentId', 'jockeyUserId', 'status', 'createdAt', 'reviewedAt'],
      (db.jockeyTournamentRegistrations || []).map((registration) => ({
        ...registration,
        reviewedAt: registration.reviewedAt || null,
      }))
    );

    await insertRows(
      client,
      'jockeyInvitations',
      [
        'id',
        'horseId',
        'ownerUserId',
        'jockeyUserId',
        'tournamentId',
        'raceId',
        'status',
        'adminStatus',
        'createdAt',
        'respondedAt',
      ],
      (db.jockeyInvitations || []).map((invitation) => ({
        ...invitation,
        tournamentId: invitation.tournamentId || null,
        raceId: invitation.raceId || null,
        adminStatus: invitation.adminStatus || null,
        respondedAt: invitation.respondedAt || null,
      }))
    );

    await insertRows(
      client,
      'horseTournamentRegistrations',
      [
        'id',
        'tournamentId',
        'horseId',
        'ownerUserId',
        'jockeyUserId',
        'invitationId',
        'status',
        'notes',
        'createdAt',
        'reviewedAt',
      ],
      (db.horseTournamentRegistrations || []).map((registration) => ({
        ...registration,
        invitationId: registration.invitationId || null,
        status: registration.status || 'pending-jockey',
        notes: registration.notes || '',
        createdAt: registration.createdAt || nowIso(),
        reviewedAt: registration.reviewedAt || null,
      }))
    );

    const derivedRefereeAssignments = (db.raceRefereeAssignments || []).length
      ? db.raceRefereeAssignments
      : (db.races || []).flatMap((race) =>
          String(race.refereeUserIds || race.refereeUserId || '')
            .split(',')
            .map((refereeUserId) => refereeUserId.trim())
            .filter(Boolean)
            .map((refereeUserId) => ({
              id: `rra_${race.id}_${refereeUserId}`,
              raceId: race.id,
              refereeUserId,
              assignedBy: race.createdBy || null,
              status: 'assigned',
              assignedAt:
                race.createdAt ||
                race.registrationOpensAt ||
                new Date().toISOString(),
            }))
        );

    await insertRows(
      client,
      'raceRefereeAssignments',
      ['id', 'raceId', 'refereeUserId', 'assignedBy', 'status', 'assignedAt'],
      derivedRefereeAssignments.map((assignment) => ({
        ...assignment,
        status: assignment.status || 'assigned',
        assignedAt: assignment.assignedAt || new Date().toISOString(),
      }))
    );

    await insertRows(
      client,
      'raceEntries',
      [
        'id',
        'raceId',
        'horseId',
        'jockeyUserId',
        'invitationId',
        'status',
        'lane',
        'handicap',
        'ratingSnapshot',
        'ownerConfirmed',
        'jockeyConfirmed',
        'preRaceStatus',
        'disqualified',
        'resultStatus',
        'position',
        'finishTime',
        'notes',
        'violationNotes',
        'createdAt',
      ],
      (db.raceEntries || []).map((entry) => ({
        ...entry,
        lane: entry.lane ?? null,
        handicap: entry.handicap ?? 0,
        ratingSnapshot: entry.ratingSnapshot ?? 0,
        ownerConfirmed: entry.ownerConfirmed ?? false,
        jockeyConfirmed: entry.jockeyConfirmed ?? false,
        preRaceStatus: entry.preRaceStatus || 'pending',
        disqualified: entry.disqualified ?? false,
        resultStatus: entry.resultStatus || 'draft',
        position: entry.position ?? null,
        finishTime: entry.finishTime || '',
        notes: entry.notes || '',
        violationNotes: entry.violationNotes || '',
        invitationId: entry.invitationId || null,
        createdAt: entry.createdAt || null,
      }))
    );

    await insertRows(
      client,
      'refereeReports',
      [
        'id',
        'raceId',
        'raceEntryId',
        'refereeUserId',
        'reportType',
        'description',
        'violation',
        'status',
        'createdAt',
        'reviewedAt',
      ],
      (db.refereeReports || []).map((report) => ({
        ...report,
        raceEntryId: report.raceEntryId || null,
        reportType: report.reportType || 'incident',
        violation: report.violation || '',
        status: report.status || 'submitted',
        reviewedAt: report.reviewedAt || null,
      }))
    );

    await insertRows(
      client,
      'notifications',
      ['id', 'userId', 'type', 'title', 'message', 'isRead', 'createdAt'],
      (db.notifications || []).map((notification) => ({
        ...notification,
        type: notification.type || 'general',
        isRead: Boolean(notification.read),
      }))
    );

    await insertRows(
      client,
      'sessions',
      ['token', 'userId', 'createdAt', 'expiresAt'],
      (db.sessions || []).map((session) => ({
        ...session,
        createdAt: session.createdAt || nowIso(),
        expiresAt: session.expiresAt || addDaysIso(session.createdAt, SESSION_DAYS),
      }))
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
