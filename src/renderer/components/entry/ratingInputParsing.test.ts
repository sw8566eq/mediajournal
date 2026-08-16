import { describe, it, expect } from 'vitest';
import { isPartialDecimal, parseRatingTenths } from './ratingInputParsing';

describe('isPartialDecimal', () => {
  it('accepts the empty string (cleared field)', () => {
    expect(isPartialDecimal('')).toBe(true);
  });

  it('accepts 1-2 whole-number digits with no decimal point', () => {
    expect(isPartialDecimal('3')).toBe(true);
    expect(isPartialDecimal('10')).toBe(true);
  });

  it('rejects 3+ whole-number digits with no decimal point', () => {
    // Regression case: a naive `^\d{0,2}\.?\d?$` regex wrongly accepted this - \d{0,2} eating
    // "10" and the trailing \d? separately eating "0", with no '.' anywhere in the string.
    expect(isPartialDecimal('100')).toBe(false);
  });

  it('accepts a trailing decimal point with nothing after it yet (mid-typing)', () => {
    expect(isPartialDecimal('3.')).toBe(true);
    expect(isPartialDecimal('10.')).toBe(true);
  });

  it('accepts exactly one digit after the decimal point', () => {
    expect(isPartialDecimal('3.2')).toBe(true);
    expect(isPartialDecimal('10.0')).toBe(true);
  });

  it('rejects two or more digits after the decimal point', () => {
    expect(isPartialDecimal('3.25')).toBe(false);
  });

  it('accepts a leading decimal point with no whole-number part', () => {
    expect(isPartialDecimal('.5')).toBe(true);
  });

  it('rejects non-numeric characters', () => {
    expect(isPartialDecimal('3a')).toBe(false);
    expect(isPartialDecimal('-3')).toBe(false);
    expect(isPartialDecimal('3..2')).toBe(false);
  });
});

describe('parseRatingTenths', () => {
  it('returns null for an empty or bare-dot string (unrated)', () => {
    expect(parseRatingTenths('')).toBeNull();
    expect(parseRatingTenths('.')).toBeNull();
  });

  it('converts a whole number to tenths', () => {
    expect(parseRatingTenths('3')).toBe(30);
  });

  it('converts a one-decimal value to tenths', () => {
    expect(parseRatingTenths('3.2')).toBe(32);
  });

  it('reproduces the exact reported bug scenario: "3" then "." then "2" reaches 3.2', () => {
    // Simulates typing character-by-character, each keystroke fed through independently - the
    // original bug was that the 2nd/3rd keystrokes were silently dropped by the browser because
    // the field had already been reformatted to "3.0" after the first.
    expect(parseRatingTenths('3')).toBe(30);
    expect(parseRatingTenths('3.')).toBe(30); // in-progress - same value, not yet more precise
    expect(parseRatingTenths('3.2')).toBe(32);
  });

  it('treats a trailing decimal point as the whole-number value (in-progress typing)', () => {
    expect(parseRatingTenths('3.')).toBe(30);
  });

  it('clamps to 100 (10.0) even if a caller passes something above range', () => {
    expect(parseRatingTenths('99')).toBe(100);
  });

  it('returns undefined (reject the keystroke) for a string that fails PARTIAL_DECIMAL', () => {
    expect(parseRatingTenths('3.25')).toBeUndefined();
    expect(parseRatingTenths('100')).toBeUndefined();
    expect(parseRatingTenths('abc')).toBeUndefined();
  });
});
