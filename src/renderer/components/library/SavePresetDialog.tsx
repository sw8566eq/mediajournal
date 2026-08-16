import { useState } from 'react';

interface Props {
  open: boolean;
  onSave: (name: string) => void;
  onCancel: () => void;
}

/**
 * Small modal for naming a new filter preset. A new component rather than reusing
 * `ConfirmDialog` - that one's contract is narrower (message + confirm/cancel, no text input).
 */
export function SavePresetDialog({ open, onSave, onCancel }: Props) {
  const [name, setName] = useState('');

  if (!open) return null;

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setName('');
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <p>Save current filters as a preset</p>
        <label className="field">
          <span>Name</span>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
              if (e.key === 'Escape') onCancel();
            }}
          />
        </label>
        <div className="form-actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="primary" disabled={!name.trim()} onClick={submit}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
