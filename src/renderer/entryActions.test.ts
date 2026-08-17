import { describe, it, expect, vi, afterEach } from 'vitest';
import { deleteEntryWithCover, addTagsToEntry } from './entryActions';

// api/client.ts does `export const api = window.mediaJournalAPI` - a one-time snapshot at import
// time - so vi.mock the module directly (vi.hoisted required since the mock factory is hoisted
// above these imports and can't close over a plain outer const), matching the pattern already
// established in GenreManager.test.tsx. vi.mock calls are themselves hoisted above all imports by
// Vitest's transform, so this runs before entryActions.ts's own `import { api } from './api/client'`
// resolves.
const { getMock, deleteMock, updateMock, removeCoverMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  deleteMock: vi.fn(),
  updateMock: vi.fn(),
  removeCoverMock: vi.fn(),
}));

vi.mock('./api/client', () => ({
  api: {
    movie: { get: getMock, delete: deleteMock, update: updateMock },
    covers: { remove: removeCoverMock },
  },
}));

afterEach(() => {
  vi.resetAllMocks();
});

describe('deleteEntryWithCover', () => {
  it('deletes the entry and removes its cover file when one exists', async () => {
    getMock.mockResolvedValue({ id: 1, coverPath: 'abc.jpg' });
    await deleteEntryWithCover('movie', 1);
    expect(deleteMock).toHaveBeenCalledWith(1);
    expect(removeCoverMock).toHaveBeenCalledWith('abc.jpg');
  });

  it('does not attempt to remove a cover when the entry has none', async () => {
    getMock.mockResolvedValue({ id: 1, coverPath: null });
    await deleteEntryWithCover('movie', 1);
    expect(deleteMock).toHaveBeenCalledWith(1);
    expect(removeCoverMock).not.toHaveBeenCalled();
  });

  it('does not throw if the entry is already gone (get returns null)', async () => {
    getMock.mockResolvedValue(null);
    await expect(deleteEntryWithCover('movie', 1)).resolves.toBeUndefined();
    expect(deleteMock).toHaveBeenCalledWith(1);
    expect(removeCoverMock).not.toHaveBeenCalled();
  });
});

describe('addTagsToEntry', () => {
  // The critical regression this guards against: mediaRepository's setTags() (invoked via
  // update()'s tagIds field) is fully *replacing*, not additive - a naive
  // update(id, { tagIds: [tagId] }) would wipe every tag the entry already had.
  it('unions the new tag ids with the existing tag ids, rather than replacing them', async () => {
    getMock.mockResolvedValue({ id: 1, tags: [{ id: 10, name: 'Favorites' }, { id: 20, name: 'Rewatch' }] });
    await addTagsToEntry('movie', 1, [30]);
    expect(updateMock).toHaveBeenCalledWith(1, { tagIds: [10, 20, 30] });
  });

  // The regression this guards against: bulkAddTag used to call a single-tag addTagToEntry once
  // per (entry, tag) pair via Promise.allSettled - concurrent calls against the same entry each
  // read the entry's tags before any of the others wrote back, so whichever write landed last won
  // outright and silently dropped the rest. Batching every tag into one read + one write removes
  // the race entirely: there's only ever one write per entry.
  it('applies multiple new tags to the same entry in a single read-then-write', async () => {
    getMock.mockResolvedValue({ id: 1, tags: [{ id: 10, name: 'Favorites' }] });
    await addTagsToEntry('movie', 1, [20, 30]);
    expect(getMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith(1, { tagIds: [10, 20, 30] });
  });

  it('adds only the tags the entry does not already have, deduping any overlap', async () => {
    getMock.mockResolvedValue({ id: 1, tags: [{ id: 10, name: 'Favorites' }] });
    await addTagsToEntry('movie', 1, [10, 20]);
    expect(updateMock).toHaveBeenCalledWith(1, { tagIds: [10, 20] });
  });

  it('is a no-op when the entry already has every given tag', async () => {
    getMock.mockResolvedValue({ id: 1, tags: [{ id: 10, name: 'Favorites' }, { id: 20, name: 'Rewatch' }] });
    await addTagsToEntry('movie', 1, [10, 20]);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('does nothing if the entry no longer exists', async () => {
    getMock.mockResolvedValue(null);
    await addTagsToEntry('movie', 1, [10]);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('adds the tags to an entry that had no tags at all', async () => {
    getMock.mockResolvedValue({ id: 1, tags: [] });
    await addTagsToEntry('movie', 1, [10, 20]);
    expect(updateMock).toHaveBeenCalledWith(1, { tagIds: [10, 20] });
  });
});
