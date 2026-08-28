import { isSameItem } from '@shared/isSameItem';

/** Finds the first existing entry that looks like the same item as the given title/year, if any. */
export function findDuplicate<T extends { title: string; year?: number | null }>(
  existing: T[],
  candidate: { title: string; year?: number | null },
): T | undefined {
  if (!candidate.title.trim()) return undefined;
  return existing.find((e) => isSameItem(e, candidate));
}
