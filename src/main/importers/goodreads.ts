// Pure Goodreads-export CSV -> ExportedBookEntry parser. No Electron/DB imports (see shared.ts) -
// unit tested directly in goodreads.test.ts. The DB-touching dedupe-and-merge step lives in
// ../ipc/importHandlers.ts.
import Papa from 'papaparse';
import { ExportedEntrySchemaByType, type ExportedBookEntry } from '@shared/validation';
import type { EntryStatus } from '@shared/types';
import {
  papaErrorsToWarnings,
  parseTagList,
  prependDateNote,
  rowLineNumbers,
  starRatingToTenths,
  type ParsedImport,
} from './shared';

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

  const warnings: string[] = papaErrorsToWarnings(parsed.errors);
  const entries: ExportedBookEntry[] = [];
  let skippedInvalid = 0;

  // Not a plain `index + 2`: skipEmptyLines:true above already dropped any blank line from
  // `parsed.data` before indexing, which would otherwise make every warning's reported row number
  // drift below the true physical line as soon as the file has one. See rowLineNumbers' doc.
  const lineNumbers = rowLineNumbers(csvText);

  parsed.data.forEach((row, index) => {
    const rowNumber = lineNumbers[index] ?? index + 2; // fallback should be unreachable in practice
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

    const ratingTenths = starRatingToTenths(row['My Rating']);

    const yearText = row['Year Published']?.trim() || row['Original Publication Year']?.trim();
    const yearNum = yearText ? Number(yearText) : NaN;
    const year = Number.isFinite(yearNum) ? yearNum : null;

    const pagesText = row['Number of Pages']?.trim();
    // Number('1,234') is NaN - strip thousands separators before parsing so a long book's page
    // count doesn't silently vanish. Anything left that still isn't a plain number gets a warning
    // rather than quietly becoming null, matching how an unrecognized shelf value warns instead of
    // failing silently.
    const pagesNum = pagesText ? Number(pagesText.replace(/,/g, '')) : NaN;
    let pages: number | null = null;
    if (pagesText) {
      if (Number.isFinite(pagesNum)) {
        pages = pagesNum;
      } else {
        warnings.push(`Row ${rowNumber} ("${label}"): could not parse "Number of Pages" value "${pagesText}", imported without a page count.`);
      }
    }

    const tags = parseTagList(row['Bookshelves'], rawShelf);

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

    let result = ExportedEntrySchemaByType.book.safeParse(candidate);
    if (!result.success && candidate.year !== null) {
      // A bad `year` shouldn't sink an otherwise-valid row: Goodreads represents a work's
      // original-publication-year as a negative number for anything published BCE (e.g. -380 for
      // Plato's Republic), which fails the shared year schema's min(0) - and a hand-edited export
      // could have any other out-of-range value. Retry once with year nulled out; if that's what
      // made parsing fail, keep the rest of the row (rating/notes/tags included) rather than
      // dropping it entirely, same as an unrecognized shelf degrades to "finished" instead of
      // failing the row.
      const retry = ExportedEntrySchemaByType.book.safeParse({ ...candidate, year: null });
      if (retry.success) {
        warnings.push(`Row ${rowNumber} ("${label}"): year ${candidate.year} is out of range, imported without a year.`);
        result = retry;
      }
    }

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
