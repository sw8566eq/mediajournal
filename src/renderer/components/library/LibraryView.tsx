import { useEffect, useMemo, useState } from 'react';
import type { EntryFilters, FilterPreset, MediaType, NewFilterPreset, Tag } from '@shared/types';
import { useEntries } from '../../hooks/useEntries';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import type { BulkResult, EntryRef } from '../../entryActions';
import { toErrorMessage } from '../../errorMessage';
import { entriesToCsv } from '../../csvExport';
import { api } from '../../api/client';
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
  const [csvError, setCsvError] = useState<string | null>(null);
  // A single-type view, so selection is just a plain id set - AllLibraryView needs a composite
  // key instead, since it mixes types.
  const bulk = useBulkSelection<number>([filters, refreshKey]);

  // Exports exactly what's currently on screen (respecting the active filters/sort), not the
  // whole unfiltered library - so this doubles as a "save this filtered view" export, not just a
  // full-library dump (that's what Settings > Export Library already covers). Scoped to
  // LibraryView only, not AllLibraryView - see csvExport.ts for why a combined multi-type export
  // has no single clean column layout.
  async function handleExportCsv() {
    setCsvError(null);
    try {
      await api.csvExport.save(mediaType, entriesToCsv(mediaType, entries as unknown as Record<string, unknown>[]));
    } catch (err) {
      setCsvError(toErrorMessage(err));
    }
  }

  useEffect(() => {
    if (refreshKey > 0) refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  function toEntryRefs(): EntryRef[] {
    return Array.from(bulk.selected).map((id) => ({ mediaType, id }));
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
        onExportCsvClick={handleExportCsv}
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
      {csvError && <div className="error-banner">{csvError}</div>}
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
              selected={bulk.selected.has(id)}
              onToggleSelect={() => bulk.toggle(id)}
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
