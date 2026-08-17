import { useEffect, useMemo, useState } from 'react';
import type { EntryFilters, FilterPreset, MediaType, NewFilterPreset, Tag } from '@shared/types';
import { MEDIA_TYPE_ORDER } from '../../mediaTypeConfig';
import { api } from '../../api/client';
import { compareEntries } from '../../sortEntries';
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
  const [activeTypes, setActiveTypes] = useState<MediaType[]>(MEDIA_TYPE_ORDER);
  const [entries, setEntries] = useState<CombinedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; mediaType: MediaType; id: number } | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkTagDialogOpen, setBulkTagDialogOpen] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

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

  // A changed filter/type-tab query, or a refetch (refreshKey - e.g. an entry deleted via its own
  // right-click menu while still checked), can drop previously-selected entries out of the visible
  // list entirely - clearing selection here rather than trying to reconcile it against new
  // results. Without refreshKey in the deps, the selected-count badge went stale after an
  // out-of-band delete (selectedRefs() already re-filters against fresh entries before any bulk
  // action runs, so this was cosmetic here, unlike the equivalent LibraryView gap).
  useEffect(() => {
    setSelected(new Set());
  }, [activeTypesKey, filtersKey, refreshKey]);

  function toggleType(type: MediaType) {
    setActiveTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  function toggleSelect(mediaType: MediaType, id: number) {
    const key = selectionKey(mediaType, id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Selection only ever stores composite keys, not {mediaType,id} pairs directly, so bulk actions
  // resolve each selected key back against the currently-loaded `entries` to recover both parts.
  function selectedRefs(): EntryRef[] {
    return entries.filter((e) => selected.has(selectionKey(e.mediaType, e.id))).map((e) => ({ mediaType: e.mediaType, id: e.id }));
  }

  async function handleBulkDelete() {
    const items = selectedRefs();
    const result = await onBulkDelete(items);
    setSelected(new Set());
    setBulkError(result.failed > 0 ? `${result.failed} of ${items.length} deletions failed.` : null);
  }

  async function handleBulkAddTag(tagIds: number[]) {
    const items = selectedRefs();
    const result = await onBulkAddTag(items, tagIds);
    setBulkTagDialogOpen(false);
    setSelected(new Set());
    setBulkError(result.failed > 0 ? `${result.failed} of ${items.length} tag updates failed.` : null);
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
        count={selected.size}
        onClear={() => setSelected(new Set())}
        onDelete={handleBulkDelete}
        onAddTagClick={() => setBulkTagDialogOpen(true)}
      />
      <BulkTagDialog
        open={bulkTagDialogOpen}
        allTags={allTags}
        onCreateTag={onCreateTag}
        onApply={handleBulkAddTag}
        onCancel={() => setBulkTagDialogOpen(false)}
      />
      {bulkError && <div className="error-banner">{bulkError}</div>}
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
            selected={selected.has(selectionKey(entry.mediaType, entry.id))}
            onToggleSelect={() => toggleSelect(entry.mediaType, entry.id)}
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
