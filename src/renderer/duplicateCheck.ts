/**
 * True if two (title, year) pairs represent "the same" item, for a non-blocking duplicate warning
 * on manual entry (see EntryForm.tsx). Same normalization as the CSV-import dedupe check
 * (src/main/importers/shared.ts's isSameItem) - trimmed, case-insensitive title match, and a year
 * only counts as a mismatch when *both* sides have one, since a missing year is usually just
 * missing metadata rather than a genuine discrepancy. Kept as its own small copy here rather than
 * importing across the main/renderer process boundary (see CLAUDE.md's IPC contract) - the two
 * copies are expected to stay in lockstep by inspection; there's little reason this narrow a rule
 * would ever need to change.
 */
function isSameItem(a: { title: string; year?: number | null }, b: { title: string; year?: number | null }): boolean {
  if (a.title.trim().toLowerCase() !== b.title.trim().toLowerCase()) return false;
  if (a.year != null && b.year != null) return a.year === b.year;
  return true;
}

/** Finds the first existing entry that looks like the same item as the given title/year, if any. */
export function findDuplicate<T extends { title: string; year?: number | null }>(
  existing: T[],
  candidate: { title: string; year?: number | null },
): T | undefined {
  if (!candidate.title.trim()) return undefined;
  return existing.find((e) => isSameItem(e, candidate));
}
