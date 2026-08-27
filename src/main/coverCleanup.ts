import fs from 'node:fs/promises';
import { getDb } from './db/connection';
import { coversDir, removeCover } from './covers';
import { movieRepo } from './db/repositories/movies';
import { tvShowRepo } from './db/repositories/tvShows';
import { bookRepo } from './db/repositories/books';
import { albumRepo } from './db/repositories/albums';
import { gameRepo } from './db/repositories/games';

// One table per media type (see CLAUDE.md's Database section) - each has its own cover_path
// column, so "every referenced cover file" means unioning across all 5 rather than one query.
// Read off each repo's own `table` rather than a second hardcoded list, so this can't drift from
// the repo configs (movies.ts, tvShows.ts, etc.) that are the actual source of truth for table names.
const MEDIA_TABLES = [movieRepo, tvShowRepo, bookRepo, albumRepo, gameRepo].map((repo) => repo.table);

function referencedCoverFilenames(): Set<string> {
  const db = getDb();
  const referenced = new Set<string>();
  for (const table of MEDIA_TABLES) {
    const rows = db.prepare(`SELECT cover_path FROM ${table} WHERE cover_path IS NOT NULL`).all() as {
      cover_path: string;
    }[];
    for (const row of rows) referenced.add(row.cover_path);
  }
  return referenced;
}

/**
 * Cover files sitting in the covers directory that no entry's cover_path (across all 5 media
 * tables) actually points to. Normal save/cancel paths already clean up after themselves
 * (EntryForm's sessionImportedFiles tracks and removes whatever doesn't end up persisted), so this
 * is only for what's slipped through some other way - a crash mid-save, or a hand-edited DB.
 */
export async function findOrphanedCovers(): Promise<string[]> {
  const referenced = referencedCoverFilenames();
  let files: string[];
  try {
    files = await fs.readdir(coversDir());
  } catch {
    return []; // covers dir doesn't exist yet (e.g. no cover art has ever been added) - nothing to scan
  }
  return files.filter((f) => !referenced.has(f));
}

/**
 * Deletes every currently-orphaned cover file. Re-scans immediately before deleting rather than
 * trusting a count/list the caller fetched earlier (e.g. for a confirmation prompt) - a file that
 * became referenced in between (a save that just completed) is never removed out from under it.
 */
export async function cleanupOrphanedCovers(): Promise<{ deleted: number }> {
  const orphaned = await findOrphanedCovers();
  await Promise.all(orphaned.map((f) => removeCover(f)));
  return { deleted: orphaned.length };
}
