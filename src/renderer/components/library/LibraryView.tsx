import { useEffect, useMemo, useState } from 'react';
import type { EntryFilters, FilterPreset, MediaType, NewFilterPreset, Tag } from '@shared/types';
import { useEntries } from '../../hooks/useEntries';
import type { BulkResult, EntryRef } from '../../entryActions';
import { ContextMenu } from '../common/ContextMenu';
import { EntryCard } from './EntryCard';
import { FilterSortBar } from './FilterSortBar';
import { SavePresetDialog } from './SavePresetDialog';
import { BulkActionBar } from './BulkActionBar';
import { BulkTagDialog } from './BulkTagDialog';

interface Props {
  mediaType: MediaType;
  allTags: Tag[];
  onSelectEntry: (mediaType: MediaType, id: number) => void;
  onEditEntry: (mediaType: MediaType, id: number) => void;
  onDeleteEntry: (mediaType: MediaType, id: number) => void;
  onAddClick: () => void;
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

export function LibraryView({
  mediaType,
  allTags,
  onSelectEntry,
  onEditEntry,
  onDeleteEntry,
  onAddClick,
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
  const { entries, loading, error, refetch } = useEntries(mediaType, filters);
  const [menu, setMenu] = useState<{ x: number; y: number; id: number } | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  // A single-type view, so selection is just a plain id set - AllLibraryView needs a composite
  // key instead, since it mixes types.
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkTagDialogOpen, setBulkTagDialogOpen] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  useEffect(() => {
    if (refreshKey > 0) refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // A changed filter query, or a refetch (refreshKey - e.g. an entry deleted via its own
  // right-click menu while still checked), can drop previously-selected entries out of the
  // visible list entirely - clearing selection here rather than trying to reconcile it against
  // the new results. Without refreshKey in the deps, a selected entry deleted out-of-band left a
  // stale id behind: the bar kept showing it as selected, and a subsequent bulk action would issue
  // a wasted no-op call for it.
  useEffect(() => {
    setSelected(new Set());
  }, [filters, refreshKey]);

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    const items: EntryRef[] = Array.from(selected).map((id) => ({ mediaType, id }));
    const result = await onBulkDelete(items);
    setSelected(new Set());
    setBulkError(result.failed > 0 ? `${result.failed} of ${items.length} deletions failed.` : null);
  }

  async function handleBulkAddTag(tagIds: number[]) {
    const items: EntryRef[] = Array.from(selected).map((id) => ({ mediaType, id }));
    const result = await onBulkAddTag(items, tagIds);
    setBulkTagDialogOpen(false);
    setSelected(new Set());
    setBulkError(result.failed > 0 ? `${result.failed} of ${items.length} tag updates failed.` : null);
  }

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
        presets={{
          items: presets,
          onLoad: (preset) => setFilters(preset.filters),
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
          onSavePreset({ name, filters });
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
              selected={selected.has(id)}
              onToggleSelect={() => toggleSelect(id)}
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
