#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

const { Pool } = pg;
const file = process.argv[2];

if (!file) {
  console.error('Usage: node scripts/run-postgres-file.mjs <sql-file>');
  process.exit(1);
}

const pool = new Pool(
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
          process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || '',
        ssl:
          process.env.POSTGRES_SSL === 'true'
            ? { rejectUnauthorized: false }
            : undefined,
      }
);

try {
  const sql = await readFile(resolve(file), 'utf8');
  await pool.query(sql);
  console.log(`Ran ${file}`);
} finally {
  await pool.end();
}
