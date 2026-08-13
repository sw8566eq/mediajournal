import type { ExternalSearchResult } from '@shared/types';
import type { ExternalProvider } from './types';

const USER_AGENT = 'MediaJournal/1.0 (personal desktop app; https://github.com/sw8566eq/mediajournal)';

interface MusicBrainzArtistCredit {
  name: string;
}

interface MusicBrainzReleaseGroup {
  id: string;
  title: string;
  'first-release-date'?: string;
  'artist-credit'?: MusicBrainzArtistCredit[];
}

interface MusicBrainzSearchResponse {
  'release-groups': MusicBrainzReleaseGroup[];
}

// MusicBrainz's usage policy caps unauthenticated requests at 1/sec. This throttle is local to
// this module (not the IPC layer) since it's a constraint specific to this one provider.
let lastRequestAt = 0;
const MIN_GAP_MS = 1100; // slight pad over the 1000ms minimum

async function throttle(): Promise<void> {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < MIN_GAP_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_GAP_MS - elapsed));
  }
  lastRequestAt = Date.now();
}

function parseYear(firstReleaseDate: string | undefined): number | null {
  if (!firstReleaseDate) return null;
  const year = parseInt(firstReleaseDate.slice(0, 4), 10);
  return Number.isNaN(year) ? null : year;
}

/**
 * No API key required, but rate-limited to 1 req/sec. Searches release-groups (albums) rather
 * than individual releases, matching this app's "album" media type.
 * https://musicbrainz.org/doc/MusicBrainz_API
 */
export const musicBrainzProvider: ExternalProvider = {
  async search(query: string): Promise<ExternalSearchResult[]> {
    await throttle();

    const url = new URL('https://musicbrainz.org/ws/2/release-group/');
    // Free-text query (best results include both artist and album, e.g. "Miles Davis Kind of
    // Blue") combined with a Lucene filter to exclude singles/EPs/compilations.
    url.searchParams.set('query', `${query} AND primarytype:Album`);
    url.searchParams.set('fmt', 'json');
    url.searchParams.set('limit', '10');

    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) {
      throw new Error(`MusicBrainz search failed (HTTP ${response.status})`);
    }

    const data = (await response.json()) as MusicBrainzSearchResponse;

    return data['release-groups'].map((rg): ExternalSearchResult => ({
      externalId: rg.id,
      title: rg.title,
      year: parseYear(rg['first-release-date']),
      subtitle: rg['artist-credit']?.[0]?.name ?? null,
      // Not returned by this endpoint without an extra per-result lookup, which the 1 req/sec
      // limit makes too expensive to do for every row of a result list.
      genre: null,
      // Constructed optimistically - not every release-group has cover art. The caller's
      // importFromUrl download will simply fail for those, which is handled gracefully.
      coverImageUrl: `https://coverartarchive.org/release-group/${rg.id}/front`,
    }));
  },
};
