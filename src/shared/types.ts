// Shared types imported by BOTH the Electron main process and the React renderer.
// Must stay free of Node-only and DOM-only APIs — plain data shapes only.

export const MEDIA_TYPES = ['movie', 'tv', 'book', 'album', 'game'] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

// Status is optional (null = blank = no active status). Most logged entries are things already
// finished, so blank implicitly means finished rather than forcing every entry to declare a
// status. Only 'planned' and 'in_progress' are real values worth tracking/displaying.
export const ENTRY_STATUSES = ['planned', 'in_progress'] as const;
export type EntryStatus = (typeof ENTRY_STATUSES)[number];

export interface Tag {
  id: number;
  name: string;
}

/** Fields every media entry has, regardless of type. */
export interface BaseEntryFields {
  id: number;
  title: string;
  genre: string | null;
  /** Rating stored as integer tenths (0-100) to avoid float rounding. Display as `ratingTenths / 10` e.g. 82 -> "8.2". */
  ratingTenths: number | null;
  /** null = blank/no active status, which implicitly means finished. */
  status: EntryStatus | null;
  /** ISO 8601 date string YYYY-MM-DD, or null */
  startDate: string | null;
  finishDate: string | null;
  notes: string | null;
  /** Reserved for future external API autofill (e.g. TMDB/OpenLibrary id). Unused in v1. */
  externalId: string | null;
  /** Reserved for future cover art caching. Unused in v1. */
  coverPath: string | null;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
}

export interface Movie extends BaseEntryFields {
  director: string | null;
  year: number | null;
  runtimeMin: number | null;
}

export interface TvShow extends BaseEntryFields {
  creator: string | null;
  year: number | null;
  seasonsWatched: number | null;
}

export interface Book extends BaseEntryFields {
  author: string | null;
  year: number | null;
  pages: number | null;
}

export interface Album extends BaseEntryFields {
  artist: string | null;
  year: number | null;
}

export interface Game extends BaseEntryFields {
  developer: string | null;
  platform: string | null;
  year: number | null;
  hoursPlayed: number | null;
}

export interface EntryByType {
  movie: Movie;
  tv: TvShow;
  book: Book;
  album: Album;
  game: Game;
}

/** Shared fields present on every create/update payload, before the type-specific fields are mixed in. */
export type EditableBaseFields = Omit<BaseEntryFields, 'id' | 'createdAt' | 'updatedAt' | 'tags'>;

/** Payload shape for creating/updating an entry of a given media type. `tagIds` replaces the resolved `tags` array. */
export type NewMovie = EditableBaseFields & Pick<Movie, 'director' | 'year' | 'runtimeMin'> & { tagIds: number[] };
export type NewTvShow = EditableBaseFields & Pick<TvShow, 'creator' | 'year' | 'seasonsWatched'> & { tagIds: number[] };
export type NewBook = EditableBaseFields & Pick<Book, 'author' | 'year' | 'pages'> & { tagIds: number[] };
export type NewAlbum = EditableBaseFields & Pick<Album, 'artist' | 'year'> & { tagIds: number[] };
export type NewGame = EditableBaseFields &
  Pick<Game, 'developer' | 'platform' | 'year' | 'hoursPlayed'> & { tagIds: number[] };

export interface EntryInputByType {
  movie: NewMovie;
  tv: NewTvShow;
  book: NewBook;
  album: NewAlbum;
  game: NewGame;
}

export type EntryInput<T extends MediaType> = EntryInputByType[T];
export type EntryUpdate<T extends MediaType> = Partial<EntryInputByType[T]>;

export interface EntryFilters {
  status?: EntryStatus[];
  /** inclusive, in rating tenths (0-100) */
  ratingMin?: number;
  ratingMax?: number;
  genre?: string;
  /** entries must have ALL of these tag ids */
  tagIds?: number[];
  yearMin?: number;
  yearMax?: number;
  /** filters on startDate >= dateFrom */
  dateFrom?: string;
  /** filters on finishDate <= dateTo */
  dateTo?: string;
  /** matched against title and notes (LIKE, case-insensitive) */
  search?: string;
  sortBy?: 'title' | 'year' | 'rating' | 'status' | 'startDate' | 'finishDate' | 'createdAt';
  sortDir?: 'asc' | 'desc';
}

/** The typed API surface exposed on `window.mediaJournalAPI` by the preload script. */
export interface MediaTypeAPI<T extends MediaType> {
  list: (filters?: EntryFilters) => Promise<EntryByType[T][]>;
  get: (id: number) => Promise<EntryByType[T] | null>;
  create: (data: EntryInput<T>) => Promise<EntryByType[T]>;
  update: (id: number, data: EntryUpdate<T>) => Promise<EntryByType[T]>;
  delete: (id: number) => Promise<void>;
}

export interface TagAPI {
  list: () => Promise<Tag[]>;
  create: (name: string) => Promise<Tag>;
  delete: (id: number) => Promise<void>;
}

export interface CoverAPI {
  /** Opens a native file-picker dialog; returns the stored filename, or null if the user canceled. */
  pickFromDisk: () => Promise<string | null>;
  /** Downloads an image from a URL into local storage; returns the stored filename. */
  importFromUrl: (url: string) => Promise<string>;
  /** Best-effort delete of a previously stored cover file. */
  remove: (filename: string) => Promise<void>;
}

export interface MediaJournalAPI {
  movie: MediaTypeAPI<'movie'>;
  tv: MediaTypeAPI<'tv'>;
  book: MediaTypeAPI<'book'>;
  album: MediaTypeAPI<'album'>;
  game: MediaTypeAPI<'game'>;
  tags: TagAPI;
  covers: CoverAPI;
}
