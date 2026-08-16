import type { EntryFilters } from './types';

export type SortByValue = NonNullable<EntryFilters['sortBy']>;

/**
 * Single source of truth for the sortable fields, mapping each `sortBy` value to both its SQL
 * column name (main process, `mediaRepository.ts`) and its camelCase JS field name (renderer,
 * `sortEntries.ts`). Previously these were two independently hand-maintained maps with nothing
 * checking their values agreed - add new sortable fields here, not by editing either map directly.
 */
export const SORT_FIELDS: { value: SortByValue; dbColumn: string; tsKey: string }[] = [
  { value: 'title', dbColumn: 'title', tsKey: 'title' },
  { value: 'year', dbColumn: 'year', tsKey: 'year' },
  { value: 'rating', dbColumn: 'rating_tenths', tsKey: 'ratingTenths' },
  { value: 'status', dbColumn: 'status', tsKey: 'status' },
  { value: 'createdAt', dbColumn: 'created_at', tsKey: 'createdAt' },
];
