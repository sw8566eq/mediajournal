// Pure helpers shared by the Goodreads/Letterboxd CSV importers (goodreads.ts, letterboxd.ts)
// and by the DB-touching dedupe step in ../ipc/importHandlers.ts. Zero Electron/DB imports -
// mirrors db/repositories/queryBuilder.ts's reasoning for staying host-Node-testable.

/** What a CSV parser returns: the rows that turned into valid entries, warnings for rows that
 *  didn't (never a throw - one bad row in a large export shouldn't abort the whole import,
 *  unlike the all-or-nothing JSON backup:import path), and a count of how many were skipped. */
export interface ParsedImport<T> {
  entries: T[];
  warnings: string[];
  skippedInvalid: number;
}

/**
 * True if two (title, year) pairs represent "the same" item for dedupe purposes: the same title
 * (trimmed, case-insensitive) and, only when *both* sides have a year, the same year too - a year
 * present on only one side doesn't block a match, since title is the primary signal and a missing
 * year is usually just missing metadata rather than a genuine discrepancy.
 *
 * Used two ways: collapsing repeat Letterboxd diary.csv rows for the same rewatched film, and
 * (from importHandlers.ts) detecting CSV rows that already exist in the local library.
 */
export function isSameItem(
  a: { title: string; year?: number | null },
  b: { title: string; year?: number | null },
): boolean {
  if (a.title.trim().toLowerCase() !== b.title.trim().toLowerCase()) return false;
  if (a.year != null && b.year != null) return a.year === b.year;
  return true;
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

const DEFAULT_WARNING_CAP = 20;

/** Bounds a warnings list for safe IPC transport, appending a summary line for anything past the
 *  cap rather than silently dropping it. */
export function capWarnings(warnings: string[], cap: number = DEFAULT_WARNING_CAP): string[] {
  if (warnings.length <= cap) return warnings;
  const overflow = warnings.length - cap;
  return [...warnings.slice(0, cap), `...and ${overflow} more warning${overflow === 1 ? '' : 's'}.`];
}
