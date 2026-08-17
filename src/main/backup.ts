import { z } from 'zod';
import type { MediaType, Tag } from '@shared/types';
import { MEDIA_TYPES } from '@shared/types';
import type { ExportFileSchema } from '@shared/validation';
import { getDb } from './db/connection';
import { movieRepo } from './db/repositories/movies';
import { tvShowRepo } from './db/repositories/tvShows';
import { bookRepo } from './db/repositories/books';
import { albumRepo } from './db/repositories/albums';
import { gameRepo } from './db/repositories/games';
import { tagRepo } from './db/repositories/tags';
import type { MediaRepository } from './db/repositories/mediaRepository';

const REPOS: { [T in MediaType]: MediaRepository<T> } = {
  movie: movieRepo,
  tv: tvShowRepo,
  book: bookRepo,
  album: albumRepo,
  game: gameRepo,
};

function latestSchemaVersion(): number {
  const row = getDb().prepare('SELECT MAX(version) as v FROM schema_migrations').get() as { v: number | null };
  return row.v ?? 0;
}

/** Builds the full export payload: every entry across all 5 media types (metadata only, no cover art), plus every tag. */
export function buildExportData() {
  const entries: Record<MediaType, unknown[]> = { movie: [], tv: [], book: [], album: [], game: [] };

  for (const mediaType of MEDIA_TYPES) {
    const rows = REPOS[mediaType].list({}) as (Record<string, unknown> & { tags: Tag[] })[];
    entries[mediaType] = rows.map((row) => {
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, coverPath: _coverPath, tags, ...rest } = row;
      return { ...rest, tags: tags.map((t) => t.name) };
    });
  }

  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: latestSchemaVersion(),
    tags: tagRepo.list().map((t) => t.name),
    entries,
  };
}

/**
 * Merges a validated export file into the local library: always inserts new rows, never deletes or
 * overwrites existing data. Tags are matched/created by name.
 *
 * The whole merge runs as one transaction rather than one commit per tag/entry (each
 * REPOS[mediaType].create() call already opens its own inner transaction - better-sqlite3 nests
 * these as SAVEPOINTs automatically, so wrapping the outer loop doesn't change what any individual
 * create() does, just how many times the WAL actually commits). This also makes the whole import
 * atomic: since every entry passed here has already been validated (by ExportFileSchema.parse() on
 * the JSON path, or by each CSV parser's own .safeParse() on the Goodreads/Letterboxd path) before
 * this function is ever called, a failure partway through is expected to be rare - but if one does
 * happen, the previous behavior would silently leave whatever imported so far in place with no
 * indication which rows made it and which didn't. Rolling back the whole batch instead keeps the
 * "strictly additive" guarantee clean: either the import fully succeeds, or the library is left
 * exactly as it was.
 */
export function importLibraryData(data: z.infer<typeof ExportFileSchema>): Record<MediaType, number> & { tags: number } {
  return getDb().transaction(() => {
    const summary = { movie: 0, tv: 0, book: 0, album: 0, game: 0, tags: 0 };

    const tagIdByName = new Map<string, number>();
    function resolveTagId(name: string): number {
      const key = name.toLowerCase();
      const existing = tagIdByName.get(key);
      if (existing !== undefined) return existing;
      const tag = tagRepo.create(name); // find-or-create, case-insensitive
      tagIdByName.set(key, tag.id);
      return tag.id;
    }

    for (const name of data.tags) {
      resolveTagId(name);
      summary.tags++;
    }

    for (const mediaType of MEDIA_TYPES) {
      for (const entry of data.entries[mediaType]) {
        const { tags: tagNames, ...fields } = entry as { tags: string[] } & Record<string, unknown>;
        const tagIds = tagNames.map(resolveTagId);
        REPOS[mediaType].create({ ...fields, coverPath: null, tagIds } as never);
        summary[mediaType]++;
      }
    }

    return summary;
  })();
}
