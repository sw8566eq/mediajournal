// Pure Goodreads-export CSV -> ExportedBookEntry parser. No Electron/DB imports (see shared.ts) -
// unit tested directly in goodreads.test.ts. The DB-touching dedupe-and-merge step lives in
// ../ipc/importHandlers.ts.
import Papa from 'papaparse';
import { ExportedEntrySchemaByType, type ExportedBookEntry } from '@shared/validation';
import type { EntryStatus } from '@shared/types';
import { prependDateNote, type ParsedImport } from './shared';

// Goodreads' three built-in shelf values map onto this app's status convention (null = finished,
// never a literal 'none' string - see CLAUDE.md's Database section). A custom/renamed shelf falls
// through to null (finished) too, but with a warning rather than silently - the user should know
// it didn't map to 'planned'/'in_progress'.
const SHELF_STATUS: Record<string, EntryStatus | null> = {
  read: null,
  'currently-reading': 'in_progress',
  'to-read': 'planned',
};

/** Parses a Goodreads library-export CSV (Settings > Import & Export > Export Library) into rows
 *  ready for the book library. Malformed/incomplete rows are skipped with a warning rather than
 *  aborting the whole file. */
export function parseGoodreadsCsv(csvText: string): ParsedImport<ExportedBookEntry> {
  const parsed = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true });

  const warnings: string[] = parsed.errors.map(
    (err) => `Row ${err.row != null ? err.row + 2 : '?'}: ${err.message}.`,
  );
  const entries: ExportedBookEntry[] = [];
  let skippedInvalid = 0;

  parsed.data.forEach((row, index) => {
    const rowNumber = index + 2; // +1 for 1-indexing, +1 for the header row
    const title = row['Title']?.trim() ?? '';
    const label = title || 'untitled';

    const rawShelf = row['Exclusive Shelf']?.trim().toLowerCase();
    let status: EntryStatus | null = null;
    if (rawShelf) {
      if (rawShelf in SHELF_STATUS) {
        status = SHELF_STATUS[rawShelf];
      } else {
        warnings.push(`Row ${rowNumber} ("${label}"): unrecognized shelf "${row['Exclusive Shelf']}", imported as finished.`);
      }
    }

    const ratingRaw = Number(row['My Rating']);
    const ratingTenths = Number.isFinite(ratingRaw) && ratingRaw > 0 ? Math.round(ratingRaw * 20) : null;

    const yearText = row['Year Published']?.trim() || row['Original Publication Year']?.trim();
    const yearNum = yearText ? Number(yearText) : NaN;
    const year = Number.isFinite(yearNum) ? yearNum : null;

    const pagesText = row['Number of Pages']?.trim();
    const pagesNum = pagesText ? Number(pagesText) : NaN;
    const pages = Number.isFinite(pagesNum) ? pagesNum : null;

    // Bookshelves includes the exclusive shelf itself - drop it so it isn't double-represented
    // as both a status and a tag.
    const tags = [
      ...new Set(
        (row['Bookshelves'] ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && s.toLowerCase() !== rawShelf),
      ),
    ];

    const reviewText = [row['My Review'], row['Private Notes']]
      .map((s) => s?.trim())
      .filter((s): s is string => !!s)
      .join('\n\n');
    const notes = prependDateNote('Read', row['Date Read'], reviewText || null);

    const candidate = {
      title,
      author: row['Author']?.trim() || null,
      year,
      pages,
      ratingTenths,
      status,
      notes,
      genre: null,
      externalId: null,
      tags,
    };

    const result = ExportedEntrySchemaByType.book.safeParse(candidate);
    if (result.success) {
      entries.push(result.data);
    } else {
      skippedInvalid++;
      const issue = result.error.issues[0];
      warnings.push(`Row ${rowNumber} ("${label}"): ${issue?.message ?? 'invalid row'}, skipped.`);
    }
  });

  return { entries, warnings, skippedInvalid };
}
