import { useEffect } from 'react';
import { isTypingTarget } from './isTypingTarget';

/**
 * Global `/` shortcut to focus the library search box, mounted once from App.tsx. Deliberately
 * uses `document.querySelector('.search-input')` rather than ref-threading a ref down through
 * LibraryView/AllLibraryView -> FilterSortBar - ref-threading would touch the exact same three
 * files Feature C's bulk-selection state also needs to change, for no benefit beyond avoiding one
 * class lookup. There's only ever one `.search-input` mounted at a time (LibraryView/AllLibraryView
 * are mutually exclusive), so the query is unambiguous.
 */
export function useSearchShortcut(): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== '/' || isTypingTarget(e.target)) return;
      const input = document.querySelector<HTMLInputElement>('.search-input');
      if (!input) return;
      e.preventDefault(); // stop the literal '/' from landing in whatever's focused (e.g. body)
      input.focus();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}
