import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { newDb } from 'pg-mem';

export interface DatabaseConfig {
  url?: string;
  runMigrations?: boolean;
}

let pool: Pool;

async function runSqlMigrations(client: Pool): Promise<void> {
  const migrationsDir = path.resolve(__dirname, '..', '..', 'migrations');
  const files = fs.existsSync(migrationsDir)
    ? fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort()
    : [];

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await client.query(sql);
  }
}

export async function getPool(config: DatabaseConfig = {}): Promise<Pool> {
  if (pool) return pool;

  const url = config.url || process.env.DATABASE_URL;
  if (url) {
    pool = new Pool({ connectionString: url });
  } else {
    const mem = newDb({ autoCreateForeignKeyIndices: true });
    const adapter = mem.adapters.createPg();
    pool = new adapter.Pool();
    console.log('[db] Using in-memory pg-mem database');
  }

  if (config.runMigrations !== false) {
    await runSqlMigrations(pool);
  }

  return pool;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined as unknown as Pool;
  }
}
