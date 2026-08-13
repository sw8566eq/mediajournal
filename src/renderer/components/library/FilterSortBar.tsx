import type { EntryFilters, EntryStatus, MediaType, Tag } from '@shared/types';
import { MEDIA_TYPE_LABELS, MEDIA_TYPE_ORDER, STATUS_LABELS } from '../../mediaTypeConfig';

interface Props {
  filters: EntryFilters;
  onChange: (filters: EntryFilters) => void;
  availableGenres: string[];
  availableTags: Tag[];
  /** Omit to hide the "+ Add Entry" button - e.g. the combined "All" view, where there's no single type to create. */
  onAddClick?: () => void;
  /** Only passed by the "All" view: which media types to include in the combined list. */
  mediaTypeFilter?: { activeTypes: MediaType[]; onToggle: (type: MediaType) => void };
}

const STATUS_VALUES = Object.keys(STATUS_LABELS) as EntryStatus[];

export function FilterSortBar({ filters, onChange, availableGenres, availableTags, onAddClick, mediaTypeFilter }: Props) {
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
        {availableGenres.map((g) => (
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

      <select
        value={filters.sortBy ?? 'title'}
        onChange={(e) => onChange({ ...filters, sortBy: e.target.value as EntryFilters['sortBy'] })}
      >
        <option value="title">Sort: Title</option>
        <option value="year">Sort: Year</option>
        <option value="rating">Sort: Rating</option>
        <option value="status">Sort: Status</option>
        <option value="startDate">Sort: Start Date</option>
        <option value="finishDate">Sort: Finish Date</option>
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

      {onAddClick && (
        <button type="button" className="primary add-entry-btn" onClick={onAddClick}>
          + Add Entry
        </button>
      )}
    </div>
  );
}
