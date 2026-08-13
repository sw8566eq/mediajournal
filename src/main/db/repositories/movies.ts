import { createMediaRepository } from './mediaRepository';

export const movieRepo = createMediaRepository({
  mediaType: 'movie',
  table: 'movies',
  junctionTable: 'movie_tags',
  junctionColumn: 'movie_id',
  typeColumns: [
    { dbCol: 'director', tsKey: 'director' },
    { dbCol: 'year', tsKey: 'year' },
    { dbCol: 'runtime_min', tsKey: 'runtimeMin' },
  ],
});
