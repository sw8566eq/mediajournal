// Pure helpers shared by the Goodreads/Letterboxd CSV importers (goodreads.ts, letterboxd.ts)
// and by the DB-touching dedupe step in ../ipc/importHandlers.ts. Zero Electron/DB imports -
// mirrors db/repositories/queryBuilder.ts's reasoning for staying host-Node-testable.
import Papa from 'papaparse';
import { isSameItem } from '@shared/isSameItem';

// Re-exported so existing callers here (letterboxd.ts, importHandlers.ts) can keep importing
// isSameItem from './shared' alongside these other import-specific helpers, without needing to
// know it now actually lives in src/shared/ - see isSameItem.ts for the function itself.
export { isSameItem };

/** What a CSV parser returns: the rows that turned into valid entries, warnings for rows that
 *  didn't (never a throw - one bad row in a large export shouldn't abort the whole import,
 *  unlike the all-or-nothing JSON backup:import path), and a count of how many were skipped. */
export interface ParsedImport<T> {
  entries: T[];
  warnings: string[];
  skippedInvalid: number;
}

/**
 * Prepends a source date as a plain-text line ahead of any existing notes. This app has no real
 * date field for an imported entry's original read/watched date - createdAt is the only date any
 * entry carries, and it's auto-set, not user-editable (see CLAUDE.md's Database section) - so
 * this is how that information survives the import instead of being silently dropped.
 */
export function prependDateNote(
  label: string,
  dateText: string | null | undefined,
  existingNotes: string | null | undefined,
): string | null {
  const trimmedDate = dateText?.trim();
  const trimmedNotes = existingNotes?.trim();
  if (!trimmedDate && !trimmedNotes) return null;
  if (!trimmedDate) return trimmedNotes ?? null;
  const dateLine = `${label}: ${trimmedDate}`;
  return trimmedNotes ? `${dateLine}\n\n${trimmedNotes}` : dateLine;
}

/**
 * Splits parsed candidates into ones that survive (nothing matching in `existing`) and a count of
 * how many were dropped as duplicates - pulled out as its own pure function, separate from the
 * DB fetch that produces `existing`, so this filtering logic is unit-testable without a DB
 * connection. Used by ../ipc/importHandlers.ts's mergeImportedEntries() against a real
 * `repo.list({})` result; also handy for exercising the exact same logic in tests.
 */
export function dedupeAgainstExisting<T extends { title: string; year?: number | null }>(
  candidates: T[],
  existing: { title: string; year?: number | null }[],
): { surviving: T[]; skippedDuplicate: number } {
  let skippedDuplicate = 0;
  const surviving = candidates.filter((candidate) => {
    const isDuplicate = existing.some((e) => isSameItem(e, candidate));
    if (isDuplicate) skippedDuplicate++;
    return !isDuplicate;
  });
  return { surviving, skippedDuplicate };
}

/**
 * Both parsers run Papa.parse with `skipEmptyLines: true`, so a blank line earlier in the file
 * shifts every subsequent row's array index below its true physical CSV line number - a naive
 * `index + 2` (1-indexing + header row) reports the wrong line in any warning once that happens.
 * This recovers the true line number of each real (non-blank) data row by re-parsing the same
 * text with `header: false, skipEmptyLines: false`, so every physical line - including blank ones
 * - gets a slot to index against. Reusing Papa.parse for this (rather than a naive
 * `csvText.split('\n')`) matters: a quoted field containing an embedded newline (a multi-line
 * Goodreads review, say) is one logical row spanning multiple physical text lines, and only
 * Papa's own tokenizer - not a plain newline split - knows to treat it as such. A genuinely blank
 * physical line tokenizes to exactly one empty-string field, which is Papa's own definition of
 * "empty line" (skipEmptyLines: true's non-"greedy" mode only drops lines with literally nothing
 * on them) - everything else counts as a real row.
 *
 * Returns the 1-indexed physical line number of each real row, in file order, excluding the
 * header line - so `rowLineNumbers(csvText)[i]` is the true line number for `parsed.data[i]` when
 * `parsed` came from the same text parsed with `skipEmptyLines: true`.
 */
export function rowLineNumbers(csvText: string): number[] {
  const raw = Papa.parse<string[]>(csvText, { header: false, skipEmptyLines: false });
  const numbers: number[] = [];
  // Can't just use `i + 1` as the line number: when an earlier row's own field value contains an
  // embedded newline, that one logical row spans multiple physical lines, pushing every row after
  // it further down than its array index alone would suggest. Track physical line position with a
  // running counter instead, advancing it by 1 (the row's own line break) plus however many
  // newlines are embedded in that row's field values.
  let line = 1; // the header line
  raw.data.forEach((fields, i) => {
    const isBlank = fields.length === 1 && fields[0].trim() === '';
    if (i > 0 && !isBlank) numbers.push(line);
    const newlinesInRow = fields.reduce((sum, f) => sum + (f.match(/\n/g)?.length ?? 0), 0);
    line += 1 + newlinesInRow;
  });
  return numbers;
}

/**
 * Converts a star rating to this app's 0-100 ratingTenths - Goodreads' 0-5 integer scale and
 * Letterboxd's 0.5-5 half-star scale both convert the same way (multiply by 20), so one function
 * covers both importers. 0, blank, and unparseable all mean "unrated" (null), not a real zero.
 */
export function starRatingToTenths(raw: string | undefined): number | null {
  const trimmed = raw?.trim();
  const num = trimmed ? Number(trimmed) : NaN;
  return Number.isFinite(num) && num > 0 ? Math.round(num * 20) : null;
}

/**
 * Splits a comma-separated tag list into trimmed, deduped, non-empty tags. `exclude`, when given,
 * drops any tag matching it case-insensitively - Goodreads' Bookshelves column includes the
 * exclusive-shelf name itself, which would otherwise be double-represented as both a status and a
 * tag; Letterboxd's Tags column has no such overlap, so its call site omits `exclude`.
 */
export function parseTagList(raw: string | undefined, exclude?: string): string[] {
  return [
    ...new Set(
      (raw ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.toLowerCase() !== exclude),
    ),
  ];
}

/** Converts Papa.parse's own structural-error list (rows Papa itself couldn't tokenize) into the
 *  same "Row N: message." warning shape both importers otherwise produce for validation failures. */
export function papaErrorsToWarnings(errors: Papa.ParseError[]): string[] {
  return errors.map((err) => `Row ${err.row != null ? err.row + 2 : '?'}: ${err.message}.`);
}

const DEFAULT_WARNING_CAP = 20;

/** Bounds a warnings list for safe IPC transport, appending a summary line for anything past the
 *  cap rather than silently dropping it. */
export function capWarnings(warnings: string[], cap: number = DEFAULT_WARNING_CAP): string[] {
  if (warnings.length <= cap) return warnings;
  const overflow = warnings.length - cap;
  return [...warnings.slice(0, cap), `...and ${overflow} more warning${overflow === 1 ? '' : 's'}.`];
}
