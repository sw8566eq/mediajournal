import type { ExternalSearchResult } from '@shared/types';

/** One external media database integration (TMDB, Open Library, RAWG, MusicBrainz, ...). */
export interface ExternalProvider {
  search(query: string): Promise<ExternalSearchResult[]>;
}
