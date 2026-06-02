import pg from 'pg';

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
        port: Number(process.env.PGPORT || process.env.POSTGRES_PORT || 5433),
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

export const readDb = async () => {
  const [
    users,
    tournaments,
    horses,
    races,
    jockeyProfiles,
    jockeyTournamentRegistrations,
    jockeyInvitations,
    raceEntries,
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
    selectAll('raceEntries', [
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

  return {
    users,
    tournaments,
    horses,
    races,
    jockeyProfiles,
    jockeyTournamentRegistrations,
    jockeyInvitations,
    raceEntries: raceEntries.map((entry) => ({
      ...entry,
      ownerConfirmed: bool(entry.ownerConfirmed),
      jockeyConfirmed: bool(entry.jockeyConfirmed),
      disqualified: bool(entry.disqualified),
    })),
    notifications: notifications.map((notification) => ({
      ...notification,
      read: bool(notification.isRead),
      isRead: undefined,
    })),
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
  'raceEntries',
  'jockeyInvitations',
  'jockeyTournamentRegistrations',
  'jockeyProfiles',
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
      ['id', 'name', 'email', 'password', 'role', 'status'],
      db.users || []
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
      ],
      db.tournaments || []
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
        'healthStatus',
        'profileNotes',
        'ownerUserId',
        'status',
        'selectedJockeyUserId',
        'jockeyConfirmation',
        'veterinaryCertificateUrl',
        'createdAt',
      ],
      (db.horses || []).map((horse) => ({
        ...horse,
        species: horse.species || '',
        sex: horse.sex || '',
        color: horse.color || '',
        weightKg: horse.weightKg ?? 0,
        heightCm: horse.heightCm ?? 0,
        baseHandicap: horse.baseHandicap ?? 0,
        healthStatus: horse.healthStatus || '',
        profileNotes: horse.profileNotes || '',
        createdAt: horse.createdAt || null,
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
        'date',
        'time',
        'venue',
        'distance',
        'surface',
        'raceClass',
        'handicapMin',
        'handicapMax',
        'totalPrize',
        'refereeUserId',
        'refereeUserIds',
        'referee',
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
      ],
      (db.races || []).map((race) => ({
        ...race,
        refereeUserIds: race.refereeUserIds || race.refereeUserId || '',
        registrationPeriodMinutes: race.registrationPeriodMinutes || 10,
        registrationOpensAt: race.registrationOpensAt || null,
        registrationClosesAt: race.registrationClosesAt || null,
        resultStatus: race.resultStatus || 'draft',
        awardsPublished: race.awardsPublished ?? false,
        handicapMin: race.handicapMin ?? 0,
        handicapMax: race.handicapMax ?? 0,
        raceNumber: race.raceNumber || '',
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
      db.jockeyProfiles || []
    );

    await insertRows(
      client,
      'jockeyTournamentRegistrations',
      ['id', 'tournamentId', 'jockeyUserId', 'status', 'createdAt', 'reviewedAt'],
      db.jockeyTournamentRegistrations || []
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
      db.jockeyInvitations || []
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
        ownerConfirmed: entry.ownerConfirmed ?? false,
        jockeyConfirmed: entry.jockeyConfirmed ?? false,
        preRaceStatus: entry.preRaceStatus || 'pending',
        disqualified: entry.disqualified ?? false,
        resultStatus: entry.resultStatus || 'draft',
        position: entry.position ?? null,
        finishTime: entry.finishTime || '',
        notes: entry.notes || '',
        violationNotes: entry.violationNotes || '',
      }))
    );

    await insertRows(
      client,
      'notifications',
      ['id', 'userId', 'title', 'message', 'isRead', 'createdAt'],
      (db.notifications || []).map((notification) => ({
        ...notification,
        isRead: notification.read ? 1 : 0,
      }))
    );

    await insertRows(
      client,
      'sessions',
      ['token', 'userId', 'createdAt'],
      db.sessions || []
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
