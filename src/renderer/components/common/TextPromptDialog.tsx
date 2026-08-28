import { useEffect, useState } from 'react';

interface Props {
  open: boolean;
  title: string;
  initialValue?: string;
  submitLabel?: string;
  /** Shown inline (e.g. a failed save) without closing the dialog, so the user can correct and retry. */
  error?: string | null;
  onSave: (value: string) => void;
  onCancel: () => void;
}

/**
 * Small modal for a single text field - save/cancel, Enter-to-submit, disabled Save until
 * non-empty. Generic rather than one-off: this exact shape now backs both "save current filters
 * as a preset" and "rename a tag" (see SavePresetDialog.tsx, and FilterSortBar.tsx's rename flow).
 *
 * The dialog stays mounted across open/close (callers just toggle `open`, not conditional
 * rendering), so unlike a component that remounts fresh each time, the internal value has to be
 * explicitly re-seeded from `initialValue` on every open - otherwise a second open with a
 * *different* initialValue (e.g. renaming a different tag) would still show whatever was last
 * typed, not that tag's actual current name.
 */
export function TextPromptDialog({ open, title, initialValue = '', submitLabel = 'Save', error, onSave, onCancel }: Props) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  if (!open) return null;

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSave(trimmed);
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <p>{title}</p>
        <label className="field">
          <span>Name</span>
          <input
            type="text"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
              if (e.key === 'Escape') onCancel();
            }}
          />
        </label>
        {error && <div className="error-banner">{error}</div>}
        <div className="form-actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="primary" disabled={!value.trim()} onClick={submit}>
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
