import { describe, it, expect } from 'vitest';
import { isSameItem, prependDateNote, capWarnings, dedupeAgainstExisting } from './shared';

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
