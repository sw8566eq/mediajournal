import type Database from 'better-sqlite3';
import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Applies any migrations under /migrations that haven't been recorded in schema_migrations yet,
 * in ascending numeric order, each wrapped in its own transaction. Safe to call on every startup.
 */
export function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const migrationsDir = path.join(app.getAppPath(), 'migrations');
  const appliedVersions = new Set(
    (db.prepare('SELECT version FROM schema_migrations').all() as { version: number }[]).map((r) => r.version),
  );

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  for (const file of files) {
    const version = parseInt(file.split('_')[0], 10);
    if (Number.isNaN(version)) {
      throw new Error(`Migration file "${file}" doesn't start with a numeric version prefix`);
    }
    if (appliedVersions.has(version)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    const applyMigration = db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(version);
    });
    applyMigration();
    console.log(`[migrate] applied ${file}`);
  }
}
