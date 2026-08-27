import { describe, it, expect } from 'vitest';
import { entriesToCsv } from './csvExport';

describe('entriesToCsv', () => {
  it('includes the header row and every type-specific field for the given media type', () => {
    const csv = entriesToCsv('movie', [
      {
        title: 'Alien',
        director: 'Ridley Scott',
        year: 1979,
        runtimeMin: 117,
        genre: 'Sci-Fi',
        ratingTenths: 95,
        status: null,
        tags: [{ id: 1, name: 'favorite' }],
        notes: 'Great film',
      },
    ]);
    const [header, row] = csv.trim().split('\r\n');
    expect(header).toBe('Title,Director,Year,Runtime (min),Genre,Rating,Status,Tags,Notes');
    expect(row).toBe('Alien,Ridley Scott,1979,117,Sci-Fi,9.5,,favorite,Great film');
  });

  it('renders null/missing fields as empty cells rather than "null" or "undefined"', () => {
    const csv = entriesToCsv('book', [{ title: 'Untitled' }]);
    const [, row] = csv.trim().split('\r\n');
    expect(row).toBe('Untitled,,,,,,,,');
  });

  it('formats ratingTenths as one decimal place, not raw tenths', () => {
    const csv = entriesToCsv('album', [{ title: 'A', ratingTenths: 100 }]);
    expect(csv).toContain('10.0');
  });

  it('quotes a title containing a comma per RFC4180', () => {
    const csv = entriesToCsv('game', [{ title: 'Portal, and Portal 2' }]);
    expect(csv).toContain('"Portal, and Portal 2"');
  });

  it('produces just the header row for an empty entry list', () => {
    const csv = entriesToCsv('tv', []);
    expect(csv.trim()).toBe('Title,Creator,Year,Seasons Watched,Genre,Rating,Status,Tags,Notes');
  });
});
