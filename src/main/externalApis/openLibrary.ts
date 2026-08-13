import type { ExternalSearchResult } from '@shared/types';
import type { ExternalProvider } from './types';

const USER_AGENT = 'MediaJournal/1.0 (personal desktop app; https://github.com/sw8566eq/mediajournal)';

interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
}

interface OpenLibrarySearchResponse {
  docs: OpenLibraryDoc[];
}

/** No API key required. https://openlibrary.org/dev/docs/api/search */
export const openLibraryProvider: ExternalProvider = {
  async search(query: string): Promise<ExternalSearchResult[]> {
    const url = new URL('https://openlibrary.org/search.json');
    url.searchParams.set('q', query);
    url.searchParams.set('limit', '10');
    url.searchParams.set('fields', 'key,title,author_name,first_publish_year,cover_i');

    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) {
      throw new Error(`Open Library search failed (HTTP ${response.status})`);
    }

    const data = (await response.json()) as OpenLibrarySearchResponse;

    return data.docs.map((doc): ExternalSearchResult => ({
      externalId: doc.key,
      title: doc.title,
      year: doc.first_publish_year ?? null,
      subtitle: doc.author_name?.[0] ?? null,
      // Open Library's search results don't include a reliable genre field (subjects are
      // free-form tags, not genres), so this is intentionally left blank rather than guessed.
      genre: null,
      coverImageUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
    }));
  },
};
