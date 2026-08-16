import { useState } from 'react';
import type { EntryFilters, EntryStatus, FilterPreset, MediaType, Tag } from '@shared/types';
import { MEDIA_TYPE_LABELS, MEDIA_TYPE_ORDER, STATUS_LABELS } from '../../mediaTypeConfig';
import { ContextMenu } from '../common/ContextMenu';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { TextPromptDialog } from '../common/TextPromptDialog';

interface Props {
  filters: EntryFilters;
  onChange: (filters: EntryFilters) => void;
  availableGenres: string[];
  availableTags: Tag[];
  /** Omit to hide the "+ Add Entry" button - e.g. the combined "All" view, where there's no single type to create. */
  onAddClick?: () => void;
  /** Only passed by the "All" view: which media types to include in the combined list. */
  mediaTypeFilter?: { activeTypes: MediaType[]; onToggle: (type: MediaType) => void };
  /** Omit to hide the saved-presets controls entirely. */
  presets?: {
    items: FilterPreset[];
    onLoad: (preset: FilterPreset) => void;
    onSaveClick: () => void;
    onDelete: (id: number) => void;
  };
  /** Deletes a tag globally (from every entry that has it, across all media types) - the tag chips
   *  here are the one place the app shows every tag regardless of whether any *currently loaded*
   *  entry has it (availableTags is the full shared tag list, unlike availableGenres which is
   *  derived from the current results), so it's the only reachable place to clean up an orphaned
   *  tag that isn't assigned to anything. */
  onDeleteTag: (id: number) => void;
  /** Renames a tag globally. Unlike delete, this can't cause a foreign-key violation on an entry
   *  currently being edited elsewhere (the tag id is unchanged, just its name), so it doesn't need
   *  the same "only reachable from here" reasoning - it's just kept alongside delete on the same
   *  right-click menu for now, since that's already a proven, discoverable surface. */
  onRenameTag: (id: number, name: string) => Promise<void>;
}

const STATUS_VALUES = Object.keys(STATUS_LABELS) as EntryStatus[];

export function FilterSortBar({
  filters,
  onChange,
  availableGenres,
  availableTags,
  onAddClick,
  mediaTypeFilter,
  presets,
  onDeleteTag,
  onRenameTag,
}: Props) {
  // Local, UI-only: which preset the dropdown is currently showing as selected. Not derived from
  // `filters` since a preset is a one-shot loader, not a persistent link - editing any filter
  // afterward organically detaches from it without this needing to track that.
  const [selectedPresetId, setSelectedPresetId] = useState<number | ''>('');

  const [tagMenu, setTagMenu] = useState<{ x: number; y: number; id: number; name: string } | null>(null);
  const [pendingTagDelete, setPendingTagDelete] = useState<{ id: number; name: string } | null>(null);
  const [pendingTagRename, setPendingTagRename] = useState<{ id: number; name: string } | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);

  function confirmTagDelete() {
    if (!pendingTagDelete) return;
    onDeleteTag(pendingTagDelete.id);
    // Drop it from the active filter too, if it was selected - it'd otherwise keep filtering on a
    // tag id that no longer exists (harmless - just yields zero rows - but stale and confusing).
    if (filters.tagIds?.includes(pendingTagDelete.id)) {
      const next = filters.tagIds.filter((id) => id !== pendingTagDelete.id);
      onChange({ ...filters, tagIds: next.length ? next : undefined });
    }
    setPendingTagDelete(null);
  }

  async function submitTagRename(name: string) {
    if (!pendingTagRename) return;
    try {
      await onRenameTag(pendingTagRename.id, name);
      setPendingTagRename(null);
      setRenameError(null);
    } catch (err) {
      // Most likely tags.name's UNIQUE COLLATE NOCASE constraint (renaming to a name that
      // collides, case-insensitively, with a different existing tag) - keep the dialog open with
      // the error shown rather than closing it as if the rename had actually happened.
      setRenameError(err instanceof Error ? err.message : String(err));
    }
  }

  // Exclusive: an entry can only actually have one status, so clicking a chip selects just that
  // one (clicking the already-active one clears the filter back to "any status").
  function selectStatus(status: EntryStatus) {
    const isActive = filters.status?.[0] === status;
    onChange({ ...filters, status: isActive ? undefined : [status] });
  }

  function toggleTag(id: number) {
    const current = filters.tagIds ?? [];
    const next = current.includes(id) ? current.filter((t) => t !== id) : [...current, id];
    onChange({ ...filters, tagIds: next.length ? next : undefined });
  }

  // availableGenres is derived from the currently-filtered results, so it can lose the active
  // selection entirely once another filter narrows the list to nothing of that genre - keep the
  // selected value visible (and explicitly clearable) instead of it silently vanishing from its
  // own dropdown while still being applied.
  const genreOptions =
    filters.genre && !availableGenres.includes(filters.genre) ? [...availableGenres, filters.genre].sort() : availableGenres;

  return (
    <div className="filter-bar">
      <input
        type="text"
        className="search-input"
        placeholder="Search title & notes…"
        value={filters.search ?? ''}
        onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
      />

      {mediaTypeFilter && (
        <div className="filter-group">
          {MEDIA_TYPE_ORDER.map((type) => (
            <button
              key={type}
              type="button"
              className={mediaTypeFilter.activeTypes.includes(type) ? 'chip active' : 'chip'}
              onClick={() => mediaTypeFilter.onToggle(type)}
            >
              {MEDIA_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      )}

      <div className="filter-group">
        {STATUS_VALUES.map((status) => (
          <button
            key={status}
            type="button"
            className={filters.status?.[0] === status ? 'chip active' : 'chip'}
            onClick={() => selectStatus(status)}
          >
            {STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      <select value={filters.genre ?? ''} onChange={(e) => onChange({ ...filters, genre: e.target.value || undefined })}>
        <option value="">All genres</option>
        {genreOptions.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>

      {availableTags.length > 0 && (
        <div className="filter-group">
          {availableTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              className={(filters.tagIds ?? []).includes(tag.id) ? 'chip active' : 'chip'}
              onClick={() => toggleTag(tag.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setTagMenu({ x: e.clientX, y: e.clientY, id: tag.id, name: tag.name });
              }}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      <div className="filter-group rating-range">
        <input
          type="number"
          className="rating-bound"
          placeholder="Min"
          min={0}
          max={10}
          step={0.1}
          value={filters.ratingMin !== undefined ? filters.ratingMin / 10 : ''}
          onChange={(e) =>
            onChange({ ...filters, ratingMin: e.target.value ? Math.round(Number(e.target.value) * 10) : undefined })
          }
        />
        <span>–</span>
        <input
          type="number"
          className="rating-bound"
          placeholder="Max"
          min={0}
          max={10}
          step={0.1}
          value={filters.ratingMax !== undefined ? filters.ratingMax / 10 : ''}
          onChange={(e) =>
            onChange({ ...filters, ratingMax: e.target.value ? Math.round(Number(e.target.value) * 10) : undefined })
          }
        />
      </div>

      <div className="filter-group year-range">
        <input
          type="number"
          className="rating-bound"
          placeholder="Year min"
          value={filters.yearMin ?? ''}
          onChange={(e) => onChange({ ...filters, yearMin: e.target.value ? Number(e.target.value) : undefined })}
        />
        <span>–</span>
        <input
          type="number"
          className="rating-bound"
          placeholder="Year max"
          value={filters.yearMax ?? ''}
          onChange={(e) => onChange({ ...filters, yearMax: e.target.value ? Number(e.target.value) : undefined })}
        />
      </div>

      <select
        value={filters.sortBy ?? 'title'}
        onChange={(e) => onChange({ ...filters, sortBy: e.target.value as EntryFilters['sortBy'] })}
      >
        <option value="title">Sort: Title</option>
        <option value="year">Sort: Year</option>
        <option value="rating">Sort: Rating</option>
        <option value="status">Sort: Status</option>
        <option value="createdAt">Sort: Date Added</option>
      </select>
      <button
        type="button"
        className="sort-dir"
        title="Toggle sort direction"
        onClick={() => onChange({ ...filters, sortDir: filters.sortDir === 'desc' ? 'asc' : 'desc' })}
      >
        {filters.sortDir === 'desc' ? '↓' : '↑'}
      </button>

      {presets && (
        <div className="filter-group presets-group">
          <select
            value={selectedPresetId}
            onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : '';
              setSelectedPresetId(id);
              if (id !== '') {
                const preset = presets.items.find((p) => p.id === id);
                if (preset) presets.onLoad(preset);
              }
            }}
          >
            <option value="">Load preset…</option>
            {presets.items.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
          {selectedPresetId !== '' && (
            <button
              type="button"
              className="sort-dir"
              title="Delete this preset"
              onClick={() => {
                presets.onDelete(selectedPresetId);
                setSelectedPresetId('');
              }}
            >
              🗑
            </button>
          )}
          <button type="button" onClick={presets.onSaveClick}>
            Save preset…
          </button>
        </div>
      )}

      {onAddClick && (
        <button type="button" className="primary add-entry-btn" onClick={onAddClick}>
          + Add Entry
        </button>
      )}

      {tagMenu && (
        <ContextMenu
          x={tagMenu.x}
          y={tagMenu.y}
          onClose={() => setTagMenu(null)}
          items={[
            {
              label: 'Rename Tag',
              onClick: () => {
                setRenameError(null);
                setPendingTagRename({ id: tagMenu.id, name: tagMenu.name });
              },
            },
            {
              label: 'Delete Tag',
              danger: true,
              onClick: () => setPendingTagDelete({ id: tagMenu.id, name: tagMenu.name }),
            },
          ]}
        />
      )}
      <ConfirmDialog
        open={pendingTagDelete !== null}
        message={`Delete tag "${pendingTagDelete?.name}"? This removes it from every entry that has it.`}
        onConfirm={confirmTagDelete}
        onCancel={() => setPendingTagDelete(null)}
      />
      <TextPromptDialog
        open={pendingTagRename !== null}
        title={`Rename tag "${pendingTagRename?.name}"`}
        initialValue={pendingTagRename?.name ?? ''}
        submitLabel="Rename"
        error={renameError}
        onSave={submitTagRename}
        onCancel={() => {
          setPendingTagRename(null);
          setRenameError(null);
        }}
      />
    </div>
  );
}
