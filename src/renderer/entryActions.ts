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
 * Adds one or more tags to an entry without disturbing its existing tags. `mediaRepository.ts`'s
 * setTags() (invoked via update()'s tagIds field) is fully *replacing* - it deletes all junction
 * rows for the entry and re-inserts exactly the given ids - so a naive
 * `update(id, { tagIds: [tagId] })` would wipe every tag the entry already had. Fetch first,
 * union (deduped) with the existing tag ids, then update once with the full resulting set.
 *
 * Deliberately takes *all* tag ids for one entry in a single call, rather than being called once
 * per tag: this used to be `addTagToEntry(mediaType, id, tagId)`, and bulkAddTag (App.tsx) called
 * it once per (entry, tag) pair via Promise.allSettled. When 2+ tags were applied to the same
 * entry, those calls raced - each independently read the entry's *pre-existing* tags before any
 * of the others' writes landed, so whichever write landed last won outright and silently undid
 * the others. Batching every tag for an entry into one read-then-write removes the race by
 * construction: there is exactly one write per entry, so nothing to race against.
 */
export async function addTagsToEntry(mediaType: MediaType, id: number, tagIds: number[]): Promise<void> {
  const entry = await api[mediaType].get(id);
  if (!entry) return;
  const existingIds = entry.tags.map((t) => t.id);
  const nextIds = [...new Set([...existingIds, ...tagIds])];
  if (nextIds.length === existingIds.length) return; // entry already had every one of these tags
  await api[mediaType].update(id, { tagIds: nextIds });
}
