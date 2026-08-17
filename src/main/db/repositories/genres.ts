import { getDb } from '../connection';

/** All 5 media tables that carry a `genre` column - kept here as a small local list (mirrors the
 *  same per-table-block style already used in migrate.ts's rebuild pattern) since there's no
 *  existing shared "table names" constant elsewhere to reuse. */
const MEDIA_TABLES = ['movies', 'tv_shows', 'books', 'albums', 'games'] as const;

export interface GenreCount {
  name: string;
  count: number;
}

export const genresRepo = {
  /** Library-wide distinct genres (not just whatever's currently loaded/filtered in a view) with
   *  a count per genre. Grouped *case-sensitively* (genre has no COLLATE NOCASE on its column,
   *  unlike tags.name) deliberately - collapsing "Comedy"/"comedy" together here would hide
   *  exactly the casing drift this feature exists to let the user find and fix via rename(). */
  list(): GenreCount[] {
    const union = MEDIA_TABLES.map((t) => `SELECT genre FROM ${t} WHERE genre IS NOT NULL`).join(' UNION ALL ');
    return getDb()
      .prepare(`SELECT genre AS name, COUNT(*) AS count FROM (${union}) GROUP BY genre ORDER BY genre COLLATE NOCASE`)
      .all() as GenreCount[];
  },

  /** Bulk-renames a genre across every media table in one transaction, returning the total number
   *  of rows updated. Case-*insensitive* match on `oldName` (unlike list()'s grouping) - so
   *  renaming "SciFi" also catches "SCIFI"/"scifi" if any exist (pure casing variants of that
   *  exact spelling), even though list()'s case-sensitive grouping would show them as separate
   *  rows. This does NOT fuzzy-match different spellings - "sci-fi" (an extra hyphen) is a
   *  different string and needs its own separate rename call to merge into the same canonical
   *  name; verified directly (see the migration-testing pattern in CLAUDE.md) rather than assumed. */
  rename(oldName: string, newName: string): number {
    const db = getDb();
    let updated = 0;
    const run = db.transaction(() => {
      for (const table of MEDIA_TABLES) {
        const result = db.prepare(`UPDATE ${table} SET genre = ? WHERE genre = ? COLLATE NOCASE`).run(newName, oldName);
        updated += result.changes;
      }
    });
    run();
    return updated;
  },
};
