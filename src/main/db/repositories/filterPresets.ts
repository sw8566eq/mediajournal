import { getDb } from '../connection';
import type { EntryFilters, FilterPreset, MediaType, NewFilterPreset } from '@shared/types';

interface FilterPresetRow {
  id: number;
  name: string;
  filters: string;
  active_types: string | null;
  created_at: string;
}

function rowToPreset(row: FilterPresetRow): FilterPreset {
  return {
    id: row.id,
    name: row.name,
    filters: JSON.parse(row.filters) as EntryFilters,
    activeTypes: row.active_types ? (JSON.parse(row.active_types) as MediaType[]) : null,
    createdAt: row.created_at,
  };
}

export const filterPresetsRepo = {
  list(): FilterPreset[] {
    const rows = getDb()
      .prepare('SELECT id, name, filters, active_types, created_at FROM filter_presets ORDER BY name COLLATE NOCASE')
      .all() as FilterPresetRow[];
    return rows.map(rowToPreset);
  },

  create(data: NewFilterPreset): FilterPreset {
    const db = getDb();
    const result = db
      .prepare('INSERT INTO filter_presets (name, filters, active_types) VALUES (?, ?, ?)')
      .run(data.name, JSON.stringify(data.filters), data.activeTypes ? JSON.stringify(data.activeTypes) : null);
    const row = db
      .prepare('SELECT id, name, filters, active_types, created_at FROM filter_presets WHERE id = ?')
      .get(result.lastInsertRowid) as FilterPresetRow;
    return rowToPreset(row);
  },

  delete(id: number): void {
    getDb().prepare('DELETE FROM filter_presets WHERE id = ?').run(id);
  },
};
