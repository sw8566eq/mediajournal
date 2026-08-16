import { describe, it, expect, vi, afterEach } from 'vitest';
import { openLibraryProvider } from './openLibrary';

function mockFetchOnce(body: unknown, ok = true, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: () => Promise.resolve(body),
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('openLibraryProvider.search', () => {
  it('normalizes a doc into an ExternalSearchResult', async () => {
    mockFetchOnce({
      docs: [
        {
          key: '/works/OL123W',
          title: 'Dune',
          author_name: ['Frank Herbert'],
          first_publish_year: 1965,
          cover_i: 456,
        },
      ],
    });

    const results = await openLibraryProvider.search('dune');

    expect(results).toEqual([
      {
        externalId: '/works/OL123W',
        title: 'Dune',
        year: 1965,
        subtitle: 'Frank Herbert',
        genre: null,
        coverImageUrl: 'https://covers.openlibrary.org/b/id/456-M.jpg',
      },
    ]);
  });

  it('falls back to null for missing optional fields', async () => {
    mockFetchOnce({ docs: [{ key: '/works/OL999W', title: 'Untitled Work' }] });

    const results = await openLibraryProvider.search('untitled');

    expect(results[0]).toEqual({
      externalId: '/works/OL999W',
      title: 'Untitled Work',
      year: null,
      subtitle: null,
      genre: null,
      coverImageUrl: null,
    });
  });

  it('returns an empty array when there are no matches', async () => {
    mockFetchOnce({ docs: [] });
    expect(await openLibraryProvider.search('zzz-no-such-book')).toEqual([]);
  });

  it('throws when the response is not ok', async () => {
    mockFetchOnce({}, false, 503);
    await expect(openLibraryProvider.search('dune')).rejects.toThrow(/503/);
  });

  it('sends the query as a search param on the Open Library search endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ docs: [] }) });
    vi.stubGlobal('fetch', fetchMock);

    await openLibraryProvider.search('dune messiah');

    const calledUrl = fetchMock.mock.calls[0][0] as URL;
    expect(calledUrl.origin + calledUrl.pathname).toBe('https://openlibrary.org/search.json');
    expect(calledUrl.searchParams.get('q')).toBe('dune messiah');
  });
});
