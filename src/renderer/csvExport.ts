import Papa from 'papaparse';
import type { MediaType, Tag } from '@shared/types';
import { TYPE_FIELDS } from './mediaTypeConfig';

/**
 * Builds CSV text for one media type's entries, as currently filtered/sorted in the UI - the
 * export counterpart to this app's CSV *import* path (Goodreads/Letterboxd, see
 * src/main/importers/). Scoped to a single media type only (not the combined "All" view): every
 * type has a different set of type-specific columns (director/creator/author/artist/developer,
 * runtime/pages/platform/...), and there's no single uniform column layout that would represent
 * all 5 without either losing type-specific fields or filling most cells blank for most rows -
 * LibraryView is the one place this is offered.
 *
 * Uses papaparse (already a dependency, for CSV import) rather than hand-joining strings, for the
 * same RFC4180-correct-quoting reason the importers need it - a title or note containing a comma
 * or embedded newline isn't safe to hand-split/hand-join.
 */
export function entriesToCsv(mediaType: MediaType, entries: Record<string, unknown>[]): string {
  const typeFields = TYPE_FIELDS[mediaType];
  const fields = ['Title', ...typeFields.map((f) => f.label), 'Genre', 'Rating', 'Status', 'Tags', 'Notes'];

  const rows = entries.map((entry) => {
    const row: Record<string, string | number> = {
      Title: (entry.title as string | null) ?? '',
    };
    for (const field of typeFields) {
      row[field.label] = (entry[field.key] as string | number | null) ?? '';
    }
    row.Genre = (entry.genre as string | null) ?? '';
    const ratingTenths = entry.ratingTenths as number | null;
    row.Rating = ratingTenths != null ? (ratingTenths / 10).toFixed(1) : '';
    row.Status = (entry.status as string | null) ?? '';
    row.Tags = ((entry.tags as Tag[] | undefined) ?? []).map((t) => t.name).join(', ');
    row.Notes = (entry.notes as string | null) ?? '';
    return row;
  });

  // Passing `fields` explicitly (rather than letting Papa.unparse infer columns from the first
  // row) matters for an empty `entries` list - inference has nothing to infer from and would
  // produce an empty string instead of just a header row.
  return Papa.unparse({ fields, data: rows });
}
