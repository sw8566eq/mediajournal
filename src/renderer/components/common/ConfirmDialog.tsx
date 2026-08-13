interface Props {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * In-app confirmation modal, used instead of the browser/Electron native `confirm()`.
 * A synchronous native dialog can leave the renderer's focus in a bad state afterward
 * (particularly with `sandbox: true`), causing the next-clicked input to stop responding
 * until the window is refocused some other way. A plain DOM modal has no such quirk.
 */
export function ConfirmDialog({ open, message, onConfirm, onCancel }: Props) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <p>{message}</p>
        <div className="form-actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="danger" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
