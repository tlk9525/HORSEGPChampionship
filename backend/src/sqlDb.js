import pg from 'pg';
import { buildReadModel, readTableOrder } from './db/readModel.js';
import { createBettingPersistence } from './db/persistence/bettingPersistence.js';
import { writeBettingSnapshot } from './db/persistence/bettingSnapshotPersistence.js';
import { createRacePersistence } from './db/persistence/racePersistence.js';
import { writeRaceSnapshot } from './db/persistence/raceSnapshotPersistence.js';
import { createUserPersistence } from './db/persistence/userPersistence.js';
import { writeUserSnapshot } from './db/persistence/userSnapshotPersistence.js';

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
  'creditTransactions',
];

// Betting schema is soft-created after core tables exist so existing DBs
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
        `ALTER TABLE "races"
         ADD COLUMN IF NOT EXISTS "betLimit" NUMERIC(12, 2)`
      );
      await getPool().query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "uq_credit_transactions_starter_bonus_user"
          ON "creditTransactions" ("userId")
          WHERE "type" = 'starter_bonus'
      `);
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
      await getPool().query(
        `CREATE TABLE IF NOT EXISTS "raceClasses" (
          "id" VARCHAR(64) PRIMARY KEY,
          "name" VARCHAR(128) NOT NULL,
          "ratingMin" NUMERIC(6, 2) NOT NULL,
          "ratingMax" NUMERIC(6, 2) NOT NULL,
          "handicapMin" NUMERIC(6, 2) NOT NULL,
          "handicapMax" NUMERIC(6, 2) NOT NULL,
          "sortOrder" INTEGER NOT NULL DEFAULT 0,
          "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedBy" VARCHAR(64),
          CONSTRAINT "chk_race_classes_rating"
            CHECK ("ratingMin" >= 0 AND "ratingMax" <= 140 AND "ratingMin" <= "ratingMax"),
          CONSTRAINT "chk_race_classes_weight"
            CHECK ("handicapMin" > 0 AND "handicapMin" <= "handicapMax")
        )`
      );
      await getPool().query(
        'CREATE UNIQUE INDEX IF NOT EXISTS "uq_race_classes_name_ci" ON "raceClasses" (LOWER("name"))'
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

// Đọc toàn bộ database cho mutation hoặc chỉ các bảng cần thiết cho read model.
export const readDb = async ({ includeTables } = {}) => {
  await ensureRuntimeSchema();

  const requestedTables = Array.isArray(includeTables) ? new Set(includeTables) : null;
  const tableNames = Object.keys(readTableOrder).filter(
    (tableName) => !requestedTables || requestedTables.has(tableName)
  );
  const tableEntries = await Promise.all(
    tableNames.map(async (tableName) => [
      tableName,
      await selectAll(tableName, readTableOrder[tableName]),
    ])
  );
  const rowsByTable = Object.fromEntries(tableEntries);
  const db = buildReadModel(rowsByTable);

  if (!requestedTables) {
    dbBaselines.set(db, structuredClone(db));
  }
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

export class RaceStateConflictError extends Error {
  constructor(message = 'Race state changed by another request') {
    super(message);
    this.name = 'RaceStateConflictError';
    this.code = 'RACE_STATE_CONFLICT';
  }
}

/**
 * Insert ledger rows first (ON CONFLICT DO NOTHING RETURNING).
 * Only credit/debit the wallet when the ledger insert actually lands.
 * balanceAfter is written from the live wallet RETURNING value.
 */
const applyCreditTransactionsIdempotent = async (client, creditTransactions = []) => {
  const walletBalances = {};
  const appliedDeltaByUser = {};
  const sorted = [...creditTransactions].sort((left, right) => {
    const userCmp = String(left.userId).localeCompare(String(right.userId));
    if (userCmp !== 0) return userCmp;
    return String(left.id).localeCompare(String(right.id));
  });

  for (const transaction of sorted) {
    const amount = Number(transaction.amount);
    const updatedAt = transaction.createdAt || nowIso();
    if (!Number.isFinite(amount) || amount === 0) continue;

    await client.query(
      `INSERT INTO "wallets" ("userId", "credits", "updatedAt")
       VALUES ($1, 0, $2)
       ON CONFLICT ("userId") DO NOTHING`,
      [transaction.userId, updatedAt]
    );

    await client.query(
      `SELECT "credits" FROM "wallets" WHERE "userId" = $1 FOR UPDATE`,
      [transaction.userId]
    );

    const { rows: insertedRows } = await client.query(
      `INSERT INTO "creditTransactions" (
        "id", "userId", "type", "amount", "balanceAfter", "metadata", "createdAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT ("id") DO NOTHING
      RETURNING "id"`,
      [
        transaction.id,
        transaction.userId,
        transaction.type,
        amount,
        0,
        transaction.metadata || null,
        updatedAt,
      ]
    );

    if (!insertedRows.length) {
      continue;
    }

    const { rows: walletRows } = await client.query(
      `UPDATE "wallets"
       SET "credits" = "credits" + $2,
           "updatedAt" = $3
       WHERE "userId" = $1
       RETURNING "credits"`,
      [transaction.userId, amount, updatedAt]
    );
    const nextCredits = Number(walletRows[0]?.credits ?? 0);
    if (nextCredits < 0) {
      throw new Error(
        `Insufficient credits while applying ${transaction.type} for ${transaction.userId}`
      );
    }

    await client.query(
      `UPDATE "creditTransactions"
       SET "balanceAfter" = $2
       WHERE "id" = $1`,
      [transaction.id, nextCredits]
    );

    transaction.balanceAfter = nextCredits;
    walletBalances[transaction.userId] = nextCredits;
    appliedDeltaByUser[transaction.userId] =
      (appliedDeltaByUser[transaction.userId] || 0) + amount;
  }

  return { walletBalances, appliedDeltaByUser };
};
const tableDeleteOrder = [
  'notifications',
  'sessions',
  'creditTransactions',
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

    await writeUserSnapshot({ db, baselineUsersById, writeRows });
    await writeRaceSnapshot({ db, writeRows });
    await writeBettingSnapshot({ db, writeRows });

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

const racePersistence = createRacePersistence({ ensureRuntimeSchema, getPool });
const userPersistence = createUserPersistence({ ensureRuntimeSchema, getPool });
const bettingPersistence = createBettingPersistence({ ensureRuntimeSchema, getPool });

export const {
  persistCreatedTournament,
  persistRaceEntryResult,
  persistRaceEntryReadiness,
  persistRefereeRaceAction,
  persistAdminRaceAction,
} = racePersistence;

export const {
  persistLoginSession,
  persistRegisteredUser,
  persistEnsureSpectatorStarterCredits,
  persistSystemSettings,
  deleteSession,
} = userPersistence;

export const { persistPlaceBet, persistCancelBet } = bettingPersistence;
