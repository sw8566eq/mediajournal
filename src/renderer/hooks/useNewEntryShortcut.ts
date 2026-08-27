import { useEffect } from 'react';
import { isTypingTarget } from './isTypingTarget';

/**
 * Global 'n' shortcut to start a new entry, mounted once from App.tsx - same shape as
 * useSearchShortcut.ts's existing '/' shortcut (isTypingTarget guard so it doesn't hijack a
 * literal 'n' typed into a field, document-level listener since there's no single element to
 * scope it to). Kept as its own hook rather than folding into useSearchShortcut, since the two
 * keys call back into completely different behavior (focus vs. navigate) - a shared hook would
 * just be a key/callback map with no real logic in common.
 */
export function useNewEntryShortcut(onNewEntry: () => void): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'n' || isTypingTarget(e.target)) return;
      e.preventDefault();
      onNewEntry();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onNewEntry]);
}
