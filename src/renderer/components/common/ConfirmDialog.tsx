import { useEffect, useRef } from 'react';
import { useEscapeKey } from '../../hooks/useEscapeKey';

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
  // Called unconditionally (above the early `if (!open) return null` below), per React's
  // hook-ordering rule - useEscapeKey itself gates whether its listener is actually attached.
  // There's no input here to attach a local onKeyDown to the way TextPromptDialog does.
  useEscapeKey(open, onCancel);

  const cancelRef = useRef<HTMLButtonElement>(null);
  // Keyboard/screen-reader users otherwise land in a modal with nothing focused - a plain DOM
  // modal (unlike the native confirm() this replaces) gets no automatic focus move. Cancel, not
  // Delete, gets it: the safer default for a stray Enter press. Nothing here restores focus to
  // whatever triggered the dialog on close - every caller already re-renders (or unmounts a
  // context menu) on confirm/cancel, which naturally moves focus on its own.
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" role="alertdialog" aria-modal="true" aria-label={message} onClick={(e) => e.stopPropagation()}>
        <p>{message}</p>
        <div className="form-actions">
          <button type="button" ref={cancelRef} onClick={onCancel}>
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
