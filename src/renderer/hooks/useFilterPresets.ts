import { useCallback } from 'react';
import type { FilterPreset, NewFilterPreset } from '@shared/types';
import { api } from '../api/client';
import { useListResource } from './useListResource';

export function useFilterPresets() {
  const { items: presets, loading, refetch } = useListResource<FilterPreset>(api.filterPresets.list);

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
