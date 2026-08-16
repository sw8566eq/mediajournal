import { describe, it, expect } from 'vitest';
import { compareEntries } from './sortEntries';

describe('compareEntries', () => {
  it('sorts strings ascending by default field (title)', () => {
    const a = { title: 'Banana' };
    const b = { title: 'Apple' };
    expect(compareEntries(undefined, undefined)(a, b)).toBeGreaterThan(0);
    expect(compareEntries(undefined, undefined)(b, a)).toBeLessThan(0);
  });

  it('sorts strings case-insensitively via localeCompare', () => {
    const a = { title: 'apple' };
    const b = { title: 'Banana' };
    expect(compareEntries('title', 'asc')(a, b)).toBeLessThan(0);
  });

  it('reverses order for sortDir "desc"', () => {
    const a = { title: 'Apple' };
    const b = { title: 'Banana' };
    expect(compareEntries('title', 'desc')(a, b)).toBeGreaterThan(0);
  });

  it('sorts numbers ascending', () => {
    const cmp = compareEntries('year', 'asc');
    expect(cmp({ year: 1999 }, { year: 2001 })).toBeLessThan(0);
    expect(cmp({ year: 2001 }, { year: 1999 })).toBeGreaterThan(0);
    expect(cmp({ year: 2000 }, { year: 2000 })).toBe(0);
  });

  it('sorts numbers descending', () => {
    const cmp = compareEntries('year', 'desc');
    expect(cmp({ year: 1999 }, { year: 2001 })).toBeGreaterThan(0);
  });

  it('always sorts null values last, regardless of direction', () => {
    const ascCmp = compareEntries('year', 'asc');
    expect(ascCmp({ year: null }, { year: 2000 })).toBeGreaterThan(0);
    expect(ascCmp({ year: 2000 }, { year: null })).toBeLessThan(0);

    const descCmp = compareEntries('year', 'desc');
    expect(descCmp({ year: null }, { year: 2000 })).toBeGreaterThan(0);
    expect(descCmp({ year: 2000 }, { year: null })).toBeLessThan(0);
  });

  it('always sorts undefined values last, same as null', () => {
    const cmp = compareEntries('year', 'asc');
    expect(cmp({}, { year: 2000 })).toBeGreaterThan(0);
  });

  it('treats two null/undefined values as equal', () => {
    const cmp = compareEntries('year', 'asc');
    expect(cmp({ year: null }, {})).toBe(0);
  });

  it('maps each public sortBy value to the correct underlying field without throwing', () => {
    const entry = {
      title: 'T',
      year: 2000,
      ratingTenths: 80,
      status: 'planned',
      createdAt: '2020-01-01T00:00:00.000Z',
    };
    const sortByValues = ['title', 'year', 'rating', 'status', 'createdAt'] as const;
    for (const sortBy of sortByValues) {
      expect(() => compareEntries(sortBy, 'asc')(entry, entry)).not.toThrow();
    }
  });
});
