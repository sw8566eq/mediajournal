import { createMediaRepository } from './mediaRepository';

export const gameRepo = createMediaRepository({
  mediaType: 'game',
  table: 'games',
  junctionTable: 'game_tags',
  junctionColumn: 'game_id',
  typeColumns: [
    { dbCol: 'developer', tsKey: 'developer' },
    { dbCol: 'platform', tsKey: 'platform' },
    { dbCol: 'year', tsKey: 'year' },
    { dbCol: 'hours_played', tsKey: 'hoursPlayed' },
  ],
});
