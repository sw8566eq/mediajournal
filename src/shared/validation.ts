import { z } from 'zod';
import { ENTRY_STATUSES, type MediaType } from './types';

// `.nullish()` (not `.nullable()`) everywhere except `title`: these fields are optional, so the
// key may be `null` OR simply absent from the payload (e.g. an untouched type-specific field on
// create). `.nullable()` alone would still reject a missing key, which was the bug here.
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
  .nullish();

const title = z.string().trim().min(1, 'Title is required').max(500);
const genre = z.string().trim().max(200).nullish();
const ratingTenths = z.number().int().min(0).max(100).nullish();
const status = z.enum(ENTRY_STATUSES).default('planned');
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
  startDate: isoDate,
  finishDate: isoDate,
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
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['title', 'year', 'rating', 'status', 'startDate', 'finishDate', 'createdAt']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});

export const TagNameSchema = z.string().trim().min(1).max(100);
