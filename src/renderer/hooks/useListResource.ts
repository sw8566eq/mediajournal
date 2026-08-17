import { useCallback, useEffect, useState } from 'react';

export interface UseListResourceResult<T> {
  items: T[];
  loading: boolean;
  refetch: () => Promise<void>;
}

/**
 * Fetch-on-mount list + loading + refetch scaffolding - the shape `useTags`, `useFilterPresets`,
 * and `GenreManager` each independently hand-rolled before this was pulled out. Callers that also
 * need create/delete/rename build their own `useCallback`-based mutators on top, calling
 * `refetch()` afterward (see useTags.ts/useFilterPresets.ts); a single-consumer case like
 * `GenreManager` can just use `items`/`loading`/`refetch` directly.
 *
 * `fetcher` should be a stable reference (e.g. `api.tags.list`, not `() => api.tags.list()`) - it's
 * `useCallback`'s own dependency for `refetch`, so a fresh arrow function every render would make
 * `refetch` (and anything built on top of it, like useTags' createTag/deleteTag/renameTag) lose its
 * referential stability across renders for no reason. `api.*` methods are already stable, unbound
 * function references (see preload.ts), so passing them directly is both correct and the simplest
 * option.
 */
export function useListResource<T>(fetcher: () => Promise<T[]>): UseListResourceResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    setItems(await fetcher());
    setLoading(false);
  }, [fetcher]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { items, loading, refetch };
}
