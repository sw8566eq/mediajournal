import type { MediaType } from '@shared/types';
import { api } from './api/client';

/** A single entry identified across media types - the uniform shape bulk operations pass around.
 *  LibraryView selects within one media type (a plain `Set<number>`); AllLibraryView mixes types
 *  and keys selection by a `${mediaType}-${id}` composite - each view converts its own
 *  locally-shaped selection into a list of these before calling up to App.tsx's bulk functions,
 *  so App.tsx and BulkActionBar/BulkTagDialog never need to know which shape a given view uses. */
export interface EntryRef {
  mediaType: MediaType;
  id: number;
}

/** Outcome of a Promise.allSettled-based bulk operation - `succeeded`/`failed` counts, not a
 *  fail-fast throw, since Electron's main process serializes DB calls anyway (no transactional
 *  safety is lost by allowing partial success) and a "8 of 10 succeeded" summary is materially
 *  more honest than either silently ignoring failures or aborting the whole batch on the first one. */
export interface BulkResult {
  succeeded: number;
  failed: number;
}

/**
 * Deletes an entry and cleans up its cover file, if any. Fetches the entry fresh rather than
 * trusting a caller-supplied coverPath - callers (App.tsx's confirmDelete, and Feature C's bulk
 * delete) may only have an id in hand, not the full entry, and a stale/wrong cover path here would
 * either leak an orphaned file or delete the wrong one.
 */
export async function deleteEntryWithCover(mediaType: MediaType, id: number): Promise<void> {
  const entry = await api[mediaType].get(id);
  const coverPath = (entry as { coverPath?: string | null } | null)?.coverPath;
  await api[mediaType].delete(id);
  if (coverPath) await api.covers.remove(coverPath);
}

/**
 * Adds a tag to an entry without disturbing its existing tags. `mediaRepository.ts`'s setTags()
 * (invoked via update()'s tagIds field) is fully *replacing* - it deletes all junction rows for
 * the entry and re-inserts exactly the given ids - so a naive `update(id, { tagIds: [tagId] })`
 * would wipe every tag the entry already had. Fetch first, union (deduped) with the existing tag
 * ids, then update with the full resulting set.
 */
export async function addTagToEntry(mediaType: MediaType, id: number, tagId: number): Promise<void> {
  const entry = await api[mediaType].get(id);
  if (!entry) return;
  const existingIds = entry.tags.map((t) => t.id);
  if (existingIds.includes(tagId)) return; // already tagged - skip the redundant write
  await api[mediaType].update(id, { tagIds: [...existingIds, tagId] });
}
