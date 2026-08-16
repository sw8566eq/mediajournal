import { describe, it, expect } from 'vitest';
import {
  MovieCreateSchema,
  GameCreateSchema,
  EntryFiltersSchema,
  TagNameSchema,
  ExternalSearchQuerySchema,
  ExportFileSchema,
  ExportedEntrySchemaByType,
} from './validation';

describe('MovieCreateSchema', () => {
  const valid = {
    title: 'The Matrix',
    genre: 'Sci-Fi',
    ratingTenths: 92,
    status: null,
    notes: null,
    externalId: null,
    coverPath: null,
    tagIds: [],
    director: 'The Wachowskis',
    year: 1999,
    runtimeMin: 136,
  };

  it('accepts a fully-populated valid payload', () => {
    expect(MovieCreateSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a payload with only the required title field', () => {
    expect(MovieCreateSchema.safeParse({ title: 'Minimal' }).success).toBe(true);
  });

  it('rejects a blank title', () => {
    const result = MovieCreateSchema.safeParse({ ...valid, title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing title', () => {
    const { title: _title, ...rest } = valid;
    expect(MovieCreateSchema.safeParse(rest).success).toBe(false);
  });

  it('trims whitespace from the title', () => {
    const result = MovieCreateSchema.safeParse({ ...valid, title: '  Trimmed  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.title).toBe('Trimmed');
  });

  it('rejects a negative rating', () => {
    expect(MovieCreateSchema.safeParse({ ...valid, ratingTenths: -1 }).success).toBe(false);
  });

  it('rejects a rating above 100 (i.e. above 10.0)', () => {
    expect(MovieCreateSchema.safeParse({ ...valid, ratingTenths: 101 }).success).toBe(false);
  });

  it('rejects a non-integer rating', () => {
    expect(MovieCreateSchema.safeParse({ ...valid, ratingTenths: 9.5 }).success).toBe(false);
  });

  it('accepts a null rating (unrated)', () => {
    expect(MovieCreateSchema.safeParse({ ...valid, ratingTenths: null }).success).toBe(true);
  });

  it('rejects an invalid status value', () => {
    expect(MovieCreateSchema.safeParse({ ...valid, status: 'watching' }).success).toBe(false);
  });

  it('accepts a null status (no active status)', () => {
    expect(MovieCreateSchema.safeParse({ ...valid, status: null }).success).toBe(true);
  });

  it('rejects a title over the 500-char limit', () => {
    expect(MovieCreateSchema.safeParse({ ...valid, title: 'x'.repeat(501) }).success).toBe(false);
  });
});

describe('GameCreateSchema', () => {
  it('accepts a fractional hoursPlayed value', () => {
    const result = GameCreateSchema.safeParse({ title: 'Hollow Knight', hoursPlayed: 42.5 });
    expect(result.success).toBe(true);
  });

  it('rejects a negative hoursPlayed value', () => {
    expect(GameCreateSchema.safeParse({ title: 'Hollow Knight', hoursPlayed: -1 }).success).toBe(false);
  });
});

describe('EntryFiltersSchema', () => {
  it('accepts an empty filter object', () => {
    expect(EntryFiltersSchema.safeParse({}).success).toBe(true);
  });

  it('accepts a fully-populated filter object', () => {
    const result = EntryFiltersSchema.safeParse({
      status: ['planned', 'in_progress'],
      ratingMin: 0,
      ratingMax: 100,
      genre: 'Horror',
      tagIds: [1, 2, 3],
      yearMin: 1990,
      yearMax: 2020,
      search: 'matrix',
      sortBy: 'rating',
      sortDir: 'desc',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid status in the filter array', () => {
    expect(EntryFiltersSchema.safeParse({ status: ['watching'] }).success).toBe(false);
  });

  it('rejects an invalid sortBy value', () => {
    expect(EntryFiltersSchema.safeParse({ sortBy: 'popularity' }).success).toBe(false);
  });

  it('rejects a non-positive tag id', () => {
    expect(EntryFiltersSchema.safeParse({ tagIds: [0] }).success).toBe(false);
  });
});

describe('TagNameSchema', () => {
  it('rejects an empty tag name', () => {
    expect(TagNameSchema.safeParse('').success).toBe(false);
  });

  it('rejects a whitespace-only tag name after trimming', () => {
    // trim() happens during parse, so the parsed *result* is empty even though input isn't.
    const result = TagNameSchema.safeParse('   ');
    expect(result.success).toBe(false);
  });

  it('accepts and trims a normal tag name', () => {
    const result = TagNameSchema.safeParse('  favorites  ');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe('favorites');
  });
});

describe('ExternalSearchQuerySchema', () => {
  it('rejects an unknown media type', () => {
    expect(ExternalSearchQuerySchema.safeParse({ mediaType: 'podcast', query: 'x' }).success).toBe(false);
  });

  it('rejects a blank query', () => {
    expect(ExternalSearchQuerySchema.safeParse({ mediaType: 'book', query: '' }).success).toBe(false);
  });

  it('accepts a valid query', () => {
    expect(ExternalSearchQuerySchema.safeParse({ mediaType: 'book', query: 'dune' }).success).toBe(true);
  });
});

describe('ExportedEntrySchemaByType', () => {
  it('accepts tag names instead of tag ids, and no coverPath field', () => {
    const result = ExportedEntrySchemaByType.movie.safeParse({
      title: 'Arrival',
      tags: ['sci-fi', 'favorites'],
    });
    expect(result.success).toBe(true);
  });

  it('strips a coverPath field if present rather than erroring (exports are metadata-only)', () => {
    const result = ExportedEntrySchemaByType.movie.safeParse({
      title: 'Arrival',
      tags: [],
      coverPath: 'should-be-ignored.jpg',
    });
    expect(result.success).toBe(true);
    if (result.success) expect('coverPath' in result.data).toBe(false);
  });
});

describe('ExportFileSchema round-trip', () => {
  it('accepts a well-formed export file with entries across multiple media types', () => {
    const exportFile = {
      exportedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 1,
      tags: ['favorites', 'rewatch'],
      entries: {
        movie: [{ title: 'Arrival', tags: ['sci-fi'] }],
        tv: [],
        book: [{ title: 'Dune', tags: [] }],
        album: [],
        game: [],
      },
    };
    const result = ExportFileSchema.safeParse(exportFile);
    expect(result.success).toBe(true);
  });

  it('defaults missing per-type entry arrays to empty rather than failing', () => {
    const result = ExportFileSchema.safeParse({
      exportedAt: '2026-01-01T00:00:00.000Z',
      entries: {},
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entries.movie).toEqual([]);
      expect(result.data.tags).toEqual([]);
    }
  });
});
