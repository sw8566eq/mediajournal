import { describe, it, expect } from 'vitest';
import { computeStats, type StatsEntry } from './computeStats';

function entry(
  overrides: Partial<StatsEntry> & { mediaType: StatsEntry['mediaType']; id: number },
): StatsEntry {
  return {
    genre: null,
    ratingTenths: null,
    status: null,
    createdAt: '2020-01-01 00:00:00',
    ...overrides,
  };
}

describe('computeStats', () => {
  it('returns all-zero stats for an empty library', () => {
    const stats = computeStats([]);
    expect(stats.totalEntries).toBe(0);
    expect(stats.averageRatingTenths).toBeNull();
    expect(stats.countByType.every((c) => c.count === 0)).toBe(true);
    expect(stats.topGenres).toEqual([]);
    expect(stats.entriesPerYear).toEqual([]);
    expect(stats.typeSpecificTotals).toEqual([]);
  });

  it('counts entries per media type, including types with zero entries', () => {
    const stats = computeStats([
      entry({ id: 1, mediaType: 'movie' }),
      entry({ id: 2, mediaType: 'movie' }),
      entry({ id: 3, mediaType: 'book' }),
    ]);
    const byType = Object.fromEntries(stats.countByType.map((c) => [c.mediaType, c.count]));
    expect(byType).toEqual({ movie: 2, tv: 0, book: 1, album: 0, game: 0 });
  });

  it('buckets status into planned/in_progress/finished, treating null as finished', () => {
    const stats = computeStats([
      entry({ id: 1, mediaType: 'movie', status: 'planned' }),
      entry({ id: 2, mediaType: 'movie', status: 'in_progress' }),
      entry({ id: 3, mediaType: 'movie', status: null }),
      entry({ id: 4, mediaType: 'movie', status: null }),
    ]);
    const byStatus = Object.fromEntries(stats.countByStatus.map((c) => [c.key, c.count]));
    expect(byStatus).toEqual({ planned: 1, in_progress: 1, finished: 2 });
  });

  it('computes the average rating in tenths, over rated entries only', () => {
    const stats = computeStats([
      entry({ id: 1, mediaType: 'movie', ratingTenths: 80 }),
      entry({ id: 2, mediaType: 'movie', ratingTenths: 60 }),
      entry({ id: 3, mediaType: 'movie', ratingTenths: null }), // unrated - excluded from the average
    ]);
    expect(stats.averageRatingTenths).toBe(70);
  });

  it('returns null average rating when nothing is rated', () => {
    const stats = computeStats([entry({ id: 1, mediaType: 'movie', ratingTenths: null })]);
    expect(stats.averageRatingTenths).toBeNull();
  });

  it('buckets ratings into 10 one-point-wide buckets, with the max value in the top bucket', () => {
    const stats = computeStats([
      entry({ id: 1, mediaType: 'movie', ratingTenths: 0 }), // -> "0-1"
      entry({ id: 2, mediaType: 'movie', ratingTenths: 95 }), // -> "9-10"
      entry({ id: 3, mediaType: 'movie', ratingTenths: 100 }), // max value -> also "9-10", not overflowing
    ]);
    expect(stats.ratingHistogram).toHaveLength(10);
    expect(stats.ratingHistogram[0]).toEqual({ label: '0–1', count: 1 });
    expect(stats.ratingHistogram[9]).toEqual({ label: '9–10', count: 2 });
    expect(stats.ratingHistogram.reduce((sum, b) => sum + b.count, 0)).toBe(3);
  });

  it('ranks top genres by count descending, breaking ties alphabetically, and ignores nulls', () => {
    const stats = computeStats([
      entry({ id: 1, mediaType: 'movie', genre: 'Horror' }),
      entry({ id: 2, mediaType: 'movie', genre: 'Horror' }),
      entry({ id: 3, mediaType: 'movie', genre: 'Comedy' }),
      entry({ id: 4, mediaType: 'movie', genre: 'Drama' }),
      entry({ id: 5, mediaType: 'movie', genre: null }),
    ]);
    expect(stats.topGenres).toEqual([
      { genre: 'Horror', count: 2 },
      { genre: 'Comedy', count: 1 },
      { genre: 'Drama', count: 1 },
    ]);
  });

  it('limits topGenres to the requested count', () => {
    const entries = Array.from({ length: 12 }, (_, i) => entry({ id: i, mediaType: 'movie', genre: `Genre ${i}` }));
    expect(computeStats(entries).topGenres).toHaveLength(8);
  });

  it('groups entries per year by createdAt, sorted ascending', () => {
    const stats = computeStats([
      entry({ id: 1, mediaType: 'book', createdAt: '2020-05-01 12:00:00' }),
      entry({ id: 2, mediaType: 'book', createdAt: '2020-11-01 12:00:00' }),
      entry({ id: 3, mediaType: 'book', createdAt: '2018-01-01 12:00:00' }),
    ]);
    expect(stats.entriesPerYear).toEqual([
      { year: 2018, count: 1 },
      { year: 2020, count: 2 },
    ]);
  });

  it('ignores an entry with an unparsable createdAt rather than throwing', () => {
    const stats = computeStats([entry({ id: 1, mediaType: 'book', createdAt: 'not-a-date' })]);
    expect(stats.entriesPerYear).toEqual([]);
  });

  it('sums type-specific numeric fields per type, excluding year, omitting zero totals', () => {
    const stats = computeStats([
      entry({ id: 1, mediaType: 'game', hoursPlayed: 10, year: 2020 }),
      entry({ id: 2, mediaType: 'game', hoursPlayed: 5.5, year: 2021 }),
      entry({ id: 3, mediaType: 'book', pages: 300 }),
    ]);

    const hoursPlayed = stats.typeSpecificTotals.find((t) => t.mediaType === 'game' && t.key === 'hoursPlayed');
    expect(hoursPlayed?.total).toBe(15.5);

    const pages = stats.typeSpecificTotals.find((t) => t.mediaType === 'book' && t.key === 'pages');
    expect(pages?.total).toBe(300);

    // `year` is a type-specific numeric field too, but summing release years is meaningless -
    // it must never appear in the totals.
    expect(stats.typeSpecificTotals.some((t) => t.key === 'year')).toBe(false);

    // Types with no positive totals (e.g. album, which has no summable numeric field at all) are
    // simply absent, not present with a total of 0.
    expect(stats.typeSpecificTotals.some((t) => t.mediaType === 'album')).toBe(false);
  });
});
