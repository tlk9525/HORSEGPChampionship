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

const ensureRuntimeSchema = async () => {
  if (!runtimeSchemaPromise) {
    runtimeSchemaPromise = (async () => {
      const client = await getPool().connect();

      try {
        await client.query('BEGIN');
        await client.query(`
          CREATE TABLE IF NOT EXISTS "raceActionLogs" (
            "id" VARCHAR(64) PRIMARY KEY,
            "raceId" VARCHAR(64) NOT NULL REFERENCES "races" ("id") ON DELETE CASCADE,
            "userId" VARCHAR(64) REFERENCES "users" ("id") ON DELETE SET NULL,
            "action" VARCHAR(64) NOT NULL,
            "fromStatus" VARCHAR(64),
            "toStatus" VARCHAR(64),
            "details" TEXT,
            "createdAt" TIMESTAMPTZ NOT NULL
          )
        `);
        await client.query(`
          CREATE INDEX IF NOT EXISTS "idx_race_action_logs_race"
          ON "raceActionLogs" ("raceId", "createdAt")
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS "refereeReports" (
            "id" VARCHAR(64) PRIMARY KEY,
            "raceId" VARCHAR(64) NOT NULL REFERENCES "races" ("id") ON DELETE CASCADE,
            "raceEntryId" VARCHAR(64) REFERENCES "raceEntries" ("id") ON DELETE SET NULL,
            "refereeUserId" VARCHAR(64) NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
            "reportType" VARCHAR(64) NOT NULL DEFAULT 'incident',
            "description" TEXT NOT NULL,
            "violation" TEXT,
            "status" VARCHAR(32) NOT NULL DEFAULT 'submitted'
              CHECK ("status" IN ('draft', 'submitted', 'reviewed', 'dismissed')),
            "createdAt" TIMESTAMPTZ NOT NULL,
            "reviewedAt" TIMESTAMPTZ
          )
        `);
        await client.query(`
          CREATE INDEX IF NOT EXISTS "idx_referee_reports_race"
          ON "refereeReports" ("raceId", "status")
        `);
        await client.query(`
          CREATE INDEX IF NOT EXISTS "idx_referee_reports_referee"
          ON "refereeReports" ("refereeUserId", "status")
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS "jockeyRaceRegistrations" (
            "id" VARCHAR(64) PRIMARY KEY,
            "raceId" VARCHAR(64) NOT NULL REFERENCES "races" ("id") ON DELETE CASCADE,
            "jockeyUserId" VARCHAR(64) NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
            "status" VARCHAR(32) NOT NULL DEFAULT 'pending'
              CHECK ("status" IN ('pending', 'approved', 'rejected')),
            "createdAt" TIMESTAMPTZ NOT NULL,
            "reviewedAt" TIMESTAMPTZ,
            CONSTRAINT "uq_jockey_race_registration" UNIQUE ("raceId", "jockeyUserId")
          )
        `);
        await client.query(`
          CREATE INDEX IF NOT EXISTS "idx_jockey_race_registrations_race_status"
          ON "jockeyRaceRegistrations" ("raceId", "status")
        `);
        await client.query(`
          ALTER TABLE "horses"
          ADD COLUMN IF NOT EXISTS "weightLb" NUMERIC(7, 2) NOT NULL DEFAULT 0
        `);
        await client.query(`
          DO $$
          BEGIN
            IF EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_name = 'horses'
                AND column_name = 'weightKg'
            ) THEN
              UPDATE "horses"
              SET "weightLb" = ROUND("weightKg" * 2.20462)
              WHERE "weightLb" = 0 AND "weightKg" > 0;
            END IF;
          END $$;
        `);
        await client.query(`
          ALTER TABLE "horses"
          DROP COLUMN IF EXISTS "weightKg"
        `);
        await client.query(`
          ALTER TABLE "jockeyProfiles"
          ADD COLUMN IF NOT EXISTS "weightLb" NUMERIC(6, 2) NOT NULL DEFAULT 0
        `);
        await client.query(`
          DO $$
          BEGIN
            IF EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_name = 'jockeyProfiles'
                AND column_name = 'weight'
            ) THEN
              UPDATE "jockeyProfiles"
              SET "weightLb" = ROUND("weight" * 2.20462)
              WHERE "weightLb" = 0 AND "weight" > 0;
            END IF;
          END $$;
        `);
        await client.query(`
          ALTER TABLE "jockeyProfiles"
          DROP COLUMN IF EXISTS "weight"
        `);
        await client.query(`
          ALTER TABLE "raceEntries"
          ADD COLUMN IF NOT EXISTS "ratingChange" NUMERIC(6, 2) NOT NULL DEFAULT 0
        `);
        await client.query(`
          ALTER TABLE "raceEntries"
          ADD COLUMN IF NOT EXISTS "postRaceRating" NUMERIC(6, 2) NOT NULL DEFAULT 0
        `);
        await client.query(`
          ALTER TABLE "tournaments"
          ADD COLUMN IF NOT EXISTS "registrationOpensAt" TIMESTAMPTZ
        `);
        await client.query(`
          ALTER TABLE "tournaments"
          ADD COLUMN IF NOT EXISTS "registrationClosesAt" TIMESTAMPTZ
        `);
        await client.query(`
          ALTER TABLE "horseTournamentRegistrations"
          ALTER COLUMN "jockeyUserId" DROP NOT NULL
        `);
        await client.query(`
          ALTER TABLE "horseTournamentRegistrations"
          ADD COLUMN IF NOT EXISTS "raceId" VARCHAR(64)
        `);
        await client.query(`
          UPDATE "horseTournamentRegistrations" AS "registration"
          SET "raceId" = "invitation"."raceId"
          FROM "jockeyInvitations" AS "invitation"
          WHERE "registration"."raceId" IS NULL
            AND "registration"."invitationId" = "invitation"."id"
            AND "invitation"."raceId" IS NOT NULL
        `);
        await client.query(`
          ALTER TABLE "horseTournamentRegistrations"
          DROP CONSTRAINT IF EXISTS "uq_horse_tournament_registration",
          DROP CONSTRAINT IF EXISTS "uq_jockey_tournament_pairing"
        `);
        await client.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS "uq_horse_race_registration"
          ON "horseTournamentRegistrations" ("raceId", "horseId")
          WHERE "raceId" IS NOT NULL
        `);
        await client.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS "uq_jockey_race_pairing"
          ON "horseTournamentRegistrations" ("raceId", "jockeyUserId")
          WHERE "raceId" IS NOT NULL AND "jockeyUserId" IS NOT NULL
        `);
        await client.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint
              WHERE conname = 'fk_horse_tournament_registrations_race'
            ) THEN
              ALTER TABLE "horseTournamentRegistrations"
                ADD CONSTRAINT "fk_horse_tournament_registrations_race"
                FOREIGN KEY ("raceId") REFERENCES "races" ("id")
                ON DELETE CASCADE NOT VALID;
            END IF;
          END $$;
        `);
        await client.query(`
          UPDATE "tournaments" AS "tournament"
          SET
            "registrationOpensAt" = COALESCE(
              "tournament"."registrationOpensAt",
              (
                SELECT MIN("race"."registrationOpensAt")
                FROM "races" AS "race"
                WHERE "race"."tournamentId" = "tournament"."id"
              )
            ),
            "registrationClosesAt" = COALESCE(
              "tournament"."registrationClosesAt",
              (
                SELECT MAX("race"."registrationClosesAt")
                FROM "races" AS "race"
                WHERE "race"."tournamentId" = "tournament"."id"
              )
            )
        `);
        await client.query(`
          UPDATE "races"
          SET
            "handicapMin" = CASE "raceClass"
              WHEN 'Class 1' THEN 115
              WHEN 'Class 2' THEN 115
              WHEN 'Class 3' THEN 113
              WHEN 'Class 4' THEN 112
              WHEN 'Class 5' THEN 110
              ELSE 110
            END,
            "handicapMax" = CASE "raceClass"
              WHEN 'Class 1' THEN 135
              WHEN 'Class 2' THEN 135
              WHEN 'Class 3' THEN 133
              WHEN 'Class 4' THEN 132
              WHEN 'Class 5' THEN 130
              ELSE 135
            END
          WHERE ("handicapMin" = 115 AND "handicapMax" = 135)
             OR "handicapMax" < 100
        `);
        await client.query(`
          WITH "fieldRatings" AS (
            SELECT "raceId", MAX("ratingSnapshot") AS "topRating"
            FROM "raceEntries"
            WHERE "ratingSnapshot" > 0
            GROUP BY "raceId"
          )
          UPDATE "raceEntries" AS "entry"
          SET "handicap" = LEAST(
            "race"."handicapMax",
            GREATEST(
            "race"."handicapMin",
            ROUND(
              "race"."handicapMax" -
              ("fieldRatings"."topRating" - "entry"."ratingSnapshot")
            )
            )
          )
          FROM "fieldRatings", "races" AS "race"
          WHERE "entry"."raceId" = "fieldRatings"."raceId"
            AND "entry"."raceId" = "race"."id"
            AND "entry"."ratingSnapshot" > 0
        `);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        runtimeSchemaPromise = undefined;
        throw error;
      } finally {
        client.release();
      }
    })();
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
    horseTournamentRegistrations,
    raceEntries,
    raceRefereeAssignments,
    raceActionLogs,
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
    selectAll('jockeyRaceRegistrations', [
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

  const db = {
    users,
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
    raceActionLogs,
    refereeReports,
    sessions,
  };

  dbBaselines.set(db, structuredClone(db));
  return db;
};

const comparableValue = (row, column) => {
  const value =
    column === 'isRead' && row[column] === undefined
      ? row.read
      : row[column];

  if (value instanceof Date) return value.toISOString();
  return value ?? null;
};

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

const tableDeleteOrder = [
  'notifications',
  'sessions',
  'raceActionLogs',
  'refereeReports',
  'raceEntries',
  'horseTournamentRegistrations',
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
  const writeRows = async (tableName, columns, rows = []) => {
    persistedRows.set(tableName, rows);
    await upsertChangedRows(
      client,
      tableName,
      columns,
      rows,
      baseline[tableName] || [],
      tableName === 'sessions' ? 'token' : 'id'
    );
  };

  try {
    await client.query('BEGIN');

    await writeRows(
      'users',
      ['id', 'name', 'email', 'password', 'role', 'status', 'createdAt', 'updatedAt'],
      (db.users || []).map((user) => ({
        ...user,
        ...rowTimestamps(user),
      }))
    );

    await writeRows(
      'tournaments',
      [
        'id',
        'name',
        'status',
        'registrationWindow',
        'registrationOpensAt',
        'registrationClosesAt',
        'startDate',
        'finalDate',
        'location',
        'prizePool',
        'createdAt',
        'updatedAt',
      ],
      (db.tournaments || []).map((tournament) => ({
        ...tournament,
        registrationWindow: tournament.registrationWindow || null,
        registrationOpensAt: tournament.registrationOpensAt || null,
        registrationClosesAt: tournament.registrationClosesAt || null,
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
      'horseTournamentRegistrations',
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
      (db.horseTournamentRegistrations || []).map((registration) => ({
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
        ratingChange: entry.ratingChange ?? 0,
        postRaceRating: entry.postRaceRating ?? 0,
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
      'sessions',
      ['token', 'userId', 'createdAt', 'expiresAt'],
      (db.sessions || []).map((session) => ({
        ...session,
        createdAt: session.createdAt || nowIso(),
        expiresAt: session.expiresAt || addDaysIso(session.createdAt, SESSION_DAYS),
      }))
    );

    for (const tableName of tableDeleteOrder) {
      const keyColumn = tableName === 'sessions' ? 'token' : 'id';
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
           "resultStatus" = $6
       WHERE "id" = $1`,
      [
        entry.id,
        entry.position ?? null,
        entry.finishTime || '',
        entry.notes || '',
        entry.violationNotes || '',
        entry.resultStatus || 'draft',
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
           "updatedAt" = $5
       WHERE "id" = $1`,
      [
        race.id,
        race.status,
        race.resultStatus || 'draft',
        Boolean(race.awardsPublished),
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
             "position" = $5,
             "finishTime" = $6,
             "notes" = $7,
             "violationNotes" = $8
         WHERE "id" = $1`,
        [
          entry.id,
          entry.preRaceStatus || 'pending',
          Boolean(entry.disqualified),
          entry.resultStatus || 'draft',
          entry.position ?? null,
          entry.finishTime || '',
          entry.notes || '',
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

// Xóa đúng phiên đăng xuất thay vì ghi lại toàn bộ bảng session.
export const deleteSession = async (token) => {
  if (!token) return;
  await ensureRuntimeSchema();
  await getPool().query(`DELETE FROM "sessions" WHERE "token" = $1`, [token]);
};
