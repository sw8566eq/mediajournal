import type { EntryStatus, MediaType } from '@shared/types';

export const MEDIA_TYPE_ORDER: MediaType[] = ['movie', 'tv', 'book', 'album', 'game'];

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  movie: 'Movies',
  tv: 'TV Shows',
  book: 'Books',
  album: 'Music',
  game: 'Games',
};

export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number';
  step?: number;
  /** Shown in the always-visible part of the form. Unset/false fields live under "More fields". */
  primary?: boolean;
}

/** Drives both the type-specific form inputs and the detail view, per media type. */
export const TYPE_FIELDS: Record<MediaType, FieldDef[]> = {
  movie: [
    { key: 'director', label: 'Director', type: 'text', primary: true },
    { key: 'year', label: 'Year', type: 'number', primary: true },
    { key: 'runtimeMin', label: 'Runtime (min)', type: 'number' },
  ],
  tv: [
    { key: 'creator', label: 'Creator', type: 'text', primary: true },
    { key: 'year', label: 'Year', type: 'number', primary: true },
    { key: 'seasonsWatched', label: 'Seasons Watched', type: 'number' },
  ],
  book: [
    { key: 'author', label: 'Author', type: 'text', primary: true },
    { key: 'year', label: 'Year', type: 'number', primary: true },
    { key: 'pages', label: 'Pages', type: 'number' },
  ],
  album: [
    { key: 'artist', label: 'Artist', type: 'text', primary: true },
    { key: 'year', label: 'Year', type: 'number', primary: true },
  ],
  game: [
    { key: 'developer', label: 'Developer', type: 'text', primary: true },
    { key: 'year', label: 'Year', type: 'number', primary: true },
    { key: 'platform', label: 'Platform', type: 'text' },
    { key: 'hoursPlayed', label: 'Hours Played', type: 'number', step: 0.1 },
  ],
};

/** The field shown as the byline under the title in library cards, per media type. */
export const PRIMARY_FIELD: Record<MediaType, string> = {
  movie: 'director',
  tv: 'creator',
  book: 'author',
  album: 'artist',
  game: 'developer',
};

export const STATUS_LABELS: Record<EntryStatus, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
};

/** Which external database autofill search hits per media type. Movie/TV/Game aren't wired up yet
 *  (need an API key) but are still named here so the search panel can say what's coming. */
export const EXTERNAL_PROVIDER_LABELS: Record<MediaType, string> = {
  movie: 'TMDB',
  tv: 'TMDB',
  book: 'Open Library',
  album: 'MusicBrainz',
  game: 'RAWG',
};
