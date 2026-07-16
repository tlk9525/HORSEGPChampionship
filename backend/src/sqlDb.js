import { createHash } from 'node:crypto';
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
let runtimeSchemaPromise;
const dbBaselines = new WeakMap();

// Trả về connection pool PostgreSQL (tạo mới nếu chưa tồn tại) để tái sử dụng kết nối hiệu quả
const getPool = () => {
  if (!pool) {
    pool = new Pool(postgresConfig);
  }

  return pool;
};

const requiredRuntimeTables = [
  'users',
  'tournaments',
  'horses',
  'races',
  'raceRefereeAssignments',
  'raceActionLogs',
  'jockeyProfiles',
  'jockeyRaceRegistrations',
  'jockeyInvitations',
  'horseRaceRegistrations',
  'raceEntries',
  'refereeReports',
  'notifications',
  'sessions',
];

// Betting schema is applied before the required-table check so existing DBs
// without wallets/bets do not fail /api/spectator/* with "Request failed".
const ensureBettingSchema = async () => {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS "wallets" (
      "userId" VARCHAR(64) PRIMARY KEY,
      "credits" NUMERIC(12, 2) NOT NULL DEFAULT 100 CHECK ("credits" >= 0),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "fk_wallets_user"
        FOREIGN KEY ("userId") REFERENCES "users" ("id")
        ON DELETE CASCADE
    )
  `);
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS "bets" (
      "id" VARCHAR(64) PRIMARY KEY,
      "userId" VARCHAR(64) NOT NULL,
      "raceId" VARCHAR(64) NOT NULL,
      "raceEntryId" VARCHAR(64) NOT NULL,
      "amount" NUMERIC(12, 2) NOT NULL CHECK ("amount" > 0),
      "status" VARCHAR(32) NOT NULL DEFAULT 'pending'
        CHECK ("status" IN ('pending', 'won', 'lost', 'cancelled', 'refunded')),
      "payout" NUMERIC(12, 2) NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "settledAt" TIMESTAMPTZ,
      CONSTRAINT "fk_bets_user"
        FOREIGN KEY ("userId") REFERENCES "users" ("id")
        ON DELETE CASCADE,
      CONSTRAINT "fk_bets_race"
        FOREIGN KEY ("raceId") REFERENCES "races" ("id")
        ON DELETE CASCADE,
      CONSTRAINT "fk_bets_race_entry"
        FOREIGN KEY ("raceEntryId") REFERENCES "raceEntries" ("id")
        ON DELETE CASCADE
    )
  `);
  await getPool().query(
    'CREATE INDEX IF NOT EXISTS "idx_bets_user" ON "bets" ("userId", "status")'
  );
  await getPool().query(
    'CREATE INDEX IF NOT EXISTS "idx_bets_race" ON "bets" ("raceId", "status")'
  );
  await getPool().query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "uq_bet_user_entry_pending"
      ON "bets" ("userId", "raceEntryId")
      WHERE "status" = 'pending'
  `);
  await getPool().query(
    'ALTER TABLE "bets" DROP CONSTRAINT IF EXISTS "uq_bet_user_entry"'
  );
  await getPool().query(
    'ALTER TABLE "bets" ADD COLUMN IF NOT EXISTS "payout" NUMERIC(12, 2) NOT NULL DEFAULT 0'
  );
  await getPool().query(
    'ALTER TABLE "bets" ADD COLUMN IF NOT EXISTS "settledAt" TIMESTAMPTZ'
  );
  await getPool().query(`
    INSERT INTO "wallets" ("userId", "credits", "updatedAt")
    SELECT u."id", 100, NOW()
    FROM "users" u
    WHERE u."role" = 'spectator'
    ON CONFLICT ("userId") DO NOTHING
  `);

  const { rows: creditColumn } = await getPool().query(`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'credits'
  `);
  if (creditColumn.length) {
    await getPool().query(`
      UPDATE "wallets" AS w
      SET
        "credits" = COALESCE(u."credits", w."credits"),
        "updatedAt" = NOW()
      FROM "users" AS u
      WHERE u."id" = w."userId"
        AND u."role" = 'spectator'
        AND u."credits" IS NOT NULL
    `);
  }
};

// Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến ensure runtime schema.
const ensureRuntimeSchema = async () => {
  if (!runtimeSchemaPromise) {
    runtimeSchemaPromise = (async () => {
      const { rows } = await getPool().query(
        `
          SELECT "tableName"
          FROM unnest($1::text[]) AS required("tableName")
          WHERE to_regclass($2 || '.' || quote_ident("tableName")) IS NULL
        `,
        [requiredRuntimeTables, 'public']
      );

      if (rows.length) {
        throw new Error(
          'Database schema is missing tables: ' +
            rows.map((row) => row.tableName).join(', ') +
            '. Run npm run db:init.'
        );
      }

      // Soft-create betting tables after core schema is present.
      await ensureBettingSchema();

      await getPool().query(
        'ALTER TABLE "races" ADD COLUMN IF NOT EXISTS "replayTimeline" JSONB'
      );
      await getPool().query(
        'ALTER TABLE "raceEntries" ADD COLUMN IF NOT EXISTS "resultOutcome" VARCHAR(32) NOT NULL DEFAULT \'finished\''
      );
      await getPool().query(
        'ALTER TABLE "raceEntries" ADD COLUMN IF NOT EXISTS "incidentReason" TEXT'
      );
      await getPool().query(
        `CREATE TABLE IF NOT EXISTS "systemSettings" (
          "key" VARCHAR(128) PRIMARY KEY,
          "value" TEXT NOT NULL,
          "updatedBy" VARCHAR(64),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT "fk_system_settings_updated_by"
            FOREIGN KEY ("updatedBy") REFERENCES "users" ("id")
            ON DELETE SET NULL
        )`
      );
    })().catch((error) => {
      runtimeSchemaPromise = null;
      throw error;
    });
  }

  return runtimeSchemaPromise;
};

// Bao gọc một tên cột hoặc bảng bằng dấu ngoặc kép để an toàn trong câu truy vấn SQL
const identifier = (name) => `"${String(name).replace(/"/g, '""')}"`;
// Tạo chuỗi danh sách các cột đã được bao gọc bằng dấu ngoặc kép, nối bằng dấu phẩy
const columnList = (columns) => columns.map(identifier).join(', ');

// Thực thi câu truy vấn SQL và trả về mảng các hàng kết quả
const query = async (text, values = []) => {
  const result = await getPool().query(text, values);
  return result.rows;
};

// Lấy toàn bộ dữ liệu của một bảng và sắp xếp theo cột chỉ định
const selectAll = (tableName, orderBy) =>
  query(
    `SELECT * FROM ${identifier(tableName)} ORDER BY ${orderBy
      .map((item) => `${identifier(item.column)} ${item.direction || ''}`.trim())
      .join(', ')}`
  );

// Chuyển giá trị sang Boolean
const bool = (value) => Boolean(value);
// Trả về thời gian hiện tại dưới dạng chuỗi ISO 8601
const nowIso = () => new Date().toISOString();

// Cộng thêm số ngày vào một ngày cụ thể và trả về chuỗi ISO 8601
const addDaysIso = (dateValue, days) =>
  new Date(new Date(dateValue || nowIso()).getTime() + days * 24 * 60 * 60 * 1000).toISOString();

// Định dạng thời gian race sang HH:MM, đảm bảo luôn có 2 chữ số
const formatRaceTime = (value) => {
  if (!value) return '';
  const [hours = '00', minutes = '00'] = String(value).split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
};

// Định dạng giá trị ngày sang chuỗi YYYY-MM-DD, hỗ trợ cả đối tượng Date lẫn chuỗi
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

// Trả về object có createdAt và updatedAt, dùng fallback nếu giá trị không tồn tại
const rowTimestamps = (row, fallbackCreatedAt = nowIso()) => ({
  createdAt: row.createdAt || fallbackCreatedAt,
  updatedAt: row.updatedAt || row.createdAt || fallbackCreatedAt,
});

// Đọc toàn bộ database từ PostgreSQL và trả về object chứa tất cả dữ liệu đã được format
export const readDb = async () => {
  await ensureRuntimeSchema();

  const [
    users,
    tournaments,
    horses,
    races,
    jockeyProfiles,
    jockeyRaceRegistrations,
    jockeyInvitations,
    horseRaceRegistrations,
    raceEntries,
    raceRefereeAssignments,
    raceActionLogs,
    refereeReports,
    notifications,
    sessions,
    bets,
    wallets,
    systemSettings,
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
    selectAll('jockeyRaceRegistrations', [
      { column: 'createdAt', direction: 'DESC' },
      { column: 'id' },
    ]),
    selectAll('jockeyInvitations', [
      { column: 'createdAt', direction: 'DESC' },
      { column: 'id' },
    ]),
    selectAll('horseRaceRegistrations', [
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
    selectAll('raceActionLogs', [
      { column: 'createdAt', direction: 'DESC' },
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
    selectAll('bets', [
      { column: 'createdAt', direction: 'DESC' },
      { column: 'id' },
    ]),
    selectAll('wallets', [{ column: 'userId' }]),
    selectAll('systemSettings', [{ column: 'key' }]),
  ]);

  const walletCreditsByUserId = new Map(
    wallets.map((wallet) => [wallet.userId, Number(wallet.credits ?? 0)])
  );

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

  const db = {
    users: users.map((user) => ({
      ...user,
      credits:
        user.role === 'spectator'
          ? walletCreditsByUserId.has(user.id)
            ? walletCreditsByUserId.get(user.id)
            : 100
          : null,
    })),
    wallets: wallets.map((wallet) => ({
      userId: wallet.userId,
      credits: Number(wallet.credits ?? 0),
      updatedAt: wallet.updatedAt || nowIso(),
    })),
    tournaments: tournaments.map((tournament) => ({
      ...tournament,
      startDate: formatDateOnly(tournament.startDate),
      finalDate: formatDateOnly(tournament.finalDate),
    })),
    horses,
    races: racesWithAssignments,
    jockeyProfiles,
    jockeyRaceRegistrations,
    jockeyInvitations,
    horseRaceRegistrations,
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
    raceActionLogs,
    refereeReports,
    sessions,
    bets: bets.map((bet) => ({
      ...bet,
      amount: Number(bet.amount),
      payout: Number(bet.payout ?? 0),
    })),
    systemSettings,
  };

  dbBaselines.set(db, structuredClone(db));
  return db;
};

// Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến comparable value.
const comparableValue = (row, column) => {
  const value =
    column === 'isRead' && row[column] === undefined
      ? row.read
      : row[column];

  if (value instanceof Date) return value.toISOString();
  return value ?? null;
};

// Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến row key.
const rowKey = (row, keyColumn) => String(row[keyColumn] ?? '');

// Chỉ UPSERT các hàng mới hoặc thực sự thay đổi so với snapshot lúc request bắt đầu.
const upsertChangedRows = async (
  client,
  tableName,
  columns,
  rows = [],
  baselineRows = [],
  keyColumn = columns[0]
) => {
  if (!rows.length) return;

  const columnsSql = columnList(columns);
  const params = columns.map((_, index) => `$${index + 1}`).join(', ');
  const updateColumns = columns.filter((column) => column !== keyColumn);
  const conflictSql = updateColumns.length
    ? `DO UPDATE SET ${updateColumns
        .map(
          (column) =>
            `${identifier(column)} = EXCLUDED.${identifier(column)}`
        )
        .join(', ')}`
    : 'DO NOTHING';
  const baselineByKey = new Map(
    baselineRows.map((row) => [rowKey(row, keyColumn), row])
  );

  for (const row of rows) {
    const baselineRow = baselineByKey.get(rowKey(row, keyColumn));
    const changed =
      !baselineRow ||
      columns.some(
        (column) =>
          JSON.stringify(comparableValue(row, column)) !==
          JSON.stringify(comparableValue(baselineRow, column))
      );
    if (!changed) continue;

    await client.query(
      `INSERT INTO ${identifier(tableName)} (${columnsSql})
       VALUES (${params})
       ON CONFLICT (${identifier(keyColumn)}) ${conflictSql}`,
      columns.map((column) => row[column])
    );
  }
};

// Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến derived referee assignment id.
const derivedRefereeAssignmentId = (raceId, refereeUserId) => {
  const digest = createHash('sha1')
    .update(`${raceId}:${refereeUserId}`)
    .digest('hex')
    .slice(0, 24);

  return `rra_${digest}`;
};

const tableDeleteOrder = [
  'notifications',
  'sessions',
  'bets',
  'wallets',
  'raceActionLogs',
  'refereeReports',
  'raceEntries',
  'horseRaceRegistrations',
  'jockeyInvitations',
  'jockeyRaceRegistrations',
  'jockeyProfiles',
  'raceRefereeAssignments',
  'races',
  'horses',
  'tournaments',
  'users',
];

// Ghi các hàng thay đổi vào PostgreSQL và chỉ xóa các hàng bị loại khỏi snapshot.
export const writeDb = async (db) => {
  await ensureRuntimeSchema();

  const client = await getPool().connect();
  const baseline = dbBaselines.get(db) || {};
  const persistedRows = new Map();
  const baselineUsersById = new Map(
    (baseline.users || []).map((user) => [user.id, user])
  );
  // Ghi chú: Hàm này xử lý nghiệp vụ liên quan đến write rows.
  const writeRows = async (tableName, columns, rows = [], keyColumn) => {
    persistedRows.set(tableName, rows);
    await upsertChangedRows(
      client,
      tableName,
      columns,
      rows,
      baseline[tableName] || [],
      keyColumn || (tableName === 'sessions' ? 'token' : 'id')
    );
  };

  try {
    await client.query('BEGIN');

    await writeRows(
      'users',
      ['id', 'name', 'email', 'password', 'role', 'status', 'createdAt', 'updatedAt'],
      (db.users || []).map((user) => ({
        ...user,
        password:
          user.password ?? baselineUsersById.get(user.id)?.password ?? '',
        ...rowTimestamps(user),
      }))
    );

    await writeRows(
      'tournaments',
      [
        'id',
        'name',
        'status',
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

    await writeRows(
      'horses',
      [
        'id',
        'name',
        'breed',
        'species',
        'age',
        'sex',
        'color',
        'weightLb',
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
        weightLb: horse.weightLb ?? 0,
        heightCm: horse.heightCm ?? 0,
        baseHandicap: horse.baseHandicap ?? 0,
        speedRating: horse.speedRating ?? 75,
        staminaRating: horse.staminaRating ?? 75,
        formRating: horse.formRating ?? 75,
        healthRating: horse.healthRating ?? 75,
        overallRating: horse.overallRating ?? 75,
        healthStatus: horse.healthStatus || '',
        profileNotes: horse.profileNotes || '',
        createdAt: horse.createdAt || null,
        updatedAt: horse.updatedAt || horse.createdAt || null,
      }))
    );

    await writeRows(
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
        'ratingMin',
        'ratingMax',
        'handicapMin',
        'handicapMax',
        'totalPrize',
        'status',
        'participants',
        'ownerConfirmed',
        'jockeyConfirmed',
        'registrationOpensAt',
        'registrationClosesAt',
        'resultStatus',
        'awardsPublished',
        'replayTimeline',
        'createdBy',
        'createdAt',
        'updatedAt',
      ],
      (db.races || []).map((race) => ({
        ...race,
        raceDate: race.raceDate || race.date || null,
        raceTime: race.raceTime || race.time || null,
        registrationOpensAt: race.registrationOpensAt || null,
        registrationClosesAt: race.registrationClosesAt || null,
        resultStatus: race.resultStatus || 'draft',
        awardsPublished: race.awardsPublished ?? false,
        replayTimeline: race.replayTimeline || null,
        ratingMin: race.ratingMin ?? 0,
        ratingMax: race.ratingMax ?? 140,
        handicapMin: race.handicapMin ?? 115,
        handicapMax: race.handicapMax ?? 135,
        raceNumber: race.raceNumber || '',
        createdAt: race.createdAt || null,
        updatedAt: race.updatedAt || race.createdAt || null,
      }))
    );

    await writeRows(
      'jockeyProfiles',
      [
        'id',
        'userId',
        'bio',
        'certificate',
        'competitionLevel',
        'weightLb',
        'status',
        'updatedAt',
      ],
      (db.jockeyProfiles || []).map((profile) => ({
        ...profile,
        updatedAt: profile.updatedAt || null,
      }))
    );

    await writeRows(
      'jockeyRaceRegistrations',
      ['id', 'raceId', 'jockeyUserId', 'status', 'createdAt', 'reviewedAt'],
      (db.jockeyRaceRegistrations || []).map((registration) => ({
        ...registration,
        reviewedAt: registration.reviewedAt || null,
      }))
    );

    await writeRows(
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

    await writeRows(
      'horseRaceRegistrations',
      [
        'id',
        'tournamentId',
        'raceId',
        'horseId',
        'ownerUserId',
        'jockeyUserId',
        'invitationId',
        'status',
        'notes',
        'createdAt',
        'reviewedAt',
      ],
      (db.horseRaceRegistrations || []).map((registration) => ({
        ...registration,
        raceId: registration.raceId || null,
        jockeyUserId: registration.jockeyUserId || null,
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
          Array.from(
            new Set(
              String(race.refereeUserIds || race.refereeUserId || '')
                .split(',')
                .map((refereeUserId) => refereeUserId.trim())
                .filter(Boolean)
            )
          )
            .map((refereeUserId) => ({
              id: derivedRefereeAssignmentId(race.id, refereeUserId),
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

    await writeRows(
      'raceRefereeAssignments',
      ['id', 'raceId', 'refereeUserId', 'assignedBy', 'status', 'assignedAt'],
      derivedRefereeAssignments.map((assignment) => ({
        ...assignment,
        status: assignment.status || 'assigned',
        assignedAt: assignment.assignedAt || new Date().toISOString(),
      }))
    );

    await writeRows(
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
        'ratingChange',
        'postRaceRating',
        'ownerConfirmed',
        'jockeyConfirmed',
        'preRaceStatus',
        'disqualified',
        'resultStatus',
        'resultOutcome',
        'position',
        'finishTime',
        'notes',
        'incidentReason',
        'violationNotes',
        'createdAt',
      ],
      (db.raceEntries || []).map((entry) => ({
        ...entry,
        lane: entry.lane ?? null,
        handicap: entry.handicap ?? 0,
        ratingSnapshot: entry.ratingSnapshot ?? 0,
        ratingChange: entry.ratingChange ?? 0,
        postRaceRating: entry.postRaceRating ?? 0,
        ownerConfirmed: entry.ownerConfirmed ?? false,
        jockeyConfirmed: entry.jockeyConfirmed ?? false,
        preRaceStatus: entry.preRaceStatus || 'pending',
        disqualified: entry.disqualified ?? false,
        resultStatus: entry.resultStatus || 'draft',
        resultOutcome: entry.resultOutcome || 'finished',
        position: entry.position ?? null,
        finishTime: entry.finishTime || '',
        notes: entry.notes || '',
        incidentReason: entry.incidentReason || '',
        violationNotes: entry.violationNotes || '',
        invitationId: entry.invitationId || null,
        createdAt: entry.createdAt || null,
      }))
    );

    await writeRows(
      'raceActionLogs',
      ['id', 'raceId', 'userId', 'action', 'fromStatus', 'toStatus', 'details', 'createdAt'],
      (db.raceActionLogs || []).map((log) => ({
        ...log,
        userId: log.userId || null,
        fromStatus: log.fromStatus || null,
        toStatus: log.toStatus || null,
        details: log.details || '',
        createdAt: log.createdAt || nowIso(),
      }))
    );

    await writeRows(
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

    await writeRows(
      'notifications',
      ['id', 'userId', 'type', 'title', 'message', 'isRead', 'createdAt'],
      (db.notifications || []).map((notification) => ({
        ...notification,
        type: notification.type || 'general',
        isRead: Boolean(notification.read),
      }))
    );

    await writeRows(
      'bets',
      ['id', 'userId', 'raceId', 'raceEntryId', 'amount', 'status', 'payout', 'createdAt', 'settledAt'],
      (db.bets || []).map((bet) => ({
        ...bet,
        amount: Number(bet.amount),
        status: bet.status || 'pending',
        payout: Number(bet.payout ?? 0),
        createdAt: bet.createdAt || nowIso(),
        settledAt: bet.settledAt || null,
      }))
    );

    const walletsFromUsers = (db.users || [])
      .filter((user) => user.role === 'spectator')
      .map((user) => ({
        userId: user.id,
        credits: Number(user.credits ?? 100),
        updatedAt: user.updatedAt || nowIso(),
      }));
    const walletByUserId = new Map(
      (db.wallets || []).map((wallet) => [wallet.userId, wallet])
    );
    for (const wallet of walletsFromUsers) {
      walletByUserId.set(wallet.userId, {
        ...(walletByUserId.get(wallet.userId) || {}),
        ...wallet,
      });
    }

    await writeRows(
      'wallets',
      ['userId', 'credits', 'updatedAt'],
      [...walletByUserId.values()].map((wallet) => ({
        userId: wallet.userId,
        credits: Number(wallet.credits ?? 0),
        updatedAt: wallet.updatedAt || nowIso(),
      })),
      'userId'
    );

    await writeRows(
      'sessions',
      ['token', 'userId', 'createdAt', 'expiresAt'],
      (db.sessions || []).map((session) => ({
        ...session,
        createdAt: session.createdAt || nowIso(),
        expiresAt: session.expiresAt || addDaysIso(session.createdAt, SESSION_DAYS),
      }))
    );

    await writeRows(
      'systemSettings',
      ['key', 'value', 'updatedBy', 'updatedAt'],
      db.systemSettings || [],
      'key'
    );

    for (const tableName of tableDeleteOrder) {
      const keyColumn =
        tableName === 'sessions'
          ? 'token'
          : tableName === 'wallets'
            ? 'userId'
            : 'id';
      const currentKeys = new Set(
        (persistedRows.get(tableName) || []).map((row) => rowKey(row, keyColumn))
      );
      const removedRows = (baseline[tableName] || []).filter(
        (row) => !currentKeys.has(rowKey(row, keyColumn))
      );

      for (const row of removedRows) {
        await client.query(
          `DELETE FROM ${identifier(tableName)}
           WHERE ${identifier(keyColumn)} = $1`,
          [row[keyColumn]]
        );
      }
    }

    await client.query('COMMIT');
    dbBaselines.set(db, structuredClone(db));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Cập nhật một kết quả race entry bằng row-level update để tránh writeDb ghi lại toàn bộ database.
export const persistRaceEntryResult = async (entry, report = null) => {
  await ensureRuntimeSchema();

  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE "raceEntries"
       SET "position" = $2,
           "finishTime" = $3,
           "notes" = $4,
           "violationNotes" = $5,
           "resultStatus" = $6,
           "resultOutcome" = $7,
           "incidentReason" = $8,
           "disqualified" = $9
       WHERE "id" = $1`,
      [
        entry.id,
        entry.position ?? null,
        entry.finishTime || '',
        entry.notes || '',
        entry.violationNotes || '',
        entry.resultStatus || 'draft',
        entry.resultOutcome || 'finished',
        entry.incidentReason || '',
        Boolean(entry.disqualified),
      ]
    );

    if (report) {
      await client.query(
        `INSERT INTO "refereeReports" (
          "id",
          "raceId",
          "raceEntryId",
          "refereeUserId",
          "reportType",
          "description",
          "violation",
          "status",
          "createdAt",
          "reviewedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT ("id") DO UPDATE
        SET "description" = EXCLUDED."description",
            "violation" = EXCLUDED."violation",
            "status" = EXCLUDED."status",
            "reviewedAt" = EXCLUDED."reviewedAt"`,
        [
          report.id,
          report.raceId,
          report.raceEntryId || null,
          report.refereeUserId,
          report.reportType || 'violation',
          report.description || '',
          report.violation || '',
          report.status || 'submitted',
          report.createdAt || nowIso(),
          report.reviewedAt || null,
        ]
      );
    } else if (!String(entry.violationNotes || '').trim()) {
      await client.query(
        `UPDATE "refereeReports"
         SET "status" = 'dismissed',
             "reviewedAt" = NOW()
         WHERE "raceEntryId" = $1
           AND "reportType" = 'violation'
           AND "status" IN ('draft', 'submitted')`,
        [entry.id]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Cập nhật readiness của một race entry bằng row-level update cho thao tác Referee nhanh hơn.
export const persistRaceEntryReadiness = async (entry) => {
  await ensureRuntimeSchema();

  await getPool().query(
    `UPDATE "raceEntries"
     SET "preRaceStatus" = $2,
         "disqualified" = $3,
         "status" = $4,
         "resultStatus" = $5
     WHERE "id" = $1`,
    [
      entry.id,
      entry.preRaceStatus || 'pending',
      Boolean(entry.disqualified),
      entry.status || 'approved',
      entry.resultStatus || 'draft',
    ]
  );
};

// Lưu các thay đổi vận hành race trong một transaction nhỏ, không rewrite toàn DB.
export const persistRefereeRaceAction = async ({
  race,
  raceEntries = [],
  tournament = null,
  notifications = [],
  actionLogs = [],
}) => {
  await ensureRuntimeSchema();

  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE "races"
       SET "status" = $2,
           "resultStatus" = $3,
           "awardsPublished" = $4,
           "replayTimeline" = $5,
           "updatedAt" = $6
       WHERE "id" = $1`,
      [
        race.id,
        race.status,
        race.resultStatus || 'draft',
        Boolean(race.awardsPublished),
        race.replayTimeline || null,
        race.updatedAt || nowIso(),
      ]
    );

    if (tournament) {
      await client.query(
        `UPDATE "tournaments"
         SET "status" = $2,
             "updatedAt" = $3
         WHERE "id" = $1`,
        [
          tournament.id,
          tournament.status,
          tournament.updatedAt || nowIso(),
        ]
      );
    }

    for (const entry of raceEntries) {
      await client.query(
        `UPDATE "raceEntries"
         SET "preRaceStatus" = $2,
             "disqualified" = $3,
             "resultStatus" = $4,
             "resultOutcome" = $5,
             "position" = $6,
             "finishTime" = $7,
             "notes" = $8,
             "incidentReason" = $9,
             "violationNotes" = $10
         WHERE "id" = $1`,
        [
          entry.id,
          entry.preRaceStatus || 'pending',
          Boolean(entry.disqualified),
          entry.resultStatus || 'draft',
          entry.resultOutcome || 'finished',
          entry.position ?? null,
          entry.finishTime || '',
          entry.notes || '',
          entry.incidentReason || '',
          entry.violationNotes || '',
        ]
      );
    }

    for (const notification of notifications) {
      await client.query(
        `INSERT INTO "notifications" (
          "id", "userId", "type", "title", "message", "isRead", "createdAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT ("id") DO NOTHING`,
        [
          notification.id,
          notification.userId,
          notification.type || 'general',
          notification.title || '',
          notification.message || '',
          Boolean(notification.read),
          notification.createdAt || nowIso(),
        ]
      );
    }

    for (const log of actionLogs) {
      await client.query(
        `INSERT INTO "raceActionLogs" (
          "id", "raceId", "userId", "action", "fromStatus", "toStatus", "details", "createdAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT ("id") DO NOTHING`,
        [
          log.id,
          log.raceId,
          log.userId || null,
          log.action,
          log.fromStatus || null,
          log.toStatus || null,
          log.details || '',
          log.createdAt || nowIso(),
        ]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Lưu thao tác Admin trên race bằng row-level update để tránh rewrite toàn DB.
export const persistAdminRaceAction = async ({
  race,
  raceEntries = [],
  horses = [],
  tournament = null,
  bets = [],
  users = [],
  notifications = [],
  actionLogs = [],
}) => {
  await ensureRuntimeSchema();

  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE "races"
       SET "status" = $2,
           "participants" = $3,
           "ownerConfirmed" = $4,
           "jockeyConfirmed" = $5,
           "resultStatus" = $6,
           "awardsPublished" = $7,
           "replayTimeline" = $8,
           "updatedAt" = $9
       WHERE "id" = $1`,
      [
        race.id,
        race.status,
        Number(race.participants || 0),
        Number(race.ownerConfirmed || 0),
        Number(race.jockeyConfirmed || 0),
        race.resultStatus || 'draft',
        Boolean(race.awardsPublished),
        race.replayTimeline || null,
        race.updatedAt || nowIso(),
      ]
    );

    if (tournament) {
      await client.query(
        `UPDATE "tournaments"
         SET "status" = $2,
             "updatedAt" = $3
         WHERE "id" = $1`,
        [
          tournament.id,
          tournament.status,
          tournament.updatedAt || nowIso(),
        ]
      );
    }

    for (const entry of raceEntries) {
      await client.query(
        `UPDATE "raceEntries"
         SET "lane" = $2,
             "handicap" = $3,
             "ratingSnapshot" = $4,
             "ratingChange" = $5,
             "postRaceRating" = $6,
             "preRaceStatus" = $7,
             "disqualified" = $8,
             "status" = $9,
             "resultStatus" = $10,
             "resultOutcome" = $11,
             "position" = $12,
             "finishTime" = $13,
             "notes" = $14,
             "incidentReason" = $15,
             "violationNotes" = $16
         WHERE "id" = $1`,
        [
          entry.id,
          entry.lane ?? null,
          entry.handicap ?? 0,
          entry.ratingSnapshot ?? 0,
          entry.ratingChange ?? 0,
          entry.postRaceRating ?? 0,
          entry.preRaceStatus || 'pending',
          Boolean(entry.disqualified),
          entry.status || 'approved',
          entry.resultStatus || 'draft',
          entry.resultOutcome || 'finished',
          entry.position ?? null,
          entry.finishTime || '',
          entry.notes || '',
          entry.incidentReason || '',
          entry.violationNotes || '',
        ]
      );
    }

    for (const horse of horses) {
      await client.query(
        `UPDATE "horses"
         SET "overallRating" = $2,
             "updatedAt" = $3
         WHERE "id" = $1`,
        [
          horse.id,
          horse.overallRating ?? 75,
          horse.updatedAt || nowIso(),
        ]
      );
    }

    for (const bet of bets) {
      await client.query(
        `UPDATE "bets"
         SET "status" = $2,
             "payout" = $3,
             "settledAt" = $4
         WHERE "id" = $1`,
        [
          bet.id,
          bet.status || 'pending',
          Number(bet.payout ?? 0),
          bet.settledAt || null,
        ]
      );
    }

    for (const user of users) {
      await client.query(
        `INSERT INTO "wallets" ("userId", "credits", "updatedAt")
         VALUES ($1, $2, $3)
         ON CONFLICT ("userId") DO UPDATE SET
           "credits" = EXCLUDED."credits",
           "updatedAt" = EXCLUDED."updatedAt"`,
        [
          user.id,
          Number(user.credits ?? 0),
          user.updatedAt || nowIso(),
        ]
      );
    }

    for (const notification of notifications) {
      await client.query(
        `INSERT INTO "notifications" (
          "id", "userId", "type", "title", "message", "isRead", "createdAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT ("id") DO NOTHING`,
        [
          notification.id,
          notification.userId,
          notification.type || 'general',
          notification.title || '',
          notification.message || '',
          Boolean(notification.read),
          notification.createdAt || nowIso(),
        ]
      );
    }

    for (const log of actionLogs) {
      await client.query(
        `INSERT INTO "raceActionLogs" (
          "id", "raceId", "userId", "action", "fromStatus", "toStatus", "details", "createdAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT ("id") DO NOTHING`,
        [
          log.id,
          log.raceId,
          log.userId || null,
          log.action,
          log.fromStatus || null,
          log.toStatus || null,
          log.details || '',
          log.createdAt || nowIso(),
        ]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Lưu thay đổi đăng nhập mà không rewrite toàn bộ database.
export const persistLoginSession = async (user, session, expiredBefore) => {
  await ensureRuntimeSchema();

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE "users"
       SET "password" = $2,
           "updatedAt" = $3
       WHERE "id" = $1`,
      [user.id, user.password, user.updatedAt || nowIso()]
    );
    await client.query(
      `DELETE FROM "sessions" WHERE "expiresAt" <= $1`,
      [expiredBefore || nowIso()]
    );
    await client.query(
      `INSERT INTO "sessions" ("token", "userId", "createdAt", "expiresAt")
       VALUES ($1, $2, $3, $4)`,
      [session.token, session.userId, session.createdAt, session.expiresAt]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Lưu tài khoản mới và thông báo liên quan trong một transaction nhỏ.
export const persistRegisteredUser = async (user, notifications = []) => {
  await ensureRuntimeSchema();

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO "users" (
        "id", "name", "email", "password", "role", "status", "createdAt", "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        user.id,
        user.name,
        user.email,
        user.password,
        user.role,
        user.status,
        user.createdAt,
        user.updatedAt,
      ]
    );

    if (user.role === 'spectator') {
      await client.query(
        `INSERT INTO "wallets" ("userId", "credits", "updatedAt")
         VALUES ($1, $2, $3)
         ON CONFLICT ("userId") DO UPDATE SET
           "credits" = EXCLUDED."credits",
           "updatedAt" = EXCLUDED."updatedAt"`,
        [
          user.id,
          Number(user.credits ?? 100),
          user.updatedAt || nowIso(),
        ]
      );
    }

    for (const notification of notifications) {
      await client.query(
        `INSERT INTO "notifications" (
          "id", "userId", "type", "title", "message", "isRead", "createdAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          notification.id,
          notification.userId,
          notification.type || 'general',
          notification.title || '',
          notification.message || '',
          Boolean(notification.read),
          notification.createdAt || nowIso(),
        ]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Lưu cấu hình hệ thống bằng transaction nhỏ, tránh ghi lại toàn bộ database.
export const persistSystemSettings = async (settingsRows = []) => {
  await ensureRuntimeSchema();

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    for (const setting of settingsRows) {
      await client.query(
        `INSERT INTO "systemSettings" ("key", "value", "updatedBy", "updatedAt")
         VALUES ($1, $2, $3, $4)
         ON CONFLICT ("key") DO UPDATE SET
           "value" = EXCLUDED."value",
           "updatedBy" = EXCLUDED."updatedBy",
           "updatedAt" = EXCLUDED."updatedAt"`,
        [
          setting.key,
          setting.value,
          setting.updatedBy || null,
          setting.updatedAt || nowIso(),
        ]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Xóa đúng phiên đăng xuất thay vì ghi lại toàn bộ bảng session.
export const deleteSession = async (token) => {
  if (!token) return;
  await ensureRuntimeSchema();
  await getPool().query(`DELETE FROM "sessions" WHERE "token" = $1`, [token]);
};
