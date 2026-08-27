import { z } from 'zod';
import type { MediaType, Tag } from '@shared/types';
import { MEDIA_TYPES } from '@shared/types';
import type { ExportFileSchema, FullExportFileSchema } from '@shared/validation';
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

/** Shared row-mapping loop behind both buildExportData (strips coverPath - metadata only) and
 *  buildFullExportData (keeps it, for the zip backup that bundles the actual cover files - see
 *  backupHandlers.ts). Kept as one function so the two never drift on anything but that one field. */
function buildEntriesByType(includeCoverPath: boolean): Record<MediaType, unknown[]> {
  const entries: Record<MediaType, unknown[]> = { movie: [], tv: [], book: [], album: [], game: [] };

  for (const mediaType of MEDIA_TYPES) {
    const rows = REPOS[mediaType].list({}) as (Record<string, unknown> & { tags: Tag[]; coverPath: string | null })[];
    entries[mediaType] = rows.map((row) => {
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, coverPath, tags, ...rest } = row;
      return { ...rest, ...(includeCoverPath ? { coverPath } : {}), tags: tags.map((t) => t.name) };
    });
  }

  return entries;
}

/** Builds the full export payload: every entry across all 5 media types (metadata only, no cover art), plus every tag. */
export function buildExportData() {
  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: latestSchemaVersion(),
    tags: tagRepo.list().map((t) => t.name),
    entries: buildEntriesByType(false),
  };
}

/** Same as buildExportData, but keeps each entry's coverPath - only meaningful when the caller
 *  (backupHandlers.ts's exportFull handler) is also bundling the actual cover image files
 *  alongside this JSON, e.g. inside a zip. On its own, a bare coverPath string is just a filename
 *  that means nothing without the image behind it. */
export function buildFullExportData() {
  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: latestSchemaVersion(),
    tags: tagRepo.list().map((t) => t.name),
    entries: buildEntriesByType(true),
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
 *
 * `resolveCoverPath` decides what each imported entry's coverPath ends up as: importLibraryData
 * (below) always passes null - the plain JSON path is metadata-only, so a bare filename with no
 * image behind it would just be a dangling reference. importFullLibraryData passes a lookup into a
 * caller-built old-filename -> newly-restored-local-filename map instead. Pulled out as one shared
 * core so the transaction/tag-resolution logic - the part with actual subtlety - can't drift
 * between the two import paths; only that one field's handling differs.
 */
function importEntries(
  data: {
    tags: string[];
    entries: Record<MediaType, (Record<string, unknown> & { tags: string[] })[]>;
  },
  resolveCoverPath: (rawCoverPath: unknown) => string | null,
): Record<MediaType, number> & { tags: number } {
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
        const { tags: tagNames, coverPath, ...fields } = entry as { tags: string[]; coverPath?: unknown } & Record<string, unknown>;
        const tagIds = tagNames.map(resolveTagId);
        REPOS[mediaType].create({ ...fields, coverPath: resolveCoverPath(coverPath), tagIds } as never);
        summary[mediaType]++;
      }
    }

    return summary;
  })();
}

export function importLibraryData(data: z.infer<typeof ExportFileSchema>): Record<MediaType, number> & { tags: number } {
  return importEntries(data, () => null);
}

/** importLibraryData's counterpart for a full (with-covers) backup zip - see backupHandlers.ts's
 *  importFull handler, which extracts each referenced cover's bytes into a fresh local file first
 *  and passes the resulting old->new filename map here. */
export function importFullLibraryData(
  data: z.infer<typeof FullExportFileSchema>,
  coverFileMap: Map<string, string>,
): Record<MediaType, number> & { tags: number } {
  return importEntries(data, (raw) => (typeof raw === 'string' ? (coverFileMap.get(raw) ?? null) : null));
}
