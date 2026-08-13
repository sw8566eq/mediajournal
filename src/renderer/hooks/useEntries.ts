import { useCallback, useEffect, useState } from 'react';
import type { EntryByType, EntryFilters, MediaType } from '@shared/types';
import { api } from '../api/client';

/** Fetches (and refetches on filter/mediaType change) the entry list for one media type. */
export function useEntries<T extends MediaType>(mediaType: T, filters: EntryFilters) {
  const [entries, setEntries] = useState<EntryByType[T][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filtersKey = JSON.stringify(filters);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = (await api[mediaType].list(filters)) as EntryByType[T][];
      setEntries(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaType, filtersKey]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { entries, loading, error, refetch };
}
