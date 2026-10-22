import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export interface PgConfigOptions {
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
}

let pgPool: pg.Pool | null = null;
let isPgConnected = false;
let lastError: string | null = null;

export function getPgConfig(): PgConfigOptions {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    };
  }

  return {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'saloonify',
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
  };
}

export function createPgPool(): pg.Pool {
  if (pgPool) {
    return pgPool;
  }

  const config = getPgConfig();
  pgPool = new Pool({
    ...config,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pgPool.on('error', (err) => {
    console.error('[Saloonify PostgreSQL] Unexpected pool client error:', err.message);
    lastError = err.message;
  });

  return pgPool;
}

export async function testPgConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    const pool = createPgPool();
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT NOW() as now, current_database() as db');
      isPgConnected = true;
      lastError = null;
      console.log(`[Saloonify PostgreSQL] Connected successfully to database: ${res.rows[0]?.db}`);
      return { connected: true };
    } finally {
      client.release();
    }
  } catch (err: any) {
    isPgConnected = false;
    lastError = err.message;
    return { connected: false, error: err.message };
  }
}

export function isPgActive(): boolean {
  return isPgConnected;
}

export function getPgLastError(): string | null {
  return lastError;
}

export default {
  createPgPool,
  getPgConfig,
  testPgConnection,
  isPgActive,
  getPgLastError,
};
