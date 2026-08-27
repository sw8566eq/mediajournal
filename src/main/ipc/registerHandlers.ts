import { movieRepo } from '../db/repositories/movies';
import { tvShowRepo } from '../db/repositories/tvShows';
import { bookRepo } from '../db/repositories/books';
import { albumRepo } from '../db/repositories/albums';
import { gameRepo } from '../db/repositories/games';
import {
  MovieCreateSchema,
  TvShowCreateSchema,
  BookCreateSchema,
  AlbumCreateSchema,
  GameCreateSchema,
  UpdateSchemaByType,
} from '@shared/validation';
import { registerMediaHandlers } from './mediaHandlers';
import { registerTagHandlers } from './tagHandlers';
import { registerCoverHandlers } from './coverHandlers';
import { registerExternalSearchHandlers } from './externalSearchHandlers';
import { registerBackupHandlers } from './backupHandlers';
import { registerFilterPresetHandlers } from './filterPresetHandlers';
import { registerGenreHandlers } from './genreHandlers';
import { registerImportHandlers } from './importHandlers';
import { registerCsvExportHandlers } from './csvExportHandlers';

/** Registers every IPC handler the renderer relies on. Call once during app startup, before the window loads. */
export function registerHandlers(): void {
  registerMediaHandlers({
    mediaType: 'movie',
    repo: movieRepo,
    createSchema: MovieCreateSchema,
    updateSchema: UpdateSchemaByType.movie,
  });
  registerMediaHandlers({
    mediaType: 'tv',
    repo: tvShowRepo,
    createSchema: TvShowCreateSchema,
    updateSchema: UpdateSchemaByType.tv,
  });
  registerMediaHandlers({
    mediaType: 'book',
    repo: bookRepo,
    createSchema: BookCreateSchema,
    updateSchema: UpdateSchemaByType.book,
  });
  registerMediaHandlers({
    mediaType: 'album',
    repo: albumRepo,
    createSchema: AlbumCreateSchema,
    updateSchema: UpdateSchemaByType.album,
  });
  registerMediaHandlers({
    mediaType: 'game',
    repo: gameRepo,
    createSchema: GameCreateSchema,
    updateSchema: UpdateSchemaByType.game,
  });

  registerTagHandlers();
  registerCoverHandlers();
  registerExternalSearchHandlers();
  registerBackupHandlers();
  registerFilterPresetHandlers();
  registerGenreHandlers();
  registerImportHandlers();
  registerCsvExportHandlers();
}
