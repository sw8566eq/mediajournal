import { describe, it, expect } from 'vitest';
import { isSameItem } from './isSameItem';

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
