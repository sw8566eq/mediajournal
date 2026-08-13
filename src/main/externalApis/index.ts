import type { MediaType } from '@shared/types';
import type { ExternalProvider } from './types';
import { openLibraryProvider } from './openLibrary';
import { musicBrainzProvider } from './musicBrainz';

/**
 * One provider per media type, or null where it isn't wired up yet.
 *
 * TODO: movie/tv (TMDB) and game (RAWG) both need a free API key that hasn't been configured
 * yet - deliberately deferred, not an oversight. Once a key is available, add a provider module
 * next to openLibrary.ts/musicBrainz.ts (same ExternalProvider shape) and plug it in here; no
 * other code needs to change; the IPC handler and renderer already handle the 'not_configured'
 * state generically.
 */
export const PROVIDERS: Record<MediaType, ExternalProvider | null> = {
  movie: null,
  tv: null,
  book: openLibraryProvider,
  album: musicBrainzProvider,
  game: null,
};
