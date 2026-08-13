import { createMediaRepository } from './mediaRepository';

export const albumRepo = createMediaRepository({
  mediaType: 'album',
  table: 'albums',
  junctionTable: 'album_tags',
  junctionColumn: 'album_id',
  typeColumns: [
    { dbCol: 'artist', tsKey: 'artist' },
    { dbCol: 'year', tsKey: 'year' },
  ],
});
