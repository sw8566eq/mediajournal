// Pure row-grouping logic for `createMediaRepository`'s `tagsForMany()` (the batched tag fetch
// list() uses instead of an N+1 query per row) - split out of mediaRepository.ts into its own
// zero-Electron-dependency file specifically so it's unit testable under plain `vitest run` (host
// Node), same reasoning as `queryBuilder.ts`'s split: mediaRepository.ts transitively imports
// `../connection`, which imports `better-sqlite3` as a value import and crashes immediately under
// plain Node with a NODE_MODULE_VERSION mismatch (Electron's Node ABI, not host Node's) - see
// queryBuilder.ts's own header comment. Keeping this file free of that import is what makes it
// testable at all; the SQL query itself (and the DB round-trip) still can't be, and is instead
// verified ad hoc against a temp SQLite file per CLAUDE.md's documented testing-scope boundary.
import type { Tag } from '@shared/types';

export interface TagJoinRow {
  entryId: number;
  id: number;
  name: string;
}

/**
 * Groups flat `{entryId, id, name}` rows (one per tag-per-entry, as `tagsForMany()`'s single
 * `IN (...)` query returns) into a `Map<entryId, Tag[]>`. The caller's SQL orders the whole result
 * by tag name, not grouped by entry first - grouping a globally-sorted result by entry preserves
 * each group's own relative order (a basic property of filtering a sorted sequence), so per-entry
 * tag arrays come out identically ordered to what a per-entry query with its own `ORDER BY` would
 * have produced. An entry with no tags simply never appears as a key - callers should default to
 * an empty array on lookup miss, not treat a missing key as an error.
 */
export function groupTagsByEntry(rows: TagJoinRow[]): Map<number, Tag[]> {
  const byId = new Map<number, Tag[]>();
  for (const row of rows) {
    const tags = byId.get(row.entryId);
    const tag = { id: row.id, name: row.name };
    if (tags) tags.push(tag);
    else byId.set(row.entryId, [tag]);
  }
  return byId;
}
