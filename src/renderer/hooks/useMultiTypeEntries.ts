import { useEffect, useState, type DependencyList } from 'react';
import type { EntryFilters, MediaType } from '@shared/types';
import { api } from '../api/client';
import { toErrorMessage } from '../errorMessage';

export interface UseMultiTypeEntriesResult<T> {
  entries: T[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetches `api[type].list(filters)` for each of `activeTypes` in parallel and flattens the results
 * into one array, tagging each row with its `mediaType` - the "N types, one merged list" pattern
 * AllLibraryView and StatsView both need (each independently reimplemented the identical
 * Promise.all-plus-cancellation-guard shape before this was pulled out; see useEntries.ts for the
 * single-type version, which guards the same way against out-of-order responses). Sorting, if the
 * caller wants any, is left to the caller - StatsView doesn't sort at all, and AllLibraryView's
 * sort depends on `filters.sortBy`/`sortDir` in a way this generic hook has no reason to know
 * about.
 *
 * `extraDeps` lets a caller force a refetch on something beyond activeTypes/filters - AllLibraryView
 * passes `[refreshKey]` so an entry saved/deleted elsewhere still triggers a refetch; StatsView has
 * no such trigger and passes nothing.
 */
export function useMultiTypeEntries<T>(
  activeTypes: MediaType[],
  filters: EntryFilters,
  extraDeps: DependencyList = [],
): UseMultiTypeEntriesResult<T> {
  const [entries, setEntries] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeTypesKey = activeTypes.slice().sort().join(',');
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const perType = await Promise.all(
          activeTypes.map((type) =>
            api[type]
              .list(filters)
              .then((rows) => (rows as unknown as Record<string, unknown>[]).map((row) => ({ ...row, mediaType: type }))),
          ),
        );
        if (cancelled) return;
        setEntries(perType.flat() as T[]);
      } catch (err) {
        if (!cancelled) setError(toErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTypesKey, filtersKey, ...extraDeps]);

  return { entries, loading, error };
}
