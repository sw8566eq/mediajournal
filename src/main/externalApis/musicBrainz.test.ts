import { describe, it, expect, vi, afterEach } from 'vitest';
import { musicBrainzProvider } from './musicBrainz';

// Real timers, deliberately: musicBrainzProvider.search() throttles to 1 req/sec via module-level
// state shared across every call in this file (see musicBrainz.ts) - each test below may incur a
// real ~1.1s wait if it runs soon after a previous test's request. That's the behavior actually
// being verified (see the dedicated throttle test), so it's faked-timer-hostile: swapping real
// timers out mid-file risks leaving the module's internal throttle promise chain permanently
// pending. A handful of real one-second waits is an acceptable cost for a foundational suite.
function mockFetch(body: unknown, ok = true, status = 200): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue({ ok, status, json: () => Promise.resolve(body) });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('musicBrainzProvider.search', () => {
  it(
    'normalizes results (incl. missing/unparsable fields) and applies the primarytype:Album filter',
    async () => {
      const fetchMock = mockFetch({
        'release-groups': [
          {
            id: 'abc-123',
            title: 'Kind of Blue',
            'first-release-date': '1959-08-17',
            'artist-credit': [{ name: 'Miles Davis' }],
          },
          { id: 'no-date', title: 'No Date' },
          { id: 'bad-date', title: 'Bad Date', 'first-release-date': 'unknown' },
        ],
      });
      vi.stubGlobal('fetch', fetchMock);

      const results = await musicBrainzProvider.search('Miles Davis Kind of Blue');

      expect(results[0]).toEqual({
        externalId: 'abc-123',
        title: 'Kind of Blue',
        year: 1959,
        subtitle: 'Miles Davis',
        genre: null,
        coverImageUrl: 'https://coverartarchive.org/release-group/abc-123/front',
      });
      expect(results[1].year).toBeNull();
      expect(results[1].subtitle).toBeNull();
      expect(results[2].year).toBeNull(); // unparsable first-release-date falls back to null, not NaN

      const calledUrl = fetchMock.mock.calls[0][0] as URL;
      expect(calledUrl.searchParams.get('query')).toBe('Miles Davis Kind of Blue AND primarytype:Album');
    },
    10000,
  );

  it(
    'throws when the response is not ok',
    async () => {
      vi.stubGlobal('fetch', mockFetch({}, false, 500));
      await expect(musicBrainzProvider.search('x')).rejects.toThrow(/500/);
    },
    10000,
  );

  it(
    'throttles two overlapping calls to at least ~1.1s apart',
    async () => {
      const callTimes: number[] = [];
      const fetchMock = vi.fn().mockImplementation(() => {
        callTimes.push(Date.now());
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ 'release-groups': [] }) });
      });
      vi.stubGlobal('fetch', fetchMock);

      await Promise.all([musicBrainzProvider.search('first'), musicBrainzProvider.search('second')]);

      expect(callTimes).toHaveLength(2);
      expect(callTimes[1] - callTimes[0]).toBeGreaterThanOrEqual(1090); // MIN_GAP_MS (1100) minus a small tolerance
    },
    10000,
  );
});
