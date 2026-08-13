import { z } from 'zod';
import { ENTRY_STATUSES, type MediaType } from './types';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
  .nullable();

const title = z.string().trim().min(1, 'Title is required').max(500);
const genre = z.string().trim().max(200).nullable();
const ratingTenths = z.number().int().min(0).max(100).nullable();
const status = z.enum(ENTRY_STATUSES);
const notes = z.string().max(20000).nullable();
const externalId = z.string().max(200).nullable();
const coverPath = z.string().max(1000).nullable();
const tagIds = z.array(z.number().int().positive()).default([]);
const year = z.number().int().min(0).max(3000).nullable();

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
  director: z.string().trim().max(300).nullable(),
  year,
  runtimeMin: z.number().int().min(0).max(10000).nullable(),
});

export const TvShowCreateSchema = z.object({
  ...baseFields,
  creator: z.string().trim().max(300).nullable(),
  year,
  seasonsWatched: z.number().int().min(0).max(1000).nullable(),
});

export const BookCreateSchema = z.object({
  ...baseFields,
  author: z.string().trim().max(300).nullable(),
  year,
  pages: z.number().int().min(0).max(100000).nullable(),
});

export const AlbumCreateSchema = z.object({
  ...baseFields,
  artist: z.string().trim().max(300).nullable(),
  year,
});

export const GameCreateSchema = z.object({
  ...baseFields,
  developer: z.string().trim().max(300).nullable(),
  platform: z.string().trim().max(200).nullable(),
  year,
  hoursPlayed: z.number().min(0).max(100000).nullable(),
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
