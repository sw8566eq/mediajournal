import { useCallback, useEffect, useState } from 'react';
import type { FilterPreset, NewFilterPreset } from '@shared/types';
import { api } from '../api/client';

export function useFilterPresets() {
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    setPresets(await api.filterPresets.list());
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createPreset = useCallback(
    async (data: NewFilterPreset) => {
      const preset = await api.filterPresets.create(data);
      await refetch();
      return preset;
    },
    [refetch],
  );

  const deletePreset = useCallback(
    async (id: number) => {
      await api.filterPresets.delete(id);
      await refetch();
    },
    [refetch],
  );

  return { presets, loading, refetch, createPreset, deletePreset };
}
