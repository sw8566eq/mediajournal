import { describe, it, expect } from 'vitest';
import { findDuplicate } from './duplicateCheck';

describe('findDuplicate', () => {
  const existing = [
    { id: 1, title: 'Dune', year: 2021 },
    { id: 2, title: 'The Hobbit', year: null },
  ];

  it('matches a title case-insensitively, trimming whitespace', () => {
    expect(findDuplicate(existing, { title: '  dune  ', year: 2021 })?.id).toBe(1);
  });

  it('does not match when years differ and both sides have one', () => {
    expect(findDuplicate(existing, { title: 'Dune', year: 1984 })).toBeUndefined();
  });

  it('still matches when only one side has a year', () => {
    expect(findDuplicate(existing, { title: 'The Hobbit', year: 1937 })?.id).toBe(2);
    expect(findDuplicate(existing, { title: 'Dune' })?.id).toBe(1);
  });

  it('returns undefined for a blank title', () => {
    expect(findDuplicate(existing, { title: '   ' })).toBeUndefined();
  });

  it('returns undefined when nothing matches', () => {
    expect(findDuplicate(existing, { title: 'Foundation', year: 2021 })).toBeUndefined();
  });
});
