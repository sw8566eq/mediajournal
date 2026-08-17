import { useState } from 'react';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface Props {
  count: number;
  onClear: () => void;
  onDelete: () => void;
  onAddTagClick: () => void;
}

/**
 * A dumb, opaque-callback bar - deliberately never touches id shapes itself. LibraryView keys
 * selection by plain `number`, AllLibraryView by a `${mediaType}-${id}` composite (it mixes
 * types); each view closes over its own locally-shaped selection when wiring these callbacks, so
 * this component only ever needs to know "how many are selected" and "what to do about it".
 *
 * Owns its own delete ConfirmDialog, matching how FilterSortBar already owns its own tag-delete
 * ConfirmDialog locally rather than lifting that state to a parent.
 */
export function BulkActionBar({ count, onClear, onDelete, onAddTagClick }: Props) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (count === 0) return null;

  return (
    <div className="bulk-action-bar">
      <span>{count} selected</span>
      <button type="button" onClick={onAddTagClick}>
        Add Tag…
      </button>
      <button type="button" className="danger" onClick={() => setConfirmingDelete(true)}>
        Delete
      </button>
      <button type="button" onClick={onClear}>
        Clear
      </button>
      <ConfirmDialog
        open={confirmingDelete}
        message={`Delete ${count} selected ${count === 1 ? 'entry' : 'entries'}? This cannot be undone.`}
        onConfirm={() => {
          setConfirmingDelete(false);
          onDelete();
        }}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}
