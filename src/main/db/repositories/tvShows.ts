import { createMediaRepository } from './mediaRepository';

export const tvShowRepo = createMediaRepository({
  mediaType: 'tv',
  table: 'tv_shows',
  junctionTable: 'tv_show_tags',
  junctionColumn: 'tv_show_id',
  typeColumns: [
    { dbCol: 'creator', tsKey: 'creator' },
    { dbCol: 'year', tsKey: 'year' },
    { dbCol: 'seasons_watched', tsKey: 'seasonsWatched' },
  ],
});
