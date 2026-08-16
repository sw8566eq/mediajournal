import { useCallback, useEffect, useState } from 'react';
import type { Tag } from '@shared/types';
import { api } from '../api/client';

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    setTags(await api.tags.list());
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createTag = useCallback(
    async (name: string) => {
      const tag = await api.tags.create(name);
      await refetch();
      return tag;
    },
    [refetch],
  );

  const deleteTag = useCallback(
    async (id: number) => {
      await api.tags.delete(id);
      await refetch();
    },
    [refetch],
  );

  const renameTag = useCallback(
    async (id: number, name: string) => {
      // No try/catch here (matches createTag/deleteTag) - a rename can legitimately fail (the
      // UNIQUE COLLATE NOCASE constraint on tags.name), and that rejection needs to propagate to
      // the caller so it can be surfaced in the rename dialog rather than swallowed.
      await api.tags.rename(id, name);
      await refetch();
    },
    [refetch],
  );

  return { tags, loading, refetch, createTag, deleteTag, renameTag };
}
