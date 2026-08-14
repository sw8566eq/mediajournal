import { useEffect, useMemo, useState } from 'react';
import type { EntryFilters, MediaType, Tag } from '@shared/types';
import { useEntries } from '../../hooks/useEntries';
import { ContextMenu } from '../common/ContextMenu';
import { EntryCard } from './EntryCard';
import { FilterSortBar } from './FilterSortBar';

interface Props {
  mediaType: MediaType;
  allTags: Tag[];
  onSelectEntry: (mediaType: MediaType, id: number) => void;
  onEditEntry: (mediaType: MediaType, id: number) => void;
  onDeleteEntry: (mediaType: MediaType, id: number) => void;
  onAddClick: () => void;
  /** Bumped by the parent after a save/delete elsewhere so this view refetches. */
  refreshKey: number;
}

export function LibraryView({ mediaType, allTags, onSelectEntry, onEditEntry, onDeleteEntry, onAddClick, refreshKey }: Props) {
  const [filters, setFilters] = useState<EntryFilters>({ sortBy: 'title', sortDir: 'asc' });
  const { entries, loading, error, refetch } = useEntries(mediaType, filters);
  const [menu, setMenu] = useState<{ x: number; y: number; id: number } | null>(null);

  useEffect(() => {
    if (refreshKey > 0) refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      const genre = (e as unknown as Record<string, unknown>).genre as string | null;
      if (genre) set.add(genre);
    }
    return Array.from(set).sort();
  }, [entries]);

  return (
    <div className="library-view">
      <FilterSortBar
        filters={filters}
        onChange={setFilters}
        availableGenres={availableGenres}
        availableTags={allTags}
        onAddClick={onAddClick}
      />
      {loading && <div className="status-line">Loading…</div>}
      {error && <div className="error-banner">{error}</div>}
      {!loading && !error && entries.length === 0 && (
        <div className="empty-state">No entries yet — add your first one.</div>
      )}
      <div className="entry-grid">
        {entries.map((entry) => {
          const e = entry as unknown as Record<string, unknown>;
          const id = e.id as number;
          return (
            <EntryCard
              key={id}
              mediaType={mediaType}
              entry={e}
              onClick={() => onSelectEntry(mediaType, id)}
              onContextMenu={(evt) => setMenu({ x: evt.clientX, y: evt.clientY, id })}
            />
          );
        })}
      </div>
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[
            { label: 'Edit', onClick: () => onEditEntry(mediaType, menu.id) },
            { label: 'Delete', danger: true, onClick: () => onDeleteEntry(mediaType, menu.id) },
          ]}
        />
      )}
    </div>
  );
}
