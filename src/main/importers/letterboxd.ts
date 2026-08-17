// Pure Letterboxd-export CSV -> ExportedMovieEntry parser. No Electron/DB imports (see shared.ts)
// - unit tested directly in letterboxd.test.ts. The DB-touching dedupe-and-merge step lives in
// ../ipc/importHandlers.ts.
import Papa from 'papaparse';
import { ExportedEntrySchemaByType, type ExportedMovieEntry } from '@shared/validation';
import {
  isSameItem,
  papaErrorsToWarnings,
  parseTagList,
  prependDateNote,
  rowLineNumbers,
  starRatingToTenths,
  type ParsedImport,
} from './shared';

interface LetterboxdRow {
  Date?: string;
  Name?: string;
  Year?: string;
  Rating?: string;
  Tags?: string;
}

function parseYear(text: string | undefined): number | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

/**
 * Parses a Letterboxd `ratings.csv` or `diary.csv` export into rows ready for the movie library.
 * `watched.csv`/`watchlist.csv` are deliberately not supported: both share the exact same columns
 * (Date, Name, Year, Letterboxd URI) with no Rating column, so there's no reliable way to tell
 * "watched, unrated" apart from "want to watch" by header alone - rather than guess, this throws
 * a clear error when no Rating column is present.
 *
 * `diary.csv` can have multiple rows for the same film (rewatches) - since this app doesn't model
 * a rewatch log, repeat rows for the same film (matched via the same isSameItem the DB-dedupe step
 * in ../ipc/importHandlers.ts uses against the existing library) are collapsed into one entry,
 * keeping whichever row has the latest Date (Letterboxd dates are YYYY-MM-DD, so a plain string
 * comparison is chronologically correct).
 */
export function parseLetterboxdCsv(csvText: string): ParsedImport<ExportedMovieEntry> {
  const parsed = Papa.parse<LetterboxdRow>(csvText, { header: true, skipEmptyLines: true });

  if (!parsed.meta.fields?.includes('Rating')) {
    throw new Error(
      'This file doesn\'t look like a Letterboxd ratings or diary export (no "Rating" column found) - watched.csv/watchlist.csv exports aren\'t supported.',
    );
  }

  const warnings: string[] = papaErrorsToWarnings(parsed.errors);

  // Collapse repeat rows for the same film (rewatches) down to the latest-dated one before
  // validating.
  const collapsed: { row: LetterboxdRow; rowNumber: number }[] = [];
  // Not a plain `index + 2`: skipEmptyLines:true above already dropped any blank line from
  // `parsed.data` before indexing, which would otherwise make every warning's reported row number
  // drift below the true physical line as soon as the file has one. See rowLineNumbers' doc.
  const lineNumbers = rowLineNumbers(csvText);
  parsed.data.forEach((row, index) => {
    const rowNumber = lineNumbers[index] ?? index + 2; // fallback should be unreachable in practice
    const title = row.Name?.trim() ?? '';
    if (!title) {
      warnings.push(`Row ${rowNumber}: missing Name, skipped.`);
      return;
    }
    const year = parseYear(row.Year);

    const existing = collapsed.find((c) => isSameItem({ title: c.row.Name ?? '', year: parseYear(c.row.Year) }, { title, year }));
    if (!existing) {
      collapsed.push({ row, rowNumber });
    } else if ((row.Date ?? '') >= (existing.row.Date ?? '')) {
      existing.row = row;
      existing.rowNumber = rowNumber;
    }
  });

  const entries: ExportedMovieEntry[] = [];
  let skippedInvalid = 0;

  for (const { row, rowNumber } of collapsed) {
    const title = row.Name?.trim() ?? '';
    const year = parseYear(row.Year);

    const ratingTenths = starRatingToTenths(row.Rating);
    const tags = parseTagList(row.Tags);

    const candidate = {
      title,
      director: null,
      year,
      runtimeMin: null,
      ratingTenths,
      status: null,
      notes: prependDateNote('Watched', row.Date, null),
      genre: null,
      externalId: null,
      tags,
    };

    const result = ExportedEntrySchemaByType.movie.safeParse(candidate);
    if (result.success) {
      entries.push(result.data);
    } else {
      skippedInvalid++;
      const issue = result.error.issues[0];
      warnings.push(`Row ${rowNumber} ("${title || 'untitled'}"): ${issue?.message ?? 'invalid row'}, skipped.`);
    }
  }

  return { entries, warnings, skippedInvalid };
}
