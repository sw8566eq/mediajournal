import { useEffect, useMemo, useState } from 'react';
import type { EntryFilters, MediaType, Tag } from '@shared/types';
import { MEDIA_TYPE_ORDER } from '../../mediaTypeConfig';
import { api } from '../../api/client';
import { compareEntries } from '../../sortEntries';
import { EntryCard } from './EntryCard';
import { FilterSortBar } from './FilterSortBar';

interface Props {
  allTags: Tag[];
  onSelectEntry: (mediaType: MediaType, id: number) => void;
  /** Bumped by the parent after a save/delete elsewhere so this view refetches. */
  refreshKey: number;
}

type CombinedEntry = Record<string, unknown> & { id: number; mediaType: MediaType };

/** Combined list spanning all 5 media types at once. Fetches each type's own list() in parallel
 *  and merges client-side - simplest approach that reuses every existing per-type API/filter/sort
 *  path unchanged, appropriate at the scale a personal local library actually reaches. */
export function AllLibraryView({ allTags, onSelectEntry, refreshKey }: Props) {
  const [filters, setFilters] = useState<EntryFilters>({ sortBy: 'title', sortDir: 'asc' });
  const [activeTypes, setActiveTypes] = useState<MediaType[]>(MEDIA_TYPE_ORDER);
  const [entries, setEntries] = useState<CombinedEntry[]>([]);
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
        const merged = perType.flat() as CombinedEntry[];
        merged.sort(compareEntries(filters.sortBy, filters.sortDir));
        setEntries(merged);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTypesKey, filtersKey, refreshKey]);

  function toggleType(type: MediaType) {
    setActiveTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      const genre = e.genre as string | null;
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
        mediaTypeFilter={{ activeTypes, onToggle: toggleType }}
      />
      {loading && <div className="status-line">Loading…</div>}
      {error && <div className="error-banner">{error}</div>}
      {!loading && !error && entries.length === 0 && (
        <div className="empty-state">No entries match these filters.</div>
      )}
      <div className="entry-grid">
        {entries.map((entry) => (
          <EntryCard
            key={`${entry.mediaType}-${entry.id}`}
            mediaType={entry.mediaType}
            entry={entry}
            onClick={() => onSelectEntry(entry.mediaType, entry.id)}
            showTypeBadge
          />
        ))}
      </div>
    </div>
  );
}
