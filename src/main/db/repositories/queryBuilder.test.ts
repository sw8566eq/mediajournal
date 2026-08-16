import { describe, it, expect } from 'vitest';
import { buildWhere, toFtsQuery, type WhereConfig } from './queryBuilder';

const movieConfig: WhereConfig = {
  table: 'movies',
  junctionTable: 'movie_tags',
  junctionColumn: 'movie_id',
  typeColumns: [{ dbCol: 'year', tsKey: 'year' }],
};

// A type with no `year` column, to exercise the yearMin/yearMax guard.
const noYearConfig: WhereConfig = {
  table: 'albums',
  junctionTable: 'album_tags',
  junctionColumn: 'album_id',
  typeColumns: [{ dbCol: 'artist', tsKey: 'artist' }],
};

describe('buildWhere', () => {
  it('returns an empty clause and no params for an empty filter set', () => {
    const result = buildWhere({}, movieConfig);
    expect(result.clause).toBe('');
    expect(result.params).toEqual([]);
  });

  it('builds a status IN (...) clause with one param per status', () => {
    const result = buildWhere({ status: ['planned', 'in_progress'] }, movieConfig);
    expect(result.clause).toBe('WHERE status IN (?,?)');
    expect(result.params).toEqual(['planned', 'in_progress']);
  });

  it('builds rating range clauses only for the bounds actually provided', () => {
    const minOnly = buildWhere({ ratingMin: 50 }, movieConfig);
    expect(minOnly.clause).toBe('WHERE rating_tenths >= ?');
    expect(minOnly.params).toEqual([50]);

    const both = buildWhere({ ratingMin: 50, ratingMax: 90 }, movieConfig);
    expect(both.clause).toBe('WHERE rating_tenths >= ? AND rating_tenths <= ?');
    expect(both.params).toEqual([50, 90]);
  });

  it('treats ratingMin/ratingMax of 0 as provided (not falsy-skipped)', () => {
    const result = buildWhere({ ratingMin: 0 }, movieConfig);
    expect(result.clause).toBe('WHERE rating_tenths >= ?');
    expect(result.params).toEqual([0]);
  });

  it('builds a case-insensitive genre equality clause', () => {
    const result = buildWhere({ genre: 'Horror' }, movieConfig);
    expect(result.clause).toBe('WHERE genre = ? COLLATE NOCASE');
    expect(result.params).toEqual(['Horror']);
  });

  it('applies yearMin/yearMax when the type has a year column', () => {
    const result = buildWhere({ yearMin: 1990, yearMax: 2020 }, movieConfig);
    expect(result.clause).toBe('WHERE year >= ? AND year <= ?');
    expect(result.params).toEqual([1990, 2020]);
  });

  it('silently omits yearMin/yearMax when the type has no year column', () => {
    const result = buildWhere({ yearMin: 1990, yearMax: 2020 }, noYearConfig);
    expect(result.clause).toBe('');
    expect(result.params).toEqual([]);
  });

  it('maps dateFrom to start_date and dateTo to finish_date', () => {
    const result = buildWhere({ dateFrom: '2020-01-01', dateTo: '2020-12-31' }, movieConfig);
    expect(result.clause).toBe('WHERE start_date >= ? AND finish_date <= ?');
    expect(result.params).toEqual(['2020-01-01', '2020-12-31']);
  });

  it('builds an FTS MATCH clause scoped to the table-specific FTS virtual table', () => {
    const result = buildWhere({ search: 'matrix' }, movieConfig);
    expect(result.clause).toBe('WHERE movies.id IN (SELECT rowid FROM movies_fts WHERE movies_fts MATCH ?)');
    expect(result.params).toEqual(['"matrix"*']);
  });

  it('quotes and prefix-matches every whitespace-separated search word, ANDed by FTS5 default', () => {
    const result = buildWhere({ search: 'the matrix' }, movieConfig);
    expect(result.params).toEqual(['"the"* "matrix"*']);
  });

  it('escapes embedded double-quotes in search input so it can never produce a MATCH syntax error', () => {
    const result = buildWhere({ search: 'foo"bar' }, movieConfig);
    expect(result.params).toEqual(['"foo""bar"*']);
  });

  it('omits the search clause entirely for a whitespace-only query', () => {
    const result = buildWhere({ search: '   ' }, movieConfig);
    expect(result.clause).toBe('');
    expect(result.params).toEqual([]);
  });

  it('adds one EXISTS clause per tag id, requiring ALL of them (AND, not OR)', () => {
    const result = buildWhere({ tagIds: [1, 2] }, movieConfig);
    expect(result.clause).toBe(
      'WHERE EXISTS (SELECT 1 FROM movie_tags jt WHERE jt.movie_id = movies.id AND jt.tag_id = ?) ' +
        'AND EXISTS (SELECT 1 FROM movie_tags jt WHERE jt.movie_id = movies.id AND jt.tag_id = ?)',
    );
    expect(result.params).toEqual([1, 2]);
  });

  it('combines multiple filter kinds with AND, in the fixed field order', () => {
    const result = buildWhere({ status: ['planned'], ratingMin: 50, genre: 'Horror' }, movieConfig);
    expect(result.clause).toBe('WHERE status IN (?) AND rating_tenths >= ? AND genre = ? COLLATE NOCASE');
    expect(result.params).toEqual(['planned', 50, 'Horror']);
  });
});

describe('toFtsQuery', () => {
  it('returns an empty string for empty/whitespace-only input', () => {
    expect(toFtsQuery('')).toBe('');
    expect(toFtsQuery('   ')).toBe('');
  });

  it('wraps a single word in a quoted prefix match', () => {
    expect(toFtsQuery('matrix')).toBe('"matrix"*');
  });

  it('collapses repeated whitespace between words', () => {
    expect(toFtsQuery('the   matrix')).toBe('"the"* "matrix"*');
  });

  it('escapes embedded double quotes by doubling them', () => {
    expect(toFtsQuery('foo"bar')).toBe('"foo""bar"*');
  });
});
