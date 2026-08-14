import type { EntryFilters } from '@shared/types';
import { SORT_FIELDS } from '@shared/sortFields';

// Derived from the shared SORT_FIELDS list (see src/shared/sortFields.ts) rather than
// hand-written, so this can't silently drift from mediaRepository.ts's server-side SORT_COLUMN.
const SORT_KEY: Record<NonNullable<EntryFilters['sortBy']>, string> = Object.fromEntries(
  SORT_FIELDS.map((f) => [f.value, f.tsKey]),
) as Record<NonNullable<EntryFilters['sortBy']>, string>;

/**
 * Comparator for merging several already-server-sorted per-type entry lists (the "All" library
 * view) back into one globally-ordered list. Each individual `list()` call is already sorted by
 * the DB, but merging N sorted arrays still needs a final client-side sort pass for correct
 * global order. Nulls always sort last regardless of direction.
 */
export function compareEntries(
  sortBy: EntryFilters['sortBy'],
  sortDir: EntryFilters['sortDir'],
): (a: Record<string, unknown>, b: Record<string, unknown>) => number {
  const key = SORT_KEY[sortBy ?? 'title'];
  const dir = sortDir === 'desc' ? -1 : 1;

  return (a, b) => {
    const av = a[key];
    const bv = b[key];
    const aMissing = av === null || av === undefined;
    const bMissing = bv === null || bv === undefined;
    if (aMissing || bMissing) return aMissing === bMissing ? 0 : aMissing ? 1 : -1;
    if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * dir;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return 0;
  };
}
