import { useCallback, useEffect, useRef, useState } from 'react';
import type { EntryByType, EntryFilters, MediaType } from '@shared/types';
import { api } from '../api/client';
import { toErrorMessage } from '../errorMessage';

/** Fetches (and refetches on filter/mediaType change) the entry list for one media type. */
export function useEntries<T extends MediaType>(mediaType: T, filters: EntryFilters) {
  const [entries, setEntries] = useState<EntryByType[T][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filtersKey = JSON.stringify(filters);

  // Guards against out-of-order responses: rapid filter/search changes fire a new list() call per
  // change with nothing to cancel the previous one. If an earlier request resolves after a later
  // one, its stale result would otherwise silently overwrite the correct, newer one. Each refetch
  // claims the next id; only the response matching the *current* id is applied.
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = (await api[mediaType].list(filters)) as EntryByType[T][];
      if (requestId !== requestIdRef.current) return; // superseded by a newer request
      setEntries(result);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(toErrorMessage(err));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaType, filtersKey]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { entries, loading, error, refetch };
}
