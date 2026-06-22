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
    jockeyTournamentRegistrations,
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
    raceActionLogs,
    refereeReports,
    sessions,
  };
};

// Chèn nhiều hàng dữ liệu vào một bảng trong transaction đang chạy
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
  'raceActionLogs',
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

// Ghi toàn bộ dữ liệu vào PostgreSQL: xóa toàn bộ và chèn mới theo đúng thứ tự phụ thuộc
export const writeDb = async (db) => {
  await ensureRuntimeSchema();

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

// Cập nhật trực tiếp trạng thái publish kết quả để tránh lệch state sau khi reload trang.
export const persistOfficialRaceResults = async (raceId, updatedAt = nowIso()) => {
  await ensureRuntimeSchema();

  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE "races"
       SET "status" = 'finished',
           "resultStatus" = 'official',
           "awardsPublished" = TRUE,
           "updatedAt" = $2
       WHERE "id" = $1`,
      [raceId, updatedAt]
    );
    await client.query(
      `UPDATE "raceEntries"
       SET "resultStatus" = CASE
         WHEN "preRaceStatus" = 'absent' OR "disqualified" = TRUE THEN 'disqualified'
         ELSE 'official'
       END
       WHERE "raceId" = $1 AND "status" = 'approved'`,
      [raceId]
    );
    await client.query('COMMIT');
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
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
