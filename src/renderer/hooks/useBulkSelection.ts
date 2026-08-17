import { useEffect, useState, type DependencyList } from 'react';
import type { BulkResult, EntryRef } from '../entryActions';

export interface UseBulkSelectionResult<K> {
  selected: Set<K>;
  toggle: (key: K) => void;
  clear: () => void;
  bulkTagDialogOpen: boolean;
  openBulkTagDialog: () => void;
  closeBulkTagDialog: () => void;
  bulkError: string | null;
  /** Runs a bulk delete against an already-resolved item list (LibraryView maps its plain id `Set`
   *  straight to `{mediaType, id}`; AllLibraryView filters its composite-key `Set` against the
   *  currently-loaded entries first) - resolving `items` stays the caller's job since that's the
   *  one thing that actually differs between the two selection-key shapes; everything after that
   *  (call, clear, error) is identical. */
  runBulkDelete: (items: EntryRef[], onBulkDelete: (items: EntryRef[]) => Promise<BulkResult>) => Promise<void>;
  runBulkAddTag: (
    items: EntryRef[],
    tagIds: number[],
    onBulkAddTag: (items: EntryRef[], tagIds: number[]) => Promise<BulkResult>,
  ) => Promise<void>;
}

/**
 * Owns the selection/bulk-dialog/bulk-error state and handlers shared by LibraryView and
 * AllLibraryView - previously duplicated near-verbatim between the two, differing only in the
 * selection-key type (`number` there, a `${mediaType}-${id}` composite `string` here). Generic
 * over the key type `K` so both callers get their own correctly-typed `Set<K>`.
 *
 * `resetDeps` clears the selection whenever it changes (e.g. `[filters, refreshKey]`) - a changed
 * filter query, type-tab, or out-of-band refetch (an entry deleted via its own right-click menu
 * while still checked) can drop previously-selected entries out of the visible list entirely, so
 * selection is cleared rather than reconciled against new results. This is a genuinely dynamic
 * deps list (passed in by the caller, not statically knowable here), which is exactly what
 * react-hooks/exhaustive-deps can't verify - the disable below is intentional, not an oversight.
 */
export function useBulkSelection<K>(resetDeps: DependencyList): UseBulkSelectionResult<K> {
  const [selected, setSelected] = useState<Set<K>>(new Set());
  const [bulkTagDialogOpen, setBulkTagDialogOpen] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  useEffect(() => {
    setSelected(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDeps);

  function toggle(key: K) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function clear() {
    setSelected(new Set());
  }

  async function runBulkDelete(items: EntryRef[], onBulkDelete: (items: EntryRef[]) => Promise<BulkResult>) {
    const result = await onBulkDelete(items);
    setSelected(new Set());
    setBulkError(result.failed > 0 ? `${result.failed} of ${items.length} deletions failed.` : null);
  }

  async function runBulkAddTag(
    items: EntryRef[],
    tagIds: number[],
    onBulkAddTag: (items: EntryRef[], tagIds: number[]) => Promise<BulkResult>,
  ) {
    const result = await onBulkAddTag(items, tagIds);
    setBulkTagDialogOpen(false);
    setSelected(new Set());
    setBulkError(result.failed > 0 ? `${result.failed} of ${items.length} tag updates failed.` : null);
  }

  return {
    selected,
    toggle,
    clear,
    bulkTagDialogOpen,
    openBulkTagDialog: () => setBulkTagDialogOpen(true),
    closeBulkTagDialog: () => setBulkTagDialogOpen(false),
    bulkError,
    runBulkDelete,
    runBulkAddTag,
  };
}
