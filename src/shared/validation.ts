import { z } from 'zod';
import { ENTRY_STATUSES, MEDIA_TYPES, type MediaType } from './types';

// `.nullish()` (not `.nullable()`) everywhere except `title`: these fields are optional, so the
// key may be `null` OR simply absent from the payload (e.g. an untouched type-specific field on
// create). `.nullable()` alone would still reject a missing key, which was the bug here.
const title = z.string().trim().min(1, 'Title is required').max(500);
const genre = z.string().trim().max(200).nullish();
const ratingTenths = z.number().int().min(0).max(100).nullish();
// nullish (not defaulted): blank/unset is a valid, first-class value meaning "no active status".
const status = z.enum(ENTRY_STATUSES).nullish();
const notes = z.string().max(20000).nullish();
const externalId = z.string().max(200).nullish();
const coverPath = z.string().max(1000).nullish();
const tagIds = z.array(z.number().int().positive()).default([]);
const year = z.number().int().min(0).max(3000).nullish();

const baseFields = {
  title,
  genre,
  ratingTenths,
  status,
  notes,
  externalId,
  coverPath,
  tagIds,
};

export const MovieCreateSchema = z.object({
  ...baseFields,
  director: z.string().trim().max(300).nullish(),
  year,
  runtimeMin: z.number().int().min(0).max(10000).nullish(),
});

export const TvShowCreateSchema = z.object({
  ...baseFields,
  creator: z.string().trim().max(300).nullish(),
  year,
  seasonsWatched: z.number().int().min(0).max(1000).nullish(),
});

export const BookCreateSchema = z.object({
  ...baseFields,
  author: z.string().trim().max(300).nullish(),
  year,
  pages: z.number().int().min(0).max(100000).nullish(),
});

export const AlbumCreateSchema = z.object({
  ...baseFields,
  artist: z.string().trim().max(300).nullish(),
  year,
});

export const GameCreateSchema = z.object({
  ...baseFields,
  developer: z.string().trim().max(300).nullish(),
  platform: z.string().trim().max(200).nullish(),
  year,
  hoursPlayed: z.number().min(0).max(100000).nullish(),
});

export const CreateSchemaByType = {
  movie: MovieCreateSchema,
  tv: TvShowCreateSchema,
  book: BookCreateSchema,
  album: AlbumCreateSchema,
  game: GameCreateSchema,
} satisfies Record<MediaType, z.ZodTypeAny>;

export const UpdateSchemaByType = {
  movie: MovieCreateSchema.partial(),
  tv: TvShowCreateSchema.partial(),
  book: BookCreateSchema.partial(),
  album: AlbumCreateSchema.partial(),
  game: GameCreateSchema.partial(),
} satisfies Record<MediaType, z.ZodTypeAny>;

export const EntryFiltersSchema = z.object({
  status: z.array(z.enum(ENTRY_STATUSES)).optional(),
  ratingMin: z.number().int().min(0).max(100).optional(),
  ratingMax: z.number().int().min(0).max(100).optional(),
  genre: z.string().optional(),
  tagIds: z.array(z.number().int().positive()).optional(),
  yearMin: z.number().int().optional(),
  yearMax: z.number().int().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['title', 'year', 'rating', 'status', 'createdAt']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});

export const TagNameSchema = z.string().trim().min(1).max(100);

export const NewFilterPresetSchema = z.object({
  name: z.string().trim().min(1).max(100),
  filters: EntryFiltersSchema,
  activeTypes: z.array(z.enum(MEDIA_TYPES)).nullish(),
});

// max(200) matches the `genre` field's own limit in baseFields above.
export const GenreRenameSchema = z.object({
  oldName: z.string().trim().min(1).max(200),
  newName: z.string().trim().min(1).max(200),
});

export const ExternalSearchQuerySchema = z.object({
  mediaType: z.enum(MEDIA_TYPES),
  query: z.string().trim().min(1).max(300),
});

// Export/import shape: same per-type create schema, but tagIds (only meaningful within the source
// database) is replaced with tag *names* (portable across databases), and coverPath is dropped -
// exports are metadata-only, so an imported entry should never carry a filename reference to an
// image that doesn't exist on the importing machine.
const exportTags = { tags: z.array(z.string()).default([]) };

export const ExportedEntrySchemaByType = {
  movie: MovieCreateSchema.omit({ tagIds: true, coverPath: true }).extend(exportTags),
  tv: TvShowCreateSchema.omit({ tagIds: true, coverPath: true }).extend(exportTags),
  book: BookCreateSchema.omit({ tagIds: true, coverPath: true }).extend(exportTags),
  album: AlbumCreateSchema.omit({ tagIds: true, coverPath: true }).extend(exportTags),
  game: GameCreateSchema.omit({ tagIds: true, coverPath: true }).extend(exportTags),
} satisfies Record<MediaType, z.ZodTypeAny>;

// Row shape a validated CSV import (Goodreads/Letterboxd - see src/main/importers/) produces,
// same as one entry of ExportFileSchema['entries'][type]. Named aliases so the importer modules
// and their tests don't each repeat the z.infer<...> inline.
export type ExportedBookEntry = z.infer<typeof ExportedEntrySchemaByType.book>;
export type ExportedMovieEntry = z.infer<typeof ExportedEntrySchemaByType.movie>;

export const ExportFileSchema = z.object({
  exportedAt: z.string(),
  schemaVersion: z.number().int().optional(),
  tags: z.array(z.string()).default([]),
  entries: z.object({
    movie: z.array(ExportedEntrySchemaByType.movie).default([]),
    tv: z.array(ExportedEntrySchemaByType.tv).default([]),
    book: z.array(ExportedEntrySchemaByType.book).default([]),
    album: z.array(ExportedEntrySchemaByType.album).default([]),
    game: z.array(ExportedEntrySchemaByType.game).default([]),
  }),
});
