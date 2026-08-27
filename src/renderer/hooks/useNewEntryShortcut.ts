import { useEffect, useRef } from 'react';
import { isTypingTarget } from './isTypingTarget';

/**
 * Global 'n' shortcut to start a new entry, mounted once from App.tsx - same shape as
 * useSearchShortcut.ts's existing '/' shortcut (isTypingTarget guard so it doesn't hijack a
 * literal 'n' typed into a field, document-level listener since there's no single element to
 * scope it to). Kept as its own hook rather than folding into useSearchShortcut, since the two
 * keys call back into completely different behavior (focus vs. navigate) - a shared hook would
 * just be a key/callback map with no real logic in common.
 *
 * `onNewEntry` is read through a ref rather than listed as the effect's dependency: App.tsx passes
 * a fresh inline arrow function on every render, and re-subscribing the document listener on every
 * one of those (most of which have nothing to do with this shortcut) would be pure churn - the ref
 * lets the effect mount the listener exactly once while still always calling the latest callback.
 */
export function useNewEntryShortcut(onNewEntry: () => void): void {
  const onNewEntryRef = useRef(onNewEntry);
  onNewEntryRef.current = onNewEntry;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'n' || isTypingTarget(e.target)) return;
      // The delete-confirm, save-preset, tag-rename, and bulk-tag modals all share this
      // `.modal-backdrop` wrapper (see ConfirmDialog/TextPromptDialog/BulkTagDialog) but don't stop
      // this document-level listener from seeing the keydown - without this guard, pressing 'n'
      // while one is open swaps the view underneath it, and dismissing the modal then reveals a
      // blank Add Entry form instead of whatever view the user actually expected to return to.
      if (document.querySelector('.modal-backdrop')) return;
      e.preventDefault();
      onNewEntryRef.current();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}
