-- Saved filter presets: a user-named snapshot of a filter-bar combination, reloadable later.
-- Global (not scoped per media type) - FilterSortBar is one shared component used by every
-- per-type LibraryView and the combined AllLibraryView, and EntryFilters itself has no
-- media-type-specific fields, so a preset works identically regardless of which view loads it.
--
-- `filters` is a JSON-serialized EntryFilters object (see src/shared/types.ts). It may reference
-- tag ids (via filters.tagIds) that get deleted from `tags` later - that's a harmless dangling
-- reference (filtering by a nonexistent tag id just yields zero rows), not a FK worth enforcing
-- here.
--
-- `active_types` is a JSON array of MediaType, populated only when a preset is saved from the
-- combined "All" view (which has its own activeTypes selection state, separate from
-- EntryFilters); NULL for presets saved from a single-type view, where it's meaningless.
CREATE TABLE filter_presets (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  filters      TEXT NOT NULL,
  active_types TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_filter_presets_name ON filter_presets(name);
