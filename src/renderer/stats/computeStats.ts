// Pure aggregation logic for the Stats view - zero React/DOM imports, so this is unit-testable
// under plain `vitest run` and reusable independent of how it's rendered (see computeStats.test.ts).
import type { EntryStatus, MediaType } from '@shared/types';
import { MEDIA_TYPE_LABELS, MEDIA_TYPE_ORDER, STATUS_LABELS, TYPE_FIELDS } from '../mediaTypeConfig';

/** The shape StatsView feeds in: every media type's list() result, flattened and tagged with
 *  `mediaType`, matching the same fetch-and-merge pattern AllLibraryView already uses. */
export type StatsEntry = Record<string, unknown> & {
  id: number;
  mediaType: MediaType;
  genre: string | null;
  ratingTenths: number | null;
  status: EntryStatus | null;
  finishDate: string | null;
};

export interface CountByType {
  mediaType: MediaType;
  label: string;
  count: number;
}

export interface CountByStatus {
  /** One of the real EntryStatus values, or 'finished' for the blank/null status (see CLAUDE.md -
   *  null is a first-class "no active status" value meaning finished, not a literal 'none'). */
  key: EntryStatus | 'finished';
  label: string;
  count: number;
}

export interface RatingBucket {
  /** e.g. "7–8" for ratings in [70, 80) tenths, or "10" for the single top value. */
  label: string;
  count: number;
}

export interface GenreCount {
  genre: string;
  count: number;
}

export interface YearCount {
  year: number;
  count: number;
}

export interface TypeSpecificTotal {
  mediaType: MediaType;
  key: string;
  label: string;
  total: number;
}

export interface LibraryStats {
  totalEntries: number;
  countByType: CountByType[];
  countByStatus: CountByStatus[];
  /** In rating tenths (0-100), matching the DB's storage convention - convert to X.X/10 only at
   *  the display boundary, per CLAUDE.md. Null when no entry has a rating yet. */
  averageRatingTenths: number | null;
  ratingHistogram: RatingBucket[];
  topGenres: GenreCount[];
  entriesPerYear: YearCount[];
  typeSpecificTotals: TypeSpecificTotal[];
}

function countByType(entries: StatsEntry[]): CountByType[] {
  const counts = new Map<MediaType, number>(MEDIA_TYPE_ORDER.map((t) => [t, 0]));
  for (const e of entries) counts.set(e.mediaType, (counts.get(e.mediaType) ?? 0) + 1);
  return MEDIA_TYPE_ORDER.map((mediaType) => ({ mediaType, label: MEDIA_TYPE_LABELS[mediaType], count: counts.get(mediaType) ?? 0 }));
}

function countByStatus(entries: StatsEntry[]): CountByStatus[] {
  const keys: (EntryStatus | 'finished')[] = ['finished', 'planned', 'in_progress'];
  const counts = new Map<EntryStatus | 'finished', number>(keys.map((k) => [k, 0]));
  for (const e of entries) {
    const key = e.status ?? 'finished';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return keys.map((key) => ({
    key,
    label: key === 'finished' ? 'Finished' : STATUS_LABELS[key],
    count: counts.get(key) ?? 0,
  }));
}

function averageRatingTenths(entries: StatsEntry[]): number | null {
  const rated = entries.filter((e): e is StatsEntry & { ratingTenths: number } => e.ratingTenths !== null);
  if (rated.length === 0) return null;
  const sum = rated.reduce((acc, e) => acc + e.ratingTenths, 0);
  return sum / rated.length;
}

function ratingHistogram(entries: StatsEntry[]): RatingBucket[] {
  // 10 buckets of one full point each (0.0-0.9, 1.0-1.9, ..., 9.0-10.0 - the top bucket includes
  // the max value 10.0 itself, i.e. ratingTenths === 100).
  const buckets = new Array(10).fill(0) as number[];
  for (const e of entries) {
    if (e.ratingTenths === null) continue;
    const idx = Math.min(9, Math.floor(e.ratingTenths / 10));
    buckets[idx]++;
  }
  return buckets.map((count, i) => ({ label: i === 9 ? '9–10' : `${i}–${i + 1}`, count }));
}

function topGenres(entries: StatsEntry[], limit = 8): GenreCount[] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    if (!e.genre) continue;
    counts.set(e.genre, (counts.get(e.genre) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre))
    .slice(0, limit);
}

function entriesPerYear(entries: StatsEntry[]): YearCount[] {
  const counts = new Map<number, number>();
  for (const e of entries) {
    if (!e.finishDate) continue;
    const year = parseInt(e.finishDate.slice(0, 4), 10);
    if (Number.isNaN(year)) continue;
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);
}

function typeSpecificTotals(entries: StatsEntry[]): TypeSpecificTotal[] {
  const totals: TypeSpecificTotal[] = [];
  for (const mediaType of MEDIA_TYPE_ORDER) {
    // Every numeric type-specific field except `year` (shared across all 5 types, but a sum of
    // release years is meaningless) - e.g. runtimeMin (movies), pages (books), hoursPlayed (games).
    const summableFields = TYPE_FIELDS[mediaType].filter((f) => f.type === 'number' && f.key !== 'year');
    for (const field of summableFields) {
      const total = entries
        .filter((e) => e.mediaType === mediaType)
        .reduce((acc, e) => acc + (typeof e[field.key] === 'number' ? (e[field.key] as number) : 0), 0);
      if (total > 0) totals.push({ mediaType, key: field.key, label: field.label, total });
    }
  }
  return totals;
}

export function computeStats(entries: StatsEntry[]): LibraryStats {
  return {
    totalEntries: entries.length,
    countByType: countByType(entries),
    countByStatus: countByStatus(entries),
    averageRatingTenths: averageRatingTenths(entries),
    ratingHistogram: ratingHistogram(entries),
    topGenres: topGenres(entries),
    entriesPerYear: entriesPerYear(entries),
    typeSpecificTotals: typeSpecificTotals(entries),
  };
}
