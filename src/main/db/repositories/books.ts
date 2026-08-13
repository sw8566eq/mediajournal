import { createMediaRepository } from './mediaRepository';

export const bookRepo = createMediaRepository({
  mediaType: 'book',
  table: 'books',
  junctionTable: 'book_tags',
  junctionColumn: 'book_id',
  typeColumns: [
    { dbCol: 'author', tsKey: 'author' },
    { dbCol: 'year', tsKey: 'year' },
    { dbCol: 'pages', tsKey: 'pages' },
  ],
});
