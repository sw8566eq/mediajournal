import { useState } from 'react';
import type { MediaType } from '@shared/types';
import { MEDIA_TYPE_ORDER } from '../mediaTypeConfig';

export interface UseActiveMediaTypesResult {
  activeTypes: MediaType[];
  setActiveTypes: (types: MediaType[]) => void;
  toggleType: (type: MediaType) => void;
}

/**
 * Which media types are showing in a combined "All types" view (AllLibraryView, StatsView) - a
 * type-toggle chip row over all 5 types, all active by default. Both callers used to hand-roll the
 * identical `useState` + toggle function. `setActiveTypes` is exposed directly (not just
 * `toggleType`) because loading a saved filter preset replaces the whole set at once rather than
 * toggling individual chips.
 */
export function useActiveMediaTypes(initial: MediaType[] = MEDIA_TYPE_ORDER): UseActiveMediaTypesResult {
  const [activeTypes, setActiveTypes] = useState<MediaType[]>(initial);

  function toggleType(type: MediaType) {
    setActiveTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  return { activeTypes, setActiveTypes, toggleType };
}
