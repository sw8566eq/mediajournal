import { useEffect, useState } from 'react';
import type { Tag } from '@shared/types';
import { TagPicker } from '../entry/TagPicker';

interface Props {
  open: boolean;
  allTags: Tag[];
  onCreateTag: (name: string) => Promise<Tag>;
  onApply: (tagIds: number[]) => void;
  onCancel: () => void;
}

/**
 * Wraps the existing TagPicker, reinterpreting its `selectedIds`/`onChange` as "tags queued to
 * apply to the whole selection" rather than "this one entry's tags" - a legitimate reuse that
 * also gets multi-tag-at-once and inline tag creation for free, which a plain <select> couldn't.
 * A brand-new component (not touching any pre-Feature-B code), so it's written Escape-dismissable
 * from the start, matching ConfirmDialog's now-established convention.
 */
export function BulkTagDialog({ open, allTags, onCreateTag, onApply, onCancel }: Props) {
  const [queuedIds, setQueuedIds] = useState<number[]>([]);

  // Fresh queue on every open - otherwise a second bulk-tag action would start pre-loaded with
  // whatever was left queued (but never applied/cancelled cleanly) from a previous one.
  useEffect(() => {
    if (open) setQueuedIds([]);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <p>Add tags to selected entries</p>
        <TagPicker allTags={allTags} selectedIds={queuedIds} onChange={setQueuedIds} onCreateTag={onCreateTag} />
        <div className="form-actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="primary" disabled={queuedIds.length === 0} onClick={() => onApply(queuedIds)}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
