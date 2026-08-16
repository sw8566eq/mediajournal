import { useState } from 'react';
import { getStoredTheme, setStoredTheme, type Theme } from '../theme';

export function useTheme() {
  // Initialized from localStorage rather than a fixed default - main.tsx already applied it to
  // the document before this component tree ever mounted, so this just reads the same source of
  // truth back into React state for the Settings UI to reflect/control.
  const [theme, setThemeState] = useState<Theme>(getStoredTheme());

  function setTheme(next: Theme) {
    setStoredTheme(next);
    setThemeState(next);
  }

  return { theme, setTheme };
}
