/**
 * True if two (title, year) pairs represent "the same" item: the same title (trimmed,
 * case-insensitive) and, only when *both* sides have a year, the same year too - a year present on
 * only one side doesn't block a match, since title is the primary signal and a missing year is
 * usually just missing metadata rather than a genuine discrepancy.
 *
 * Lives in src/shared/ (rather than being copied once for the renderer's manual-entry duplicate
 * warning and once for the main-process CSV-import dedupe) because it's a pure predicate with zero
 * Node/DOM dependency - exactly what this directory is for. Used three ways: EntryForm's
 * non-blocking "looks like a duplicate" warning (src/renderer/duplicateCheck.ts), collapsing
 * repeat Letterboxd diary.csv rows for the same rewatched film, and detecting CSV import rows that
 * already exist in the local library (both src/main/importers/).
 */
export function isSameItem(
  a: { title: string; year?: number | null },
  b: { title: string; year?: number | null },
): boolean {
  if (a.title.trim().toLowerCase() !== b.title.trim().toLowerCase()) return false;
  if (a.year != null && b.year != null) return a.year === b.year;
  return true;
}
