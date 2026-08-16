// Manual light/dark theme override, layered on top of the OS `prefers-color-scheme` default (see
// global.css's `:root`/`@media (prefers-color-scheme: dark)`/`:root[data-theme='dark']` blocks).
// A plain module (not a hook) so `applyTheme`/`getStoredTheme` can also be called synchronously
// from main.tsx before the first paint, avoiding a flash of the wrong theme on startup - a React
// effect wouldn't run until after that first paint.

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'mediajournal:theme';

export function getStoredTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

/** Applies a theme to the document without persisting it - `setStoredTheme` is what callers should
 *  normally use; this is split out so main.tsx can (re)apply the already-stored theme on boot. */
export function applyTheme(theme: Theme): void {
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

export function setStoredTheme(theme: Theme): void {
  if (theme === 'system') {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, theme);
  }
  applyTheme(theme);
}
