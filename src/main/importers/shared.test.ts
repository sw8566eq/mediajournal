import { describe, it, expect } from 'vitest';
import Papa from 'papaparse';
import {
  isSameItem,
  prependDateNote,
  capWarnings,
  dedupeAgainstExisting,
  rowLineNumbers,
  starRatingToTenths,
  parseTagList,
  papaErrorsToWarnings,
} from './shared';

describe('isSameItem', () => {
  it('matches identical title and year', () => {
    expect(isSameItem({ title: 'Dune', year: 2021 }, { title: 'Dune', year: 2021 })).toBe(true);
  });

  it('matches titles differing only in case/whitespace', () => {
    expect(isSameItem({ title: '  Dune  ', year: 2021 }, { title: 'dune', year: 2021 })).toBe(true);
  });

  it('matches on title alone when one side lacks a year', () => {
    expect(isSameItem({ title: 'Dune', year: 2021 }, { title: 'Dune', year: null })).toBe(true);
    expect(isSameItem({ title: 'Dune', year: undefined }, { title: 'Dune', year: 2021 })).toBe(true);
  });

  it('matches on title alone when neither side has a year', () => {
    expect(isSameItem({ title: 'Dune' }, { title: 'Dune' })).toBe(true);
  });

  it('does not match when both sides have a year and they differ', () => {
    expect(isSameItem({ title: 'Dune', year: 1984 }, { title: 'Dune', year: 2021 })).toBe(false);
  });

  it('does not match when titles differ', () => {
    expect(isSameItem({ title: 'Dune', year: 2021 }, { title: 'Dune: Part Two', year: 2021 })).toBe(false);
  });
});

describe('prependDateNote', () => {
  it('combines a date and existing notes', () => {
    expect(prependDateNote('Read', '2021-05-02', 'Loved it.')).toBe('Read: 2021-05-02\n\nLoved it.');
  });

  it('returns just the date line when there are no notes', () => {
    expect(prependDateNote('Watched', '2021-05-02', null)).toBe('Watched: 2021-05-02');
  });

  it('returns the notes unchanged when there is no date', () => {
    expect(prependDateNote('Read', undefined, 'Loved it.')).toBe('Loved it.');
    expect(prependDateNote('Read', '', 'Loved it.')).toBe('Loved it.');
  });

  it('returns null when there is neither a date nor notes', () => {
    expect(prependDateNote('Read', null, null)).toBeNull();
    expect(prependDateNote('Read', '  ', '  ')).toBeNull();
  });
});

describe('capWarnings', () => {
  it('returns the list unchanged when under the cap', () => {
    const warnings = ['a', 'b', 'c'];
    expect(capWarnings(warnings, 5)).toEqual(warnings);
  });

  it('returns the list unchanged when exactly at the cap', () => {
    const warnings = ['a', 'b', 'c'];
    expect(capWarnings(warnings, 3)).toEqual(warnings);
  });

  it('truncates and appends a summary line when over the cap', () => {
    const warnings = ['a', 'b', 'c', 'd', 'e'];
    const result = capWarnings(warnings, 3);
    expect(result).toEqual(['a', 'b', 'c', '...and 2 more warnings.']);
  });

  it('uses singular phrasing for exactly one overflow warning', () => {
    const warnings = ['a', 'b', 'c', 'd'];
    const result = capWarnings(warnings, 3);
    expect(result).toEqual(['a', 'b', 'c', '...and 1 more warning.']);
  });
});

describe('rowLineNumbers', () => {
  it('returns consecutive line numbers when there are no blank lines', () => {
    const csv = 'Title,Author\nBook A,Author A\nBook B,Author B\nBook C,Author C';
    expect(rowLineNumbers(csv)).toEqual([2, 3, 4]);
  });

  it('skips a blank line so later rows report their true physical line number', () => {
    const csv = 'Title,Author\nBook A,Author A\n\nBook B,Author B';
    // Book A is on line 2, the blank line is line 3, Book B is truly on line 4 - not line 3, which
    // is what a naive `index + 2` over Papa.parse's skipEmptyLines:true output would report.
    expect(rowLineNumbers(csv)).toEqual([2, 4]);
  });

  it('does not mistake a quoted field with an embedded newline for a blank line', () => {
    const csv = 'Title,Review\nBook A,"Great,\nreally great."\nBook B,fine';
    // The quoted review spans physical lines 2-3 as one logical row; Book B is truly on line 4.
    expect(rowLineNumbers(csv)).toEqual([2, 4]);
  });

  it('lines up 1:1 with a skipEmptyLines:true parse of the same text', () => {
    const csv = 'Title,Author\nBook A,Author A\n\n\nBook B,Author B\nBook C,Author C';
    const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
    const numbers = rowLineNumbers(csv);
    expect(numbers).toHaveLength(parsed.data.length);
    expect(parsed.data.map((_, i) => numbers[i])).toEqual([2, 5, 6]);
  });
});

describe('dedupeAgainstExisting', () => {
  it('keeps every candidate when nothing already exists', () => {
    const candidates = [{ title: 'Dune', year: 2021 }, { title: 'Arrival', year: 2016 }];
    const result = dedupeAgainstExisting(candidates, []);
    expect(result.surviving).toEqual(candidates);
    expect(result.skippedDuplicate).toBe(0);
  });

  it('drops a candidate that matches an existing entry by title+year', () => {
    const candidates = [{ title: 'Dune', year: 2021 }, { title: 'Arrival', year: 2016 }];
    const existing = [{ title: 'dune', year: 2021 }];
    const result = dedupeAgainstExisting(candidates, existing);
    expect(result.surviving).toEqual([{ title: 'Arrival', year: 2016 }]);
    expect(result.skippedDuplicate).toBe(1);
  });

  it('keeps a candidate whose title matches but year differs', () => {
    const candidates = [{ title: 'Dune', year: 1984 }];
    const existing = [{ title: 'Dune', year: 2021 }];
    const result = dedupeAgainstExisting(candidates, existing);
    expect(result.surviving).toEqual(candidates);
    expect(result.skippedDuplicate).toBe(0);
  });

  it('counts multiple duplicates correctly', () => {
    const candidates = [{ title: 'A', year: 1 }, { title: 'B', year: 2 }, { title: 'C', year: 3 }];
    const existing = [{ title: 'A', year: 1 }, { title: 'C', year: 3 }];
    const result = dedupeAgainstExisting(candidates, existing);
    expect(result.surviving).toEqual([{ title: 'B', year: 2 }]);
    expect(result.skippedDuplicate).toBe(2);
  });
});

describe('starRatingToTenths', () => {
  it('converts a whole-number star rating (Goodreads scale)', () => {
    expect(starRatingToTenths('5')).toBe(100);
    expect(starRatingToTenths('3')).toBe(60);
  });

  it('converts a half-star rating (Letterboxd scale)', () => {
    expect(starRatingToTenths('4.5')).toBe(90);
  });

  it('treats 0, blank, and unparseable values as unrated (null), not a real zero', () => {
    expect(starRatingToTenths('0')).toBeNull();
    expect(starRatingToTenths('')).toBeNull();
    expect(starRatingToTenths(undefined)).toBeNull();
    expect(starRatingToTenths('not a number')).toBeNull();
  });

  it('trims surrounding whitespace', () => {
    expect(starRatingToTenths('  4  ')).toBe(80);
  });
});

describe('parseTagList', () => {
  it('splits, trims, and dedupes a comma-separated list', () => {
    expect(parseTagList('sci-fi, favorites, sci-fi ')).toEqual(['sci-fi', 'favorites']);
  });

  it('returns an empty array for blank/undefined input', () => {
    expect(parseTagList('')).toEqual([]);
    expect(parseTagList(undefined)).toEqual([]);
  });

  it('excludes a value case-insensitively when exclude is given', () => {
    expect(parseTagList('sci-fi, favorites, read', 'read')).toEqual(['sci-fi', 'favorites']);
  });

  it('does not exclude anything when exclude is omitted', () => {
    expect(parseTagList('comfort, rewatch')).toEqual(['comfort', 'rewatch']);
  });
});

describe('papaErrorsToWarnings', () => {
  it('formats a Papa.parse error into a "Row N: message." warning', () => {
    const errors = Papa.parse('a,b\n"unterminated', { header: false }).errors;
    const warnings = papaErrorsToWarnings(errors);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toMatch(/^Row \d+: .+\.$/);
  });

  it('returns an empty array when there are no errors', () => {
    expect(papaErrorsToWarnings([])).toEqual([]);
  });
});
