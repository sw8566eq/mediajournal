import { useEffect } from 'react';

/**
 * Closes a modal on Escape while it's open. Attaches a document-level `keydown` listener rather
 * than a local `onKeyDown` because these modals have no single input to attach one to (see
 * TextPromptDialog.tsx, which does have a text input and handles Escape locally alongside
 * Enter-to-submit instead of using this hook). Gated on `active` internally (not by skipping the
 * hook call itself, which would break React's hook-ordering rule) so the listener is only ever
 * attached while the modal is actually open.
 */
export function useEscapeKey(active: boolean, onEscape: () => void): void {
  useEffect(() => {
    if (!active) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onEscape();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, onEscape]);
}
