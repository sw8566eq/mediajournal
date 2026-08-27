import type Database from 'better-sqlite3';
import { getDb } from '../connection';
import type { BaseEntryFields, EntryFilters, EntryInput, EntryUpdate, MediaType, Tag } from '@shared/types';
import { SORT_FIELDS } from '@shared/sortFields';
import { buildWhere, type ColumnMap } from './queryBuilder';
import { groupTagsByEntry } from './tagGrouping';
import { createKeyedSlot } from './statementCache';

export { buildWhere } from './queryBuilder';

const BASE_COLUMNS: ColumnMap[] = [
  { dbCol: 'title', tsKey: 'title' },
  { dbCol: 'genre', tsKey: 'genre' },
  { dbCol: 'rating_tenths', tsKey: 'ratingTenths' },
  { dbCol: 'status', tsKey: 'status' },
  { dbCol: 'notes', tsKey: 'notes' },
  { dbCol: 'external_id', tsKey: 'externalId' },
  { dbCol: 'cover_path', tsKey: 'coverPath' },
];

// Derived from the shared SORT_FIELDS list (see src/shared/sortFields.ts) rather than
// hand-written, so this can't silently drift from sortEntries.ts's client-side SORT_KEY.
const SORT_COLUMN: Record<NonNullable<EntryFilters['sortBy']>, string> = Object.fromEntries(
  SORT_FIELDS.map((f) => [f.value, f.dbColumn]),
) as Record<NonNullable<EntryFilters['sortBy']>, string>;

export interface MediaRepositoryConfig<T extends MediaType> {
  mediaType: T;
  table: string;
  junctionTable: string;
  junctionColumn: string;
  /** Columns unique to this media type, in addition to the shared base columns. */
  typeColumns: ColumnMap[];
}

export interface MediaRepository<T extends MediaType> {
  /** This repo's underlying table name - the single source of truth for callers (e.g.
   *  coverCleanup.ts) that need every media table without hardcoding a second copy of the list. */
  table: string;
  list(filters?: EntryFilters): unknown[];
  get(id: number): unknown | null;
  create(data: EntryInput<T>): unknown;
  update(id: number, data: EntryUpdate<T>): unknown;
  delete(id: number): void;
}

// Explicit BindParameters=unknown[] rather than ReturnType<Database.Database['prepare']> - the
// latter doesn't pick up prepare()'s own `BindParameters = unknown[]` default when extracted from
// a bare (uncalled) reference to the generic method, and ends up inferring an empty tuple instead,
// which then rejects the varied call shapes below (single id, id+tagId pair, spread arrays).
type Stmt = Database.Statement<unknown[], unknown>;

/** Builds a full CRUD repository for one media-type table, sharing all query logic. */
export function createMediaRepository<T extends MediaType>(config: MediaRepositoryConfig<T>) {
  const { table, junctionTable, junctionColumn, typeColumns } = config;
  const allColumns = [...BASE_COLUMNS, ...typeColumns];
  const dbCols = allColumns.map((c) => c.dbCol);

  // Cached prepared statements for this repo's genuinely static SQL - fixed table/column names
  // that never change once this repo is built, so re-preparing the same text on every single call
  // (as this code used to do) was wasted work. list()/update()/tagsForMany() aren't cached this way
  // since their SQL text itself depends on which filters/fields/ids are present in a given call,
  // not just this repo's fixed shape - only genuinely static statements are worth this.
  //
  // Statements are tied to the specific Database connection they were prepared against - keyed via
  // createKeyedSlot() (statementCache.ts) by connection identity, so a stale statement from a
  // closed-and-reopened connection (e.g. macOS: closing every window without quitting, then
  // reactivating - see main.ts) can never be reused; see that module's own doc comment for the
  // full reasoning, and its tests for the identity-swap behavior itself. The SQL/DB round-trip this
  // wraps still can't be unit tested (this repo layer has no automated test coverage - see
  // CLAUDE.md's Database section) and was verified ad hoc against a temp SQLite file instead.
  const stmtSlot = createKeyedSlot<
    Database.Database,
    {
      tagsFor: Stmt;
      getById: Stmt;
      insertRow: Stmt;
      deleteById: Stmt;
      deleteTags: Stmt;
      insertTag: Stmt;
    }
  >();

  function stmtsFor(db: Database.Database) {
    return stmtSlot.forKey(db);
  }

  function tagsFor(db: Database.Database, id: number): Tag[] {
    const s = stmtsFor(db);
    s.tagsFor ??= db.prepare(
      `SELECT t.id, t.name FROM tags t
       JOIN ${junctionTable} jt ON jt.tag_id = t.id
       WHERE jt.${junctionColumn} = ?
       ORDER BY t.name COLLATE NOCASE`,
    );
    return s.tagsFor.all(id) as Tag[];
  }

  /**
   * Batch-fetches tags for every id in `ids` in a single query - used by list() so an N-row result
   * does one extra query total instead of the N separate ones rowToEntry would otherwise trigger by
   * calling tagsFor() per row (get()/create()/update() still use tagsFor() directly, since there's
   * exactly one row to look up and batching buys nothing there). The row->per-entry grouping itself
   * is groupTagsByEntry() (tagGrouping.ts, unit tested there) - this function is just the SQL query
   * and hand-off. Not cached like the statements above - the IN (...) placeholder count varies with
   * how many rows list() returned.
   */
  function tagsForMany(db: Database.Database, ids: number[]): Map<number, Tag[]> {
    if (ids.length === 0) return new Map();
    const placeholders = ids.map(() => '?').join(',');
    const rows = db
      .prepare(
        `SELECT jt.${junctionColumn} as entryId, t.id, t.name FROM tags t
         JOIN ${junctionTable} jt ON jt.tag_id = t.id
         WHERE jt.${junctionColumn} IN (${placeholders})
         ORDER BY t.name COLLATE NOCASE`,
      )
      .all(...ids) as { entryId: number; id: number; name: string }[];
    return groupTagsByEntry(rows);
  }

  function rowToEntry(row: Record<string, unknown>, tags: Tag[]): BaseEntryFields & Record<string, unknown> {
    const entry: Record<string, unknown> = { id: row.id, createdAt: row.created_at, updatedAt: row.updated_at };
    for (const { dbCol, tsKey } of allColumns) {
      entry[tsKey] = row[dbCol];
    }
    entry.tags = tags;
    return entry as BaseEntryFields & Record<string, unknown>;
  }

  function setTags(db: Database.Database, id: number, tagIds: number[] | undefined): void {
    if (tagIds === undefined) return;
    const s = stmtsFor(db);
    s.deleteTags ??= db.prepare(`DELETE FROM ${junctionTable} WHERE ${junctionColumn} = ?`);
    s.deleteTags.run(id);
    s.insertTag ??= db.prepare(`INSERT OR IGNORE INTO ${junctionTable} (${junctionColumn}, tag_id) VALUES (?, ?)`);
    for (const tagId of tagIds) s.insertTag.run(id, tagId);
  }

  return {
    table,
    list(filters: EntryFilters = {}) {
      const db = getDb();
      const { clause, params } = buildWhere(filters, { table, junctionTable, junctionColumn, typeColumns });
      const sortCol = filters.sortBy ? SORT_COLUMN[filters.sortBy] : 'title';
      const sortDir = filters.sortDir === 'desc' ? 'DESC' : 'ASC';
      const rows = db
        // NULLS LAST regardless of direction, matching sortEntries.ts's client-side comparator
        // used to re-sort the merged "All" view - keeps ordering consistent between the two.
        .prepare(`SELECT * FROM ${table} ${clause} ORDER BY ${sortCol} COLLATE NOCASE ${sortDir} NULLS LAST`)
        .all(...params) as Record<string, unknown>[];
      const tagsById = tagsForMany(
        db,
        rows.map((row) => row.id as number),
      );
      return rows.map((row) => rowToEntry(row, tagsById.get(row.id as number) ?? []));
    },

    get(id: number) {
      const db = getDb();
      const s = stmtsFor(db);
      s.getById ??= db.prepare(`SELECT * FROM ${table} WHERE id = ?`);
      const row = s.getById.get(id) as Record<string, unknown> | undefined;
      return row ? rowToEntry(row, tagsFor(db, id)) : null;
    },

    create(data: EntryInput<T>) {
      const db = getDb();
      const raw = data as unknown as Record<string, unknown>;
      const values = allColumns.map((c) => raw[c.tsKey] ?? null);

      const insert = db.transaction(() => {
        const s = stmtsFor(db);
        s.insertRow ??= db.prepare(`INSERT INTO ${table} (${dbCols.join(', ')}) VALUES (${dbCols.map(() => '?').join(', ')})`);
        const result = s.insertRow.run(...values);
        const id = result.lastInsertRowid as number;
        setTags(db, id, raw.tagIds as number[] | undefined);
        return id;
      });

      const id = insert();
      return this.get(id);
    },

    update(id: number, data: EntryUpdate<T>) {
      const db = getDb();
      const raw = data as unknown as Record<string, unknown>;
      const presentColumns = allColumns.filter((c) => raw[c.tsKey] !== undefined);

      const run = db.transaction(() => {
        if (presentColumns.length) {
          const setClause = presentColumns.map((c) => `${c.dbCol} = ?`).join(', ');
          const values = presentColumns.map((c) => raw[c.tsKey]);
          // Not cached like get()/create()/delete() below - the SET clause (and therefore the SQL
          // text) depends on which fields are present in a given partial update, not just this
          // repo's fixed table shape.
          db.prepare(`UPDATE ${table} SET ${setClause}, updated_at = datetime('now') WHERE id = ?`).run(...values, id);
        }
        setTags(db, id, raw.tagIds as number[] | undefined);
      });

      run();
      return this.get(id);
    },

    delete(id: number) {
      const db = getDb();
      const s = stmtsFor(db);
      s.deleteById ??= db.prepare(`DELETE FROM ${table} WHERE id = ?`);
      s.deleteById.run(id);
      // junction rows cascade via ON DELETE CASCADE
    },
  };
}
