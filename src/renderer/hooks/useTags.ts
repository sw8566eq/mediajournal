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

  return { tags, loading, refetch, createTag, deleteTag };
}
