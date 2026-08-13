import type Database from 'better-sqlite3';
import { getDb } from '../connection';
import type { BaseEntryFields, EntryFilters, EntryInput, EntryUpdate, MediaType, Tag } from '@shared/types';

/** Maps a DB column name (snake_case) to its TS field name (camelCase) and back. */
interface ColumnMap {
  dbCol: string;
  tsKey: string;
}

const BASE_COLUMNS: ColumnMap[] = [
  { dbCol: 'title', tsKey: 'title' },
  { dbCol: 'genre', tsKey: 'genre' },
  { dbCol: 'rating_tenths', tsKey: 'ratingTenths' },
  { dbCol: 'status', tsKey: 'status' },
  { dbCol: 'start_date', tsKey: 'startDate' },
  { dbCol: 'finish_date', tsKey: 'finishDate' },
  { dbCol: 'notes', tsKey: 'notes' },
  { dbCol: 'external_id', tsKey: 'externalId' },
  { dbCol: 'cover_path', tsKey: 'coverPath' },
];

const SORT_COLUMN: Record<NonNullable<EntryFilters['sortBy']>, string> = {
  title: 'title',
  year: 'year',
  rating: 'rating_tenths',
  status: 'status',
  startDate: 'start_date',
  finishDate: 'finish_date',
  createdAt: 'created_at',
};

export interface MediaRepositoryConfig<T extends MediaType> {
  mediaType: T;
  table: string;
  junctionTable: string;
  junctionColumn: string;
  /** Columns unique to this media type, in addition to the shared base columns. */
  typeColumns: ColumnMap[];
}

export interface MediaRepository<T extends MediaType> {
  list(filters?: EntryFilters): unknown[];
  get(id: number): unknown | null;
  create(data: EntryInput<T>): unknown;
  update(id: number, data: EntryUpdate<T>): unknown;
  delete(id: number): void;
}

/** Builds a full CRUD repository for one media-type table, sharing all query logic. */
export function createMediaRepository<T extends MediaType>(config: MediaRepositoryConfig<T>) {
  const { table, junctionTable, junctionColumn, typeColumns } = config;
  const allColumns = [...BASE_COLUMNS, ...typeColumns];

  function tagsFor(db: Database.Database, id: number): Tag[] {
    return db
      .prepare(
        `SELECT t.id, t.name FROM tags t
         JOIN ${junctionTable} jt ON jt.tag_id = t.id
         WHERE jt.${junctionColumn} = ?
         ORDER BY t.name COLLATE NOCASE`,
      )
      .all(id) as Tag[];
  }

  function rowToEntry(db: Database.Database, row: Record<string, unknown>): BaseEntryFields & Record<string, unknown> {
    const entry: Record<string, unknown> = { id: row.id, createdAt: row.created_at, updatedAt: row.updated_at };
    for (const { dbCol, tsKey } of allColumns) {
      entry[tsKey] = row[dbCol];
    }
    entry.tags = tagsFor(db, row.id as number);
    return entry as BaseEntryFields & Record<string, unknown>;
  }

  function setTags(db: Database.Database, id: number, tagIds: number[] | undefined): void {
    if (tagIds === undefined) return;
    db.prepare(`DELETE FROM ${junctionTable} WHERE ${junctionColumn} = ?`).run(id);
    const insert = db.prepare(`INSERT OR IGNORE INTO ${junctionTable} (${junctionColumn}, tag_id) VALUES (?, ?)`);
    for (const tagId of tagIds) insert.run(id, tagId);
  }

  function buildWhere(filters: EntryFilters): { clause: string; params: unknown[] } {
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
      clauses.push('(title LIKE ? OR notes LIKE ?)');
      const term = `%${filters.search}%`;
      params.push(term, term);
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

  return {
    list(filters: EntryFilters = {}) {
      const db = getDb();
      const { clause, params } = buildWhere(filters);
      const sortCol = filters.sortBy ? SORT_COLUMN[filters.sortBy] : 'title';
      const sortDir = filters.sortDir === 'desc' ? 'DESC' : 'ASC';
      const rows = db
        .prepare(`SELECT * FROM ${table} ${clause} ORDER BY ${sortCol} COLLATE NOCASE ${sortDir}`)
        .all(...params) as Record<string, unknown>[];
      return rows.map((row) => rowToEntry(db, row));
    },

    get(id: number) {
      const db = getDb();
      const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
      return row ? rowToEntry(db, row) : null;
    },

    create(data: EntryInput<T>) {
      const db = getDb();
      const raw = data as unknown as Record<string, unknown>;
      const dbCols = allColumns.map((c) => c.dbCol);
      const placeholders = dbCols.map(() => '?').join(', ');
      const values = allColumns.map((c) => raw[c.tsKey] ?? null);

      const insert = db.transaction(() => {
        const result = db
          .prepare(`INSERT INTO ${table} (${dbCols.join(', ')}) VALUES (${placeholders})`)
          .run(...values);
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
          db.prepare(`UPDATE ${table} SET ${setClause}, updated_at = datetime('now') WHERE id = ?`).run(...values, id);
        }
        setTags(db, id, raw.tagIds as number[] | undefined);
      });

      run();
      return this.get(id);
    },

    delete(id: number) {
      const db = getDb();
      db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
      // junction rows cascade via ON DELETE CASCADE
    },
  };
}
