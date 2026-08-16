// Pure SQL-string-building logic for `createMediaRepository`'s `list()` query, split out of
// mediaRepository.ts into its own zero-Electron-dependency file specifically so it's unit
// testable under plain `vitest run` (host Node) - see `queryBuilder.test.ts`. `better-sqlite3`
// is rebuilt against Electron's Node ABI, not host Node's, so any module that (even transitively)
// imports `../connection` - which does `import Database from 'better-sqlite3'` at module scope -
// crashes immediately under plain Node with a NODE_MODULE_VERSION mismatch. Keeping this file free
// of that import is what makes it testable at all.
import type { EntryFilters } from '@shared/types';

/** Maps a DB column name (snake_case) to its TS field name (camelCase) and back. */
export interface ColumnMap {
  dbCol: string;
  tsKey: string;
}

export interface WhereConfig {
  table: string;
  junctionTable: string;
  junctionColumn: string;
  /** Columns unique to this media type, in addition to the shared base columns. */
  typeColumns: ColumnMap[];
}

/**
 * Builds an FTS5 MATCH query for a free-text search box: each whitespace-separated word becomes
 * a quoted, escaped prefix match (`"word"*`), ANDed together (FTS5's default between bareword
 * match expressions). This keeps the "partial word while typing" feel of the old LIKE-based
 * search while gaining real word-boundary matching. Quoting every token means arbitrary user
 * input (including FTS5 query-syntax characters like `"`/`*`/`:`/`-`) can never produce a MATCH
 * syntax error - `"` is escaped by doubling it, same as SQL string literals.
 */
export function toFtsQuery(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `"${word.replace(/"/g, '""')}"*`)
    .join(' ');
}

/** Builds the parameterized WHERE clause for a media table's `list()` query. */
export function buildWhere(filters: EntryFilters, config: WhereConfig): { clause: string; params: unknown[] } {
  const { table, junctionTable, junctionColumn, typeColumns } = config;
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.status?.length) {
    clauses.push(`status IN (${filters.status.map(() => '?').join(',')})`);
    params.push(...filters.status);
  }
  if (filters.ratingMin !== undefined) {
    clauses.push('rating_tenths >= ?');
    params.push(filters.ratingMin);
  }
  if (filters.ratingMax !== undefined) {
    clauses.push('rating_tenths <= ?');
    params.push(filters.ratingMax);
  }
  if (filters.genre) {
    clauses.push('genre = ? COLLATE NOCASE');
    params.push(filters.genre);
  }
  if (filters.yearMin !== undefined && typeColumns.some((c) => c.tsKey === 'year')) {
    clauses.push('year >= ?');
    params.push(filters.yearMin);
  }
  if (filters.yearMax !== undefined && typeColumns.some((c) => c.tsKey === 'year')) {
    clauses.push('year <= ?');
    params.push(filters.yearMax);
  }
  if (filters.dateFrom) {
    clauses.push('start_date >= ?');
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    clauses.push('finish_date <= ?');
    params.push(filters.dateTo);
  }
  if (filters.search) {
    const ftsQuery = toFtsQuery(filters.search);
    if (ftsQuery) {
      clauses.push(`${table}.id IN (SELECT rowid FROM ${table}_fts WHERE ${table}_fts MATCH ?)`);
      params.push(ftsQuery);
    }
  }
  if (filters.tagIds?.length) {
    // Entries must have ALL of the given tags: one EXISTS clause per tag id.
    for (const tagId of filters.tagIds) {
      clauses.push(`EXISTS (SELECT 1 FROM ${junctionTable} jt WHERE jt.${junctionColumn} = ${table}.id AND jt.tag_id = ?)`);
      params.push(tagId);
    }
  }

  return { clause: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}
