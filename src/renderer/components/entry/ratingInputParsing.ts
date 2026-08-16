// Pure parsing/validation logic for RatingInput, split out of the component so it's unit-testable
// without a DOM (see ratingInputParsing.test.ts) - no React/DOM imports here.

// Matches a valid (possibly in-progress) decimal while typing: up to 2 whole-number digits, then
// either nothing, or a '.' followed by at most 1 digit - i.e. anything on the way to "X" or "X.X".
// The two alternatives matter: without requiring an actual '.' before the trailing \d?, a naive
// `^\d{0,2}\.?\d?$` would wrongly accept "100" (\d{0,2} eats "10", \d? separately eats "0", with
// no dot in between at all).
const PARTIAL_DECIMAL = /^\d{0,2}$|^\d{0,2}\.\d?$/;

export function isPartialDecimal(raw: string): boolean {
  return PARTIAL_DECIMAL.test(raw);
}

/**
 * Converts a raw typed string into rating-tenths (0-100, clamped), or null for "unrated"/empty.
 * Returns `undefined` if `raw` isn't yet a valid partial decimal - the caller should ignore that
 * keystroke entirely (leave the field showing whatever it already had) rather than committing it.
 */
export function parseRatingTenths(raw: string): number | null | undefined {
  if (!isPartialDecimal(raw)) return undefined;
  if (raw === '' || raw === '.') return null;
  const num = parseFloat(raw);
  if (Number.isNaN(num)) return undefined;
  return Math.min(100, Math.max(0, Math.round(num * 10)));
}
