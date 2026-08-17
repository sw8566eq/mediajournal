import { describe, it, expect } from 'vitest';
import { groupTagsByEntry, type TagJoinRow } from './tagGrouping';

describe('groupTagsByEntry', () => {
  it('returns an empty map for no rows', () => {
    expect(groupTagsByEntry([])).toEqual(new Map());
  });

  it('groups a single row under its entryId', () => {
    const rows: TagJoinRow[] = [{ entryId: 1, id: 10, name: 'Sci-Fi' }];
    const result = groupTagsByEntry(rows);
    expect(result.get(1)).toEqual([{ id: 10, name: 'Sci-Fi' }]);
  });

  it('groups multiple tags for the same entry into one array', () => {
    const rows: TagJoinRow[] = [
      { entryId: 1, id: 10, name: 'Comedy' },
      { entryId: 1, id: 11, name: 'Sci-Fi' },
    ];
    const result = groupTagsByEntry(rows);
    expect(result.get(1)).toEqual([
      { id: 10, name: 'Comedy' },
      { id: 11, name: 'Sci-Fi' },
    ]);
  });

  it('keeps different entries in separate groups without leaking tags between them', () => {
    const rows: TagJoinRow[] = [
      { entryId: 1, id: 10, name: 'Comedy' },
      { entryId: 2, id: 11, name: 'Drama' },
      { entryId: 1, id: 12, name: 'Sci-Fi' },
      { entryId: 3, id: 13, name: 'Horror' },
    ];
    const result = groupTagsByEntry(rows);
    expect(result.size).toBe(3);
    expect(result.get(1)).toEqual([
      { id: 10, name: 'Comedy' },
      { id: 12, name: 'Sci-Fi' },
    ]);
    expect(result.get(2)).toEqual([{ id: 11, name: 'Drama' }]);
    expect(result.get(3)).toEqual([{ id: 13, name: 'Horror' }]);
  });

  it('preserves the relative order rows arrive in for a given entry (mirrors ORDER BY t.name in the caller\'s SQL)', () => {
    // Rows interleaved across entries but already globally sorted by name, as the real query
    // produces - each entry's own subsequence should come out in that same relative order.
    const rows: TagJoinRow[] = [
      { entryId: 2, id: 1, name: 'Aaa' },
      { entryId: 1, id: 2, name: 'Bbb' },
      { entryId: 2, id: 3, name: 'Ccc' },
      { entryId: 1, id: 4, name: 'Ddd' },
      { entryId: 2, id: 5, name: 'Eee' },
    ];
    const result = groupTagsByEntry(rows);
    expect(result.get(1)?.map((t) => t.name)).toEqual(['Bbb', 'Ddd']);
    expect(result.get(2)?.map((t) => t.name)).toEqual(['Aaa', 'Ccc', 'Eee']);
  });

  it('does not create an entry for an entryId with no matching rows (absent, not an empty array)', () => {
    const rows: TagJoinRow[] = [{ entryId: 1, id: 10, name: 'Comedy' }];
    const result = groupTagsByEntry(rows);
    expect(result.has(2)).toBe(false);
    expect(result.get(2)).toBeUndefined();
  });

  it('handles a large number of entries and tags without mixing them up', () => {
    const rows: TagJoinRow[] = [];
    for (let entryId = 1; entryId <= 50; entryId++) {
      for (let tagNum = 1; tagNum <= 4; tagNum++) {
        rows.push({ entryId, id: entryId * 100 + tagNum, name: `Tag${tagNum}` });
      }
    }
    const result = groupTagsByEntry(rows);
    expect(result.size).toBe(50);
    expect(result.get(25)).toHaveLength(4);
    expect(result.get(25)?.map((t) => t.id)).toEqual([2501, 2502, 2503, 2504]);
  });
});
