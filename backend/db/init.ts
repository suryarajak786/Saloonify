import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createPgPool, testPgConnection } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runPgMigration(): Promise<{ success: boolean; message: string }> {
  const connTest = await testPgConnection();
  if (!connTest.connected) {
    return {
      success: false,
      message: `PostgreSQL connection failed: ${connTest.error}. Make sure PostgreSQL is running and environment variables (DATABASE_URL or PGHOST, PGUSER, etc.) are configured.`,
    };
  }

  const pool = createPgPool();
  const schemaPath = path.join(__dirname, 'schema.sql');

  try {
    const sqlContent = fs.readFileSync(schemaPath, 'utf-8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sqlContent);
      await client.query('COMMIT');
      console.log('[Saloonify Migration] PostgreSQL schema created/verified successfully!');
      return { success: true, message: 'PostgreSQL schema created successfully' };
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('[Saloonify Migration] Error executing schema.sql:', err.message);
      return { success: false, message: err.message };
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('[Saloonify Migration] Failed to read schema file:', err.message);
    return { success: false, message: err.message };
  }
}

// Allow direct CLI execution: `npx tsx backend/db/init.ts`
if (process.argv[1] && process.argv[1].endsWith('init.ts')) {
  runPgMigration()
    .then((result) => {
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal migration error:', err);
      process.exit(1);
    });
}
