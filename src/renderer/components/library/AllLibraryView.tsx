import { useMemo, useState } from 'react';
import type { EntryFilters, FilterPreset, MediaType, NewFilterPreset, Tag } from '@shared/types';
import { MEDIA_TYPE_ORDER } from '../../mediaTypeConfig';
import { compareEntries } from '../../sortEntries';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import { useActiveMediaTypes } from '../../hooks/useActiveMediaTypes';
import { useMultiTypeEntries } from '../../hooks/useMultiTypeEntries';
import type { BulkResult, EntryRef } from '../../entryActions';
import { ContextMenu } from '../common/ContextMenu';
import { EntryCard } from './EntryCard';
import { FilterSortBar } from './FilterSortBar';
import { SavePresetDialog } from './SavePresetDialog';
import { BulkActionBar } from './BulkActionBar';
import { BulkTagDialog } from './BulkTagDialog';

interface Props {
  allTags: Tag[];
  onSelectEntry: (mediaType: MediaType, id: number) => void;
  onEditEntry: (mediaType: MediaType, id: number) => void;
  onDeleteEntry: (mediaType: MediaType, id: number) => void;
  /** Bumped by the parent after a save/delete elsewhere so this view refetches. */
  refreshKey: number;
  presets: FilterPreset[];
  onSavePreset: (data: NewFilterPreset) => void;
  onDeletePreset: (id: number) => void;
  onDeleteTag: (id: number) => void;
  onRenameTag: (id: number, name: string) => Promise<void>;
  onCreateTag: (name: string) => Promise<Tag>;
  onBulkDelete: (items: EntryRef[]) => Promise<BulkResult>;
  onBulkAddTag: (items: EntryRef[], tagIds: number[]) => Promise<BulkResult>;
}

type CombinedEntry = Record<string, unknown> & { id: number; mediaType: MediaType };

/** A `${mediaType}-${id}` composite key - matches EntryCard's own `key` prop in this view, since a
 *  plain numeric id set (as LibraryView uses) would collide across different media types sharing
 *  the same autoincrement id. */
function selectionKey(mediaType: MediaType, id: number): string {
  return `${mediaType}-${id}`;
}

/** Combined list spanning all 5 media types at once. Fetches each type's own list() in parallel
 *  and merges client-side - simplest approach that reuses every existing per-type API/filter/sort
 *  path unchanged, appropriate at the scale a personal local library actually reaches. */
export function AllLibraryView({
  allTags,
  onSelectEntry,
  onEditEntry,
  onDeleteEntry,
  refreshKey,
  presets,
  onSavePreset,
  onDeletePreset,
  onDeleteTag,
  onRenameTag,
  onCreateTag,
  onBulkDelete,
  onBulkAddTag,
}: Props) {
  const [filters, setFilters] = useState<EntryFilters>({ sortBy: 'title', sortDir: 'asc' });
  const { activeTypes, setActiveTypes, toggleType } = useActiveMediaTypes();
  const [menu, setMenu] = useState<{ x: number; y: number; mediaType: MediaType; id: number } | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const activeTypesKey = activeTypes.slice().sort().join(',');
  const filtersKey = JSON.stringify(filters);
  const bulk = useBulkSelection<string>([activeTypesKey, filtersKey, refreshKey]);

  const { entries: unsorted, loading, error } = useMultiTypeEntries<CombinedEntry>(activeTypes, filters, [refreshKey]);
  // Sorting stays here rather than inside the generic hook - it's specific to this view's own
  // filters.sortBy/sortDir, which useMultiTypeEntries has no reason to know about (StatsView, the
  // hook's other caller, doesn't sort at all).
  const entries = useMemo(
    () => [...unsorted].sort(compareEntries(filters.sortBy, filters.sortDir)),
    [unsorted, filters.sortBy, filters.sortDir],
  );

  // Selection only ever stores composite keys, not {mediaType,id} pairs directly, so bulk actions
  // resolve each selected key back against the currently-loaded `entries` to recover both parts.
  function toEntryRefs(): EntryRef[] {
    return entries.filter((e) => bulk.selected.has(selectionKey(e.mediaType, e.id))).map((e) => ({ mediaType: e.mediaType, id: e.id }));
  }

  function handleBulkDelete() {
    return bulk.runBulkDelete(toEntryRefs(), onBulkDelete);
  }

  function handleBulkAddTag(tagIds: number[]) {
    return bulk.runBulkAddTag(toEntryRefs(), tagIds, onBulkAddTag);
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
        presets={{
          items: presets,
          onLoad: (preset) => {
            setFilters(preset.filters);
            setActiveTypes(preset.activeTypes ?? MEDIA_TYPE_ORDER);
          },
          onSaveClick: () => setSaveDialogOpen(true),
          onDelete: onDeletePreset,
        }}
        onDeleteTag={onDeleteTag}
        onRenameTag={onRenameTag}
      />
      <SavePresetDialog
        open={saveDialogOpen}
        onCancel={() => setSaveDialogOpen(false)}
        onSave={(name) => {
          onSavePreset({ name, filters, activeTypes });
          setSaveDialogOpen(false);
        }}
      />
      <BulkActionBar
        count={bulk.selected.size}
        onClear={bulk.clear}
        onDelete={handleBulkDelete}
        onAddTagClick={bulk.openBulkTagDialog}
      />
      <BulkTagDialog
        open={bulk.bulkTagDialogOpen}
        allTags={allTags}
        onCreateTag={onCreateTag}
        onApply={handleBulkAddTag}
        onCancel={bulk.closeBulkTagDialog}
      />
      {bulk.bulkError && <div className="error-banner">{bulk.bulkError}</div>}
      {loading && <div className="status-line">Loading…</div>}
      {error && <div className="error-banner">{error}</div>}
      {!loading && !error && entries.length === 0 && (
        <div className="empty-state">No entries match these filters.</div>
      )}
      <div className="entry-grid">
        {entries.map((entry) => (
          <EntryCard
            key={selectionKey(entry.mediaType, entry.id)}
            mediaType={entry.mediaType}
            entry={entry}
            onClick={() => onSelectEntry(entry.mediaType, entry.id)}
            onContextMenu={(evt) => setMenu({ x: evt.clientX, y: evt.clientY, mediaType: entry.mediaType, id: entry.id })}
            showTypeBadge
            selected={bulk.selected.has(selectionKey(entry.mediaType, entry.id))}
            onToggleSelect={() => bulk.toggle(selectionKey(entry.mediaType, entry.id))}
          />
        ))}
      </div>
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[
            { label: 'Edit', onClick: () => onEditEntry(menu.mediaType, menu.id) },
            { label: 'Delete', danger: true, onClick: () => onDeleteEntry(menu.mediaType, menu.id) },
          ]}
        />
      )}
    </div>
  );
}
